from reportlab.lib.pagesizes import mm
from reportlab.lib.units import mm as MM
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import code128
from io import BytesIO
import qrcode
from datetime import datetime

class ImpresionTermica:
    """Generador de documentos para impresora térmica 80mm"""
    
    ANCHO = 80 * MM
    MARGEN = 3 * MM
    
    @staticmethod
    def generar_recibo_pago(factura, pago):
        """Recibo de pago para impresora 80mm"""
        alto = 150 * MM
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(ImpresionTermica.ANCHO, alto))
        
        y = alto - 8*MM
        ancho = ImpresionTermica.ANCHO
        margen = ImpresionTermica.MARGEN
        
        # Header
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(ancho/2, y, "CENTRO DIAGNÓSTICO")
        y -= 4*MM
        c.setFont("Helvetica", 8)
        c.drawCentredString(ancho/2, y, "RNC: 000-00000-0")
        y -= 3*MM
        c.drawCentredString(ancho/2, y, "Tel: 809-000-0000")
        y -= 5*MM
        
        # Línea
        c.line(margen, y, ancho-margen, y)
        y -= 4*MM
        
        # Título
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(ancho/2, y, "RECIBO DE PAGO")
        y -= 5*MM
        
        # Info factura
        c.setFont("Helvetica", 8)
        c.drawString(margen, y, f"Factura: {factura.numero_factura}")
        y -= 3.5*MM
        c.drawString(margen, y, f"NCF: {factura.ncf or 'N/A'}")
        y -= 3.5*MM
        c.drawString(margen, y, f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        y -= 5*MM
        
        # Paciente
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margen, y, "PACIENTE:")
        y -= 3.5*MM
        c.setFont("Helvetica", 8)
        paciente = factura.paciente
        c.drawString(margen, y, f"{paciente.nombre} {paciente.apellido}")
        y -= 3.5*MM
        c.drawString(margen, y, f"Cédula: {paciente.cedula or 'N/A'}")
        y -= 5*MM
        
        # Línea
        c.line(margen, y, ancho-margen, y)
        y -= 4*MM
        
        # Pago
        c.setFont("Helvetica-Bold", 9)
        c.drawString(margen, y, "PAGO RECIBIDO:")
        y -= 4*MM
        c.setFont("Helvetica", 9)
        c.drawString(margen, y, f"Monto: RD$ {float(pago.monto):,.2f}")
        y -= 3.5*MM
        c.drawString(margen, y, f"Método: {pago.metodo_pago.upper()}")
        if pago.referencia:
            y -= 3.5*MM
            c.drawString(margen, y, f"Ref: {pago.referencia}")
        y -= 5*MM
        
        # Totales
        c.line(margen, y, ancho-margen, y)
        y -= 4*MM
        
        total_pagado = sum(float(p.monto) for p in factura.pagos)
        saldo = float(factura.total) - total_pagado
        
        c.setFont("Helvetica", 8)
        c.drawString(margen, y, f"Total Factura: RD$ {float(factura.total):,.2f}")
        y -= 3.5*MM
        c.drawString(margen, y, f"Total Pagado: RD$ {total_pagado:,.2f}")
        y -= 3.5*MM
        
        c.setFont("Helvetica-Bold", 9)
        if saldo > 0:
            c.drawString(margen, y, f"SALDO: RD$ {saldo:,.2f}")
        else:
            c.drawString(margen, y, "** PAGADO **")
        y -= 6*MM
        
        # Footer
        c.setFont("Helvetica", 7)
        c.drawCentredString(ancho/2, y, "¡Gracias por su preferencia!")
        y -= 3*MM
        c.drawCentredString(ancho/2, y, "Conserve este recibo")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generar_ticket_orden(orden):
        """Ticket de orden para el paciente"""
        alto = 180 * MM
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(ImpresionTermica.ANCHO, alto))
        
        y = alto - 8*MM
        ancho = ImpresionTermica.ANCHO
        margen = ImpresionTermica.MARGEN
        
        # Header
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(ancho/2, y, "CENTRO DIAGNÓSTICO")
        y -= 4*MM
        c.setFont("Helvetica", 8)
        c.drawCentredString(ancho/2, y, "Tel: 809-000-0000")
        y -= 5*MM
        
        c.line(margen, y, ancho-margen, y)
        y -= 4*MM
        
        # Orden
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(ancho/2, y, f"ORDEN: {orden.numero_orden}")
        y -= 5*MM
        
        # Paciente
        c.setFont("Helvetica", 8)
        paciente = orden.paciente
        c.drawString(margen, y, f"Paciente: {paciente.nombre} {paciente.apellido}")
        y -= 3.5*MM
        c.drawString(margen, y, f"Cédula: {paciente.cedula or 'N/A'}")
        y -= 3.5*MM
        c.drawString(margen, y, f"Fecha: {orden.fecha_orden.strftime('%d/%m/%Y %H:%M')}")
        if orden.medico_referente:
            y -= 3.5*MM
            c.drawString(margen, y, f"Dr(a): {orden.medico_referente}")
        y -= 5*MM
        
        c.line(margen, y, ancho-margen, y)
        y -= 4*MM
        
        # Estudios
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margen, y, "ESTUDIOS:")
        y -= 4*MM
        
        c.setFont("Helvetica", 7)
        total = 0
        for detalle in orden.detalles:
            nombre = detalle.estudio.nombre[:30] if detalle.estudio else 'Estudio'
            precio = float(detalle.precio_final)
            total += precio
            c.drawString(margen, y, f" {nombre}")
            c.drawRightString(ancho-margen, y, f"RD$ {precio:,.2f}")
            y -= 3.5*MM
        
        y -= 2*MM
        c.line(margen, y, ancho-margen, y)
        y -= 4*MM
        
        # Total
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margen, y, "TOTAL:")
        c.drawRightString(ancho-margen, y, f"RD$ {total:,.2f}")
        y -= 6*MM
        
        # QR
        qr = qrcode.QRCode(version=1, box_size=2, border=1)
        qr.add_data(f"ORD:{orden.numero_orden}")
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        from reportlab.lib.utils import ImageReader
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        qr_size = 18*MM
        c.drawImage(ImageReader(qr_buffer), (ancho-qr_size)/2, y-qr_size, qr_size, qr_size)
        y -= qr_size + 3*MM
        
        c.setFont("Helvetica", 6)
        c.drawCentredString(ancho/2, y, "Escanee para seguimiento")
        y -= 4*MM
        c.drawCentredString(ancho/2, y, "¡Gracias por su visita!")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generar_etiqueta_muestra(paciente, orden, estudio_nombre):
        """Etiqueta para tubo de muestra 50x25mm"""
        ancho = 50 * MM
        alto = 25 * MM
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(ancho, alto))
        
        # Código de barras
        codigo = paciente.codigo_paciente or f"P{paciente.id:06d}"
        barcode = code128.Code128(codigo, barHeight=7*MM, barWidth=0.25*MM)
        barcode.drawOn(c, 2*MM, alto-10*MM)
        
        # Info
        c.setFont("Helvetica-Bold", 7)
        c.drawString(2*MM, alto-13*MM, f"{paciente.nombre} {paciente.apellido}"[:25])
        
        c.setFont("Helvetica", 6)
        c.drawString(2*MM, alto-16*MM, f"Cod: {codigo}")
        c.drawString(2*MM, alto-19*MM, f"Ord: {orden.numero_orden}")
        c.drawString(2*MM, alto-22*MM, estudio_nombre[:25])
        
        c.drawRightString(ancho-2*MM, alto-22*MM, datetime.now().strftime('%d/%m/%y'))
        
        c.save()
        buffer.seek(0)
        return buffer
