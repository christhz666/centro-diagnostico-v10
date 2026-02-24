const mongoose = require('mongoose');

const poolBarcodeSchema = new mongoose.Schema({
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: ['FACTURA', 'RESULTADO_LAB', 'CITA', 'MUESTRA_TUBO'],
        required: true
    },
    loteId: {
        type: String, /* ej: LOTE-PIA-LAB-001 */
        required: true,
        unique: true
    },
    prefijo: {
        type: String, /* ej: FAC-PIA- */
        required: true
    },
    rangoInicio: {
        type: Number,
        required: true
    },
    rangoFin: {
        type: Number,
        required: true
    },
    cantidadTotal: {
        type: Number,
        required: true
    },
    creadoEn: {
        type: Date,
        default: Date.now
    },
    descargadoEn: {
        type: Date // Cuando el cliente SQLite hizo pull
    },
    ultimoUsado: {
        type: Number,
        default: 0 // Cuando el cliente notifica uso de la Nube // Default es rango inicio
    },
    agotado: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indice para búsquedas rápidas al descargar pools activos
poolBarcodeSchema.index({ sucursal: 1, tipo: 1, agotado: 1 });

const PoolBarcode = mongoose.model('PoolBarcode', poolBarcodeSchema);

module.exports = PoolBarcode;
