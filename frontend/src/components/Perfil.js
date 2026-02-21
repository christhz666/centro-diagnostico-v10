import React, { useState } from 'react';
import axios from 'axios';

const API = '/api';

function Perfil({ user }) {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const cambiarPassword = async () => {
    setError(''); setMensaje('');
    if (!passwordActual || !passwordNuevo) { setError('Complete todos los campos'); return; }
    if (passwordNuevo.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (passwordNuevo !== passwordConfirm) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/cambiar-password`, {
        password_actual: passwordActual, password_nuevo: passwordNuevo
      }, { headers });
      setMensaje('? Contraseña actualizada');
      setPasswordActual(''); setPasswordNuevo(''); setPasswordConfirm('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-container">
      <h2>?? Mi Perfil</h2>
      <div className="form-card">
        <div className="perfil-header">
          <div className="perfil-avatar">{user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}</div>
          <div className="perfil-info">
            <h3>{user?.nombre} {user?.apellido}</h3>
            <span className={`badge badge-${user?.rol}`}>{user?.rol}</span>
            <p>@{user?.username}</p>
          </div>
        </div>

        <h4 style={{marginTop: '24px'}}>?? Cambiar Contraseña</h4>
        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{maxWidth: '400px', marginTop: '16px'}}>
          <div className="form-group">
            <label>Contraseña Actual</label>
            <input type="password" value={passwordActual} onChange={e => setPasswordActual(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" value={passwordNuevo} onChange={e => setPasswordNuevo(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Confirmar Nueva</label>
            <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={cambiarPassword} disabled={loading}>
            {loading ? '?...' : '?? Cambiar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Perfil;
