const express = require('express');
const router = express.Router();
const Configuracion = require('../models/Configuracion');
const { protect, authorize } = require('../middleware/auth');

const MAX_CONFIG_VALUE_LENGTH = 1000000;

// GET /api/configuracion/ - Get all configuration (requires auth)
router.get('/', protect, async (req, res) => {
    try {
        const configs = await Configuracion.find({});
        const configuracion = {};
        configs.forEach(c => {
            configuracion[c.clave] = c.valor;
        });
        res.json({ configuracion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/configuracion/ - Update configuration (admin only)
router.put('/', protect, authorize('admin'), async (req, res) => {
    try {
        const datos = req.body;
        if (!datos || typeof datos !== 'object') {
            return res.status(400).json({ error: 'Datos requeridos' });
        }

        const actualizados = [];
        for (const [clave, valor] of Object.entries(datos)) {
            if (typeof clave !== 'string' || clave.length > 100) continue;
            const valorStr = String(valor).substring(0, MAX_CONFIG_VALUE_LENGTH);

            await Configuracion.findOneAndUpdate(
                { clave },
                { clave, valor: valorStr, tipo: clave.startsWith('logo_') ? 'imagen' : 'texto' },
                { upsert: true, new: true }
            );
            actualizados.push(clave);
        }

        res.json({
            success: true,
            message: `${actualizados.length} configuraciones actualizadas`,
            actualizados
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/configuracion/empresa - Public company info (no auth required)
router.get('/empresa', async (req, res) => {
    try {
        const claves = ['empresa_nombre', 'empresa_rnc', 'empresa_telefono', 'empresa_direccion', 'empresa_email', 'logo_login', 'logo_factura', 'logo_resultados', 'color_primario', 'color_secundario', 'color_acento'];
        const configs = await Configuracion.find({ clave: { $in: claves } });

        const info = {};
        configs.forEach(c => {
            if (c.clave.startsWith('empresa_')) {
                info[c.clave.replace('empresa_', '')] = c.valor;
            } else {
                info[c.clave] = c.valor;
            }
        });
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// GET /api/configuracion/servidor - Runtime/server config summary
router.get('/servidor', protect, async (req, res) => {
    try {
        const claves = [
            'servidor_nombre',
            'servidor_ip_publica',
            'servidor_ip_privada',
            'servidor_dominio',
            'frontend_url',
            'backend_url',
            'cors_origenes'
        ];
        const configs = await Configuracion.find({ clave: { $in: claves } });
        const guardado = {};
        configs.forEach(c => { guardado[c.clave] = c.valor; });

        res.json({
            runtime: {
                host: process.env.HOST || '0.0.0.0',
                port: Number(process.env.PORT || 5000),
                public_api_url: process.env.PUBLIC_API_URL || '',
                frontend_url: process.env.FRONTEND_URL || '',
                cors_origins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
            },
            guardado
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
