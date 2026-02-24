const express = require('express');
const router = express.Router();
const {
    getUsuarios,
    getUsuario,
    createUsuario,
    updateUsuario,
    toggleUsuario,
    resetPassword,
    getMedicos,
    getRoles,
    getUsuariosParaSyncOffline
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { registerValidation, idValidation } = require('../middleware/validators');

router.use(protect);
router.use(authorize('admin'));

router.get('/medicos', getMedicos);
router.get('/roles', getRoles);

// Rutas Públicas (Offline Sync)
// Importante: Va ANTES de router.route('/usuarios') para que no lo interprete como :id
router.get('/usuarios/offline-sync', getUsuariosParaSyncOffline);

// Rutas de Usuarios
router.route('/usuarios')
    .get(protect, getUsuarios) // Added protect
    .post(protect, authorize('admin', 'super-admin'), createUsuario); // Modified post route

router.route('/usuarios/:id')
    .get(idValidation, getUsuario)
    .put(idValidation, updateUsuario);

router.patch('/usuarios/:id/toggle', idValidation, toggleUsuario);
router.patch('/usuarios/:id/reset-password', idValidation, resetPassword);

module.exports = router;
