const express = require('express');
const router = express.Router();
const {
    getUsuarios, getUsuario, createUsuario,
    updateUsuario, toggleUsuario, resetPassword, getMedicos, getRoles
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { registerValidation, idValidation } = require('../middleware/validators');

router.use(protect);
router.use(authorize('admin'));

router.get('/medicos', getMedicos);
router.get('/roles', getRoles);

router.route('/usuarios')
    .get(getUsuarios)
    .post(registerValidation, createUsuario);

router.route('/usuarios/:id')
    .get(idValidation, getUsuario)
    .put(idValidation, updateUsuario);

router.patch('/usuarios/:id/toggle', idValidation, toggleUsuario);
router.patch('/usuarios/:id/reset-password', idValidation, resetPassword);

module.exports = router;
