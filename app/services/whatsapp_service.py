from twilio.rest import Client
import os
from datetime import datetime

class WhatsAppService:
    
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.whatsapp_from = os.getenv('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None
    
    def enviar_mensaje(self, numero, mensaje):
        """Enviar mensaje de WhatsApp"""
        if not self.client:
            return {'success': False, 'error': 'Twilio no configurado'}
        
        try:
            # Formatear número (debe incluir código de país)
            if not numero.startswith('whatsapp:'):
                if numero.startswith('809') or numero.startswith('829') or numero.startswith('849'):
                    numero = f'whatsapp:+1{numero}'  # República Dominicana
                else:
                    numero = f'whatsapp:{numero}'
            
            message = self.client.messages.create(
                body=mensaje,
                from_=self.whatsapp_from,
                to=numero
            )
            
            return {
                'success': True,
                'message_id': message.sid,
                'status': message.status
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def enviar_campana(self, pacientes, mensaje_plantilla):
        """Enviar campaña masiva"""
        resultados = {
            'total': len(pacientes),
            'enviados': 0,
            'fallidos': 0,
            'detalles': []
        }
        
        for paciente in pacientes:
            numero = paciente.celular or paciente.telefono
            if not numero:
                resultados['fallidos'] += 1
                continue
            
            # Personalizar mensaje
            mensaje = mensaje_plantilla.replace('{nombre}', paciente.nombre)
            mensaje = mensaje.replace('{apellido}', paciente.apellido)
            
            resultado = self.enviar_mensaje(numero, mensaje)
            
            if resultado['success']:
                resultados['enviados'] += 1
            else:
                resultados['fallidos'] += 1
            
            resultados['detalles'].append({
                'paciente': f"{paciente.nombre} {paciente.apellido}",
                'numero': numero,
                'success': resultado['success'],
                'error': resultado.get('error')
            })
        
        return resultados
