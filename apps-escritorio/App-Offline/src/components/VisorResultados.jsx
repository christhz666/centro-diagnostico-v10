import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaEye, FaFileAlt, FaFlask, FaTimes, FaUser, FaCalendar, FaIdCard, FaPrint, FaExclamationTriangle } from 'react-icons/fa';

const VisorResultados = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [detalleResultado, setDetalleResultado] = useState(null);
  const [estadoPago, setEstadoPago] = useState(null);
  const [mostrarAlertaPago, setMostrarAlertaPago] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState({});

  const API_URL = '/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/configuracion/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setEmpresaConfig(data.configuracion || data || {}))
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchResultados();
  }, []);

  const fetchResultados = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/resultados/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setResultados(response.data.resultados || response.data.data || []);
      setLoading(false);
    } catch (error) {
      setError('Error al cargar resultados');
      setLoading(false);
    }
  };

  const verDetalle = async (resultadoId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/resultados/${resultadoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDetalleResultado(response.data.data || response.data);

      // Verificar estado de pago automáticamente
      await verificarEstadoPago(resultadoId);
    } catch (error) {
      alert('Error al cargar detalles');
    }
  };

  const verificarEstadoPago = async (resultadoId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/resultados/${resultadoId}/verificar-pago`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEstadoPago(response.data);
    } catch (error) {
      console.error('Error al verificar pago:', error);
      // Por seguridad, no permitir imprimir si hay error en la verificación
      setEstadoPago({ puede_imprimir: false, monto_pendiente: 0, error: true });
    }
  };

  const handleImprimir = async () => {
    if (!estadoPago) {
      alert('Verificando estado de pago...');
      return;
    }

    if (!estadoPago.puede_imprimir && estadoPago.monto_pendiente > 0) {
      setMostrarAlertaPago(true);
      return;
    }

    // Si puede imprimir, proceder con la impresión
    window.print();

    // Marcar como impreso en el backend
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/resultados/${detalleResultado._id || detalleResultado.id}/imprimir`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error al marcar como impreso:', error);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'normal') return '#4CAF50';
    if (estado === 'alto') return '#FF5722';
    if (estado === 'bajo') return '#2196F3';
    return '#FF9800';
  };

  const getEstadoIcon = (estado) => {
    if (estado === 'normal') return '?';
    if (estado === 'alto') return '??';
    if (estado === 'bajo') return '??';
    return '??';
  };

  const renderValores = (datos) => {
    if (!datos || typeof datos !== 'object') {
      return <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hay datos de laboratorio disponibles</p>;
    }

    return (
      <div style={styles.valoresGrid}>
        {Object.entries(datos).map(([parametro, info]) => {
          if (typeof info !== 'object') return null;

          const valor = info.valor;
          const unidad = info.unidad || '';
          const referencia = info.referencia || '';
          const estado = info.estado || 'normal';

          return (
            <div key={parametro} style={{
              ...styles.valorCard,
              borderLeft: `4px solid ${getEstadoColor(estado)}`
            }}>
              <div style={styles.valorHeader}>
                <strong>{parametro.replace(/_/g, ' ').toUpperCase()}</strong>
                <span style={{
                  ...styles.estadoBadge,
                  backgroundColor: getEstadoColor(estado)
                }}>
                  {getEstadoIcon(estado)} {estado.toUpperCase()}
                </span>
              </div>
              <div style={styles.valorNumero}>
                {valor} <span style={styles.unidad}>{unidad}</span>
              </div>
              <div style={styles.valorReferencia}>
                Rango: {referencia}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const resultadosFiltrados = resultados.filter(r =>
    r.nombre_archivo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.paciente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.paciente_apellido?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Cargando análisis médicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @media print {
            @page {
              margin: 1.5cm;
              size: auto;
            }
            body {
              background: #fff !important;
              color: #000 !important;
            }
            /* Ocultar elementos UI interactivos */
            .no-print,
            .app-sidebar,
            .app-header,
            [style*="searchBar"],
            [style*="stats"],
            [style*="grid"] {
              display: none !important;
            }
            /* Remover todos los fondos oscuros del Modal de QR y forzar blanco/negro */
            div[style*="position: fixed"] {
              position: static !important;
              background: transparent !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            /* Forzar el cuadro del Ticket al maximo ancho de impresion */
            div[style*="max-width: 1000px"],
            div[style*="maxWidth: 1000px"] {
              max-width: 100% !important;
              width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
            }
            /* Garantizar color de fondo blanco en las franjas */
            [style*="background-color: rgb(227, 242, 253)"],
            [style*="backgroundColor: #e3f2fd"],
            [style*="backgroundColor: #f8f9fa"],
            [style*="backgroundColor: #fff3e0"] {
              background-color: transparent !important;
              border: 1px solid #ccc !important;
              break-inside: avoid;
            }
            /* Ajustar cajas de Valores */
            [style*="valorCard"] {
              border: 1px solid #eee !important;
              border-left: 4px solid #333 !important;
              break-inside: avoid;
            }
            /* Forzar Logos y Titulos */
            img {
              max-height: 100px !important;
              filter: grayscale(100%);
            }
            h3, h4 { color: #000 !important; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          }
        `}
      </style>
      <h2 style={styles.title}>
        <FaFlask /> Resultados de Análisis Médicos
      </h2>

      <div style={styles.searchBar}>
        <FaSearch style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar por paciente o archivo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.stats}>
        <p>?? <strong>{resultadosFiltrados.length}</strong> análisis médicos disponibles</p>
      </div>

      <div style={styles.grid}>
        {resultadosFiltrados.map((resultado) => (
          <div key={resultado.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.tipoArchivo}>
                <FaFileAlt /> {resultado.tipo_archivo?.toUpperCase()}
              </span>
              <span style={{
                ...styles.badge,
                backgroundColor: resultado.estado_validacion === 'validado' ? '#4CAF50' : '#FF9800'
              }}>
                {resultado.estado_validacion}
              </span>
            </div>

            <div style={styles.cardBody}>
              <div style={styles.pacienteInfo}>
                <FaUser style={{ color: '#2196F3' }} />
                <strong>
                  {resultado.paciente_nombre} {resultado.paciente_apellido}
                </strong>
              </div>
              <p style={styles.cedula}>
                <FaIdCard /> {resultado.paciente_cedula || 'Sin cédula'}
              </p>
              <h4 style={styles.fileName}>{resultado.nombre_archivo}</h4>
              <p style={styles.date}>
                <FaCalendar /> {resultado.fecha ? new Date(resultado.fecha).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
              </p>
            </div>

            <div style={styles.cardFooter}>
              <button
                onClick={() => verDetalle(resultado.id)}
                style={styles.btnView}
              >
                <FaEye /> Ver Análisis Completo
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalle */}
      {detalleResultado && (
        <div style={styles.modal} onClick={() => setDetalleResultado(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.logoContainer}>
                <img
                  src={empresaConfig.logo_resultados || "/logo-centro.png"}
                  alt={empresaConfig.empresa_nombre || "Centro Diagnóstico"}
                  style={styles.logoImage}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/logo-centro.png";
                  }}
                />
                {empresaConfig.empresa_nombre && (
                  <p style={{ margin: '5px 0 0', fontWeight: 'bold', color: '#2c3e50' }}>{empresaConfig.empresa_nombre}</p>
                )}
                {empresaConfig.empresa_direccion && (
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#666' }}>{empresaConfig.empresa_direccion}</p>
                )}
                {empresaConfig.empresa_telefono && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#666' }}>Tel: {empresaConfig.empresa_telefono}</p>
                )}
              </div>
              <h3><FaFlask /> Análisis de Laboratorio Clínico</h3>
              <button
                onClick={() => {
                  setDetalleResultado(null);
                  setEstadoPago(null);
                }}
                style={styles.closeButton}
                className="no-print"
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ ...styles.modalBody, padding: '30px' }} className="print-body">
              {/* Info del Paciente */}
              {detalleResultado.paciente && (
                <div style={styles.pacienteSection}>
                  <h4><FaUser /> Información del Paciente</h4>
                  <div style={styles.pacienteGrid}>
                    <div>
                      <strong>Nombre:</strong> {detalleResultado.paciente.nombre} {detalleResultado.paciente.apellido}
                    </div>
                    <div>
                      <strong>Cédula:</strong> {detalleResultado.paciente.cedula}
                    </div>
                    <div>
                      <strong>Sexo:</strong> {detalleResultado.paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
                    </div>
                    <div>
                      <strong>Fecha Nacimiento:</strong> {detalleResultado.paciente.fecha_nacimiento ?
                        new Date(detalleResultado.paciente.fecha_nacimiento).toLocaleDateString('es-ES') : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* Info de la Orden */}
              {detalleResultado.orden && (
                <div style={styles.ordenSection}>
                  <p><strong>Orden:</strong> {detalleResultado.orden.numero_orden}</p>
                  <p><strong>Médico:</strong> {detalleResultado.orden.medico_referente || 'No especificado'}</p>
                  <p><strong>Fecha:</strong> {new Date(detalleResultado.fecha).toLocaleDateString('es-ES')}</p>
                  <p><strong>Estado:</strong> <span style={{
                    color: detalleResultado.estado_validacion === 'validado' ? '#4CAF50' : '#FF9800',
                    fontWeight: 'bold'
                  }}>
                    {detalleResultado.estado_validacion?.toUpperCase()}
                  </span></p>
                </div>
              )}

              {/* Interpretación */}
              {detalleResultado.interpretacion && (
                <div style={styles.interpretacion}>
                  <h4>?? Interpretación Médica</h4>
                  <p>{detalleResultado.interpretacion}</p>
                </div>
              )}

              {/* Valores de Laboratorio */}
              <div style={styles.valoresSection}>
                <h4>?? Valores de Laboratorio</h4>
                {renderValores(detalleResultado.datos)}
              </div>

              {/* Nota de valores de referencia */}
              {detalleResultado.valores_referencia && (
                <div style={styles.notaReferencia}>
                  <small>{detalleResultado.valores_referencia}</small>
                </div>
              )}

              {/* Botón de imprimir */}
              <div style={styles.printSection} className="no-print">
                <button
                  onClick={handleImprimir}
                  disabled={!estadoPago}
                  style={{
                    ...styles.btnPrint,
                    opacity: !estadoPago ? 0.6 : 1,
                    cursor: !estadoPago ? 'not-allowed' : 'pointer'
                  }}
                >
                  <FaPrint /> Imprimir Resultado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alerta de pago pendiente */}
      {mostrarAlertaPago && estadoPago && (
        <div style={styles.modal} onClick={() => setMostrarAlertaPago(false)}>
          <div style={styles.alertaModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.alertaHeader}>
              <FaExclamationTriangle style={{ fontSize: '40px', color: '#FF9800' }} />
              <h3 style={{ margin: '10px 0', color: '#FF9800' }}>Pago Pendiente</h3>
            </div>
            <div style={styles.alertaBody}>
              <p style={{ fontSize: '16px', marginBottom: '15px', textAlign: 'center' }}>
                ⚠️ Este paciente tiene un pago pendiente de{' '}
                <strong style={{ color: '#e74c3c', fontSize: '20px' }}>
                  RD$ {(estadoPago.monto_pendiente || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </p>
              <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                El resultado no está disponible para impresión hasta que se complete el pago.
              </p>

              {estadoPago.facturas_pendientes && estadoPago.facturas_pendientes.length > 0 && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Facturas Pendientes:</h4>
                  {estadoPago.facturas_pendientes.map(factura => (
                    <div key={factura.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '13px'
                    }}>
                      <span>{factura.numero}</span>
                      <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                        RD$ {factura.pendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={styles.alertaFooter}>
              <button
                onClick={() => setMostrarAlertaPago(false)}
                style={styles.btnCerrarAlerta}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f7fa',
    minHeight: '100vh'
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#2c3e50'
  },
  loading: {
    textAlign: 'center',
    padding: '60px'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  searchBar: {
    position: 'relative',
    marginBottom: '20px'
  },
  searchIcon: {
    position: 'absolute',
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999'
  },
  searchInput: {
    width: '100%',
    padding: '14px 14px 14px 45px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px'
  },
  stats: {
    marginBottom: '20px',
    fontSize: '16px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardHeader: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e0e0e0'
  },
  tipoArchivo: {
    fontWeight: 'bold',
    color: '#2196F3',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  badge: {
    padding: '5px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  cardBody: {
    padding: '20px'
  },
  pacienteInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '16px',
    color: '#2c3e50'
  },
  cedula: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  fileName: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '10px',
    wordBreak: 'break-word'
  },
  date: {
    fontSize: '14px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  cardFooter: {
    padding: '15px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fafafa'
  },
  btnView: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '1000px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  logoContainer: {
    width: '100%',
    textAlign: 'center',
    marginBottom: '15px'
  },
  logoImage: {
    maxWidth: '250px',
    height: 'auto',
    margin: '0 auto'
  },
  closeButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666'
  },
  modalBody: {
    padding: '20px'
  },
  pacienteSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    borderLeft: '4px solid #2196F3'
  },
  pacienteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  ordenSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  interpretacion: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    borderLeft: '4px solid #FF9800'
  },
  valoresSection: {
    marginTop: '20px'
  },
  valoresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  valorCard: {
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  valorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '13px'
  },
  estadoBadge: {
    padding: '4px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  valorNumero: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  unidad: {
    fontSize: '16px',
    fontWeight: 'normal',
    color: '#7f8c8d'
  },
  valorReferencia: {
    fontSize: '12px',
    color: '#95a5a6',
    fontStyle: 'italic'
  },
  notaReferencia: {
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px',
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic'
  },
  printSection: {
    marginTop: '25px',
    padding: '20px',
    borderTop: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'center'
  },
  btnPrint: {
    padding: '15px 40px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background-color 0.3s'
  },
  alertaModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    padding: '30px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  alertaHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px'
  },
  alertaBody: {
    marginBottom: '25px'
  },
  alertaFooter: {
    display: 'flex',
    justifyContent: 'center'
  },
  btnCerrarAlerta: {
    padding: '12px 30px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  }
};

export default VisorResultados;
