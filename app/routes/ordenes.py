from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Orden, OrdenDetalle, Paciente, Estudio
from sqlalchemy import text

bp = Blueprint('ordenes', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_ordenes():
    estado = request.args.get('estado')
    query = Orden.query
    if estado:
        query = query.filter(Orden.estado == estado)
    ordenes = query.order_by(Orden.fecha_orden.desc()).limit(50).all()
    return jsonify({'ordenes': [o.to_dict() for o in ordenes], 'total': len(ordenes)})

@bp.route('/<int:orden_id>', methods=['GET'])
@jwt_required()
def obtener_orden(orden_id):
    orden = Orden.query.get_or_404(orden_id)
    detalles = []
    for detalle in orden.detalles:
        detalles.append({
            'id': detalle.id,
            'estudio': detalle.estudio.to_dict() if detalle.estudio else None,
            'precio': float(detalle.precio),
            'descuento': float(detalle.descuento),
            'precio_final': float(detalle.precio_final),
            'estado': detalle.estado
        })
    resultado = orden.to_dict()
    resultado['detalles'] = detalles
    return jsonify(resultado)

@bp.route('/', methods=['POST'])
@jwt_required()
def crear_orden():
    try:
        datos = request.get_json()
        usuario_id = int(get_jwt_identity())
        if not datos.get('paciente_id') or not datos.get('estudios'):
            return jsonify({'error': 'paciente_id y estudios requeridos'}), 400
        resultado = db.session.execute(text("SELECT generar_numero_orden()"))
        numero_orden = resultado.scalar()
        orden = Orden()
        orden.numero_orden = numero_orden
        orden.paciente_id = datos['paciente_id']
        orden.medico_referente = datos.get('medico_referente', '')
        orden.prioridad = datos.get('prioridad', 'normal')
        orden.usuario_registro_id = usuario_id
        orden.estado = 'pendiente'
        db.session.add(orden)
        db.session.flush()
        total_orden = 0
        for est in datos['estudios']:
            estudio = Estudio.query.get(est['estudio_id'])
            if not estudio:
                db.session.rollback()
                return jsonify({'error': f'Estudio no encontrado'}), 404
            descuento = float(est.get('descuento', 0))
            precio = float(estudio.precio)
            precio_final = precio - descuento
            detalle = OrdenDetalle()
            detalle.orden_id = orden.id
            detalle.estudio_id = est['estudio_id']
            detalle.precio = precio
            detalle.descuento = descuento
            detalle.precio_final = precio_final
            detalle.estado = 'pendiente'
            db.session.add(detalle)
            total_orden += precio_final
        db.session.commit()
        return jsonify({'success': True, 'message': 'Orden creada', 'orden': orden.to_dict(), 'total': float(total_orden)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/pendientes', methods=['GET'])
@jwt_required()
def ordenes_pendientes():
    ordenes = Orden.query.filter(Orden.estado.in_(['pendiente', 'en_proceso'])).order_by(Orden.fecha_orden.desc()).all()
    return jsonify({'ordenes': [o.to_dict() for o in ordenes], 'total': len(ordenes)})
