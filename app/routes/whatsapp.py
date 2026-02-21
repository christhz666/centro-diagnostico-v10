from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Paciente
from app.services.whatsapp_service import WhatsAppService

bp = Blueprint('whatsapp', __name__)

@bp.route('/enviar', methods=['POST'])
@jwt_required()
def enviar_mensaje():
    """Enviar mensaje individual"""
    datos = request.get_json()
    ws = WhatsAppService()
    resultado = ws.enviar_mensaje(datos['numero'], datos['mensaje'])
    return jsonify(resultado)

@bp.route('/campana', methods=['POST'])
@jwt_required()
def crear_campana():
    """Crear campaña de WhatsApp"""
    try:
        datos = request.get_json()
        
        # Obtener pacientes según filtros
        query = Paciente.query.filter_by(estado='activo')
        
        if datos.get('filtro_ciudad'):
            query = query.filter_by(ciudad=datos['filtro_ciudad'])
        
        pacientes = query.all()
        
        # Enviar campaña
        ws = WhatsAppService()
        resultados = ws.enviar_campana(pacientes, datos['mensaje'])
        
        return jsonify({
            'success': True,
            'resultados': resultados
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/plantillas', methods=['GET'])
@jwt_required()
def plantillas():
    """Plantillas de mensajes"""
    return jsonify({
        'plantillas': [
            {
                'nombre': 'Oferta General',
                'mensaje': '¡Hola {nombre}! ?? Tenemos ofertas especiales en estudios de laboratorio. Visítanos y aprovecha nuestros descuentos.'
            },
            {
                'nombre': 'Recordatorio Cita',
                'mensaje': 'Hola {nombre}, te recordamos tu cita programada. Centro Diagnóstico.'
            },
            {
                'nombre': 'Resultados Listos',
                'mensaje': 'Estimado/a {nombre}, tus resultados están listos. Puedes verlos en nuestro portal web.'
            }
        ]
    })
