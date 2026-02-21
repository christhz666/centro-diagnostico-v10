const mongoose = require('mongoose');

const equipoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  marca: {
    type: String,
    required: true
  },
  modelo: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['hematologia', 'quimica', 'orina', 'coagulacion', 'inmunologia', 'microbiologia', 'otro'],
    required: true
  },
  protocolo: {
    type: String,
    enum: ['ASTM', 'HL7', 'SERIAL', 'TCP', 'FILE'],
    default: 'ASTM'
  },
  configuracion: {
    // Para conexión serial
    puerto: String,           // COM1, /dev/ttyUSB0
    baudRate: { type: Number, default: 9600 },
    dataBits: { type: Number, default: 8 },
    stopBits: { type: Number, default: 1 },
    parity: { type: String, default: 'none' },
    
    // Para conexión TCP/IP
    ip: String,
    puertoTcp: Number,
    
    // Para lectura de archivos
    rutaArchivos: String,
    patron: String,           // Patrón de nombre de archivo
    
    // Configuración general
    tiempoEspera: { type: Number, default: 30000 },
    reintentos: { type: Number, default: 3 }
  },
  mapeoParametros: [{
    codigoEquipo: String,     // Código que envía el equipo
    parametroSistema: String, // ID del parámetro en nuestro sistema
    nombreParametro: String,
    unidad: String,
    factor: { type: Number, default: 1 },  // Factor de conversión
    decimales: { type: Number, default: 2 }
  }],
  mapeoEstudios: [{
    codigoEquipo: String,
    estudioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio' },
    nombreEstudio: String
  }],
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'mantenimiento', 'error'],
    default: 'activo'
  },
  ultimaConexion: Date,
  ultimoError: String,
  estadisticas: {
    resultadosRecibidos: { type: Number, default: 0 },
    errores: { type: Number, default: 0 },
    ultimoResultado: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Equipo', equipoSchema);
