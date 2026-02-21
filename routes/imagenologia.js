const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/imagenologiaController');
const { protect } = require('../middleware/auth');

// ── Plantillas de reporte ───────────────────────────────────────────────────
router.get('/plantillas', ctrl.getPlantillas);

// ── Lista de estudios de imagenología (panel del doctor) ───────────────────
router.get('/lista', protect, ctrl.listaEstudios);

// ── Workspace del visor ────────────────────────────────────────────────────
router.get('/workspace/:resultadoId', protect, ctrl.getWorkspace);
router.put('/workspace/:resultadoId', protect, ctrl.updateWorkspace);

// ── Subida de imágenes ─────────────────────────────────────────────────────
router.post('/upload/:resultadoId', protect, ctrl.uploadMiddleware, ctrl.uploadImagenes);
router.delete('/imagen/:resultadoId/:imagenId', protect, ctrl.deleteImagen);

// ── Finalizar / firmar reporte ─────────────────────────────────────────────
router.post('/reporte/:resultadoId/finalizar', protect, ctrl.finalizarReporte);

// ── Integración equipo de rayos X ──────────────────────────────────────────
// Genera payload DICOM MWL / HL7 para que el equipo autorrellene los datos
router.get('/worklist/:citaId', protect, ctrl.generarWorklistDICOM);

// Webhook: el equipo avisa que terminó (imagen disponible)
router.post('/webhook/equipo-listo', ctrl.webhookEquipoListo);

module.exports = router;
