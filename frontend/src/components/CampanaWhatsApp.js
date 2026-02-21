import React, { useState, useEffect } from 'react';
import { FaWhatsapp, FaPaperPlane, FaUsers, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaEye } from 'react-icons/fa';

const CampanaWhatsApp = () => {
  const [mensaje, setMensaje] = useState('Hola {nombre}, 👋\n\n🏥 *Centro Diagnóstico Mi Esperanza* le recuerda que tenemos:\n\n✅ [Describa su oferta aquí]\n\n📞 Llámenos al [TELÉFONO] o visítenos.\n\n¡Gracias por su preferencia!');
  const [segmento, setSegmento] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    cargarStats();
  }, []);

  const cargarStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/whatsapp/estadisticas', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch (e) {}
  };

  const verPreview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const r = await fetch(`/api/whatsapp/preview?segmento=${segmento}&limit=3`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      if (d.success) setPreview(d.data);
    } catch (e) {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const enviarCampana = async () => {
    if (!mensaje.trim() || mensaje.length < 10) {
      alert('El mensaje es muy corto');
      return;
    }
    if (!window.confirm(`¿Enviar campaña a ${preview?.total || 'todos los'} pacientes?`)) return;
    
    setLoading(true);
    setResultado(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/whatsapp/campana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mensaje, segmento })
      });
      const d = await r.json();
      setResultado(d);
    } catch (e) {
      setResultado({ success: false, message: 'Error de conexión: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const colorWA = '#25D366';

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1b262c', marginBottom: 5 }}>
        <FaWhatsapp style={{ color: colorWA }} /> Campañas de WhatsApp
      </h2>
      <p style={{ color: '#666', marginBottom: 25 }}>Envíe promociones y ofertas a su base de datos de pacientes</p>

      {/* Estadísticas */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 25 }}>
          {[
            { label: 'Total Pacientes', value: stats.total, color: '#3498db' },
            { label: 'Con Teléfono', value: stats.conTelefono, color: colorWA },
            { label: 'Sin Teléfono', value: stats.sinTelefono, color: '#e74c3c' }
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 30, fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Panel izquierdo: configurar */}
        <div style={{ background: 'white', borderRadius: 15, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px', color: '#2c3e50' }}>⚙️ Configurar Campaña</h3>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ fontSize: 13, color: '#555', marginBottom: 6, display: 'block', fontWeight: 'bold' }}>Segmento de Destinatarios</label>
            <select value={segmento} onChange={e => setSegmento(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}>
              <option value="todos">🌐 Todos los pacientes</option>
              <option value="con_seguro">🏥 Pacientes con seguro</option>
              <option value="sin_seguro">👤 Pacientes sin seguro</option>
            </select>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ fontSize: 13, color: '#555', marginBottom: 6, display: 'block', fontWeight: 'bold' }}>Mensaje</label>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              rows={10}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical' }}
            />
            <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
              Variables: <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: 3 }}>{'{nombre}'}</code>, <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: 3 }}>{'{apellido}'}</code>, <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: 3 }}>{'{nombreCompleto}'}</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={verPreview} disabled={loading} style={{ flex: 1, padding: '10px', background: '#ecf0f1', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 'bold' }}>
              <FaEye /> Preview
            </button>
            <button onClick={enviarCampana} disabled={loading} style={{ flex: 2, padding: '10px', background: colorWA, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 'bold' }}>
              {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPaperPlane />}
              Enviar Campaña
            </button>
          </div>
        </div>

        {/* Panel derecho: preview / resultado */}
        <div>
          {/* Preview */}
          {preview && (
            <div style={{ background: 'white', borderRadius: 15, padding: 25, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px', color: '#27ae60' }}>👥 {preview.total} destinatarios</h4>
              {preview.muestra.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                  <strong>{p.nombre} {p.apellido}</strong><br />
                  <span style={{ color: '#888' }}>📱 {p.telefono}</span>
                </div>
              ))}
              {preview.total > preview.muestra.length && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 10 }}>y {preview.total - preview.muestra.length} más...</div>
              )}
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div style={{ background: resultado.success ? '#d4edda' : '#f8d7da', borderRadius: 15, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 10px', color: resultado.success ? '#155724' : '#721c24', display: 'flex', alignItems: 'center', gap: 8 }}>
                {resultado.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
                {resultado.success ? 'Campaña Enviada' : 'Error'}
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: resultado.success ? '#155724' : '#721c24' }}>{resultado.message}</p>
              {resultado.demo && (
                <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, fontSize: 13, color: '#856404' }}>
                  ⚙️ Para activar el envío real, configure las credenciales de WhatsApp en el archivo <code>.env</code> del servidor.
                </div>
              )}
              {resultado.data && (
                <div style={{ fontSize: 13, color: '#555' }}>
                  <div>✅ Enviados: {resultado.data.enviados}</div>
                  <div>❌ Fallidos: {resultado.data.fallidos}</div>
                </div>
              )}
            </div>
          )}

          {/* Instrucciones de configuración */}
          {!preview && !resultado && (
            <div style={{ background: '#f0f8ff', borderRadius: 15, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px', color: '#1a5276' }}>📋 Configuración Requerida</h4>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Para habilitar el envío real de mensajes, configure en el archivo <code>.env</code>:</p>
              <div style={{ background: '#2c3e50', color: '#ecf0f1', padding: 15, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', marginTop: 10 }}>
                <div style={{ color: '#95a5a6' }}># Opción 1: Twilio</div>
                <div>WHATSAPP_MODE=twilio</div>
                <div>TWILIO_ACCOUNT_SID=ACxxxxx</div>
                <div>TWILIO_AUTH_TOKEN=xxxxx</div>
                <div>TWILIO_WHATSAPP_FROM=whatsapp:+14155238886</div>
                <br />
                <div style={{ color: '#95a5a6' }}># Opción 2: Meta WhatsApp Business</div>
                <div>WHATSAPP_MODE=meta</div>
                <div>META_PHONE_NUMBER_ID=xxxxx</div>
                <div>META_ACCESS_TOKEN=xxxxx</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampanaWhatsApp;
