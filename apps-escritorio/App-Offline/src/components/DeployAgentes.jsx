import React, { useState, useEffect } from 'react';
import { FaNetworkWired, FaDesktop, FaUpload, FaCheck, FaTimes, FaSpinner, FaSync, FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DeployAgentes = () => {
  const [pcEnRed, setPcEnRed] = useState([]);
  const [agentesInstalados, setAgentesInstalados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Detectar si estamos en Electron
  const isElectron = window.isElectron === true;

  const colores = {
    primary: '#1a3a5c',
    secondary: '#87CEEB',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    light: '#f0f8ff'
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar PCs en la red
      const pcResponse = await api.escanearRed();
      setPcEnRed(pcResponse.data || pcResponse || []);

      // Cargar agentes instalados
      const agentesResponse = await api.getAgentesInstalados();
      setAgentesInstalados(agentesResponse.data || agentesResponse || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      mostrarMensaje('danger', 'Error cargando datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const escanearRed = async () => {
    setLoading(true);
    mostrarMensaje('info', 'Escaneando red local...');
    try {
      const response = await api.escanearRed();
      setPcEnRed(response.data || response || []);
      mostrarMensaje('success', `Se encontraron ${response.data?.length || 0} PCs en la red`);
    } catch (error) {
      console.error('Error escaneando red:', error);
      mostrarMensaje('danger', 'Error escaneando red: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deployAgente = async (pc) => {
    setDeploying({ ...deploying, [pc.ip]: true });
    mostrarMensaje('info', `Desplegando agente en ${pc.hostname || pc.ip}...`);

    try {
      const response = await api.deployAgente(pc.ip, pc.hostname);
      
      if (response.success) {
        mostrarMensaje('success', `Agente desplegado exitosamente en ${pc.hostname || pc.ip}`);
        await cargarDatos(); // Recargar datos
      } else {
        mostrarMensaje('danger', `Error desplegando agente: ${response.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error desplegando agente:', error);
      mostrarMensaje('danger', `Error desplegando agente: ${error.message}`);
    } finally {
      setDeploying({ ...deploying, [pc.ip]: false });
    }
  };

  const verificarEstado = async (ip) => {
    try {
      const response = await api.verificarAgenteEstado(ip);
      return response.data || response;
    } catch (error) {
      return { estado: 'desconocido', error: error.message };
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const getEstadoAgente = (ip) => {
    const agente = agentesInstalados.find(a => a.ip === ip);
    return agente ? agente.estado : 'no_instalado';
  };

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'activo':
        return colores.success;
      case 'inactivo':
        return colores.danger;
      case 'no_instalado':
        return '#999999';
      default:
        return colores.warning;
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: colores.light, minHeight: '100vh' }}>
      {/* Mensaje si NO es Electron */}
      {!isElectron && (
        <div style={{
          background: `linear-gradient(135deg, ${colores.warning} 0%, ${colores.danger} 100%)`,
          padding: '30px',
          borderRadius: '10px',
          marginBottom: '30px',
          color: 'white',
          textAlign: 'center'
        }}>
          <FaExclamationTriangle style={{ fontSize: '60px', marginBottom: '20px' }} />
          <h1 style={{ margin: '0 0 15px 0', fontSize: '28px' }}>
            Funcionalidad No Disponible en Navegador
          </h1>
          <p style={{ margin: '0 0 20px 0', fontSize: '18px', opacity: 0.9 }}>
            El módulo de <strong>Deploy de Agentes</strong> requiere acceso a la red local del laboratorio 
            y solo está disponible en la <strong>Aplicación de Escritorio</strong>.
          </p>
          <Link 
            to="/descargar-app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '15px 30px',
              backgroundColor: 'white',
              color: colores.primary,
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}
          >
            <FaDownload /> Descargar Aplicación de Escritorio
          </Link>
        </div>
      )}

      {/* Contenido principal - solo mostrar si es Electron */}
      {isElectron && (
        <>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colores.primary} 0%, ${colores.secondary} 100%)`,
        padding: '30px',
        borderRadius: '10px',
        marginBottom: '30px',
        color: 'white'
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <FaNetworkWired /> Deploy de Agentes en Red Local
        </h1>
        <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
          Gestión centralizada de instalación y monitoreo de agentes de equipos médicos
        </p>
      </div>

      {/* Mensaje */}
      {mensaje.texto && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: mensaje.tipo === 'success' ? '#d4edda' :
                          mensaje.tipo === 'danger' ? '#f8d7da' :
                          '#d1ecf1',
          color: mensaje.tipo === 'success' ? '#155724' :
                 mensaje.tipo === 'danger' ? '#721c24' :
                 '#0c5460',
          border: `1px solid ${mensaje.tipo === 'success' ? '#c3e6cb' :
                                mensaje.tipo === 'danger' ? '#f5c6cb' :
                                '#bee5eb'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <button
          onClick={escanearRed}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: colores.primary,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? <FaSpinner className="fa-spin" /> : <FaSync />}
          Escanear Red
        </button>

        <button
          onClick={cargarDatos}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: colores.secondary,
            color: colores.primary,
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          <FaSync /> Actualizar
        </button>
      </div>

      {/* Tabla de PCs */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: colores.primary, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaDesktop /> PCs en la Red Local
        </h2>

        {loading && pcEnRed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FaSpinner className="fa-spin" style={{ fontSize: '48px', color: colores.primary }} />
            <p style={{ marginTop: '20px', color: '#666' }}>Cargando...</p>
          </div>
        ) : pcEnRed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <FaNetworkWired style={{ fontSize: '48px', opacity: 0.3 }} />
            <p style={{ marginTop: '20px' }}>
              No se encontraron PCs en la red. Haga clic en "Escanear Red" para buscar.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: colores.light, borderBottom: `2px solid ${colores.primary}` }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Hostname</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>IP</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>MAC</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado Agente</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pcEnRed.map((pc, index) => {
                const estado = getEstadoAgente(pc.ip);
                const isDeploying = deploying[pc.ip];

                return (
                  <tr key={index} style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{pc.hostname || 'Desconocido'}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>{pc.ip}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {pc.mac || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: getColorEstado(estado),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        {estado === 'activo' && <FaCheck />}
                        {estado === 'inactivo' && <FaTimes />}
                        {estado === 'activo' ? 'Activo' :
                         estado === 'inactivo' ? 'Inactivo' :
                         'No Instalado'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => deployAgente(pc)}
                        disabled={isDeploying}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: estado === 'no_instalado' ? colores.primary : colores.warning,
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: isDeploying ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: isDeploying ? 0.6 : 1
                        }}
                      >
                        {isDeploying ? (
                          <>
                            <FaSpinner className="fa-spin" />
                            Desplegando...
                          </>
                        ) : (
                          <>
                            <FaUpload />
                            {estado === 'no_instalado' ? 'Instalar' : 'Reinstalar'}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Agentes instalados */}
      {agentesInstalados.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '20px',
          marginTop: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, color: colores.primary }}>
            Agentes Monitoreados ({agentesInstalados.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {agentesInstalados.map((agente, index) => (
              <div key={index} style={{
                border: `2px solid ${getColorEstado(agente.estado)}`,
                borderRadius: '10px',
                padding: '15px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px' }}>{agente.hostname || agente.ip}</strong>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: getColorEstado(agente.estado),
                    display: 'inline-block'
                  }} />
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div><strong>IP:</strong> {agente.ip}</div>
                  <div><strong>Última conexión:</strong> {agente.ultima_conexion || 'Nunca'}</div>
                  <div><strong>Versión:</strong> {agente.version || 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información de ayuda */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '10px',
        color: '#856404'
      }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          ℹ️ Información
        </h3>
        <ul style={{ marginBottom: 0 }}>
          <li>El escaneo de red busca PCs activas en la red local Ethernet</li>
          <li>Para desplegar un agente, la PC debe estar accesible y con permisos administrativos</li>
          <li>Los agentes se instalan en: <code>C:\Centro Diagnostico\Agent\</code></li>
          <li>El deploy remoto usa SMB/WMI para Windows</li>
          <li>Los agentes instalados reportan su estado cada 60 segundos</li>
        </ul>
      </div>
        </>
      )}
    </div>
  );
};

export default DeployAgentes;
