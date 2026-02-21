import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

function FormularioOrden({ onSuccess }) {
  const [pacientes, setPacientes] = useState([]);
  const [estudios, setEstudios] = useState([]);
  const [formData, setFormData] = useState({
    paciente_id: '', medico_referente: '', prioridad: 'normal', estudios: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const [resPacientes, resEstudios] = await Promise.all([
      axios.get(`${API_URL}/pacientes/`, { headers }),
      axios.get(`${API_URL}/estudios/`, { headers })
    ]);
    setPacientes(resPacientes.data.pacientes || []);
    setEstudios(resEstudios.data.estudios || []);
  };

  const agregarEstudio = (estudioId) => {
    if (formData.estudios.find(e => e.estudio_id === estudioId)) {
      alert('Este estudio ya fue agregado');
      return;
    }
    setFormData({
      ...formData,
      estudios: [...formData.estudios, { estudio_id: estudioId, descuento: 0 }]
    });
  };

  const removerEstudio = (estudioId) => {
    setFormData({
      ...formData,
      estudios: formData.estudios.filter(e => e.estudio_id !== estudioId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.estudios.length === 0) {
      alert('Debe agregar al menos un estudio');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/ordenes/`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Orden creada exitosamente');
      if (onSuccess) onSuccess();
      setFormData({ paciente_id: '', medico_referente: '', prioridad: 'normal', estudios: [] });
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear orden');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotal = () => {
    return formData.estudios.reduce((sum, est) => {
      const estudio = estudios.find(e => e.id === est.estudio_id);
      return sum + (estudio ? parseFloat(estudio.precio) - est.descuento : 0);
    }, 0);
  };

  return (
    <div className="form-container">
      <h2>Nueva Orden de Servicio</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Paciente *</label>
            <select value={formData.paciente_id} onChange={(e) => setFormData({...formData, paciente_id: parseInt(e.target.value)})} required>
              <option value="">Seleccione...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellido} - {p.cedula}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Médico Referente</label>
            <input type="text" value={formData.medico_referente} onChange={(e) => setFormData({...formData, medico_referente: e.target.value})} />
          </div>
        </div>
        
        <div className="form-group">
          <label>Agregar Estudios</label>
          <select onChange={(e) => { agregarEstudio(parseInt(e.target.value)); e.target.value = ''; }}>
            <option value="">Seleccione estudio...</option>
            {estudios.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} - RD$ {e.precio}</option>
            ))}
          </select>
        </div>

        <div className="estudios-seleccionados">
          <h3>Estudios Seleccionados</h3>
          {formData.estudios.length === 0 ? (
            <p>No hay estudios agregados</p>
          ) : (
            <table>
              <thead>
                <tr><th>Estudio</th><th>Precio</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {formData.estudios.map(est => {
                  const estudio = estudios.find(e => e.id === est.estudio_id);
                  return estudio ? (
                    <tr key={est.estudio_id}>
                      <td>{estudio.nombre}</td>
                      <td>RD$ {estudio.precio}</td>
                      <td><button type="button" onClick={() => removerEstudio(est.estudio_id)}>?</button></td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          )}
          <div className="total"><strong>Total: RD$ {calcularTotal().toFixed(2)}</strong></div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Orden'}
        </button>
      </form>
    </div>
  );
}

export default FormularioOrden;
