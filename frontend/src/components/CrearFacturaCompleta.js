import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FaFileInvoiceDollar, FaCheck, FaArrowLeft, FaClipboardList } from 'react-icons/fa';
import FacturaTermica from './FacturaTermica';

const API = '/api';

function CrearFacturaCompleta() {
  const navigate = useNavigate();
  const { ordenId } = useParams();
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facturaCreada, setFacturaCreada] = useState(null);
  const [formData, setFormData] = useState({
    tipo_comprobante: 'B02',
    forma_pago: 'efectivo',
    incluir_itbis: false,
    descuento_global: 0
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    cargarOrdenesPendientes();
  }, []);

  useEffect(() => {
    if (ordenId) {
      cargarOrdenDetalle(ordenId);
    }
  }, [ordenId]);

  const cargarOrdenesPendientes = async () => {
    try {
      const res = await axios.get(`${API}/ordenes/pendientes`, { headers });
      setOrdenesPendientes(res.data.ordenes || []);
    } catch (err) { console.error(err); }
  };

  const cargarOrdenDetalle = async (id) => {
    try {
      const res = await axios.get(`${API}/ordenes/${id}`, { headers });
      setOrdenSeleccionada(res.data);
      setOrdenDetalle(res.data);
    } catch (err) { console.error(err); }
  };

  const seleccionarOrden = (orden) => {
    setOrdenSeleccionada(orden);
    cargarOrdenDetalle(orden.id);
  };

  const formatMoney = (n) => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const calcularTotal = () => {
    if (!ordenDetalle || !ordenDetalle.detalles) return 0;
    return ordenDetalle.detalles.reduce((sum, d) => sum + (d.precio_final || 0), 0);
  };

  const crearFactura = async () => {
    if (!ordenSeleccionada) { alert('Seleccione una orden'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/facturas/crear-desde-orden/${ordenSeleccionada.id}`, formData, { headers });
      const facturaData = res.data.factura || res.data;
      
      setFacturaCreada({
        factura: facturaData,
        paciente: ordenSeleccionada.paciente,
        estudios: ordenDetalle.detalles?.map(d => ({
          nombre: d.estudio?.nombre || d.descripcion || 'Estudio',
          precio: d.precio_final || d.precio || 0,
          cobertura: d.cobertura || 0
        })) || []
      });
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  if (facturaCreada) {
    return (
      <FacturaTermica
        factura={facturaCreada.factura}
        paciente={facturaCreada.paciente}
        estudios={facturaCreada.estudios}
        onClose={() => {
          setFacturaCreada(null);
          navigate('/facturas');
        }}
      />
    );
  }

  const subtotal = calcularTotal();
  const descuento = formData.descuento_global || 0;
  const base = subtotal - descuento;
  const itbis = formData.incluir_itbis ? base * 0.18 : 0;
  const total = base + itbis;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><span className="page-title-icon"><FaFileInvoiceDollar /></span> Crear Factura</h2>
        <button className="btn btn-outline" onClick={() => navigate('/facturas')}><FaArrowLeft /> Volver</button>
      </div>

      <div className="content-grid">
        <div className="card">
          <div className="card-header"><h3><span className="card-h-icon"><FaClipboardList /></span> Seleccionar Orden</h3></div>
          <div className="card-body">
            {ordenesPendientes.length === 0 ? (
              <div className="empty-state"><p>No hay ordenes pendientes</p></div>
            ) : (
              <div>
                {ordenesPendientes.map(o => (
                  <div key={o.id} className="result-item-inline" onClick={() => seleccionarOrden(o)} style={{border: ordenSeleccionada?.id === o.id ? '2px solid var(--primary)' : '2px solid transparent', background: ordenSeleccionada?.id === o.id ? 'var(--primary-bg)' : 'var(--gray-50)'}}>
                    <div className="result-avatar"><FaClipboardList /></div>
                    <div className="result-info">
                      <strong>{o.numero_orden}</strong>
                      <span>{o.paciente?.nombre_completo || 'Paciente'} - {o.total_estudios || 0} estudios</span>
                    </div>
                    {ordenSeleccionada?.id === o.id && <FaCheck style={{color:'var(--primary)',fontSize:18}} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3><span className="card-h-icon"><FaFileInvoiceDollar /></span> Datos de Facturacion</h3></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo Comprobante</label>
                <select value={formData.tipo_comprobante} onChange={e => setFormData({...formData, tipo_comprobante: e.target.value})}>
                  <option value="B01">B01 - Credito Fiscal</option>
                  <option value="B02">B02 - Consumidor Final</option>
                  <option value="B14">B14 - Regimenes Especiales</option>
                  <option value="B15">B15 - Gubernamental</option>
                </select>
              </div>
              <div className="form-group">
                <label>Forma de Pago</label>
                <select value={formData.forma_pago} onChange={e => setFormData({...formData, forma_pago: e.target.value})}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descuento (RD$)</label>
                <input type="number" value={formData.descuento_global} onChange={e => setFormData({...formData, descuento_global: parseFloat(e.target.value) || 0})} min="0" />
              </div>
              <div className="form-group" style={{display:'flex',alignItems:'end'}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={formData.incluir_itbis} onChange={e => setFormData({...formData, incluir_itbis: e.target.checked})} style={{width:18,height:18}} />
                  Incluir ITBIS (18%)
                </label>
              </div>
            </div>

            {ordenSeleccionada && (
              <div style={{background:'var(--gray-50)',borderRadius:12,padding:16,marginTop:20}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:14}}><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                {descuento > 0 && <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:14,color:'var(--danger)'}}><span>Descuento</span><span>-{formatMoney(descuento)}</span></div>}
                {formData.incluir_itbis && <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:14}}><span>ITBIS (18%)</span><span>{formatMoney(itbis)}</span></div>}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:20,fontWeight:800,color:'var(--primary)',borderTop:'2px solid var(--gray-200)',paddingTop:10,marginTop:6}}><span>TOTAL</span><span>{formatMoney(total)}</span></div>
              </div>
            )}

            <div style={{marginTop:20}}>
              <button className="btn btn-success btn-block btn-lg" onClick={crearFactura} disabled={!ordenSeleccionada || loading}>
                <FaCheck /> {loading ? 'Creando...' : 'Crear e Imprimir Factura'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrearFacturaCompleta;
