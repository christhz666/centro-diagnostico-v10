import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = '/api';

function BuscadorPacientes() {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [historial, setHistorial] = useState(null);
  const timeoutRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (termino.length < 2) { setResultados(null); return; }

    timeoutRef.current = setTimeout(() => buscar(), 400);
    return () => clearTimeout(timeoutRef.current);
  }, [termino]);

  const buscar = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/busqueda/global?q=${encodeURIComponent(termino)}`, { headers });
      setResultados(res.data.resultados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verHistorial = async (pacienteId) => {
    try {
      const res = await axios.get(`${API}/medico/historial/${pacienteId}`, { headers });
      setPacienteSeleccionado(res.data.paciente);
      setHistorial(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatMoney = (n) => `RD$ ${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  return (
    <div className="buscador-container">
      <h2>?? Búsqueda Global</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar por nombre, cédula, teléfono, # orden, # factura..."
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          className="search-input"
          autoFocus
        />
        {loading && <span className="search-spinner">?</span>}
      </div>

      {resultados && (
        <div className="search-results">
          {/* Pacientes */}
          {resultados.pacientes.length > 0 && (
            <div className="result-section">
              <h3>?? Pacientes ({resultados.pacientes.length})</h3>
              <div className="result-list">
                {resultados.pacientes.map(p => (
                  <div key={p.id} className="result-item" onClick={() => verHistorial(p.id)}>
                    <div className="result-main">
                      <strong>{p.nombre}</strong>
                      <span className="result-badge">{p.estado}</span>
                    </div>
                    <div className="result-details">
                      {p.cedula && <span>?? {p.cedula}</span>}
                      {p.telefono && <span>?? {p.telefono}</span>}
                      {p.codigo && <span>??? {p.codigo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Órdenes */}
          {resultados.ordenes.length > 0 && (
            <div className="result-section">
              <h3>?? Órdenes ({resultados.ordenes.length})</h3>
              <div className="result-list">
                {resultados.ordenes.map(o => (
                  <div key={o.id} className="result-item">
                    <div className="result-main">
                      <strong>{o.numero_orden}</strong>
                      <span className={`result-badge badge-${o.estado}`}>{o.estado}</span>
                    </div>
                    <div className="result-details">
                      <span>?? {o.paciente}</span>
                      <span>?? {new Date(o.fecha).toLocaleDateString('es-DO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facturas */}
          {resultados.facturas.length > 0 && (
            <div className="result-section">
              <h3>?? Facturas ({resultados.facturas.length})</h3>
              <div className="result-list">
                {resultados.facturas.map(f => (
                  <div key={f.id} className="result-item">
                    <div className="result-main">
                      <strong>{f.numero_factura}</strong>
                      <span className={`result-badge badge-${f.estado}`}>{f.estado}</span>
                    </div>
                    <div className="result-details">
                      <span>?? {f.paciente}</span>
                      <span>?? {formatMoney(f.total)}</span>
                      {f.ncf && <span>?? {f.ncf}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultados.pacientes.length === 0 && resultados.ordenes.length === 0 && resultados.facturas.length === 0 && (
            <div className="no-results">
              <p>?? No se encontraron resultados para "{termino}"</p>
            </div>
          )}
        </div>
      )}

      {/* Historial del paciente seleccionado */}
      {pacienteSeleccionado && historial && (
        <div className="historial-modal">
          <div className="historial-content">
            <button className="close-btn" onClick={() => { setPacienteSeleccionado(null); setHistorial(null); }}>?</button>

            <h2>?? Historial de {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</h2>

            <div className="historial-info">
              <div className="info-grid">
                <span><strong>Cédula:</strong> {pacienteSeleccionado.cedula || 'N/A'}</span>
                <span><strong>Teléfono:</strong> {pacienteSeleccionado.telefono || 'N/A'}</span>
                <span><strong>Email:</strong> {pacienteSeleccionado.email || 'N/A'}</span>
                <span><strong>Tipo Sangre:</strong> {pacienteSeleccionado.tipo_sangre || 'N/A'}</span>
                <span><strong>Alergias:</strong> {pacienteSeleccionado.alergias || 'Ninguna'}</span>
              </div>
            </div>

            <div className="historial-stats">
              <span className="h-stat">?? {historial.total_ordenes} órdenes</span>
              <span className="h-stat">?? {historial.total_facturas} facturas</span>
              <span className="h-stat">?? {historial.total_resultados} resultados</span>
            </div>

            {historial.ordenes.length > 0 && (
              <div className="historial-section">
                <h3>Últimas Órdenes</h3>
                <table className="data-table">
                  <thead>
                    <tr><th>Orden</th><th>Fecha</th><th>Estado</th><th>Estudios</th></tr>
                  </thead>
                  <tbody>
                    {historial.ordenes.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td>{o.numero_orden}</td>
                        <td>{new Date(o.fecha_orden).toLocaleDateString('es-DO')}</td>
                        <td><span className={`badge badge-${o.estado}`}>{o.estado}</span></td>
                        <td>{o.total_estudios}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {historial.facturas.length > 0 && (
              <div className="historial-section">
                <h3>Últimas Facturas</h3>
                <table className="data-table">
                  <thead>
                    <tr><th>Factura</th><th>Fecha</th><th>Total</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {historial.facturas.slice(0, 5).map(f => (
                      <tr key={f.id}>
                        <td>{f.numero_factura}</td>
                        <td>{new Date(f.fecha_factura).toLocaleDateString('es-DO')}</td>
                        <td>{formatMoney(f.total)}</td>
                        <td><span className={`badge badge-${f.estado}`}>{f.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BuscadorPacientes;
