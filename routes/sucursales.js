const express = require('express');
const { getSucursales, getSucursal, createSucursal, updateSucursal, deleteSucursal } = require('../controllers/sucursalController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getSucursales)
    .post(protect, authorize('admin'), createSucursal);

router.route('/:id')
    .get(protect, getSucursal)
    .put(protect, authorize('admin'), updateSucursal)
    .delete(protect, authorize('admin'), deleteSucursal);

module.exports = router;
