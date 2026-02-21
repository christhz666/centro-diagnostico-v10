/**
 * ============================================================
 *  AGENTE DE RAYOS X / DICOM — Centro Diagnóstico
 * ============================================================
 *  Este agente corre en la PC del equipo de rayos X y:
 *  1. Monitorea una carpeta donde el equipo guarda imágenes
 *  2. Cuando aparece un archivo nuevo (.dcm, .jpg, etc.)
 *     lo sube al VPS por HTTPS (multipart/form-data)
 *  3. Mueve el archivo a la carpeta "procesados"
 * 
 *  USAR:
 *    node agente.js           → Modo normal (producción)
 *    node agente.js --test    → Prueba conexión al servidor
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ── Detectar directorio real (pkg compila a snapshot interno) ─
const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

// ── Cargar configuración ─────────────────────────────────────
const CONFIG_PATH = path.join(APP_DIR, 'config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch (err) {
    console.error('❌ No se pudo cargar config.json:', err.message);
    console.error('   Coloca config.json junto al .exe');
    process.exit(1);
}

const SERVER_URL = config.servidor.url.replace(/\/$/, '');
const CARPETA = config.carpetaMonitoreo;
const EXTENSIONES = config.extensiones || ['.dcm', '.jpg', '.jpeg', '.png'];
const LOG_FILE = path.join(APP_DIR, config.logArchivo || 'agente-rayosx.log');

// ── Logging ──────────────────────────────────────────────────
function log(nivel, mensaje) {
    const ts = new Date().toLocaleString('es-DO');
    const linea = `[${ts}] [${nivel}] ${mensaje}`;
    console.log(linea);
    try { fs.appendFileSync(LOG_FILE, linea + '\n'); } catch { }
}

// ── Subir archivo al VPS ─────────────────────────────────────
async function subirArchivo(rutaArchivo) {
    const nombreArchivo = path.basename(rutaArchivo);
    const extension = path.extname(rutaArchivo).toLowerCase();

    // Intentar extraer el codigoLIS o ID del paciente del nombre del archivo
    // Formatos comunes: "1005_imagen.dcm", "L1005.jpg", "paciente_1005.dcm"
    const matchId = nombreArchivo.match(/(\d{4,5})/);
    const codigoLIS = matchId ? matchId[1] : null;

    log('INFO', `📤 Subiendo: ${nombreArchivo}${codigoLIS ? ` (LIS: ${codigoLIS})` : ''}`);

    const fileData = fs.readFileSync(rutaArchivo);

    // Construir multipart/form-data manualmente (sin dependencia extra en producción)
    const boundary = '----AgenteDICOM' + Date.now();
    const CRLF = '\r\n';

    let body = '';

    // Campo: codigoLIS
    if (codigoLIS) {
        body += `--${boundary}${CRLF}`;
        body += `Content-Disposition: form-data; name="codigoLIS"${CRLF}${CRLF}`;
        body += `${codigoLIS}${CRLF}`;
    }

    // Campo: station_name
    body += `--${boundary}${CRLF}`;
    body += `Content-Disposition: form-data; name="station_name"${CRLF}${CRLF}`;
    body += `${require('os').hostname()}${CRLF}`;

    // Campo: tipo
    body += `--${boundary}${CRLF}`;
    body += `Content-Disposition: form-data; name="tipo"${CRLF}${CRLF}`;
    body += `${extension === '.dcm' ? 'dicom' : 'imagen'}${CRLF}`;

    // Preparar la parte de antes y después del archivo binario
    let fileHeader = `--${boundary}${CRLF}`;
    fileHeader += `Content-Disposition: form-data; name="archivo"; filename="${nombreArchivo}"${CRLF}`;
    fileHeader += `Content-Type: ${extension === '.dcm' ? 'application/dicom' : 'image/' + extension.replace('.', '')}${CRLF}${CRLF}`;

    const fileFooter = `${CRLF}--${boundary}--${CRLF}`;

    // Combinar todo en un Buffer
    const headerBuf = Buffer.from(body + fileHeader, 'utf-8');
    const footerBuf = Buffer.from(fileFooter, 'utf-8');
    const fullBody = Buffer.concat([headerBuf, fileData, footerBuf]);

    return new Promise((resolve, reject) => {
        const url = new URL(`${SERVER_URL}/api/equipos/recibir-imagen`);
        const transport = url.protocol === 'https:' ? https : http;

        const req = transport.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': fullBody.length
            }
        }, (res) => {
            let respBody = '';
            res.on('data', d => respBody += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(respBody);
                    if (parsed.success) {
                        log('OK', `✅ Imagen subida: ${nombreArchivo}`);
                    } else {
                        log('WARN', `⚠️ Servidor: ${parsed.message}`);
                    }
                    resolve(parsed);
                } catch {
                    log('ERROR', `Respuesta no-JSON: ${respBody.substring(0, 200)}`);
                    reject(new Error(respBody));
                }
            });
        });

        req.on('error', (err) => {
            log('ERROR', `❌ No se pudo conectar: ${err.message}`);
            reject(err);
        });

        req.write(fullBody);
        req.end();
    });
}

// ── Mover a procesados ───────────────────────────────────────
function moverAProcesados(rutaArchivo) {
    const dir = path.dirname(rutaArchivo);
    const procesadosDir = path.join(dir, config.carpetaProcesados || 'procesados');

    if (!fs.existsSync(procesadosDir)) {
        fs.mkdirSync(procesadosDir, { recursive: true });
    }

    const destino = path.join(procesadosDir, path.basename(rutaArchivo));
    try {
        fs.renameSync(rutaArchivo, destino);
        log('INFO', `📁 Movido a: ${destino}`);
    } catch (err) {
        log('ERROR', `No se pudo mover: ${err.message}`);
    }
}

// ── Procesar archivo ─────────────────────────────────────────
async function procesarArchivo(rutaArchivo) {
    const ext = path.extname(rutaArchivo).toLowerCase();
    if (!EXTENSIONES.includes(ext)) return;

    // Esperar 2 segundos para que el archivo se termine de escribir
    await new Promise(r => setTimeout(r, 2000));

    if (!fs.existsSync(rutaArchivo)) return;

    try {
        await subirArchivo(rutaArchivo);
        moverAProcesados(rutaArchivo);
    } catch (err) {
        log('ERROR', `Error procesando ${path.basename(rutaArchivo)}: ${err.message}`);
    }
}

// ── Monitoreo con polling (sin chokidar en producción) ───────
const procesados = new Set();

function verificarCarpeta() {
    try {
        if (!fs.existsSync(CARPETA)) {
            fs.mkdirSync(CARPETA, { recursive: true });
            log('INFO', `📁 Carpeta creada: ${CARPETA}`);
            return;
        }

        const archivos = fs.readdirSync(CARPETA);
        for (const archivo of archivos) {
            if (procesados.has(archivo)) continue;

            const ext = path.extname(archivo).toLowerCase();
            if (!EXTENSIONES.includes(ext)) continue;

            const rutaCompleta = path.join(CARPETA, archivo);
            const stat = fs.statSync(rutaCompleta);
            if (!stat.isFile()) continue;

            procesados.add(archivo);
            procesarArchivo(rutaCompleta);
        }
    } catch (err) {
        log('ERROR', `Error leyendo carpeta: ${err.message}`);
    }
}

// ── Modo TEST ────────────────────────────────────────────────
async function modoTest() {
    log('INFO', '🧪 MODO TEST — Probando conexión al servidor...');
    log('INFO', `   Servidor: ${SERVER_URL}`);
    log('INFO', `   Carpeta:  ${CARPETA}`);

    const url = new URL(`${SERVER_URL}/api/equipos/estados`);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.get(url.href, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            log('OK', `✅ Servidor respondió (HTTP ${res.statusCode})`);
            log('INFO', `   Carpeta configurada: ${CARPETA}`);
            log('INFO', `   Extensiones: ${EXTENSIONES.join(', ')}`);

            if (fs.existsSync(CARPETA)) {
                const archivos = fs.readdirSync(CARPETA).filter(a => EXTENSIONES.includes(path.extname(a).toLowerCase()));
                log('INFO', `   Archivos encontrados: ${archivos.length}`);
            } else {
                log('WARN', `   ⚠️ La carpeta no existe aún. Se creará automáticamente.`);
            }

            process.exit(0);
        });
    });

    req.on('error', (err) => {
        log('ERROR', `❌ No se pudo conectar al servidor: ${err.message}`);
        log('INFO', '   Verifica la URL en config.json');
        process.exit(1);
    });
}

// ── INICIO ───────────────────────────────────────────────────
async function inicio() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  📷 Agente de Rayos X — Centro Diagnóstico  ║');
    console.log('║     Monitor de imágenes DICOM/CR             ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    if (process.argv.includes('--test')) {
        return modoTest();
    }

    log('INFO', `Servidor VPS: ${SERVER_URL}`);
    log('INFO', `Carpeta monitoreo: ${CARPETA}`);
    log('INFO', `Extensiones: ${EXTENSIONES.join(', ')}`);

    // Crear carpeta si no existe
    if (!fs.existsSync(CARPETA)) {
        fs.mkdirSync(CARPETA, { recursive: true });
        log('INFO', `📁 Carpeta creada: ${CARPETA}`);
    }

    // Verificar cada N segundos
    const intervalo = config.intervaloVerificacion || 5000;
    setInterval(verificarCarpeta, intervalo);
    verificarCarpeta();

    log('OK', `🟢 Agente corriendo. Vigilando ${CARPETA} cada ${intervalo / 1000}s`);
    log('INFO', 'Presiona Ctrl+C para detener');
}

inicio().catch(err => {
    log('ERROR', `Error fatal: ${err.message}`);
    process.exit(1);
});
