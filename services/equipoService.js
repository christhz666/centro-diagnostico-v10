const Equipo = require('../models/Equipo');
const Resultado = require('../models/Resultado');
const EventEmitter = require('events');
const net = require('net');
const fs = require('fs');
const path = require('path');

class EquipoService extends EventEmitter {
  constructor() {
    super();
    this.conexiones = new Map();
    this.colas = new Map();
  }

  // Iniciar monitoreo de todos los equipos activos
  async iniciarTodos() {
    const equipos = await Equipo.find({ estado: 'activo' });
    console.log(`🏥 Iniciando ${equipos.length} equipos...`);

    for (const equipo of equipos) {
      try {
        await this.iniciarEquipo(equipo._id);
      } catch (err) {
        console.error(`⚠️ Error iniciando equipo ${equipo.nombre}:`, err.message);
      }
    }
  }

  // Iniciar comunicación con un equipo específico
  async iniciarEquipo(equipoId) {
    const equipo = await Equipo.findById(equipoId);
    if (!equipo) throw new Error('Equipo no encontrado');

    console.log(`🔌 Conectando a ${equipo.nombre} (${equipo.protocolo})...`);

    switch (equipo.protocolo) {
      case 'ASTM':
        return this.iniciarASTM(equipo);
      case 'HL7':
        return this.iniciarHL7(equipo);
      case 'SERIAL':
        return this.iniciarSerial(equipo);
      case 'TCP':
        return this.iniciarTCP(equipo);
      case 'FILE':
        return this.iniciarFile(equipo);
      default:
        throw new Error(`Protocolo ${equipo.protocolo} no soportado`);
    }
  }

  // Protocolo ASTM (Mindray BS-200, BC-6800)
  async iniciarASTM(equipo) {
    console.log(`✅ ASTM iniciado para ${equipo.nombre}`);

    this.conexiones.set(equipo._id.toString(), {
      equipo,
      protocolo: 'ASTM',
      estado: 'conectado',
      procesarDatos: (datos) => this.procesarASTM(equipo, datos)
    });

    return true;
  }

  // Procesar mensaje ASTM
  async procesarASTM(equipo, mensaje) {
    const lineas = mensaje.split('\n');
    let pacienteId = null;
    let resultados = [];

    for (const linea of lineas) {
      const campos = linea.split('|');
      const tipo = campos[0];

      switch (tipo) {
        case 'H':
          console.log('📡 Recibiendo transmisión ASTM...');
          break;

        case 'P':
          pacienteId = campos[2];
          break;

        case 'R':
          const codigoTest = campos[2]?.split('^')[3] || campos[2];
          const valor = campos[3];
          const unidad = campos[4];
          const estado = campos[8];

          resultados.push({
            codigoEquipo: codigoTest,
            valor,
            unidad,
            estado: estado === 'N' ? 'normal' : estado === 'H' ? 'alto' : 'bajo'
          });
          break;
      }
    }

    if (resultados.length > 0) {
      await this.guardarResultados(equipo, pacienteId, null, resultados);
    }

    return resultados;
  }

