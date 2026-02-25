import React, { useState, useEffect } from 'react';
import { FaUsers, FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaKey, FaSpinner, FaSave, FaTimes, FaBuilding } from 'react-icons/fa';
import api from '../services/api';

const ROLES_DEFAULT = [
  { value: 'admin', label: 'Administrador' },
  { value: 'medico', label: 'Médico' },
  { value: 'recepcion', label: 'Recepcionista' },
  { value: 'laboratorio', label: 'Laboratorista' },
  { value: 'paciente', label: 'Paciente' }
];

const ROL_COLORS = {
  admin: '#e74c3c',
  medico: '#3498db',
  recepcion: '#27ae60',
  laboratorio: '#9b59b6',
  paciente: '#f39c12'
};

const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [roles, setRoles] = useState(ROLES_DEFAULT);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', username: '', password: '',
    role: 'recepcion', telefono: '', especialidad: '', sucursal: ''
  });

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
    fetchSucursales();
  }, []);

  const fetchSucursales = async () => {
    try {
      const res = await api.request('/sucursales');
      const lista = res?.data || res;
      setSucursales(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setSucursales([]);
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.getUsuarios();
      const lista = response?.data || response || [];
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setError(err.message);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.getRoles();
      if (Array.isArray(response) && response.length > 0) setRoles(response);
    } catch (err) {
      // usar default
    }
  };

  const abrirCrear = () => {
    setEditando(null);
    setFormData({ nombre: '', apellido: '', email: '', username: '', password: '', role: 'recepcion', telefono: '', especialidad: '', sucursal: '' });
    setShowModal(true);
  };

  const abrirEditar = (usuario) => {
    setEditando(usuario);
    const sucId = usuario.sucursal?._id || usuario.sucursal;
    setFormData({
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      email: usuario.email || '',
      username: usuario.username || '',
      password: '',
      role: usuario.role || usuario.rol || 'recepcion',
      telefono: usuario.telefono || '',
      especialidad: usuario.especialidad || '',
      sucursal: sucId ? String(sucId) : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = { ...formData };
      if (editando) {
        if (!userData.password) delete userData.password;
        if (!userData.sucursal) userData.sucursal = null;
        await api.updateUsuario(editando._id || editando.id, userData);
        alert('Usuario actualizado exitosamente');
      } else {
        if (!userData.sucursal) delete userData.sucursal;
        await api.createUsuario(userData);
        alert('Usuario creado exitosamente');
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.toggleUsuario(id);
      fetchUsuarios();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleResetPassword = async (id) => {
    const newPass = prompt('Nueva contraseña (mínimo 6 caracteres):');
    if (newPass && newPass.length >= 6) {
      try {
        await api.resetPasswordUsuario(id, newPass);
        alert('Contraseña actualizada exitosamente');
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const getRolLabel = (role) => {
    const r = roles.find(r => r.value === role);
    return r ? r.label : role;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
      <FaSpinner style={{ fontSize: 40, animation: 'spin 1s linear infinite', color: '#3498db' }} />
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#2c3e50' }}>
          <FaUsers /> Gestión de Usuarios
        </h1>
        <button onClick={abrirCrear} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {error && <div style={{ background: '#fee', padding: 15, borderRadius: 8, marginBottom: 20, color: '#c00', border: '1px solid #fcc' }}>{error}</div>}

      <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: 15, textAlign: 'left', color: '#666', fontWeight: 600 }}>Nombre</th>
              <th style={{ padding: 15, textAlign: 'left', color: '#666', fontWeight: 600 }}>Usuario</th>
              <th style={{ padding: 15, textAlign: 'left', color: '#666', fontWeight: 600 }}>Teléfono</th>
              <th style={{ padding: 15, textAlign: 'left', color: '#666', fontWeight: 600 }}>Rol</th>
              <th style={{ padding: 15, textAlign: 'left', color: '#666', fontWeight: 600 }}>Sucursal</th>
              <th style={{ padding: 15, textAlign: 'center', color: '#666', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: 15, textAlign: 'center', color: '#666', fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 30, textAlign: 'center', color: '#999' }}>No hay usuarios registrados</td></tr>
            ) : (
              usuarios.map((u) => {
                const rol = u.role || u.rol || 'recepcion';
                return (
                  <tr key={u._id || u.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 15, fontWeight: 'bold' }}>{u.nombre} {u.apellido}</td>
                    <td style={{ padding: 15, color: '#555' }}>{u.username || u.email || '-'}</td>
                    <td style={{ padding: 15, color: '#555' }}>{u.telefono || '-'}</td>
                    <td style={{ padding: 15 }}>
                      <span style={{ background: ROL_COLORS[rol] || '#95a5a6', color: 'white', padding: '4px 10px', borderRadius: 15, fontSize: 12, fontWeight: 'bold' }}>
                        {getRolLabel(rol)}
                      </span>
                    </td>
                    <td style={{ padding: 15, color: '#555' }}>{u.sucursal?.nombre || (u.sucursal ? 'Asignada' : '-')}</td>
                    <td style={{ padding: 15, textAlign: 'center' }}>
                      <span style={{ color: u.activo ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                        {u.activo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: 15, textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button onClick={() => abrirEditar(u)} title="Editar" style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                        <FaEdit />
                      </button>
                      <button onClick={() => handleToggle(u._id || u.id)} title={u.activo ? 'Desactivar' : 'Activar'} style={{ background: u.activo ? '#e74c3c' : '#27ae60', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                        {u.activo ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                      <button onClick={() => handleResetPassword(u._id || u.id)} title="Cambiar contraseña" style={{ background: '#f39c12', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                        <FaKey />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input placeholder="Nombre *" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required style={inputStyle} />
                  <input placeholder="Apellido *" value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} required style={inputStyle} />
                </div>
                <input placeholder="Nombre de usuario *" type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required style={inputStyle} />
                <input placeholder={editando ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña * (mínimo 6 caracteres)"} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editando} minLength={editando ? 0 : 6} style={inputStyle} />
                <input placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} style={inputStyle} />
                <div>
                  <label style={{ fontSize: 13, color: '#666', marginBottom: 5, display: 'block' }}>Rol del usuario *</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} required style={{ ...inputStyle, background: 'white' }}>
                    {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#666', marginBottom: 5, display: 'block' }}><FaBuilding style={{ marginRight: 6 }} />Sucursal</label>
                  <select value={formData.sucursal} onChange={e => setFormData({ ...formData, sucursal: e.target.value })} style={{ ...inputStyle, background: 'white' }}>
                    <option value="">-- Sin sucursal --</option>
                    {sucursales.map(s => <option key={s._id} value={s._id}>{s.nombre} ({s.codigo || s._id})</option>)}
                  </select>
                  <small style={{ color: '#888', fontSize: 11 }}>Recomendado para Recepcionista y Laboratorista</small>
                </div>
                {formData.role === 'medico' && (
                  <input placeholder="Especialidad médica" value={formData.especialidad} onChange={e => setFormData({ ...formData, especialidad: e.target.value })} style={inputStyle} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" style={{ flex: 1, padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <FaSave /> {editando ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, background: '#ecf0f1', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = { padding: 12, borderRadius: 8, border: '1px solid #ddd', width: '100%', fontSize: 14, boxSizing: 'border-box' };

export default AdminUsuarios;
