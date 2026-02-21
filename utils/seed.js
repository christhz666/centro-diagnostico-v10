const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Estudio = require('../models/Estudio');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('? MongoDB conectado para seed');

        // ========== CREAR ADMIN ==========
        const adminExists = await User.findOne({ email: 'admin@miesperanza.com' });
        
        if (!adminExists) {
            await User.create({
                nombre: 'Administrador',
                apellido: 'Sistema',
                email: 'admin@miesperanza.com',
                password: 'Admin123!',
                role: 'admin',
                telefono: '809-000-0000'
            });
            console.log('? Admin creado: admin@miesperanza.com / Admin123!');
        } else {
            console.log('?? Admin ya existe');
        }

        // ========== CREAR MÉDICO DE PRUEBA ==========
        const medicoExists = await User.findOne({ email: 'doctor@miesperanza.com' });
        
        if (!medicoExists) {
            await User.create({
                nombre: 'Dr. Juan',
                apellido: 'Pérez',
                email: 'doctor@miesperanza.com',
                password: 'Doctor123!',
                role: 'medico',
                especialidad: 'Patología Clínica',
                licenciaMedica: 'MED-12345',
                telefono: '809-111-1111'
            });
            console.log('? Médico creado: doctor@miesperanza.com / Doctor123!');
        }

        // ========== CREAR RECEPCIONISTA ==========
        const recepExists = await User.findOne({ email: 'recepcion@miesperanza.com' });
        
        if (!recepExists) {
            await User.create({
                nombre: 'María',
                apellido: 'García',
                email: 'recepcion@miesperanza.com',
                password: 'Recepcion123!',
                role: 'recepcion',
                telefono: '809-222-2222'
            });
            console.log('? Recepcionista creada: recepcion@miesperanza.com / Recepcion123!');
        }

        // ========== CREAR LABORATORISTA ==========
        const labExists = await User.findOne({ email: 'lab@miesperanza.com' });
        
        if (!labExists) {
            await User.create({
                nombre: 'Carlos',
                apellido: 'Rodríguez',
                email: 'lab@miesperanza.com',
                password: 'Lab123!',
                role: 'laboratorio',
                telefono: '809-333-3333'
            });
            console.log('? Laboratorista creado: lab@miesperanza.com / Lab123!');
        }

        // ========== CREAR ESTUDIOS ==========
        const estudiosCount = await Estudio.countDocuments();
        
        if (estudiosCount === 0) {
            const estudios = [
                // Laboratorio Clínico
                { nombre: 'Hemograma Completo (CBC)', codigo: 'LAB-001', categoria: 'Laboratorio Clínico', precio: 500, duracionMinutos: 30, requiereAyuno: false, preparacion: 'No requiere preparación especial', parametrosNormales: [
                    { nombre: 'Hemoglobina', unidad: 'g/dL', valorMinimo: 12, valorMaximo: 17, valorReferencia: '12-17 g/dL' },
                    { nombre: 'Hematocrito', unidad: '%', valorMinimo: 36, valorMaximo: 54, valorReferencia: '36-54%' },
                    { nombre: 'Glóbulos Blancos', unidad: 'x10³/µL', valorMinimo: 4.5, valorMaximo: 11, valorReferencia: '4.5-11 x10³/µL' },
                    { nombre: 'Plaquetas', unidad: 'x10³/µL', valorMinimo: 150, valorMaximo: 400, valorReferencia: '150-400 x10³/µL' }
                ]},
                { nombre: 'Glucosa en Ayunas', codigo: 'LAB-002', categoria: 'Laboratorio Clínico', precio: 300, duracionMinutos: 15, requiereAyuno: true, horasAyuno: 8, preparacion: 'Ayuno de 8-12 horas', parametrosNormales: [
                    { nombre: 'Glucosa', unidad: 'mg/dL', valorMinimo: 70, valorMaximo: 100, valorReferencia: '70-100 mg/dL' }
                ]},
                { nombre: 'Perfil Lipídico', codigo: 'LAB-003', categoria: 'Laboratorio Clínico', precio: 1200, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 12, preparacion: 'Ayuno de 12 horas' },
                { nombre: 'Hemoglobina Glicosilada (HbA1c)', codigo: 'LAB-004', categoria: 'Laboratorio Clínico', precio: 800, duracionMinutos: 30, requiereAyuno: false },
                { nombre: 'Urea y Creatinina', codigo: 'LAB-005', categoria: 'Laboratorio Clínico', precio: 600, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 8 },
                { nombre: 'Ácido Úrico', codigo: 'LAB-006', categoria: 'Laboratorio Clínico', precio: 400, duracionMinutos: 20, requiereAyuno: true, horasAyuno: 8 },
                { nombre: 'Perfil Hepático', codigo: 'LAB-007', categoria: 'Laboratorio Clínico', precio: 1500, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 8 },
                { nombre: 'Perfil Tiroideo (TSH, T3, T4)', codigo: 'LAB-008', categoria: 'Laboratorio Clínico', precio: 1800, duracionMinutos: 30, requiereAyuno: false },
                { nombre: 'Examen General de Orina', codigo: 'LAB-009', categoria: 'Laboratorio Clínico', precio: 350, duracionMinutos: 20, requiereAyuno: false, preparacion: 'Muestra de orina de primera hora' },
                { nombre: 'Coprológico', codigo: 'LAB-010', categoria: 'Laboratorio Clínico', precio: 350, duracionMinutos: 20, requiereAyuno: false },
                { nombre: 'PSA (Antígeno Prostático)', codigo: 'LAB-011', categoria: 'Laboratorio Clínico', precio: 900, duracionMinutos: 30, requiereAyuno: false },
                { nombre: 'Prueba de Embarazo (Sangre)', codigo: 'LAB-012', categoria: 'Laboratorio Clínico', precio: 500, duracionMinutos: 15, requiereAyuno: false },
                { nombre: 'Vitamina D', codigo: 'LAB-013', categoria: 'Laboratorio Clínico', precio: 1200, duracionMinutos: 30, requiereAyuno: false },
                { nombre: 'Hierro Sérico y Ferritina', codigo: 'LAB-014', categoria: 'Laboratorio Clínico', precio: 900, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 8 },
                
                // Imagenología - Rayos X
                { nombre: 'Rayos X de Tórax (PA)', codigo: 'RX-001', categoria: 'Rayos X', precio: 800, duracionMinutos: 15, requiereAyuno: false, preparacion: 'Remover objetos metálicos' },
                { nombre: 'Rayos X de Columna Lumbar', codigo: 'RX-002', categoria: 'Rayos X', precio: 1000, duracionMinutos: 20, requiereAyuno: false },
                { nombre: 'Rayos X de Rodilla', codigo: 'RX-003', categoria: 'Rayos X', precio: 800, duracionMinutos: 15, requiereAyuno: false },
                { nombre: 'Rayos X de Mano/Muñeca', codigo: 'RX-004', categoria: 'Rayos X', precio: 700, duracionMinutos: 15, requiereAyuno: false },
                
                // Sonografías
                { nombre: 'Sonografía Abdominal', codigo: 'SON-001', categoria: 'Sonografía', precio: 1500, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 6, preparacion: 'Ayuno de 6 horas' },
                { nombre: 'Sonografía Pélvica', codigo: 'SON-002', categoria: 'Sonografía', precio: 1500, duracionMinutos: 30, requiereAyuno: false, preparacion: 'Vejiga llena' },
                { nombre: 'Sonografía Obstétrica', codigo: 'SON-003', categoria: 'Sonografía', precio: 2000, duracionMinutos: 45, requiereAyuno: false },
                { nombre: 'Sonografía Mamaria', codigo: 'SON-004', categoria: 'Sonografía', precio: 1500, duracionMinutos: 30, requiereAyuno: false },
                { nombre: 'Sonografía Renal', codigo: 'SON-005', categoria: 'Sonografía', precio: 1500, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 6 },
                { nombre: 'Sonografía Prostática', codigo: 'SON-006', categoria: 'Sonografía', precio: 1800, duracionMinutos: 30, requiereAyuno: false },
                { nombre: 'Sonografía Tiroidea', codigo: 'SON-007', categoria: 'Sonografía', precio: 1500, duracionMinutos: 30, requiereAyuno: false },
                
                // Tomografía
                { nombre: 'Tomografía de Cráneo', codigo: 'TC-001', categoria: 'Tomografía', precio: 5000, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 4 },
                { nombre: 'Tomografía de Tórax', codigo: 'TC-002', categoria: 'Tomografía', precio: 5000, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 4 },
                { nombre: 'Tomografía Abdominal', codigo: 'TC-003', categoria: 'Tomografía', precio: 6000, duracionMinutos: 45, requiereAyuno: true, horasAyuno: 6 },
                
                // Cardiología
                { nombre: 'Electrocardiograma (ECG)', codigo: 'CAR-001', categoria: 'Cardiología', precio: 800, duracionMinutos: 15, requiereAyuno: false },
                { nombre: 'Ecocardiograma', codigo: 'CAR-002', categoria: 'Cardiología', precio: 3000, duracionMinutos: 45, requiereAyuno: false },
                { nombre: 'Holter 24 horas', codigo: 'CAR-003', categoria: 'Cardiología', precio: 3500, duracionMinutos: 30, requiereAyuno: false, preparacion: 'El equipo se coloca por 24 horas' },
                { nombre: 'Prueba de Esfuerzo', codigo: 'CAR-004', categoria: 'Cardiología', precio: 3000, duracionMinutos: 60, requiereAyuno: false, preparacion: 'Ropa cómoda y deportiva' },
                { nombre: 'MAPA (Monitoreo Presión 24h)', codigo: 'CAR-005', categoria: 'Cardiología', precio: 2500, duracionMinutos: 30, requiereAyuno: false },
                
                // Endoscopia
                { nombre: 'Endoscopia Digestiva Superior', codigo: 'END-001', categoria: 'Endoscopia', precio: 5000, duracionMinutos: 30, requiereAyuno: true, horasAyuno: 8, preparacion: 'Ayuno de 8 horas. Acompañante obligatorio.' },
                { nombre: 'Colonoscopia', codigo: 'END-002', categoria: 'Endoscopia', precio: 7000, duracionMinutos: 60, requiereAyuno: true, horasAyuno: 12, preparacion: 'Preparación especial el día anterior. Acompañante obligatorio.' }
            ];

            await Estudio.insertMany(estudios);
            console.log(`? ${estudios.length} estudios creados`);
        } else {
            console.log(`?? Ya existen ${estudiosCount} estudios`);
        }

        console.log('');
        console.log('+-----------------------------------------------+');
        console.log('¦  ? SEED COMPLETADO                          ¦');
        console.log('¦                                               ¦');
        console.log('¦  Credenciales de acceso:                     ¦');
        console.log('¦  ?? Admin: admin@miesperanza.com / Admin123! ¦');
        console.log('¦  ?? Médico: doctor@miesperanza.com / Doctor123!¦');
        console.log('¦  ?? Recep: recepcion@miesperanza.com / Recepcion123!¦');
        console.log('¦  ?? Lab: lab@miesperanza.com / Lab123!       ¦');
        console.log('+-----------------------------------------------+');

        process.exit(0);
    } catch (error) {
        console.error('? Error en seed:', error.message);
        process.exit(1);
    }
};

seedData();
