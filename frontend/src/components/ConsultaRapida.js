import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaBarcode, FaSearch, FaUser, FaFlask, FaPrint,
  FaCheckCircle, FaClock, FaTimes, FaSpinner, FaExclamationTriangle
} from 'react-icons/fa';
import api from '../services/api';

/* ─── Debounce hook ─────────────────────────────────────────── */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const ConsultaRapida = () => {
  /* ── Pestañas ── */
  const [tab, setTab] = useState('scanner'); // 'scanner' | 'busqueda'

  /* ── Escáner ── */
  const [codigo, setCodigo] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagoBloqueo, setPagoBloqueo] = useState(null); // { montoPendiente, mensaje }
  const inputRef = useRef(null);

  /* ── Búsqueda por nombre ── */
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [pacientesBusq, setPacientesBusq] = useState([]);
  const [historialPaciente, setHistorialPaciente] = useState(null);
  const debouncedBusqueda = useDebounce(busqueda, 400);

  /* ── Configuración empresa ── */
  const [empresaConfig, setEmpresaConfig] = useState({});

  const colores = { azulOscuro: '#1a3a5c', azulCielo: '#87CEEB' };

  /* ─── Cargar config empresa ──────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/configuracion/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setEmpresaConfig(d.configuracion || d || {}))
      .catch(() => { });
  }, []);

  /* ─── Auto-focus en pestaña de escáner ─────────────────── */
  useEffect(() => {
    if (tab === 'scanner') {
      inputRef.current?.focus();
      const iv = setInterval(() => {
        if (document.activeElement !== inputRef.current) inputRef.current?.focus();
      }, 2000);
      return () => clearInterval(iv);
    }
  }, [tab]);

  /* ─── Auto-envío cuando el escanner completa la lectura ──────── */
  useEffect(() => {
    if (!codigo.trim()) return;
    const c = codigo.trim();
    // Detectar: QR hex, número de factura FAC-xxx, matrícula numérica, o código de muestra
    const esQR = /^[A-F0-9]{12,16}$/.test(c);
    const esFac = /^FAC-/i.test(c);
    const esCodigo = /^\d{3,}$/.test(c);  // cualquier número de 3+ dígitos
    if (esQR || esFac || esCodigo) buscarPorCodigo(c);
  }, [codigo]);

  /* ─── Búsqueda por nombre con debounce ──────────────────── */
  useEffect(() => {
    if (!debouncedBusqueda || debouncedBusqueda.trim().length < 2) {
      setPacientesBusq([]);
      setHistorialPaciente(null);
      return;
    }
    buscarPorNombre(debouncedBusqueda.trim());
  }, [debouncedBusqueda]);

  /* ─── Funciones de búsqueda ────────────────────────────── */
  /* ─────────────────────────────────────────────────────────────────
     BÚSQUEDA POR CÓDIGO ÚNICO
     ─  QR (hex 12-16)          → resultados de ESA FACTURA únicamente
     ─  Número FAC-xxx          → resultados de ESA FACTURA únicamente
     ─  Número puro (escaneo)   → resultados de ESA FACTURA únicamente
     ─  Nombre o cédula          →  TODO el historial del paciente
  ──────────────────────────────────────────────────────────────── */
  const buscarPorCodigo = useCallback(async (codigoIn) => {
    const raw = (codigoIn || codigo).trim();
    const codigoLimpio = raw.toUpperCase();
    if (!codigoLimpio) return;

    setLoading(true);
    setError('');
    setPaciente(null);
    setFacturaSeleccionada(null);
    setResultados([]);
    setPagoBloqueo(null);

    const headers = { Authorization: 'Bearer ' + localStorage.getItem('token') };

    /* Helper: buscar factura por cualquier identificador y devolver
       SOLO los resultados de esa factura */
    const buscarFactura = async (identificador) => {
      const r = await fetch(`/api/resultados/factura/${encodeURIComponent(identificador)}`, { headers });
      if (!r.ok) return false;
      const d = await r.json();
      if (d.success) {
        setPaciente(d.paciente);
        setFacturaSeleccionada(d.factura || null);
        setResultados(d.data || []);
        return true;
      }
      if (d.blocked) {
        setPagoBloqueo({ montoPendiente: d.montoPendiente, mensaje: d.message });
        return true;
      }
      return false;
    };

    try {
      /* ── 1. QR de factura (hex 12-16 chars) ────────────────────── */
      if (/^[A-F0-9]{12,16}$/.test(codigoLimpio)) {
        // El QR apunta al codigoQR de la factura → buscar por él
        const r = await fetch(`/api/resultados/qr/${codigoLimpio}`, { headers });
        if (r.ok) {
          const d = await r.json();
          if (d.success && !d.blocked) {
            setPaciente(d.paciente);
            setFacturaSeleccionada(d.factura || null);
            setResultados(d.data || []);
            return;
          }
          if (d.blocked) { setPagoBloqueo({ montoPendiente: d.montoPendiente, mensaje: d.message }); return; }
        }
        // Fallback: intentar como número de factura directamente (codigoBarras)
        if (await buscarFactura(codigoLimpio)) return;
      }

      /* ── 2. Número de factura completo: FAC-YYYYMM-NNNNN ──────── */
      if (/^FAC-/i.test(codigoLimpio)) {
        if (await buscarFactura(codigoLimpio)) return;
      }

      /* ── 3. Número escaneado del código de barras de la factura ── */
      //  El código de barras de la factura imprime el número "FAC-202602-00001"
      //  Si el escáner lo lee sin guiones u otros chars, lo normalizamos
      if (/^\d{3,}$/.test(codigoLimpio) || /^[A-Z0-9\-]{6,}$/.test(codigoLimpio)) {
        if (await buscarFactura(codigoLimpio)) return;
        // Probar como FAC- con padding
        const conPrefix = `FAC-${codigoLimpio}`;
        if (await buscarFactura(conPrefix)) return;
      }

      /* ── 4. Código de muestra individual (L1234 o lab-code) ───── */
      if (/^L\d+$/i.test(codigoLimpio)) {
        try {
          const resultado = await api.getResultadoPorCodigoMuestra(raw);
          const r = resultado?.data || resultado;
          if (r?.paciente) {
            const pac = await api.getPaciente(r.paciente._id || r.paciente);
            setPaciente(pac?.data || pac);
            setResultados([r]);
            return;
          }
        } catch { /* no encontrado */ }
      }

      setError(`No se encontró ninguna factura con el código: "${raw}". Use nombre o cédula para buscar el historial completo.`);
      setTimeout(() => { setCodigo(''); setError(''); }, 6000);
    } catch (err) {
      setError('Error de búsqueda: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [codigo]);


  const buscarPorNombre = async (q) => {
    setBuscando(true);
    setHistorialPaciente(null);
    try {
      const res = await fetch(`/api/citas/busqueda/paciente?query=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      const data = await res.json();
      // Extraer pacientes únicos de las citas
      const mapasPacientes = {};
      (data.data || []).forEach(cita => {
        const p = cita.paciente;
        if (p && p._id) mapasPacientes[p._id] = p;
      });
      setPacientesBusq(Object.values(mapasPacientes));
    } catch {
      setPacientesBusq([]);
    } finally {
      setBuscando(false);
    }
  };

  const verHistorialDePaciente = async (pacienteSelec) => {
    setLoading(true);
    try {
      const resResp = await api.getResultados({ paciente: pacienteSelec._id, limit: 50 });
      const allRes = Array.isArray(resResp) ? resResp : (resResp?.data || resResp || []);
      setPaciente(pacienteSelec);
      setResultados(allRes);
      setHistorialPaciente(pacienteSelec);
    } catch (err) {
      setError('Error cargando historial: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setCodigo(''); setPaciente(null); setResultados([]);
    setError(''); setPagoBloqueo(null);
    inputRef.current?.focus();
  };

  /* ─── Verificar pago e imprimir ───────────────────────── */
  const verificarPagoEImprimir = async (resultado) => {
    try {
      const r = await fetch(`/api/resultados/${resultado._id}/verificar-pago`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      const data = await r.json();
      if (data.puede_imprimir === false && data.monto_pendiente > 0) {
        setPagoBloqueo({
          montoPendiente: data.monto_pendiente,
          mensaje: `El paciente tiene saldo pendiente de RD$ ${data.monto_pendiente.toFixed(2)}. Liquide la factura antes de imprimir.`
        });
        return;
      }
      imprimirResultado(resultado);
    } catch {
      // Si falla la verificación, imprimir igualmente (no bloquear al personal)
      imprimirResultado(resultado);
    }
  };

  /* ─── Imprimir resultado ──────────────────────────────── */
  const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const calcularEdad = (f) => {
    if (!f) return 'N/A';
    const hoy = new Date(), nac = new Date(f);
    let e = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
    return e + ' años';
  };

  const imprimirResultado = (resultado) => {
    const ventana = window.open('', 'Resultado', 'width=800,height=1000');
    const valoresHTML = (resultado.valores || []).map(v => {
      const bg = v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd';
      const cl = v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404';
      return `<tr>
        <td style="padding:10px;border:1px solid #87CEEB">${escapeHtml(v.parametro)}</td>
        <td style="padding:10px;border:1px solid #87CEEB;text-align:center;font-weight:bold;color:#1a3a5c">${escapeHtml(v.valor)} ${escapeHtml(v.unidad)}</td>
        <td style="padding:10px;border:1px solid #87CEEB;text-align:center;color:#666">${escapeHtml(v.valorReferencia || '-')}</td>
        <td style="padding:10px;border:1px solid #87CEEB;text-align:center">
          <span style="padding:4px 12px;border-radius:12px;font-size:11px;background:${bg};color:${cl}">${escapeHtml(v.estado || 'N/A')}</span>
        </td></tr>`;
    }).join('');

    let html = `<!DOCTYPE html><html><head><title>Resultado</title>
    <style>
      @page{size:A4;margin:10mm 15mm}
      body{font-family:Arial,sans-serif;margin:0;padding:10px;color:#1a3a5c;font-size:12px}
      .header{text-align:center;border-bottom:3px solid #1a3a5c;padding-bottom:10px;margin-bottom:15px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;background:#f0f8ff;padding:12px;border-radius:8px;border-left:4px solid #1a3a5c;margin-bottom:15px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      th{background:#1a3a5c;color:white;padding:10px;text-align:left;font-size:11px}
      .firma{margin-top:50px;text-align:center}
      .firma-linea{border-top:2px solid #1a3a5c;width:200px;margin:0 auto;padding-top:8px}
      .footer{background:#1a3a5c;color:white;padding:10px;text-align:center;border-radius:5px;margin-top:15px;font-size:10px}
      @media print{.no-print{display:none}}
    </style></head><body>
    <div class="header">
      <img src="${escapeHtml(empresaConfig.logo_resultados || '/logo-centro.png')}" style="max-width:180px" onerror="this.src='/logo-centro.png'"/>
      <div style="font-size:10px;margin-top:5px">${escapeHtml(empresaConfig.empresa_direccion || '')} · Tel: ${escapeHtml(empresaConfig.empresa_telefono || '')}</div>
    </div>
    <div style="background:#1a3a5c;color:white;padding:8px 15px;border-radius:5px;margin:15px 0 10px;font-size:13px;font-weight:bold">INFORMACIÓN DEL PACIENTE</div>
    <div class="info-grid">
      <div><strong>Paciente:</strong> ${escapeHtml(paciente?.nombre)} ${escapeHtml(paciente?.apellido)}</div>
      <div><strong>Cédula:</strong> ${escapeHtml(paciente?.cedula || 'N/A')}</div>
      <div><strong>Edad:</strong> ${calcularEdad(paciente?.fechaNacimiento)}</div>
      <div><strong>Fecha:</strong> ${new Date(resultado.createdAt || new Date()).toLocaleDateString('es-DO')}</div>
    </div>
    <div style="background:#1a3a5c;color:white;padding:8px 15px;border-radius:5px;margin:15px 0 10px;font-size:13px;font-weight:bold">
      RESULTADO: ${escapeHtml(resultado.estudio?.nombre || 'ESTUDIO')}
    </div>
    <table><thead><tr>
      <th style="width:35%">Parámetro</th><th style="width:25%;text-align:center">Resultado</th>
      <th style="width:25%;text-align:center">Referencia</th><th style="width:15%;text-align:center">Estado</th>
    </tr></thead><tbody>
    ${valoresHTML || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999">Sin valores registrados</td></tr>'}
    </tbody></table>
    ${resultado.interpretacion ? `<div style="background:#e6f3ff;border-left:4px solid #1a3a5c;padding:10px;border-radius:5px;margin:10px 0"><strong>INTERPRETACIÓN:</strong><p style="margin:5px 0 0">${escapeHtml(resultado.interpretacion)}</p></div>` : ''}
    ${resultado.conclusion ? `<div style="background:#e8f5e9;border-left:4px solid #27ae60;padding:10px;border-radius:5px;margin:10px 0"><strong>CONCLUSIÓN:</strong><p style="margin:5px 0 0">${escapeHtml(resultado.conclusion)}</p></div>` : ''}
    <div class="firma"><div class="firma-linea">Dr(a). ${escapeHtml(resultado.validadoPor?.nombre || '________________')}</div>
    <div style="font-size:10px;color:#666;margin-top:3px">Firma y Sello</div></div>
    <div class="footer"><strong>¡Gracias por confiar en nosotros!</strong> | <span style="color:#87CEEB">Su salud es nuestra prioridad</span></div>
    <div class="no-print" style="text-align:center;padding:20px">
      <button onclick="window.print()" style="padding:15px 40px;background:#1a3a5c;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold">Imprimir</button>
    </div></body></html>`;

    ventana.document.write(html);
    ventana.document.close();
  };

  /* ─── Cálculo de edad ─────────────────────────────────── */
  const calcEdad = (f) => {
    if (!f) return 'N/A';
    const hoy = new Date(), nac = new Date(f);
    let e = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
    return e;
  };

  const getSeguroNombre = (p) => {
    if (!p?.seguro) return 'Sin seguro';
    return typeof p.seguro === 'object' ? p.seguro.nombre || 'Sin seguro' : p.seguro;
  };

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        {[
          { id: 'scanner', icon: <FaBarcode />, label: 'Escáner / Código' },
          { id: 'busqueda', icon: <FaSearch />, label: 'Buscar por Nombre' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '16px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15,
            background: tab === t.id ? `linear-gradient(135deg,${colores.azulOscuro},#2980b9)` : 'white',
            color: tab === t.id ? 'white' : '#666',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ════ PESTAÑA ESCÁNER ════ */}
      {tab === 'scanner' && (
        <>
          {/* Banner header */}
          <div style={{
            background: loading ? 'linear-gradient(135deg,#87CEEB,#1a3a5c)' :
              error ? 'linear-gradient(135deg,#ff6b6b,#c0392b)' :
                pagoBloqueo ? 'linear-gradient(135deg,#ffc107,#e67e22)' :
                  paciente ? 'linear-gradient(135deg,#27ae60,#2ecc71)' :
                    'linear-gradient(135deg,#1a3a5c,#2d5a87)',
            padding: '35px 40px', borderRadius: 20, marginBottom: 28,
            boxShadow: '0 12px 35px rgba(26,58,92,0.25)',
          }}>
            <div style={{ textAlign: 'center', color: 'white', marginBottom: 22 }}>
              <FaBarcode style={{ fontSize: 48, marginBottom: 12 }} />
              <h1 style={{ margin: 0, fontSize: 28 }}>
                {loading ? 'Buscando...' : error ? 'Error' : pagoBloqueo ? '⚠️ Pago Requerido' : paciente ? '✅ Paciente Encontrado' : 'Escanee el Código'}
              </h1>
              <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 15 }}>
                {loading ? 'Consultando base de datos...' :
                  error ? error :
                    pagoBloqueo ? pagoBloqueo.mensaje :
                      paciente ? `${paciente.nombre} ${paciente.apellido}` :
                        'Admite: código QR, FAC-XXXXXX, ORD00001, L1234 o número de muestra'}
              </p>
            </div>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <input
                ref={inputRef}
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                onKeyPress={e => e.key === 'Enter' && buscarPorCodigo()}
                placeholder="Escanee o escriba el código..."
                autoFocus
                style={{
                  width: '100%', padding: '18px 20px', fontSize: 26,
                  fontFamily: 'Courier New, monospace', fontWeight: 'bold',
                  textAlign: 'center', border: '3px solid rgba(255,255,255,0.6)',
                  borderRadius: 14, background: 'rgba(255,255,255,0.95)',
                  color: colores.azulOscuro, letterSpacing: 3,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={() => buscarPorCodigo()} disabled={loading || codigo.length < 1} style={{
                  flex: 1, padding: '14px', background: 'rgba(255,255,255,0.25)',
                  border: '2px solid white', borderRadius: 10, color: 'white',
                  cursor: 'pointer', fontSize: 15, fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSearch />} Buscar
                </button>
                {(paciente || error || pagoBloqueo) && (
                  <button onClick={limpiar} style={{
                    padding: '14px 20px', background: 'rgba(255,255,255,0.15)',
                    border: '2px solid white', borderRadius: 10, color: 'white',
                    cursor: 'pointer', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <FaTimes /> Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Alerta de pago pendiente (para el personal) */}
          {pagoBloqueo && (
            <div style={{
              background: '#fff3cd', border: '2px solid #ffc107', borderRadius: 14,
              padding: 20, marginBottom: 24,
              display: 'flex', alignItems: 'flex-start', gap: 15,
            }}>
              <FaExclamationTriangle style={{ fontSize: 30, color: '#e67e22', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ margin: '0 0 8px', color: '#7c5e00' }}>Pago Pendiente</h3>
                <p style={{ margin: '0 0 6px', color: '#856404' }}>{pagoBloqueo.mensaje}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                  ℹ️ El personal interno puede ingresar y editar resultados normalmente. Solo se restringe la impresión para entrega al paciente.
                </p>
              </div>
            </div>
          )}

          {/* Resultados del paciente */}
          {paciente && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
              {/* Tarjeta paciente */}
              <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: `5px solid ${colores.azulOscuro}`, height: 'fit-content' }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ width: 72, height: 72, background: `linear-gradient(135deg,${colores.azulCielo},${colores.azulOscuro})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 30, color: 'white' }}>
                    <FaUser />
                  </div>
                  <h2 style={{ margin: 0, color: colores.azulOscuro, fontSize: 18 }}>{paciente.nombre} {paciente.apellido}</h2>
                </div>
                <div style={{ background: '#f0f8ff', padding: 14, borderRadius: 10, fontSize: 13 }}>
                  {[
                    ['Cédula', paciente.cedula],
                    ['Teléfono', paciente.telefono],
                    ['Edad', `${calcEdad(paciente.fechaNacimiento)} años`],
                    ['Sexo', paciente.sexo === 'M' ? 'Masculino' : 'Femenino'],
                    ['Seguro', getSeguroNombre(paciente)],
                  ].map(([label, val]) => val && (
                    <div key={label} style={{ marginBottom: 7 }}>
                      <strong>{label}:</strong> {val}
                    </div>
                  ))}
                </div>
                {facturaSeleccionada && facturaSeleccionada.codigoLIS && (
                  <div style={{ marginTop: 15, background: '#eef2f5', padding: 14, borderRadius: 10, textAlign: 'center', border: '2px dashed #1a3a5c' }}>
                    <div style={{ fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>ID LIS (MÁQUINAS)</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1a3a5c', fontFamily: 'monospace', letterSpacing: 2 }}>{facturaSeleccionada.codigoLIS}</div>
                  </div>
                )}
              </div>

              {/* Lista de resultados */}
              <div>
                <h3 style={{ marginBottom: 18, color: colores.azulOscuro, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaFlask style={{ color: colores.azulCielo }} /> Resultados ({resultados.length})
                </h3>
                {resultados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 50, background: 'white', borderRadius: 14 }}>
                    <FaFlask style={{ fontSize: 50, color: colores.azulCielo, marginBottom: 18 }} />
                    <p style={{ color: '#999', fontSize: 16 }}>No hay resultados registrados</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 14 }}>
                    {resultados.map(r => (
                      <div key={r._id} style={{
                        padding: 20, background: 'white',
                        border: `2px solid ${r.estado === 'completado' ? '#27ae60' : colores.azulCielo}`,
                        borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      }}>
                        <div>
                          <h4 style={{ margin: '0 0 6px', color: colores.azulOscuro }}>{r.estudio?.nombre || 'Estudio'}</h4>
                          <div style={{ fontSize: 13, color: '#666' }}>
                            {new Date(r.createdAt).toLocaleDateString('es-DO')}
                            {' · '}
                            {r.codigoMuestra && <span>#{r.codigoMuestra} · </span>}
                            {r.estado === 'completado'
                              ? <span style={{ color: '#27ae60' }}><FaCheckCircle /> Listo</span>
                              : <span style={{ color: '#f39c12' }}><FaClock /> {r.estado}</span>}
                          </div>
                        </div>
                        {r.estado === 'completado' && (
                          <button
                            onClick={() => verificarPagoEImprimir(r)}
                            style={{
                              padding: '11px 22px', background: colores.azulOscuro,
                              color: 'white', border: 'none', borderRadius: 10,
                              cursor: 'pointer', fontWeight: 'bold', fontSize: 14,
                              display: 'flex', alignItems: 'center', gap: 7,
                            }}
                          >
                            <FaPrint /> IMPRIMIR
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guía de uso (sin resultados) */}
          {!paciente && !loading && (
            <div style={{ background: 'white', padding: 32, borderRadius: 18, borderTop: `5px solid ${colores.azulOscuro}` }}>
              <h3 style={{ margin: '0 0 18px', color: colores.azulOscuro }}>📋 ¿Cómo usar la Consulta Rápida?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
                {[
                  { n: 1, t: '🔍 Escanee el código', d: 'Use el lector en la factura del paciente o ingrese el código manualmente' },
                  { n: 2, t: '⚡ Búsqueda automática', d: 'El sistema detecta el tipo de código y busca al instante' },
                  { n: 3, t: '🖨️ Imprima resultados', d: 'El sistema verifica el pago antes de permitir la impresión' },
                ].map(item => (
                  <div key={item.n} style={{ display: 'flex', gap: 14, padding: 15, background: '#f8f9fa', borderRadius: 12 }}>
                    <div style={{ width: 40, height: 40, minWidth: 40, background: colores.azulOscuro, color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16 }}>
                      {item.n}
                    </div>
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4 }}>{item.t}</strong>
                      <span style={{ fontSize: 13, color: '#666' }}>{item.d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </>
      )}

      {/* ════ PESTAÑA BÚSQUEDA POR NOMBRE ════ */}
      {tab === 'busqueda' && (
        <div>
          {/* Barra de búsqueda */}
          <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: colores.azulOscuro }}>🔍 Búsqueda por Nombre, Cédula o Teléfono</h3>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 18 }} />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Escriba el nombre, cédula o teléfono del paciente..."
                autoFocus={tab === 'busqueda'}
                style={{
                  width: '100%', padding: '16px 16px 16px 48px',
                  fontSize: 16, border: '2px solid #e0e0e0', borderRadius: 12,
                  boxSizing: 'border-box', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2980b9'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
              {buscando && (
                <FaSpinner style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#2980b9', animation: 'spin 1s linear infinite' }} />
              )}
            </div>
            {busqueda.length > 0 && busqueda.length < 2 && (
              <p style={{ margin: '8px 0 0', color: '#888', fontSize: 13 }}>Ingrese al menos 2 caracteres para buscar</p>
            )}
          </div>

          {/* Resultados de búsqueda */}
          {historialPaciente && (
            <div style={{ background: '#e8f4fd', border: '2px solid #2980b9', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#1a3a5c', fontWeight: 600 }}>
                📋 Mostrando historial de: <strong>{historialPaciente.nombre} {historialPaciente.apellido}</strong>
              </span>
              <button onClick={() => { setHistorialPaciente(null); setPaciente(null); setResultados([]); }} style={{ background: 'transparent', border: 'none', color: '#1a3a5c', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}>×</button>
            </div>
          )}

          {pacientesBusq.length > 0 && !historialPaciente && (
            <div>
              <h4 style={{ color: colores.azulOscuro, marginBottom: 14 }}>Pacientes encontrados ({pacientesBusq.length})</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                {pacientesBusq.map(p => (
                  <div key={p._id} onClick={() => verHistorialDePaciente(p)} style={{
                    background: 'white', padding: '16px 20px', borderRadius: 12,
                    cursor: 'pointer', border: '2px solid transparent',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 0.18s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2980b9'; e.currentTarget.style.background = '#f0f8ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg,${colores.azulCielo},${colores.azulOscuro})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FaUser style={{ color: 'white', fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: colores.azulOscuro, fontSize: 16 }}>{p.nombre} {p.apellido}</div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 3 }}>
                        {p.cedula && <span>📋 {p.cedula} &nbsp;</span>}
                        {p.telefono && <span>📞 {p.telefono} &nbsp;</span>}
                        {p.email && <span>✉️ {p.email}</span>}
                      </div>
                    </div>
                    <div style={{ color: '#2980b9', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Ver historial →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial del paciente */}
          {historialPaciente && paciente && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
              <div style={{ background: 'white', padding: 22, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: `5px solid ${colores.azulOscuro}`, height: 'fit-content' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ width: 64, height: 64, background: `linear-gradient(135deg,${colores.azulCielo},${colores.azulOscuro})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26, color: 'white' }}>
                    <FaUser />
                  </div>
                  <h3 style={{ margin: 0, color: colores.azulOscuro, fontSize: 16 }}>{paciente.nombre} {paciente.apellido}</h3>
                </div>
                <div style={{ fontSize: 13, background: '#f0f8ff', padding: 12, borderRadius: 10 }}>
                  {paciente.cedula && <div style={{ marginBottom: 6 }}><strong>Cédula:</strong> {paciente.cedula}</div>}
                  {paciente.telefono && <div style={{ marginBottom: 6 }}><strong>Teléfono:</strong> {paciente.telefono}</div>}
                  {paciente.fechaNacimiento && <div style={{ marginBottom: 6 }}><strong>Edad:</strong> {calcEdad(paciente.fechaNacimiento)} años</div>}
                  <div><strong>Seguro:</strong> {getSeguroNombre(paciente)}</div>
                </div>
              </div>

              <div>
                <h3 style={{ color: colores.azulOscuro, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaFlask style={{ color: colores.azulCielo }} /> Historial Completo ({resultados.length})
                </h3>
                {resultados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 14 }}>
                    <FaFlask style={{ fontSize: 40, color: colores.azulCielo, marginBottom: 14 }} />
                    <p style={{ color: '#999' }}>Sin resultados en el historial</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {resultados.map(r => (
                      <div key={r._id} style={{ padding: 18, background: 'white', borderRadius: 12, border: `2px solid ${r.estado === 'completado' ? '#27ae60' : colores.azulCielo}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div>
                          <h4 style={{ margin: '0 0 5px', color: colores.azulOscuro }}>{r.estudio?.nombre || 'Estudio'}</h4>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {new Date(r.createdAt).toLocaleDateString('es-DO')} · #{r.codigoMuestra}
                            {' · '}
                            {r.estado === 'completado'
                              ? <span style={{ color: '#27ae60' }}>✅ Completado</span>
                              : <span style={{ color: '#f39c12' }}>⏳ {r.estado}</span>}
                          </div>
                        </div>
                        {r.estado === 'completado' && (
                          <button onClick={() => verificarPagoEImprimir(r)} style={{ padding: '9px 18px', background: colores.azulOscuro, color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FaPrint /> Imprimir
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {debouncedBusqueda.length >= 2 && !buscando && pacientesBusq.length === 0 && !historialPaciente && (
            <div style={{ textAlign: 'center', padding: 50, background: 'white', borderRadius: 14 }}>
              <FaUser style={{ fontSize: 40, color: '#ccc', marginBottom: 16 }} />
              <p style={{ color: '#888', fontSize: 16 }}>No se encontraron pacientes con "{debouncedBusqueda}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsultaRapida;
