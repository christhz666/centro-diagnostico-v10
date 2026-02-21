from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Paciente, Orden, Factura, Estudio
from app.utils.validators import sanitize_string
from sqlalchemy import or_, cast, String

bp = Blueprint('busqueda', __name__)


@bp.route('/global', methods=['GET'])
@jwt_required()
def busqueda_global():
    """Búsqueda global en pacientes, órdenes y facturas"""
    termino = sanitize_string(request.args.get('q', ''), max_length=100)

    if not termino or len(termino) < 2:
        return jsonify({'error': 'Mínimo 2 caracteres para buscar'}), 400

    search = f'%{termino}%'
    resultados = {}

    # Buscar pacientes
    pacientes = Paciente.query.filter(
        or_(
            Paciente.nombre.ilike(search),
            Paciente.apellido.ilike(search),
            Paciente.cedula.ilike(search),
            Paciente.telefono.ilike(search),
            Paciente.celular.ilike(search),
            Paciente.email.ilike(search),
            Paciente.codigo_paciente.ilike(search)
        )
    ).limit(10).all()

    resultados['pacientes'] = [{
        'id': p.id,
        'cedula': p.cedula,
        'nombre': f"{p.nombre} {p.apellido}",
        'telefono': p.telefono or p.celular,
        'codigo': p.codigo_paciente,
        'estado': p.estado
    } for p in pacientes]

    # Buscar órdenes
    ordenes = Orden.query.filter(
        or_(
            Orden.numero_orden.ilike(search),
            Orden.medico_referente.ilike(search)
        )
    ).order_by(Orden.fecha_orden.desc()).limit(10).all()

    resultados['ordenes'] = [{
        'id': o.id,
        'numero_orden': o.numero_orden,
        'paciente': f"{o.paciente.nombre} {o.paciente.apellido}" if o.paciente else 'N/A',
        'fecha': o.fecha_orden.isoformat(),
        'estado': o.estado
    } for o in ordenes]

    # Buscar facturas
    facturas = Factura.query.filter(
        or_(
            Factura.numero_factura.ilike(search),
            Factura.ncf.ilike(search)
        )
    ).order_by(Factura.fecha_factura.desc()).limit(10).all()

    resultados['facturas'] = [{
        'id': f.id,
        'numero_factura': f.numero_factura,
        'ncf': f.ncf,
        'paciente': f"{f.paciente.nombre} {f.paciente.apellido}" if f.paciente else 'N/A',
        'total': float(f.total),
        'estado': f.estado
    } for f in facturas]

    total = len(resultados['pacientes']) + len(resultados['ordenes']) + len(resultados['facturas'])

    return jsonify({
        'termino': termino,
        'total_resultados': total,
        'resultados': resultados
    })


@bp.route('/pacientes', methods=['GET'])
@jwt_required()
def buscar_pacientes():
    """Búsqueda específica de pacientes con filtros"""
    termino = sanitize_string(request.args.get('q', ''), max_length=100)
    estado = sanitize_string(request.args.get('estado', ''), max_length=20)
    seguro = sanitize_string(request.args.get('seguro', ''), max_length=100)

    query = Paciente.query

    if termino and len(termino) >= 2:
        search = f'%{termino}%'
        query = query.filter(
            or_(
                Paciente.nombre.ilike(search),
                Paciente.apellido.ilike(search),
                Paciente.cedula.ilike(search),
                Paciente.codigo_paciente.ilike(search),
                Paciente.telefono.ilike(search)
            )
        )

    if estado and estado in ('activo', 'inactivo'):
        query = query.filter(Paciente.estado == estado)

    if seguro:
        query = query.filter(Paciente.seguro_medico.ilike(f'%{seguro}%'))

    page = max(1, request.args.get('page', 1, type=int))
    per_page = min(50, max(1, request.args.get('per_page', 20, type=int)))

    result = query.order_by(Paciente.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'pacientes': [p.to_dict() for p in result.items],
        'total': result.total,
        'pages': result.pages,
        'current_page': page
    })
