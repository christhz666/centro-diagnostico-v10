const Cita = require('../models/Cita');
const Paciente = require('../models/Paciente');
const Estudio = require('../models/Estudio');
const { AppError } = require('../middleware/errorHandler');
const dicomService = require('../services/dicomIntegrationService');

// @desc    Obtener todas las citas
// @route   GET /api/citas
exports.getCitas = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};

        // Filtrar por fecha
        if (req.query.fecha) {
            const fecha = new Date(req.query.fecha);
            const inicio = new Date(fecha.setHours(0, 0, 0, 0));
            const fin = new Date(fecha.setHours(23, 59, 59, 999));
            filter.fecha = { $gte: inicio, $lte: fin };
        }

        // Filtrar por rango de fechas
        if (req.query.fechaInicio && req.query.fechaFin) {
            filter.fecha = {
                $gte: new Date(req.query.fechaInicio),
                $lte: new Date(req.query.fechaFin)
            };
        }

        // Filtrar por estado
        if (req.query.estado) {
            filter.estado = req.query.estado;
        }

        // Filtrar por paciente
        if (req.query.paciente) {
            filter.paciente = req.query.paciente;
        }

        if (req.query.registroId) {
            filter.registroId = req.query.registroId;
        }

        // Filtrar por médico
        if (req.query.medico) {
            filter.medico = req.query.medico;
        }

        // Solo citas del día (shortcut)
        if (req.query.hoy === 'true') {
            const hoy = new Date();
            filter.fecha = {
                $gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
                $lte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
            };
        }

        const [citas, total] = await Promise.all([
            Cita.find(filter)
                .populate('paciente', 'nombre apellido cedula telefono email')
                .populate('medico', 'nombre apellido especialidad')
                .populate('estudios.estudio', 'nombre codigo categoria precio')
                .populate('creadoPor', 'nombre apellido')
                .sort(req.query.sort || 'fecha horaInicio')
                .skip(skip)
                .limit(limit),
            Cita.countDocuments(filter)
        ]);

        res.json({
            success: true,
            count: citas.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: citas
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener una cita
// @route   GET /api/citas/:id
exports.getCita = async (req, res, next) => {
    try {
        const cita = await Cita.findById(req.params.id)
            .populate('paciente')
            .populate('medico', 'nombre apellido especialidad')
            .populate('estudios.estudio')
            .populate('creadoPor', 'nombre apellido');

        if (!cita) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.json({
            success: true,
            data: cita
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear cita
// @route   POST /api/citas
exports.createCita = async (req, res, next) => {
    try {
        // Verificar que el paciente existe
        const paciente = await Paciente.findById(req.body.paciente);
        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // Si vienen IDs de estudios, obtener precios
        if (req.body.estudios && req.body.estudios.length > 0) {
            const estudiosCompletos = [];
            for (const item of req.body.estudios) {
                const estudioId = item.estudio || item;
                const estudio = await Estudio.findById(estudioId);
                if (estudio) {
                    estudiosCompletos.push({
                        estudio: estudio._id,
                        precio: item.precio || estudio.precio,
                        descuento: item.descuento || 0
                    });
                }
            }
            req.body.estudios = estudiosCompletos;
        }

        req.body.creadoPor = req.user._id;

        const cita = await Cita.create(req.body);

        // Populate para la respuesta
        await cita.populate('paciente', 'nombre apellido cedula');
        await cita.populate('estudios.estudio', 'nombre codigo precio categoria');

        // ── Integración automática con equipo de rayos X ──────────────────
        // Si hay estudios de imágenes, enviar datos al equipo automáticamente
        let dicomResult = null;
        try {
            const estudiosImg = (cita.estudios || []).filter(item => {
                const e = item.estudio;
                if (!e) return false;
                const txt = `${e.nombre || ''} ${e.categoria || ''} ${e.codigo || ''}`.toLowerCase();
                return txt.includes('rayo') || txt.includes('radiograf') ||
                       txt.includes('rx') || txt.includes('imagen') ||
                       txt.includes('tomog') || txt.includes('mamog') ||
                       txt.includes('ultrason');
            });

            if (estudiosImg.length > 0) {
                const estudiosData = estudiosImg.map(i => i.estudio);
                dicomResult = await dicomService.registrarEnEquipo(paciente, cita, estudiosData);
                if (dicomResult.success) {
                    console.log(`✅ DICOM: Paciente ${paciente.nombre} registrado en equipo de rayos X`);
                }
            }
        } catch (dicomErr) {
            console.error('⚠️ Error DICOM (no crítico):', dicomErr.message);
            dicomResult = { error: dicomErr.message };
        }

        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            data: cita,
            integraciones: {
                dicom: dicomResult,
                worklistUrl: `/api/imagenologia/worklist/${cita._id}`
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar cita
// @route   PUT /api/citas/:id
exports.updateCita = async (req, res, next) => {
    try {
        req.body.modificadoPor = req.user._id;

        const cita = await Cita.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('paciente', 'nombre apellido cedula')
        .populate('estudios.estudio', 'nombre codigo precio');

        if (!cita) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Cita actualizada exitosamente',
            data: cita
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cambiar estado de cita
// @route   PATCH /api/citas/:id/estado
exports.cambiarEstado = async (req, res, next) => {
    try {
        const { estado, motivo } = req.body;

        const updateData = {
            estado,
            modificadoPor: req.user._id
        };

        if (estado === 'cancelada') {
            updateData.canceladoPor = req.user._id;
            updateData.motivoCancelacion = motivo || 'Sin motivo especificado';
        }

        if (estado === 'completada') {
            updateData.horaFin = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
        }

        const cita = await Cita.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        )
        .populate('paciente', 'nombre apellido cedula')
        .populate('estudios.estudio', 'nombre');

        if (!cita) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.json({
            success: true,
            message: `Cita ${estado} exitosamente`,
            data: cita
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Citas del día
// @route   GET /api/citas/hoy
exports.citasHoy = async (req, res, next) => {
    try {
        const hoy = new Date();
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

        const citas = await Cita.find({
            fecha: { $gte: inicio, $lte: fin }
        })
        .populate('paciente', 'nombre apellido cedula telefono')
        .populate('medico', 'nombre apellido')
        .populate('estudios.estudio', 'nombre codigo')
        .sort('horaInicio');

        res.json({
            success: true,
            count: citas.length,
            data: citas
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Buscar orden por ID de registro o código de barras
// @route   GET /api/citas/registro/:registroId
exports.getCitaByRegistro = async (req, res, next) => {
    try {
        const registroId = String(req.params.registroId || '').trim().toUpperCase();
        const query = {
            $or: [
                { registroId },
                { codigoBarras: registroId },
                { codigoBarras: `ORD${registroId.replace(/^ORD/, '')}` }
            ]
        };

        const cita = await Cita.findOne(query)
            .populate('paciente', 'nombre apellido cedula telefono nacionalidad')
            .populate('estudios.estudio', 'nombre codigo categoria precio')
            .sort('-createdAt');

        if (!cita) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }

        const resultados = await require('../models/Resultado').find({ cita: cita._id })
            .populate('estudio', 'nombre codigo categoria')
            .sort('-createdAt');

        res.json({ success: true, data: { cita, resultados } });
    } catch (error) {
        next(error);
    }
};

// @desc Buscar historial global del paciente por nombre/teléfono/cédula
// @route GET /api/citas/busqueda/paciente?query=
exports.buscarPacienteHistorial = async (req, res, next) => {
    try {
        const query = String(req.query.query || '').trim();
        if (!query || query.length < 2) {
            return res.status(400).json({ success: false, message: 'query requerido (mínimo 2 caracteres)' });
        }

        const rx = new RegExp(query, 'i');
        const pacientes = await Paciente.find({
            $or: [{ nombre: rx }, { apellido: rx }, { telefono: rx }, { cedula: rx }]
        }).limit(20);

        const ids = pacientes.map(p => p._id);
        const citas = await Cita.find({ paciente: { $in: ids } })
            .populate('paciente', 'nombre apellido cedula telefono')
            .populate('estudios.estudio', 'nombre codigo categoria')
            .sort('-createdAt');

        res.json({ success: true, count: citas.length, data: citas });
    } catch (error) {
        next(error);
    }
};
