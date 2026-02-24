const express = require('express');
const router = express.Router();
const {
    getEstudios, getEstudio, createEstudio,
    updateEstudio, deleteEstudio, getCategorias
} = require('../controllers/estudioController');
const { protect, authorize } = require('../middleware/auth');
const { estudioValidation, idValidation } = require('../middleware/validators');

// Ruta Abierta para Sincronización Inicial Offline
router.get('/offline-sync', getEstudios);

router.use(protect);

router.get('/categorias', getCategorias);

router.route('/')
    .get(getEstudios)
    .post(authorize('admin'), estudioValidation, createEstudio);

router.route('/:id')
    .get(idValidation, getEstudio)
    .put(idValidation, authorize('admin'), updateEstudio)
    .delete(idValidation, authorize('admin'), deleteEstudio);

module.exports = router;
