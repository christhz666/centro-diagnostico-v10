const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Directorio donde se almacenan los instaladores
const DOWNLOADS_DIR = path.join(__dirname, '../downloads');

// Mapeo de plataformas a extensiones de archivo
const PLATFORM_EXTENSIONS = {
    windows: '.exe',
    mac: '.dmg',
    linux: '.AppImage'
};

// @desc    Obtener información de descargas disponibles
// @route   GET /api/downloads/info
// @access  Public (no requiere autenticación)
router.get('/info', (req, res) => {
    try {
        // Verificar que el directorio de descargas existe
        if (!fs.existsSync(DOWNLOADS_DIR)) {
            return res.json({
                success: true,
                version: '5.0.0',
                platforms: []
            });
        }

        // Leer archivos en el directorio de descargas
        const files = fs.readdirSync(DOWNLOADS_DIR);

        // Identificar plataformas disponibles
        const availablePlatforms = [];

        // Buscar archivos para cada plataforma
        for (const [platform, extension] of Object.entries(PLATFORM_EXTENSIONS)) {
            const installerFile = files.find(f => f.endsWith(extension));

            if (installerFile) {
                const filePath = path.join(DOWNLOADS_DIR, installerFile);
                const stats = fs.statSync(filePath);

                availablePlatforms.push({
                    platform,
                    filename: installerFile,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    available: true
                });
            }
        }

        res.json({
            success: true,
            version: '5.0.0',
            platforms: availablePlatforms,
            total: availablePlatforms.length
        });

    } catch (error) {
        console.error('Error obteniendo información de descargas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo información de descargas'
        });
    }
});

// @desc    Descargar agente de laboratorio como ZIP
// @route   GET /api/downloads/agente-laboratorio
router.get('/agente-laboratorio', (req, res) => {
    const agentDir = path.join(__dirname, '../agentes/agente-laboratorio');
    servirCarpetaComoZip(res, agentDir, 'agente-laboratorio.zip');
});

// @desc    Descargar agente de rayos X como ZIP
// @route   GET /api/downloads/agente-rayosx
router.get('/agente-rayosx', (req, res) => {
    const agentDir = path.join(__dirname, '../agentes/agente-rayosx');
    servirCarpetaComoZip(res, agentDir, 'agente-rayosx.zip');
});

// Helper: servir una carpeta completa como archivo ZIP
function servirCarpetaComoZip(res, dirPath, zipName) {
    if (!fs.existsSync(dirPath)) {
        return res.status(404).json({ success: false, error: 'Agente no encontrado' });
    }
    try {
        const archiver = require('archiver');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

        const zip = archiver('zip', { zlib: { level: 9 } });
        zip.on('error', err => res.status(500).json({ success: false, error: err.message }));
        zip.pipe(res);
        zip.directory(dirPath, path.basename(dirPath));
        zip.finalize();
    } catch (error) {
        console.error('Error creando ZIP:', error);
        res.status(500).json({ success: false, error: 'Error creando archivo ZIP. Instala archiver: npm install archiver' });
    }
}

// @desc    Descargar instalador para una plataforma específica
// @route   GET /api/downloads/:platform
// @access  Public (no requiere autenticación)
router.get('/:platform', (req, res) => {
    try {
        const { platform } = req.params;

        // Validar plataforma
        if (!PLATFORM_EXTENSIONS[platform]) {
            return res.status(400).json({
                success: false,
                error: 'Plataforma no válida. Opciones: windows, mac, linux'
            });
        }

        // Verificar que el directorio existe
        if (!fs.existsSync(DOWNLOADS_DIR)) {
            return res.status(404).json({
                success: false,
                error: 'No hay instaladores disponibles'
            });
        }

        // Buscar archivo de instalador
        const files = fs.readdirSync(DOWNLOADS_DIR);
        const extension = PLATFORM_EXTENSIONS[platform];
        const installerFile = files.find(f => f.endsWith(extension));

        if (!installerFile) {
            return res.status(404).json({
                success: false,
                error: `No hay instalador disponible para ${platform}`
            });
        }

        const filePath = path.join(DOWNLOADS_DIR, installerFile);

        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Archivo de instalador no encontrado'
            });
        }

        // Determinar tipo de contenido
        let contentType = 'application/octet-stream';
        if (platform === 'windows') {
            contentType = 'application/x-msdownload';
        } else if (platform === 'mac') {
            contentType = 'application/x-apple-diskimage';
        } else if (platform === 'linux') {
            contentType = 'application/x-executable';
        }

        // Configurar headers para descarga
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${installerFile}"`);

        // Enviar archivo
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error descargando instalador:', error);
        res.status(500).json({
            success: false,
            error: 'Error descargando instalador'
        });
    }
});

// Helper function para formatear bytes a formato legible
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
