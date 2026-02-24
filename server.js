const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const os = require('os');

// Cargar variables de entorno
dotenv.config();

// Importar conexión DB
const connectDB = require('./config/db');

// Importar middleware de errores
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Inicializar Express
const app = express();
app.set('trust proxy', 1);

const getLocalIps = () => {
    const interfaces = os.networkInterfaces();
    const ips = [];
    Object.values(interfaces).forEach((ifaces) => {
        (ifaces || []).forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
        });
    });
    return [...new Set(ips)];
};

const parseCorsOrigins = () => {
    if (!process.env.CORS_ORIGINS) {
        return [
            'http://localhost:3000',
            'http://localhost:5000',
            process.env.FRONTEND_URL
        ].filter(Boolean);
    }

    return process.env.CORS_ORIGINS
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
};

const corsOrigins = parseCorsOrigins();

// ==========================================
// MIDDLEWARE DE SEGURIDAD
// ==========================================

// Helmet - headers de seguridad
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
}));

// Rate limiting - prevenir ataques de fuerza bruta
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta IP. Intente en 15 minutos.'
    }
});
app.use('/api/', limiter);

// Rate limit estricto para login (previene fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 20),
    message: {
        success: false,
        message: 'Demasiados intentos de login. Intente en 15 minutos.'
    }
});
app.use('/api/auth/login', loginLimiter);

// ==========================================
// MIDDLEWARE GENERAL
// ==========================================

app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/imagenes', express.static(path.join(__dirname, 'uploads', 'imagenes')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==========================================
// RUTAS DE LA API
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Centro Diagnóstico - API funcionando',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        host: process.env.HOST || '0.0.0.0',
        port: Number(process.env.PORT || 5000),
        public_url: process.env.PUBLIC_API_URL || null,
        local_ips: getLocalIps(),
        cors_origins: corsOrigins
    });
});

// Rutas principales
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/ordenes', require('./routes/citas'));
app.use('/api/estudios', require('./routes/estudios'));
app.use('/api/resultados', require('./routes/resultados'));
app.use('/api/facturas', require('./routes/facturas'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reportes', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/sucursales', require('./routes/sucursales'));
app.use('/api/caja', require('./routes/turnosCaja'));
app.use('/api/equipos', require('./routes/equipoRoutes'));
app.use('/api/barcodes', require('./routes/poolBarcodes'));
app.use('/api/contabilidad', require('./routes/contabilidad'));
app.use('/api/configuracion', require('./routes/configuracion'));
app.use('/api/deploy', require('./routes/deploy'));
app.use('/api/downloads', require('./routes/downloads')); // No requiere autenticación
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/imagenologia', require('./routes/imagenologia'));
app.use('/api/orthanc', require('./routes/orthanc')); // Proxy DICOM
app.use("/verificar", require("./routes/verificar"));

// Visor de imágenes médicas (acceso directo por URL)
app.get('/visor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'visor-imagenes.html'));
});

// ==========================================
// SERVIR FRONTEND (React build)
// ==========================================

const frontendBuild = path.join(__dirname, 'frontend', 'build');
const fs = require('fs');

if (fs.existsSync(frontendBuild)) {
    app.use(express.static(frontendBuild));

    app.get('*', (req, res) => {
        if (!req.originalUrl.startsWith('/api')) {
            res.sendFile(path.join(frontendBuild, 'index.html'));
        }
    });
}

// ==========================================
// MANEJO DE ERRORES
// ==========================================

app.use(notFound);
app.use(errorHandler);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, HOST, () => {
            const ips = getLocalIps();
            console.log('');
            console.log('+---------------------------------------------------+');
            console.log('¦  Centro Diagnóstico - API Server                 ¦');
            console.log(`¦  Host/Puerto: ${HOST}:${PORT}`);
            if (process.env.PUBLIC_API_URL) {
                console.log(`¦  Public API: ${process.env.PUBLIC_API_URL}`);
            }
            console.log(`¦  Local IPs: ${ips.join(', ') || 'N/A'}`);
            console.log(`¦  CORS: ${corsOrigins.join(', ') || 'N/A'}`);
            console.log('+---------------------------------------------------+');
            console.log('');
        });

        // Iniciar servicio de equipos después de que el servidor esté activo
        const equipoService = require('./services/equipoService');
        setTimeout(() => {
            equipoService.iniciarTodos()
                .then(() => console.log('✅ Servicio de equipos iniciado'))
                .catch(err => console.error('⚠️ Error iniciando equipos:', err.message));
        }, 3000);

        // Iniciar polling de Orthanc para sincronizar imágenes DICOM
        const orthancService = require('./services/orthancService');
        setTimeout(() => {
            console.log('🔄 Iniciando sincronización en background con Servidor Orthanc...');
            setInterval(() => {
                orthancService.sincronizarImagenesListas().catch(e => console.error(e));
            }, 30000); // Polling cada 30 segundos
        }, 5000);

        // Graceful shutdown
        const shutdown = (signal) => {
            console.log(`${signal} recibido. Cerrando servidor...`);
            server.close(() => {
                console.log('Servidor HTTP cerrado.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('Error fatal al iniciar:', error.message);
        process.exit(1);
    }
};

startServer();

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err.message);
    if (err.stack) console.error(err.stack);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});

module.exports = app;
