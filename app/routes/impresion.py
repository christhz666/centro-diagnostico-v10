from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from app import db
from app.models import Factura, Orden, Pago, Paciente
from app.services.impresion_termica import ImpresionTermica
from app.services.pdf_service import PDFService
import tempfile
import os

bp = Blueprint('impresion', __name__)


@bp.route('/recibo-pago/<int:pago_id>', methods=['GET'])
@jwt_required()
def imprimir_recibo_pago(pago_id):
    """Generar recibo de pago para impresora 80mm"""
    pago = Pago.query.get_or_404(pago_id)
    factura = pago.factura
    
    if not factura:
        return jsonify({'error': 'Factura no encontrada'}), 404
    
    pdf_buffer = ImpresionTermica.generar_recibo_pago(factura, pago)
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'recibo_{pago_id}.pdf'
    )


@bp.route('/ticket-orden/<int:orden_id>', methods=['GET'])
@jwt_required()
def imprimir_ticket_orden(orden_id):
    """Generar ticket de orden para impresora 80mm"""
    orden = Orden.query.get_or_404(orden_id)
    
    pdf_buffer = ImpresionTermica.generar_ticket_orden(orden)
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'ticket_{orden.numero_orden}.pdf'
    )


@bp.route('/etiqueta/<int:orden_id>/<int:detalle_id>', methods=['GET'])
@jwt_required()
def imprimir_etiqueta(orden_id, detalle_id):
    """Generar etiqueta para muestra"""
    from app.models import OrdenDetalle
    
    orden = Orden.query.get_or_404(orden_id)
    detalle = OrdenDetalle.query.get_or_404(detalle_id)
    paciente = orden.paciente
    
    estudio_nombre = detalle.estudio.nombre if detalle.estudio else 'Estudio'
    
    pdf_buffer = ImpresionTermica.generar_etiqueta_muestra(paciente, orden, estudio_nombre)
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'etiqueta_{paciente.id}_{detalle_id}.pdf'
    )


@bp.route('/factura/<int:factura_id>', methods=['GET'])
@jwt_required()
def imprimir_factura(factura_id):
    """Generar PDF de factura tamaño carta"""
    factura = Factura.query.get_or_404(factura_id)
    
    pdf_path = os.path.join(tempfile.gettempdir(), f'factura_{factura.numero_factura}.pdf')
    PDFService.generar_factura_pdf(factura, pdf_path)
    
    return send_file(
        pdf_path,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'factura_{factura.numero_factura}.pdf'
    )


@bp.route('/factura-termica/<int:factura_id>', methods=['GET'])
@jwt_required()
def imprimir_factura_termica(factura_id):
    """Generar factura para impresora 80mm"""
    from app.services.impresion_service import ImpresionService
    
    factura = Factura.query.get_or_404(factura_id)
    
    try:
        pdf_buffer = ImpresionService.generar_factura_80mm(factura)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'factura_{factura.numero_factura}_80mm.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
