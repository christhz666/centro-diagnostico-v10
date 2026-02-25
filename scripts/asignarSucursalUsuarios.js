/**
 * Script para asignar sucursal a usuarios que no la tienen (null, undefined o campo inexistente)
 * Ejecutar: node scripts/asignarSucursalUsuarios.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Sucursal = require('../models/Sucursal');
const User = require('../models/User');

async function asignar() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const sedePrincipal = await Sucursal.findOne({ codigo: 'PRINC' }) || await Sucursal.findOne();

        if (!sedePrincipal) {
            console.error('❌ No hay sucursales en la base de datos. Cree una sucursal primero.');
            process.exit(1);
        }

        const result = await User.updateMany(
            { $or: [{ sucursal: { $exists: false } }, { sucursal: null }] },
            { $set: { sucursal: sedePrincipal._id } }
        );

        console.log(`✅ Usuarios actualizados: ${result.modifiedCount}`);
        console.log(`   Sucursal asignada: ${sedePrincipal.nombre} (${sedePrincipal._id})`);

        if (result.modifiedCount === 0) {
            const sinSucursal = await User.find({ $or: [{ sucursal: null }, { sucursal: { $exists: false } }] }).select('nombre apellido email role');
            if (sinSucursal.length > 0) {
                console.log('   Usuarios sin sucursal:', sinSucursal);
            } else {
                console.log('   Todos los usuarios ya tienen sucursal asignada.');
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

asignar();
