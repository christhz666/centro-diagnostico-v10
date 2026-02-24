const express = require('express');
const { getSucursales, getSucursal, createSucursal, updateSucursal, deleteSucursal } = require('../controllers/sucursalController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Ruta Abierta para la Inyección Offline desde Windows Tauri (Rust)
router.get('/offline-sync', getSucursales);

router.route('/')
    .get(protect, getSucursales)
    .post(protect, authorize('admin'), createSucursal);

router.route('/:id')
    .get(protect, getSucursal)
    .put(protect, authorize('admin'), updateSucursal)
    .delete(protect, authorize('admin'), deleteSucursal);

module.exports = router;
