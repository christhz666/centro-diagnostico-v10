import React, { useState, useEffect } from 'react';
import { FaUser, FaLock, FaHeartbeat, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import api from '../services/api';

/* ─── Paleta ───────────────────────────────────────────────── */
const C = {
    dark: '#0d2137',
    mid: '#1a3a5c',
    blue: '#2980b9',
    sky: '#87CEEB',
    white: '#ffffff',
    glass: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.18)',
};

/* ─── Animación de partículas flotantes ─────────────────────── */
const Particles = () => (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(12)].map((_, i) => (
            <div key={i} style={{
                position: 'absolute',
                width: `${6 + (i % 5) * 4}px`,
                height: `${6 + (i % 5) * 4}px`,
                borderRadius: '50%',
                background: `rgba(135,206,235, ${0.06 + (i % 4) * 0.04})`,
                left: `${(i * 23 + 5) % 95}%`,
                top: `${(i * 17 + 10) % 90}%`,
                animation: `float-particle ${8 + i * 1.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
            }} />
        ))}
    </div>
);

/* ─── Ondas decorativas ──────────────────────────────────────── */
const Waves = ({ color }) => (
    <svg viewBox="0 0 1440 120" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', opacity: 0.15 }}>
        <path fill={color || C.sky}
            d="M0,64 C180,100 360,20 540,60 C720,100 900,20 1080,55 C1260,90 1380,30 1440,50 L1440,120 L0,120 Z" />
    </svg>
);

/* ─── Componente principal ─────────────────────────────────── */
const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [empresaConfig, setEmpresaConfig] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        fetch('/api/configuracion/empresa')
            .then(r => r.json())
            .then(d => setEmpresaConfig(d || {}))
            .catch(() => { });

        const savedUsername = localStorage.getItem('savedUsername');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }

        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setError('Complete usuario y contraseña');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await api.login({ username, password });
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.usuario));

                if (rememberMe) {
                    localStorage.setItem('savedUsername', username);
                } else {
                    localStorage.removeItem('savedUsername');
                }

                onLogin(data.usuario, data.access_token);
            } else {
                setError('Usuario o contraseña incorrectos');
            }
        } catch {
            setError('Usuario o contraseña incorrectos');
        } finally {
            setLoading(false);
        }
    };

    const colorA = empresaConfig.color_primario || C.mid;
    const colorB = empresaConfig.color_secundario || C.blue;

    /* ═══════════════ RENDER ══════════════════════════════════ */
    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(145deg, ${C.dark} 0%, ${colorA} 45%, ${colorB} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '16px' : '24px',
            fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        @keyframes float-particle {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-30px) scale(1.1); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14%       { transform: scale(1.15); }
          28%       { transform: scale(1); }
          42%       { transform: scale(1.1); }
          56%       { transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(135,206,235,0.4); }
          70%  { box-shadow: 0 0 0 20px rgba(135,206,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(135,206,235,0); }
        }
        .login-input {
          width: 100%;
          padding: 15px 15px 15px 46px;
          background: rgba(255,255,255,0.07);
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-family: inherit;
          box-sizing: border-box;
          transition: all 0.25s;
          -webkit-font-smoothing: antialiased;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.35); }
        .login-input:focus {
          outline: none;
          border-color: ${C.sky};
          background: rgba(255,255,255,0.12);
          box-shadow: 0 0 0 4px rgba(135,206,235,0.15);
        }
        .login-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, ${C.sky} 0%, ${colorB} 100%);
          color: ${C.dark};
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 0.3px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(41,128,185,0.5);
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          margin-bottom: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          animation: slideInLeft 0.5s ease both;
        }
      `}</style>

            <Particles />

            {/* ════ CONTENEDOR ════ */}
            <div style={{
                display: 'flex',
                width: '100%',
                maxWidth: isMobile ? '420px' : '880px',
                minHeight: isMobile ? 'auto' : '560px',
                borderRadius: isMobile ? '24px' : '28px',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
                animation: 'fadeInUp 0.6s ease',
                position: 'relative',
                zIndex: 10,
            }}>

                {/* ─── PANEL IZQUIERDO (solo desktop) ─── */}
                {!isMobile && (
                    <div style={{
                        flex: '0 0 45%',
                        background: `linear-gradient(160deg, rgba(26,58,92,0.95) 0%, rgba(13,33,55,0.98) 100%)`,
                        backdropFilter: 'blur(20px)',
                        padding: '60px 40px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderRight: `1px solid ${C.border}`,
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <Waves />

                        {/* Logo y nombre */}
                        <div style={{ textAlign: 'center' }}>
                            {empresaConfig.logo_login ? (
                                <img
                                    src={empresaConfig.logo_login}
                                    alt={empresaConfig.nombre}
                                    style={{
                                        maxWidth: '280px', maxHeight: '120px', objectFit: 'contain', marginBottom: 20,
                                        filter: 'brightness(1.1) drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
                                    }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div style={{
                                    width: 88, height: 88,
                                    background: 'rgba(135,206,235,0.12)',
                                    border: `2px solid ${C.sky}`,
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px',
                                    animation: 'pulse-ring 2.5s ease-out infinite',
                                }}>
                                    <FaHeartbeat style={{
                                        fontSize: 42, color: C.sky,
                                        animation: 'heartbeat 1.5s ease-in-out infinite',
                                    }} />
                                </div>
                            )}

                            <h1 style={{ color: C.white, margin: '0 0 6px', fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
                                {empresaConfig.nombre || 'Centro Diagnóstico'}
                            </h1>
                            <p style={{ color: 'rgba(135,206,235,0.8)', margin: 0, fontSize: 13 }}>
                                Sistema de Gestión Médica
                            </p>
                        </div>

                        {/* Features */}
                        <div style={{ marginTop: 30 }}>
                            {[
                                { e: '🔬', t: 'Resultados de Laboratorio', d: 'Gestión completa de estudios' },
                                { e: '🩻', t: 'Imagenología Digital', d: 'Visor DICOM integrado' },
                                { e: '📄', t: 'Facturación Automática', d: 'NCF y portal de paciente' },
                            ].map((f, i) => (
                                <div key={i} className="feature-item" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                                    <span style={{ fontSize: 24, flexShrink: 0 }}>{f.e}</span>
                                    <div>
                                        <div style={{ color: C.white, fontWeight: 600, fontSize: 13 }}>{f.t}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 }}>{f.d}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Version */}
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', margin: 0 }}>
                            v8.0 · {new Date().getFullYear()}
                        </p>
                    </div>
                )}

                {/* ─── PANEL DERECHO (formulario) ─── */}
                <div style={{
                    flex: 1,
                    background: `linear-gradient(160deg, rgba(15,41,64,0.97) 0%, rgba(26,58,92,0.98) 100%)`,
                    backdropFilter: 'blur(20px)',
                    padding: isMobile ? '40px 28px' : '60px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'relative',
                }}>

                    {/* Encabezado móvil */}
                    {isMobile && (
                        <div style={{ textAlign: 'center', marginBottom: 36 }}>
                            {empresaConfig.logo_login ? (
                                <img
                                    src={empresaConfig.logo_login}
                                    alt={empresaConfig.nombre}
                                    style={{
                                        maxWidth: '220px', maxHeight: '90px', objectFit: 'contain', marginBottom: 16,
                                        filter: 'brightness(1.1) drop-shadow(0 4px 10px rgba(0,0,0,0.3))'
                                    }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div style={{
                                    width: 72, height: 72,
                                    background: 'rgba(135,206,235,0.1)',
                                    border: `2px solid ${C.sky}`,
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    animation: 'pulse-ring 2.5s ease-out infinite',
                                }}>
                                    <FaHeartbeat style={{ fontSize: 34, color: C.sky, animation: 'heartbeat 1.5s ease-in-out infinite' }} />
                                </div>
                            )}
                            <h2 style={{ color: C.white, margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
                                {empresaConfig.nombre || 'Centro Diagnóstico'}
                            </h2>
                            <p style={{ color: 'rgba(135,206,235,0.7)', margin: 0, fontSize: 13 }}>Sistema de Gestión Médica</p>
                        </div>
                    )}

                    {/* Título del formulario */}
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{ color: C.white, margin: '0 0 6px', fontSize: isMobile ? 24 : 28, fontWeight: 700 }}>
                            Iniciar Sesión
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 14 }}>
                            Ingresa tus credenciales de acceso
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '13px 16px', background: 'rgba(231,76,60,0.15)',
                            border: '1px solid rgba(231,76,60,0.4)', borderRadius: 12,
                            color: '#ff8a80', fontSize: 14, marginBottom: 22,
                            display: 'flex', alignItems: 'center', gap: 8,
                            animation: 'fadeInUp 0.3s ease',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                        {/* Campo: Usuario */}
                        <div>
                            <label style={{
                                color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
                                display: 'block', marginBottom: 8, letterSpacing: '0.3px'
                            }}>
                                Usuario o Correo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaUser style={{
                                    position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                                    color: 'rgba(135,206,235,0.5)', fontSize: 15
                                }} />
                                <input
                                    className="login-input"
                                    type="text"
                                    placeholder="Tu usuario o correo electrónico"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Campo: Contraseña */}
                        <div>
                            <label style={{
                                color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
                                display: 'block', marginBottom: 8, letterSpacing: '0.3px'
                            }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{
                                    position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                                    color: 'rgba(135,206,235,0.5)', fontSize: 15
                                }} />
                                <input
                                    className="login-input"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Tu contraseña"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 4, display: 'flex', alignItems: 'center',
                                }}>
                                    {showPass ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        {/* Recuérdame */}
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '-4px' }}>
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{ marginRight: '8px', cursor: 'pointer', opacity: 0.8, width: 14, height: 14 }}
                            />
                            <label htmlFor="rememberMe" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer' }}>
                                Recuérdame en este equipo
                            </label>
                        </div>

                        {/* Botón submit */}
                        <button type="submit" disabled={loading} className="login-btn"
                            style={{ marginTop: 8 }}>
                            {loading
                                ? <><FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} /> Verificando...</>
                                : '→ Ingresar al Sistema'
                            }
                        </button>
                    </form>

                    {/* Footer */}
                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>
                            {empresaConfig.empresa_direccion || ''}{empresaConfig.empresa_telefono ? ` · ${empresaConfig.empresa_telefono}` : ''}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;
