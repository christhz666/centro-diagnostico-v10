const Resultado = require('../models/Resultado');
const Cita = require('../models/Cita');
const Paciente = require('../models/Paciente');
const Factura = require('../models/Factura');
const bcrypt = require('bcryptjs');

// Estados de pago constantes
const ESTADOS_PAGO_PENDIENTE = ['borrador', 'emitida'];


const PLANTILLAS_REPORTE_IMAGEN = {
    radiografia_general: {
        id: 'radiografia_general',
        nombre: 'Radiografía General',
        secciones: ['Tecnica', 'Hallazgos', 'Impresion diagnostica', 'Recomendaciones']
    },
    torax: {
        id: 'torax',
        nombre: 'Radiografía de Tórax',
        secciones: ['Tecnica', 'Hallazgos pulmonares', 'Cardiomediastino', 'Impresion diagnostica']
    },
    extremidades: {
        id: 'extremidades',
        nombre: 'Radiografía de Extremidades',
        secciones: ['Proyecciones', 'Hallazgos oseos', 'Partes blandas', 'Impresion diagnostica']
    },
    mamografia: {
        id: 'mamografia',
        nombre: 'Mamografía',
        secciones: ['Composicion mamaria', 'Hallazgos', 'Clasificacion BI-RADS', 'Recomendaciones']
    }
};

