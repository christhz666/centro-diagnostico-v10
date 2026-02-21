import React, { useState, useEffect, useRef } from 'react';
import {
    FaUsers, FaCalendarAlt, FaFlask, FaFileInvoiceDollar,
    FaSyncAlt, FaSpinner, FaArrowUp, FaArrowRight,
    FaUserPlus, FaCheckCircle, FaClock, FaExclamationCircle,
    FaMoneyBillWave, FaChartLine, FaHeartbeat
} from 'react-icons/fa';
import api from '../services/api';

/* ── Animación del número al entrar ───────────────────────────── */
function AnimatedNumber({ value, prefix = '', duration = 1200 }) {
    const [displayed, setDisplayed] = useState(0);
    const startRef = useRef(null);
    const rafRef = useRef(null);
    const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;

    useEffect(() => {
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayed(Math.floor(eased * numVal));
            if (progress < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [numVal, duration]);

    if (typeof value === 'string' && value.includes('RD$')) {
        return <span>{prefix}RD$ {displayed.toLocaleString()}</span>;
    }
    return <span>{prefix}{displayed.toLocaleString()}</span>;
}

/* ── Barra de progreso animada ───────────────────────────────── */
function ProgressBar({ value, max, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: 6, height: 6, marginTop: 10 }}>
            <div style={{
                height: 6, borderRadius: 6,
                background: color || 'rgba(255,255,255,0.7)',
                width: `${pct}%`,
                transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
        </div>
    );
}

/* ── Tarjeta de estadística ─────────────────────────────────── */
function StatCard({ title, value, subtitle, icon, gradient, accent, progress, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

    return (
        <div style={{
            background: gradient,
            borderRadius: 20, padding: '24px 22px',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            transition: 'transform 0.25s, box-shadow 0.25s',
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            opacity: visible ? 1 : 0,
            cursor: 'default',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)'; }}
        >
            {/* Círculo decorativo de fondo */}
            <div style={{
                position: 'absolute', right: -20, top: -20,
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{
                position: 'absolute', right: 30, bottom: -30,
                width: 70, height: 70, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8 }}>{title}</p>
                    <h2 style={{ margin: '8px 0 4px', fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                        <AnimatedNumber value={value} />
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{subtitle}</p>
                </div>
                <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                }}>
                    {icon}
                </div>
            </div>

            {progress !== undefined && (
                <ProgressBar value={progress.value} max={progress.max} color="rgba(255,255,255,0.6)" />
            )}
        </div>
    );
}

/* ══════════════════ DASHBOARD PRINCIPAL ════════════════════ */
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [citasHoy, setCitasHoy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = api.getUser();
    const hora = new Date().getHours();
    const saludo = hora < 12 ? '🌤️ Buenos días' : hora < 18 ? '☀️ Buenas tardes' : '🌙 Buenas noches';

    useEffect(() => { loadDashboard(); }, []);

    const loadDashboard = async () => {
        setLoading(true); setError('');
        try {
            const [sRes, cRes] = await Promise.all([api.getDashboardStats(), api.getCitasHoy()]);
            const sData = sRes?.data || sRes;
            const cData = cRes?.data || cRes;
            if (sData && typeof sData === 'object') setStats(sData);
            if (Array.isArray(cData)) setCitasHoy(cData);
            else if (cData?.citas) setCitasHoy(cData.citas);
        } catch (e) {
            setError(e.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
            <div style={{ position: 'relative' }}>
                <FaHeartbeat style={{ fontSize: 48, color: '#e74c3c', animation: 'heartbeat 1.2s ease-in-out infinite' }} />
            </div>
            <p style={{ color: '#888', fontSize: 15 }}>Cargando dashboard...</p>
            <style>{`@keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.2)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 30 }}>
            <FaExclamationCircle style={{ fontSize: 48, color: '#e74c3c' }} />
            <p style={{ color: '#666', fontSize: 15, textAlign: 'center' }}>{error}</p>
            <button onClick={loadDashboard} style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#0f4c75,#1a6ba8)', color: 'white',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
                <FaSyncAlt /> Reintentar
            </button>
        </div>
    );

    const CARDS = [
        {
            title: 'Total Pacientes', icon: <FaUsers />,
            value: stats?.pacientes?.total || 0,
            subtitle: `+${stats?.pacientes?.nuevosMes || 0} nuevos este mes`,
            gradient: 'linear-gradient(135deg, #1a6ba8 0%, #0d4a7a 100%)',
            progress: { value: stats?.pacientes?.nuevosMes || 0, max: Math.max(stats?.pacientes?.nuevosMes || 0, 20) },
            delay: 0,
        },
        {
            title: 'Citas Hoy', icon: <FaCalendarAlt />,
            value: stats?.citas?.hoy || 0,
            subtitle: `${stats?.citas?.completadasHoy || 0} completadas`,
            gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            progress: { value: stats?.citas?.completadasHoy || 0, max: stats?.citas?.hoy || 1 },
            delay: 80,
        },
        {
            title: 'Resultados Pendientes', icon: <FaFlask />,
            value: stats?.resultados?.pendientes || 0,
            subtitle: `${stats?.resultados?.completadosMes || 0} completados este mes`,
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            delay: 160,
        },
        {
            title: 'Facturación Hoy', icon: <FaMoneyBillWave />,
            value: `RD$ ${(stats?.facturacion?.hoy?.total || 0).toLocaleString()}`,
            subtitle: `${stats?.facturacion?.hoy?.cantidad || 0} facturas emitidas`,
            gradient: 'linear-gradient(135deg, #4481eb 0%, #04befe 100%)',
            delay: 240,
        },
    ];

    const ESTADO_CONFIG = {
        programada: { color: '#1565c0', bg: '#e3f2fd', dot: '#2196f3', label: 'Programada' },
        confirmada: { color: '#2e7d32', bg: '#e8f5e9', dot: '#4caf50', label: 'Confirmada' },
        en_sala: { color: '#e65100', bg: '#fff3e0', dot: '#ff9800', label: 'En Sala' },
        en_proceso: { color: '#6a1b9a', bg: '#f3e5f5', dot: '#9c27b0', label: 'En Proceso' },
        completada: { color: '#00695c', bg: '#e0f2f1', dot: '#009688', label: 'Completada' },
        cancelada: { color: '#757575', bg: '#f5f5f5', dot: '#9e9e9e', label: 'Cancelada' },
        no_asistio: { color: '#f57f17', bg: '#fff8e1', dot: '#ffc107', label: 'No Asistió' },
    };

    return (
        <div style={{ padding: '24px', maxWidth: 1500, margin: '0 auto', fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.2)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .cita-row:hover { background: #f8f9ff !important; }
        .stat-card-hover:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(0,0,0,0.25) !important; }
      `}</style>

            {/* ── Encabezado ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1b262c' }}>
                        {saludo}, <span style={{ color: '#0f4c75' }}>{user?.nombre?.split(' ')[0] || 'Usuario'}</span> 👋
                    </h1>
                    <p style={{ margin: '5px 0 0', color: '#888', fontSize: 14, textTransform: 'capitalize' }}>
                        {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button onClick={loadDashboard} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 12,
                    border: '2px solid #0f4c75', background: 'white',
                    color: '#0f4c75', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0f4c75'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#0f4c75'; }}
                >
                    <FaSyncAlt /> Actualizar
                </button>
            </div>

            {/* ── Cards estadísticas ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, marginBottom: 28 }}>
                {CARDS.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            {/* ── Resumen rápido ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
                {[
                    { label: 'Citas del mes', value: stats?.citas?.mes || 0, icon: <FaCalendarAlt />, color: '#3498db' },
                    { label: 'Facturación mes', value: `RD$ ${(stats?.facturacion?.mes?.total || 0).toLocaleString()}`, icon: <FaChartLine />, color: '#8e44ad' },
                    { label: 'Pacientes nuevos', value: stats?.pacientes?.nuevosMes || 0, icon: <FaUserPlus />, color: '#16a085' },
                    { label: 'Citas programadas', value: stats?.citas?.programadas || 0, icon: <FaClock />, color: '#e67e22' },
                    { label: 'En proceso', value: stats?.citas?.enProceso || 0, icon: <FaHeartbeat />, color: '#e74c3c' },
                    { label: 'Médicos activos', value: stats?.personal?.medicos || 0, icon: <FaCheckCircle />, color: '#27ae60' },
                ].map((item, i) => (
                    <div key={i} style={{
                        background: 'white', borderRadius: 14, padding: '16px 18px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        display: 'flex', alignItems: 'center', gap: 14,
                        animation: `fadeInUp 0.4s ease ${i * 50}ms both`,
                        border: '1px solid #f0f0f0',
                        transition: 'transform 0.2s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            width: 40, height: 40, borderRadius: 12, background: `${item.color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 18, flexShrink: 0
                        }}>
                            {item.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>{item.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#1b262c', lineHeight: 1.2 }}>{item.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tabla de citas de hoy ── */}
            <div style={{ background: 'white', borderRadius: 18, padding: '22px 24px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1b262c', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FaCalendarAlt style={{ color: '#3498db' }} />
                        Citas de Hoy
                        <span style={{ background: '#e8f4fd', color: '#1565c0', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 600 }}>
                            {citasHoy.length}
                        </span>
                    </h2>
                </div>

                {citasHoy.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
                        <FaCalendarAlt style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                        <p style={{ margin: 0, fontSize: 15 }}>No hay citas programadas para hoy</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    {['Hora', 'Paciente', 'Estudios', 'Estado'].map(h => (
                                        <th key={h} style={{
                                            padding: '11px 14px', textAlign: 'left', color: '#888',
                                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                            borderBottom: '2px solid #f0f0f0'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {citasHoy.map((cita, i) => {
                                    const ec = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG.programada;
                                    return (
                                        <tr key={cita._id || i} className="cita-row" style={{ borderBottom: '1px solid #f8f8f8', transition: 'background 0.15s' }}>
                                            <td style={{ padding: '13px 14px', fontWeight: 700, color: '#1b262c', whiteSpace: 'nowrap' }}>
                                                <FaClock style={{ color: '#aaa', marginRight: 6, fontSize: 11 }} />
                                                {cita.horaInicio}
                                            </td>
                                            <td style={{ padding: '13px 14px' }}>
                                                <div style={{ fontWeight: 600, color: '#1b262c', fontSize: 14 }}>
                                                    {cita.paciente?.nombre} {cita.paciente?.apellido}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{cita.paciente?.cedula}</div>
                                            </td>
                                            <td style={{ padding: '13px 14px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {(cita.estudios || []).map((e, j) => (
                                                        <span key={j} style={{ background: '#e8f4fd', color: '#1565c0', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                                                            {e.estudio?.nombre || 'Estudio'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '13px 14px' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    background: ec.bg, color: ec.color,
                                                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                }}>
                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ec.dot, display: 'inline-block' }} />
                                                    {ec.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
