const express = require('express');
const router = express.Router();
const resultadoController = require('../controllers/resultadoController');

// Rutas públicas (para QR y acceso paciente — SIN autenticación)
router.get('/cedula/:cedula', resultadoController.getResultadosPorCedula);
router.get('/qr/:codigoQR', resultadoController.getResultadosPorQR);
router.get('/acceso-qr/:codigoQR', resultadoController.accesoQR);   // Nuevo: acceso por QR sin contraseña
router.post('/acceso-paciente', resultadoController.accesoPaciente);

router.get('/imagenologia/plantillas', resultadoController.getPlantillasImagenologia);
router.get('/integraciones/dicom-diagnostico', resultadoController.diagnosticoDicom);
router.get('/integraciones/konica/:citaId', resultadoController.getPayloadKonica);

// Rutas sin protección temporalmente para testing
router.get('/', resultadoController.getResultados);
router.get('/factura/:facturaNumero', resultadoController.getResultadosPorFactura);
router.get('/paciente/:pacienteId', resultadoController.getResultadosPorPaciente);
router.get('/muestra/:codigoMuestra', resultadoController.getResultadoPorCodigo);
// Verificar pago antes de imprimir - DEBE IR ANTES de '/:id'
router.get('/:id/verificar-pago', resultadoController.verificarPago);
router.get('/:id/imagenologia', resultadoController.getWorkspaceImagenologia);
router.put('/:id/imagenologia', resultadoController.updateWorkspaceImagenologia);
router.get('/:id', resultadoController.getResultado);
router.post('/', resultadoController.createResultado);
router.put('/:id', resultadoController.updateResultado);
router.put('/:id/validar', resultadoController.validarResultado);
router.patch('/:id/validar', resultadoController.validarResultado);
router.put('/:id/imprimir', resultadoController.marcarImpreso);
router.delete('/:id', resultadoController.deleteResultado);

module.exports = router;
