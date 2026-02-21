import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = '/api';

function ReportesAvanzados() {
  const [tab, setTab] = useState('doctores');
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    // Defaults: último mes
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30*24*60*60*1000);
    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(hace30.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) fetchReporte();
  }, [tab, fechaInicio, fechaFin]);

  const fetchReporte = async () => {
    setLoading(true);
    try {
      let url = '';
      if (tab === 'doctores') url = `${API}/reportes/por-doctor`;
      else if (tab === 'seguros') url = `${API}/reportes/por-seguro`;
      else if (tab === 'estudios') url = `${API}/reportes/estudios-detallado`;
      else if (tab === 'diario') url = `${API}/reportes/ingresos-diarios?dias=30`;
      
      if (tab !== 'diario') {
        url += `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      }
      
      const res = await axios.get(url, { headers });
      setDatos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  return (
    <div className="page-container">
      <h2>?? Reportes Avanzados</h2>

      <div className="admin-tabs">
        <button className={`tab ${tab === 'doctores' ? 'active' : ''}`} onClick={() => setTab('doctores')}>????? Por Doctor</button>
        <button className={`tab ${tab === 'seguros' ? 'active' : ''}`} onClick={() => setTab('seguros')}>?? Por Seguro</button>
        <button className={`tab ${tab === 'estudios' ? 'active' : ''}`} onClick={() => setTab('estudios')}>?? Estudios</button>
        <button className={`tab ${tab === 'diario' ? 'active' : ''}`} onClick={() => setTab('diario')}>?? Ingresos Diarios</button>
      </div>

      {tab !== 'diario' && (
        <div className="filters-bar" style={{marginBottom: '20px'}}>
          <div className="form-group" style={{margin: 0}}>
            <label style={{fontSize: '0.8rem'}}>Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div className="form-group" style={{margin: 0}}>
            <label style={{fontSize: '0.8rem'}}>Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReporte}>?? Actualizar</button>
        </div>
      )}

      {loading ? <div className="loading">Cargando...</div> : (
        <div className="form-card">
          {/* Por Doctor */}
          {tab === 'doctores' && datos?.doctores && (
            <>
              <h3>Órdenes por Médico Referente</h3>
              <table className="data-table">
                <thead><tr><th>Médico</th><th>Órdenes</th><th>Facturado</th></tr></thead>
                <tbody>
                  {datos.doctores.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.nombre}</strong></td>
                      <td>{d.ordenes}</td>
                      <td>{formatMoney(d.facturado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Por Seguro */}
          {tab === 'seguros' && datos?.seguros && (
            <>
              <h3>Facturación por Seguro Médico</h3>
              <table className="data-table">
                <thead><tr><th>Seguro</th><th>Pacientes</th><th>Facturas</th><th>Total</th></tr></thead>
                <tbody>
                  {datos.seguros.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.seguro}</strong></td>
                      <td>{s.pacientes}</td>
                      <td>{s.facturas}</td>
                      <td>{formatMoney(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Estudios */}
          {tab === 'estudios' && datos?.estudios && (
            <>
              <h3>Estudios Realizados</h3>
              <table className="data-table">
                <thead><tr><th>Código</th><th>Estudio</th><th>Categoría</th><th>Cantidad</th><th>Total</th></tr></thead>
                <tbody>
                  {datos.estudios.slice(0, 50).map((e, i) => (
                    <tr key={i}>
                      <td><strong>{e.codigo}</strong></td>
                      <td>{e.nombre}</td>
                      <td>{e.categoria}</td>
                      <td>{e.cantidad}</td>
                      <td>{formatMoney(e.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Ingresos Diarios */}
          {tab === 'diario' && datos?.ingresos && (
            <>
              <h3>Ingresos Últimos 30 Días</h3>
              <div className="bar-chart" style={{height: '300px'}}>
                {datos.ingresos.slice(-14).map((d, i) => {
                  const max = Math.max(...datos.ingresos.map(x => x.total), 1);
                  return (
                    <div key={i} className="bar-item">
                      <div className="bar-label-top" style={{fontSize: '0.6rem'}}>
                        {d.total > 0 ? formatMoney(d.total) : ''}
                      </div>
                      <div className="bar-container">
                        <div className="bar-fill" style={{height: `${(d.total / max) * 100}%`}} />
                      </div>
                      <div className="bar-label" style={{fontSize: '0.65rem'}}>
                        {new Date(d.fecha).toLocaleDateString('es-DO', {day: '2-digit', month: 'short'})}
                      </div>
                    </div>
                  );
                })}
              </div>
              <table className="data-table" style={{marginTop: '20px'}}>
                <thead><tr><th>Fecha</th><th>Pagos</th><th>Total</th></tr></thead>
                <tbody>
                  {datos.ingresos.slice().reverse().slice(0, 30).map((d, i) => (
                    <tr key={i}>
                      <td>{new Date(d.fecha).toLocaleDateString('es-DO')}</td>
                      <td>{d.cantidad}</td>
                      <td><strong>{formatMoney(d.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportesAvanzados;
