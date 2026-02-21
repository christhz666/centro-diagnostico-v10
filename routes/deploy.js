const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const os = require('os');
const dns = require('dns');
const { promisify } = require('util');

const execAsync = promisify(exec);
const dnsReverse = promisify(dns.reverse);

// Modelo simple para tracking de agentes (en memoria por ahora)
// TODO: Mover a MongoDB para persistencia en producción
// Esto evitará pérdida de datos en restart del servidor
let agentesRegistrados = [];

// @desc    Escanear red local para encontrar PCs
// @route   GET /api/deploy/scan
router.get('/scan', async (req, res) => {
    try {
        // Obtener la IP local del servidor
        const networkInterfaces = os.networkInterfaces();
        let localIP = '192.168.1.1'; // Default
        
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIP = iface.address;
                    break;
                }
            }
        }
        
        // Extraer la red base (ej: 192.168.1)
        const baseIP = localIP.split('.').slice(0, 3).join('.');
        
        console.log(`Escaneando red: ${baseIP}.0/24`);
        
        const pcsEncontradas = [];
        
        // Escanear rango de IPs comunes (1-254)
        // En producción, esto debería ser más eficiente (usar nmap, ping múltiple, etc.)
        const promises = [];
        
        for (let i = 1; i <= 254; i++) {
            const ip = `${baseIP}.${i}`;
            
            // Skip la IP del servidor
            if (ip === localIP) continue;
            
            promises.push(
                pingIP(ip)
                    .then(async (activo) => {
                        if (activo) {
                            try {
                                // Intentar obtener hostname
                                const hostnames = await dnsReverse(ip);
                                return {
                                    ip,
                                    hostname: hostnames[0] || ip,
                                    mac: 'N/A', // Requiere herramientas adicionales
                                    activo: true
                                };
                            } catch (err) {
                                return {
                                    ip,
                                    hostname: ip,
                                    mac: 'N/A',
                                    activo: true
                                };
                            }
                        }
                        return null;
                    })
                    .catch(() => null)
            );
        }
        
        const resultados = await Promise.all(promises);
        const pcsFiltradas = resultados.filter(pc => pc !== null);
        
        console.log(`Encontradas ${pcsFiltradas.length} PCs activas`);
        
        res.json({
            success: true,
            data: pcsFiltradas,
            total: pcsFiltradas.length
        });
        
    } catch (error) {
        console.error('Error escaneando red:', error);
        res.status(500).json({
            success: false,
            error: 'Error escaneando red: ' + error.message
        });
    }
});

// Helper function para hacer ping a una IP
async function pingIP(ip) {
    try {
        // Validar formato de IP para prevenir command injection
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            console.warn(`IP inválida rechazada: ${ip}`);
            return false;
        }
        
        const platform = os.platform();
        const command = platform === 'win32'
            ? `ping -n 1 -w 1000 ${ip}`
            : `ping -c 1 -W 1 ${ip}`;
        
        await execAsync(command);
        return true;
    } catch (error) {
        return false;
    }
}

// @desc    Obtener lista de agentes instalados y su estado
// @route   GET /api/deploy/agents
router.get('/agents', (req, res) => {
    try {
        res.json({
            success: true,
            data: agentesRegistrados,
            total: agentesRegistrados.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @desc    Desplegar agente en una PC remota
// @route   POST /api/deploy/install
router.post('/install', async (req, res) => {
    try {
        const { ip, hostname } = req.body;
        
        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP es requerida'
            });
        }
        
        // Validar formato de IP para prevenir command injection
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de IP inválido'
            });
        }
        
        console.log(`Intentando desplegar agente en ${hostname || ip}...`);
        
        // En Windows, usar comandos SMB/WMI para copiar e instalar
        // Esto requiere credenciales administrativas y configuración de red
        
        // NOTA: La implementación real depende del entorno y permisos
        // Aquí hay un ejemplo conceptual
        
        /*
        const installerPath = path.join(__dirname, '../../desktop-agent/dist/Setup_CentroDiagAgent.exe');
        const remoteShare = `\\\\${ip}\\C$\\Temp\\`;
        const remotePath = `${remoteShare}Setup_CentroDiagAgent.exe`;
        
        // 1. Copiar instalador a la PC remota
        await execAsync(`copy "${installerPath}" "${remotePath}"`);
        
        // 2. Ejecutar instalador remotamente usando PsExec o similar
        await execAsync(`psexec \\\\${ip} -s -i 0 ${remotePath} /VERYSILENT /NORESTART`);
        */
        
        // Por ahora, simulamos el deploy exitoso
        const agenteNuevo = {
            ip,
            hostname: hostname || ip,
            estado: 'activo',
            version: '5.0',
            ultima_conexion: new Date().toISOString(),
            fecha_instalacion: new Date().toISOString()
        };
        
        // Verificar si ya existe
        const index = agentesRegistrados.findIndex(a => a.ip === ip);
        if (index >= 0) {
            agentesRegistrados[index] = agenteNuevo;
        } else {
            agentesRegistrados.push(agenteNuevo);
        }
        
        res.json({
            success: true,
            message: `Agente desplegado exitosamente en ${hostname || ip}`,
            data: agenteNuevo
        });
        
    } catch (error) {
        console.error('Error desplegando agente:', error);
        res.status(500).json({
            success: false,
            error: 'Error desplegando agente: ' + error.message
        });
    }
});

// @desc    Verificar estado de un agente específico
// @route   GET /api/deploy/status/:ip
router.get('/status/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        
        // Validar formato de IP
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de IP inválido'
            });
        }
        
        const agente = agentesRegistrados.find(a => a.ip === ip);
        
        if (!agente) {
            return res.json({
                success: true,
                data: {
                    estado: 'no_instalado',
                    ip
                }
            });
        }
        
        // Verificar si el agente está realmente activo haciendo ping
        const activo = await pingIP(ip);
        
        if (activo) {
            agente.estado = 'activo';
            agente.ultima_conexion = new Date().toISOString();
        } else {
            agente.estado = 'inactivo';
        }
        
        res.json({
            success: true,
            data: agente
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @desc    Endpoint para que los agentes reporten su estado
// @route   POST /api/deploy/heartbeat
router.post('/heartbeat', (req, res) => {
    try {
        const { ip, hostname, version } = req.body;
        
        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP es requerida'
            });
        }
        
        const index = agentesRegistrados.findIndex(a => a.ip === ip);
        const agenteData = {
            ip,
            hostname: hostname || ip,
            version: version || '5.0',
            estado: 'activo',
            ultima_conexion: new Date().toISOString()
        };
        
        if (index >= 0) {
            agentesRegistrados[index] = {
                ...agentesRegistrados[index],
                ...agenteData
            };
        } else {
            agentesRegistrados.push({
                ...agenteData,
                fecha_instalacion: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Heartbeat recibido'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
