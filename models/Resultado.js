const mongoose = require('mongoose');

// Schema para contador global de IDs
const contadorSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Contador = mongoose.model('Contador', contadorSchema);

const resultadoSchema = new mongoose.Schema({
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: false
    },
    // Código único para identificación de muestra
    codigoMuestra: {
        type: String,
        unique: true,
        sparse: true
    },

    // Relaciones
    cita: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cita',
        required: true
    },
    factura: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Factura'
    },
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: true
    },
    estudio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Estudio',
        required: true
    },
    medico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Resultado
    estado: {
        type: String,
        enum: ['pendiente', 'en_proceso', 'completado', 'entregado', 'anulado'],
        default: 'pendiente'
    },

    // Valores del resultado
    valores: [{
        parametro: String,
        valor: String,
        unidad: String,
        valorReferencia: String,
        estado: {
            type: String,
            enum: ['normal', 'alto', 'bajo', 'critico', ''],
            default: ''
        }
    }],

    // Interpretación
    interpretacion: {
        type: String,
        trim: true
    },
    observaciones: {
        type: String,
        trim: true
    },
    conclusion: {
        type: String,
        trim: true
    },

    // Archivos adjuntos (imágenes, PDFs)
    archivos: [{
        nombre: String,
        url: String,
        tipo: String,
        tamaño: Number
    }],

    // Datos de imagenología (visor DICOM + reporte médico)
    imagenologia: {
        ajustesVisor: {
            brillo: { type: Number, default: 1 },
            contraste: { type: Number, default: 1 },
            zoom: { type: Number, default: 1 },
            ventanaCentro: Number,
            ventanaAncho: Number,
            invertido: { type: Boolean, default: false }
        },
        reporte: {
            plantilla: {
                type: String,
                enum: ['radiografia_general', 'torax', 'extremidades', 'mamografia', 'personalizada'],
                default: 'radiografia_general'
            },
            hallazgos: { type: String, trim: true },
            impresion_diagnostica: { type: String, trim: true },
            recomendaciones: { type: String, trim: true },
            tecnico: { type: String, trim: true },
            medico_firmante: { type: String, trim: true },
            fecha_reporte: Date
        },
        dicom: {
            studyInstanceUID: String,
            seriesInstanceUID: String,
            sopInstanceUID: String,
            rutaArchivo: String,
            orthancStudyId: String
        }
    },

    // Control
    realizadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    validadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    fechaRealizacion: Date,
    fechaValidacion: Date,
    fechaEntrega: Date,

    // Para impresión
    impreso: {
        type: Boolean,
        default: false
    },
    vecesImpreso: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Helper function para determinar si es estudio de laboratorio
function esEstudioLaboratorio(estudio) {
    if (!estudio) return false;

    // Si el código empieza con LAB
    if (estudio.codigo && estudio.codigo.toUpperCase().startsWith('LAB')) {
        return true;
    }

    // Categorías de laboratorio
    const categoriasLab = [
        'hematologia',
        'quimica',
        'orina',
        'coagulacion',
        'inmunologia',
        'microbiologia',
        'laboratorio clinico'
    ];

    if (estudio.categoria) {
        const catLower = estudio.categoria.toLowerCase();
        return categoriasLab.some(c => catLower.includes(c));
    }

    return false;
}

// Auto-generar código de muestra simple con secuencia global
// Laboratorio: L0001, L0002, etc.
// Otras áreas: 0001, 0002, etc.
resultadoSchema.pre('validate', async function (next) {
    if (!this.codigoMuestra) {
        try {
            // Poblar el estudio si no está poblado
            if (!this.populated('estudio') && this.estudio) {
                await this.populate('estudio');
            }

            // Obtener el siguiente número de la secuencia global
            const contadorId = this.sucursal ? `resultado_id_${this.sucursal}` : 'resultado_id';
            const contador = await Contador.findByIdAndUpdate(
                contadorId,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            const numeroSecuencia = contador.seq;

            // Determinar si es laboratorio
            const esLab = esEstudioLaboratorio(this.estudio);

            // Generar código simple
            if (esLab) {
                this.codigoMuestra = `L${numeroSecuencia}`;
            } else {
                this.codigoMuestra = `${numeroSecuencia}`;
            }

        } catch (error) {
            // En caso de error, usar timestamp para garantizar unicidad
            const timestamp = Date.now();
            this.codigoMuestra = `ERR-${timestamp}`;
        }
    }
    next();
});

// Índices
resultadoSchema.index({ paciente: 1, createdAt: -1 });
resultadoSchema.index({ cita: 1 });
resultadoSchema.index({ estado: 1 });
resultadoSchema.index({ codigoMuestra: 1, sucursal: 1 }, { unique: true });

const Resultado = mongoose.model('Resultado', resultadoSchema);

module.exports = Resultado;
module.exports.Contador = Contador;
