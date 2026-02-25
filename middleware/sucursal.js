const mongoose = require('mongoose');
const Sucursal = require('../models/Sucursal');

// Middleware para inyectar sucursalId en la petición
exports.requireSucursal = async (req, res, next) => {
    try {
        // 1. Obtener la sucursal ligada estrictamente al perfil
        let sucursalId = req.user && req.user.sucursal ? req.user.sucursal.toString() : null;

        // 2. Solo si el usuario no tiene sucursal, permitir header x-sucursal-id
        if (!sucursalId && req.headers['x-sucursal-id']) {
            sucursalId = req.headers['x-sucursal-id'];
        }

        // 3. Exonerar a Administradores y Médicos
        if (!sucursalId && req.user && (req.user.role === 'admin' || req.user.role === 'super-admin' || req.user.role === 'medico')) {
            return next();
        }

        // 4. Fallback: si no hay sucursal pero existe solo una en el sistema, usarla
        if (!sucursalId) {
            const sucursales = await Sucursal.find().limit(2).lean();
            if (sucursales.length === 1) {
                sucursalId = sucursales[0]._id.toString();
            }
        }

        // 5. Si sigue sin sucursal, rechazar
        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'No tienes una sucursal física asignada en tu perfil de usuario. Contacta al administrador.'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(sucursalId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de Sucursal inválido'
            });
        }

        // Inyectar sucursal en req
        req.sucursalId = sucursalId;
        if (req.method === 'POST' || req.method === 'PUT') {
            req.body.sucursal = sucursalId;
        }

        next();
    } catch (err) {
        next(err);
    }
};
