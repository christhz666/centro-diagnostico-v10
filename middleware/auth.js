const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Proteger rutas - verificar token
const protect = async (req, res, next) => {
    let token;

    // Obtener token del header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado. Debe iniciar sesión.'
        });
    }

    try {
        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuario
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'El usuario asociado a este token ya no existe'
            });
        }

        // Verificar si está activo
        if (!user.activo) {
            return res.status(401).json({
                success: false,
                message: 'Su cuenta ha sido desactivada. Contacte al administrador.'
            });
        }

        // Verificar si cambió la contraseña después del token
        if (user.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña cambiada recientemente. Inicie sesión nuevamente.'
            });
        }

        // Agregar usuario al request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Su sesión ha expirado. Inicie sesión nuevamente.'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido. Inicie sesión nuevamente.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Error de autenticación'
        });
    }
};

// Autorizar por roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `El rol "${req.user.role}" no tiene permiso para esta acción. Se requiere: ${roles.join(', ')}`
            });
        }
        next();
    };
};

// Opcional: verificar si es el mismo usuario o admin
const authorizeOwnerOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
        return res.status(403).json({
            success: false,
            message: 'No tiene permiso para acceder a este recurso'
        });
    }
    next();
};

module.exports = { protect, authorize, authorizeOwnerOrAdmin };
