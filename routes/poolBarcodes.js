const express = require('express');
const router = express.Router();
const poolController = require('../controllers/poolBarcodeController');
const { protect, authorize } = require('../middleware/auth');

// 1. Generador Visual (Retorna un PNG real de Barcode para VisorResultados y Factura Termica)
router.get('/generate', poolController.generarBarcodeImagen);

// 2. Endpoints de Sincronización para descargar los Numeros a Base de Datos Local SQLite
router.get('/offline-sync/:sucursalId/:tipo', poolController.syncGetPoolOffline); // Abierto para el Demonio en Rust
router.get('/sync/:sucursalId/:tipo', protect, poolController.syncGetPoolOffline);

// 3. Endpoint de Reporte de Uso desde Base de Datos Local SQLite a Nube
router.post('/sync/update', protect, poolController.syncUpdatePoolUso);

// 4. Panel Admin
router.get('/dashboard', protect, authorize('admin', 'super-admin'), poolController.getDashboardPools);

module.exports = router;
