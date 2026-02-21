const Paciente = require('../models/Paciente');
const { AppError } = require('../middleware/errorHandler');

// @desc    Obtener todos los pacientes
// @route   GET /api/pacientes
exports.getPacientes = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Filtros
        let filter = { activo: true };
        
        // Búsqueda por texto
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { nombre: searchRegex },
                { apellido: searchRegex },
                { cedula: searchRegex },
                { email: searchRegex },
                { telefono: searchRegex }
            ];
        }

        // Filtro por sexo
        if (req.query.sexo) {
            filter.sexo = req.query.sexo;
        }

        // Filtro por seguro
        if (req.query.seguro) {
            filter['seguro.nombre'] = new RegExp(req.query.seguro, 'i');
        }

        const [pacientes, total] = await Promise.all([
            Paciente.find(filter)
                .sort(req.query.sort || '-createdAt')
                .skip(skip)
                .limit(limit)
                .populate('registradoPor', 'nombre apellido'),
            Paciente.countDocuments(filter)
        ]);

        res.json({
            success: true,
            count: pacientes.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: pacientes
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un paciente por ID
// @route   GET /api/pacientes/:id
exports.getPaciente = async (req, res, next) => {
    try {
        const paciente = await Paciente.findById(req.params.id)
            .populate('registradoPor', 'nombre apellido');

        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({
            success: true,
            data: paciente
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Buscar paciente por cédula
// @route   GET /api/pacientes/cedula/:cedula
exports.getPacienteByCedula = async (req, res, next) => {
    try {
        const paciente = await Paciente.findOne({ cedula: req.params.cedula });

        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado con esa cédula'
            });
        }

        res.json({
            success: true,
            data: paciente
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear paciente
// @route   POST /api/pacientes
exports.createPaciente = async (req, res, next) => {
    try {
        // Agregar quien lo registró
        req.body.registradoPor = req.user._id;

        const paciente = await Paciente.create(req.body);

        // ── Generar payload para equipo de rayos X ──
        // Si el centro tiene configurado un equipo DICOM/HL7, 
        // el paciente se registra automáticamente en el worklist
        const rayosXPayload = {
            patientId: paciente.cedula || paciente._id.toString(),
            patientName: `${paciente.apellido}^${paciente.nombre}`,
            patientSex: paciente.sexo === 'M' ? 'M' : 'F',
            patientBirthDate: paciente.fechaNacimiento
                ? new Date(paciente.fechaNacimiento).toISOString().slice(0, 10).replace(/-/g, '')
                : '',
            patientPhone: paciente.telefono || ''
        };

        res.status(201).json({
            success: true,
            message: 'Paciente registrado exitosamente',
            data: paciente,
            integraciones: {
                rayosX: rayosXPayload,
                nota: 'Al crear una cita con estudios de imágenes, use GET /api/imagenologia/worklist/:citaId para el payload completo del equipo'
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar paciente
// @route   PUT /api/pacientes/:id
exports.updatePaciente = async (req, res, next) => {
    try {
        const paciente = await Paciente.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Paciente actualizado exitosamente',
            data: paciente
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Desactivar paciente (soft delete)
// @route   DELETE /api/pacientes/:id
exports.deletePaciente = async (req, res, next) => {
    try {
        const paciente = await Paciente.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Paciente desactivado exitosamente'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Historial médico del paciente
// @route   GET /api/pacientes/:id/historial
exports.getHistorial = async (req, res, next) => {
    try {
        const Cita = require('../models/Cita');
        const Resultado = require('../models/Resultado');

        const [paciente, citas, resultados] = await Promise.all([
            Paciente.findById(req.params.id),
            Cita.find({ paciente: req.params.id })
                .populate('estudios.estudio', 'nombre codigo categoria')
                .populate('medico', 'nombre apellido especialidad')
                .sort('-fecha'),
            Resultado.find({ paciente: req.params.id })
                .populate('estudio', 'nombre codigo')
                .populate('medico', 'nombre apellido')
                .sort('-createdAt')
        ]);

        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({
            success: true,
            data: {
                paciente,
                citas,
                resultados,
                totalCitas: citas.length,
                totalResultados: resultados.length
            }
        });
    } catch (error) {
        next(error);
    }
};
