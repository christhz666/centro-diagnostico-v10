const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Paciente = require('../models/Paciente');
const Cita = require('../models/Cita');
const Resultado = require('../models/Resultado');
const Estudio = require('../models/Estudio');
const User = require('../models/User');

const seedPacientes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('? MongoDB conectado');

        // Obtener estudios y médico
        const estudios = await Estudio.find().limit(10);
        const medico = await User.findOne({ role: 'medico' });
        const laboratorista = await User.findOne({ role: 'laboratorio' });

        if (estudios.length === 0) {
            console.log('? Primero ejecuta el seed principal para crear estudios');
            process.exit(1);
        }

        // Crear pacientes de prueba
        const pacientesData = [
            { nombre: 'Juan', apellido: 'Pérez García', cedula: '001-1234567-8', telefono: '809-555-0001', fechaNacimiento: new Date('1985-03-15'), sexo: 'M', email: 'juan.perez@email.com', tipoSangre: 'O+' },
            { nombre: 'María', apellido: 'Rodríguez López', cedula: '001-2345678-9', telefono: '809-555-0002', fechaNacimiento: new Date('1990-07-22'), sexo: 'F', email: 'maria.rodriguez@email.com', tipoSangre: 'A+' },
            { nombre: 'Carlos', apellido: 'Martínez Santos', cedula: '001-3456789-0', telefono: '809-555-0003', fechaNacimiento: new Date('1978-11-08'), sexo: 'M', email: 'carlos.martinez@email.com', tipoSangre: 'B+' },
            { nombre: 'Ana', apellido: 'González Rivera', cedula: '001-4567890-1', telefono: '809-555-0004', fechaNacimiento: new Date('1995-01-30'), sexo: 'F', email: 'ana.gonzalez@email.com', tipoSangre: 'AB+' },
            { nombre: 'Pedro', apellido: 'Sánchez Díaz', cedula: '001-5678901-2', telefono: '809-555-0005', fechaNacimiento: new Date('1982-05-12'), sexo: 'M', email: 'pedro.sanchez@email.com', tipoSangre: 'O-' },
            { nombre: 'Laura', apellido: 'Fernández Cruz', cedula: '001-6789012-3', telefono: '809-555-0006', fechaNacimiento: new Date('1988-09-25'), sexo: 'F', email: 'laura.fernandez@email.com', tipoSangre: 'A-' },
            { nombre: 'Miguel', apellido: 'Torres Vega', cedula: '001-7890123-4', telefono: '809-555-0007', fechaNacimiento: new Date('1975-12-03'), sexo: 'M', email: 'miguel.torres@email.com', tipoSangre: 'B-' },
            { nombre: 'Carmen', apellido: 'Ruiz Morales', cedula: '001-8901234-5', telefono: '809-555-0008', fechaNacimiento: new Date('1992-04-18'), sexo: 'F', email: 'carmen.ruiz@email.com', tipoSangre: 'O+' },
            { nombre: 'José', apellido: 'Herrera Luna', cedula: '001-9012345-6', telefono: '809-555-0009', fechaNacimiento: new Date('1980-08-07'), sexo: 'M', email: 'jose.herrera@email.com', tipoSangre: 'A+' },
            { nombre: 'Rosa', apellido: 'Mendoza Castillo', cedula: '001-0123456-7', telefono: '809-555-0010', fechaNacimiento: new Date('1998-02-14'), sexo: 'F', email: 'rosa.mendoza@email.com', tipoSangre: 'AB-' }
        ];

        console.log('?? Creando pacientes...');
        
        for (const pacData of pacientesData) {
            // Verificar si ya existe
            let paciente = await Paciente.findOne({ cedula: pacData.cedula });
            
            if (!paciente) {
                paciente = await Paciente.create(pacData);
                console.log(`  ? Paciente creado: ${paciente.nombre} ${paciente.apellido}`);
            } else {
                console.log(`  ?? Paciente ya existe: ${paciente.nombre} ${paciente.apellido}`);
            }

            // Crear citas y resultados para cada paciente
            const numCitas = Math.floor(Math.random() * 3) + 1; // 1-3 citas por paciente
            
            for (let i = 0; i < numCitas; i++) {
                const estudioRandom = estudios[Math.floor(Math.random() * estudios.length)];
                const fechaCita = new Date();
                fechaCita.setDate(fechaCita.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 días

                // Crear cita
                const cita = await Cita.create({
                    paciente: paciente._id,
                    medico: medico?._id,
                    estudios: [{ estudio: estudioRandom._id, precio: estudioRandom.precio }],
                    fecha: fechaCita,
                    horaInicio: `${8 + Math.floor(Math.random() * 8)}:00`,
                    estado: 'completada',
                    total: estudioRandom.precio,
                    pagado: true,
                    metodoPago: ['efectivo', 'tarjeta', 'transferencia'][Math.floor(Math.random() * 3)]
                });

                // Crear resultado para la cita
                const resultado = await Resultado.create({
                    cita: cita._id,
                    paciente: paciente._id,
                    estudio: estudioRandom._id,
                    medico: medico?._id,
                    estado: 'completado',
                    valores: generarValoresResultado(estudioRandom),
                    interpretacion: 'Resultados dentro de parámetros normales.',
                    observaciones: 'Paciente en buen estado general.',
                    conclusion: 'Sin hallazgos patológicos significativos.',
                    realizadoPor: laboratorista?._id || medico?._id,
                    validadoPor: medico?._id,
                    fechaRealizacion: fechaCita,
                    fechaValidacion: new Date()
                });

                console.log(`    ?? Cita + Resultado creado: ${estudioRandom.nombre}`);
            }
        }

        // Estadísticas finales
        const totalPacientes = await Paciente.countDocuments();
        const totalCitas = await Cita.countDocuments();
        const totalResultados = await Resultado.countDocuments();

        console.log('');
        console.log('+---------------------------------------------------+');
        console.log('¦  ? SEED DE PACIENTES COMPLETADO                  ¦');
        console.log('¦---------------------------------------------------¦');
        console.log(`¦  ?? Total Pacientes:  ${totalPacientes.toString().padEnd(25)}¦`);
        console.log(`¦  ?? Total Citas:      ${totalCitas.toString().padEnd(25)}¦`);
        console.log(`¦  ?? Total Resultados: ${totalResultados.toString().padEnd(25)}¦`);
        console.log('+---------------------------------------------------+');

        process.exit(0);
    } catch (error) {
        console.error('? Error:', error.message);
        process.exit(1);
    }
};

