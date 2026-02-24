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

// @desc    Descargar instalador 1-click (BAT) para Agente de Laboratorio
// @route   GET /api/downloads/agente-laboratorio
router.get('/agente-laboratorio', (req, res) => {
    const batContent = generateOneClickInstaller('laboratorio');
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', 'attachment; filename="Instalar_Agente_Laboratorio_1Click.bat"');
    res.send(batContent);
});

// @desc    Descargar agente de laboratorio en ZIP (USADO INTERNAMENTE POR EL BAT)
// @route   GET /api/downloads/agente-laboratorio-zip
router.get('/agente-laboratorio-zip', (req, res) => {
    const agentDir = path.join(__dirname, '../agentes/agente-laboratorio');
    servirCarpetaComoZip(res, agentDir, 'agente-laboratorio.zip');
});

// Helper: Generador de BAT Instalador
function generateOneClickInstaller(tipo) {
    const isLab = tipo === 'laboratorio';
    const folderName = isLab ? 'LabAgente' : 'RxAgente';
    const urlZip = `https://${process.env.VITE_API_URL || 'centro.test'}/api/downloads/agente-${tipo}-zip`; // El BAT requiere URL completa, pero para simplificar usaremos local

    // Usamos localhost en caso de test, de lo contrario la IP real en produccion
    const downloadUrl = `http://localhost:5000/api/downloads/agente-${tipo}-zip`;

    return `@echo off
chcp 65001 >nul
:: ========================================================
:: INSTALADOR SILENCIOSO 1-CLIC - CENTRO DIAGNÓSTICO
:: Agente: ${tipo.toUpperCase()}
:: ========================================================
echo.
echo === Iniciando Instalacion de Agente ${tipo.toUpperCase()} ===
echo.
set AGENT_DIR=C:\\CentroDiagnostico_Agentes\\${folderName}
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
cd /d "%AGENT_DIR%"

echo [1/4] Descargando archivos del agente...
powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile 'agente.zip'"
if not exist "agente.zip" (
  echo [ERROR] No se pudo descargar el agente. Cierra y vuelve a intentar.
  pause
  exit /b 1
)

echo [2/4] Extrayendo archivos...
powershell -Command "Expand-Archive -Force -Path 'agente.zip' -DestinationPath '.'"

:: Test de Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ALERTA] Node.js no esta instalado. Abriendo web de Node.js...
    start https://nodejs.org/
    echo Por favor, instala Node.js primero.
    pause
    exit /b 1
)

echo [3/4] Instalando modulos NPM...
call npm install --silent

echo [4/4] Programando inicio automatico en Windows...
:: Crear vbs launcher para que no muestre ventana CMD
echo Set WshShell = CreateObject("WScript.Shell") > run_hidden.vbs
echo WshShell.Run "cmd.exe /c node agente.js", 0, False >> run_hidden.vbs

:: Tarea programada (Arranca oculto y sin molestar cada que el usuario inicia sesion)
schtasks /create /tn "CentroDiagnostico_${folderName}" /tr "wscript.exe \"%AGENT_DIR%\\run_hidden.vbs\"" /sc onlogon /f >nul 2>&1

:: Arrancar ahora mismo
echo === Iniciando Agente en Inmediato ===
wscript run_hidden.vbs

echo.
echo =================================================================
echo   COMPLETADO CON EXITO!
echo   El agente esta corriendo en 2do plano sin molestar.
echo   Y se ejecutara automaticamente siempre que enciendas la PC.
echo.
echo   NOTA: Puedes editar el archivo C:\\CentroDiagnostico_Agentes\\${folderName}\\config.json
echo   para configurar la conexion real hacia el servidor del Centro.
echo =================================================================
pause
exit
`;
}

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
