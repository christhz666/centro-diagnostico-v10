from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Paciente, Factura, Orden, OrdenDetalle, Resultado
from app.services.email_service import EmailService
from app.services.pdf_service import PDFService
import tempfile
import os

bp = Blueprint('notificaciones', __name__)


@bp.route('/enviar-resultados/<int:paciente_id>', methods=['POST'])
@jwt_required()
def enviar_resultados(paciente_id):
    """Enviar notificación de resultados listos por email"""
    paciente = Paciente.query.get_or_404(paciente_id)
    
    if not paciente.email:
        return jsonify({'success': False, 'error': 'Paciente no tiene email registrado'}), 400
    
    datos = request.get_json() or {}
    estudio_nombre = datos.get('estudio', 'Estudios de laboratorio')
    
    email_service = EmailService()
    resultado = email_service.enviar_resultados(paciente, estudio_nombre)
    
    return jsonify(resultado), 200 if resultado['success'] else 500


@bp.route('/enviar-factura/<int:factura_id>', methods=['POST'])
@jwt_required()
def enviar_factura(factura_id):
    """Enviar factura por email"""
    factura = Factura.query.get_or_404(factura_id)
    paciente = factura.paciente
    
    if not paciente or not paciente.email:
        return jsonify({'success': False, 'error': 'Paciente no tiene email'}), 400
    
    try:
        # Generar PDF
        pdf_path = os.path.join(tempfile.gettempdir(), f'factura_{factura.numero_factura}.pdf')
        PDFService.generar_factura_pdf(factura, pdf_path)
        
        # Enviar
        email_service = EmailService()
        resultado = email_service.enviar_factura(paciente, factura, pdf_path)
        
        # Limpiar
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        
        return jsonify(resultado), 200 if resultado['success'] else 500
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/estado', methods=['GET'])
@jwt_required()
def estado_email():
    """Verificar si el email está configurado"""
    email_service = EmailService()
    return jsonify({
        'configurado': email_service.enabled,
        'servidor': email_service.smtp_server if email_service.enabled else None
    })
