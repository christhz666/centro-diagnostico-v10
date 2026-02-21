import React, { useState, useEffect } from 'react';
import { FaUserMd, FaSearch, FaUser, FaFlask, FaEye, FaSpinner, FaFileMedical, FaEdit, FaCheck, FaPrint, FaSave, FaPlus } from 'react-icons/fa';
import api from '../services/api';

const PortalMedico = () => {
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [resultadoDetalle, setResultadoDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Constantes para formato de códigos
  // Nuevo formato simple: L1328 (lab) o 1329 (otras áreas)
  const CODIGO_MUESTRA_SIMPLE_MIN_LENGTH = 1;
  // Formato antiguo para retrocompatibilidad
  const CODIGO_MUESTRA_PREFIX = 'MUE-';
  const CODIGO_MUESTRA_MIN_LENGTH = 13; // MUE-YYYYMMDD-NNNNN tiene 18, pero buscamos con 13+ para ser flexibles

  const colores = {
    azulCielo: '#87CEEB',
    azulOscuro: '#1a3a5c'
  };

  const buscarPacientes = async () => {
    if (!busqueda.trim()) {
      // Si no hay busqueda, cargar todos los pacientes
      try {
        setLoading(true);
        const response = await api.getPacientes({});
        const datos = response.data || response || [];
        setPacientes(Array.isArray(datos) ? datos : []);
      } catch (err) {
        console.error('Error:', err);
        setPacientes([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Si la búsqueda parece un código de muestra simple (L1328 o 1329) o formato antiguo (MUE-YYYYMMDD-NNNNN)
    const esFormatoSimple = /^L?\d+$/.test(busqueda);
    if (esFormatoSimple || (busqueda.startsWith(CODIGO_MUESTRA_PREFIX) && busqueda.length >= CODIGO_MUESTRA_MIN_LENGTH)) {
      try {
        setLoading(true);
        const response = await api.getResultadoPorCodigoMuestra(busqueda);
        const resultado = response.data || response;
        if (resultado && resultado.paciente) {
          // Buscar el paciente completo
          const pacienteId = resultado.paciente._id || resultado.paciente.id || resultado.paciente;
          const pacResponse = await api.getPaciente(pacienteId);
          const pac = pacResponse.data || pacResponse;
          setPacientes([pac]);
          // Auto-cargar el historial
          await cargarHistorial(pac);
        }
      } catch (err) {
        console.error('Error buscando por código:', err);
        setPacientes([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const response = await api.getPacientes({ search: busqueda });
      let datos = response.data || response || [];
      
      // Asegurar que es un array
      if (!Array.isArray(datos)) {
        datos = [];
      }

      // Si no hay resultados con search, filtrar manualmente
      if (datos.length === 0) {
        const allResponse = await api.getPacientes({});
        const allDatos = allResponse.data || allResponse || [];
        const busquedaLower = busqueda.toLowerCase();
        datos = allDatos.filter(p => 
          (p.nombre && p.nombre.toLowerCase().includes(busquedaLower)) ||
          (p.apellido && p.apellido.toLowerCase().includes(busquedaLower)) ||
          (p.cedula && p.cedula.includes(busqueda)) ||
          (p.telefono && p.telefono.includes(busqueda))
        );
      }

      setPacientes(datos);
    } catch (err) {
      console.error('Error buscando:', err);
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async (paciente) => {
    setPacienteSeleccionado(paciente);
    setResultadoDetalle(null);
    setEditando(false);
    
    try {
      setLoadingHistorial(true);
      const pacienteId = paciente._id || paciente.id;
      
      // Usar el endpoint dedicado para cargar resultados por paciente
      const response = await api.getResultadosPorPaciente(pacienteId);
      const datos = response.data || response || [];
      
      setHistorial(Array.isArray(datos) ? datos : []);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const verResultado = (resultado) => {
    setResultadoDetalle(resultado);
    setEditando(false);
  };

  const guardarResultado = async () => {
    if (!resultadoDetalle) return;
    try {
      setGuardando(true);
      const id = resultadoDetalle._id || resultadoDetalle.id;
      await api.updateResultado(resultadoDetalle._id || resultadoDetalle.id, {
        valores: resultadoDetalle.valores,
        interpretacion: resultadoDetalle.interpretacion,
        conclusion: resultadoDetalle.conclusion,
        estado: 'completado'
      });
      setEditando(false);
      alert('Resultado guardado correctamente');
      cargarHistorial(pacienteSeleccionado);
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const validarResultado = async () => {
    if (!resultadoDetalle) return;
    const id = resultadoDetalle._id || resultadoDetalle.id;
    try {
      setGuardando(true);
      await api.validarResultado(id, { estado: 'completado' });
      alert('Resultado validado correctamente');
      cargarHistorial(pacienteSeleccionado);
      setResultadoDetalle(null);
    } catch (err) {
      try {
        await api.updateResultado(id, { estado: 'completado' });
        alert('Resultado validado correctamente');
        cargarHistorial(pacienteSeleccionado);
        setResultadoDetalle(null);
      } catch (err2) {
        alert('Error al validar: ' + (err2.message || 'Error desconocido'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const actualizarValor = (index, campo, valor) => {
    const nuevosValores = [...(resultadoDetalle.valores || [])];
    nuevosValores[index] = { ...nuevosValores[index], [campo]: valor };
    setResultadoDetalle({ ...resultadoDetalle, valores: nuevosValores });
  };

  const agregarParametro = () => {
    const nuevosValores = [...(resultadoDetalle.valores || []), {
      parametro: '',
      valor: '',
      unidad: '',
      valorReferencia: '',
      estado: 'normal'
    }];
    setResultadoDetalle({ ...resultadoDetalle, valores: nuevosValores });
  };

  const eliminarParametro = (index) => {
    const nuevosValores = (resultadoDetalle.valores || []).filter((_, i) => i !== index);
    setResultadoDetalle({ ...resultadoDetalle, valores: nuevosValores });
  };

  const calcularEdad = (fecha) => {
    if (!fecha) return 'N/A';
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad + ' años';
  };

  const getSeguroNombre = (pac) => {
    if (!pac?.seguro) return 'Sin seguro';
    if (typeof pac.seguro === 'string') return pac.seguro;
    if (typeof pac.seguro === 'object') return pac.seguro.nombre || 'Sin seguro';
    return 'Sin seguro';
  };

  const imprimirResultado = () => {
    if (!resultadoDetalle || !pacienteSeleccionado) return;

    const ventana = window.open('', 'Resultado', 'width=800,height=1000');
    
    const valoresHTML = (resultadoDetalle.valores || []).map(v => {
      const estadoColor = v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd';
      const estadoTexto = v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404';
      return '<tr>' +
        '<td style="padding:10px;border:1px solid #87CEEB;">' + (v.parametro || '') + '</td>' +
        '<td style="padding:10px;border:1px solid #87CEEB;text-align:center;font-weight:bold;color:#1a3a5c;">' + (v.valor || '') + ' ' + (v.unidad || '') + '</td>' +
        '<td style="padding:10px;border:1px solid #87CEEB;text-align:center;font-size:12px;color:#666;">' + (v.valorReferencia || '-') + '</td>' +
        '<td style="padding:10px;border:1px solid #87CEEB;text-align:center;">' +
          '<span style="padding:4px 12px;border-radius:12px;font-size:11px;background:' + estadoColor + ';color:' + estadoTexto + ';">' + (v.estado || 'N/A') + '</span>' +
        '</td>' +
      '</tr>';
    }).join('');

    const edadPaciente = calcularEdad(pacienteSeleccionado.fechaNacimiento);
    const nombreEstudio = resultadoDetalle.estudio?.nombre || resultadoDetalle.nombreEstudio || 'ESTUDIO CLINICO';
    const fechaResultado = new Date(resultadoDetalle.createdAt || resultadoDetalle.fecha || new Date()).toLocaleDateString('es-DO');
    const doctorNombre = resultadoDetalle.validadoPor?.nombre || resultadoDetalle.medico?.nombre || '________________';
    
    let htmlContent = '<!DOCTYPE html><html><head>';
    htmlContent += '<title>Resultado - ' + pacienteSeleccionado.nombre + '</title>';
    htmlContent += '<style>';
    htmlContent += '@page { size: A4; margin: 10mm 15mm; }';
    htmlContent += 'body { font-family: Arial, sans-serif; margin: 0; padding: 10px; color: #1a3a5c; font-size: 12px; }';
    htmlContent += '.header { text-align: center; border-bottom: 3px solid #1a3a5c; padding-bottom: 10px; margin-bottom: 15px; }';
    htmlContent += '.header img { max-width: 180px; }';
    htmlContent += '.section-title { background: #1a3a5c; color: white; padding: 8px 15px; border-radius: 5px; margin: 15px 0 10px; font-size: 13px; font-weight: bold; }';
    htmlContent += '.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; background: #f0f8ff; padding: 12px; border-radius: 8px; border-left: 4px solid #1a3a5c; margin-bottom: 15px; }';
    htmlContent += 'table { width: 100%; border-collapse: collapse; margin: 10px 0; }';
    htmlContent += 'th { background: #1a3a5c; color: white; padding: 10px; text-align: left; font-size: 11px; }';
    htmlContent += '.firma { margin-top: 50px; text-align: center; }';
    htmlContent += '.firma-linea { border-top: 2px solid #1a3a5c; width: 200px; margin: 0 auto; padding-top: 8px; }';
    htmlContent += '.footer { background: #1a3a5c; color: white; padding: 10px; text-align: center; border-radius: 5px; margin-top: 15px; font-size: 10px; }';
    htmlContent += '@media print { .no-print { display: none; } }';
    htmlContent += '</style></head><body>';
    
    htmlContent += '<div class="header">';
    htmlContent += '<img src="https://miesperanzalab.com/wp-content/uploads/2024/10/Logo-Mie-esperanza-Lab-Color-400x190-1.png" alt="Mi Esperanza Lab" />';
    htmlContent += '<div style="font-size:10px;margin-top:5px;">C/ Camino de Cancino #24, Cancino Adentro, Santo Domingo Este, Rep. Dom.<br/>Tel: 849-288-9790 / 809-986-9970 | miesperanzalab@gmail.com</div>';
    htmlContent += '</div>';
    
    htmlContent += '<div class="section-title">INFORMACION DEL PACIENTE</div>';
    
    htmlContent += '<div class="info-grid">';
    htmlContent += '<div><strong>Paciente:</strong> ' + pacienteSeleccionado.nombre + ' ' + (pacienteSeleccionado.apellido || '') + '</div>';
    htmlContent += '<div><strong>Cedula:</strong> ' + (pacienteSeleccionado.cedula || 'N/A') + '</div>';
    htmlContent += '<div><strong>Edad:</strong> ' + edadPaciente + '</div>';
    htmlContent += '<div><strong>Sexo:</strong> ' + (pacienteSeleccionado.sexo === 'M' ? 'Masculino' : 'Femenino') + '</div>';
    htmlContent += '<div><strong>Nacionalidad:</strong> ' + (pacienteSeleccionado.nacionalidad || 'Dominicano') + '</div>';
    htmlContent += '<div><strong>Fecha:</strong> ' + fechaResultado + '</div>';
    htmlContent += '</div>';
    
    htmlContent += '<div class="section-title">RESULTADO: ' + nombreEstudio + '</div>';
    
    htmlContent += '<table><thead><tr>';
    htmlContent += '<th style="width:35%;">Parametro</th>';
    htmlContent += '<th style="width:25%;text-align:center;">Resultado</th>';
    htmlContent += '<th style="width:25%;text-align:center;">Valor Referencia</th>';
    htmlContent += '<th style="width:15%;text-align:center;">Estado</th>';
    htmlContent += '</tr></thead><tbody>';
    htmlContent += valoresHTML || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999;">Sin valores</td></tr>';
    htmlContent += '</tbody></table>';
    
    if (resultadoDetalle.interpretacion) {
      htmlContent += '<div style="background:#e6f3ff;border-left:4px solid #1a3a5c;padding:10px;border-radius:5px;margin:10px 0;">';
      htmlContent += '<strong>INTERPRETACION:</strong><p style="margin:5px 0 0;">' + resultadoDetalle.interpretacion + '</p></div>';
    }
    
    if (resultadoDetalle.conclusion) {
      htmlContent += '<div style="background:#e8f5e9;border-left:4px solid #27ae60;padding:10px;border-radius:5px;margin:10px 0;">';
      htmlContent += '<strong>CONCLUSION:</strong><p style="margin:5px 0 0;">' + resultadoDetalle.conclusion + '</p></div>';
    }
    
    htmlContent += '<div class="firma"><div class="firma-linea">Dr(a). ' + doctorNombre + '</div>';
    htmlContent += '<div style="font-size:10px;color:#666;margin-top:3px;">Firma y Sello</div></div>';
    
    htmlContent += '<div class="footer"><strong>Gracias por confiar en nosotros!</strong> | <span style="color:#87CEEB;">Su salud es nuestra prioridad</span></div>';
    
    htmlContent += '<div class="no-print" style="text-align:center;padding:20px;">';
    htmlContent += '<button onclick="window.print()" style="padding:15px 40px;background:#1a3a5c;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Imprimir</button></div>';
    
    htmlContent += '</body></html>';
    
    ventana.document.write(htmlContent);
    ventana.document.close();
  };

  // Cargar pacientes al inicio
  useEffect(() => {
    buscarPacientes();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25, color: colores.azulOscuro }}>
        <FaUserMd style={{ color: colores.azulCielo }} /> Portal Medico
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: pacienteSeleccionado ? '350px 1fr' : '1fr', gap: 20 }}>
        {/* Panel izquierdo: Busqueda */}
        <div style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 2px 15px rgba(0,0,0,0.1)', borderTop: `5px solid ${colores.azulOscuro}` }}>
          <h3 style={{ marginTop: 0, color: colores.azulOscuro }}>Buscar Paciente</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              placeholder="Nombre, cedula..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && buscarPacientes()}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${colores.azulCielo}` }}
            />
            <button onClick={buscarPacientes} disabled={loading}
              style={{ padding: '12px 20px', background: colores.azulOscuro, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {loading ? <FaSpinner className="spin" /> : <FaSearch />}
            </button>
          </div>

          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <FaSpinner className="spin" style={{ fontSize: 30, color: colores.azulCielo }} />
              </div>
            ) : pacientes.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
                No hay pacientes
              </p>
            ) : (
              pacientes.map(p => (
                <div
                  key={p._id || p.id}
                  onClick={() => cargarHistorial(p)}
                  style={{
                    padding: 15,
                    border: `2px solid ${(pacienteSeleccionado?._id || pacienteSeleccionado?.id) === (p._id || p.id) ? colores.azulOscuro : '#eee'}`,
                    borderRadius: 10,
                    marginBottom: 10,
                    cursor: 'pointer',
                    background: (pacienteSeleccionado?._id || pacienteSeleccionado?.id) === (p._id || p.id) ? '#f0f8ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, background: colores.azulCielo, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaUser style={{ color: colores.azulOscuro }} />
                    </div>
                    <div>
                      <strong style={{ color: colores.azulOscuro }}>{p.nombre} {p.apellido}</strong>
                      <div style={{ fontSize: 12, color: '#666' }}>{p.cedula} | {p.telefono}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: Historial y Resultados */}
        {pacienteSeleccionado && (
          <div style={{ background: 'white', padding: 25, borderRadius: 15, boxShadow: '0 2px 15px rgba(0,0,0,0.1)' }}>
            {/* Info del paciente */}
            <div style={{ background: '#f0f8ff', padding: 20, borderRadius: 10, marginBottom: 20, borderLeft: `5px solid ${colores.azulOscuro}` }}>
              <h3 style={{ margin: '0 0 15px', color: colores.azulOscuro }}>
                {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, fontSize: 14 }}>
                <div><strong>Cedula:</strong> {pacienteSeleccionado.cedula}</div>
                <div><strong>Edad:</strong> {calcularEdad(pacienteSeleccionado.fechaNacimiento)}</div>
                <div><strong>Sexo:</strong> {pacienteSeleccionado.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                <div><strong>Telefono:</strong> {pacienteSeleccionado.telefono}</div>
                <div><strong>Nacionalidad:</strong> {pacienteSeleccionado.nacionalidad || 'Dominicano'}</div>
                <div><strong>Seguro:</strong> {getSeguroNombre(pacienteSeleccionado)}</div>
              </div>
            </div>

            {/* Historial de resultados */}
            {!resultadoDetalle && (
              <>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: colores.azulOscuro }}>
                  <FaFileMedical style={{ color: colores.azulCielo }} /> Historial de Resultados
                </h4>

                {loadingHistorial ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <FaSpinner className="spin" style={{ fontSize: 40, color: colores.azulCielo }} />
                  </div>
                ) : historial.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <FaFlask style={{ fontSize: 50, marginBottom: 15, color: colores.azulCielo }} />
                    <p>No hay resultados registrados para este paciente</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {historial.map(r => (
                      <div
                        key={r._id || r.id}
                        style={{
                          padding: 15,
                          border: `2px solid ${r.estado === 'completado' ? '#27ae60' : colores.azulCielo}`,
                          borderRadius: 10,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: r.estado === 'completado' ? '#f8fff8' : '#fffef8'
                        }}
                      >
                        <div>
                          <strong style={{ color: colores.azulOscuro }}>{r.estudio?.nombre || r.nombreEstudio || 'Estudio'}</strong>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
                            {new Date(r.createdAt || r.fecha).toLocaleDateString('es-DO')}
                            <span style={{
                              marginLeft: 10,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              background: r.estado === 'completado' ? '#d4edda' : '#fff3cd',
                              color: r.estado === 'completado' ? '#155724' : '#856404'
                            }}>
                              {r.estado || 'pendiente'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => verResultado(r)}
                          style={{ 
                            padding: '10px 20px', 
                            background: colores.azulOscuro, 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: 8, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: 'bold'
                          }}
                        >
                          <FaEye /> Ver / Editar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Detalle del resultado */}
            {resultadoDetalle && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, color: colores.azulOscuro }}>
                    {resultadoDetalle.estudio?.nombre || resultadoDetalle.nombreEstudio || 'Resultado'}
                  </h4>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!editando ? (
                      <>
                        <button onClick={() => setEditando(true)} style={{
                          padding: '8px 15px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                        }}>
                          <FaEdit /> Editar
                        </button>
                        <button onClick={imprimirResultado} style={{
                          padding: '8px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                        }}>
                          <FaPrint /> Imprimir
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={guardarResultado} disabled={guardando} style={{
                          padding: '8px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                        }}>
                          {guardando ? <FaSpinner className="spin" /> : <FaSave />} Guardar
                        </button>
                        <button onClick={() => setEditando(false)} style={{
                          padding: '8px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer'
                        }}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tabla de valores */}
                <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: colores.azulOscuro, color: 'white' }}>
                        <th style={{ padding: 12, textAlign: 'left' }}>Parametro</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Valor</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Unidad</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Referencia</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Estado</th>
                        {editando && <th style={{ padding: 12, width: 50 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(resultadoDetalle.valores || []).length === 0 ? (
                        <tr>
                          <td colSpan={editando ? 6 : 5} style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                            {editando ? 'Agregue parametros con el boton de abajo' : 'Sin valores registrados'}
                          </td>
                        </tr>
                      ) : (
                        (resultadoDetalle.valores || []).map((v, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${colores.azulCielo}` }}>
                            <td style={{ padding: 10 }}>
                              {editando ? (
                                <input value={v.parametro || ''} onChange={e => actualizarValor(i, 'parametro', e.target.value)}
                                  placeholder="Nombre del parametro"
                                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : v.parametro}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              {editando ? (
                                <input value={v.valor || ''} onChange={e => actualizarValor(i, 'valor', e.target.value)}
                                  placeholder="Valor"
                                  style={{ width: 80, padding: 8, border: '1px solid #ddd', borderRadius: 4, textAlign: 'center' }} />
                              ) : <strong style={{ color: colores.azulOscuro }}>{v.valor}</strong>}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              {editando ? (
                                <input value={v.unidad || ''} onChange={e => actualizarValor(i, 'unidad', e.target.value)}
                                  placeholder="Unidad"
                                  style={{ width: 60, padding: 8, border: '1px solid #ddd', borderRadius: 4, textAlign: 'center' }} />
                              ) : v.unidad}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center', color: '#666' }}>
                              {editando ? (
                                <input value={v.valorReferencia || ''} onChange={e => actualizarValor(i, 'valorReferencia', e.target.value)}
                                  placeholder="Ej: 70-100"
                                  style={{ width: 100, padding: 8, border: '1px solid #ddd', borderRadius: 4, textAlign: 'center' }} />
                              ) : v.valorReferencia || '-'}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              {editando ? (
                                <select value={v.estado || 'normal'} onChange={e => actualizarValor(i, 'estado', e.target.value)}
                                  style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}>
                                  <option value="normal">Normal</option>
                                  <option value="alto">Alto</option>
                                  <option value="bajo">Bajo</option>
                                </select>
                              ) : (
                                <span style={{
                                  padding: '4px 12px', borderRadius: 12, fontSize: 12,
                                  background: v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd',
                                  color: v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404'
                                }}>
                                  {v.estado || 'N/A'}
                                </span>
                              )}
                            </td>
                            {editando && (
                              <td style={{ padding: 10 }}>
                                <button onClick={() => eliminarParametro(i)} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>×</button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {editando && (
                    <button onClick={agregarParametro} style={{
                      marginTop: 10, padding: '10px 20px', background: colores.azulCielo, color: colores.azulOscuro, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold'
                    }}>
                      <FaPlus /> Agregar Parametro
                    </button>
                  )}
                </div>

                {/* Interpretacion */}
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 'bold', color: colores.azulOscuro, display: 'block', marginBottom: 5 }}>Interpretacion:</label>
                  {editando ? (
                    <textarea value={resultadoDetalle.interpretacion || ''} 
                      onChange={e => setResultadoDetalle({...resultadoDetalle, interpretacion: e.target.value})}
                      placeholder="Escriba la interpretacion de los resultados..."
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', minHeight: 80 }} />
                  ) : (
                    <p style={{ background: '#f0f8ff', padding: 12, borderRadius: 6, margin: 0, borderLeft: `4px solid ${colores.azulOscuro}` }}>
                      {resultadoDetalle.interpretacion || 'Sin interpretacion'}
                    </p>
                  )}
                </div>

                {/* Conclusion */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 'bold', color: colores.azulOscuro, display: 'block', marginBottom: 5 }}>Conclusion:</label>
                  {editando ? (
                    <textarea value={resultadoDetalle.conclusion || ''} 
                      onChange={e => setResultadoDetalle({...resultadoDetalle, conclusion: e.target.value})}
                      placeholder="Escriba la conclusion..."
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', minHeight: 80 }} />
                  ) : (
                    <p style={{ background: '#e8f5e9', padding: 12, borderRadius: 6, margin: 0, borderLeft: '4px solid #27ae60' }}>
                      {resultadoDetalle.conclusion || 'Sin conclusion'}
                    </p>
                  )}
                </div>

                {/* Botones de accion */}
                {resultadoDetalle.estado !== 'completado' && !editando && (
                  <button onClick={validarResultado} disabled={guardando} style={{
                    width: '100%', padding: 15, background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10
                  }}>
                    {guardando ? <FaSpinner className="spin" /> : <FaCheck />} Validar y Completar Resultado
                  </button>
                )}

                <button onClick={() => setResultadoDetalle(null)} style={{
                  width: '100%', padding: 12, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
                }}>
                  Volver al Historial
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalMedico;
