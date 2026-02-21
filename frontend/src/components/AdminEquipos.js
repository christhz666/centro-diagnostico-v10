import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FaFlask, FaSync, FaPlus, FaEdit, FaTrash, FaPowerOff, FaPlay,
  FaStop, FaNetworkWired, FaUsb, FaFolder, FaBroadcastTower,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaClock,
  FaChevronDown, FaChevronRight, FaDatabase, FaRedoAlt
} from 'react-icons/fa';

const ESTADO_ICONO = {
  activo: { icon: <FaCheckCircle />, color: '#27ae60', label: 'Conectado' },
  inactivo: { icon: <FaPowerOff />, color: '#95a5a6', label: 'Inactivo' },
  mantenimiento: { icon: <FaClock />, color: '#f39c12', label: 'Mantenimiento' },
  error: { icon: <FaTimesCircle />, color: '#e74c3c', label: 'Error' },
  sin_puerto: { icon: <FaExclamationTriangle />, color: '#e67e22', label: 'Sin Puerto' },
  conectado: { icon: <FaCheckCircle />, color: '#27ae60', label: 'En Línea' }
};

const PROTO_ICONO = {
  ASTM: <FaBroadcastTower />,
  HL7: <FaNetworkWired />,
  SERIAL: <FaUsb />,
  TCP: <FaNetworkWired />,
  FILE: <FaFolder />
};

const TIPO_COLORES = {
  hematologia: '#e74c3c',
  quimica: '#3498db',
  orina: '#f1c40f',
  coagulacion: '#9b59b6',
  inmunologia: '#1abc9c',
  microbiologia: '#e67e22',
  otro: '#95a5a6'
};

