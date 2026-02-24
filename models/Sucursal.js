const mongoose = require('mongoose');

const sucursalSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre de la sucursal es requerido'],
        trim: true,
        unique: true
    },
    codigo: {
        type: String,
        required: [true, 'El código de la sucursal es requerido'],
        trim: true,
        unique: true,
        uppercase: true,
        maxlength: 10
    },
    direccion: {
        type: String,
        trim: true
    },
    telefono: {
        type: String,
        trim: true
    },
    activa: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sucursal', sucursalSchema);
