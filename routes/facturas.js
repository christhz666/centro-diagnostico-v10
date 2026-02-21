const express = require('express');
const router = express.Router();
const {
    getFacturas, getFactura, createFactura,
    anularFactura, getResumen, crearDesdeOrden, pagarFactura
} = require('../controllers/facturaController');
const { protect, authorize } = require('../middleware/auth');
const { idValidation } = require('../middleware/validators');

router.use(protect);

router.get('/resumen', authorize('admin'), getResumen);

router.post('/crear-desde-orden/:ordenId', authorize('admin', 'recepcion'), crearDesdeOrden);

router.route('/')
    .get(getFacturas)
    .post(authorize('admin', 'recepcion'), createFactura);

router.route('/:id')
    .get(idValidation, getFactura);

router.post('/:id/pagar', idValidation, authorize('admin', 'recepcion'), pagarFactura);
router.patch('/:id/anular', idValidation, authorize('admin'), anularFactura);

module.exports = router;
