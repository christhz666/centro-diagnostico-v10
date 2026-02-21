const express = require('express');
const router = express.Router();
const {
    getResultados,
    getResultado,
    getResultadosPorPaciente,
    getResultadosPorCedula,
    createResultado,
    updateResultado,
    validarResultado,
    deleteResultado,
    marcarImpreso
} = require('../controllers/resultadoController');
const auth = require('../middleware/auth');

// Rutas públicas (para QR)
router.get('/cedula/:cedula', getResultadosPorCedula);

// Rutas protegidas
router.use(auth);

router.get('/', getResultados);
router.get('/paciente/:pacienteId', getResultadosPorPaciente);
router.get('/:id', getResultado);
router.post('/', createResultado);
router.put('/:id', updateResultado);
router.put('/:id/validar', validarResultado);
router.put('/:id/imprimir', marcarImpreso);
router.delete('/:id', deleteResultado);

module.exports = router;
