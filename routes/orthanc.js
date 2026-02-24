const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Configuración de Orthanc (proveniente de .env)
const ORTHANC_URL = process.env.ORTHANC_URL || 'http://127.0.0.1:8042';
const ORTHANC_USER = process.env.ORTHANC_USER || 'admin';
const ORTHANC_PASS = process.env.ORTHANC_PASS || 'admin';

const getAuthHeader = () => {
    const creds = Buffer.from(`${ORTHANC_USER}:${ORTHANC_PASS}`).toString('base64');
    return { 'Authorization': `Basic ${creds}` };
};

// @desc    Obtener vista previa JPEG de una instancia DICOM desde Orthanc
// @route   GET /api/orthanc/visor/:id
// @access  Público (o proteger con middleware protect)
router.get('/visor/:id', async (req, res) => {
    try {
        const instanceId = req.params.id;

        // Orthanc sirve un JPEG directamente para cualquier instancia DICOM
        const orthancResponse = await fetch(`${ORTHANC_URL}/instances/${instanceId}/preview`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!orthancResponse.ok) {
            return res.status(orthancResponse.status).send('No se pudo cargar la imagen desde Orthanc');
        }

        // Configurar cabeceras JPEG y rutear el stream
        res.setHeader('Content-Type', 'image/jpeg');
        orthancResponse.body.pipe(res);

    } catch (error) {
        console.error('Error al solicitar imagen de Orthanc:', error);
        res.status(500).send('Error interno proxying imagen DICOM');
    }
});

module.exports = router;
