const TurnoCaja = require('../models/TurnoCaja');
const Sucursal = require('../models/Sucursal');

// Helper: obtener sucursalId (header, user, o fallback a única sucursal)
async function getSucursalId(req) {
    let id = req.headers['x-sucursal-id'] || (req.user && req.user.sucursal ? req.user.sucursal.toString() : null);
    if (!id) {
        const s = await Sucursal.findOne().select('_id').lean();
        if (s) id = s._id.toString();
    }
    return id;
}

// Función Helper: Si son las 20:30 (8:30 PM), contablemente es el día siguiente a las 05:00
const getFechaContable = () => {
    const ahora = new Date();
    const hora = ahora.getHours();

    // Si la hora es >= 20 (8:00 PM), es el turno del día siguiente
    if (hora >= 20) {
        ahora.setDate(ahora.getDate() + 1);
    }
    // Siempre normalizamos la hora base a las 05:00 AM para agrupar todo contablemente
    ahora.setHours(5, 0, 0, 0);
    return ahora;
};

// @desc    Obtener turno activo del usuario autenticado
// @route   GET /api/caja/activa
// @access  Privado
exports.getTurnoActivo = async (req, res, next) => {
    try {
        let sucursalId = await getSucursalId(req);
        if (!sucursalId) {
            // Administradores y Médicos globales no tienen turno de caja por defecto
            return res.status(200).json({ success: true, data: null });
        }

        const turno = await TurnoCaja.findOne({
            usuario: req.user._id,
            sucursal: sucursalId,
            estado: 'abierto'
        });

        res.status(200).json({
            success: true,
            data: turno
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Abrir nuevo turno de caja (Fondo en 0 automático)
// @route   POST /api/caja/abrir
// @access  Privado
exports.abrirTurno = async (req, res, next) => {
    try {
        const sucursalId = await getSucursalId(req);
        if (!sucursalId) {
            return res.status(400).json({ success: false, error: 'Sucursal no definida. Crea al menos una sucursal en Administración.' });
        }

        // Verificar si ya tiene turno abierto
        const turnoExistente = await TurnoCaja.findOne({
            usuario: req.user._id,
            sucursal: sucursalId,
            estado: 'abierto'
        });

        if (turnoExistente) {
            return res.status(400).json({
                success: false,
                error: 'Ya tienes un turno de caja abierto en esta sucursal'
            });
        }

        const turno = await TurnoCaja.create({
            usuario: req.user._id,
            sucursal: sucursalId,
            fechaContable: getFechaContable(),
            fondoInicial: 0 // Siempre inicia en 0 por regla de negocio
        });

        res.status(201).json({
            success: true,
            data: turno
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cerrar turno de caja activo
// @route   POST /api/caja/cerrar
// @access  Privado
exports.cerrarTurno = async (req, res, next) => {
    try {
        const sucursalId = await getSucursalId(req);

        const turno = await TurnoCaja.findOne({
            usuario: req.user._id,
            sucursal: sucursalId,
            estado: 'abierto'
        });

        if (!turno) {
            return res.status(404).json({ success: false, error: 'No hay turno de caja activo para cerrar' });
        }

        turno.estado = 'cerrado';
        turno.fechaFin = Date.now();
        await turno.save();

        res.status(200).json({
            success: true,
            data: turno,
            message: 'Turno cerrado con éxito'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener historial de turnos de una sucursal
// @route   GET /api/caja/historial
// @access  Privado/Admin
exports.getHistorialTurnos = async (req, res, next) => {
    try {
        const sucursalId = await getSucursalId(req);
        const turnos = await TurnoCaja.find({ sucursal: sucursalId })
            .populate('usuario', 'nombre apellido')
            .sort('-fechaInicio');

        res.status(200).json({
            success: true,
            count: turnos.length,
            data: turnos
        });
    } catch (error) {
        next(error);
    }
};
