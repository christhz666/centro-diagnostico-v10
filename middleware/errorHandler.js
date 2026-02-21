// Clase de error personalizada
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Middleware de manejo de errores
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log del error
    console.error('? Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user._id : 'No autenticado'
    });

    // Error de ID de Mongoose inválido
    if (err.name === 'CastError') {
        const message = `Recurso no encontrado con id: ${err.value}`;
        error = new AppError(message, 404);
    }

    // Error de campo duplicado en Mongoose
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        const message = `Ya existe un registro con ${field}: "${value}"`;
        error = new AppError(message, 400);
    }

    // Error de validación de Mongoose
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        const message = `Datos inválidos: ${messages.join('. ')}`;
        error = new AppError(message, 400);
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Token inválido', 401);
    }

    // Error de JWT expirado
    if (err.name === 'TokenExpiredError') {
        error = new AppError('Sesión expirada', 401);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            error: err 
        })
    });
};

// Middleware para rutas no encontradas
const notFound = (req, res, next) => {
    const error = new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404);
    next(error);
};

module.exports = { AppError, errorHandler, notFound };
