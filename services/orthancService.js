const fetch = require('node-fetch');
const Resultado = require('../models/Resultado');
const Factura = require('../models/Factura');

// Configuración de Orthanc (proveniente de .env)
const ORTHANC_URL = process.env.ORTHANC_URL || 'http://127.0.0.1:8042';
const ORTHANC_USER = process.env.ORTHANC_USER || 'admin';
const ORTHANC_PASS = process.env.ORTHANC_PASS || 'admin';
const ORTHANC_AE_TITLE = process.env.ORTHANC_AE_TITLE || 'CS7_KONICA';

// Generar header de autorización
const getAuthHeader = () => {
    const creds = Buffer.from(`${ORTHANC_USER}:${ORTHANC_PASS}`).toString('base64');
    return { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/json' };
};

/**
 * Enviar datos a Orthanc Worklist
 */
exports.enviarPacienteARayosX = async (paciente, factura, cita, itemsFactura) => {
    try {
        if (!paciente || !factura) return;

        // Comprobar si hay estudios de Rayos X o Imagenología
        const estudiosRX = itemsFactura.filter(item =>
            item.estudio &&
            ['Imagenología', 'Rayos X', 'CR', 'Sonografía'].includes(item.estudio.categoria)
        );

        if (estudiosRX.length === 0) {
            return; // No hay rayos X, no hacer nada
        }

        // AccionNumber: Utilizar código LIS o número de factura corto
        const accessionNumber = factura.codigoLIS || factura.numero || factura._id.toString().slice(-8).toUpperCase();

        // Modality: Tomar la modalidad del primer estudio (si tuviera) o por defecto DX
        const modality = 'DX';

        // Formato APELLIDO^NOMBRE esperado por equipos HL7/DICOM
        const patientName = `${(paciente.apellido || '').trim()}^${(paciente.nombre || '').trim()}`.replace(/\s+/g, '^');

        const datosPaciente = {
            "PatientName": patientName,
            "PatientID": paciente.cedula || paciente._id.toString(),
            "AccessionNumber": accessionNumber,
            "Modality": modality,
            "ScheduledStationAETitle": ORTHANC_AE_TITLE
        };

        // Enviar a la API de Orthanc
        const response = await fetch(`${ORTHANC_URL}/worklists`, {
            method: 'POST',
            body: JSON.stringify(datosPaciente),
            headers: getAuthHeader()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Orthanc] Error enviando Modality Worklist (Status: ${response.status}):`, errorText);
            return;
        }

        console.log(`[Orthanc] ✅ Worklist enviada exitosamente para Paciente: ${patientName}, Accession: ${accessionNumber}`);

    } catch (error) {
        console.error(`[Orthanc] Error ejecutando envío de Worklist:`, error.message);
    }
};

/**
 * Proceso programado para sincronizar imágenes listas desde Orthanc
 * Guarda el referencial en los Resultados con estado 'pendiente'
 */
exports.sincronizarImagenesListas = async () => {
    try {
        // Pedir los cambios recientes a Orthanc
        const response = await fetch(`${ORTHANC_URL}/changes?limit=50`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!response.ok) return;

        const data = await response.json();

        // Filtrar cambios de tipo "StableStudy" (Estudio completo y transferido sin errores)
        const stableStudies = data.Changes.filter(c => c.ChangeType === 'StableStudy');

        for (const change of stableStudies) {
            const studyId = change.ID;

            // Obtener metadata del estudio para extraer AccessionNumber
            const infoRes = await fetch(`${ORTHANC_URL}/studies/${studyId}`, {
                method: 'GET',
                headers: getAuthHeader()
            });

            if (!infoRes.ok) continue;

            const studyInfo = await infoRes.json();
            const accessionNumber = studyInfo.MainDicomTags?.AccessionNumber;

            if (!accessionNumber) continue;

            // Buscar si tenemos algún resultado pendiente con ese número (que viene de la factura)
            // Primero, buscamos facturas que correspondan a ese AccessionNumber (código LIS o Número)
            const facturaMatch = await Factura.findOne({
                $or: [
                    { codigoLIS: accessionNumber },
                    { numero: accessionNumber }
                ]
            }).select('_id');

            if (!facturaMatch) continue;

            // Buscar resultados atados a esa factura que estén pendientes y no tengan ya este studyID
            const resultadosActualizados = await Resultado.updateMany(
                {
                    factura: facturaMatch._id,
                    orthancStudyId: { $ne: studyId },
                    estado: 'pendiente' // Solo actualiza los que sigan pendientes
                },
                {
                    $set: {
                        orthancStudyId: studyId,
                        estado: 'completado',
                        fechaCompletado: new Date(),
                        'tecnico.metodo': 'Digital DICOM (Orthanc)'
                    }
                }
            );

            if (resultadosActualizados.modifiedCount > 0) {
                console.log(`[Orthanc] 📥 Estudio ${accessionNumber} sincronizado y vinculado al CMS web. (Orthanc ID: ${studyId})`);
            }
        }
    } catch (error) {
        console.error(`[Orthanc Polling] Error:`, error.message);
    }
};

/**
 * Obtener las instancias de un estudio
 */
exports.getStudyInstances = async (studyId) => {
    try {
        const response = await fetch(`${ORTHANC_URL}/studies/${studyId}/instances`, {
            method: 'GET',
            headers: getAuthHeader()
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error(`[Orthanc] Error obteniendo instancias del estudio ${studyId}:`, e.message);
        return [];
    }
};
