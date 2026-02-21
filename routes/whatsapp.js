const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { enviarCampana, notificarResultadosListos } = require('../whatsapp/campanaService');
const Paciente = require('../models/Paciente');

router.use(protect);
router.use(authorize('admin'));

// @desc   Obtener estadísticas de base de datos de teléfonos
// @route  GET /api/whatsapp/estadisticas
router.get('/estadisticas', async (req, res, next) => {
    try {
        const [total, conTelefono, sinTelefono] = await Promise.all([
            Paciente.countDocuments({ activo: true }),
            Paciente.countDocuments({ activo: true, telefono: { $exists: true, $ne: '' } }),
            Paciente.countDocuments({ activo: true, $or: [{ telefono: { $exists: false } }, { telefono: '' }] })
        ]);
        res.json({ success: true, data: { total, conTelefono, sinTelefono } });
    } catch (error) {
        next(error);
    }
});

// @desc   Enviar campaña de WhatsApp
// @route  POST /api/whatsapp/campana
router.post('/campana', async (req, res, next) => {
    try {
        const { mensaje, segmento = 'todos', pacientesIds } = req.body;
        
        if (!mensaje || mensaje.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'El mensaje debe tener al menos 10 caracteres' });
        }
        
        // Verificar configuración
        if (!process.env.TWILIO_ACCOUNT_SID && !process.env.META_PHONE_NUMBER_ID) {
            return res.status(500).json({ 
                success: false, 
                message: 'WhatsApp no configurado. Configure TWILIO_ACCOUNT_SID o META_PHONE_NUMBER_ID en .env',
                demo: true
            });
        }
        
        const resultados = await enviarCampana({ mensaje, segmento, pacientesIds });
        
        res.json({
            success: true,
            message: `Campaña enviada: ${resultados.enviados}/${resultados.total} mensajes exitosos`,
            data: resultados
        });
    } catch (error) {
        next(error);
    }
});

// @desc   Notificar resultados listos a un paciente
// @route  POST /api/whatsapp/notificar-resultados
router.post('/notificar-resultados', async (req, res, next) => {
    try {
        const { pacienteId, facturaNumero } = req.body;
        const resultado = await notificarResultadosListos(pacienteId, facturaNumero);
        res.json({ success: resultado.success, data: resultado });
    } catch (error) {
        next(error);
    }
});

// @desc   Preview de pacientes que recibirán campaña
// @route  GET /api/whatsapp/preview
router.get('/preview', async (req, res, next) => {
    try {
        const { segmento = 'todos', limit = 5 } = req.query;
        let filtro = { activo: true, telefono: { $exists: true, $ne: '' } };
        if (segmento === 'con_seguro') filtro['seguro.nombre'] = { $exists: true, $ne: '' };
        if (segmento === 'sin_seguro') filtro['seguro.nombre'] = { $exists: false };
        
        const total = await Paciente.countDocuments(filtro);
        const muestra = await Paciente.find(filtro).select('nombre apellido telefono').limit(parseInt(limit));
        
        res.json({ success: true, data: { total, muestra } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
