const mongoose = require('mongoose');
const Equipo = require('../models/Equipo');
const configuracionesEquipos = require('./equipos-config');
require('dotenv').config();

async function inicializarEquipos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/centro-diagnostico');
    console.log('? Conectado a MongoDB');

    // Limpiar equipos existentes
    await Equipo.deleteMany({});
    console.log('???  Equipos anteriores eliminados');

    // Crear equipos con las configuraciones
    const equipos = Object.values(configuracionesEquipos);
    
    for (const config of equipos) {
      const equipo = await Equipo.create({
        ...config,
        estado: 'inactivo', // Inicialmente inactivos
        estadisticas: {
          resultadosRecibidos: 0,
          errores: 0
        }
      });
      console.log(`? Creado: ${equipo.nombre}`);
    }

    console.log('\n? Todos los equipos inicializados correctamente');
    console.log(`\nTotal de equipos creados: ${equipos.length}`);
    
    // Mostrar resumen
    const resumen = await Equipo.find().select('nombre tipo protocolo estado');
    console.log('\n?? RESUMEN DE EQUIPOS:');
    resumen.forEach(e => {
      console.log(`  - ${e.nombre} | Tipo: ${e.tipo} | Protocolo: ${e.protocolo} | Estado: ${e.estado}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('? Error:', error.message);
    process.exit(1);
  }
}

inicializarEquipos();