function generarValoresResultado(estudio) {
    // Generar valores de ejemplo según el tipo de estudio
    if (estudio.codigo?.startsWith('LAB')) {
        return [
            { parametro: 'Hemoglobina', valor: (12 + Math.random() * 4).toFixed(1), unidad: 'g/dL', valorReferencia: '12-17 g/dL', estado: 'normal' },
            { parametro: 'Hematocrito', valor: (38 + Math.random() * 10).toFixed(1), unidad: '%', valorReferencia: '36-54%', estado: 'normal' },
            { parametro: 'Leucocitos', valor: (5000 + Math.random() * 5000).toFixed(0), unidad: '/mm³', valorReferencia: '4500-11000/mm³', estado: 'normal' },
            { parametro: 'Plaquetas', valor: (200000 + Math.random() * 150000).toFixed(0), unidad: '/mm³', valorReferencia: '150000-400000/mm³', estado: 'normal' }
        ];
    } else if (estudio.codigo?.startsWith('SON') || estudio.codigo?.startsWith('RX')) {
        return [
            { parametro: 'Hallazgos', valor: 'Sin alteraciones significativas', unidad: '', valorReferencia: 'N/A', estado: 'normal' },
            { parametro: 'Calidad de imagen', valor: 'Óptima', unidad: '', valorReferencia: 'N/A', estado: 'normal' }
        ];
    } else {
        return [
            { parametro: 'Resultado', valor: 'Normal', unidad: '', valorReferencia: 'N/A', estado: 'normal' }
        ];
    }
}

seedPacientes();
