const express = require('express');
const router = express.Router();
const {
    getPacientes, getPaciente, getPacienteByCedula,
    createPaciente, updatePaciente, deletePaciente, getHistorial
} = require('../controllers/pacienteController');
const { protect, authorize } = require('../middleware/auth');
const { requireSucursal } = require('../middleware/sucursal');
const { pacienteValidation, idValidation } = require('../middleware/validators');

router.use(protect); // Todas las rutas requieren autenticación
router.use(requireSucursal); // Todas las rutas requieren sucursal

router.route('/')
    .get(getPacientes)
    .post(pacienteValidation, createPaciente);

router.get('/cedula/:cedula', getPacienteByCedula);

router.route('/:id')
    .get(idValidation, getPaciente)
    .put(idValidation, updatePaciente)
    .delete(idValidation, authorize('admin'), deletePaciente);

router.get('/:id/historial', idValidation, getHistorial);

module.exports = router;
