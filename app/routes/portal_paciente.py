from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import Paciente, Factura, Resultado, Orden
from app.utils.validators import sanitize_string
from sqlalchemy import text
import bcrypt
import logging

bp = Blueprint('portal_paciente', __name__)
logger = logging.getLogger(__name__)


@bp.route('/login', methods=['POST'])
def login_paciente():
    """Login seguro para pacientes"""
    datos = request.get_json()
    if not datos:
        return jsonify({'error': 'Datos requeridos'}), 400

    paciente = None

    # Login con código QR
    if datos.get('codigo_qr'):
        codigo = sanitize_string(datos['codigo_qr'], max_length=50)

        # Usar parámetro en vez de concatenar
        resultado = db.session.execute(text("""
            SELECT fqr.factura_id, f.paciente_id
            FROM facturas_qr fqr
            JOIN facturas f ON f.id = fqr.factura_id
            WHERE fqr.codigo_qr = :codigo
            LIMIT 1
        """), {'codigo': codigo}).first()

        if not resultado:
            return jsonify({'error': 'Código QR inválido'}), 401

        # Actualizar accesos con parámetro
        db.session.execute(text("""
            UPDATE facturas_qr SET accesos = accesos + 1
            WHERE codigo_qr = :codigo
        """), {'codigo': codigo})
        db.session.commit()

        paciente = Paciente.query.get(resultado[1])

    # Login con usuario/contraseña
    elif datos.get('usuario') and datos.get('password'):
        usuario_input = sanitize_string(datos['usuario'], max_length=50)
        password_input = datos['password']

        if len(password_input) > 128:
            return jsonify({'error': 'Credenciales inválidas'}), 401

        paciente = Paciente.query.filter_by(portal_usuario=usuario_input).first()

        if not paciente or not paciente.portal_password:
            bcrypt.checkpw(b'dummy', bcrypt.hashpw(b'dummy', bcrypt.gensalt()))
            return jsonify({'error': 'Credenciales inválidas'}), 401

        if not bcrypt.checkpw(password_input.encode('utf-8'), paciente.portal_password.encode('utf-8')):
            return jsonify({'error': 'Credenciales inválidas'}), 401
    else:
        return jsonify({'error': 'Método de login no válido'}), 400

    if not paciente:
        return jsonify({'error': 'Paciente no encontrado'}), 404

    # Token con tipo para distinguir paciente de empleado
    access_token = create_access_token(
        identity=str(paciente.id),
        additional_claims={'tipo': 'paciente'}
    )

    return jsonify({
        'access_token': access_token,
        'paciente': {
            'id': paciente.id,
            'nombre': paciente.nombre,
            'apellido': paciente.apellido,
        }
    })


@bp.route('/mis-resultados', methods=['GET'])
@jwt_required()
def mis_resultados():
    """Ver resultados del paciente autenticado"""
    current_id = get_jwt_identity()
    paciente_id = int(current_id)

    ordenes = Orden.query.filter_by(
        paciente_id=paciente_id
    ).order_by(Orden.fecha_orden.desc()).all()

    resultados = []
    for orden in ordenes:
        for detalle in orden.detalles:
            if detalle.resultado_disponible:
                resultado = Resultado.query.filter_by(
                    orden_detalle_id=detalle.id
                ).first()
                if resultado:
                    resultados.append({
                        'fecha': orden.fecha_orden.isoformat(),
                        'estudio': detalle.estudio.nombre if detalle.estudio else 'N/A',
                        'tipo': resultado.tipo_archivo,
                        'archivo': resultado.nombre_archivo,
                        'id': resultado.id
                    })

    return jsonify({'resultados': resultados, 'total': len(resultados)})


@bp.route('/mis-facturas', methods=['GET'])
@jwt_required()
def mis_facturas():
    """Ver facturas del paciente autenticado"""
    current_id = get_jwt_identity()
    paciente_id = int(current_id)

    facturas = Factura.query.filter_by(
        paciente_id=paciente_id
    ).order_by(Factura.fecha_factura.desc()).all()

    return jsonify({
        'facturas': [f.to_dict() for f in facturas],
        'total': len(facturas)
    })