  // Protocolo HL7 v2.x (Siemens, Abbott, Roche, Beckman Coulter)
  async iniciarHL7(equipo) {
    const config = equipo.configuracion || {};
    const port = config.puertoTcp || 2575;
    const host = config.ip || '0.0.0.0';

    const server = net.createServer((socket) => {
      let buffer = '';
      console.log(`📡 HL7 conexión desde ${socket.remoteAddress} para ${equipo.nombre}`);

      socket.on('data', (data) => {
        buffer += data.toString();
        // HL7 messages delimited by \x0B (VT) start and \x1C\x0D (FS+CR) end
        const startChar = '\x0B';
        const endChars = '\x1C\x0D';
        let startIdx = buffer.indexOf(startChar);
        let endIdx = buffer.indexOf(endChars);

        while (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const mensaje = buffer.substring(startIdx + 1, endIdx);
          buffer = buffer.substring(endIdx + 2);
          this.procesarHL7(equipo, mensaje).catch(err => {
            console.error(`❌ Error procesando HL7: ${err.message}`);
          });
          // Send ACK
          const ack = this.generarHL7ACK(mensaje);
          socket.write(`${startChar}${ack}${endChars}`);
          startIdx = buffer.indexOf(startChar);
          endIdx = buffer.indexOf(endChars);
        }
      });

      socket.on('error', (err) => {
        console.error(`❌ HL7 socket error (${equipo.nombre}):`, err.message);
      });
    });

    server.listen(port, host, () => {
      console.log(`✅ HL7 escuchando en ${host}:${port} para ${equipo.nombre}`);
    });

    server.on('error', (err) => {
      console.error(`❌ HL7 server error (${equipo.nombre}):`, err.message);
      this.actualizarEstadoEquipo(equipo._id, 'error', err.message);
    });

    this.conexiones.set(equipo._id.toString(), {
      equipo,
      protocolo: 'HL7',
      estado: 'conectado',
      server,
      procesarDatos: (datos) => this.procesarHL7(equipo, datos)
    });

    return true;
  }

  // Parse HL7 v2 message and extract results
  async procesarHL7(equipo, mensaje) {
    const segmentos = mensaje.split('\r');
    let pacienteId = null;
    let resultados = [];

    for (const segmento of segmentos) {
      const campos = segmento.split('|');
      const tipo = campos[0];

      switch (tipo) {
        case 'PID':
          // PID segment: patient ID in field 3
          pacienteId = campos[3]?.split('^')[0] || campos[3];
          break;

        case 'OBX':
          // OBX segment: observation result
          const codigoTest = campos[3]?.split('^')[0] || campos[3];
          const valor = campos[5];
          const unidad = campos[6];
          const refRange = campos[7];
          const abnFlag = campos[8];

          resultados.push({
            codigoEquipo: codigoTest,
            valor,
            unidad,
            valorReferencia: refRange,
            estado: abnFlag === 'N' ? 'normal' :
              abnFlag === 'H' || abnFlag === 'HH' ? 'alto' :
                abnFlag === 'L' || abnFlag === 'LL' ? 'bajo' : 'normal'
          });
          break;
      }
    }

    if (resultados.length > 0) {
      await this.guardarResultados(equipo, pacienteId, null, resultados);
    }

    return resultados;
  }

  // Generate HL7 ACK message
  generarHL7ACK(mensajeOriginal) {
    const segmentos = mensajeOriginal.split('\r');
    const msh = segmentos[0]?.split('|') || [];
    const msgId = msh[9] || '0';
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
    return `MSH|^~\\&|CENTRO_DIAG|LAB|${msh[3] || ''}|${msh[4] || ''}|${timestamp}||ACK|${msgId}|P|2.3\rMSA|AA|${msgId}\r`;
  }

  // Protocolo TCP genérico (equipos con conexión TCP/IP directa)
  async iniciarTCP(equipo) {
    const config = equipo.configuracion || {};
    const port = config.puertoTcp || 9100;
    const host = config.ip || '0.0.0.0';

    const server = net.createServer((socket) => {
      let buffer = '';
      console.log(`📡 TCP conexión desde ${socket.remoteAddress} para ${equipo.nombre}`);

      socket.on('data', (data) => {
        buffer += data.toString();
        // Process complete messages (newline delimited)
        const mensajes = buffer.split('\n');
        buffer = mensajes.pop() || '';

        for (const msg of mensajes) {
          if (msg.trim()) {
            this.procesarTCPData(equipo, msg.trim()).catch(err => {
              console.error(`❌ Error procesando TCP: ${err.message}`);
            });
          }
        }
      });

      socket.on('error', (err) => {
        console.error(`❌ TCP socket error (${equipo.nombre}):`, err.message);
      });
    });

    server.listen(port, host, () => {
      console.log(`✅ TCP escuchando en ${host}:${port} para ${equipo.nombre}`);
    });

    server.on('error', (err) => {
      console.error(`❌ TCP server error (${equipo.nombre}):`, err.message);
      this.actualizarEstadoEquipo(equipo._id, 'error', err.message);
    });

    this.conexiones.set(equipo._id.toString(), {
      equipo,
      protocolo: 'TCP',
      estado: 'conectado',
      server,
      procesarDatos: (datos) => this.procesarTCPData(equipo, datos)
    });

    return true;
  }

