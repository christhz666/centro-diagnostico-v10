import qrcode
from io import BytesIO
import base64
import secrets
from app import db
from datetime import datetime

class QRService:
    
    @staticmethod
    def generar_codigo_acceso():
        """Generar código único de 12 caracteres"""
        return secrets.token_urlsafe(12)
    
    @staticmethod
    def generar_qr_factura(factura_id, codigo_acceso):
        """Generar código QR para acceso a factura"""
        # URL del portal del paciente
        url = f"http://192.9.135.84:5000/verificar/{codigo_acceso}?redirect=resultados"
        
        # Crear QR
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        
        # Generar imagen
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            'qr_base64': img_base64,
            'url': url,
            'codigo': codigo_acceso
        }
    
    @staticmethod
    def registrar_qr_factura(factura_id):
        """Registrar QR en base de datos"""
        from app.models import Factura
        from sqlalchemy import text
        
        codigo = QRService.generar_codigo_acceso()
        url = f"http://192.9.135.84:5000/verificar/{codigo}?redirect=resultados"
        
        # Insertar en tabla facturas_qr
        db.session.execute(text("""
            INSERT INTO facturas_qr (factura_id, codigo_qr, url_acceso)
            VALUES (:factura_id, :codigo, :url)
        """), {'factura_id': factura_id, 'codigo': codigo, 'url': url})
        db.session.commit()
        
        return codigo
