const { body, param, query, validationResult } = require('express-validator');

// Middleware para ejecutar las validaciones
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorDetails = errors.array().map(e => e.path + ': ' + e.msg).join(', ');
        console.error('Validation Error:', errorDetails);
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: errors.array().map(err => ({
                campo: err.path,
                mensaje: err.msg,
                valor: err.value
            }))
        });
    }
    next();
};

// Validaciones para Login
const loginValidation = [
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    validate
];

// Validaciones para Registro de Usuario
const registerValidation = [
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Entre 2 y 50 caracteres'),
    body('apellido')
        .notEmpty().withMessage('El apellido es requerido')
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Entre 2 y 50 caracteres'),
    body('email')
        .optional({ checkFalsy: true })
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),
    body('username')
        .optional({ checkFalsy: true })
        .isString()
        .trim(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    body('role')
        .optional()
        .isIn(['admin', 'medico', 'recepcion', 'laboratorio', 'paciente'])
        .withMessage('Rol inválido'),
    validate
];

// Validaciones para Paciente
const pacienteValidation = [
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .trim(),
    body('apellido')
        .notEmpty().withMessage('El apellido es requerido')
        .trim(),
    body('cedula')
        .optional({ checkFalsy: true })
        .trim(),
    body('esMenor')
        .optional()
        .isBoolean().withMessage('esMenor debe ser booleano'),
    body().custom((value) => {
        if (!value.esMenor && !value.cedula) {
            throw new Error('La cédula es requerida cuando no es menor de edad');
        }
        return true;
    }),
    body('fechaNacimiento')
        .notEmpty().withMessage('La fecha de nacimiento es requerida')
        .isISO8601().withMessage('Fecha inválida'),
    body('sexo')
        .notEmpty().withMessage('El sexo es requerido')
        .isIn(['M', 'F']).withMessage('Sexo debe ser M o F'),
    body('telefono')
        .notEmpty().withMessage('El teléfono es requerido')
        .trim(),
    validate
];

// Validaciones para Cita
const citaValidation = [
    body('paciente')
        .notEmpty().withMessage('El paciente es requerido')
        .isMongoId().withMessage('ID de paciente inválido'),
    body('fecha')
        .notEmpty().withMessage('La fecha es requerida')
        .isISO8601().withMessage('Fecha inválida'),
    body('horaInicio')
        .notEmpty().withMessage('La hora es requerida'),
    body('estudios')
        .isArray({ min: 1 }).withMessage('Debe seleccionar al menos un estudio'),
    validate
];

// Validaciones para Estudio
const estudioValidation = [
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .trim(),
    body('codigo')
        .notEmpty().withMessage('El código es requerido')
        .trim(),
    body('categoria')
        .notEmpty().withMessage('La categoría es requerida'),
    body('precio')
        .notEmpty().withMessage('El precio es requerido')
        .isFloat({ min: 0 }).withMessage('El precio debe ser positivo'),
    validate
];

// Validación de ID MongoDB
const idValidation = [
    param('id')
        .isMongoId().withMessage('ID inválido'),
    validate
];

module.exports = {
    validate,
    loginValidation,
    registerValidation,
    pacienteValidation,
    citaValidation,
    estudioValidation,
    idValidation
};
