const express = require('express');
const router = express.Router();
const {
    getCitas, getCita, createCita, updateCita,
    cambiarEstado, citasHoy, getCitaByRegistro, buscarPacienteHistorial
} = require('../controllers/citaController');
const { protect, authorize } = require('../middleware/auth');
const { citaValidation, idValidation } = require('../middleware/validators');

router.use(protect);

router.get('/hoy', citasHoy);
router.get('/registro/:registroId', getCitaByRegistro);
router.get('/busqueda/paciente', buscarPacienteHistorial);

router.route('/')
    .get(getCitas)
    .post(citaValidation, createCita);

router.route('/:id')
    .get(idValidation, getCita)
    .put(idValidation, updateCita);

router.patch('/:id/estado', idValidation, cambiarEstado);

module.exports = router;
