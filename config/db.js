const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Mongoose 7+ no necesita estas opciones, pero por compatibilidad:
        });

        console.log(`? MongoDB conectado: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
        
        // Eventos de conexión
        mongoose.connection.on('error', (err) => {
            console.error(`? Error de MongoDB: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('?? MongoDB desconectado');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('?? MongoDB reconectado');
        });

        return conn;
    } catch (error) {
        console.error(`? Error conectando a MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
