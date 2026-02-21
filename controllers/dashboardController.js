const Paciente = require('../models/Paciente');
const Cita = require('../models/Cita');
const Resultado = require('../models/Resultado');
const Factura = require('../models/Factura');
const User = require('../models/User');

// @desc    Estadísticas generales del dashboard
// @route   GET /api/dashboard/stats
exports.getStats = async (req, res, next) => {
    try {
        const hoy = new Date();
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());

        const [
            totalPacientes,
            pacientesNuevosMes,
            citasHoy,
            citasProgramadas,
            citasEnProceso,
            citasCompletadasHoy,
            citasMes,
            resultadosPendientes,
            resultadosCompletados,
            facturacionHoy,
            facturacionMes,
            totalMedicos,
            totalUsuarios
        ] = await Promise.all([
            Paciente.countDocuments({ activo: true }),
            Paciente.countDocuments({ createdAt: { $gte: inicioMes } }),
            Cita.countDocuments({ fecha: { $gte: inicioHoy, $lte: finHoy } }),
            Cita.countDocuments({ estado: 'programada', fecha: { $gte: inicioHoy } }),
            Cita.countDocuments({ estado: 'en_proceso' }),
            Cita.countDocuments({ estado: 'completada', fecha: { $gte: inicioHoy, $lte: finHoy } }),
            Cita.countDocuments({ fecha: { $gte: inicioMes } }),
            Resultado.countDocuments({ estado: { $in: ['pendiente', 'en_proceso'] } }),
            Resultado.countDocuments({ estado: 'completado', createdAt: { $gte: inicioMes } }),
            Factura.aggregate([
                { $match: { estado: { $ne: 'anulada' }, createdAt: { $gte: inicioHoy, $lte: finHoy } } },
                { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } }
            ]),
            Factura.aggregate([
                { $match: { estado: { $ne: 'anulada' }, createdAt: { $gte: inicioMes } } },
                { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } }
            ]),
            User.countDocuments({ role: 'medico', activo: true }),
            User.countDocuments({ activo: true })
        ]);

        res.json({
            success: true,
            data: {
                pacientes: {
                    total: totalPacientes,
                    nuevosMes: pacientesNuevosMes
                },
                citas: {
                    hoy: citasHoy,
                    programadas: citasProgramadas,
                    enProceso: citasEnProceso,
                    completadasHoy: citasCompletadasHoy,
                    mes: citasMes
                },
                resultados: {
                    pendientes: resultadosPendientes,
                    completadosMes: resultadosCompletados
                },
                facturacion: {
                    hoy: facturacionHoy[0] || { total: 0, cantidad: 0 },
                    mes: facturacionMes[0] || { total: 0, cantidad: 0 }
                },
                personal: {
                    medicos: totalMedicos,
                    totalUsuarios: totalUsuarios
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Gráfica de citas por día (últimos 30 días)
// @route   GET /api/dashboard/citas-grafica
exports.citasGrafica = async (req, res, next) => {
    try {
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);

        const citasPorDia = await Cita.aggregate([
            { $match: { fecha: { $gte: hace30Dias } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
                total: { $sum: 1 },
                completadas: { 
                    $sum: { $cond: [{ $eq: ['$estado', 'completada'] }, 1, 0] }
                },
                canceladas: {
                    $sum: { $cond: [{ $eq: ['$estado', 'cancelada'] }, 1, 0] }
                }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: citasPorDia
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Estudios más solicitados
// @route   GET /api/dashboard/top-estudios
exports.topEstudios = async (req, res, next) => {
    try {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const topEstudios = await Cita.aggregate([
            { $match: { createdAt: { $gte: inicioMes } } },
            { $unwind: '$estudios' },
            { $group: {
                _id: '$estudios.estudio',
                cantidad: { $sum: 1 },
                ingresos: { $sum: '$estudios.precio' }
            }},
            { $sort: { cantidad: -1 } },
            { $limit: 10 },
            { $lookup: {
                from: 'estudios',
                localField: '_id',
                foreignField: '_id',
                as: 'estudioInfo'
            }},
            { $unwind: '$estudioInfo' },
            { $project: {
                nombre: '$estudioInfo.nombre',
                codigo: '$estudioInfo.codigo',
                categoria: '$estudioInfo.categoria',
                cantidad: 1,
                ingresos: 1
            }}
        ]);

        res.json({
            success: true,
            data: topEstudios
        });
    } catch (error) {
        next(error);
    }
};
