from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Factura, Orden, Paciente, Estudio, Pago, OrdenDetalle
from app.utils.validators import sanitize_string
from sqlalchemy import func, extract, text, and_, or_
from datetime import datetime, timedelta
from decimal import Decimal

bp = Blueprint('reportes', __name__)


@bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Dashboard principal con todas las estadísticas"""
    hoy = datetime.now().date()
    inicio_mes = hoy.replace(day=1)
    inicio_semana = hoy - timedelta(days=hoy.weekday())

    # ========== PACIENTES ==========
    total_pacientes = Paciente.query.filter_by(estado='activo').count()

    pacientes_hoy = Paciente.query.filter(
        func.date(Paciente.created_at) == hoy
    ).count()

    pacientes_mes = Paciente.query.filter(
        Paciente.created_at >= inicio_mes
    ).count()

    # ========== ÓRDENES ==========
    ordenes_pendientes = Orden.query.filter(
        Orden.estado.in_(['pendiente', 'en_proceso'])
    ).count()

    ordenes_hoy = Orden.query.filter(
        func.date(Orden.fecha_orden) == hoy
    ).count()

    ordenes_mes = Orden.query.filter(
        Orden.fecha_orden >= inicio_mes
    ).count()

    # ========== FACTURAS ==========
    facturas_mes = Factura.query.filter(
        Factura.fecha_factura >= inicio_mes,
        Factura.estado != 'anulada'
    ).all()

    total_facturado_mes = sum(float(f.total) for f in facturas_mes)
    facturas_pendientes = len([f for f in facturas_mes if f.estado in ('pendiente', 'parcial')])
    facturas_pagadas = len([f for f in facturas_mes if f.estado == 'pagada'])

    # ========== INGRESOS ==========
    ingresos_hoy = db.session.query(
        func.coalesce(func.sum(Pago.monto), 0)
    ).filter(
        func.date(Pago.fecha_pago) == hoy
    ).scalar()

    ingresos_mes = db.session.query(
        func.coalesce(func.sum(Pago.monto), 0)
    ).filter(
        Pago.fecha_pago >= inicio_mes
    ).scalar()

    ingresos_semana = db.session.query(
        func.coalesce(func.sum(Pago.monto), 0)
    ).filter(
        Pago.fecha_pago >= inicio_semana
    ).scalar()

    # ========== CUENTAS POR COBRAR ==========
    facturas_con_saldo = Factura.query.filter(
        Factura.estado.in_(['pendiente', 'parcial'])
    ).all()

    cuentas_por_cobrar = 0
    for f in facturas_con_saldo:
        pagado = sum(float(p.monto) for p in f.pagos)
        cuentas_por_cobrar += float(f.total) - pagado

    # ========== ESTUDIOS MÁS SOLICITADOS ==========
    estudios_populares = db.session.query(
        Estudio.nombre,
        func.count(OrdenDetalle.id).label('cantidad')
    ).join(
        OrdenDetalle, Estudio.id == OrdenDetalle.estudio_id
    ).group_by(
        Estudio.nombre
    ).order_by(
        func.count(OrdenDetalle.id).desc()
    ).limit(5).all()

    # ========== INGRESOS POR DÍA (últimos 7 días) ==========
    ingresos_diarios = []
    for i in range(6, -1, -1):
        dia = hoy - timedelta(days=i)
        ingreso = db.session.query(
            func.coalesce(func.sum(Pago.monto), 0)
        ).filter(
            func.date(Pago.fecha_pago) == dia
        ).scalar()
        ingresos_diarios.append({
            'fecha': dia.isoformat(),
            'dia': dia.strftime('%a'),
            'monto': float(ingreso)
        })

    # ========== INGRESOS POR MÉTODO DE PAGO ==========
    pagos_por_metodo = db.session.query(
        Pago.metodo_pago,
        func.sum(Pago.monto).label('total'),
        func.count(Pago.id).label('cantidad')
    ).filter(
        Pago.fecha_pago >= inicio_mes
    ).group_by(Pago.metodo_pago).all()

    return jsonify({
        'fecha': hoy.isoformat(),
        'pacientes': {
            'total': total_pacientes,
            'hoy': pacientes_hoy,
            'mes': pacientes_mes
        },
        'ordenes': {
            'pendientes': ordenes_pendientes,
            'hoy': ordenes_hoy,
            'mes': ordenes_mes
        },
        'facturacion': {
            'total_mes': total_facturado_mes,
            'facturas_mes': len(facturas_mes),
            'pendientes': facturas_pendientes,
            'pagadas': facturas_pagadas,
            'cuentas_por_cobrar': cuentas_por_cobrar
        },
        'ingresos': {
            'hoy': float(ingresos_hoy),
            'semana': float(ingresos_semana),
            'mes': float(ingresos_mes),
            'diarios': ingresos_diarios
        },
        'estudios_populares': [
            {'nombre': nombre, 'cantidad': cantidad}
            for nombre, cantidad in estudios_populares
        ],
        'pagos_por_metodo': [
            {'metodo': metodo, 'total': float(total), 'cantidad': cantidad}
            for metodo, total, cantidad in pagos_por_metodo
        ]
    })


@bp.route('/ventas', methods=['GET'])
@jwt_required()
def reporte_ventas():
    """Reporte de ventas con filtros"""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')

    if not fecha_inicio or not fecha_fin:
        # Default: último mes
        fecha_fin_dt = datetime.now()
        fecha_inicio_dt = fecha_fin_dt - timedelta(days=30)
    else:
        try:
            fecha_inicio_dt = datetime.fromisoformat(fecha_inicio)
            fecha_fin_dt = datetime.fromisoformat(fecha_fin)
        except ValueError:
            return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400

    facturas = Factura.query.filter(
        Factura.fecha_factura >= fecha_inicio_dt,
        Factura.fecha_factura <= fecha_fin_dt,
        Factura.estado != 'anulada'
    ).order_by(Factura.fecha_factura.desc()).all()

    total_ventas = sum(float(f.total) for f in facturas)
    total_itbis = sum(float(f.itbis) for f in facturas)
    total_descuentos = sum(float(f.descuento) for f in facturas)

    # Pagos en el período
    pagos = Pago.query.filter(
        Pago.fecha_pago >= fecha_inicio_dt,
        Pago.fecha_pago <= fecha_fin_dt
    ).all()

    total_cobrado = sum(float(p.monto) for p in pagos)

    return jsonify({
        'periodo': {
            'inicio': fecha_inicio_dt.isoformat(),
            'fin': fecha_fin_dt.isoformat()
        },
        'resumen': {
            'total_ventas': total_ventas,
            'total_itbis': total_itbis,
            'total_descuentos': total_descuentos,
            'total_cobrado': total_cobrado,
            'cantidad_facturas': len(facturas)
        },
        'facturas': [{
            'id': f.id,
            'numero': f.numero_factura,
            'ncf': f.ncf,
            'fecha': f.fecha_factura.isoformat(),
            'paciente': f"{f.paciente.nombre} {f.paciente.apellido}" if f.paciente else 'N/A',
            'total': float(f.total),
            'estado': f.estado
        } for f in facturas]
    })


@bp.route('/cuentas-por-cobrar', methods=['GET'])
@jwt_required()
def cuentas_por_cobrar():
    """Reporte de cuentas por cobrar"""
    facturas = Factura.query.filter(
        Factura.estado.in_(['pendiente', 'parcial'])
    ).order_by(Factura.fecha_factura.asc()).all()

    resultado = []
    total_por_cobrar = 0

    for f in facturas:
        pagado = sum(float(p.monto) for p in f.pagos)
        saldo = float(f.total) - pagado
        dias_vencido = 0

        if f.fecha_vencimiento:
            dias_vencido = (datetime.now().date() - f.fecha_vencimiento).days
            if dias_vencido < 0:
                dias_vencido = 0

        total_por_cobrar += saldo

        resultado.append({
            'factura_id': f.id,
            'numero_factura': f.numero_factura,
            'paciente': f"{f.paciente.nombre} {f.paciente.apellido}" if f.paciente else 'N/A',
            'paciente_telefono': f.paciente.telefono if f.paciente else None,
            'fecha_factura': f.fecha_factura.isoformat(),
            'fecha_vencimiento': f.fecha_vencimiento.isoformat() if f.fecha_vencimiento else None,
            'total': float(f.total),
            'pagado': pagado,
            'saldo': saldo,
            'dias_vencido': dias_vencido,
            'estado': 'vencida' if dias_vencido > 0 else f.estado
        })

    return jsonify({
        'total_por_cobrar': total_por_cobrar,
        'cantidad': len(resultado),
        'cuentas': resultado
    })


@bp.route('/estudios-realizados', methods=['GET'])
@jwt_required()
def estudios_realizados():
    """Reporte de estudios realizados"""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')

    if not fecha_inicio:
        fecha_inicio_dt = datetime.now() - timedelta(days=30)
    else:
        fecha_inicio_dt = datetime.fromisoformat(fecha_inicio)

    if not fecha_fin:
        fecha_fin_dt = datetime.now()
    else:
        fecha_fin_dt = datetime.fromisoformat(fecha_fin)

    estudios = db.session.query(
        Estudio.codigo,
        Estudio.nombre,
        func.count(OrdenDetalle.id).label('cantidad'),
        func.sum(OrdenDetalle.precio_final).label('total_facturado')
    ).join(
        OrdenDetalle, Estudio.id == OrdenDetalle.estudio_id
    ).join(
        Orden, Orden.id == OrdenDetalle.orden_id
    ).filter(
        Orden.fecha_orden >= fecha_inicio_dt,
        Orden.fecha_orden <= fecha_fin_dt
    ).group_by(
        Estudio.codigo, Estudio.nombre
    ).order_by(
        func.count(OrdenDetalle.id).desc()
    ).all()

    return jsonify({
        'periodo': {
            'inicio': fecha_inicio_dt.isoformat(),
            'fin': fecha_fin_dt.isoformat()
        },
        'estudios': [{
            'codigo': codigo,
            'nombre': nombre,
            'cantidad': cantidad,
            'total_facturado': float(total) if total else 0
        } for codigo, nombre, cantidad, total in estudios],
        'total_estudios': sum(e[2] for e in estudios)
    })


@bp.route('/contabilidad', methods=['GET'])
@jwt_required()
def contabilidad():
    """Reporte de contabilidad por período"""
    from flask_jwt_extended import get_jwt_identity
    from app.models import Usuario
    
    # Solo admin
    user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(user_id)
    if not usuario or usuario.rol != 'admin':
        return jsonify({'error': 'Acceso denegado'}), 403

    periodo = request.args.get('periodo', 'mensual')
    hoy = datetime.now().date()

    if periodo == 'diario':
        fecha_inicio = hoy
    elif periodo == 'semanal':
        fecha_inicio = hoy - timedelta(days=hoy.weekday())
    elif periodo == 'mensual':
        fecha_inicio = hoy.replace(day=1)
    elif periodo == 'trimestral':
        mes_inicio = ((hoy.month - 1) // 3) * 3 + 1
        fecha_inicio = hoy.replace(month=mes_inicio, day=1)
    elif periodo == 'semestral':
        mes_inicio = 1 if hoy.month <= 6 else 7
        fecha_inicio = hoy.replace(month=mes_inicio, day=1)
    elif periodo == 'anual':
        fecha_inicio = hoy.replace(month=1, day=1)
    else:
        fecha_inicio = hoy.replace(day=1)

    fecha_fin = hoy

    # Ingresos (pagos recibidos)
    pagos = Pago.query.filter(
        func.date(Pago.fecha_pago) >= fecha_inicio,
        func.date(Pago.fecha_pago) <= fecha_fin
    ).all()

    total_ingresos = sum(float(p.monto) for p in pagos)

    # Por método de pago
    pagos_por_metodo = db.session.query(
        Pago.metodo_pago,
        func.sum(Pago.monto).label('total'),
        func.count(Pago.id).label('cantidad')
    ).filter(
        func.date(Pago.fecha_pago) >= fecha_inicio,
        func.date(Pago.fecha_pago) <= fecha_fin
    ).group_by(Pago.metodo_pago).all()

    # Facturado
    facturas = Factura.query.filter(
        func.date(Factura.fecha_factura) >= fecha_inicio,
        func.date(Factura.fecha_factura) <= fecha_fin,
        Factura.estado != 'anulada'
    ).all()

    total_facturado = sum(float(f.total) for f in facturas)

    # Por cobrar
    facturas_pendientes = Factura.query.filter(
        Factura.estado.in_(['pendiente', 'parcial'])
    ).all()

    por_cobrar = 0
    for f in facturas_pendientes:
        pagado = sum(float(p.monto) for p in f.pagos)
        por_cobrar += float(f.total) - pagado

    # Órdenes
    ordenes = Orden.query.filter(
        func.date(Orden.fecha_orden) >= fecha_inicio,
        func.date(Orden.fecha_orden) <= fecha_fin
    ).count()

    return jsonify({
        'periodo': periodo,
        'fecha_inicio': fecha_inicio.isoformat(),
        'fecha_fin': fecha_fin.isoformat(),
        'ingresos': total_ingresos,
        'cantidad_pagos': len(pagos),
        'facturado': total_facturado,
        'cantidad_facturas': len(facturas),
        'por_cobrar': por_cobrar,
        'facturas_pendientes': len(facturas_pendientes),
        'ordenes': ordenes,
        'por_metodo': [
            {'metodo': m, 'total': float(t), 'cantidad': c}
            for m, t, c in pagos_por_metodo
        ]
    })


@bp.route('/por-doctor', methods=['GET'])
@jwt_required()
def reporte_por_doctor():
    """Reporte de órdenes/estudios por médico referente"""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    
    if not fecha_inicio:
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not fecha_fin:
        fecha_fin = datetime.now().strftime('%Y-%m-%d')
    
    resultado = db.session.query(
        Orden.medico_referente,
        func.count(Orden.id).label('total_ordenes'),
        func.sum(
            db.session.query(func.sum(OrdenDetalle.precio_final))
            .filter(OrdenDetalle.orden_id == Orden.id)
            .correlate(Orden)
            .scalar_subquery()
        ).label('total_facturado')
    ).filter(
        Orden.fecha_orden >= fecha_inicio,
        Orden.fecha_orden <= fecha_fin,
        Orden.medico_referente.isnot(None),
        Orden.medico_referente != ''
    ).group_by(Orden.medico_referente).order_by(func.count(Orden.id).desc()).all()
    
    return jsonify({
        'periodo': {'inicio': fecha_inicio, 'fin': fecha_fin},
        'doctores': [{
            'nombre': doctor or 'Sin referente',
            'ordenes': ordenes,
            'facturado': float(facturado or 0)
        } for doctor, ordenes, facturado in resultado]
    })


@bp.route('/por-seguro', methods=['GET'])
@jwt_required()
def reporte_por_seguro():
    """Reporte de pacientes/facturación por seguro médico"""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    
    if not fecha_inicio:
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not fecha_fin:
        fecha_fin = datetime.now().strftime('%Y-%m-%d')
    
    resultado = db.session.query(
        Paciente.seguro_medico,
        func.count(func.distinct(Factura.paciente_id)).label('pacientes'),
        func.count(Factura.id).label('facturas'),
        func.sum(Factura.total).label('total')
    ).join(
        Factura, Factura.paciente_id == Paciente.id
    ).filter(
        Factura.fecha_factura >= fecha_inicio,
        Factura.fecha_factura <= fecha_fin,
        Factura.estado != 'anulada'
    ).group_by(Paciente.seguro_medico).order_by(func.sum(Factura.total).desc()).all()
    
    return jsonify({
        'periodo': {'inicio': fecha_inicio, 'fin': fecha_fin},
        'seguros': [{
            'seguro': seguro or 'Sin seguro',
            'pacientes': pacientes,
            'facturas': facturas,
            'total': float(total or 0)
        } for seguro, pacientes, facturas, total in resultado]
    })


@bp.route('/estudios-detallado', methods=['GET'])
@jwt_required()
def reporte_estudios_detallado():
    """Reporte detallado de estudios realizados"""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    categoria_id = request.args.get('categoria_id', type=int)
    
    if not fecha_inicio:
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not fecha_fin:
        fecha_fin = datetime.now().strftime('%Y-%m-%d')
    
    query = db.session.query(
        Estudio.codigo,
        Estudio.nombre,
        CategoriaEstudio.nombre.label('categoria'),
        func.count(OrdenDetalle.id).label('cantidad'),
        func.sum(OrdenDetalle.precio_final).label('total'),
        func.avg(OrdenDetalle.precio_final).label('precio_promedio')
    ).join(
        OrdenDetalle, Estudio.id == OrdenDetalle.estudio_id
    ).join(
        Orden, Orden.id == OrdenDetalle.orden_id
    ).outerjoin(
        CategoriaEstudio, CategoriaEstudio.id == Estudio.categoria_id
    ).filter(
        Orden.fecha_orden >= fecha_inicio,
        Orden.fecha_orden <= fecha_fin
    )
    
    if categoria_id:
        query = query.filter(Estudio.categoria_id == categoria_id)
    
    resultado = query.group_by(
        Estudio.codigo, Estudio.nombre, CategoriaEstudio.nombre
    ).order_by(func.count(OrdenDetalle.id).desc()).all()
    
    return jsonify({
        'periodo': {'inicio': fecha_inicio, 'fin': fecha_fin},
        'estudios': [{
            'codigo': codigo,
            'nombre': nombre,
            'categoria': categoria or 'Sin categoría',
            'cantidad': cantidad,
            'total': float(total or 0),
            'precio_promedio': float(precio_promedio or 0)
        } for codigo, nombre, categoria, cantidad, total, precio_promedio in resultado]
    })


@bp.route('/ingresos-diarios', methods=['GET'])
@jwt_required()
def reporte_ingresos_diarios():
    """Reporte de ingresos día por día"""
    dias = request.args.get('dias', 30, type=int)
    dias = min(dias, 365)  # Máximo un año
    
    fecha_inicio = datetime.now().date() - timedelta(days=dias)
    
    resultado = db.session.query(
        func.date(Pago.fecha_pago).label('fecha'),
        func.sum(Pago.monto).label('total'),
        func.count(Pago.id).label('cantidad')
    ).filter(
        func.date(Pago.fecha_pago) >= fecha_inicio
    ).group_by(
        func.date(Pago.fecha_pago)
    ).order_by(func.date(Pago.fecha_pago)).all()
    
    return jsonify({
        'dias': dias,
        'ingresos': [{
            'fecha': fecha.isoformat(),
            'total': float(total or 0),
            'cantidad': cantidad
        } for fecha, total, cantidad in resultado]
    })
