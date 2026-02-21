import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaEye, FaPrint, FaSpinner, FaPlus, FaCheck } from 'react-icons/fa';
import api from '../services/api';
import FacturaTermica from './FacturaTermica';

const Facturas = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [citasPendientes, setCitasPendientes] = useState([]);
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [facturaImprimir, setFacturaImprimir] = useState(null);

  useEffect(() => {
    fetchFacturas();
    fetchCitasPendientes();
  }, [filtroEstado]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.getFacturas(params);
      setFacturas(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error(err);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCitasPendientes = async () => {
    try {
      const response = await api.getCitas({ pagado: false });
      setCitasPendientes((Array.isArray(response) ? response : []).filter(c => c.estado === 'completada' || c.estado === 'programada'));
    } catch (err) {
      console.error(err);
      setCitasPendientes([]);
    }
  };

  const verDetalle = async (factura) => {
    try {
      const response = await api.getFactura(factura._id || factura.id);
      setFacturaDetalle(response);
    } catch (err) {
      console.error(err);
    }
  };

  const imprimirFactura = async (factura) => {
    try {
      const response = await api.getFactura(factura._id || factura.id);
      const facturaCompleta = response;
      
      let pacienteData = facturaCompleta.paciente || facturaCompleta.datosCliente;
      
      if (typeof pacienteData === 'string') {
        try {
          const pacienteResponse = await api.getPaciente(pacienteData);
          pacienteData = pacienteResponse.data;
        } catch (e) {
          pacienteData = facturaCompleta.datosCliente || { nombre: 'N/A' };
        }
      }

      const estudios = (facturaCompleta.detalles || facturaCompleta.items || []).map(item => ({
        nombre: item.descripcion || item.nombre || 'Estudio',
        precio: item.precioUnitario || item.precio_unitario || item.precio || 0,
        cobertura: item.descuento || item.cobertura || 0
      }));

      const facturaConPago = {
        ...facturaCompleta,
        montoPagado: facturaCompleta.montoPagado || facturaCompleta.total_pagado || facturaCompleta.monto_pagado || 0,
        numero: facturaCompleta.numero || facturaCompleta.numero_factura,
        autorizacion: facturaCompleta.ncf || '',
      };
      setFacturaImprimir({
        factura: facturaConPago,
        paciente: pacienteData,
        estudios: estudios
      });
    } catch (err) {
      console.error('Error al cargar factura:', err);
      alert('Error al cargar la factura para imprimir');
    }
  };

  const crearFactura = async () => {
    if (!citaSeleccionada) return;
    
    try {
      const items = citaSeleccionada.estudios?.map(e => ({
        descripcion: e.estudio?.nombre || 'Estudio',
        nombre: e.estudio?.nombre || 'Estudio',
        estudio: e.estudio?._id || e.estudio,
        cantidad: 1,
        precio: e.precio || 0,
        precioUnitario: e.precio || 0,
        cobertura: e.cobertura || 0,
        subtotal: e.precio || 0
      })) || [];

      const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const cobertura = items.reduce((sum, i) => sum + (i.cobertura || 0), 0);
      const total = subtotal - cobertura;

      await api.createFactura({
        paciente: citaSeleccionada.paciente?._id || citaSeleccionada.paciente,
        cita: citaSeleccionada._id,
        items,
        subtotal,
        cobertura,
        total,
        montoPagado: total,
        metodoPago: 'efectivo',
        estado: 'pagada'
      });

      alert('Factura creada exitosamente');
      setShowModalNueva(false);
      setCitaSeleccionada(null);
      fetchFacturas();
      fetchCitasPendientes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const calcularTotalHoy = () => {
    const hoy = new Date().toDateString();
    return facturas
      .filter(f => new Date(f.fecha_factura || f.createdAt).toDateString() === hoy && f.estado !== 'anulada')
      .reduce((sum, f) => sum + (f.total || 0), 0);
  };

  const calcularTotalMes = () => {
    const ahora = new Date();
    return facturas
      .filter(f => {
        const fecha = new Date(f.fecha_factura || f.createdAt);
        return fecha.getMonth() === ahora.getMonth() && 
               fecha.getFullYear() === ahora.getFullYear() && 
               f.estado !== 'anulada';
      })
      .reduce((sum, f) => sum + (f.total || 0), 0);
  };

  const getTexto = (valor) => {
    if (!valor) return 'N/A';
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'number') return valor.toString();
    if (typeof valor === 'object') {
      return valor.nombre || valor.tipo || valor.descripcion || 'N/A';
    }
    return String(valor);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <FaSpinner className="spin" style={{ fontSize: 40 }} />
      </div>
    );
  }

  if (facturaImprimir) {
    return (
      <FacturaTermica
        factura={facturaImprimir.factura}
        paciente={facturaImprimir.paciente}
        estudios={facturaImprimir.estudios}
        onClose={() => setFacturaImprimir(null)}
      />
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaFileInvoiceDollar style={{ color: '#27ae60' }} /> Facturacion
        </h1>
        <button
          onClick={() => setShowModalNueva(true)}
          style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}
        >
          <FaPlus /> Nueva Factura
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 25 }}>
        <div style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)', padding: 20, borderRadius: 10, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Facturado Hoy</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>RD$ {calcularTotalHoy().toLocaleString()}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', padding: 20, borderRadius: 10, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Facturado Este Mes</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>RD$ {calcularTotalMes().toLocaleString()}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)', padding: 20, borderRadius: 10, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Total Facturas</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{facturas.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', minWidth: 150 }}
        >
          <option value="">Todos los estados</option>
          <option value="emitida">Emitidas</option>
          <option value="pagada">Pagadas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: 15, textAlign: 'left' }}>Numero</th>
              <th style={{ padding: 15, textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: 15, textAlign: 'left' }}>Paciente</th>
              <th style={{ padding: 15, textAlign: 'right' }}>Total</th>
              <th style={{ padding: 15, textAlign: 'center' }}>Estado</th>
              <th style={{ padding: 15, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                  No hay facturas registradas
                </td>
              </tr>
            ) : (
              facturas.map(f => (
                <tr key={f._id || f.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 15, fontFamily: 'monospace' }}>{f.numero || f.numero_factura}</td>
                  <td style={{ padding: 15 }}>{new Date(f.fecha_factura || f.createdAt).toLocaleDateString('es-DO')}</td>
                  <td style={{ padding: 15 }}>{getTexto(f.datosCliente?.nombre || f.paciente?.nombre || f.paciente?.nombre_completo)}</td>
                  <td style={{ padding: 15, textAlign: 'right', fontWeight: 'bold' }}>
                    RD$ {(f.total || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: 15, textAlign: 'center' }}>
                    <span style={{
                      padding: '5px 12px',
                      borderRadius: 15,
                      fontSize: 12,
                      background: f.estado === 'pagada' ? '#d4edda' : f.estado === 'emitida' ? '#fff3cd' : '#f8d7da',
                      color: f.estado === 'pagada' ? '#155724' : f.estado === 'emitida' ? '#856404' : '#721c24'
                    }}>
                      {f.estado}
                    </span>
                  </td>
                  <td style={{ padding: 15, textAlign: 'center' }}>
                    <button
                      onClick={() => verDetalle(f)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginRight: 10 }}
                      title="Ver detalle"
                    >
                      <FaEye style={{ color: '#3498db' }} />
                    </button>
                    <button
                      onClick={() => imprimirFactura(f)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      title="Imprimir factura"
                    >
                      <FaPrint style={{ color: '#27ae60' }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {facturaDetalle && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }} onClick={() => setFacturaDetalle(null)}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Factura {facturaDetalle.numero || facturaDetalle.numero_factura}</h2>
              <button onClick={() => setFacturaDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>x</button>
            </div>

            <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <p style={{ margin: '5px 0' }}><strong>Cliente:</strong> {getTexto(facturaDetalle.datosCliente?.nombre || facturaDetalle.paciente?.nombre || facturaDetalle.paciente?.nombre_completo)}</p>
              <p style={{ margin: '5px 0' }}><strong>Cedula:</strong> {getTexto(facturaDetalle.datosCliente?.cedula || facturaDetalle.paciente?.cedula)}</p>
              <p style={{ margin: '5px 0' }}><strong>Fecha:</strong> {new Date(facturaDetalle.fecha_factura || facturaDetalle.createdAt).toLocaleDateString('es-DO')}</p>
            </div>

            <h4>Estudios:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>Descripcion</th>
                  <th style={{ padding: 10, textAlign: 'right', border: '1px solid #ddd' }}>Cobertura</th>
                  <th style={{ padding: 10, textAlign: 'right', border: '1px solid #ddd' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {(facturaDetalle.items || []).map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: 10, border: '1px solid #ddd' }}>{getTexto(item.descripcion || item.nombre)}</td>
                    <td style={{ padding: 10, border: '1px solid #ddd', textAlign: 'right' }}>RD$ {(item.cobertura || 0).toLocaleString()}</td>
                    <td style={{ padding: 10, border: '1px solid #ddd', textAlign: 'right' }}>RD$ {(item.precioUnitario || item.precio || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '2px solid #333', paddingTop: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Subtotal:</span>
                <span>RD$ {(facturaDetalle.subtotal || 0).toLocaleString()}</span>
              </div>
              {(facturaDetalle.cobertura || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'green' }}>
                  <span>Cobertura Seguro:</span>
                  <span>-RD$ {(facturaDetalle.cobertura || 0).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 'bold', padding: '10px 0', borderTop: '1px dashed #ccc' }}>
                <span>TOTAL:</span>
                <span>RD$ {(facturaDetalle.total || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Monto Pagado:</span>
                <span>RD$ {(facturaDetalle.montoPagado || 0).toLocaleString()}</span>
              </div>
              {(facturaDetalle.total - (facturaDetalle.montoPagado || 0)) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#fff3cd', borderRadius: 5, fontWeight: 'bold', color: '#856404' }}>
                  <span>PENDIENTE:</span>
                  <span>RD$ {(facturaDetalle.total - (facturaDetalle.montoPagado || 0)).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button 
                onClick={() => {
                  setFacturaDetalle(null);
                  imprimirFactura(facturaDetalle);
                }} 
                style={{ flex: 1, padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <FaPrint /> Imprimir
              </button>
              <button onClick={() => setFacturaDetalle(null)} style={{ flex: 1, padding: 12, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalNueva && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Nueva Factura</h2>
            
            <p>Seleccione una cita para facturar:</p>
            
            {citasPendientes.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>No hay citas pendientes de facturar</p>
            ) : (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {citasPendientes.map(cita => (
                  <div
                    key={cita._id}
                    onClick={() => setCitaSeleccionada(cita)}
                    style={{
                      padding: 15,
                      border: citaSeleccionada?._id === cita._id ? '2px solid #27ae60' : '1px solid #ddd',
                      borderRadius: 8,
                      marginBottom: 10,
                      cursor: 'pointer',
                      background: citaSeleccionada?._id === cita._id ? '#e8f5e9' : 'white'
                    }}
                  >
                    <strong>{getTexto(cita.paciente?.nombre)} {getTexto(cita.paciente?.apellido)}</strong>
                    <div style={{ fontSize: 14, color: '#666' }}>
                      {cita.estudios?.map(e => getTexto(e.estudio?.nombre || 'Estudio')).join(', ')}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#27ae60' }}>
                      Total: RD$ {(cita.total || cita.estudios?.reduce((s, e) => s + (e.precio || 0), 0) || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={crearFactura}
                disabled={!citaSeleccionada}
                style={{ flex: 1, padding: 12, background: citaSeleccionada ? '#27ae60' : '#ccc', color: 'white', border: 'none', borderRadius: 8, cursor: citaSeleccionada ? 'pointer' : 'not-allowed', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <FaCheck /> Crear Factura
              </button>
              <button
                onClick={() => { setShowModalNueva(false); setCitaSeleccionada(null); }}
                style={{ flex: 1, padding: 12, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
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

export default Facturas;
