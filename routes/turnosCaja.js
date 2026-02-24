const express = require('express');
const { getTurnoActivo, abrirTurno, cerrarTurno, getHistorialTurnos } = require('../controllers/turnoCajaController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/activa', protect, getTurnoActivo);
router.post('/abrir', protect, abrirTurno);
router.post('/cerrar', protect, cerrarTurno);
router.get('/historial', protect, authorize('admin', 'recepcion'), getHistorialTurnos);

module.exports = router;
