const express = require('express');
const router = express.Router();
const { getStats, citasGrafica, topEstudios } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/dashboard', getStats);
router.get('/citas-grafica', authorize('admin'), citasGrafica);
router.get('/top-estudios', authorize('admin'), topEstudios);

module.exports = router;
