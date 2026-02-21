/**
 * SERVICIO DE INTEGRACIÓN DICOM / HL7
 * ─────────────────────────────────────
 * Permite enviar los datos del paciente directamente al equipo de rayos X
 * cuando se registra una cita. El técnico NO tiene que volver a escribir
 * el nombre del paciente en el equipo.
 *
 * Soporta:
 * - Orthanc (servidor DICOM open source, recomendado)
 * - Envío HTTP REST a equipos con API propia (Konica, Carestream)
 * - Archivo de Worklist MWL para carpeta compartida
 *
 * Configuración en .env:
 *   DICOM_MODE=orthanc|rest|file|none
 *   ORTHANC_URL=http://192.168.1.100:8042
 *   ORTHANC_USER=admin
 *   ORTHANC_PASS=orthanc
 *   RAYOSX_API_URL=http://192.168.1.50:8080/api/worklist
 *   RAYOSX_API_KEY=secreto
 *   DICOM_WORKLIST_DIR=/var/dicom/worklist
 *   RAYOSX_AET=RAYOSX
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class DicomIntegrationService {
    constructor() {
        this.mode = process.env.DICOM_MODE || 'none';
        this.orthancUrl = process.env.ORTHANC_URL || 'http://localhost:8042';
        this.orthancUser = process.env.ORTHANC_USER || 'orthanc';
        this.orthancPass = process.env.ORTHANC_PASS || 'orthanc';
        this.rayosxApiUrl = process.env.RAYOSX_API_URL || '';
        this.rayosxApiKey = process.env.RAYOSX_API_KEY || '';
        this.worklistDir = process.env.DICOM_WORKLIST_DIR || path.join(__dirname, '..', 'uploads', 'worklist');
    }

    /**
     * Método principal: registra el paciente en el equipo de rayos X.
     * Llamar después de crear la cita con estudios de imágenes.
     * 
     * @param {Object} paciente - Datos del paciente (de MongoDB)
     * @param {Object} cita - Datos de la cita (de MongoDB)
     * @param {Array}  estudios - Estudios de imágenes de la cita
     */
    async registrarEnEquipo(paciente, cita, estudios) {
        if (this.mode === 'none' || !estudios || estudios.length === 0) {
            return { skipped: true, reason: 'DICOM_MODE=none o sin estudios de imágenes' };
        }

        const payload = this._construirPayload(paciente, cita, estudios);

        switch (this.mode) {
            case 'orthanc':
                return this._enviarOrthanc(payload);
            case 'rest':
                return this._enviarREST(payload);
            case 'file':
                return this._escribirArchivoWorklist(payload);
            default:
                return { skipped: true, reason: `Modo desconocido: ${this.mode}` };
        }
    }

    _construirPayload(paciente, cita, estudios) {
        const fechaNac = paciente.fechaNacimiento
            ? new Date(paciente.fechaNacimiento).toISOString().slice(0, 10).replace(/-/g, '')
            : '';
        const fechaHoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const horaAhora = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
        const accessionNumber = cita.registroId || `ACC${Date.now()}`;
        const descripcion = estudios.map(e => e.nombre || e.codigo || 'RX').join(' | ');

        return {
            accessionNumber,
            fechaEstudio: fechaHoy,
            horaEstudio: horaAhora,
            paciente: {
                id: paciente.cedula || paciente._id.toString(),
                nombre: `${paciente.apellido || ''}^${paciente.nombre || ''}`,
                nombreDisplay: `${paciente.nombre} ${paciente.apellido}`,
                sexo: paciente.sexo === 'M' ? 'M' : 'F',
                fechaNacimiento: fechaNac,
                telefono: paciente.telefono || '',
                cedula: paciente.cedula || ''
            },
            estudio: {
                descripcion,
                modalidad: 'CR',
                aet: process.env.RAYOSX_AET || 'RAYOSX',
                codigos: estudios.map(e => e.codigo || 'RX')
            }
        };
    }

    // ── Orthanc via REST API ─────────────────────────────────────────────────

    async _enviarOrthanc(payload) {
        try {
            // En Orthanc, enviamos una "scheduled procedure" via la API REST
            const body = JSON.stringify({
                PatientID: payload.paciente.id,
                PatientName: payload.paciente.nombre,
                PatientSex: payload.paciente.sexo,
                PatientBirthDate: payload.paciente.fechaNacimiento,
                AccessionNumber: payload.accessionNumber,
                RequestedProcedureDescription: payload.estudio.descripcion,
                ScheduledProcedureStepSequence: [{
                    ScheduledStationAETitle: payload.estudio.aet,
                    ScheduledProcedureStepStartDate: payload.fechaEstudio,
                    ScheduledProcedureStepStartTime: payload.horaEstudio,
                    Modality: payload.estudio.modalidad,
                    ScheduledPerformingPhysicianName: ''
                }]
            });

            const result = await this._httpRequest(
                'POST',
                `${this.orthancUrl}/tools/create-dicom`,
                body,
                {
                    'Content-Type': 'application/json',
                    Authorization: 'Basic ' + Buffer.from(`${this.orthancUser}:${this.orthancPass}`).toString('base64')
                }
            );

            return { success: true, mode: 'orthanc', result };
        } catch (err) {
            console.error('[DicomService] Error Orthanc:', err.message);
            return { success: false, mode: 'orthanc', error: err.message };
        }
    }

    // ── REST directo al equipo ───────────────────────────────────────────────

    async _enviarREST(payload) {
        if (!this.rayosxApiUrl) {
            return { success: false, error: 'RAYOSX_API_URL no configurado' };
        }
        try {
            const body = JSON.stringify(payload);
            const result = await this._httpRequest(
                'POST',
                this.rayosxApiUrl,
                body,
                {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.rayosxApiKey
                }
            );
            return { success: true, mode: 'rest', result };
        } catch (err) {
            console.error('[DicomService] Error REST:', err.message);
            return { success: false, mode: 'rest', error: err.message };
        }
    }

    // ── Archivo .wl en carpeta compartida ────────────────────────────────────

    async _escribirArchivoWorklist(payload) {
        try {
            if (!fs.existsSync(this.worklistDir)) {
                fs.mkdirSync(this.worklistDir, { recursive: true });
            }
            const filename = `${payload.accessionNumber}_${payload.fechaEstudio}.json`;
            const ruta = path.join(this.worklistDir, filename);
            fs.writeFileSync(ruta, JSON.stringify(payload, null, 2));
            return { success: true, mode: 'file', ruta };
        } catch (err) {
            console.error('[DicomService] Error escribiendo worklist:', err.message);
            return { success: false, mode: 'file', error: err.message };
        }
    }

    // ── HTTP helper ──────────────────────────────────────────────────────────

    _httpRequest(method, url, body, headers) {
        return new Promise((resolve, reject) => {
            const isHttps = url.startsWith('https');
            const lib = isHttps ? https : http;
            const parsed = new URL(url);
            const options = {
                hostname: parsed.hostname,
                port: parsed.port || (isHttps ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method,
                headers: { ...headers, 'Content-Length': Buffer.byteLength(body || '') }
            };
            const req = lib.request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve({ raw: data }); }
                });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
            if (body) req.write(body);
            req.end();
        });
    }

    // ── Verificar conexión ───────────────────────────────────────────────────

    async verificarConexion() {
        const info = { mode: this.mode };
        if (this.mode === 'orthanc') {
            try {
                const r = await this._httpRequest('GET', `${this.orthancUrl}/system`, '', {
                    Authorization: 'Basic ' + Buffer.from(`${this.orthancUser}:${this.orthancPass}`).toString('base64')
                });
                info.orthanc = { conectado: true, version: r.Version, aet: r.DicomAet };
            } catch (e) {
                info.orthanc = { conectado: false, error: e.message };
            }
        }
        return info;
    }
}

module.exports = new DicomIntegrationService();
