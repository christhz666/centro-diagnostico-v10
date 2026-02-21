from datetime import datetime, timedelta
from decimal import Decimal
from app import db
from app.models import Factura, FacturaDetalle, Pago, Orden, OrdenDetalle, NCFSecuencia
from sqlalchemy import func

class FacturacionService:
    
    @staticmethod
    def obtener_siguiente_ncf(tipo_comprobante='B02'):
        try:
            secuencia = NCFSecuencia.query.filter(
                NCFSecuencia.tipo_comprobante == tipo_comprobante,
                NCFSecuencia.activo == True,
                NCFSecuencia.secuencia_actual < NCFSecuencia.secuencia_fin,
                NCFSecuencia.fecha_vencimiento > datetime.now().date()
            ).first()
            if not secuencia:
                return None
            ncf = f"{secuencia.tipo_comprobante}-{secuencia.serie}-{str(secuencia.secuencia_actual).zfill(8)}"
            secuencia.secuencia_actual += 1
            db.session.commit()
            return ncf
        except:
            return None
    
    @staticmethod
    def generar_numero_factura():
        anio = datetime.now().year
        contador = db.session.query(func.count(Factura.id)).filter(
            func.extract('year', Factura.fecha_factura) == anio
        ).scalar() or 0
        return f"FAC-{anio}-{str(contador + 1).zfill(6)}"
    
    @staticmethod
    def calcular_itbis(subtotal):
        return Decimal(str(subtotal)) * Decimal('0.18')
    
    @staticmethod
    def crear_factura_desde_orden(orden_id, datos_factura):
        orden = Orden.query.get(orden_id)
        if not orden:
            raise ValueError('Orden no encontrada')
        if orden.estado == 'facturada':
            raise ValueError('Esta orden ya ha sido facturada')
        
        detalles_orden = OrdenDetalle.query.filter_by(orden_id=orden_id).all()
        if not detalles_orden:
            raise ValueError('La orden no tiene estudios')
        
        subtotal = sum(Decimal(str(d.precio_final)) for d in detalles_orden)
        descuento_global = Decimal(str(datos_factura.get('descuento_global', 0)))
        subtotal_con_descuento = subtotal - descuento_global
        incluir_itbis = datos_factura.get('incluir_itbis', False)
        itbis = FacturacionService.calcular_itbis(subtotal_con_descuento) if incluir_itbis else Decimal('0')
        total = subtotal_con_descuento + itbis
        
        factura = Factura()
        factura.numero_factura = FacturacionService.generar_numero_factura()
        factura.orden_id = orden_id
        factura.paciente_id = orden.paciente_id
        factura.fecha_factura = datetime.now()
        factura.fecha_vencimiento = datetime.now().date() + timedelta(days=30)
        
        ncf = FacturacionService.obtener_siguiente_ncf(datos_factura.get('tipo_comprobante', 'B02'))
        if ncf:
            factura.ncf = ncf
            factura.tipo_comprobante = datos_factura.get('tipo_comprobante', 'B02')
        
        factura.subtotal = subtotal
        factura.descuento = descuento_global
        factura.itbis = itbis
        factura.total = total
        factura.estado = 'pendiente'
        factura.forma_pago = datos_factura.get('forma_pago', 'efectivo')
        factura.usuario_emision_id = datos_factura.get('usuario_id')
        
        db.session.add(factura)
        db.session.flush()
        
        for detalle_orden in detalles_orden:
            detalle_factura = FacturaDetalle()
            detalle_factura.factura_id = factura.id
            detalle_factura.orden_detalle_id = detalle_orden.id
            detalle_factura.descripcion = detalle_orden.estudio.nombre if detalle_orden.estudio else 'Estudio'
            detalle_factura.cantidad = 1
            detalle_factura.precio_unitario = detalle_orden.precio
            detalle_factura.descuento = detalle_orden.descuento
            detalle_factura.itbis = Decimal('0')
            detalle_factura.total = Decimal(str(detalle_orden.precio_final))
            db.session.add(detalle_factura)
        
        orden.estado = 'facturada'
        db.session.commit()
        return factura
    
    @staticmethod
    def registrar_pago(factura_id, datos_pago):
        factura = Factura.query.get(factura_id)
        if not factura:
            raise ValueError('Factura no encontrada')
        if factura.estado == 'anulada':
            raise ValueError('No se puede pagar factura anulada')
        
        pagos_previos = db.session.query(func.sum(Pago.monto)).filter(Pago.factura_id == factura_id).scalar() or Decimal('0')
        saldo = Decimal(str(factura.total)) - Decimal(str(pagos_previos))
        monto = Decimal(str(datos_pago['monto']))
        
        if monto > saldo:
            raise ValueError('El monto excede el saldo')
        
        pago = Pago()
        pago.factura_id = factura_id
        pago.monto = monto
        pago.metodo_pago = datos_pago['metodo_pago']
        pago.referencia = datos_pago.get('referencia', '')
        pago.banco = datos_pago.get('banco', '')
        pago.usuario_recibe_id = datos_pago.get('usuario_id')
        db.session.add(pago)
        
        nuevo_saldo = saldo - monto
        factura.estado = 'pagada' if nuevo_saldo == 0 else 'parcial'
        db.session.commit()
        return pago
