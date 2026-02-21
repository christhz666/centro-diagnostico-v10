const MovimientoContable = require('../models/MovimientoContable');
const Factura = require('../models/Factura');

// @desc    Obtener movimientos contables
// @route   GET /api/contabilidad
exports.getMovimientos = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const skip = (page - 1) * limit;

        let filter = {};

        if (req.query.tipo) filter.tipo = req.query.tipo;
        if (req.query.categoria) filter.categoria = req.query.categoria;

        if (req.query.fechaInicio && req.query.fechaFin) {
            filter.fecha = {
                $gte: new Date(req.query.fechaInicio),
                $lte: new Date(req.query.fechaFin)
            };
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { descripcion: searchRegex },
                { referencia: searchRegex }
            ];
        }

        const [movimientos, total] = await Promise.all([
            MovimientoContable.find(filter)
                .populate('creadoPor', 'nombre apellido')
                .populate('factura', 'numero total')
                .sort('-fecha')
                .skip(skip)
                .limit(limit),
            MovimientoContable.countDocuments(filter)
        ]);

        res.json({
            success: true,
            count: movimientos.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: movimientos
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear movimiento contable
// @route   POST /api/contabilidad
exports.createMovimiento = async (req, res, next) => {
    try {
        req.body.creadoPor = req.user._id;
        const movimiento = await MovimientoContable.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Movimiento registrado exitosamente',
            data: movimiento
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener resumen contable
// @route   GET /api/contabilidad/resumen
exports.getResumenContable = async (req, res, next) => {
    try {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

        // Get aggregated data
        const [resumenHoy, resumenMes, resumenAnio, porCategoria, facturasIngreso] = await Promise.all([
            // Today's summary
            MovimientoContable.aggregate([
                { $match: { fecha: { $gte: inicioHoy, $lte: finHoy } } },
                { $group: {
                    _id: '$tipo',
                    total: { $sum: '$monto' },
                    cantidad: { $sum: 1 }
                }}
            ]),
            // Monthly summary
            MovimientoContable.aggregate([
                { $match: { fecha: { $gte: inicioMes } } },
                { $group: {
                    _id: '$tipo',
                    total: { $sum: '$monto' },
                    cantidad: { $sum: 1 }
                }}
            ]),
            // Yearly summary
            MovimientoContable.aggregate([
                { $match: { fecha: { $gte: inicioAnio } } },
                { $group: {
                    _id: '$tipo',
                    total: { $sum: '$monto' },
                    cantidad: { $sum: 1 }
                }}
            ]),
            // By category this month
            MovimientoContable.aggregate([
                { $match: { fecha: { $gte: inicioMes } } },
                { $group: {
                    _id: { tipo: '$tipo', categoria: '$categoria' },
                    total: { $sum: '$monto' },
                    cantidad: { $sum: 1 }
                }},
                { $sort: { total: -1 } }
            ]),
            // Invoiced income this month (from Factura model)
            Factura.aggregate([
                { $match: { estado: { $ne: 'anulada' }, createdAt: { $gte: inicioMes } } },
                { $group: {
                    _id: null,
                    totalFacturado: { $sum: '$total' },
                    totalCobrado: { $sum: '$montoPagado' },
                    cantidad: { $sum: 1 }
                }}
            ])
        ]);

        // Helper to extract totals
        const extractTotal = (arr, tipo) => {
            const found = arr.find(r => r._id === tipo);
            return found ? { total: found.total, cantidad: found.cantidad } : { total: 0, cantidad: 0 };
        };

        const ingresosHoy = extractTotal(resumenHoy, 'ingreso');
        const egresosHoy = extractTotal(resumenHoy, 'egreso');
        const ingresosMes = extractTotal(resumenMes, 'ingreso');
        const egresosMes = extractTotal(resumenMes, 'egreso');
        const ingresosAnio = extractTotal(resumenAnio, 'ingreso');
        const egresosAnio = extractTotal(resumenAnio, 'egreso');

        res.json({
            success: true,
            data: {
                hoy: {
                    ingresos: ingresosHoy.total,
                    egresos: egresosHoy.total,
                    balance: ingresosHoy.total - egresosHoy.total
                },
                mes: {
                    ingresos: ingresosMes.total,
                    egresos: egresosMes.total,
                    balance: ingresosMes.total - egresosMes.total
                },
                anio: {
                    ingresos: ingresosAnio.total,
                    egresos: egresosAnio.total,
                    balance: ingresosAnio.total - egresosAnio.total
                },
                porCategoria,
                facturacion: facturasIngreso[0] || { totalFacturado: 0, totalCobrado: 0, cantidad: 0 }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener flujo de caja mensual (últimos 12 meses)
// @route   GET /api/contabilidad/flujo-caja
exports.getFlujoCaja = async (req, res, next) => {
    try {
        const hace12Meses = new Date();
        hace12Meses.setMonth(hace12Meses.getMonth() - 12);

        const flujo = await MovimientoContable.aggregate([
            { $match: { fecha: { $gte: hace12Meses } } },
            { $group: {
                _id: {
                    anio: { $year: '$fecha' },
                    mes: { $month: '$fecha' },
                    tipo: '$tipo'
                },
                total: { $sum: '$monto' },
                cantidad: { $sum: 1 }
            }},
            { $sort: { '_id.anio': 1, '_id.mes': 1 } }
        ]);

        res.json({
            success: true,
            data: flujo
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar movimiento contable
// @route   DELETE /api/contabilidad/:id
exports.deleteMovimiento = async (req, res, next) => {
    try {
        const movimiento = await MovimientoContable.findByIdAndDelete(req.params.id);

        if (!movimiento) {
            return res.status(404).json({
                success: false,
                message: 'Movimiento no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Movimiento eliminado'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Resumen de facturación del día (conectado con facturas reales)
// @route   GET /api/contabilidad/facturacion-dia
exports.getFacturacionDia = async (req, res, next) => {
    try {
        const hoy = new Date();
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        const [facturasHoy, facturasMes, porMetodoPago, ultimasFacturas] = await Promise.all([
            Factura.aggregate([
                { $match: { estado: { $ne: 'anulada' }, createdAt: { $gte: inicioHoy, $lte: finHoy } } },
                { $group: {
                    _id: null,
                    totalFacturado: { $sum: '$total' },
                    totalCobrado: { $sum: '$montoPagado' },
                    cantidad: { $sum: 1 },
                    pagadas: { $sum: { $cond: ['$pagado', 1, 0] } }
                }}
            ]),
            Factura.aggregate([
                { $match: { estado: { $ne: 'anulada' }, createdAt: { $gte: inicioMes } } },
                { $group: {
                    _id: null,
                    totalFacturado: { $sum: '$total' },
                    totalCobrado: { $sum: '$montoPagado' },
                    cantidad: { $sum: 1 }
                }}
            ]),
            Factura.aggregate([
                { $match: { estado: { $ne: 'anulada' }, createdAt: { $gte: inicioHoy, $lte: finHoy } } },
                { $group: {
                    _id: '$metodoPago',
                    total: { $sum: '$total' },
                    cantidad: { $sum: 1 }
                }}
            ]),
            Factura.find({ estado: { $ne: 'anulada' }, createdAt: { $gte: inicioHoy, $lte: finHoy } })
                .populate('paciente', 'nombre apellido')
                .sort('-createdAt')
                .limit(10)
                .select('numero total montoPagado pagado metodoPago estado datosCliente createdAt')
        ]);

        res.json({
            success: true,
            data: {
                hoy: facturasHoy[0] || { totalFacturado: 0, totalCobrado: 0, cantidad: 0, pagadas: 0 },
                mes: facturasMes[0] || { totalFacturado: 0, totalCobrado: 0, cantidad: 0 },
                porMetodoPago,
                ultimasFacturas
            }
        });
    } catch (error) {
        next(error);
    }
};
