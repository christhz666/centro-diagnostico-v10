import React, { useState, useEffect } from 'react';
import { FaWifi, FaExclamationTriangle } from 'react-icons/fa';

const OfflineScreen = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Revisión manual para evitar falsos positivos
        const checkStatus = setInterval(() => {
            if (navigator.onLine !== isOnline) {
                setIsOnline(navigator.onLine);
            }
        }, 2000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(checkStatus);
        };
    }, [isOnline]);

    if (isOnline) {
        return children;
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0d1520',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            fontFamily: "'Inter', 'Outfit', sans-serif"
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '50px 80px',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>

                {/* LOGO Animado y Estilo */}
                <div style={{ marginBottom: 30, position: 'relative' }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '200px',
                        height: '200px',
                        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                        animation: 'pulse 2s infinite',
                        borderRadius: '50%',
                        zIndex: 0
                    }} />
                    <img
                        src="/Logo-Mie-esperanza-Lab-Color-400x190-1.png"
                        alt="Centro Diagnóstico Mi Esperanza"
                        style={{ width: '280px', position: 'relative', zIndex: 1, filter: 'grayscale(0.9) brightness(1.2)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>

                <FaWifi size={48} color="#ef4444" style={{ marginBottom: 20 }} />

                <h1 style={{ color: 'white', fontSize: '28px', marginBottom: '10px', fontWeight: 700 }}>
                    Fuera de Servicio Local
                </h1>

                <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '400px', lineHeight: 1.6, marginBottom: 30 }}>
                    Se ha perdido la conexión de red hacia el servidor VPS.<br />
                    <strong>Por seguridad, la plataforma se ha bloqueado temporalmente</strong> para evitar la pérdida de estudios médicos o diagnósticos.
                </p>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    color: '#f87171'
                }}>
                    <FaExclamationTriangle />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                        Reestableciendo conexión en segundo plano...
                    </span>
                </div>

            </div>

            {/* Animación del pulso CSS */}
            <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default OfflineScreen;
