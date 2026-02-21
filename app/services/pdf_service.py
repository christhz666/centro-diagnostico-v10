from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from datetime import datetime
import os

class PDFService:
    
    @staticmethod
    def generar_factura_pdf(factura, output_path):
        try:
            # Asegurar directorio
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            doc = SimpleDocTemplate(output_path, pagesize=letter,
                                    leftMargin=0.5*inch, rightMargin=0.5*inch,
                                    topMargin=0.5*inch, bottomMargin=0.5*inch)
            elements = []
            styles = getSampleStyleSheet()
            
            # Estilos personalizados
            title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], 
                                         fontSize=20, textColor=colors.HexColor('#2c3e50'), 
                                         spaceAfter=10, alignment=TA_CENTER)
            
            subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                            fontSize=10, textColor=colors.grey,
                                            alignment=TA_CENTER, spaceAfter=20)
            
            # Header
            elements.append(Paragraph("MI ESPERANZA CENTRO DIAGNOSTICO", title_style))
            elements.append(Paragraph("RNC: 000-00000-0 | Tel: 809-000-0000", subtitle_style))
            elements.append(Spacer(1, 0.2*inch))
            
            # Título factura
            elements.append(Paragraph(f"<b>FACTURA {factura.numero_factura}</b>", 
                                      ParagraphStyle('FactTitle', fontSize=14, alignment=TA_CENTER, spaceAfter=15)))
            
            # Info factura y paciente
            paciente = factura.paciente
            info_data = [
                ['NCF:', factura.ncf or 'N/A', 'Fecha:', factura.fecha_factura.strftime('%d/%m/%Y')],
                ['Paciente:', f"{paciente.nombre} {paciente.apellido}" if paciente else 'N/A', 
                 'Cédula:', paciente.cedula if paciente else 'N/A'],
                ['Estado:', factura.estado.upper(), 'Forma Pago:', factura.forma_pago or 'N/A']
            ]
            
            info_table = Table(info_data, colWidths=[1.2*inch, 2.5*inch, 1.2*inch, 2.5*inch])
            info_table.setStyle(TableStyle([
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ]))
            elements.append(info_table)
            elements.append(Spacer(1, 0.3*inch))
            
            # Detalles
            detalles_data = [['Descripción', 'Cant.', 'Precio Unit.', 'Total']]
            for detalle in factura.detalles:
                detalles_data.append([
                    detalle.descripcion[:50],
                    str(detalle.cantidad),
                    f"RD$ {float(detalle.precio_unitario):,.2f}",
                    f"RD$ {float(detalle.total):,.2f}"
                ])
            
            detalles_table = Table(detalles_data, colWidths=[4*inch, 0.7*inch, 1.3*inch, 1.3*inch])
            detalles_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('ALIGN', (1,0), (-1,-1), 'CENTER'),
                ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
                ('BOTTOMPADDING', (0,0), (-1,0), 10),
                ('TOPPADDING', (0,0), (-1,0), 10),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8f9fa')]),
            ]))
            elements.append(detalles_table)
            elements.append(Spacer(1, 0.2*inch))
            
            # Totales
            totales_data = [
                ['', '', 'Subtotal:', f"RD$ {float(factura.subtotal):,.2f}"],
                ['', '', 'Descuento:', f"RD$ {float(factura.descuento):,.2f}"],
                ['', '', 'ITBIS (18%):', f"RD$ {float(factura.itbis):,.2f}"],
                ['', '', 'TOTAL:', f"RD$ {float(factura.total):,.2f}"]
            ]
            
            totales_table = Table(totales_data, colWidths=[4*inch, 0.7*inch, 1.3*inch, 1.3*inch])
            totales_table.setStyle(TableStyle([
                ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
                ('FONTNAME', (2,-1), (-1,-1), 'Helvetica-Bold'),
                ('FONTSIZE', (2,-1), (-1,-1), 11),
                ('TEXTCOLOR', (2,-1), (-1,-1), colors.HexColor('#27ae60')),
                ('LINEABOVE', (2,-1), (-1,-1), 2, colors.HexColor('#667eea')),
                ('TOPPADDING', (0,-1), (-1,-1), 10),
            ]))
            elements.append(totales_table)
            elements.append(Spacer(1, 0.5*inch))
            
            # Footer
            footer_style = ParagraphStyle('Footer', fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
            elements.append(Paragraph("Gracias por su preferencia", footer_style))
            elements.append(Paragraph(f"Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}", footer_style))
            
            doc.build(elements)
            return output_path
            
        except Exception as e:
            raise Exception(f"Error generando PDF: {str(e)}")
