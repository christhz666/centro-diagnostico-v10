import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import './App.css';

import {
  FaHeartbeat, FaChartPie, FaPlusCircle, FaFileInvoiceDollar,
  FaUserMd, FaCogs, FaSignOutAlt, FaBars, FaTimes, FaUsers,
  FaFlask, FaClipboardList, FaBarcode, FaChevronDown, FaChevronRight,
  FaBalanceScale, FaPalette, FaNetworkWired, FaDownload, FaWhatsapp,
  FaXRay, FaBell
} from 'react-icons/fa';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RegistroInteligente from './components/RegistroInteligente';
import Facturas from './components/Facturas';
import PortalMedico from './components/PortalMedico';
import AdminPanel from './components/AdminPanel';
import AdminUsuarios from './components/AdminUsuarios';
import GestionEstudios from './components/GestionEstudios';
import Resultados from './components/Resultados';
import ConsultaRapida from './components/ConsultaRapida';
import AdminEquipos from './components/AdminEquipos';
import Contabilidad from './components/Contabilidad';
import DeployAgentes from './components/DeployAgentes';
import DescargarApp from './components/DescargarApp';
import PortalPaciente from './components/PortalPaciente';
import CampanaWhatsApp from './components/CampanaWhatsApp';
import Imagenologia from './components/Imagenologia';
import OfflineScreen from './components/OfflineScreen';

