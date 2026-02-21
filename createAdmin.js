const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/centro_diagnostico');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin123*', 10);

  await mongoose.connection.collection('users').insertOne({
    nombre: 'Administrador',
    email: 'admin@centro.com',
    password: hashedPassword,
    rol: 'admin',
    createdAt: new Date()
  });

  console.log('? Admin creado correctamente');
  process.exit();
}

createAdmin();
