const mongoose = require('mongoose');

const estudioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre del estudio es requerido'],
        trim: true
    },
    codigo: {
        type: String,
        required: [true, 'El código es requerido'],
        unique: true,
        uppercase: true,
        trim: true
    },
    categoria: {
        type: String,
        required: [true, 'La categoría es requerida'],
        enum: [
            'Laboratorio Clínico',
            'Imagenología', 
            'Cardiología',
            'Sonografía',
            'Rayos X',
            'Tomografía',
            'Resonancia',
            'Endoscopia',
            'Otros',
            'cr',
            'CR'
        ]
    },
    descripcion: {
        type: String,
        trim: true
    },
    precio: {
        type: Number,
        required: [true, 'El precio es requerido'],
        min: [0, 'El precio no puede ser negativo']
    },
    precioSeguro: {
        type: Number,
        default: 0
    },
    duracionMinutos: {
        type: Number,
        default: 30
    },
    preparacion: {
        type: String,
        trim: true
    },
    requiereAyuno: {
        type: Boolean,
        default: false
    },
    horasAyuno: {
        type: Number,
        default: 0
    },
    requiereCita: {
        type: Boolean,
        default: true
    },
    activo: {
        type: Boolean,
        default: true
    },
    departamento: {
        type: String,
        trim: true
    },
    parametrosNormales: [{
        nombre: String,
        unidad: String,
        valorMinimo: Number,
        valorMaximo: Number,
        valorReferencia: String
    }]
}, {
    timestamps: true
});

estudioSchema.index({ nombre: 'text', codigo: 'text' });
estudioSchema.index({ categoria: 1 });

module.exports = mongoose.model('Estudio', estudioSchema);
