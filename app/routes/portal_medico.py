from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Paciente, Orden, Resultado, Factura
from app.utils.validators import sanitize_string
from sqlalchemy import or_

bp = Blueprint('portal_medico', __name__)


@bp.route('/historial/<int:paciente_id>', methods=['GET'])
@jwt_required()
def historial_paciente(paciente_id):
    """Historial completo del paciente para médicos"""
    paciente = Paciente.query.get_or_404(paciente_id)

    ordenes = Orden.query.filter_by(
        paciente_id=paciente_id
    ).order_by(Orden.fecha_orden.desc()).all()

    facturas = Factura.query.filter_by(
        paciente_id=paciente_id
    ).order_by(Factura.fecha_factura.desc()).all()

    resultados = []
    for orden in ordenes:
        for detalle in orden.detalles:
            if detalle.resultado_disponible:
                resultado = Resultado.query.filter_by(
                    orden_detalle_id=detalle.id
                ).first()
                if resultado:
                    resultados.append({
                        'fecha': resultado.fecha_importacion.isoformat(),
                        'estudio': detalle.estudio.nombre if detalle.estudio else 'N/A',
                        'tipo': resultado.tipo_archivo,
                        'id': resultado.id
                    })

    return jsonify({
        'paciente': {
            'nombre': paciente.nombre,
            'apellido': paciente.apellido,
            'cedula': paciente.cedula,
            'fecha_nacimiento': paciente.fecha_nacimiento.isoformat() if paciente.fecha_nacimiento else None,
            'telefono': paciente.telefono,
            'email': paciente.email,
            'tipo_sangre': paciente.tipo_sangre,
            'alergias': paciente.alergias
        },
        'ordenes': [o.to_dict() for o in ordenes],
        'facturas': [f.to_dict() for f in facturas],
        'resultados': resultados,
        'total_ordenes': len(ordenes),
        'total_facturas': len(facturas),
        'total_resultados': len(resultados)
    })


@bp.route('/buscar', methods=['GET'])
@jwt_required()
def buscar_paciente_medico():
    """Búsqueda segura para médicos"""
    termino = sanitize_string(request.args.get('q', ''), max_length=100)

    if not termino or len(termino) < 2:
        return jsonify({'pacientes': []})

    search_term = f'%{termino}%'

    pacientes = Paciente.query.filter(
        or_(
            Paciente.nombre.ilike(search_term),
            Paciente.apellido.ilike(search_term),
            Paciente.cedula.ilike(search_term),
        )
    ).limit(10).all()

    return jsonify({
        'pacientes': [{
            'id': p.id,
            'nombre': f"{p.nombre} {p.apellido}",
            'cedula': p.cedula,
            'telefono': p.telefono
        } for p in pacientes]
    })