  // Process generic TCP data (try JSON first, then ASTM-like)
  async procesarTCPData(equipo, datos) {
    try {
      const parsed = JSON.parse(datos);
      if (parsed.cedula && parsed.valores) {
        await this.guardarResultados(equipo, parsed.cedula, null, parsed.valores.map(v => ({
          codigoEquipo: v.codigo || v.parametro,
          valor: v.valor,
          unidad: v.unidad || '',
          estado: v.estado || 'normal'
        })));
      }
    } catch {
      // Not JSON, try ASTM-like pipe-delimited
      await this.procesarASTM(equipo, datos);
    }
  }

  // Protocolo Serial (RS-232 / USB-Serial)
  async iniciarSerial(equipo) {
    const config = equipo.configuracion || {};
    const puerto = config.puerto || '/dev/ttyUSB0';

    try {
      // Dynamic import to avoid crash if serialport not available
      const { SerialPort } = require('serialport');
      const { ReadlineParser } = require('@serialport/parser-readline');

      const port = new SerialPort({
        path: puerto,
        baudRate: config.baudRate || 9600,
        dataBits: config.dataBits || 8,
        stopBits: config.stopBits || 1,
        parity: config.parity || 'none'
      });

      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      let buffer = '';

      parser.on('data', (line) => {
        buffer += line + '\n';
        // Check for end of transmission (ETX or L record in ASTM)
        if (line.startsWith('L|') || line.includes('\x03')) {
          this.procesarASTM(equipo, buffer).catch(err => {
            console.error(`❌ Error procesando Serial: ${err.message}`);
          });
          buffer = '';
        }
      });

      port.on('error', (err) => {
        console.error(`❌ Serial error (${equipo.nombre}):`, err.message);
        this.actualizarEstadoEquipo(equipo._id, 'error', err.message);
      });

      port.on('open', () => {
        console.log(`✅ Serial abierto ${puerto} para ${equipo.nombre}`);
      });

      this.conexiones.set(equipo._id.toString(), {
        equipo,
        protocolo: 'SERIAL',
        estado: 'conectado',
        port,
        procesarDatos: (datos) => this.procesarASTM(equipo, datos)
      });

      return true;
    } catch (err) {
      console.warn(`⚠️ SerialPort no disponible para ${equipo.nombre}: ${err.message}`);
      // Register connection in monitoring mode without actual serial
      this.conexiones.set(equipo._id.toString(), {
        equipo,
        protocolo: 'SERIAL',
        estado: 'sin_puerto',
        procesarDatos: (datos) => this.procesarASTM(equipo, datos)
      });
      return false;
    }
  }

