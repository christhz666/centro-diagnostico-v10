import React, { useState, useEffect } from 'react';
import { FaWindows, FaApple, FaLinux, FaDownload, FaNetworkWired, FaDesktop, FaEye, FaRocket, FaCheckCircle } from 'react-icons/fa';

const DescargarApp = () => {
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const colores = {
    primary: '#1a3a5c',
    secondary: '#87CEEB',
    success: '#28a745',
    light: '#f0f8ff'
  };

  useEffect(() => {
    // Ya no requerimos fetch remoto, las plataformas son estáticas en esta versión.
    setLoading(false);
  }, []);

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'windows':
        return <FaWindows />;
      case 'mac':
        return <FaApple />;
      case 'linux':
        return <FaLinux />;
      default:
        return <FaDesktop />;
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'windows':
        return 'Windows';
      case 'mac':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return platform;
    }
  };

  const handleDownload = (platform) => {
    if (platform === 'web') {
      window.location.href = '/';
    } else {
      window.location.href = `/api/downloads/${platform}`;
    }
  };

  const features = [
    {
      icon: <FaNetworkWired />,
      title: 'Escaneo de Red Local',
      description: 'Detecta automáticamente todos los equipos médicos en tu red LAN'
    },
    {
      icon: <FaRocket />,
      title: 'Deploy de Agentes',
      description: 'Instala y gestiona agentes en PCs del laboratorio de forma remota'
    },
    {
      icon: <FaEye />,
      title: 'Monitoreo en Tiempo Real',
      description: 'Supervisa el estado de los equipos médicos conectados'
    },
    {
      icon: <FaDesktop />,
      title: 'Sin Navegador',
      description: 'Aplicación nativa que no requiere conexión a internet constante'
    },
    {
      icon: <FaCheckCircle />,
      title: 'Auto-detección',
      description: 'Identifica automáticamente los equipos compatibles en la red'
    }
  ];

  return (
    <div style={{ padding: '20px', backgroundColor: colores.light, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colores.primary} 0%, ${colores.secondary} 100%)`,
        padding: '40px',
        borderRadius: '10px',
        marginBottom: '30px',
        color: 'white',
        textAlign: 'center'
      }}>
        <FaDownload style={{ fontSize: '60px', marginBottom: '20px' }} />
        <h1 style={{ margin: '0 0 15px 0', fontSize: '36px' }}>
          Descargar Aplicación de Escritorio
        </h1>
        <p style={{ margin: 0, fontSize: '18px', opacity: 0.9 }}>
          Accede a todas las funcionalidades del Centro Diagnóstico, incluyendo el deploy de agentes en red local
        </p>
        {downloadInfo && (
          <p style={{ margin: '15px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
            Versión {downloadInfo.version}
          </p>
        )}
      </div>

      {/* Mensaje informativo */}
      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '30px',
        color: '#856404'
      }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          ℹ️ ¿Por qué descargar la aplicación?
        </h3>
        <p style={{ marginBottom: 0 }}>
          La funcionalidad de <strong>Deploy de Agentes</strong> requiere acceso a la red local del laboratorio
          para escanear y gestionar equipos. Esta funcionalidad solo está disponible en la aplicación de escritorio,
          no en la versión web.
        </p>
      </div>

      {/* Tarjetas de descarga */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: colores.primary, textAlign: 'center' }}>
          Selecciona tu Plataforma
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Cargando información de descargas...</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginTop: '30px'
          }}>
            {/* 1. Versión Web */}
            <div style={{ border: `2px solid ${colores.primary}`, borderRadius: '10px', padding: '25px', textAlign: 'center', backgroundColor: 'white' }}>
              <div style={{ fontSize: '60px', color: colores.primary, marginBottom: '15px' }}>🌐</div>
              <h3 style={{ margin: '0 0 10px 0', color: colores.primary }}>Plataforma Web</h3>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>Acceso universal desde el navegador.</p>
              <button
                onClick={() => handleDownload('web')}
                style={{ padding: '12px 24px', backgroundColor: colores.primary, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%', transition: 'background-color 0.3s' }}
              >
                Abrir Web App
              </button>
            </div>

            {/* 2. App Windows (Online) */}
            <div style={{ border: `2px solid ${colores.primary}`, borderRadius: '10px', padding: '25px', textAlign: 'center', backgroundColor: 'white' }}>
              <div style={{ fontSize: '60px', color: colores.primary, marginBottom: '15px' }}><FaWindows /></div>
              <h3 style={{ margin: '0 0 10px 0', color: colores.primary }}>App Escritorio (Online)</h3>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>Requiere internet. Rapidez nativa.</p>
              <button
                onClick={() => handleDownload('windows-online')}
                style={{ padding: '12px 24px', backgroundColor: colores.primary, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%', transition: 'background-color 0.3s' }}
              >
                <FaDownload /> Descargar Online
              </button>
            </div>

            {/* 3. App Windows (Offline) */}
            <div style={{ border: `2px solid #28a745`, borderRadius: '10px', padding: '25px', textAlign: 'center', backgroundColor: 'white' }}>
              <div style={{ fontSize: '60px', color: '#28a745', marginBottom: '15px' }}><FaWindows /></div>
              <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>App Escritorio (Offline)</h3>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>Trabaja sin internet localmente.</p>
              <button
                onClick={() => handleDownload('windows-offline')}
                style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%', transition: 'background-color 0.3s' }}
              >
                <FaDownload /> Descargar Offline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Características de la Desktop App */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: colores.primary, textAlign: 'center', marginBottom: '30px' }}>
          Características de la Aplicación de Escritorio
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '25px'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '15px',
                padding: '20px',
                border: `1px solid ${colores.secondary}`,
                borderRadius: '10px',
                backgroundColor: colores.light
              }}
            >
              <div style={{
                fontSize: '30px',
                color: colores.primary,
                flexShrink: 0
              }}>
                {feature.icon}
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: colores.primary }}>
                  {feature.title}
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agentes de Equipos */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: colores.primary, textAlign: 'center', marginBottom: '10px' }}>
          🔬 Agentes de Equipos de Laboratorio
        </h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          Instala este agente en las PCs que están conectadas a los equipos del laboratorio.
          Recolecta datos de máquinas LIS/HL7 y los envía automáticamente al servidor.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Agente Laboratorio */}
          <div style={{
            border: `2px solid ${colores.primary}`,
            borderRadius: '12px',
            padding: '24px',
            background: `linear-gradient(135deg, ${colores.light} 0%, white 100%)`
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧪</div>
            <h3 style={{ margin: '0 0 8px', color: colores.primary }}>Agente de Laboratorio</h3>
            <p style={{ color: '#666', fontSize: '13px', lineHeight: '1.6', marginBottom: '15px' }}>
              Para equipos de <strong>hematología, química clínica, orina y coagulación</strong>.
              Se conecta por puerto serial (COM) o TCP/IP al equipo y envía los resultados al servidor.
            </p>
            <ul style={{ fontSize: '12px', color: '#555', paddingLeft: '18px', marginBottom: '15px', lineHeight: '1.8' }}>
              <li>Soporta protocolos ASTM y HL7</li>
              <li>Cola offline (guarda si no hay internet)</li>
              <li>Modo test incorporado</li>
            </ul>
            <button
              onClick={() => window.location.href = '/api/downloads/agente-laboratorio'}
              style={{
                width: '100%', padding: '12px', backgroundColor: colores.primary,
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px'
              }}
            >
              <FaDownload /> Descargar Agente Lab
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#2e7d32' }}>
            <strong>📋 Instrucción 1-Clic:</strong> Haz clic en cualquiera de estos botones grises para descargar el Instalador Silencioso. Al abrir el archivo <code>.bat</code> descargado, tu PC instalará, configurará y <strong>ejecutará el agente de fondo para siempre cada vez que enciendas tu computadora</strong>, sin que tengas que abrirlo tú mismo. ¡Todo automatizado!
          </p>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: colores.primary }}>
          Instrucciones de Instalación
        </h2>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: colores.primary, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaWindows /> Windows
          </h3>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Descarga el archivo <code>.exe</code></li>
            <li>Ejecuta el instalador (puede requerir permisos de administrador)</li>
            <li>Sigue las instrucciones del asistente de instalación</li>
            <li>Una vez instalado, ejecuta la aplicación desde el menú de inicio</li>
          </ol>

          <h3 style={{ color: colores.primary, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px' }}>
            <FaApple /> macOS
          </h3>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Descarga el archivo <code>.dmg</code></li>
            <li>Abre el archivo DMG descargado</li>
            <li>Arrastra el icono de la aplicación a la carpeta de Aplicaciones</li>
            <li>La primera vez, haz clic derecho y selecciona "Abrir" para autorizar la app</li>
          </ol>

          <h3 style={{ color: colores.primary, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px' }}>
            <FaLinux /> Linux
          </h3>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Descarga el archivo <code>.AppImage</code></li>
            <li>Dale permisos de ejecución: <code>chmod +x CentroDiagnostico-*.AppImage</code></li>
            <li>Ejecuta el archivo haciendo doble clic o desde la terminal</li>
            <li>Opcionalmente, integra la app con AppImageLauncher</li>
          </ol>
        </div>
      </div>
    </div >
  );
};

export default DescargarApp;
