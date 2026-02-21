import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os

class EmailService:
    
    def __init__(self):
        self.smtp_server = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('MAIL_PORT', 587))
        self.username = os.getenv('MAIL_USERNAME')
        self.password = os.getenv('MAIL_PASSWORD')
        self.from_email = os.getenv('MAIL_FROM', self.username)
        self.enabled = bool(self.username and self.password)
    
    def enviar(self, to_email, subject, body_html, attachments=None):
        """Enviar email con HTML y adjuntos opcionales"""
        if not self.enabled:
            return {'success': False, 'error': 'Email no configurado'}
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Centro Diagnóstico <{self.from_email}>"
            msg['To'] = to_email
            
            # Cuerpo HTML
            html_part = MIMEText(body_html, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Adjuntos
            if attachments:
                for filepath in attachments:
                    if os.path.exists(filepath):
                        with open(filepath, 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            filename = os.path.basename(filepath)
                            part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                            msg.attach(part)
            
            # Enviar
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            return {'success': True, 'message': f'Email enviado a {to_email}'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def enviar_resultados(self, paciente, estudio_nombre, pdf_path=None):
        """Enviar notificación de resultados listos"""
        if not paciente.email:
            return {'success': False, 'error': 'Paciente sin email'}
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>?? Centro Diagnóstico</h1>
                </div>
                <div class="content">
                    <h2>¡Sus resultados están listos!</h2>
                    <p>Estimado/a <strong>{paciente.nombre} {paciente.apellido}</strong>,</p>
                    <p>Le informamos que los resultados de su estudio <strong>{estudio_nombre}</strong> ya están disponibles.</p>
                    <p>Puede retirarlos en nuestras instalaciones o acceder a ellos a través de nuestro portal web.</p>
                    <p style="text-align: center;">
                        <a href="http://192.9.135.84/portal-paciente" class="button">Ver Resultados</a>
                    </p>
                    <p><strong>Horario de atención:</strong><br>
                    Lunes a Viernes: 7:00 AM - 6:00 PM<br>
                    Sábados: 7:00 AM - 1:00 PM</p>
                </div>
                <div class="footer">
                    <p>Centro de Diagnóstico Medical Plus<br>
                    Tel: 809-000-0000</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        attachments = [pdf_path] if pdf_path and os.path.exists(pdf_path) else None
        return self.enviar(paciente.email, f'Resultados Listos - {estudio_nombre}', html, attachments)
    
    def enviar_factura(self, paciente, factura, pdf_path):
        """Enviar factura por email"""
        if not paciente.email:
            return {'success': False, 'error': 'Paciente sin email'}
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .info-box {{ background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .total {{ font-size: 24px; color: #27ae60; font-weight: bold; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>?? Centro Diagnóstico</h1>
                    <p>Factura {factura.numero_factura}</p>
                </div>
                <div class="content">
                    <p>Estimado/a <strong>{paciente.nombre} {paciente.apellido}</strong>,</p>
                    <p>Adjunto encontrará su factura.</p>
                    <div class="info-box">
                        <p><strong>Factura:</strong> {factura.numero_factura}</p>
                        <p><strong>NCF:</strong> {factura.ncf or 'N/A'}</p>
                        <p><strong>Fecha:</strong> {factura.fecha_factura.strftime('%d/%m/%Y')}</p>
                        <p class="total">Total: RD$ {float(factura.total):,.2f}</p>
                    </div>
                    <p>Gracias por su preferencia.</p>
                </div>
                <div class="footer">
                    <p>Centro de Diagnóstico Medical Plus<br>
                    Tel: 809-000-0000</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.enviar(paciente.email, f'Factura {factura.numero_factura}', html, [pdf_path])
    
    def enviar_recordatorio_cita(self, paciente, fecha_cita, estudios):
        """Enviar recordatorio de cita"""
        if not paciente.email:
            return {'success': False, 'error': 'Paciente sin email'}
        
        estudios_lista = "<br>".join([f" {e}" for e in estudios])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .date-box {{ background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
                .date-box h2 {{ margin: 0; font-size: 28px; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>?? Centro Diagnóstico</h1>
                    <p>Recordatorio de Cita</p>
                </div>
                <div class="content">
                    <p>Estimado/a <strong>{paciente.nombre} {paciente.apellido}</strong>,</p>
                    <p>Le recordamos su cita programada:</p>
                    <div class="date-box">
                        <h2>?? {fecha_cita}</h2>
                    </div>
                    <p><strong>Estudios a realizar:</strong><br>{estudios_lista}</p>
                    <p><strong>Recomendaciones:</strong></p>
                    <ul>
                        <li>Presentarse 15 minutos antes</li>
                        <li>Traer cédula de identidad</li>
                        <li>Si requiere ayuno, no consumir alimentos</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Centro de Diagnóstico Medical Plus<br>
                    Tel: 809-000-0000</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.enviar(paciente.email, 'Recordatorio de Cita', html)
