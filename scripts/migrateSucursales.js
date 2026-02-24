require('dotenv').config();
const mongoose = require('mongoose');

// Cargar todos los modelos
const Sucursal = require('../models/Sucursal');
const TurnoCaja = require('../models/TurnoCaja');
const User = require('../models/User');
const Paciente = require('../models/Paciente');
const Factura = require('../models/Factura');
const Resultado = require('../models/Resultado');
const Cita = require('../models/Cita');
const MovimientoContable = require('../models/MovimientoContable');

async function migrar() {
    try {
        console.log('Conectando a la Base de Datos...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // 1. Crear Sucursal "Sede Principal" si no existe
        let sedePrincipal = await Sucursal.findOne({ codigo: 'PRINC' });
        if (!sedePrincipal) {
            console.log('Creando Sucursal Sede Principal...');
            sedePrincipal = await Sucursal.create({
                nombre: 'Sede Principal',
                codigo: 'PRINC',
                direccion: 'Av. Direccion Central, Local 1',
                telefono: '809-555-0000',
                activa: true
            });
            console.log('✅ Sucursal Creada:', sedePrincipal._id);
        } else {
            console.log('ℹ️ Sucursal Sede Principal ya existe:', sedePrincipal._id);
        }

        const sucursalId = sedePrincipal._id;

        // 2. Actualizar Usuarios
        console.log('🔄 Actualizando Usuarios...');
        const usersResult = await User.updateMany(
            { sucursal: { $exists: false } },
            { $set: { sucursal: sucursalId } }
        );
        console.log(`✅ Usuarios actualizados: ${usersResult.modifiedCount}`);

        // 3. Obtener un usuario de recepcion (el primero que exista o administrador) para asignarle el cajero si es necesario
        const recepcionista = await User.findOne({ role: { $in: ['admin', 'recepcion'] } }) || await User.findOne();

        let turnoCaja = null;
        if (recepcionista) {
            // Ver si tiene una caja hoy
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            turnoCaja = await TurnoCaja.findOne({ usuario: recepcionista._id, estado: 'abierto' });
            if (!turnoCaja) {
                turnoCaja = await TurnoCaja.create({
                    usuario: recepcionista._id,
                    sucursal: sucursalId,
                    fondoInicial: 0
                });
                console.log('✅ Turno de Caja Cero creado para recepcionista:', recepcionista.username);
            }
        }

        // 4. Actualizar Pacientes
        console.log('🔄 Actualizando Pacientes...');
        const pacientesResult = await Paciente.updateMany(
            { sucursal: { $exists: false } },
            { $set: { sucursal: sucursalId } }
        );
        console.log(`✅ Pacientes actualizados: ${pacientesResult.modifiedCount}`);

        // 5. Actualizar Facturas
        console.log('🔄 Actualizando Facturas...');
        const facturasResult = await Factura.updateMany(
            { sucursal: { $exists: false } },
            { $set: { sucursal: sucursalId } }
        );
        console.log(`✅ Facturas actualizadas: ${facturasResult.modifiedCount}`);

        // 6. Actualizar Resultados
        console.log('🔄 Actualizando Resultados...');
        const resultadosResult = await Resultado.updateMany(
            { sucursal: { $exists: false } },
            { $set: { sucursal: sucursalId } }
        );
        console.log(`✅ Resultados actualizados: ${resultadosResult.modifiedCount}`);

        // 7. Actualizar Citas
        console.log('🔄 Actualizando Citas...');
        const citasResult = await Cita.updateMany(
            { sucursal: { $exists: false } },
            { $set: { sucursal: sucursalId } }
        );
        console.log(`✅ Citas actualizadas: ${citasResult.modifiedCount}`);

        // 8. Actualizar Movimientos Contables
        console.log('🔄 Actualizando Movimientos Contables...');
        const movimientosResult = await MovimientoContable.updateMany(
            { sucursal: { $exists: false } },
            { $set: { sucursal: sucursalId } }
        );
        console.log(`✅ Movimientos actualizados: ${movimientosResult.modifiedCount}`);

        console.log('\n🎉 MEGA MIGRACIÓN A MULTI-SUCURSAL Y CAJA LISTA 🎉');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

migrar();
