const express = require('express');
const router = express.Router();
const { login, register, getMe, changePassword, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginValidation, registerValidation } = require('../middleware/validators');

router.post('/login', loginValidation, login);
router.post('/register', registerValidation, register);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
