from reportlab.lib.units import mm as MM
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime

class ImpresionService:
    
    @staticmethod
    def generar_factura_80mm(factura):
        """Generar factura para impresora termica 80x80mm"""
        ancho = 80 * MM
        
        # Calcular alto dinamico
        detalles_list = list(factura.detalles)
        num_detalles = len(detalles_list)
        pagos_list = list(factura.pagos)
        num_pagos = len(pagos_list)
        
        alto_base = 130 * MM
        alto_detalles = num_detalles * 4.5 * MM
        alto_pagos = num_pagos * 4.5 * MM if num_pagos > 0 else 0
        alto = alto_base + alto_detalles + alto_pagos
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(ancho, alto))
        
        y = alto - 8*MM
        centro = ancho / 2
        margen = 5 * MM
        
        # HEADER
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(centro, y, "MI ESPERANZA")
        y -= 4.5*MM
        
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(centro, y, "CENTRO DIAGNOSTICO")
        y -= 4*MM
        
        c.setFont("Helvetica", 7)
        c.drawCentredString(centro, y, "RNC: 000-00000-0")
        y -= 3*MM
        c.drawCentredString(centro, y, "Tel: 809-000-0000")
        y -= 5*MM
        
        # Linea doble
        c.setLineWidth(0.8)
        c.line(margen, y, ancho - margen, y)
        y -= 1*MM
        c.line(margen, y, ancho - margen, y)
        y -= 5*MM
        
        # TIPO DOCUMENTO
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(centro, y, "FACTURA")
        y -= 5*MM
        
        # INFO FACTURA
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margen, y, "No: {}".format(factura.numero_factura))
        y -= 3.5*MM
        
        c.setFont("Helvetica", 7)
        c.drawString(margen, y, "NCF: {}".format(factura.ncf or 'N/A'))
        y -= 3.5*MM
        c.drawString(margen, y, "Fecha: {}".format(factura.fecha_factura.strftime('%d/%m/%Y %H:%M')))
        y -= 3.5*MM
        
        if factura.forma_pago:
            c.drawString(margen, y, "Forma Pago: {}".format(factura.forma_pago))
            y -= 3.5*MM
        
        y -= 2*MM
        
        # PACIENTE
        c.setLineWidth(0.3)
        c.setDash(2, 2)
        c.line(margen, y, ancho - margen, y)
        c.setDash()
        y -= 4*MM
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margen, y, "PACIENTE:")
        y -= 3.5*MM
        
        paciente = factura.paciente
        c.setFont("Helvetica", 7)
        if paciente:
            c.drawString(margen, y, "{} {}".format(paciente.nombre, paciente.apellido))
            y -= 3.5*MM
            c.drawString(margen, y, "Cedula: {}".format(paciente.cedula or 'N/A'))
            y -= 3.5*MM
            if paciente.telefono:
                c.drawString(margen, y, "Tel: {}".format(paciente.telefono))
                y -= 3.5*MM
            if paciente.seguro_medico:
                c.drawString(margen, y, "Seguro: {}".format(paciente.seguro_medico))
                y -= 3.5*MM
        
        y -= 2*MM
        
        # DETALLE
        c.setLineWidth(0.3)
        c.setDash(2, 2)
        c.line(margen, y, ancho - margen, y)
        c.setDash()
        y -= 4*MM
        
        c.setFont("Helvetica-Bold", 7)
        c.drawString(margen, y, "DESCRIPCION")
        c.drawRightString(ancho - margen, y, "TOTAL")
        y -= 3*MM
        c.setLineWidth(0.5)
        c.line(margen, y, ancho - margen, y)
        y -= 4*MM
        
        c.setFont("Helvetica", 7)
        for detalle in detalles_list:
            desc = detalle.descripcion
            if len(desc) > 32:
                desc = desc[:32] + "..."
            c.drawString(margen, y, desc)
            c.drawRightString(ancho - margen, y, "{:,.2f}".format(float(detalle.total)))
            y -= 4*MM
        
        y -= 1*MM
        c.setLineWidth(0.3)
        c.setDash(2, 2)
        c.line(margen, y, ancho - margen, y)
        c.setDash()
        y -= 4*MM
        
        # TOTALES
        c.setFont("Helvetica", 7)
        c.drawString(margen, y, "Subtotal:")
        c.drawRightString(ancho - margen, y, "RD$ {:,.2f}".format(float(factura.subtotal)))
        y -= 3.5*MM
        
        if float(factura.descuento) > 0:
            c.drawString(margen, y, "Descuento:")
            c.drawRightString(ancho - margen, y, "-RD$ {:,.2f}".format(float(factura.descuento)))
            y -= 3.5*MM
        
        c.drawString(margen, y, "ITBIS (18%):")
        c.drawRightString(ancho - margen, y, "RD$ {:,.2f}".format(float(factura.itbis)))
        y -= 4*MM
        
        c.setLineWidth(1)
        c.line(margen, y, ancho - margen, y)
        y -= 5*MM
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(margen, y, "TOTAL:")
        c.drawRightString(ancho - margen, y, "RD$ {:,.2f}".format(float(factura.total)))
        y -= 6*MM
        
        # PAGOS
        if pagos_list:
            c.setLineWidth(0.3)
            c.setDash(2, 2)
            c.line(margen, y, ancho - margen, y)
            c.setDash()
            y -= 4*MM
            
            c.setFont("Helvetica-Bold", 7)
            c.drawString(margen, y, "PAGOS REGISTRADOS:")
            y -= 3.5*MM
            
            total_pagado = 0
            c.setFont("Helvetica", 7)
            for pago in pagos_list:
                monto = float(pago.monto)
                total_pagado += monto
                c.drawString(margen, y, "  {} - {}".format(pago.metodo_pago, pago.fecha_pago.strftime('%d/%m/%Y')))
                c.drawRightString(ancho - margen, y, "RD$ {:,.2f}".format(monto))
                y -= 3.5*MM
            
            saldo = float(factura.total) - total_pagado
            if saldo > 0.01:
                y -= 1*MM
                c.setFont("Helvetica-Bold", 8)
                c.drawString(margen, y, "SALDO PENDIENTE:")
                c.drawRightString(ancho - margen, y, "RD$ {:,.2f}".format(saldo))
                y -= 4*MM
        
        y -= 3*MM
        
        # FOOTER
        c.setLineWidth(0.3)
        c.setDash(2, 2)
        c.line(margen, y, ancho - margen, y)
        c.setDash()
        y -= 5*MM
        
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(centro, y, "Gracias por su preferencia")
        y -= 4*MM
        
        c.setFont("Helvetica", 6)
        c.drawCentredString(centro, y, "Impreso: {}".format(datetime.now().strftime('%d/%m/%Y %H:%M:%S')))
        y -= 3*MM
        c.drawCentredString(centro, y, "Conserve este documento")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generar_etiqueta_muestra(paciente, orden, estudio_nombre):
        """Generar etiqueta para tubo de muestra"""
        ancho = 50 * MM
        alto = 25 * MM
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(ancho, alto))
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(2*MM, alto-5*MM, "{} {}".format(paciente.nombre, paciente.apellido))
        
        c.setFont("Helvetica", 6)
        c.drawString(2*MM, alto-9*MM, "Cedula: {}".format(paciente.cedula or 'N/A'))
        c.drawString(2*MM, alto-12*MM, "Orden: {}".format(orden.numero_orden))
        c.drawString(2*MM, alto-15*MM, "Estudio: {}".format(estudio_nombre[:25]))
        c.drawString(2*MM, alto-18*MM, "Fecha: {}".format(datetime.now().strftime('%d/%m/%Y %H:%M')))
        
        c.save()
        buffer.seek(0)
        return buffer