/* ═══════════════════════════════════════════════════════════════ */
const AdminEquipos = () => {
  const [equipos, setEquipos] = useState([]);
  const [estadosLive, setEstadosLive] = useState([]);
  const [resultadosRecientes, setResultadosRecientes] = useState([]);
  const [colaPendiente, setColaPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', marca: '', modelo: '', tipo: 'hematologia',
    protocolo: 'ASTM', estado: 'activo',
    configuracion: { ip: '', puertoTcp: '', puerto: '', baudRate: 9600, rutaArchivos: '' }
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const cargarEquipos = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [respEquipos, respEstados] = await Promise.all([
        axios.get('/api/equipos', { headers }),
        axios.get('/api/equipos/estados', { headers }).catch(() => ({ data: [] }))
      ]);

      let lista = [];
      if (Array.isArray(respEquipos.data)) lista = respEquipos.data;
      else if (respEquipos.data?.data) lista = respEquipos.data.data;
      else if (respEquipos.data?.equipos) lista = respEquipos.data.equipos;
      setEquipos(lista);

      const estados = Array.isArray(respEstados.data) ? respEstados.data : (respEstados.data?.data || []);
      setEstadosLive(estados);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, []);

  const cargarResultadosRecientes = useCallback(async () => {
    try {
      const resp = await axios.get('/api/equipos/resultados-recientes', { headers }).catch(() => ({ data: [] }));
      const data = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
      setResultadosRecientes(data);
      setColaPendiente(resp.data?.colaPendiente || 0);
    } catch { /* No critical */ }
  }, []);

  useEffect(() => { cargarEquipos(); cargarResultadosRecientes(); }, [cargarEquipos, cargarResultadosRecientes]);

  // Polling cada 15 segundos para actualizar estados
  useEffect(() => {
    const interval = setInterval(() => {
      cargarResultadosRecientes();
      axios.get('/api/equipos/estados', { headers }).then(r => {
        const estados = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setEstadosLive(estados);
      }).catch(() => { });
    }, 15000);
    return () => clearInterval(interval);
  }, [cargarResultadosRecientes]);

  const refresh = async () => { setRefreshing(true); await cargarEquipos(); await cargarResultadosRecientes(); setRefreshing(false); };

  const procesarCola = async () => {
    try {
      await axios.post('/api/equipos/procesar-cola', {}, { headers });
      alert('Cola procesada exitosamente');
      cargarResultadosRecientes();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const guardarEquipo = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await axios.put(`/api/equipos/${editando._id}`, formData, { headers });
        alert('Equipo actualizado');
      } else {
        await axios.post('/api/equipos', formData, { headers });
        alert('Equipo creado');
      }
      setShowForm(false); setEditando(null);
      cargarEquipos();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const toggleEquipo = async (id, accion) => {
    try {
      await axios.post(`/api/equipos/${id}/${accion}`, {}, { headers });
      cargarEquipos();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const eliminarEquipo = async (id) => {
    if (!window.confirm('¿Eliminar este equipo?')) return;
    try {
      await axios.delete(`/api/equipos/${id}`, { headers });
      cargarEquipos();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const abrirEditar = (eq) => {
    setEditando(eq);
    setFormData({
      nombre: eq.nombre, marca: eq.marca, modelo: eq.modelo,
      tipo: eq.tipo, protocolo: eq.protocolo, estado: eq.estado,
      configuracion: { ...eq.configuracion }
    });
    setShowForm(true);
  };

  const getEstadoLive = (id) => estadosLive.find(e => e.id === id);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <FaFlask style={{ fontSize: 50, color: '#3498db', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#888', fontSize: 16 }}>Cargando equipos de laboratorio...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', background: '#fff3f3', borderRadius: 16, maxWidth: 500, margin: '40px auto' }}>
      <FaTimesCircle style={{ fontSize: 48, color: '#e74c3c', marginBottom: 16 }} />
      <h3 style={{ color: '#c0392b' }}>Error al cargar equipos</h3>
      <p style={{ color: '#888' }}>{error}</p>
      <button onClick={cargarEquipos} style={{ padding: '10px 24px', background: '#3498db', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Reintentar</button>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1b262c', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaFlask style={{ color: '#3498db' }} /> Equipos LIS
          </h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
            Sistema de integración con equipos de laboratorio — {equipos.length} equipo(s) registrado(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} disabled={refreshing} style={{
            padding: '10px 16px', background: '#f0f4f8', border: '1.5px solid #dde3ed',
            borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
          }}>
            <FaSync style={{ animation: refreshing ? 'spin 0.5s linear infinite' : 'none' }} /> Actualizar
          </button>
          <button onClick={() => { setEditando(null); setFormData({ nombre: '', marca: '', modelo: '', tipo: 'hematologia', protocolo: 'ASTM', estado: 'activo', configuracion: { ip: '', puertoTcp: '', puerto: '', baudRate: 9600, rutaArchivos: '' } }); setShowForm(true); }} style={{
            padding: '10px 16px', background: 'linear-gradient(135deg,#0f4c75,#1a6ba8)', color: 'white',
            border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600
          }}>
            <FaPlus /> Nuevo Equipo
          </button>
        </div>
      </div>

      {/* ── Resumen rápido de estados ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Equipos', value: equipos.length, color: '#3498db', icon: <FaFlask /> },
          { label: 'En Línea', value: estadosLive.filter(e => e.estado === 'conectado').length, color: '#27ae60', icon: <FaCheckCircle /> },
          { label: 'Cola Pendiente', value: colaPendiente, color: colaPendiente > 0 ? '#e74c3c' : '#27ae60', icon: <FaDatabase /> },
          { label: 'Últ. Resultado', value: resultadosRecientes.length > 0 ? 'Hoy' : '—', color: '#8e44ad', icon: <FaClock /> },
        ].map((item, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #f0f0f0' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 18 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1b262c' }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tarjetas de equipos ───────────────────────────────── */}
      {equipos.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', background: '#f8f9ff', borderRadius: 16, border: '2px dashed #dde3ed' }}>
          <FaFlask style={{ fontSize: 48, color: '#bbb', marginBottom: 16 }} />
          <h3 style={{ color: '#555' }}>No hay equipos registrados</h3>
          <p style={{ color: '#999' }}>Registra tu primer equipo de laboratorio para comenzar a recibir resultados automáticamente.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>
          {equipos.map((eq) => {
            const live = getEstadoLive(eq._id);
            const estadoInfo = ESTADO_ICONO[live?.estado || eq.estado] || ESTADO_ICONO.inactivo;
            const tipoColor = TIPO_COLORES[eq.tipo] || '#95a5a6';
            return (
              <div key={eq._id} style={{
                background: 'white', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                {/* Header del equipo */}
                <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${tipoColor}15, ${tipoColor}08)`, borderBottom: `3px solid ${tipoColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b262c' }}>{eq.nombre}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>{eq.marca} — {eq.modelo}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${estadoInfo.color}15`, color: estadoInfo.color, fontSize: 11, fontWeight: 600 }}>
                      {estadoInfo.icon} {estadoInfo.label}
                    </div>
                  </div>
                </div>

                {/* Detalles */}
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                    <div><span style={{ color: '#aaa', fontWeight: 500 }}>Tipo:</span> <span style={{ fontWeight: 600, color: tipoColor, textTransform: 'capitalize' }}>{eq.tipo}</span></div>
                    <div><span style={{ color: '#aaa', fontWeight: 500 }}>Protocolo:</span> <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{PROTO_ICONO[eq.protocolo]} {eq.protocolo}</span></div>
                    {eq.configuracion?.ip && <div><span style={{ color: '#aaa', fontWeight: 500 }}>IP:</span> <code style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{eq.configuracion.ip}:{eq.configuracion.puertoTcp}</code></div>}
                    {eq.configuracion?.puerto && <div><span style={{ color: '#aaa', fontWeight: 500 }}>Puerto:</span> <code style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{eq.configuracion.puerto}</code></div>}
                    <div><span style={{ color: '#aaa', fontWeight: 500 }}>Resultados:</span> <span style={{ fontWeight: 700, color: '#1b262c' }}>{eq.estadisticas?.resultadosRecibidos || 0}</span></div>
                    <div><span style={{ color: '#aaa', fontWeight: 500 }}>Errores:</span> <span style={{ fontWeight: 600, color: (eq.estadisticas?.errores || 0) > 0 ? '#e74c3c' : '#27ae60' }}>{eq.estadisticas?.errores || 0}</span></div>
                  </div>
                  {eq.ultimoError && (
                    <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff3f3', borderRadius: 8, fontSize: 11, color: '#c0392b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FaExclamationTriangle /> {eq.ultimoError}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => abrirEditar(eq)} style={{ flex: 1, padding: '8px', background: '#eaf2fc', color: '#2980b9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><FaEdit /> Editar</button>
                  <button onClick={() => toggleEquipo(eq._id, eq.estado === 'activo' ? 'detener' : 'iniciar')} style={{ flex: 1, padding: '8px', background: eq.estado === 'activo' ? '#fdf0e0' : '#e8f8ee', color: eq.estado === 'activo' ? '#e67e22' : '#27ae60', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {eq.estado === 'activo' ? <><FaStop /> Detener</> : <><FaPlay /> Iniciar</>}
                  </button>
                  <button onClick={() => eliminarEquipo(eq._id)} style={{ padding: '8px 10px', background: '#fee', color: '#e74c3c', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}><FaTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cola pendiente + Resultados recientes ──────────────── */}
      {colaPendiente > 0 && (
        <div style={{ background: '#fff8e1', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ffe082' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaExclamationTriangle style={{ color: '#f57f17', fontSize: 20 }} />
            <div>
              <strong style={{ color: '#e65100' }}>{colaPendiente} resultado(s) en cola</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Resultados recibidos de equipos pero sin paciente vinculado. Pueden ser códigos LIS aún no facturados.</p>
            </div>
          </div>
          <button onClick={procesarCola} style={{ padding: '8px 16px', background: '#f57f17', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <FaRedoAlt /> Reprocesar
          </button>
        </div>
      )}

      {resultadosRecientes.length > 0 && (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1b262c', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaClock style={{ color: '#8e44ad' }} /> Últimos Resultados Recibidos
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9ff', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#888', fontWeight: 600, fontSize: 12 }}>Equipo</th>
                  <th style={{ padding: '10px 14px', color: '#888', fontWeight: 600, fontSize: 12 }}>Paciente</th>
                  <th style={{ padding: '10px 14px', color: '#888', fontWeight: 600, fontSize: 12 }}>Código LIS</th>
                  <th style={{ padding: '10px 14px', color: '#888', fontWeight: 600, fontSize: 12 }}>Parámetros</th>
                  <th style={{ padding: '10px 14px', color: '#888', fontWeight: 600, fontSize: 12 }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {resultadosRecientes.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.equipo || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{r.paciente || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {r.codigoLIS ? (
                        <span style={{ background: '#eef2f5', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontFamily: 'monospace', fontSize: 14, color: '#1a3a5c' }}>{r.codigoLIS}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>{r.parametros || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>{r.fecha ? new Date(r.fecha).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Crear/Editar ─────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 30, width: '100%', maxWidth: 550, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1b262c' }}>
              {editando ? '✏️ Editar Equipo' : '➕ Nuevo Equipo'}
            </h2>
            <form onSubmit={guardarEquipo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                {[
                  { label: 'Nombre', key: 'nombre', placeholder: 'Ej: Mindray BC-6800', span: 2 },
                  { label: 'Marca', key: 'marca', placeholder: 'Mindray' },
                  { label: 'Modelo', key: 'modelo', placeholder: 'BC-6800' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.span === 2 ? '1/-1' : undefined }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{f.label}</label>
                    <input value={formData[f.key]} placeholder={f.placeholder} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Tipo</label>
                  <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}>
                    {Object.keys(TIPO_COLORES).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Protocolo</label>
                  <select value={formData.protocolo} onChange={e => setFormData({ ...formData, protocolo: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}>
                    {['ASTM', 'HL7', 'SERIAL', 'TCP', 'FILE'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Configuración según protocolo */}
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9ff', borderRadius: 12, border: '1px solid #e8eaf6' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>⚙️ Configuración de Conexión</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  {(formData.protocolo === 'TCP' || formData.protocolo === 'HL7' || formData.protocolo === 'ASTM') && (
                    <>
                      <div>
                        <label style={{ fontSize: 11, color: '#888' }}>Dirección IP</label>
                        <input value={formData.configuracion.ip || ''} placeholder="192.168.1.100" onChange={e => setFormData({ ...formData, configuracion: { ...formData.configuracion, ip: e.target.value } })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#888' }}>Puerto TCP</label>
                        <input type="number" value={formData.configuracion.puertoTcp || ''} placeholder="2575" onChange={e => setFormData({ ...formData, configuracion: { ...formData.configuracion, puertoTcp: parseInt(e.target.value) || '' } })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                      </div>
                    </>
                  )}
                  {formData.protocolo === 'SERIAL' && (
                    <>
                      <div>
                        <label style={{ fontSize: 11, color: '#888' }}>Puerto COM</label>
                        <input value={formData.configuracion.puerto || ''} placeholder="COM3" onChange={e => setFormData({ ...formData, configuracion: { ...formData.configuracion, puerto: e.target.value } })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#888' }}>Baud Rate</label>
                        <select value={formData.configuracion.baudRate || 9600} onChange={e => setFormData({ ...formData, configuracion: { ...formData.configuracion, baudRate: parseInt(e.target.value) } })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}>
                          {[2400, 4800, 9600, 19200, 38400, 57600, 115200].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  {formData.protocolo === 'FILE' && (
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 11, color: '#888' }}>Ruta de Archivos</label>
                      <input value={formData.configuracion.rutaArchivos || ''} placeholder="C:\lab\resultados" onChange={e => setFormData({ ...formData, configuracion: { ...formData.configuracion, rutaArchivos: e.target.value } })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => { setShowForm(false); setEditando(null); }} style={{ flex: 1, padding: '12px', background: '#f0f4f8', border: '1px solid #dde3ed', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancelar</button>
                <button type="submit" style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#0f4c75,#1a6ba8)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  {editando ? 'Actualizar' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEquipos;
