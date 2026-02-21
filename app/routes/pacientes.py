from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Paciente
from app.utils.validators import sanitize_string, sanitize_dict, validate_cedula, validate_email, validate_phone, validate_pagination
from datetime import datetime
from sqlalchemy import or_
import random
import string
import bcrypt

bp = Blueprint('pacientes', __name__)


@bp.route('/', methods=['GET'])
@jwt_required()
def listar_pacientes():
    page, per_page = validate_pagination()
    buscar = sanitize_string(request.args.get('buscar', ''), max_length=100)

    query = Paciente.query
    if buscar:
        # Uso seguro con parámetros - NO concatenación de strings
        search_term = f'%{buscar}%'
        query = query.filter(
            or_(
                Paciente.nombre.ilike(search_term),
                Paciente.apellido.ilike(search_term),
                Paciente.cedula.ilike(search_term)
            )
        )
    query = query.order_by(Paciente.created_at.desc())
    pacientes = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'pacientes': [p.to_dict() for p in pacientes.items],
        'total': pacientes.total,
        'pages': pacientes.pages,
        'current_page': page
    })


@bp.route('/<int:paciente_id>', methods=['GET'])
@jwt_required()
def obtener_paciente(paciente_id):
    paciente = Paciente.query.get_or_404(paciente_id)
    return jsonify(paciente.to_dict())


@bp.route('/', methods=['POST'])
@jwt_required()
def crear_paciente():
    try:
        datos = request.get_json()
        if not datos:
            return jsonify({'error': 'No se enviaron datos'}), 400

        # Sanitizar TODOS los inputs
        datos = sanitize_dict(datos, {
            'nombre': {'max_length': 100},
            'apellido': {'max_length': 100},
            'cedula': {'max_length': 20},
            'email': {'max_length': 100},
            'telefono': {'max_length': 20},
            'celular': {'max_length': 20},
            'direccion': {'max_length': 500},
            'ciudad': {'max_length': 100},
        })

        # Validaciones
        if not datos.get('nombre') or not datos.get('apellido'):
            return jsonify({'error': 'Nombre y apellido son requeridos'}), 400

        if datos.get('cedula') and not validate_cedula(datos['cedula']):
            return jsonify({'error': 'Formato de cédula inválido'}), 400

        if datos.get('email') and not validate_email(datos['email']):
            return jsonify({'error': 'Formato de email inválido'}), 400

        if datos.get('telefono') and not validate_phone(datos['telefono']):
            return jsonify({'error': 'Formato de teléfono inválido'}), 400

        # Verificar duplicados
        if datos.get('cedula'):
            existe = Paciente.query.filter_by(cedula=datos['cedula']).first()
            if existe:
                return jsonify({'error': 'Ya existe un paciente con esta cédula'}), 409

        paciente = Paciente()
        paciente.cedula = datos.get('cedula')
        paciente.pasaporte = datos.get('pasaporte')
        paciente.nombre = datos['nombre']
        paciente.apellido = datos['apellido']
        paciente.sexo = datos.get('sexo') if datos.get('sexo') in ('M', 'F') else None
        paciente.telefono = datos.get('telefono')
        paciente.celular = datos.get('celular')
        paciente.email = datos.get('email')
        paciente.direccion = datos.get('direccion')
        paciente.ciudad = datos.get('ciudad')
        paciente.seguro_medico = datos.get('seguro_medico')
        paciente.numero_poliza = datos.get('numero_poliza')
        paciente.tipo_sangre = datos.get('tipo_sangre')
        paciente.alergias = datos.get('alergias')

        if datos.get('fecha_nacimiento'):
            try:
                paciente.fecha_nacimiento = datetime.fromisoformat(datos['fecha_nacimiento']).date()
            except (ValueError, TypeError):
                return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400

        db.session.add(paciente)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Paciente creado',
            'paciente': paciente.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al crear paciente'}), 500


@bp.route('/<int:paciente_id>', methods=['PUT'])
@jwt_required()
def actualizar_paciente(paciente_id):
    try:
        paciente = Paciente.query.get_or_404(paciente_id)
        datos = request.get_json()
        if not datos:
            return jsonify({'error': 'No se enviaron datos'}), 400

        datos = sanitize_dict(datos)

        if 'email' in datos and datos['email'] and not validate_email(datos['email']):
            return jsonify({'error': 'Email inválido'}), 400

        campos_permitidos = [
            'nombre', 'apellido', 'telefono', 'celular',
            'email', 'direccion', 'ciudad', 'seguro_medico',
            'numero_poliza', 'tipo_sangre', 'alergias'
        ]
        for campo in campos_permitidos:
            if campo in datos:
                setattr(paciente, campo, datos[campo])

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Paciente actualizado',
            'paciente': paciente.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al actualizar paciente'}), 500


@bp.route('/<int:paciente_id>/generar-credenciales', methods=['POST'])
@jwt_required()
def generar_credenciales(paciente_id):
    """Generar credenciales de portal para paciente"""
    try:
        paciente = Paciente.query.get_or_404(paciente_id)

        # Generar usuario seguro
        import secrets
        base_usuario = f"{paciente.nombre.lower().replace(' ', '')}.{paciente.apellido.lower().replace(' ', '')}"
        base_usuario = sanitize_string(base_usuario, 40)
        numero_random = ''.join(random.choices(string.digits, k=3))
        usuario = f"{base_usuario}{numero_random}"

        # Generar contraseña segura
        password = secrets.token_urlsafe(12)

        # Hash seguro con bcrypt
        password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt(rounds=12)
        ).decode('utf-8')

        paciente.portal_usuario = usuario
        paciente.portal_password = password_hash
        db.session.commit()

        return jsonify({
            'success': True,
            'credenciales': {
                'usuario': usuario,
                'password': password,
                'mensaje': 'Guarde esta contraseña, no se mostrará nuevamente'
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al generar credenciales'}), 500
