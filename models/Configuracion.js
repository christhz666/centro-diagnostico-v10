const mongoose = require('mongoose');

const configuracionSchema = new mongoose.Schema({
    clave: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    valor: {
        type: String,
        default: ''
    },
    tipo: {
        type: String,
        enum: ['texto', 'numero', 'json', 'imagen'],
        default: 'texto'
    }
}, {
    timestamps: true
});

configuracionSchema.index({ clave: 1 });

module.exports = mongoose.model('Configuracion', configuracionSchema);
