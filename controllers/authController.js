const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// @desc    Login
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const loginIdentifier = email || username;

        if (!loginIdentifier || !password) {
            return res.status(400).json({ success: false, message: 'Por favor provea usuario/correo y contraseña' });
        }

        // Buscar usuario con password
        const user = await User.findOne({
            $or: [
                { email: loginIdentifier },
                { username: loginIdentifier }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar si está activo
        if (!user.activo) {
            return res.status(401).json({
                success: false,
                message: 'Su cuenta ha sido desactivada'
            });
        }

        // Verificar contraseña
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Actualizar último acceso
        user.ultimoAcceso = new Date();
        await user.save({ validateBeforeSave: false });

        // Generar token
        const token = user.generateToken();

        const userData = {
            id: user._id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            role: user.role,
            rol: user.role,
            nombreCompleto: user.nombreCompleto,
            avatar: user.avatar,
            sucursal: user.sucursal ? user.sucursal.toString() : null
        };

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            access_token: token,
            user: userData,
            usuario: userData
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Registro
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { nombre, apellido, email, username, password, role, telefono, especialidad, licenciaMedica } = req.body;

        if (!email && !username) {
            return res.status(400).json({
                success: false,
                message: 'Debe proporcionar un email o un nombre de usuario'
            });
        }

        // Verificar si ya existe
        if (email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un usuario con ese email'
                });
            }
        }

        if (username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de usuario ya está en uso'
                });
            }
        }

        // Crear usuario
        const user = await User.create({
            nombre,
            apellido,
            email: email || undefined,
            username: username || undefined,
            password,
            role: role || 'recepcion',
            telefono,
            especialidad,
            licenciaMedica
        });

        // Generar token
        const token = user.generateToken();

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: user._id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.role,
                nombreCompleto: user.nombreCompleto
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            user: {
                id: user._id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.role,
                telefono: user.telefono,
                especialidad: user.especialidad,
                nombreCompleto: user.nombreCompleto,
                avatar: user.avatar,
                ultimoAcceso: user.ultimoAcceso,
                createdAt: user.createdAt,
                sucursal: user.sucursal ? user.sucursal.toString() : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cambiar contraseña
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        // Verificar contraseña actual
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        user.password = newPassword;
        await user.save();

        // Generar nuevo token
        const token = user.generateToken();

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente',
            token
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar perfil
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const allowedFields = ['nombre', 'apellido', 'telefono'];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            message: 'Perfil actualizado',
            user: {
                id: user._id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.role,
                telefono: user.telefono,
                nombreCompleto: user.nombreCompleto
            }
        });
    } catch (error) {
        next(error);
    }
};
