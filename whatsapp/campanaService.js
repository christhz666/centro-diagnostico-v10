/**
 * Servicio de Campañas WhatsApp
 * Para usar con la API de WhatsApp Business o Twilio WhatsApp
 * 
 * CONFIGURAR en .env:
 *   WHATSAPP_MODE=twilio  (o 'meta' para Meta API)
 *   TWILIO_ACCOUNT_SID=...
 *   TWILIO_AUTH_TOKEN=...
 *   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 *   META_PHONE_NUMBER_ID=...
 *   META_ACCESS_TOKEN=...
 */

const Paciente = require('../models/Paciente');
const Factura = require('../models/Factura');

// Función para enviar mensaje de WhatsApp via Twilio
async function enviarViaTwilio(telefono, mensaje) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    
    if (!accountSid || !authToken) {
        throw new Error('Credenciales de Twilio no configuradas');
    }
    
    const client = require('twilio')(accountSid, authToken);
    
    // Normalizar número dominicano
    let to = telefono.replace(/[^0-9+]/g, '');
    if (!to.startsWith('+')) {
        if (to.startsWith('1')) to = '+' + to;
        else if (to.startsWith('8') || to.startsWith('9')) to = '+1809' + to.slice(-7);
        else to = '+1' + to;
    }
    
    return await client.messages.create({
        body: mensaje,
        from: from,
        to: `whatsapp:${to}`
    });
}

// Función para enviar mensaje via Meta WhatsApp Business API
async function enviarViaMeta(telefono, mensaje) {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
        throw new Error('Credenciales de Meta WhatsApp no configuradas');
    }
    
    let numero = telefono.replace(/[^0-9]/g, '');
    if (!numero.startsWith('1')) numero = '1' + numero;
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: numero,
            type: 'text',
            text: { body: mensaje }
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error enviando mensaje');
    }
    return await response.json();
}

// Función principal de envío
async function enviarMensaje(telefono, mensaje) {
    const mode = process.env.WHATSAPP_MODE || 'twilio';
    if (mode === 'meta') {
        return await enviarViaMeta(telefono, mensaje);
    }
    return await enviarViaTwilio(telefono, mensaje);
}

// @desc   Enviar campaña a todos los pacientes activos
// @param  { mensaje, segmento } 
// segmento: 'todos' | 'con_seguro' | 'sin_seguro' | array de IDs
async function enviarCampana({ mensaje, segmento = 'todos', pacientesIds = [] }) {
    let filtro = { activo: true, telefono: { $exists: true, $ne: '' } };
    
    if (segmento === 'con_seguro') {
        filtro['seguro.nombre'] = { $exists: true, $ne: '' };
    } else if (segmento === 'sin_seguro') {
        filtro['seguro.nombre'] = { $exists: false };
    } else if (segmento === 'ids' && pacientesIds.length > 0) {
        filtro._id = { $in: pacientesIds };
    }
    
    const pacientes = await Paciente.find(filtro).select('nombre apellido telefono');
    
    const resultados = {
        total: pacientes.length,
        enviados: 0,
        fallidos: 0,
        errores: []
    };
    
    for (const paciente of pacientes) {
        try {
            const mensajeFinal = mensaje
                .replace('{nombre}', paciente.nombre)
                .replace('{apellido}', paciente.apellido)
                .replace('{nombreCompleto}', `${paciente.nombre} ${paciente.apellido}`);
            
            await enviarMensaje(paciente.telefono, mensajeFinal);
            resultados.enviados++;
            
            // Pausa de 1 segundo entre mensajes para evitar spam
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            resultados.fallidos++;
            resultados.errores.push({
                paciente: `${paciente.nombre} ${paciente.apellido}`,
                telefono: paciente.telefono,
                error: err.message
            });
        }
    }
    
    return resultados;
}

// @desc   Notificar al paciente que sus resultados están listos
async function notificarResultadosListos(pacienteId, facturaNumero) {
    const paciente = await Paciente.findById(pacienteId);
    if (!paciente || !paciente.telefono) return;
    
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const mensaje = `🏥 *Centro Diagnóstico Mi Esperanza*\n\nHola ${paciente.nombre}, sus resultados de la factura *${facturaNumero}* ya están disponibles.\n\n📱 Consúltelos en línea:\n${baseUrl}/portal-paciente\n\n🔐 Use las credenciales que están en su factura.\n\n¡Gracias por confiar en nosotros!`;
    
    try {
        await enviarMensaje(paciente.telefono, mensaje);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    enviarCampana,
    enviarMensaje,
    notificarResultadosListos
};
