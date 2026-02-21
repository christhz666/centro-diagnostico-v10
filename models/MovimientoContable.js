const mongoose = require('mongoose');

const movimientoContableSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['ingreso', 'egreso'],
        required: true
    },
    categoria: {
        type: String,
        enum: [
            'consultas', 'laboratorio', 'imagenologia', 'farmacia', 'otros_ingresos',
            'nomina', 'alquiler', 'servicios', 'suministros', 'equipos',
            'mantenimiento', 'impuestos', 'otros_gastos'
        ],
        required: true
    },
    descripcion: {
        type: String,
        required: true,
        trim: true
    },
    monto: {
        type: Number,
        required: true,
        min: 0
    },
    fecha: {
        type: Date,
        default: Date.now,
        required: true
    },
    metodoPago: {
        type: String,
        enum: ['efectivo', 'tarjeta', 'transferencia', 'cheque', 'otro'],
        default: 'efectivo'
    },
    referencia: {
        type: String,
        trim: true
    },
    factura: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Factura'
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notas: String
}, {
    timestamps: true
});

movimientoContableSchema.index({ tipo: 1, fecha: -1 });
movimientoContableSchema.index({ categoria: 1 });
movimientoContableSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MovimientoContable', movimientoContableSchema);
