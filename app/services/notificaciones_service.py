import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

class NotificacionService:
    """Servicio para enviar notificaciones por email y SMS"""
    
    @staticmethod
    def enviar_email(destinatario, asunto, cuerpo):
        """Enviar email usando SMTP"""
        try:
            smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', 587))
            smtp_user = os.getenv('SMTP_USER')
            smtp_pass = os.getenv('SMTP_PASS')
            
            if not smtp_user or not smtp_pass:
                print("?? Credenciales SMTP no configuradas")
                return False
            
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = destinatario
            msg['Subject'] = asunto
            msg.attach(MIMEText(cuerpo, 'html'))
            
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            
            print(f"? Email enviado a {destinatario}")
            return True
            
        except Exception as e:
            print(f"? Error enviando email: {e}")
            return False
    
    @staticmethod
    def notificar_resultado_disponible(paciente_email, paciente_nombre, estudio):
        """Notificar que un resultado está disponible"""
        asunto = "Resultado de estudio disponible - Centro Diagnóstico"
        cuerpo = f"""
        <h2>Hola {paciente_nombre},</h2>
        <p>Tu resultado de <strong>{estudio}</strong> ya está disponible.</p>
        <p>Puedes verlo ingresando al portal de pacientes.</p>
        <p>Saludos,<br>Centro Diagnóstico</p>
        """
        return NotificacionService.enviar_email(paciente_email, asunto, cuerpo)