/* ── Sidebar expandido por hover ─────────────────────────────── */
const SIDEBAR_W = 240;
const SIDEBAR_MINI = 64;

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState({});
  const hoverTimeout = useRef(null);

  // Estado para el Tutorial Interactivo
  const [runTour, setRunTour] = useState(false);

  // Pasos del tutorial interactivo
  const tourSteps = [
    {
      target: 'body',
      placement: 'center',
      content: '¡Bienvenido al Sistema Médico! Realicemos un rápido recorrido para que conozcas las funciones principales.',
    },
    {
      target: '.tour-step-home',
      content: 'Este es tu Dashboard. Aquí verás el resumen diario y los ingresos.',
    },
    {
      target: '.tour-step-registro',
      content: 'Registro Inteligente. Desde aquí crearás nuevas citas y leerás Cédulas rápidamente.',
    },
    {
      target: '.tour-step-facturas',
      content: 'Módulo de Facturación. Completa los pagos de las citas registradas y ábre tu turno de caja diario.',
    },
    {
      target: '.tour-step-resultados',
      content: 'Panel de Resultados. Sube y visualiza las analíticas y PDF del laboratorio.',
    },
    {
      target: '.tour-step-imagenologia',
      content: 'Imagenología y Descargas. Los doctores podrán ver los visores o descargar instalaciones desde aquí.',
    },
    {
      target: '.sidebar-colapsador',
      content: 'Usa este botón para expandir o contraer el menú en cualquier momento.',
    }
  ];

  const handleTourCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('tourCompleted', 'true');
    }
  };

  const sidebarExpanded = isMobile ? sidebarMobileOpen : sidebarHovered;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarHovered(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        if (!localStorage.getItem('tourCompleted')) {
          setTimeout(() => setRunTour(true), 1500);
        }
      }
      catch { localStorage.removeItem('token'); localStorage.removeItem('user'); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/configuracion/empresa', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => { if (d && typeof d === 'object') setEmpresaConfig(d); })
      .catch(() => { });
  }, []);

  const handleLogin = (u, t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    if (!localStorage.getItem('tourCompleted')) {
      setTimeout(() => setRunTour(true), 1200);
    }
  };
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); setToken(null); };

  /* Hover delay (suaviza el colapso) */
  const onSidebarEnter = () => { clearTimeout(hoverTimeout.current); setSidebarHovered(true); };
  const onSidebarLeave = () => { hoverTimeout.current = setTimeout(() => { setSidebarHovered(false); setAdminMenuOpen(false); }, 220); };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1f2d' }}>
      <FaHeartbeat style={{ fontSize: 60, color: '#e74c3c', animation: 'heartbeat 1.2s ease-in-out infinite' }} />
    </div>
  );

  /* Rutas públicas del portal paciente */
  if (window.location.pathname === '/portal-paciente' || window.location.pathname.startsWith('/mis-resultados')) {
    return (
      <Router>
        <Routes>
          <Route path="/portal-paciente" element={<PortalPaciente />} />
          <Route path="/mis-resultados" element={<PortalPaciente />} />
          <Route path="*" element={<PortalPaciente />} />
        </Routes>
      </Router>
    );
  }

  if (!user || !token) return <Login onLogin={handleLogin} />;

  const isElectron = window.isElectron === true;
  const rol = user.role || user.rol || 'recepcion';

  const ROL_COLORS = {
    admin: '#8e44ad',
    medico: '#16a085',
    laboratorio: '#e67e22',
    recepcion: '#2980b9',
  };

  const menuItems = [
    { path: '/', icon: <FaChartPie />, label: 'Dashboard', roles: ['admin', 'medico', 'recepcion', 'laboratorio'] },
    { path: '/registro', icon: <FaPlusCircle />, label: 'Nuevo Registro', roles: ['admin', 'recepcion'] },
    { path: '/consulta', icon: <FaBarcode />, label: 'Consulta Rápida', roles: ['admin', 'recepcion', 'laboratorio'] },
    { path: '/facturas', icon: <FaFileInvoiceDollar />, label: 'Facturas', roles: ['admin', 'recepcion'] },
    { path: '/medico', icon: <FaUserMd />, label: 'Portal Médico', roles: ['admin', 'medico'] },
    { path: '/resultados', icon: <FaFlask />, label: 'Resultados', roles: ['admin', 'medico', 'laboratorio'] },
    { path: '/imagenologia', icon: <FaXRay />, label: 'Imagenología', roles: ['admin', 'medico', 'laboratorio', 'recepcion'] },
    { path: '/descargar-app', icon: <FaDownload />, label: 'Descargar Plataformas', roles: ['admin', 'medico', 'recepcion', 'laboratorio'] }
  ];

  const adminSubItems = [
    { path: '/admin', icon: <FaPalette />, label: 'Personalización', roles: ['admin'] },
    { path: '/admin/usuarios', icon: <FaUsers />, label: 'Usuarios', roles: ['admin'] },
    { path: '/admin/equipos', icon: <FaCogs />, label: 'Equipos', roles: ['admin'] },
    { path: '/admin/estudios', icon: <FaClipboardList />, label: 'Catálogo Estudios', roles: ['admin'] },
    { path: '/contabilidad', icon: <FaBalanceScale />, label: 'Contabilidad', roles: ['admin'] },
    { path: '/campana-whatsapp', icon: <FaWhatsapp />, label: 'Campañas WhatsApp', roles: ['admin'] },
    ...(isElectron ? [{ path: '/deploy', icon: <FaNetworkWired />, label: 'Deploy Agentes', roles: ['admin'] }] : [])
  ];

  const filteredMenu = menuItems.filter(i => i.roles.includes(rol));
  const filteredAdminSub = adminSubItems.filter(i => i.roles.includes(rol));
  const showAdminMenu = filteredAdminSub.length > 0;

  /* ── Estilos del sidebar ─── */
  const sidebarW = sidebarExpanded ? SIDEBAR_W : SIDEBAR_MINI;

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '13px 20px',
    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
    textDecoration: 'none',
    background: isActive ? 'rgba(135,206,235,0.18)' : 'transparent',
    borderLeft: isActive ? '3px solid #87CEEB' : '3px solid transparent',
    fontWeight: isActive ? 600 : 400,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    fontSize: 14,
  });

  const adminNavLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 20px 11px 36px',
    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    background: isActive ? 'rgba(135,206,235,0.14)' : 'transparent',
    borderLeft: isActive ? '3px solid #87CEEB' : '3px solid transparent',
    fontSize: 13, transition: 'all 0.2s',
    whiteSpace: 'nowrap', overflow: 'hidden',
  });

  const empresaNombre = empresaConfig.nombre || 'Mi Esperanza';
  const logoUrl = empresaConfig.logo_sidebar || empresaConfig.logo_resultados || null;

  return (
    <OfflineScreen>
      <Router>
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>

          <Joyride
            steps={tourSteps}
            run={runTour}
            continuous={true}
            showProgress={true}
            showSkipButton={true}
            callback={handleTourCallback}
            styles={{
              options: {
                primaryColor: '#0f4c75',
                zIndex: 10000,
              }
            }}
            locale={{ last: 'Finalizar', next: 'Siguiente', skip: 'Saltar Tour', back: 'Atrás' }}
          />

          <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.2)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }
          @keyframes fadeSlideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .spin { animation: spin 0.8s linear infinite; }
          .sidebar-nav-item:hover { background: rgba(255,255,255,0.1) !important; color: white !important; }
          .sidebar-nav-item:hover a, .sidebar-nav-item:hover { color: white !important; }
          .nav-label-text { opacity: ${sidebarExpanded ? 1 : 0}; max-width: ${sidebarExpanded ? '180px' : '0px'}; transition: opacity 0.25s, max-width 0.25s; overflow: hidden; white-space: nowrap; display: inline-block; }
          .app-main-content { transition: margin-left 0.3s ease; }
          ::-webkit-scrollbar { width:5px; }
          ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius:4px; }
        `}</style>

          {/* ─── Overlay móvil ─── */}
          {isMobile && sidebarMobileOpen && (
            <div onClick={() => { setSidebarMobileOpen(false); setAdminMenuOpen(false); }} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 999, backdropFilter: 'blur(3px)'
            }} />
          )}

          {/* ══════════ SIDEBAR ══════════ */}
          <aside
            onMouseEnter={!isMobile ? onSidebarEnter : undefined}
            onMouseLeave={!isMobile ? onSidebarLeave : undefined}
            style={{
              position: 'fixed', top: 0, left: 0, height: '100vh',
              width: isMobile ? (sidebarMobileOpen ? SIDEBAR_W : 0) : sidebarW,
              background: 'linear-gradient(180deg, #0d1f2d 0%, #0f4c75 60%, #1a3a5c 100%)',
              transition: 'width 0.3s ease',
              zIndex: 1000,
              overflowX: 'hidden', overflowY: 'auto',
              boxShadow: sidebarExpanded ? '4px 0 24px rgba(0,0,0,0.3)' : '2px 0 8px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Logo / nombre empresa */}
            <div style={{
              padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, flexShrink: 0,
            }}>
              {logoUrl
                ? <img src={logoUrl} alt={empresaNombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: 36, height: 36, background: 'rgba(231,76,60,0.2)', border: '2px solid rgba(231,76,60,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaHeartbeat style={{ color: '#e74c3c', fontSize: 18, animation: 'heartbeat 1.5s ease-in-out infinite' }} />
                </div>
              }
              <div className="nav-label-text" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{empresaNombre}</div>
                <div style={{ color: 'rgba(135,206,235,0.7)', fontSize: 11, marginTop: 2 }}>Sistema Médico</div>
              </div>
            </div>

            {/* Menú principal */}
            <nav style={{ flex: 1, padding: '8px 0' }}>
              {filteredMenu.map((item, i) => (
                <NavLink key={i} to={item.path} end={item.path === '/'} style={navLinkStyle}
                  className={`tour-step-${item.path.replace(/\//g, '') || 'home'}`}
                  onClick={() => { if (isMobile) setSidebarMobileOpen(false); }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <span className="nav-label-text">{item.label}</span>
                </NavLink>
              ))}

              {showAdminMenu && (
                <>
                  <div style={{ margin: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                  <div
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                      color: 'rgba(255,255,255,0.65)', cursor: 'pointer', transition: 'all 0.2s',
                      borderLeft: '3px solid transparent', fontSize: 14,
                    }}
                    className="sidebar-nav-item"
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}><FaCogs /></span>
                    <span className="nav-label-text" style={{ flex: 1 }}>Admin Panel</span>
                    <span className="nav-label-text" style={{ fontSize: 11, maxWidth: 16 }}>
                      {adminMenuOpen ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                  </div>
                  {adminMenuOpen && filteredAdminSub.map((item, i) => (
                    <NavLink key={`a${i}`} to={item.path} style={adminNavLinkStyle}
                      onClick={() => { if (isMobile) setSidebarMobileOpen(false); }}
                    >
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                      <span className="nav-label-text">{item.label}</span>
                    </NavLink>
                  ))}
                </>
              )}
            </nav>

            {/* Footer del sidebar */}
            <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              {/* Info usuario */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 6,
                background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: ROL_COLORS[rol] || '#3498db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700,
                  fontSize: 14, flexShrink: 0
                }}>
                  {(user.nombre || 'U')[0].toUpperCase()}
                </div>
                <div className="nav-label-text" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nombre}</div>
                  <div style={{ color: 'rgba(135,206,235,0.7)', fontSize: 11, textTransform: 'uppercase' }}>{rol}</div>
                </div>
              </div>

              <button onClick={handleLogout} style={{
                width: '100%', padding: '10px', background: 'rgba(231,76,60,0.15)',
                border: '1px solid rgba(231,76,60,0.4)', borderRadius: 8, color: '#ff6b6b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 13, fontFamily: 'inherit', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.15)'; }}
              >
                <FaSignOutAlt style={{ fontSize: 16 }} />
                <span className="nav-label-text">Cerrar Sesión</span>
              </button>
            </div>
          </aside>

          {/* ══════════ MAIN ══════════ */}
          <main className="app-main-content" style={{
            flex: 1,
            marginLeft: isMobile ? 0 : sidebarW,
            minHeight: '100vh',
            background: '#f0f4f8',
            transition: 'margin-left 0.3s ease',
          }}>
            {/* Header */}
            <header style={{
              position: 'sticky', top: 0, zIndex: 100,
              background: 'white',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              padding: '0 20px',
              height: 60,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              {/* Botón menú (móvil o siempre visible) */}
              <button
                className="sidebar-colapsador"
                onClick={() => isMobile ? setSidebarMobileOpen(!sidebarMobileOpen) : setSidebarHovered(!sidebarHovered)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#1b262c', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center' }}
              >
                {(isMobile ? sidebarMobileOpen : sidebarHovered) ? <FaTimes /> : <FaBars />}
              </button>

              {/* Breadcrumb / título página */}
              <div style={{ flex: 1, paddingLeft: 16 }}>
                <PageTitle />
              </div>

              {/* Info usuario derecha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#888', fontSize: 14 }}>
                    Hola, <strong style={{ color: '#1b262c' }}>{user.nombre}</strong>
                  </span>
                  <span style={{
                    background: ROL_COLORS[rol] || '#3498db',
                    color: 'white', padding: '3px 10px',
                    borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    {rol}
                  </span>
                </div>
              </div>
            </header>

            {/* Contenido de las rutas */}
            <div style={{ padding: '0' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/registro" element={<RegistroInteligente />} />
                <Route path="/consulta" element={<ConsultaRapida />} />
                <Route path="/facturas" element={<Facturas />} />
                <Route path="/medico" element={<PortalMedico />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                <Route path="/admin/equipos" element={<AdminEquipos />} />
                <Route path="/admin/estudios" element={<GestionEstudios />} />
                <Route path="/contabilidad" element={<Contabilidad />} />
                <Route path="/resultados" element={<Resultados />} />
                <Route path="/imagenologia" element={<Imagenologia />} />
                <Route path="/deploy" element={<DeployAgentes />} />
                <Route path="/descargar-app" element={<DescargarApp />} />
                <Route path="/campana-whatsapp" element={<CampanaWhatsApp />} />
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </OfflineScreen >
  );
}

/* Componente de título de la página actual */
function PageTitle() {
  const loc = useLocation();
  const titles = {
    '/': 'Dashboard',
    '/registro': 'Nuevo Registro',
    '/consulta': 'Consulta Rápida',
    '/facturas': 'Facturas',
    '/medico': 'Portal Médico',
    '/resultados': 'Resultados',
    '/imagenologia': 'Imagenología',
    '/admin': 'Personalización',
    '/admin/usuarios': 'Usuarios',
    '/admin/equipos': 'Equipos',
    '/admin/estudios': 'Catálogo de Estudios',
    '/contabilidad': 'Contabilidad',
    '/campana-whatsapp': 'Campañas WhatsApp',
    '/descargar-app': 'Descargar App',
    '/deploy': 'Deploy Agentes',
  };
  const title = titles[loc.pathname] || 'Sistema';
  return <span style={{ fontWeight: 600, color: '#1b262c', fontSize: 16 }}>{title}</span>;
}

export default App;
