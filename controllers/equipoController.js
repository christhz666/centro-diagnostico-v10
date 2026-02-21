const Equipo = require('../models/Equipo');

// Obtener todos los equipos (SIN servicio)
exports.getEquipos = async (req, res) => {
  try {
    console.log('?? GET /api/equipos - Consultando...');
    
    const equipos = await Equipo.find().sort({ nombre: 1 });
    
    console.log(`? Encontrados: ${equipos.length} equipos`);
    
    // Devolver directamente sin verificar estado de conexión
    res.json(equipos);
  } catch (error) {
    console.error('? Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Obtener estado de conexiones
exports.getEstadoConexiones = async (req, res) => {
  // Por ahora devolver array vacío
  res.json([]);
};

// Obtener un equipo por ID
exports.getEquipo = async (req, res) => {
  try {
    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }
    res.json(equipo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear equipo
exports.createEquipo = async (req, res) => {
  try {
    const equipo = new Equipo(req.body);
    await equipo.save();
    res.status(201).json(equipo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar equipo
exports.updateEquipo = async (req, res) => {
  try {
    const equipo = await Equipo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!equipo) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }
    res.json(equipo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar equipo
exports.deleteEquipo = async (req, res) => {
  try {
    const equipo = await Equipo.findByIdAndDelete(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }
    res.json({ message: 'Equipo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Funciones de conexión (stubs por ahora)
exports.conectarEquipo = async (req, res) => {
  try {
    const equipo = await Equipo.findByIdAndUpdate(
      req.params.id,
      { estado: 'activo', ultimaConexion: new Date() },
      { new: true }
    );
    res.json({ message: 'Equipo marcado como activo', equipo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.desconectarEquipo = async (req, res) => {
  try {
    const equipo = await Equipo.findByIdAndUpdate(
      req.params.id,
      { estado: 'inactivo' },
      { new: true }
    );
    res.json({ message: 'Equipo desconectado', equipo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.probarConexion = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Prueba de conexión simulada',
    timestamp: new Date()
  });
};

exports.enviarOrden = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Función de envío de orden no implementada aún' 
  });
};

module.exports = exports;
