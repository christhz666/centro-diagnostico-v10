const mongoose = require('mongoose');

const turnoCajaSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: true
    },
    fechaInicio: {
        type: Date,
        default: Date.now
    },
    fechaFin: {
        type: Date
    },
    fechaContable: {
        type: Date,
        required: true
    },
    fondoInicial: {
        type: Number,
        default: 0 // Siempre inicia en 0 según la regla de negocio
    },
    totalEfectivo: { type: Number, default: 0 },
    totalTarjeta: { type: Number, default: 0 },
    totalTransferencia: { type: Number, default: 0 },
    totalSeguro: { type: Number, default: 0 },
    estado: {
        type: String,
        enum: ['abierto', 'cerrado'],
        default: 'abierto'
    }
}, {
    timestamps: true
});

// El empleado no puede tener 2 cajas abiertas a la vez en la misma sucursal
turnoCajaSchema.index({ usuario: 1, sucursal: 1, estado: 1 }, { unique: true, partialFilterExpression: { estado: 'abierto' } });

module.exports = mongoose.model('TurnoCaja', turnoCajaSchema);
