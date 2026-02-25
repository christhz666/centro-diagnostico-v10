const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Obtener roles disponibles
// @route   GET /api/admin/roles
exports.getRoles = async (req, res, next) => {
    res.json([
        { value: 'admin', label: 'Administrador' },
        { value: 'medico', label: 'Médico' },
        { value: 'recepcion', label: 'Recepcionista' },
        { value: 'laboratorio', label: 'Laboratorista' },
        { value: 'paciente', label: 'Paciente' }
    ]);
};

// @desc    Obtener todos los usuarios
// @route   GET /api/admin/usuarios
exports.getUsuarios = async (req, res, next) => {
    try {
        let filter = {};

        if (req.query.role) filter.role = req.query.role;
        if (req.query.activo !== undefined) filter.activo = req.query.activo === 'true';

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { nombre: searchRegex },
                { apellido: searchRegex },
                { email: searchRegex }
            ];
        }

        const usuarios = await User.find(filter)
            .select('-password')
            .populate('sucursal', 'nombre codigo')
            .sort('-createdAt');

        res.json({
            success: true,
            count: usuarios.length,
            data: usuarios
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un usuario
// @route   GET /api/admin/usuarios/:id
exports.getUsuario = async (req, res, next) => {
    try {
        const usuario = await User.findById(req.params.id).select('-password');

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({ success: true, data: usuario });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear usuario (admin)
// @route   POST /api/admin/usuarios
exports.createUsuario = async (req, res, next) => {
    try {
        const body = req.body;
        // Construir objeto solo con campos válidos (evitar email/username "null" o vacíos)
        const data = {
            nombre: body.nombre,
            apellido: body.apellido,
            password: body.password,
            role: body.role || body.rol || 'recepcion',
            telefono: body.telefono || undefined,
            especialidad: body.especialidad || undefined
        };
        // Email: solo incluir si es válido (no vacío, no "null")
        const emailVal = body.email;
        if (emailVal && emailVal !== 'null' && typeof emailVal === 'string' && emailVal.trim()) {
            data.email = emailVal.trim().toLowerCase();
        }
        // Username: solo incluir si es válido
        const userVal = body.username;
        if (userVal && userVal !== 'null' && typeof userVal === 'string' && userVal.trim()) {
            data.username = userVal.trim().toLowerCase();
        }
        if (!data.username && !data.email) {
            return res.status(400).json({
                success: false,
                message: 'El usuario debe tener nombre de usuario o email para poder iniciar sesión.'
            });
        }
        // Sucursal: solo si es ObjectId válido
        if (body.sucursal && body.sucursal !== '' && body.sucursal !== 'null' && mongoose.Types.ObjectId.isValid(body.sucursal)) {
            data.sucursal = body.sucursal;
        }

        const usuario = await User.create(data);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                id: usuario._id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                role: usuario.role,
                activo: usuario.activo
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar usuario
// @route   PUT /api/admin/usuarios/:id
exports.updateUsuario = async (req, res, next) => {
    try {
        // No permitir cambiar password desde aquí
        delete req.body.password;
        // Normalizar rol/role
        if (req.body.rol && !req.body.role) {
            req.body.role = req.body.rol;
        }
        delete req.body.rol;

        // Evitar que Mongoose registre strings vacíos o "null" en índices Unique Sparse
        if (req.body.email === undefined || req.body.email === null || req.body.email === 'null' ||
            (typeof req.body.email === 'string' && req.body.email.trim() === '')) {
            delete req.body.email;
        } else {
            req.body.email = req.body.email.trim();
        }
        if (req.body.username === undefined || req.body.username === null || req.body.username === 'null' ||
            (typeof req.body.username === 'string' && req.body.username.trim() === '')) {
            delete req.body.username;
        } else if (typeof req.body.username === 'string') {
            req.body.username = req.body.username.trim();
        }
        if (req.body.sucursal === '' || req.body.sucursal === 'null') {
            req.body.sucursal = null;
        }

        const usuario = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario actualizado',
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Activar/Desactivar usuario
// @route   PATCH /api/admin/usuarios/:id/toggle
exports.toggleUsuario = async (req, res, next) => {
    try {
        const usuario = await User.findById(req.params.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir desactivarse a sí mismo
        if (usuario._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'No puede desactivar su propia cuenta'
            });
        }

        usuario.activo = !usuario.activo;
        await usuario.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}`,
            data: { activo: usuario.activo }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset password de usuario
// @route   PATCH /api/admin/usuarios/:id/reset-password
exports.resetPassword = async (req, res, next) => {
    try {
        const usuario = await User.findById(req.params.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        usuario.password = req.body.newPassword || 'Password123!';
        await usuario.save();

        res.json({
            success: true,
            message: 'Contraseña reseteada exitosamente'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener médicos
// @route   GET /api/admin/medicos
exports.getMedicos = async (req, res, next) => {
    try {
        const medicos = await User.find({ role: 'medico', activo: true })
            .select('nombre apellido especialidad licenciaMedica email telefono')
            .sort('apellido nombre');

        res.json({
            success: true,
            count: medicos.length,
            data: medicos
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener usuarios para Sync Offline (solo activos, sin passwords)
// @route   GET /api/admin/usuarios/offline-sync
exports.getUsuariosParaSyncOffline = async (req, res, next) => {
    try {
        const usuarios = await User.find({ activo: true })
            .select('nombre apellido cedula username hash_offline role sucursal');

        res.json({
            success: true,
            count: usuarios.length,
            data: usuarios
        });
    } catch (error) {
        next(error);
    }
};
