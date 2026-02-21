from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Factura, Pago, Paciente
from app.services.facturacion import FacturacionService
from app.services.pdf_service import PDFService
import os
import tempfile

bp = Blueprint('facturas', __name__)


@bp.route('/', methods=['GET'])
@jwt_required()
def listar_facturas():
    estado = request.args.get('estado')
    query = Factura.query
    if estado:
        query = query.filter(Factura.estado == estado)
    facturas = query.order_by(Factura.fecha_factura.desc()).limit(100).all()
    return jsonify({'facturas': [f.to_dict() for f in facturas], 'total': len(facturas)})


@bp.route('/<int:factura_id>', methods=['GET'])
@jwt_required()
def obtener_factura(factura_id):
    factura = Factura.query.get_or_404(factura_id)
    detalles = [{
        'id': d.id, 
        'descripcion': d.descripcion, 
        'cantidad': d.cantidad, 
        'precio_unitario': float(d.precio_unitario), 
        'total': float(d.total)
    } for d in factura.detalles]
    pagos = [{
        'id': p.id, 
        'fecha_pago': p.fecha_pago.isoformat(), 
        'monto': float(p.monto), 
        'metodo_pago': p.metodo_pago
    } for p in factura.pagos]
    total_pagado = sum(float(p.monto) for p in factura.pagos)
    resultado = factura.to_dict()
    resultado['detalles'] = detalles
    resultado['pagos'] = pagos
    resultado['total_pagado'] = total_pagado
    resultado['saldo'] = float(factura.total) - total_pagado
    return jsonify(resultado)


@bp.route('/crear-desde-orden/<int:orden_id>', methods=['POST'])
@jwt_required()
def crear_factura_desde_orden(orden_id):
    try:
        datos = request.get_json() or {}
        usuario_id = int(get_jwt_identity())
        datos['usuario_id'] = usuario_id
        factura = FacturacionService.crear_factura_desde_orden(orden_id, datos)
        return jsonify({'success': True, 'message': 'Factura creada', 'factura': factura.to_dict()}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Error al crear factura: {str(e)}'}), 500


@bp.route('/<int:factura_id>/pagar', methods=['POST'])
@jwt_required()
def registrar_pago(factura_id):
    try:
        datos = request.get_json()
        if 'monto' not in datos or 'metodo_pago' not in datos:
            return jsonify({'success': False, 'error': 'monto y metodo_pago requeridos'}), 400
        usuario_id = int(get_jwt_identity())
        datos['usuario_id'] = usuario_id
        pago = FacturacionService.registrar_pago(factura_id, datos)
        return jsonify({
            'success': True, 
            'message': 'Pago registrado', 
            'pago': {
                'id': pago.id, 
                'monto': float(pago.monto), 
                'metodo_pago': pago.metodo_pago, 
                'fecha_pago': pago.fecha_pago.isoformat()
            }
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/pendientes', methods=['GET'])
@jwt_required()
def facturas_pendientes():
    facturas = Factura.query.filter(Factura.estado.in_(['pendiente', 'parcial'])).all()
    return jsonify({'facturas': [f.to_dict() for f in facturas], 'total': len(facturas)})


@bp.route('/<int:factura_id>/pdf', methods=['GET'])
@jwt_required()
def descargar_factura_pdf(factura_id):
    try:
        factura = Factura.query.get_or_404(factura_id)
        
        # Usar directorio temporal del sistema
        pdf_filename = f'factura_{factura.numero_factura.replace("-", "_")}.pdf'
        pdf_path = os.path.join(tempfile.gettempdir(), pdf_filename)
        
        PDFService.generar_factura_pdf(factura, pdf_path)
        
        return send_file(
            pdf_path, 
            as_attachment=True, 
            download_name=pdf_filename, 
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500


@bp.route('/crear-directa', methods=['POST'])
@jwt_required()
def crear_factura_directa():
    """Crear factura para paciente sin orden previa"""
    try:
        datos = request.get_json()
        usuario_id = int(get_jwt_identity())
        
        paciente_id = datos.get('paciente_id')
        if not paciente_id:
            return jsonify({'error': 'paciente_id requerido'}), 400
        
        paciente = Paciente.query.get(paciente_id)
        if not paciente:
            return jsonify({'error': 'Paciente no encontrado'}), 404
        
        # Aquí puedes implementar lógica para factura directa
        # Por ahora retornamos error indicando usar orden
        return jsonify({'error': 'Use crear-desde-orden para crear facturas'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
