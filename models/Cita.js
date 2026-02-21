const mongoose = require('mongoose');

const contadorRegistroSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const ContadorRegistro = mongoose.models.ContadorRegistro || mongoose.model('ContadorRegistro', contadorRegistroSchema);

const citaSchema = new mongoose.Schema({
    // Relaciones
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: [true, 'El paciente es requerido']
    },
    medico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    estudios: [{
        estudio: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Estudio',
            required: true
        },
        precio: Number,
        descuento: {
            type: Number,
            default: 0
        }
    }],
    
    // Fecha y hora
    fecha: {
        type: Date,
        required: [true, 'La fecha es requerida']
    },
    horaInicio: {
        type: String,
        required: [true, 'La hora es requerida']
    },
    horaFin: {
        type: String
    },
    
    // Estado
    estado: {
        type: String,
        enum: [
            'programada',
            'confirmada', 
            'en_sala',
            'en_proceso',
            'completada',
            'cancelada',
            'no_asistio'
        ],
        default: 'programada'
    },
    
    // Financiero
    subtotal: {
        type: Number,
        default: 0
    },
    descuentoTotal: {
        type: Number,
        default: 0
    },
    impuesto: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    metodoPago: {
        type: String,
        enum: ['efectivo', 'tarjeta', 'transferencia', 'seguro', 'mixto', 'pendiente'],
        default: 'pendiente'
    },
    pagado: {
        type: Boolean,
        default: false
    },
    
    // Seguro
    seguroAplicado: {
        nombre: String,
        cobertura: Number,
        autorizacion: String
    },
    
    // Notas
    motivo: {
        type: String,
        trim: true
    },
    notas: {
        type: String,
        trim: true
    },
    notasInternas: {
        type: String,
        trim: true
    },
    
    // Orden médica
    ordenMedica: {
        type: String // URL del archivo
    },
    
    // Control
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    modificadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    canceladoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    motivoCancelacion: String,
    
    // Prioridad
    urgente: {
        type: Boolean,
        default: false
    },
    registroId: {
        type: String,
        unique: true,
        sparse: true
    },
    codigoBarras: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Calcular total antes de guardar
citaSchema.pre('save', function(next) {
    if (this.estudios && this.estudios.length > 0) {
        this.subtotal = this.estudios.reduce((sum, item) => {
            return sum + (item.precio || 0) - (item.descuento || 0);
        }, 0);
        this.total = this.subtotal - this.descuentoTotal + this.impuesto;
    }
    next();
});

citaSchema.pre('validate', async function(next) {
    if (!this.registroId) {
        const contador = await ContadorRegistro.findByIdAndUpdate(
            'registro_orden',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.registroId = String(contador.seq).padStart(5, '0');
    }

    if (!this.codigoBarras && this.registroId) {
        this.codigoBarras = `ORD${this.registroId}`;
    }

    next();
});

// Índices
citaSchema.index({ paciente: 1, fecha: 1 });
citaSchema.index({ medico: 1, fecha: 1 });
citaSchema.index({ estado: 1 });
citaSchema.index({ fecha: 1 });
citaSchema.index({ registroId: 1 });
citaSchema.index({ codigoBarras: 1 });

module.exports = mongoose.model('Cita', citaSchema);