  // Protocolo FILE (monitoreo de carpeta para archivos de resultados)
  async iniciarFile(equipo) {
    const config = equipo.configuracion || {};
    const rutaArchivos = config.rutaArchivos || path.join(__dirname, '../uploads/equipos', equipo._id.toString());

    // Ensure directory exists
    if (!fs.existsSync(rutaArchivos)) {
      fs.mkdirSync(rutaArchivos, { recursive: true });
    }

    const patron = config.patron || '*.txt';
    const procesados = new Set();

    const verificarArchivos = async () => {
      try {
        const archivos = fs.readdirSync(rutaArchivos);
        for (const archivo of archivos) {
          if (procesados.has(archivo)) continue;
          // Simple pattern matching
          const ext = patron.replaceAll('*', '');
          if (ext && !archivo.endsWith(ext)) continue;

          const rutaCompleta = path.join(rutaArchivos, archivo);
          const stat = fs.statSync(rutaCompleta);
          if (!stat.isFile()) continue;

          try {
            const contenido = fs.readFileSync(rutaCompleta, 'utf-8');
            procesados.add(archivo);
            console.log(`📄 Procesando archivo ${archivo} para ${equipo.nombre}`);

            // Try JSON format first
            try {
              const parsed = JSON.parse(contenido);
              if (parsed.cedula && parsed.valores) {
                await this.guardarResultados(equipo, parsed.cedula, null, parsed.valores.map(v => ({
                  codigoEquipo: v.codigo || v.parametro,
                  valor: v.valor,
                  unidad: v.unidad || '',
                  estado: v.estado || 'normal'
                })));
              }
            } catch {
              // Fallback to ASTM format
              await this.procesarASTM(equipo, contenido);
            }

            // Move processed file
            const procesadosDir = path.join(rutaArchivos, 'procesados');
            if (!fs.existsSync(procesadosDir)) {
              fs.mkdirSync(procesadosDir, { recursive: true });
            }
            fs.renameSync(rutaCompleta, path.join(procesadosDir, archivo));
          } catch (err) {
            console.error(`❌ Error procesando archivo ${archivo}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`❌ Error leyendo directorio ${rutaArchivos}:`, err.message);
      }
    };

    // Check for files every 10 seconds
    const intervalo = setInterval(verificarArchivos, 10000);
    verificarArchivos();

    console.log(`✅ FILE monitor iniciado en ${rutaArchivos} para ${equipo.nombre}`);

    this.conexiones.set(equipo._id.toString(), {
      equipo,
      protocolo: 'FILE',
      estado: 'conectado',
      intervalo,
      rutaArchivos,
      procesarDatos: (datos) => this.procesarASTM(equipo, datos)
    });

    return true;
  }

  // Helper: update equipment status in DB
  async actualizarEstadoEquipo(equipoId, estado, error) {
    const update = { estado };
    if (error) update.ultimoError = error;
    await Equipo.findByIdAndUpdate(equipoId, update);
  }

  // Enviar orden de trabajo a un equipo
  async enviarOrden(equipoId, ordenData) {
    const conexion = this.conexiones.get(equipoId.toString());
    if (!conexion) throw new Error('Equipo no conectado');

    const equipo = conexion.equipo;

    switch (conexion.protocolo) {
      case 'ASTM':
        return this.enviarOrdenASTM(equipo, conexion, ordenData);
      case 'HL7':
        return this.enviarOrdenHL7(equipo, conexion, ordenData);
      default:
        throw new Error(`Envío de órdenes no soportado para protocolo ${conexion.protocolo}`);
    }
  }

  // Format and send ASTM work order
  async enviarOrdenASTM(equipo, conexion, ordenData) {
    const mensaje = [
      `H|\\^&|||Centro Diagnóstico|||||||P|1|${new Date().toISOString()}`,
      `P|1|${ordenData.pacienteId}||${ordenData.pacienteNombre}`,
      ...ordenData.pruebas.map((p, i) => `O|${i + 1}|${ordenData.ordenId}||^^^${p.codigo}|R`),
      'L|1|N'
    ].join('\n');

    if (conexion.port && conexion.port.write) {
      conexion.port.write(mensaje + '\n');
    }

    return { enviado: true, mensaje };
  }

  // Format and send HL7 work order
  async enviarOrdenHL7(equipo, conexion, ordenData) {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
    const mensaje = [
      `MSH|^~\\&|CENTRO_DIAG|LAB|${equipo.nombre}|LAB|${timestamp}||ORM^O01|${Date.now()}|P|2.3`,
      `PID|1||${ordenData.pacienteId}||${ordenData.pacienteNombre}`,
      ...ordenData.pruebas.map((p, i) =>
        `OBR|${i + 1}|${ordenData.ordenId}||${p.codigo}^${p.nombre}|||${timestamp}`
      )
    ].join('\r');

    return { enviado: true, mensaje };
  }

  // Guardar resultados en la base de datos
  // pacienteId puede ser: codigoLIS (número), cédula, o ID de paciente
  async guardarResultados(equipo, pacienteId, ordenId, resultados) {
    try {
      const Paciente = require('../models/Paciente');
      const Factura = require('../models/Factura');
      const Cita = require('../models/Cita');
      const Estudio = require('../models/Estudio');

      let paciente = null;
      let facturaVinculada = null;
      let cita = null;
      let estudio = null;

      // ── ESTRATEGIA 1: Buscar por codigoLIS en Facturas ──────────────
      // Las máquinas envían el ID de muestra corto (codigoLIS) que el
      // bioanalista teclea al procesar la muestra.
      const codigoNumerico = parseInt(pacienteId, 10);
      if (!isNaN(codigoNumerico) && codigoNumerico >= 1000 && codigoNumerico <= 99999) {
        facturaVinculada = await Factura.findOne({ codigoLIS: codigoNumerico })
          .populate('paciente')
          .populate('cita');

        if (facturaVinculada && facturaVinculada.paciente) {
          paciente = facturaVinculada.paciente;
          cita = facturaVinculada.cita || null;
          console.log(`🔗 Resultado vinculado por codigoLIS ${codigoNumerico} → Paciente: ${paciente.nombre} ${paciente.apellido} → Factura: ${facturaVinculada.numero}`);
        }
      }

      // ── ESTRATEGIA 2: Buscar por cédula (fallback) ──────────────────
      if (!paciente && pacienteId) {
        paciente = await Paciente.findOne({ cedula: pacienteId });
        if (paciente) {
          console.log(`🔗 Resultado vinculado por cédula ${pacienteId} → Paciente: ${paciente.nombre} ${paciente.apellido}`);
        }
      }

      // ── Sin paciente encontrado: encolar para procesamiento posterior ─
      if (!paciente) {
        console.warn(`⚠️ Paciente no encontrado con identificador: ${pacienteId}. Encolando...`);
        this.colas.set(`${equipo._id}-${pacienteId}`, {
          equipo: equipo._id,
          pacienteId,
          resultados,
          fecha: new Date()
        });
        this.emit('resultadoEncolado', {
          equipo: equipo.nombre,
          identificador: pacienteId,
          cantidad: resultados.length
        });
        return null;
      }

      // ── Mapear parámetros del equipo a nombres legibles ─────────────
      const valoresMapeados = resultados.map(r => {
        const mapeo = equipo.mapeoParametros.find(m => m.codigoEquipo === r.codigoEquipo);
        return {
          parametro: mapeo?.nombreParametro || r.codigoEquipo,
          valor: (parseFloat(r.valor) * (mapeo?.factor || 1)).toFixed(mapeo?.decimales || 2),
          unidad: mapeo?.unidad || r.unidad,
          valorReferencia: mapeo?.valorReferencia || r.valorReferencia,
          estado: r.estado
        };
      });

      // ── Buscar cita si no se encontró vía factura ──────────────────
      if (!cita && ordenId) {
        cita = await Cita.findById(ordenId);
      }
      if (!cita) {
        cita = await Cita.findOne({
          paciente: paciente._id,
          estado: { $in: ['programada', 'confirmada', 'en_proceso', 'completada'] }
        }).sort({ createdAt: -1 });
      }

      // ── Buscar estudio desde el mapeo del equipo ───────────────────
      const mapeoEstudio = equipo.mapeoEstudios && equipo.mapeoEstudios.length > 0
        ? equipo.mapeoEstudios[0]
        : null;
      if (mapeoEstudio) {
        estudio = await Estudio.findById(mapeoEstudio.estudioId);
      }
      if (!estudio) {
        estudio = await Estudio.findOne();
      }

      // ── Auto-crear cita si no existe (para equipos que envían sin orden) ─
      if (!cita && estudio) {
        const ahora = new Date();
        cita = await Cita.create({
          paciente: paciente._id,
          fecha: ahora,
          horaInicio: ahora.toTimeString().slice(0, 5),
          estudios: [{
            estudio: estudio._id,
            precio: estudio.precio || 0
          }],
          estado: 'completada',
          motivo: `Auto - ${equipo.nombre}`
        });
      }

      // ── Crear el Resultado vinculado a Factura + Paciente ──────────
      const resultado = await Resultado.create({
        paciente: paciente._id,
        cita: cita ? cita._id : undefined,
        factura: facturaVinculada ? facturaVinculada._id : undefined,
        estudio: estudio ? estudio._id : undefined,
        valores: valoresMapeados,
        estado: 'en_proceso',
        observaciones: `Recibido automáticamente desde ${equipo.nombre}${facturaVinculada ? ` (LIS: ${facturaVinculada.codigoLIS})` : ''}`,
        fechaRealizacion: new Date()
      });

      // ── Actualizar estadísticas del equipo ─────────────────────────
      await Equipo.findByIdAndUpdate(equipo._id, {
        ultimaConexion: new Date(),
        $inc: { 'estadisticas.resultadosRecibidos': 1 },
        'estadisticas.ultimoResultado': new Date()
      });

      // ── Emitir evento para notificaciones en tiempo real ───────────
      this.emit('nuevoResultado', {
        equipo: equipo.nombre,
        paciente: `${paciente.nombre} ${paciente.apellido}`,
        resultado: resultado._id,
        codigoLIS: facturaVinculada?.codigoLIS || null,
        factura: facturaVinculada?.numero || null
      });

      console.log(`✅ Resultado guardado: ${paciente.nombre} ${paciente.apellido}${facturaVinculada ? ` | Factura: ${facturaVinculada.numero} | LIS: ${facturaVinculada.codigoLIS}` : ''}`);
      return resultado;

    } catch (error) {
      console.error('❌ Error guardando resultado:', error);
      await Equipo.findByIdAndUpdate(equipo._id, {
        ultimoError: error.message,
        $inc: { 'estadisticas.errores': 1 }
      });
      throw error;
    }
  }

  // Detener equipo
  async detenerEquipo(equipoId) {
    const conexion = this.conexiones.get(equipoId.toString());
    if (conexion) {
      // Cleanup resources
      if (conexion.server) {
        conexion.server.close();
      }
      if (conexion.port && conexion.port.isOpen) {
        conexion.port.close();
      }
      if (conexion.intervalo) {
        clearInterval(conexion.intervalo);
      }
      this.conexiones.delete(equipoId.toString());
      console.log(`🔌 Equipo desconectado: ${conexion.equipo.nombre}`);
    }
  }

  // Obtener estado de todos los equipos
  obtenerEstados() {
    const estados = [];
    for (const [id, conexion] of this.conexiones) {
      estados.push({
        id,
        nombre: conexion.equipo.nombre,
        estado: conexion.estado,
        protocolo: conexion.protocolo
      });
    }
    return estados;
  }

  // Procesar cola pendiente (reintentar resultados sin paciente)
  async procesarCola() {
    for (const [key, item] of this.colas) {
      const Paciente = require('../models/Paciente');
      const Factura = require('../models/Factura');

      let paciente = null;

      // Intentar buscar por codigoLIS primero
      const codigoNumerico = parseInt(item.pacienteId, 10);
      if (!isNaN(codigoNumerico) && codigoNumerico >= 1000 && codigoNumerico <= 99999) {
        const factura = await Factura.findOne({ codigoLIS: codigoNumerico }).populate('paciente');
        if (factura && factura.paciente) {
          paciente = factura.paciente;
        }
      }

      // Fallback: buscar por cédula
      if (!paciente) {
        paciente = await Paciente.findOne({ cedula: item.pacienteId });
      }

      if (paciente) {
        const equipo = await Equipo.findById(item.equipo);
        if (equipo) {
          await this.guardarResultados(equipo, item.pacienteId, null, item.resultados);
          this.colas.delete(key);
          console.log(`📦 Cola procesada: ${key} → ${paciente.nombre} ${paciente.apellido}`);
        }
      }
    }
  }
}

module.exports = new EquipoService();