// @desc    Obtener resultados (con filtros)
// @route   GET /api/resultados
exports.getResultados = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        let filter = {};

        if (req.query.paciente || req.query.pacienteId) filter.paciente = req.query.paciente || req.query.pacienteId;
        if (req.query.cita) filter.cita = req.query.cita;
        if (req.query.estado) filter.estado = req.query.estado;
        if (req.query.estudio) filter.estudio = req.query.estudio;
        if (req.query.codigoMuestra) filter.codigoMuestra = req.query.codigoMuestra;

        const [resultados, total] = await Promise.all([
            Resultado.find(filter)
                .populate('paciente', 'nombre apellido cedula')
                .populate('estudio', 'nombre codigo categoria')
                .populate('medico', 'nombre apellido especialidad')
                .populate('realizadoPor', 'nombre apellido')
                .populate('validadoPor', 'nombre apellido')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit),
            Resultado.countDocuments(filter)
        ]);

        res.json({
            success: true,
            count: resultados.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener resultados por paciente
// @route   GET /api/resultados/paciente/:pacienteId
exports.getResultadosPorPaciente = async (req, res, next) => {
    try {
        const resultados = await Resultado.find({
            paciente: req.params.pacienteId,
            estado: { $ne: 'anulado' }
        })
            .populate('estudio', 'nombre codigo categoria')
            .populate('medico', 'nombre apellido especialidad')
            .populate('validadoPor', 'nombre apellido')
            .sort('-createdAt');

        res.json({
            success: true,
            count: resultados.length,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener resultados por cédula (para QR)
// @route   GET /api/resultados/cedula/:cedula
exports.getResultadosPorCedula = async (req, res, next) => {
    try {
        const paciente = await Paciente.findOne({ cedula: req.params.cedula });

        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        const resultados = await Resultado.find({
            paciente: paciente._id,
            estado: { $in: ['completado', 'entregado'] }
        })
            .populate('estudio', 'nombre codigo categoria')
            .populate('medico', 'nombre apellido especialidad')
            .populate('validadoPor', 'nombre apellido')
            .sort('-createdAt');

        res.json({
            success: true,
            paciente: {
                _id: paciente._id,
                nombre: paciente.nombre,
                apellido: paciente.apellido,
                cedula: paciente.cedula,
                fechaNacimiento: paciente.fechaNacimiento,
                sexo: paciente.sexo,
                nacionalidad: paciente.nacionalidad
            },
            count: resultados.length,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un resultado por código de muestra
// @route   GET /api/resultados/muestra/:codigoMuestra
exports.getResultadoPorCodigo = async (req, res, next) => {
    try {
        let codigoMuestra = req.params.codigoMuestra;

        // Si el código es solo números, intentar buscar con L primero (para laboratorio)
        if (/^\d+$/.test(codigoMuestra)) {
            const codigoConL = `L${codigoMuestra}`;
            const resultadoLab = await Resultado.findOne({ codigoMuestra: codigoConL })
                .populate('paciente')
                .populate('estudio')
                .populate('medico', 'nombre apellido especialidad licenciaMedica')
                .populate('realizadoPor', 'nombre apellido')
                .populate('validadoPor', 'nombre apellido');

            if (resultadoLab) {
                return res.json({ success: true, data: resultadoLab });
            }
        }

        // Buscar con el código tal cual
        const resultado = await Resultado.findOne({ codigoMuestra: codigoMuestra })
            .populate('paciente')
            .populate('estudio')
            .populate('medico', 'nombre apellido especialidad licenciaMedica')
            .populate('realizadoPor', 'nombre apellido')
            .populate('validadoPor', 'nombre apellido');

        if (!resultado) {
            return res.status(404).json({
                success: false,
                message: 'Resultado no encontrado con código: ' + req.params.codigoMuestra
            });
        }

        res.json({ success: true, data: resultado });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un resultado
// @route   GET /api/resultados/:id
exports.getResultado = async (req, res, next) => {
    try {
        const resultado = await Resultado.findById(req.params.id)
            .populate('paciente')
            .populate('estudio')
            .populate('medico', 'nombre apellido especialidad licenciaMedica')
            .populate('realizadoPor', 'nombre apellido')
            .populate('validadoPor', 'nombre apellido');

        if (!resultado) {
            return res.status(404).json({
                success: false,
                message: 'Resultado no encontrado'
            });
        }

        res.json({ success: true, data: resultado });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear resultado
// @route   POST /api/resultados
exports.createResultado = async (req, res, next) => {
    try {
        req.body.realizadoPor = req.user?._id;

        const resultado = await Resultado.create(req.body);

        await resultado.populate('paciente', 'nombre apellido');
        await resultado.populate('estudio', 'nombre codigo');

        res.status(201).json({
            success: true,
            message: 'Resultado creado exitosamente',
            data: resultado
        });
    } catch (error) {
        next(error);
    }
};

// ─── Helper: verificar deuda pendiente de una factura ────────────────────────
const _getMontoPendiente = async (facturaId) => {
    if (!facturaId) return 0;
    const factura = await Factura.findById(facturaId).select('total montoPagado pagado estado');
    if (!factura || factura.estado === 'anulada') return 0;
    if (factura.pagado || factura.estado === 'pagada') return 0;
    return Math.max(0, (factura.total || 0) - (factura.montoPagado || 0));
};

// @desc    Actualizar resultado
// @route   PUT /api/resultados/:id
exports.updateResultado = async (req, res, next) => {
    try {
        // Whitelist de campos permitidos — médicos/lab pueden editar, pero no campos de auditoría
        const allowedFields = [
            'valores', 'interpretacion', 'conclusion', 'estado',
            'codigoMuestra', 'notas', 'medico', 'imagenologia'
        ];
        const update = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) update[field] = req.body[field];
        });

        const resultado = await Resultado.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        )
            .populate('paciente', 'nombre apellido')
            .populate('estudio', 'nombre codigo');

        if (!resultado) {
            return res.status(404).json({
                success: false,
                message: 'Resultado no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Resultado actualizado',
            data: resultado
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Validar resultado
// @route   PUT /api/resultados/:id/validar
exports.validarResultado = async (req, res, next) => {
    try {
        const resultado = await Resultado.findByIdAndUpdate(
            req.params.id,
            {
                estado: 'completado',
                validadoPor: req.user?._id,
                fechaValidacion: new Date(),
                interpretacion: req.body.interpretacion,
                conclusion: req.body.conclusion
            },
            { new: true }
        )
            .populate('paciente')
            .populate('estudio')
            .populate('validadoPor', 'nombre apellido');

        if (!resultado) {
            return res.status(404).json({
                success: false,
                message: 'Resultado no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Resultado validado exitosamente',
            data: resultado
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar resultado
// @route   DELETE /api/resultados/:id
exports.deleteResultado = async (req, res, next) => {
    try {
        const resultado = await Resultado.findByIdAndDelete(req.params.id);

        if (!resultado) {
            return res.status(404).json({
                success: false,
                message: 'Resultado no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Resultado eliminado'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Marcar como impreso
// @route   PUT /api/resultados/:id/imprimir
exports.marcarImpreso = async (req, res, next) => {
    try {
        const resultado = await Resultado.findByIdAndUpdate(
            req.params.id,
            {
                impreso: true,
                $inc: { vecesImpreso: 1 }
            },
            { new: true }
        );

        res.json({ success: true, data: resultado });
    } catch (error) {
        next(error);
    }
};

// @desc    Verificar estado de pago antes de imprimir
// @route   GET /api/resultados/:id/verificar-pago
exports.verificarPago = async (req, res, next) => {
    try {
        // Obtener el resultado con la cita y paciente poblados
        const resultado = await Resultado.findById(req.params.id)
            .populate('cita')
            .populate('paciente', 'nombre apellido');

        if (!resultado) {
            return res.status(404).json({
                success: false,
                message: 'Resultado no encontrado'
            });
        }

        // Buscar facturas asociadas al paciente que estén pendientes de pago
        const facturasPendientes = await Factura.find({
            paciente: resultado.paciente._id,
            $or: [
                { pagado: false },
                { estado: { $in: ESTADOS_PAGO_PENDIENTE } }
            ]
        }).select('numero total montoPagado estado');

        // Calcular el total pendiente
        let montoPendiente = 0;
        facturasPendientes.forEach(factura => {
            const pendiente = factura.total - (factura.montoPagado || 0);
            if (pendiente > 0) {
                montoPendiente += pendiente;
            }
        });

        const puedeImprimir = montoPendiente === 0;

        res.json({
            success: true,
            puede_imprimir: puedeImprimir,
            monto_pendiente: montoPendiente,
            facturas_pendientes: facturasPendientes.map(f => ({
                id: f._id,
                numero: f.numero,
                total: f.total,
                pagado: f.montoPagado || 0,
                pendiente: f.total - (f.montoPagado || 0),
                estado: f.estado
            })),
            paciente: {
                nombre: resultado.paciente.nombre,
                apellido: resultado.paciente.apellido
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener resultados por código QR de factura (SOLO los de esa factura)
// @route   GET /api/resultados/qr/:codigoQR
exports.getResultadosPorQR = async (req, res, next) => {
    try {
        const factura = await Factura.findOne({ codigoQR: req.params.codigoQR })
            .populate('paciente', 'nombre apellido cedula fechaNacimiento sexo');

        if (!factura) {
            return res.status(404).json({
                success: false,
                message: 'Código QR inválido o factura no encontrada'
            });
        }

        // Obtener SOLO los resultados de la cita asociada a esta factura
        let filter = { paciente: factura.paciente._id };
        // Buscar por factura directa, o por cita si existe
        if (factura.cita) {
            filter = {
                $or: [
                    { factura: factura._id },
                    { cita: factura.cita, paciente: factura.paciente._id }
                ]
            };
        } else {
            filter.factura = factura._id;
        }

        const resultados = await Resultado.find(filter)
            .populate('estudio', 'nombre codigo categoria')
            .populate('medico', 'nombre apellido especialidad')
            .populate('validadoPor', 'nombre apellido')
            .sort('-createdAt');

        res.json({
            success: true,
            factura: {
                numero: factura.numero,
                fecha: factura.createdAt,
                total: factura.total,
                estado: factura.estado
            },
            paciente: factura.paciente,
            count: resultados.length,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Acceso del paciente con usuario y contraseña (desde factura)
// @route   POST /api/resultados/acceso-paciente
exports.accesoPaciente = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // Buscar factura por username
        const factura = await Factura.findOne({
            pacienteUsername: username
        }).populate('paciente', 'nombre apellido cedula fechaNacimiento sexo').sort('-createdAt');

        if (!factura) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Comparar contraseña con bcrypt
        const isMatch = await factura.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Verificar si hay monto pendiente
        const montoPendiente = Math.max(0, (factura.total || 0) - (factura.montoPagado || 0));
        const facturaPagada = factura.pagado || factura.estado === 'pagada' || montoPendiente === 0;

        if (!facturaPagada) {
            return res.status(402).json({
                success: false,
                blocked: true,
                montoPendiente,
                totalFactura: factura.total || 0,
                montoPagado: factura.montoPagado || 0,
                mensaje: `Tiene un saldo pendiente de RD$ ${montoPendiente.toFixed(2)}. Por favor, liquide su factura para acceder a sus resultados.`,
                factura: { numero: factura.numero, total: factura.total, estado: factura.estado }
            });
        }

        // Obtener resultados de esa factura específica (filtro por factura._id + cita)
        let filter;
        if (factura.cita) {
            filter = {
                $or: [
                    { factura: factura._id },
                    { cita: factura.cita }
                ]
            };
        } else {
            const fechaInicio = new Date(factura.createdAt);
            fechaInicio.setHours(0, 0, 0, 0);
            const fechaFin = new Date(factura.createdAt);
            fechaFin.setDate(fechaFin.getDate() + 2);
            filter = {
                $or: [
                    { factura: factura._id },
                    { paciente: factura.paciente._id, createdAt: { $gte: fechaInicio, $lte: fechaFin } }
                ]
            };
        }

        const resultados = await Resultado.find(filter)
            .populate('estudio', 'nombre codigo categoria')
            .populate('medico', 'nombre apellido especialidad')
            .populate('validadoPor', 'nombre apellido')
            .sort('-createdAt');

        res.json({
            success: true,
            blocked: false,
            factura: {
                numero: factura.numero,
                fecha: factura.createdAt,
                total: factura.total,
                estado: factura.estado
            },
            paciente: factura.paciente,
            count: resultados.length,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener resultados por número de factura (para búsqueda interna)
// @route   GET /api/resultados/factura/:facturaNumero
exports.getResultadosPorFactura = async (req, res, next) => {
    try {
        const param = req.params.facturaNumero;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
        const factura = await Factura.findOne({
            $or: [
                { numero: param },
                { codigoLIS: parseInt(param, 10) || -1 },
                { codigoBarras: param },
                { codigoBarras: String(parseInt(param, 10) || param).padStart(5, '0') },
                { registroIdNumerico: param },
                ...(isObjectId ? [{ _id: param }] : [])
            ]
        }).populate('paciente', 'nombre apellido cedula');

        if (!factura) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        // ESTRATEGIA DE FILTRO ESTRICTO:
        // 1. Primero buscar resultados que tengan factura._id directamente (más preciso)
        // 2. Si no hay ninguno, buscar por cita de esa factura (para resultados
        //    creados antes de que se implementara el campo factura)
        // NUNCA mezclar resultados de otras facturas del mismo paciente.

        // Intento 1: por factura._id
        let resultados = await Resultado.find({ factura: factura._id })
            .populate('estudio', 'nombre codigo categoria')
            .populate('medico', 'nombre apellido especialidad')
            .populate('validadoPor', 'nombre apellido')
            .sort('-createdAt');

        // Intento 2: por cita (si tiene cita y no encontró resultados por factura._id)
        if (resultados.length === 0 && factura.cita) {
            resultados = await Resultado.find({
                cita: factura.cita,
                paciente: factura.paciente._id
            })
                .populate('estudio', 'nombre codigo categoria')
                .populate('medico', 'nombre apellido especialidad')
                .populate('validadoPor', 'nombre apellido')
                .sort('-createdAt');
        }

        // Intento 3 (fallback final): por paciente + misma fecha de la factura
        // Solo si realmente no hay resultados de los intentos anteriores
        if (resultados.length === 0) {
            const fechaInicio = new Date(factura.createdAt);
            fechaInicio.setHours(0, 0, 0, 0);
            const fechaFin = new Date(factura.createdAt);
            fechaFin.setDate(fechaFin.getDate() + 1);
            fechaFin.setHours(23, 59, 59, 999);

            resultados = await Resultado.find({
                paciente: factura.paciente._id,
                createdAt: { $gte: fechaInicio, $lte: fechaFin }
            })
                .populate('estudio', 'nombre codigo categoria')
                .populate('medico', 'nombre apellido especialidad')
                .populate('validadoPor', 'nombre apellido')
                .sort('-createdAt');
        }


        // NO exponer credenciales del paciente en esta respuesta
        res.json({
            success: true,
            factura: {
                _id: factura._id,
                numero: factura.numero,
                codigoLIS: factura.codigoLIS || null,
                fecha: factura.createdAt,
                total: factura.total,
                montoPagado: factura.montoPagado || 0,
                pagado: factura.pagado,
                estado: factura.estado,
                codigoQR: factura.codigoQR
            },
            paciente: factura.paciente,
            count: resultados.length,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Acceso público por código QR (sin contraseña) — sólo si factura pagada
// @route   GET /api/resultados/acceso-qr/:codigoQR
exports.accesoQR = async (req, res, next) => {
    try {
        const factura = await Factura.findOne({ codigoQR: req.params.codigoQR })
            .populate('paciente', 'nombre apellido cedula fechaNacimiento sexo');

        if (!factura) {
            return res.status(404).json({
                success: false,
                message: 'Código QR inválido o factura no encontrada'
            });
        }

        // Calcular monto pendiente
        const montoPendiente = Math.max(0, (factura.total || 0) - (factura.montoPagado || 0));
        const facturaPagada = factura.pagado || factura.estado === 'pagada' || montoPendiente === 0;

        // Si hay deuda, bloquear acceso a resultados
        if (!facturaPagada) {
            return res.status(402).json({
                success: false,
                blocked: true,
                montoPendiente,
                totalFactura: factura.total || 0,
                montoPagado: factura.montoPagado || 0,
                mensaje: `Tiene un saldo pendiente de RD$ ${montoPendiente.toFixed(2)}. Por favor, liquide su factura para acceder a sus resultados.`,
                factura: {
                    numero: factura.numero,
                    total: factura.total,
                    estado: factura.estado
                }
            });
        }

        // Factura pagada — retornar resultados
        let filter = { paciente: factura.paciente._id };
        if (factura.cita) {
            filter = {
                $or: [
                    { factura: factura._id },
                    { cita: factura.cita, paciente: factura.paciente._id }
                ]
            };
        } else {
            filter.factura = factura._id;
        }

        const resultados = await Resultado.find(filter)
            .populate('estudio', 'nombre codigo categoria')
            .populate('medico', 'nombre apellido especialidad')
            .populate('validadoPor', 'nombre apellido')
            .sort('-createdAt');

        res.json({
            success: true,
            blocked: false,
            factura: {
                numero: factura.numero,
                fecha: factura.createdAt,
                total: factura.total,
                estado: factura.estado
            },
            paciente: factura.paciente,
            count: resultados.length,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};


// @desc    Obtener plantillas de reportes para imagenología
// @route   GET /api/resultados/imagenologia/plantillas
exports.getPlantillasImagenologia = async (req, res, next) => {
    try {
        res.json({ success: true, data: Object.values(PLANTILLAS_REPORTE_IMAGEN) });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener área de trabajo de imagenología (visor + reporte)
// @route   GET /api/resultados/:id/imagenologia
exports.getWorkspaceImagenologia = async (req, res, next) => {
    try {
        const resultado = await Resultado.findById(req.params.id)
            .populate('paciente', 'nombre apellido cedula fechaNacimiento sexo')
            .populate('estudio', 'nombre codigo categoria');

        if (!resultado) {
            return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
        }

        const imagenologia = resultado.imagenologia || {};
        const reporte = imagenologia.reporte || {};

        res.json({
            success: true,
            data: {
                resultadoId: resultado._id,
                paciente: resultado.paciente,
                estudio: resultado.estudio,
                visor: {
                    archivos: resultado.archivos || [],
                    dicom: imagenologia.dicom || {},
                    ajustes: imagenologia.ajustesVisor || { brillo: 1, contraste: 1, zoom: 1, invertido: false }
                },
                reporte: {
                    ...reporte,
                    plantillaDisponible: PLANTILLAS_REPORTE_IMAGEN[reporte.plantilla || 'radiografia_general']
                },
                impresion: {
                    permitido: resultado.estado !== 'anulado',
                    vecesImpreso: resultado.vecesImpreso || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Guardar ajustes del visor y reporte de imagenología
// @route   PUT /api/resultados/:id/imagenologia
exports.updateWorkspaceImagenologia = async (req, res, next) => {
    try {
        const payload = req.body || {};
        const imagenologia = payload.imagenologia || {};

        const update = {};
        if (imagenologia.ajustesVisor) update['imagenologia.ajustesVisor'] = imagenologia.ajustesVisor;
        if (imagenologia.reporte) {
            if (!imagenologia.reporte.fecha_reporte) {
                imagenologia.reporte.fecha_reporte = new Date();
            }
            update['imagenologia.reporte'] = imagenologia.reporte;
        }
        if (imagenologia.dicom) update['imagenologia.dicom'] = imagenologia.dicom;

        const resultado = await Resultado.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
            .populate('paciente', 'nombre apellido cedula')
            .populate('estudio', 'nombre codigo');

        if (!resultado) {
            return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
        }

        res.json({ success: true, message: 'Workspace de imagenología actualizado', data: resultado.imagenologia || {} });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener payload para integración de registro en equipos (Konica Minolta)
// @route   GET /api/resultados/integraciones/konica/:citaId
exports.getPayloadKonica = async (req, res, next) => {
    try {
        const cita = await Cita.findById(req.params.citaId)
            .populate('paciente', 'nombre apellido cedula sexo fechaNacimiento telefono')
            .populate('estudios.estudio', 'nombre codigo categoria');

        if (!cita) {
            return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        }

        const estudiosRx = (cita.estudios || []).filter(item => {
            const e = item.estudio;
            if (!e) return false;
            const texto = `${e.nombre || ''} ${e.categoria || ''} ${e.codigo || ''}`.toLowerCase();
            return texto.includes('rayo') || texto.includes('radiograf') || texto.includes('rx');
        });

        if (!estudiosRx.length) {
            return res.status(400).json({ success: false, message: 'La cita no contiene estudios de rayos X/radiografía' });
        }

        const pac = cita.paciente;
        const fechaNacimiento = pac?.fechaNacimiento ? new Date(pac.fechaNacimiento).toISOString().slice(0, 10) : null;

        res.json({
            success: true,
            data: {
                tipoIntegracion: 'konica_minolta_autofill',
                registro: {
                    accessionNumber: cita.registroId,
                    patientId: pac?._id,
                    patientName: `${pac?.apellido || ''}, ${pac?.nombre || ''}`.trim(),
                    patientSex: pac?.sexo || '',
                    patientBirthDate: fechaNacimiento,
                    patientCedula: pac?.cedula || '',
                    patientPhone: pac?.telefono || '',
                    scheduledProcedureStepDescription: estudiosRx.map(e => e.estudio?.nombre).join(' | '),
                    referringPhysicianName: '',
                    modality: 'CR',
                    stationName: 'KONICA_MINOLTA'
                },
                instrucciones: 'Enviar este payload al conector local de la PC de radiografía para autocompletar el formulario del equipo.'
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Diagnóstico rápido de carpeta DICOM y Orthanc
// @route   GET /api/resultados/integraciones/dicom-diagnostico
exports.diagnosticoDicom = async (req, res, next) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const candidatos = [
            process.env.DICOM_FOLDER,
            path.join(process.cwd(), 'uploads', 'dicom'),
            '/home/opc/centro-diagnostico/uploads/dicom',
            '/var/lib/orthanc/db'
        ].filter(Boolean);

        const carpetas = candidatos.map((dir) => {
            let existe = false;
            let archivosDicom = 0;
            try {
                existe = fs.existsSync(dir);
                if (existe) {
                    const entries = fs.readdirSync(dir);
                    archivosDicom = entries.filter((n) => n.toLowerCase().endsWith('.dcm')).length;
                }
            } catch (e) {
                return { ruta: dir, existe: false, error: e.message };
            }
            return { ruta: dir, existe, archivosDicom };
        });

        res.json({
            success: true,
            orthanc: {
                url: process.env.ORTHANC_URL || 'http://localhost:8042',
                aet: process.env.ORTHANC_AET || 'ORTHANC'
            },
            carpetas
        });
    } catch (error) {
        next(error);
    }
};
