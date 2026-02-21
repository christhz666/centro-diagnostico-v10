const express = require('express');
const router = express.Router();
const equipoController = require('../controllers/equipoController');

console.log('? Cargando rutas de equipos...');

// GET - Listar equipos
router.get('/', equipoController.getEquipos);
router.get('/estados', equipoController.getEstadoConexiones);

// GET - Últimos resultados recibidos de equipos (para el dashboard LIS)
router.get('/resultados-recientes', async (req, res) => {
  try {
    const Resultado = require('../models/Resultado');
    const equipoService = require('../services/equipoService');

    const resultados = await Resultado.find({
      observaciones: { $regex: /Recibido/i }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('paciente', 'nombre apellido cedula')
      .populate('factura', 'numero codigoLIS')
      .populate('estudio', 'nombre');

    const data = resultados.map(r => ({
      id: r._id,
      equipo: (r.observaciones || '').replace(/Recibido (automáticamente )?desde /, '').split(' (')[0].split(' -')[0],
      paciente: r.paciente ? `${r.paciente.nombre} ${r.paciente.apellido}` : '—',
      codigoLIS: r.factura?.codigoLIS || null,
      facturaNumero: r.factura?.numero || null,
      parametros: r.valores?.length || 0,
      estado: r.estado,
      fecha: r.createdAt
    }));

    res.json({
      success: true,
      data,
      colaPendiente: equipoService.colas ? equipoService.colas.size : 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST - Reprocesar cola de resultados pendientes
router.post('/procesar-cola', async (req, res) => {
  try {
    const equipoService = require('../services/equipoService');
    const tamañoAntes = equipoService.colas ? equipoService.colas.size : 0;
    await equipoService.procesarCola();
    const tamañoDespues = equipoService.colas ? equipoService.colas.size : 0;

    res.json({
      success: true,
      message: `Cola procesada. ${tamañoAntes - tamañoDespues} resultado(s) vinculados. ${tamañoDespues} pendiente(s) restantes.`,
      procesados: tamañoAntes - tamañoDespues,
      pendientes: tamañoDespues
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST - Recibir imagen desde agente de rayos X
router.post('/recibir-imagen', async (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  const uploadDir = path.join(__dirname, '..', 'uploads', 'dicom');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ts = Date.now();
      cb(null, `${ts}_${file.originalname}`);
    }
  });

  const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).single('archivo');

  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió archivo' });

    try {
      const Factura = require('../models/Factura');
      const Resultado = require('../models/Resultado');
      const Cita = require('../models/Cita');
      const Estudio = require('../models/Estudio');

      const codigoLIS = req.body.codigoLIS;
      const stationName = req.body.station_name || 'Agente Rayos X';
      const tipo = req.body.tipo || 'imagen';

      let pacienteId = null;
      let facturaId = null;
      let citaId = null;

      // Buscar factura por codigoLIS
      if (codigoLIS) {
        const factura = await Factura.findOne({ codigoLIS: parseInt(codigoLIS) }).populate('paciente');
        if (factura && factura.paciente) {
          pacienteId = factura.paciente._id;
          facturaId = factura._id;
          citaId = factura.cita;
          console.log(`🔗 Imagen vinculada por LIS ${codigoLIS} → ${factura.paciente.nombre}`);
        }
      }

      // Buscar estudio de imagenología
      let estudio = await Estudio.findOne({ categoria: { $in: ['Imagenología', 'Rayos X', 'CR'] } });
      if (!estudio) {
        estudio = await Estudio.create({
          nombre: 'Rayos X General',
          codigo: 'AUTO-RX',
          categoria: 'Rayos X',
          precio: 0
        });
      }

      const archivoUrl = `/uploads/dicom/${req.file.filename}`;

      // Crear resultado si tenemos paciente
      let resultadoId = null;
      if (pacienteId) {
        if (!citaId) {
          const cita = await Cita.findOne({ paciente: pacienteId }).sort({ createdAt: -1 });
          citaId = cita ? cita._id : null;
        }

        if (!citaId) {
          const ahora = new Date();
          const nuevaCita = await Cita.create({
            paciente: pacienteId, fecha: ahora,
            horaInicio: ahora.toTimeString().slice(0, 5),
            estudios: [{ estudio: estudio._id, precio: 0 }],
            estado: 'completada', motivo: `Auto - ${stationName}`
          });
          citaId = nuevaCita._id;
        }

        const resultado = await Resultado.create({
          paciente: pacienteId,
          cita: citaId,
          factura: facturaId,
          estudio: estudio._id,
          archivos: [{ nombre: req.file.originalname, url: archivoUrl, tipo: tipo, tamaño: req.file.size }],
          estado: 'en_proceso',
          observaciones: `Imagen recibida desde ${stationName}${codigoLIS ? ` (LIS: ${codigoLIS})` : ''}`
        });
        resultadoId = resultado._id;
      }

      res.json({
        success: true,
        message: `Imagen recibida: ${req.file.originalname}`,
        data: {
          archivo: archivoUrl,
          tamaño: req.file.size,
          codigoLIS: codigoLIS || null,
          resultadoId,
          pacienteVinculado: !!pacienteId
        }
      });
    } catch (error) {
      console.error('Error procesando imagen:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// CRUD
router.post('/', equipoController.createEquipo);
router.put('/:id', equipoController.updateEquipo);
router.delete('/:id', equipoController.deleteEquipo);

// Conexiones
router.post('/:id/conectar', equipoController.conectarEquipo);
router.post('/:id/desconectar', equipoController.desconectarEquipo);
router.post('/:id/probar', equipoController.probarConexion);

// ? SIMULACIÓN DE RESULTADO
router.post('/:id/simular-resultado', async (req, res) => {
  console.log('?? Simulación de resultado iniciada');

  const Equipo = require('../models/Equipo');
  const Resultado = require('../models/Resultado');
  const Paciente = require('../models/Paciente');
  const Estudio = require('../models/Estudio');
  const Cita = require('../models/Cita');

  try {
    // 1. Buscar equipo
    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    console.log('? Equipo:', equipo.nombre);

    // 2. Buscar paciente
    const paciente = await Paciente.findOne({ cedula: req.body.cedula });
    if (!paciente) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado con cédula: ' + req.body.cedula });
    }
    console.log('? Paciente:', paciente.nombre);

    // 3. Buscar estudio
    const estudio = await Estudio.findOne();
    if (!estudio) {
      return res.status(404).json({ success: false, message: 'No hay estudios registrados' });
    }
    console.log('? Estudio:', estudio.nombre);

    // 4. Buscar o crear cita
    let cita = await Cita.findOne({
      paciente: paciente._id,
      estado: { $in: ['confirmada', 'completada'] }
    });

    if (!cita) {
      console.log('?? Creando cita automática...');
      const ahora = new Date();
      cita = await Cita.create({
        paciente: paciente._id,
        fecha: ahora,
        hora: ahora.toTimeString().slice(0, 5),
        horaInicio: ahora.toTimeString().slice(0, 5), // ? Campo requerido
        estudios: [{
          estudio: estudio._id, // ? Estructura correcta
          precio: estudio.precio || 0,
          estado: 'completado'
        }],
        estado: 'completada',
        motivo: 'Resultado automático - ' + equipo.nombre,
        tipoConsulta: 'laboratorio'
      });
      console.log('? Cita creada');
    } else {
      console.log('? Cita existente encontrada');
    }

    // 5. Generar valores según tipo de equipo
    let valores = [];

    if (equipo.tipo === 'hematologia') {
      valores = [
        {
          parametro: 'Leucocitos (WBC)',
          valor: (Math.random() * 5 + 5).toFixed(1),
          unidad: '10³/µL',
          valorReferencia: '4.0-10.0',
          estado: 'normal'
        },
        {
          parametro: 'Eritrocitos (RBC)',
          valor: (Math.random() * 1 + 4.5).toFixed(1),
          unidad: '106/µL',
          valorReferencia: '4.5-5.5',
          estado: 'normal'
        },
        {
          parametro: 'Hemoglobina (HGB)',
          valor: (Math.random() * 3 + 13).toFixed(1),
          unidad: 'g/dL',
          valorReferencia: '13.0-17.0',
          estado: 'normal'
        },
        {
          parametro: 'Plaquetas (PLT)',
          valor: (Math.random() * 200 + 200).toFixed(0),
          unidad: '10³/µL',
          valorReferencia: '150-400',
          estado: 'normal'
        }
      ];
    } else if (equipo.tipo === 'quimica') {
      valores = [
        { parametro: 'Glucosa', valor: (Math.random() * 20 + 80).toFixed(0), unidad: 'mg/dL', valorReferencia: '70-100', estado: 'normal' },
        { parametro: 'Urea', valor: (Math.random() * 15 + 20).toFixed(0), unidad: 'mg/dL', valorReferencia: '15-40', estado: 'normal' },
        { parametro: 'Creatinina', valor: (Math.random() * 0.5 + 0.7).toFixed(1), unidad: 'mg/dL', valorReferencia: '0.6-1.2', estado: 'normal' }
      ];
    } else {
      valores = [
        { parametro: 'Parámetro Test', valor: (Math.random() * 100).toFixed(1), unidad: 'U/L', valorReferencia: 'Normal', estado: 'normal' }
      ];
    }

    console.log('? Valores generados:', valores.length);

    // 6. Crear resultado
    const resultado = await Resultado.create({
      paciente: paciente._id,
      cita: cita._id,
      estudio: estudio._id,
      valores,
      estado: 'en_proceso',
      observaciones: `Resultado automático de ${equipo.nombre} - ${new Date().toLocaleString('es-DO')}`
    });

    console.log('? Resultado creado:', resultado._id);

    // 7. Actualizar estadísticas del equipo
    await Equipo.findByIdAndUpdate(equipo._id, {
      ultimaConexion: new Date(),
      $inc: { 'estadisticas.resultadosRecibidos': 1 },
      'estadisticas.ultimoResultado': new Date()
    });

    res.json({
      success: true,
      message: `? Resultado creado exitosamente desde ${equipo.nombre}`,
      data: {
        resultadoId: resultado._id,
        paciente: `${paciente.nombre} ${paciente.apellido}`,
        cedula: paciente.cedula,
        equipo: equipo.nombre,
        valores: valores.length,
        estado: 'en_proceso'
      }
    });

  } catch (error) {
    console.error('? Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      details: error.toString()
    });
  }
});

// GET individual - debe ir AL FINAL
router.get('/:id', equipoController.getEquipo);

// -----------------------------------------------------------
// ?? RECEPCIÓN DESDE AGENTE REMOTO
// -----------------------------------------------------------

// Endpoint genérico para agentes remotos (sin requerir equipment ID)
router.post('/recibir-json', async (req, res) => {
  console.log('?? Recibiendo resultado desde agente remoto (genérico)');
  console.log('Datos:', JSON.stringify(req.body, null, 2));

  try {
    const Resultado = require('../models/Resultado');
    const Paciente = require('../models/Paciente');
    const Estudio = require('../models/Estudio');
    const Cita = require('../models/Cita');

    const {
      station_name,
      equipment_type,
      equipment_name,
      cedula,
      paciente_id,
      orden_id,
      tipo_estudio,
      valores,
      timestamp
    } = req.body;

    // Buscar paciente por cédula o ID
    let paciente;
    if (cedula) {
      paciente = await Paciente.findOne({ cedula });
    } else if (paciente_id) {
      paciente = await Paciente.findById(paciente_id).catch(() => null);
      if (!paciente) {
        paciente = await Paciente.findOne({ cedula: paciente_id });
      }
    }

    if (!paciente) {
      console.log('? Paciente no encontrado:', cedula || paciente_id);
      return res.status(404).json({
        success: false,
        message: `Paciente no encontrado`
      });
    }

    console.log('? Paciente encontrado:', paciente.nombre, paciente.apellido);

    // Buscar estudio por tipo
    let estudio = await Estudio.findOne({
      $or: [
        { codigo: { $regex: tipo_estudio, $options: 'i' } },
        { nombre: { $regex: tipo_estudio, $options: 'i' } },
        { categoria: { $regex: equipment_type, $options: 'i' } }
      ]
    });

    if (!estudio) {
      // Mapear equipment_type a categorías válidas del schema
      const catMap = {
        'hematologia': 'Laboratorio Clínico',
        'quimica': 'Laboratorio Clínico',
        'orina': 'Laboratorio Clínico',
        'coagulacion': 'Laboratorio Clínico',
        'inmunologia': 'Laboratorio Clínico',
        'microbiologia': 'Laboratorio Clínico',
        'radiologia': 'Imagenología',
        'rayos_x': 'Rayos X',
        'sonografia': 'Sonografía',
        'tomografia': 'Tomografía',
        'resonancia': 'Resonancia'
      };
      const catValida = catMap[(equipment_type || '').toLowerCase()] || 'Laboratorio Clínico';

      estudio = await Estudio.create({
        nombre: `${equipment_type} - ${equipment_name}`,
        codigo: `AUTO-${(equipment_type || 'LIS').toUpperCase().replace(/\s+/g, '-')}`,
        categoria: catValida,
        precio: 0
      });
      console.log('🆕 Estudio creado automáticamente:', estudio.nombre, '→', catValida);
    }

    // Buscar cita reciente del paciente
    let cita = await Cita.findOne({
      paciente: paciente._id,
      estado: { $in: ['completada', 'en_proceso', 'programada'] }
    }).sort({ createdAt: -1 });

    if (!cita) {
      const ahora = new Date();
      cita = await Cita.create({
        paciente: paciente._id,
        fecha: ahora,
        hora: ahora.toTimeString().slice(0, 5),
        horaInicio: ahora.toTimeString().slice(0, 5),
        estudios: [{
          estudio: estudio._id,
          precio: 0,
          estado: 'completado'
        }],
        estado: 'completada',
        motivo: `Auto - ${equipment_name}`
      });
      console.log('? Cita creada automáticamente');
    }

    // Convertir valores al formato interno
    const valoresFormateados = [];
    if (valores && typeof valores === 'object') {
      for (const [key, value] of Object.entries(valores)) {
        if (typeof value === 'object' && value !== null) {
          valoresFormateados.push({
            parametro: key,
            valor: String(value.valor || ''),
            unidad: value.unidad || '',
            valorReferencia: value.referencia || '',
            estado: value.estado || 'normal'
          });
        } else {
          valoresFormateados.push({
            parametro: key,
            valor: String(value),
            unidad: '',
            valorReferencia: '',
            estado: 'normal'
          });
        }
      }
    }

    console.log('? Valores formateados:', valoresFormateados.length);

    // Crear resultado (codigoMuestra se auto-genera en el pre-validate hook)
    const resultado = await Resultado.create({
      paciente: paciente._id,
      cita: cita._id,
      estudio: estudio._id,
      valores: valoresFormateados,
      estado: 'en_proceso',
      observaciones: `Recibido desde ${equipment_name} (${station_name}) - ${timestamp || new Date().toISOString()}`
    });

    console.log('? Resultado creado:', resultado._id);
    console.log('? Código de muestra:', resultado.codigoMuestra);

    res.json({
      success: true,
      message: `Resultado recibido desde ${equipment_name}`,
      data: {
        resultadoId: resultado._id,
        codigoMuestra: resultado.codigoMuestra,
        paciente: `${paciente.nombre} ${paciente.apellido}`,
        valores: valoresFormateados.length
      },
      // Devolver también en el nivel superior para compatibilidad
      codigoMuestra: resultado.codigoMuestra
    });

  } catch (error) {
    console.error('? Error procesando resultado:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/:id/recibir-resultado', async (req, res) => {
  console.log('?? Recibiendo resultado desde agente remoto');
  console.log('Equipo ID:', req.params.id);
  console.log('Datos:', JSON.stringify(req.body, null, 2));

  try {
    const Equipo = require('../models/Equipo');
    const Resultado = require('../models/Resultado');
    const Paciente = require('../models/Paciente');
    const Estudio = require('../models/Estudio');
    const Cita = require('../models/Cita');

    // Buscar equipo
    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) {
      console.log('? Equipo no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }

    console.log('? Equipo encontrado:', equipo.nombre);

    const { cedula, valores, timestamp } = req.body;

    // Buscar paciente
    const paciente = await Paciente.findOne({ cedula });
    if (!paciente) {
      console.log('? Paciente no encontrado:', cedula);
      return res.status(404).json({
        success: false,
        message: `Paciente con cédula ${cedula} no encontrado`
      });
    }

    console.log('? Paciente encontrado:', paciente.nombre, paciente.apellido);

    // Buscar o crear estudio
    let estudio = await Estudio.findOne();
    if (!estudio) {
      estudio = await Estudio.create({
        nombre: 'Examen General',
        codigo: 'GEN-001',
        categoria: 'Laboratorio Clínico',
        precio: 0
      });
    }

    // Buscar o crear cita
    let cita = await Cita.findOne({
      paciente: paciente._id,
      estado: 'completada'
    }).sort({ createdAt: -1 });

    if (!cita) {
      const ahora = new Date();
      cita = await Cita.create({
        paciente: paciente._id,
        fecha: ahora,
        hora: ahora.toTimeString().slice(0, 5),
        horaInicio: ahora.toTimeString().slice(0, 5),
        estudios: [{
          estudio: estudio._id,
          precio: 0,
          estado: 'completado'
        }],
        estado: 'completada',
        motivo: `Auto - ${equipo.nombre}`
      });
      console.log('? Cita creada automáticamente');
    }

    // Mapear valores recibidos a parámetros del sistema
    const valoresMapeados = valores.map(v => {
      // Buscar mapeo en el equipo
      const mapeo = equipo.mapeoParametros.find(m =>
        m.codigoEquipo === v.codigo ||
        v.codigo.includes(m.codigoEquipo)
      );

      return {
        parametro: mapeo?.nombreParametro || v.codigo,
        valor: v.valor,
        unidad: mapeo?.unidad || v.unidad || '',
        valorReferencia: mapeo?.valorReferencia || '',
        estado: v.estado === 'N' ? 'normal' :
          v.estado === 'H' ? 'alto' :
            v.estado === 'L' ? 'bajo' : 'normal'
      };
    });

    console.log('? Valores mapeados:', valoresMapeados.length);

    // Crear resultado
    const resultado = await Resultado.create({
      paciente: paciente._id,
      cita: cita._id,
      estudio: estudio._id,
      valores: valoresMapeados,
      estado: 'en_proceso',
      observaciones: `Recibido desde ${equipo.nombre} - Agente remoto - ${timestamp || new Date().toISOString()}`
    });

    console.log('? Resultado creado:', resultado._id);

    // Actualizar estadísticas del equipo
    await Equipo.findByIdAndUpdate(equipo._id, {
      ultimaConexion: new Date(),
      $inc: { 'estadisticas.resultadosRecibidos': 1 }
    });

    res.json({
      success: true,
      message: `Resultado recibido desde ${equipo.nombre}`,
      data: {
        resultadoId: resultado._id,
        codigoMuestra: resultado.codigoMuestra,
        paciente: `${paciente.nombre} ${paciente.apellido}`,
        valores: valoresMapeados.length
      },
      codigoMuestra: resultado.codigoMuestra
    });

  } catch (error) {
    console.error('? Error procesando resultado:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
