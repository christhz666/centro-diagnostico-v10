import React, { useState, useEffect, useRef } from 'react';
import { FaBarcode, FaSearch, FaUser, FaFlask, FaPrint, FaCheckCircle, FaClock, FaTimes, FaSpinner } from 'react-icons/fa';
import api from '../services/api';

const ConsultaRapida = () => {
  const [codigo, setCodigo] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState(null);
  const inputRef = useRef(null);

  // Constantes para códigos
  const CODIGO_PACIENTE_PREFIX = 'PAC';
  const CODIGO_PACIENTE_MIN_LENGTH = 8;
  const CODIGO_MUESTRA_PREFIX = 'MUE-';
  const CODIGO_MUESTRA_MIN_LENGTH = 13; // Formato completo: MUE-YYYYMMDD-NNNNN (18 chars)

  // Enfocar el input automáticamente para el escáner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Buscar cuando el código tenga el formato correcto
  useEffect(() => {
    const tieneFormatoPaciente = codigo.length >= CODIGO_PACIENTE_MIN_LENGTH && codigo.startsWith(CODIGO_PACIENTE_PREFIX);
    const tieneFormatoMuestra = codigo.length >= CODIGO_MUESTRA_MIN_LENGTH && codigo.startsWith(CODIGO_MUESTRA_PREFIX);
    
    if (tieneFormatoPaciente || tieneFormatoMuestra) {
      buscarPaciente();
    }
  }, [codigo]);

  const buscarPaciente = async () => {
    if (!codigo.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      setPaciente(null);
      setResultados([]);

      // Si es un código de muestra (MUE-YYYYMMDD-NNNNN), buscar el resultado
      if (codigo.startsWith(CODIGO_MUESTRA_PREFIX) && codigo.length >= CODIGO_MUESTRA_MIN_LENGTH) {
        try {
          const response = await api.getResultadoPorCodigoMuestra(codigo);
          const resultado = response.data || response;
          if (resultado && resultado.paciente) {
            const pacienteId = resultado.paciente._id || resultado.paciente.id || resultado.paciente;
            const pacResponse = await api.getPaciente(pacienteId);
            const pac = pacResponse.data || pacResponse;
            setPaciente(pac);
            setResultados([resultado]);
            setResultadoSeleccionado(resultado);
            return;
          }
        } catch (err) {
          setError('No se encontró ningún resultado con código: ' + codigo);
          return;
        }
      }

      // Extraer el ID del código (PAC + últimos 8 caracteres del ID)
      const idParcial = codigo.replace(CODIGO_PACIENTE_PREFIX, '').toLowerCase();
      
      // Buscar pacientes
      const response = await api.getPacientes({ search: idParcial });
      const pacientes = response.data || [];

      if (pacientes.length === 0) {
        // Intentar buscar por el código completo en la cédula
        const response2 = await api.getPacientes({ search: codigo });
        const pacientes2 = response2.data || [];
        
        if (pacientes2.length === 0) {
          setError('No se encontró ningún paciente con este código');
          return;
        }
        
        await cargarPaciente(pacientes2[0]);
      } else {
        await cargarPaciente(pacientes[0]);
      }
    } catch (err) {
      setError('Error al buscar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarPaciente = async (pac) => {
    setPaciente(pac);
    
    // Cargar resultados del paciente
    try {
      const resResponse = await api.getResultados({ paciente: pac._id || pac.id });
      setResultados(resResponse.data || []);
    } catch (err) {
      console.error('Error cargando resultados:', err);
      setResultados([]);
    }
  };

  const buscarManual = () => {
    if (codigo.trim()) {
      buscarPaciente();
    }
  };

  const limpiar = () => {
    setCodigo('');
    setPaciente(null);
    setResultados([]);
    setError('');
    setResultadoSeleccionado(null);
    inputRef.current?.focus();
  };

  const imprimirResultado = (resultado) => {
    const ventana = window.open('', 'Resultado', 'width=600,height=800');
    
    const valoresHTML = (resultado.valores || []).map(v => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${v.parametro}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${v.valor} ${v.unidad || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${v.valorReferencia || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">
          <span style="padding:3px 10px;border-radius:10px;font-size:11px;
            background:${v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd'};
            color:${v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404'};">
            ${v.estado || '-'}
          </span>
        </td>
      </tr>
    `).join('');

    ventana.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Resultado - ${paciente?.nombre} ${paciente?.apellido}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #e74c3c; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #3498db; color: white; padding: 10px; text-align: left; }
    .firma { margin-top: 50px; text-align: center; }
    .firma-linea { border-top: 1px solid #000; width: 200px; margin: 0 auto; padding-top: 5px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"?? MI ESPERANZA</div>
    <div>CENTRO DIAGNÓSTICO</div>
    <div style="font-size:12px;color:#666;">Tel: 809-000-0000 | www.miesperanza.com</div>
  </div>

  <h2 style="color:#3498db;border-bottom:1px solid #ddd;padding-bottom:10px;">
    RESULTADO DE ${resultado.estudio?.nombre?.toUpperCase() || 'ESTUDIO'}
  </h2>

  <div class="info-box">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div><strong>Paciente:</strong> ${paciente?.nombre} ${paciente?.apellido}</div>
      <div><strong>Cédula:</strong> ${paciente?.cedula || 'N/A'}</div>
      <div><strong>Fecha:</strong> ${new Date(resultado.createdAt).toLocaleDateString('es-DO')}</div>
      <div><strong>Edad:</strong> ${calcularEdad(paciente?.fechaNacimiento)} años</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Parámetro</th>
        <th style="text-align:center;">Valor</th>
        <th style="text-align:center;">Referencia</th>
        <th style="text-align:center;">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${valoresHTML || '<tr><td colspan="4" style="padding:20px;text-align:center;">Sin valores registrados</td></tr>'}
    </tbody>
  </table>

  ${resultado.interpretacion ? `
    <div style="margin:20px 0;">
      <strong>Interpretación:</strong>
      <p style="background:#f0f8ff;padding:10px;border-radius:5px;margin-top:5px;">${resultado.interpretacion}</p>
    </div>
  ` : ''}

  ${resultado.conclusion ? `
    <div style="margin:20px 0;">
      <strong>Conclusión:</strong>
      <p style="background:#f0fff0;padding:10px;border-radius:5px;margin-top:5px;">${resultado.conclusion}</p>
    </div>
  ` : ''}

  <div class="firma">
    <div class="firma-linea">
      ${resultado.validadoPor?.nombre || resultado.medico?.nombre || 'Médico'} ${resultado.validadoPor?.apellido || resultado.medico?.apellido || ''}
    </div>
    <div style="font-size:12px;color:#666;">Firma del Médico</div>
  </div>

  <div style="margin-top:30px;text-align:center;font-size:11px;color:#999;">
    Documento generado el ${new Date().toLocaleString('es-DO')}
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
    `);
    
    ventana.document.close();
  };

  const calcularEdad = (fecha) => {
    if (!fecha) return 'N/A';
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
        <FaBarcode style={{ color: '#9b59b6' }} /> Consulta Rápida
      </h1>

      {/* Barra de búsqueda */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 30,
        borderRadius: 15,
        marginBottom: 25,
        boxShadow: '0 10px 30px rgba(102,126,234,0.3)'
      }}>
        <div style={{ textAlign: 'center', color: 'white', marginBottom: 20 }}>
          <FaBarcode style={{ fontSize: 40, marginBottom: 10 }} />
          <h2 style={{ margin: 0 }}>Escanee el código de barras</h2>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>o ingrese el código manualmente</p>
        </div>

        <div style={{ display: 'flex', gap: 10, maxWidth: 500, margin: '0 auto' }}>
          <input
            ref={inputRef}
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            onKeyPress={e => e.key === 'Enter' && buscarManual()}
            placeholder="PAC########"
            style={{
              flex: 1,
              padding: '15px 20px',
              fontSize: 20,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              textAlign: 'center',
              border: 'none',
              borderRadius: 10,
              letterSpacing: 3
            }}
            autoFocus
          />
          <button
            onClick={buscarManual}
            disabled={loading}
            style={{
              padding: '15px 25px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16
            }}
          >
            {loading ? <FaSpinner className="spin" /> : <FaSearch />}
          </button>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            padding: 10, 
            borderRadius: 8, 
            marginTop: 15,
            textAlign: 'center'
          }}>
            ?? {error}
          </div>
        )}
      </div>

      {/* Resultado de búsqueda */}
      {paciente && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          {/* Info del paciente */}
          <div style={{
            background: 'white',
            padding: 25,
            borderRadius: 15,
            boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaUser style={{ color: '#3498db' }} /> Paciente
              </h3>
              <button onClick={limpiar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 10 }}>
              <h2 style={{ margin: '0 0 10px', color: '#2c3e50' }}>
                {paciente.nombre} {paciente.apellido}
              </h2>
              <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                <div><strong>Cédula:</strong> {paciente.cedula}</div>
                <div><strong>Teléfono:</strong> {paciente.telefono}</div>
                <div><strong>Edad:</strong> {calcularEdad(paciente.fechaNacimiento)} años</div>
                <div><strong>Sexo:</strong> {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                {paciente.tipoSangre && <div><strong>Sangre:</strong> {paciente.tipoSangre}</div>}
              </div>
            </div>

            <div style={{ marginTop: 15, padding: 15, background: '#e8f5e9', borderRadius: 10 }}>
              <div style={{ fontWeight: 'bold', color: '#27ae60', marginBottom: 5 }}>
                ?? Resumen
              </div>
              <div style={{ fontSize: 14 }}>
                Total de estudios: <strong>{resultados.length}</strong>
              </div>
              <div style={{ fontSize: 14 }}>
                Listos: <strong style={{ color: '#27ae60' }}>
                  {resultados.filter(r => r.estado === 'completado').length}
                </strong>
              </div>
              <div style={{ fontSize: 14 }}>
                Pendientes: <strong style={{ color: '#f39c12' }}>
                  {resultados.filter(r => r.estado !== 'completado').length}
                </strong>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div style={{
            background: 'white',
            padding: 25,
            borderRadius: 15,
            boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaFlask style={{ color: '#9b59b6' }} /> Resultados ({resultados.length})
            </h3>

            {resultados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <FaFlask style={{ fontSize: 50, marginBottom: 15, opacity: 0.3 }} />
                <p>No hay resultados registrados</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {resultados.map(r => (
                  <div
                    key={r._id}
                    style={{
                      padding: 15,
                      border: '1px solid #eee',
                      borderRadius: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: r.estado === 'completado' ? '#f8fff8' : '#fffdf8'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
                        {r.estudio?.nombre || 'Estudio'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {new Date(r.createdAt).toLocaleDateString('es-DO')}
                        {r.estado === 'completado' ? (
                          <span style={{ marginLeft: 10, color: '#27ae60' }}>
                            <FaCheckCircle /> Listo
                          </span>
                        ) : (
                          <span style={{ marginLeft: 10, color: '#f39c12' }}>
                            <FaClock /> {r.estado || 'Pendiente'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.estado === 'completado' && (
                        <button
                          onClick={() => imprimirResultado(r)}
                          style={{
                            padding: '8px 15px',
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 'bold'
                          }}
                        >
                          <FaPrint /> Imprimir
                        </button>
                      )}
                      <button
                        onClick={() => setResultadoSeleccionado(r)}
                        style={{
                          padding: '8px 15px',
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {resultadoSeleccionado && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            padding: 30,
            borderRadius: 15,
            maxWidth: 700,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{resultadoSeleccionado.estudio?.nombre}</h2>
              <button
                onClick={() => setResultadoSeleccionado(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {resultadoSeleccionado.valores?.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #ddd' }}>Parámetro</th>
                    <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #ddd' }}>Valor</th>
                    <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #ddd' }}>Referencia</th>
                    <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #ddd' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadoSeleccionado.valores.map((v, i) => (
                    <tr key={i}>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{v.parametro}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center', fontWeight: 'bold' }}>
                        {v.valor} {v.unidad}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center', color: '#666' }}>
                        {v.valorReferencia}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 15,
                          fontSize: 12,
                          background: v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd',
                          color: v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404'
                        }}>
                          {v.estado || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {resultadoSeleccionado.interpretacion && (
              <div style={{ marginBottom: 15 }}>
                <strong>Interpretación:</strong>
                <p style={{ background: '#f0f8ff', padding: 12, borderRadius: 8, marginTop: 5 }}>
                  {resultadoSeleccionado.interpretacion}
                </p>
              </div>
            )}

            {resultadoSeleccionado.conclusion && (
              <div style={{ marginBottom: 15 }}>
                <strong>Conclusión:</strong>
                <p style={{ background: '#f0fff0', padding: 12, borderRadius: 8, marginTop: 5 }}>
                  {resultadoSeleccionado.conclusion}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {resultadoSeleccionado.estado === 'completado' && (
                <button
                  onClick={() => imprimirResultado(resultadoSeleccionado)}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <FaPrint /> Imprimir Resultado
                </button>
              )}
              <button
                onClick={() => setResultadoSeleccionado(null)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      {!paciente && (
        <div style={{
          background: '#f8f9fa',
          padding: 25,
          borderRadius: 15,
          marginTop: 20
        }}>
          <h3 style={{ margin: '0 0 15px', color: '#2c3e50' }}>?? Instrucciones</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ width: 40, height: 40, background: '#667eea', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
              <div>
                <strong>Escanear código</strong>
                <p style={{ margin: '5px 0 0', color: '#666', fontSize: 14 }}>
                  Use el lector de código de barras para escanear la factura del paciente
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ width: 40, height: 40, background: '#667eea', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
              <div>
                <strong>Ver resultados</strong>
                <p style={{ margin: '5px 0 0', color: '#666', fontSize: 14 }}>
                  Se mostrarán automáticamente los datos del paciente y sus resultados
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ width: 40, height: 40, background: '#667eea', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
              <div>
                <strong>Imprimir</strong>
                <p style={{ margin: '5px 0 0', color: '#666', fontSize: 14 }}>
                  Haga clic en "Imprimir" para entregar los resultados al paciente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultaRapida;


export default ConsultaRapida;
