const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');

// Middleware para inyectar sucursalId en la petición
exports.requireSucursal = (req, res, next) => {
    // 1. Obtener la sucursal ligada estrictamente al perfil (Los usuarios no se cambian solos)
    let sucursalId = req.user && req.user.sucursal ? req.user.sucursal.toString() : null;

    // 2. Solo si el usuario no tiene sucursal rígida, le permitimos enviar el header
    if (!sucursalId && req.headers['x-sucursal-id']) {
        sucursalId = req.headers['x-sucursal-id'];
    }

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

    // Inyectar en req body y objeto principal para que los controladores lo usen fácilmente
    req.sucursalId = sucursalId;
    if (req.method === 'POST' || req.method === 'PUT') {
        req.body.sucursal = sucursalId;
    }

    next();
};
