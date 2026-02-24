import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaCalculator, FaSearch, FaPlus, FaTrash, FaPrint, FaUserPlus,
  FaCheck, FaFileAlt, FaTimes
} from 'react-icons/fa';

const API = '/api';

function Cotizaciones() {
  const navigate = useNavigate();
  const [estudios, setEstudios] = useState([]);
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [cotizacionGuardada, setCotizacionGuardada] = useState(false);
  const [historialCotizaciones, setHistorialCotizaciones] = useState([]);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [formPaciente, setFormPaciente] = useState({
    nombre: '', apellido: '', cedula: '', telefono: '', celular: '',
    email: '', sexo: '', fecha_nacimiento: '', seguro_medico: '', direccion: ''
  });
  const [registrando, setRegistrando] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEstudios();
    cargarCotizacionesLocal();
  }, []);

  const fetchEstudios = async () => {
    try {
      const res = await axios.get(`${API}/estudios/`, { headers });
      setEstudios(res.data.estudios || []);
    } catch (err) { console.error(err); }
  };

  const cargarCotizacionesLocal = () => {
    try {
      const saved = localStorage.getItem('cotizaciones');
      if (saved) setHistorialCotizaciones(JSON.parse(saved));
    } catch(e) {}
  };

  const agregarEstudio = (e) => {
    if (!seleccionados.find(s => s.id === e.id)) {
      setSeleccionados([...seleccionados, { ...e, cantidad: 1 }]);
    }
  };

  const quitarEstudio = (id) => {
    setSeleccionados(seleccionados.filter(s => s.id !== id));
  };

  const formatMoney = (n) => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });
  const total = seleccionados.reduce((sum, s) => sum + (s.precio * s.cantidad), 0);

  const guardarCotizacion = () => {
    if (seleccionados.length === 0) { alert('Agregue al menos un estudio'); return; }
    const cotizacion = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      cliente: nombreCliente || 'Sin nombre',
      telefono: telefonoCliente,
      estudios: seleccionados.map(s => ({ id: s.id, codigo: s.codigo, nombre: s.nombre, precio: s.precio })),
      total: total
    };
    const nuevas = [cotizacion, ...historialCotizaciones].slice(0, 50);
    setHistorialCotizaciones(nuevas);
    localStorage.setItem('cotizaciones', JSON.stringify(nuevas));
    setCotizacionGuardada(true);
  };

  const imprimirCotizacion = () => {
    const win = window.open('', '_blank');
    const estudiosHtml = seleccionados.map(s => 
      '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + s.nombre + '</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">' + formatMoney(s.precio) + '</td></tr>'
    ).join('');
    
    win.document.write('<html><head><title>Cotizacion - Mi Esperanza</title>');
    win.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}h2{text-align:center;color:#4f46e5}table{width:100%;border-collapse:collapse;margin:15px 0}.total{text-align:right;font-size:20px;font-weight:bold;color:#4f46e5;margin-top:10px;padding-top:10px;border-top:2px solid #4f46e5}.footer{text-align:center;color:#888;font-size:12px;margin-top:20px}</style>');
    win.document.write('</head><body>');
    win.document.write('<h2>MI ESPERANZA<br><small style="font-size:14px;color:#666">CENTRO DIAGNOSTICO</small></h2>');
    win.document.write('<p style="text-align:center;color:#888;font-size:12px">RNC: 000-00000-0 | Tel: 809-000-0000</p>');
    win.document.write('<hr>');
    win.document.write('<h3 style="text-align:center">COTIZACION</h3>');
    win.document.write('<p><strong>Cliente:</strong> ' + (nombreCliente || 'N/A') + '</p>');
    if (telefonoCliente) win.document.write('<p><strong>Tel:</strong> ' + telefonoCliente + '</p>');
    win.document.write('<p><strong>Fecha:</strong> ' + new Date().toLocaleDateString('es-DO') + '</p>');
    win.document.write('<table><thead><tr><th style="text-align:left;padding:8px;border-bottom:2px solid #4f46e5">Estudio</th><th style="text-align:right;padding:8px;border-bottom:2px solid #4f46e5">Precio</th></tr></thead><tbody>');
    win.document.write(estudiosHtml);
    win.document.write('</tbody></table>');
    win.document.write('<div class="total">TOTAL: ' + formatMoney(total) + '</div>');
    win.document.write('<div class="footer"><p>Esta cotizacion tiene validez de 30 dias</p><p>Gracias por preferirnos</p></div>');
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const iniciarRegistro = () => {
    setFormPaciente({
      nombre: nombreCliente.split(' ')[0] || '',
      apellido: nombreCliente.split(' ').slice(1).join(' ') || '',
      cedula: '', telefono: telefonoCliente, celular: '',
      email: '', sexo: '', fecha_nacimiento: '', seguro_medico: '', direccion: ''
    });
    setMostrarRegistro(true);
  };

  const registrarYCrearOrden = async () => {
    if (!formPaciente.nombre || !formPaciente.apellido) {
      alert('Nombre y apellido son requeridos');
      return;
    }
    setRegistrando(true);
    try {
      // Crear paciente
      const resPac = await axios.post(`${API}/pacientes/`, formPaciente, { headers });
      const paciente = resPac.data.paciente;
      
      // Crear orden con los estudios de la cotizacion
      const resOrden = await axios.post(`${API}/ordenes/`, {
        paciente_id: paciente.id,
        medico_referente: '',
        prioridad: 'normal',
        estudios: seleccionados.map(s => ({ estudio_id: s.id, descuento: 0 }))
      }, { headers });

      alert('Paciente registrado y orden creada: ' + resOrden.data.orden.numero_orden);
      setMostrarRegistro(false);
      
      if (window.confirm('Desea facturar esta orden ahora?')) {
        navigate('/crear-factura/' + resOrden.data.orden.id);
      } else {
        navigate('/');
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally { setRegistrando(false); }
  };

  const nuevaCotizacion = () => {
    setSeleccionados([]);
    setNombreCliente('');
    setTelefonoCliente('');
    setCotizacionGuardada(false);
    setMostrarRegistro(false);
  };

  const cargarCotizacion = (cot) => {
    setNombreCliente(cot.cliente);
    setTelefonoCliente(cot.telefono || '');
    const estudiosRecuperados = cot.estudios.map(e => {
      const estudioCompleto = estudios.find(es => es.id === e.id);
      return estudioCompleto ? { ...estudioCompleto, cantidad: 1 } : { ...e, cantidad: 1 };
    }).filter(Boolean);
    setSeleccionados(estudiosRecuperados);
    setCotizacionGuardada(false);
  };

  const estudiosFiltrados = estudios.filter(e => 
    e.nombre.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
    (e.codigo || '').toLowerCase().includes(buscarEstudio.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><span className="page-title-icon"><FaCalculator /></span> Cotizaciones</h2>
      </div>

      <div className="estudios-grid">
        {/* Catalogo */}
        <div className="card">
          <div className="card-header"><h3><span className="card-h-icon"><FaSearch /></span> Catalogo de Estudios</h3></div>
          <div className="card-body">
            <div className="search-box" style={{marginBottom:14}}>
              <FaSearch className="search-icon" />
              <input className="search-input" placeholder="Buscar estudio..." value={buscarEstudio} onChange={e => setBuscarEstudio(e.target.value)} />
            </div>
            <div className="estudios-list">
              {estudiosFiltrados.map(e => (
                <div key={e.id} className="estudio-item" onClick={() => agregarEstudio(e)}>
                  <span className="estudio-codigo">{e.codigo}</span>
                  <span className="estudio-nombre">{e.nombre}</span>
                  <span className="estudio-precio">{formatMoney(e.precio)}</span>
                  <FaPlus style={{color:'var(--primary)',flexShrink:0}} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cotizacion */}
        <div className="card">
          <div className="card-header">
            <h3><span className="card-h-icon"><FaFileAlt /></span> Cotizacion</h3>
            {seleccionados.length > 0 && <button className="btn btn-sm btn-outline" onClick={nuevaCotizacion}>Nueva</button>}
          </div>
          <div className="card-body">
            <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',marginBottom:16}}>
              <div className="form-group"><label>Nombre del cliente</label><input value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Nombre completo" /></div>
              <div className="form-group"><label>Telefono</label><input value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} placeholder="809-000-0000" /></div>
            </div>

            {seleccionados.length === 0 ? (
              <div className="empty-state" style={{padding:30}}><FaCalculator className="empty-icon" style={{fontSize:36}} /><p>Agregue estudios del catalogo</p></div>
            ) : (
              <div className="estudios-seleccionados">
                {seleccionados.map(s => (
                  <div key={s.id} className="estudio-sel-item">
                    <div className="estudio-sel-info">
                      <strong>{s.nombre}</strong>
                      <span>{formatMoney(s.precio)}</span>
                    </div>
                    <button className="btn-remove" onClick={() => quitarEstudio(s.id)}><FaTrash /></button>
                  </div>
                ))}
              </div>
            )}

            {seleccionados.length > 0 && (
              <>
                <div className="orden-total"><span>Total Cotizacion:</span><span className="total-amount">{formatMoney(total)}</span></div>

                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <button className="btn btn-primary" onClick={guardarCotizacion} style={{flex:1}}><FaCheck /> Guardar</button>
                  <button className="btn btn-outline" onClick={imprimirCotizacion}><FaPrint /> Imprimir</button>
                </div>

                {cotizacionGuardada && (
                  <div className="alert alert-success" style={{marginTop:16}}>
                    <FaCheck /> Cotizacion guardada. El cliente desea proceder?
                    <button className="btn btn-success btn-sm" onClick={iniciarRegistro} style={{marginLeft:10}}><FaUserPlus /> Registrar Paciente y Crear Orden</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Historial de cotizaciones */}
      {historialCotizaciones.length > 0 && (
        <div className="card" style={{marginTop:24}}>
          <div className="card-header"><h3><span className="card-h-icon"><FaFileAlt /></span> Cotizaciones Recientes</h3></div>
          <div className="card-body no-pad">
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Estudios</th><th>Total</th><th>Acciones</th></tr></thead>
                <tbody>
                  {historialCotizaciones.slice(0, 10).map(c => (
                    <tr key={c.id}>
                      <td>{new Date(c.fecha).toLocaleDateString('es-DO')}</td>
                      <td><strong>{c.cliente}</strong></td>
                      <td><span style={{background:'var(--primary-bg)',color:'var(--primary)',padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600}}>{c.estudios.length}</span></td>
                      <td><strong style={{color:'var(--success)'}}>{formatMoney(c.total)}</strong></td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => cargarCotizacion(c)}>Cargar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registro Paciente */}
      {mostrarRegistro && (
        <div className="modal-overlay" onClick={() => setMostrarRegistro(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:600}}>
            <button className="close-btn" onClick={() => setMostrarRegistro(false)}><FaTimes /></button>
            <h3 style={{display:'flex',alignItems:'center',gap:10}}><FaUserPlus style={{color:'var(--primary)'}} /> Registrar Paciente desde Cotizacion</h3>
            
            <div className="form-grid">
              <div className="form-group"><label>Nombre *</label><input value={formPaciente.nombre} onChange={e => setFormPaciente({...formPaciente, nombre: e.target.value})} /></div>
              <div className="form-group"><label>Apellido *</label><input value={formPaciente.apellido} onChange={e => setFormPaciente({...formPaciente, apellido: e.target.value})} /></div>
              <div className="form-group"><label>Cedula</label><input value={formPaciente.cedula} onChange={e => setFormPaciente({...formPaciente, cedula: e.target.value})} /></div>
              <div className="form-group"><label>Telefono</label><input value={formPaciente.telefono} onChange={e => setFormPaciente({...formPaciente, telefono: e.target.value})} /></div>
              <div className="form-group"><label>Email</label><input value={formPaciente.email} onChange={e => setFormPaciente({...formPaciente, email: e.target.value})} type="email" /></div>
              <div className="form-group"><label>Sexo</label>
                <select value={formPaciente.sexo} onChange={e => setFormPaciente({...formPaciente, sexo: e.target.value})}>
                  <option value="">Seleccionar</option><option value="M">Masculino</option><option value="F">Femenino</option>
                </select>
              </div>
              <div className="form-group"><label>Fecha Nacimiento</label><input type="date" value={formPaciente.fecha_nacimiento} onChange={e => setFormPaciente({...formPaciente, fecha_nacimiento: e.target.value})} /></div>
              <div className="form-group"><label>Seguro Medico</label>
                <select value={formPaciente.seguro_medico} onChange={e => setFormPaciente({...formPaciente, seguro_medico: e.target.value})}>
                  <option value="">Privado</option><option value="Senasa">Senasa</option><option value="Humano">Humano</option><option value="Universal">Universal</option><option value="Palic">Palic</option>
                </select>
              </div>
            </div>

            <div style={{background:'var(--gray-50)',borderRadius:12,padding:14,margin:'16px 0'}}>
              <strong style={{fontSize:13}}>Se creara orden con {seleccionados.length} estudios por {formatMoney(total)}</strong>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={() => setMostrarRegistro(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={registrarYCrearOrden} disabled={registrando}>
                <FaCheck /> {registrando ? 'Procesando...' : 'Registrar y Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cotizaciones;
