import React, { useState } from 'react';
import axios from 'axios';

const API = '/api';

function FormularioPaciente() {
  const [form, setForm] = useState({
    cedula: '', nombre: '', apellido: '', fecha_nacimiento: '',
    sexo: '', telefono: '', celular: '', email: '', direccion: '',
    ciudad: '', seguro_medico: '', numero_poliza: '', tipo_sangre: '',
    alergias: ''
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pacienteCreado, setPacienteCreado] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError('Nombre y apellido son requeridos');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/pacientes/`, form, { headers });
      setPacienteCreado(res.data.paciente);
      setMensaje(`? Paciente ${res.data.paciente.nombre} ${res.data.paciente.apellido} creado exitosamente`);
      setForm({
        cedula: '', nombre: '', apellido: '', fecha_nacimiento: '',
        sexo: '', telefono: '', celular: '', email: '', direccion: '',
        ciudad: '', seguro_medico: '', numero_poliza: '', tipo_sangre: '',
        alergias: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>? Nuevo Paciente</h2>

        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '16px', color: '#4a5568' }}>?? Datos Personales</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Cédula</label>
              <input name="cedula" value={form.cedula} onChange={handleChange} placeholder="000-0000000-0" />
            </div>
            <div className="form-group">
              <label>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required />
            </div>
            <div className="form-group">
              <label>Apellido *</label>
              <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" required />
            </div>
            <div className="form-group">
              <label>Fecha de Nacimiento</label>
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Sexo</label>
              <select name="sexo" value={form.sexo} onChange={handleChange}>
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de Sangre</label>
              <select name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange}>
                <option value="">Seleccionar</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', color: '#4a5568' }}>?? Contacto</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="809-000-0000" />
            </div>
            <div className="form-group">
              <label>Celular</label>
              <input name="celular" value={form.celular} onChange={handleChange} placeholder="809-000-0000" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-group">
              <label>Ciudad</label>
              <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Santo Domingo" />
            </div>
            <div className="form-group form-group-full">
              <label>Dirección</label>
              <textarea name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección completa" rows="2" />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', color: '#4a5568' }}>?? Seguro Médico</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Seguro Médico</label>
              <select name="seguro_medico" value={form.seguro_medico} onChange={handleChange}>
                <option value="">Sin seguro</option>
                <option value="ARS Humano">ARS Humano</option>
                <option value="ARS Palic">ARS Palic</option>
                <option value="ARS Universal">ARS Universal</option>
                <option value="ARS Senasa">Senasa</option>
                <option value="ARS Mapfre">Mapfre</option>
                <option value="ARS Meta">Meta</option>
                <option value="ARS Monumental">Monumental</option>
                <option value="ARS Futuro">Futuro</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Número de Póliza</label>
              <input name="numero_poliza" value={form.numero_poliza} onChange={handleChange} placeholder="# Póliza" />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', color: '#4a5568' }}>?? Información Médica</h3>
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label>Alergias</label>
              <textarea name="alergias" value={form.alergias} onChange={handleChange} placeholder="Alergias conocidas (medicamentos, alimentos, etc.)" rows="2" />
            </div>
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '? Guardando...' : '?? Registrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioPaciente;
