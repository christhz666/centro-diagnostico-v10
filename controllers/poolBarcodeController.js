const PoolBarcode = require('../models/PoolBarcode');
const Sucursal = require('../models/Sucursal');
const bwipjs = require('bwip-js');

// Helper interno para crear pools para una Sucursal (por el Servidor de Mongo)
const crearPoolParaSucursal = async (sucursalId, tipo = 'FACTURA', cantidad = 100000) => {
    // Buscar la sucursal para armar prefijos
    const sucursal = await Sucursal.findById(sucursalId);
    if (!sucursal) throw new Error("Sucursal no encontrada");

    // Buscar si ya existe un pool anterior de este tipo para continuar el indice
    const ultimoPool = await PoolBarcode.findOne({ sucursal: sucursalId, tipo: tipo }).sort({ _id: -1 });

    let inicio = 1;
    let loteIdx = 1;
    if (ultimoPool) {
        inicio = ultimoPool.rangoFin + 1;
        loteIdx = parseInt(ultimoPool.loteId.split('-').pop()) + 1;
    }

    const prefijoLote = tipo === 'FACTURA' ? 'FAC' : (tipo === 'RESULTADO_LAB' ? 'LAB' : 'CIT');
    const loteStr = String(loteIdx).padStart(3, '0');

    // El prefijo unico por sucursal, ej: FAC-PIA-
    const prefijoID = `${prefijoLote}-${sucursal.codigo.toUpperCase()}-`;

    const nuevoPool = new PoolBarcode({
        sucursal: sucursalId,
        tipo: tipo,
        loteId: `LOTE-${sucursal.codigo.toUpperCase()}-${prefijoLote}-${loteStr}`,
        prefijo: prefijoID,
        rangoInicio: inicio,
        rangoFin: inicio + cantidad - 1,
        cantidadTotal: cantidad,
        ultimoUsado: inicio - 1
    });

    await nuevoPool.save();
    return nuevoPool;
};


// 1. Endpoint API (Offline/Rust Local) para Solicitar un Pool para Descarga
exports.syncGetPoolOffline = async (req, res) => {
    try {
        const { sucursalId, tipo } = req.params;
        const tipoBuscado = tipo.toUpperCase();

        // Si es la request desde Rust (App Nativa), buscar el primer pool activo
        let poolActivo = await PoolBarcode.findOne({ sucursal: sucursalId, tipo: tipoBuscado, agotado: false }).sort({ _id: 1 });

        // Si curiosamente la sucursal vació su piscina, le generamos uno nuevo al vuelo de 50k
        if (!poolActivo) {
            poolActivo = await crearPoolParaSucursal(sucursalId, tipoBuscado, 50000);
        }

        // Marcar Fecha Descargado del Rust
        if (!poolActivo.descargadoEn) {
            poolActivo.descargadoEn = new Date();
            await poolActivo.save();
        }

        res.json({
            success: true,
            pool: {
                loteId: poolActivo.loteId,
                prefijo: poolActivo.prefijo,
                rangoInicio: poolActivo.rangoInicio,
                rangoFin: poolActivo.rangoFin,
                ultimoSincronizadoEnNube: poolActivo.ultimoUsado // Rust empezará a usar desde aquí
            }
        });
    } catch (error) {
        console.error("Error Sirviendo Pool Offline:", error);
        res.status(500).json({ success: false, message: 'Error de Servidor descargando lote numérico.' });
    }
};


// 2. Endpoint API (Offline/Rust Local) Sincronizar el "Uso" del Pool (Se gastaron N codigos Offline)
exports.syncUpdatePoolUso = async (req, res) => {
    try {
        const { loteId, ultimoIdUsado } = req.body;

        const pool = await PoolBarcode.findOne({ loteId });
        if (!pool) return res.status(404).json({ success: false, message: 'Lote Numérico no existe' });

        // Extraer el numero que dice Rust
        // Ejemplo si Rust uso FAC-PIA-000005, el ultimo usado es 5. O bien Rust pasa directo el numero.
        const numeroUsado = parseInt(ultimoIdUsado);

        if (numeroUsado > pool.ultimoUsado) {
            pool.ultimoUsado = numeroUsado;

            // Si el cliente offline ya pisó la linea final de la piscina, declararla muerta
            if (pool.ultimoUsado >= pool.rangoFin) {
                pool.agotado = true;
            }
            await pool.save();
        }

        res.json({ success: true, poolStatus: pool.agotado ? 'AGOTADO' : 'ACTIVO' });
    } catch (error) {
        console.error("Error Actualizando Pool Usage:", error);
        res.status(500).json({ success: false, message: 'Error de servidor auditar lote numérico.' });
    }
};


// 3. Endpoint API (Renderizar un Código de Barras Real en la Web/PDF Thermal) - USO EXCLUSIVAMENTE VISUAL
// Ej: GET /api/barcode/generate?text=FAC-PIA-000005
exports.generarBarcodeImagen = (req, res) => {
    const text = req.query.text;
    if (!text) return res.status(400).send('Texto de Barcode requerido');

    bwipjs.toBuffer({
        bcid: 'code128',       // El tipo de Código Estandar Clínico
        text: text,            // FAC-PIA-001
        scale: 3,               // Escala de multiplicador
        height: 10,              // Altura milimétrica
        includetext: true,            // Imprimir el string legible abajo
        textxalign: 'center',        // Centro
    }, function (err, png) {
        if (err) {
            console.error("Error en Barcode BWIP:", err);
            return res.status(500).send(err.message);
        }
        res.set('Content-Type', 'image/png');
        res.send(png);
    });
};

// Modulo para control Admins - Ver el Dashboard de Códigos Disponibles de cada Local
exports.getDashboardPools = async (req, res) => {
    try {
        const pools = await PoolBarcode.find().populate('sucursal', 'nombre codigo').sort({ createdAt: -1 });
        res.json({ success: true, pools });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error Obteniendo Dashboard Pools' });
    }
};
