import React, { useState, useEffect } from 'react';
import { FaFlask, FaSearch, FaPlus, FaEdit, FaCheck, FaSpinner, FaEye } from 'react-icons/fa';
import api from '../services/api';

const Resultados = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [resultadoEditar, setResultadoEditar] = useState(null);
  const [citas, setCitas] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  // Para crear resultado manual
  const [nuevoResultado, setNuevoResultado] = useState({
    valores: [],
    interpretacion: '',
    observaciones: '',
    conclusion: ''
  });

  useEffect(() => {
    fetchResultados();
    fetchCitasPendientes();
  }, [filtroEstado]);

  const fetchResultados = async () => {
    try {
      setLoading(true);
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.getResultados(params);
      setResultados(Array.isArray(response) ? response : (response.data || []));
    } catch (err) {
      console.error(err);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCitasPendientes = async () => {
    try {
      const response = await api.getCitas({ estado: 'completada' });
      setCitas(Array.isArray(response) ? response : (response.data || []));
    } catch (err) {
      console.error(err);
    }
  };

  const abrirModalNuevo = (cita) => {
    setCitaSeleccionada(cita);
    setNuevoResultado({
      valores: [{ parametro: '', valor: '', unidad: '', valorReferencia: '', estado: 'normal' }],
      interpretacion: '',
      observaciones: '',
      conclusion: ''
    });
    setShowModal(true);
  };

  const abrirModalEditar = (resultado) => {
    setResultadoEditar(resultado);
    setNuevoResultado({
      valores: resultado.valores || [{ parametro: '', valor: '', unidad: '', valorReferencia: '', estado: 'normal' }],
      interpretacion: resultado.interpretacion || '',
      observaciones: resultado.observaciones || '',
      conclusion: resultado.conclusion || ''
    });
    setShowModal(true);
  };

  const agregarValor = () => {
    setNuevoResultado({
      ...nuevoResultado,
      valores: [...nuevoResultado.valores, { parametro: '', valor: '', unidad: '', valorReferencia: '', estado: 'normal' }]
    });
  };

  const actualizarValor = (index, campo, value) => {
    const nuevosValores = [...nuevoResultado.valores];
    nuevosValores[index][campo] = value;
    setNuevoResultado({ ...nuevoResultado, valores: nuevosValores });
  };

  const eliminarValor = (index) => {
    const nuevosValores = nuevoResultado.valores.filter((_, i) => i !== index);
    setNuevoResultado({ ...nuevoResultado, valores: nuevosValores });
  };

  const guardarResultado = async () => {
    try {
      if (resultadoEditar) {
        await api.updateResultado(resultadoEditar._id, {
          ...nuevoResultado,
          estado: 'completado'
        });
        alert('Resultado actualizado');
      } else if (citaSeleccionada) {
        const estudio = citaSeleccionada.estudios?.[0]?.estudio;
        await api.createResultado({
          cita: citaSeleccionada._id,
          paciente: citaSeleccionada.paciente?._id || citaSeleccionada.paciente,
          estudio: estudio?._id || estudio,
          ...nuevoResultado,
          estado: 'completado'
        });
        alert('Resultado creado');
      }
      setShowModal(false);
      setResultadoEditar(null);
      setCitaSeleccionada(null);
      fetchResultados();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <FaSpinner className="spin" style={{ fontSize: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaFlask style={{ color: '#9b59b6' }} /> Gestión de Resultados
        </h1>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', minWidth: 200 }}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="en_proceso">En Proceso</option>
          <option value="completado">Completados</option>
        </select>
      </div>

      {/* Citas sin resultado (para crear nuevos) */}
      {citas.filter(c => !resultados.find(r => r.cita?._id === c._id || r.cita === c._id)).length > 0 && (
        <div style={{ background: '#fff3cd', padding: 15, borderRadius: 10, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', color: '#856404' }}>?? Citas pendientes de resultado:</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {citas.filter(c => !resultados.find(r => r.cita?._id === c._id || r.cita === c._id)).slice(0, 5).map(cita => (
              <button
                key={cita._id}
                onClick={() => abrirModalNuevo(cita)}
                style={{
                  padding: '8px 15px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <FaPlus /> {cita.paciente?.nombre} - {cita.estudios?.[0]?.estudio?.nombre || 'Estudio'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de resultados */}
      <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: 15, textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: 15, textAlign: 'left' }}>Paciente</th>
              <th style={{ padding: 15, textAlign: 'left' }}>Estudio</th>
              <th style={{ padding: 15, textAlign: 'center' }}>Estado</th>
              <th style={{ padding: 15, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resultados.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                  No hay resultados registrados
                </td>
              </tr>
            ) : (
              resultados.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 15 }}>
                    {new Date(r.createdAt).toLocaleDateString('es-DO')}
                  </td>
                  <td style={{ padding: 15 }}>
                    {r.paciente?.nombre} {r.paciente?.apellido}
                  </td>
                  <td style={{ padding: 15 }}>
                    {r.estudio?.nombre || 'N/A'}
                  </td>
                  <td style={{ padding: 15, textAlign: 'center' }}>
                    <span style={{
                      padding: '5px 12px',
                      borderRadius: 15,
                      fontSize: 12,
                      background: r.estado === 'completado' ? '#d4edda' : r.estado === 'pendiente' ? '#fff3cd' : '#cce5ff',
                      color: r.estado === 'completado' ? '#155724' : r.estado === 'pendiente' ? '#856404' : '#004085'
                    }}>
                      {r.estado}
                    </span>
                  </td>
                  <td style={{ padding: 15, textAlign: 'center' }}>
                    <button
                      onClick={() => abrirModalEditar(r)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginRight: 10 }}
                      title="Editar"
                    >
                      <FaEdit style={{ color: '#3498db' }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar resultado */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '50px 20px', overflow: 'auto', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, width: '100%', maxWidth: 800 }}>
            <h2 style={{ marginTop: 0 }}>
              {resultadoEditar ? 'Editar Resultado' : 'Nuevo Resultado'}
            </h2>

            {citaSeleccionada && (
              <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                <strong>Paciente:</strong> {citaSeleccionada.paciente?.nombre} {citaSeleccionada.paciente?.apellido}<br />
                <strong>Estudio:</strong> {citaSeleccionada.estudios?.[0]?.estudio?.nombre}
              </div>
            )}

            {/* Valores */}
            <h4>Valores del Resultado:</h4>
            {nuevoResultado.valores.map((v, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr auto', gap: 10, marginBottom: 10 }}>
                <input
                  placeholder="Parámetro"
                  value={v.parametro}
                  onChange={e => actualizarValor(index, 'parametro', e.target.value)}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <input
                  placeholder="Valor"
                  value={v.valor}
                  onChange={e => actualizarValor(index, 'valor', e.target.value)}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <input
                  placeholder="Unidad"
                  value={v.unidad}
                  onChange={e => actualizarValor(index, 'unidad', e.target.value)}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <input
                  placeholder="Valor Referencia"
                  value={v.valorReferencia}
                  onChange={e => actualizarValor(index, 'valorReferencia', e.target.value)}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <select
                  value={v.estado}
                  onChange={e => actualizarValor(index, 'estado', e.target.value)}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
                >
                  <option value="normal">Normal</option>
                  <option value="alto">Alto</option>
                  <option value="bajo">Bajo</option>
                  <option value="critico">Crítico</option>
                </select>
                <button
                  onClick={() => eliminarValor(index)}
                  style={{ padding: 10, background: '#e74c3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  ?
                </button>
              </div>
            ))}
            <button
              onClick={agregarValor}
              style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 20 }}
            >
              <FaPlus /> Agregar Valor
            </button>

            {/* Interpretación */}
            <div style={{ marginBottom: 15 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Interpretación:</label>
              <textarea
                value={nuevoResultado.interpretacion}
                onChange={e => setNuevoResultado({ ...nuevoResultado, interpretacion: e.target.value })}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', minHeight: 80, resize: 'vertical' }}
                placeholder="Escriba la interpretación de los resultados..."
              />
            </div>

            {/* Observaciones */}
            <div style={{ marginBottom: 15 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Observaciones:</label>
              <textarea
                value={nuevoResultado.observaciones}
                onChange={e => setNuevoResultado({ ...nuevoResultado, observaciones: e.target.value })}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', minHeight: 60, resize: 'vertical' }}
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Conclusión */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Conclusión:</label>
              <textarea
                value={nuevoResultado.conclusion}
                onChange={e => setNuevoResultado({ ...nuevoResultado, conclusion: e.target.value })}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', minHeight: 60, resize: 'vertical' }}
                placeholder="Conclusión final..."
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={guardarResultado}
                style={{ flex: 1, padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <FaCheck /> Guardar Resultado
              </button>
              <button
                onClick={() => { setShowModal(false); setResultadoEditar(null); setCitaSeleccionada(null); }}
                style={{ flex: 1, padding: 12, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resultados;
