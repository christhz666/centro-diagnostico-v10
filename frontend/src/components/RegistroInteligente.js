import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaSearch, FaPlus, FaTrash, FaSpinner, FaCheck, FaPrint } from 'react-icons/fa';
import api from '../services/api';
import FacturaTermica from './FacturaTermica';

const RegistroInteligente = () => {
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [estudios, setEstudios] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [facturaGenerada, setFacturaGenerada] = useState(null);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [montoPagado, setMontoPagado] = useState(0);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [autorizacion, setAutorizacion] = useState('');
  
  const [nuevoPaciente, setNuevoPaciente] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    esMenor: false,
    telefono: '',
    email: '',
    fechaNacimiento: '',
    sexo: 'M',
    nacionalidad: 'Dominicano',
    tipoSangre: '',
    seguroNombre: '',
    seguroNumeroAfiliado: ''
  });

  useEffect(() => {
    fetchEstudios();
    fetchCategorias();
  }, []);

  const fetchEstudios = async () => {
    try {
      const response = await api.getEstudios();
      setEstudios(Array.isArray(response) ? response : []);
    } catch (err) {
      setEstudios([]);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await api.getCategorias();
      setCategorias(Array.isArray(response) ? response : []);
    } catch (err) {
      setCategorias([]);
    }
  };

  const buscarPaciente = async () => {
    if (!busqueda.trim()) return;
    try {
      setLoading(true);
      const response = await api.getPacientes({ search: busqueda });
      setPacientes(Array.isArray(response) ? response : []);
    } catch (err) {
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPacienteExistente = (paciente) => {
    setPacienteSeleccionado(paciente);
    setPaso(2);
  };

  const crearPaciente = async () => {
    if (!nuevoPaciente.nombre || !nuevoPaciente.apellido || (!nuevoPaciente.esMenor && !nuevoPaciente.cedula) || !nuevoPaciente.telefono || !nuevoPaciente.fechaNacimiento) {
      alert('Complete todos los campos obligatorios');
      return;
    }
    try {
      setLoading(true);
      
      // Formatear datos del paciente para el backend
      const pacienteData = {
        nombre: nuevoPaciente.nombre,
        apellido: nuevoPaciente.apellido,
        cedula: nuevoPaciente.cedula,
        esMenor: nuevoPaciente.esMenor,
        telefono: nuevoPaciente.telefono,
        email: nuevoPaciente.email,
        fechaNacimiento: nuevoPaciente.fechaNacimiento,
        sexo: nuevoPaciente.sexo,
        nacionalidad: nuevoPaciente.nacionalidad,
        tipoSangre: nuevoPaciente.tipoSangre,
        seguro: {
          nombre: nuevoPaciente.seguroNombre || '',
          numeroAfiliado: nuevoPaciente.seguroNumeroAfiliado || '',
          tipo: nuevoPaciente.seguroNombre ? 'ARS' : ''
        }
      };
      
      const response = await api.createPaciente(pacienteData);
      const paciente = response.data || response;
      setPacienteSeleccionado(paciente);
      setPaso(2);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const agregarEstudio = (estudio) => {
    if (!estudiosSeleccionados.find(e => (e._id || e.id) === (estudio._id || estudio.id))) {
      setEstudiosSeleccionados([...estudiosSeleccionados, { ...estudio, cantidad: 1, cobertura: 0 }]);
    }
  };

  const quitarEstudio = (id) => {
    setEstudiosSeleccionados(estudiosSeleccionados.filter(e => (e._id || e.id) !== id));
  };

  const actualizarCobertura = (id, cobertura) => {
    setEstudiosSeleccionados(estudiosSeleccionados.map(e => 
      (e._id || e.id) === id ? { ...e, cobertura: parseFloat(cobertura) || 0 } : e
    ));
  };

  const calcularSubtotal = () => estudiosSeleccionados.reduce((sum, e) => sum + ((e.precio || 0) * (e.cantidad || 1)), 0);
  const calcularCobertura = () => estudiosSeleccionados.reduce((sum, e) => sum + (e.cobertura || 0), 0);
  const calcularTotal = () => calcularSubtotal() - calcularCobertura() - descuento;
  const calcularCambio = () => montoPagado - calcularTotal();

  const finalizarRegistro = async () => {
    if (estudiosSeleccionados.length === 0) {
      alert('Agregue al menos un estudio');
      return;
    }

    try {
      setLoading(true);

      const ahora = new Date();
      const fechaHoy = ahora.toISOString().split('T')[0];
      const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5);

      const citaData = {
        paciente: pacienteSeleccionado._id || pacienteSeleccionado.id,
        fecha: fechaHoy,
        horaInicio: horaActual,
        estudios: estudiosSeleccionados.map(e => ({
          estudio: e._id || e.id,
          precio: e.precio || 0,
          descuento: e.cobertura || 0
        })),
        subtotal: calcularSubtotal(),
        descuentoTotal: calcularCobertura() + descuento,
        total: calcularTotal(),
        metodoPago: metodoPago,
        pagado: montoPagado >= calcularTotal(),
        estado: 'completada',
        seguroAplicado: getSeguroNombre(pacienteSeleccionado) ? {
          nombre: getSeguroNombre(pacienteSeleccionado),
          cobertura: calcularCobertura(),
          autorizacion: autorizacion
        } : undefined
      };

      const citaResponse = await api.createCita(citaData);
      const cita = citaResponse.orden || citaResponse.data || citaResponse;

      const facturaData = {
        paciente: pacienteSeleccionado._id || pacienteSeleccionado.id,
        cita: cita._id || cita.id,
        items: estudiosSeleccionados.map(e => ({
          descripcion: e.nombre,
          estudio: e._id || e.id,
          cantidad: 1,
          precioUnitario: e.precio || 0,
          descuento: e.cobertura || 0,
          subtotal: (e.precio || 0) - (e.cobertura || 0)
        })),
        subtotal: calcularSubtotal(),
        descuento: descuento,
        total: calcularTotal(),
        montoPagado: montoPagado,
        metodoPago: metodoPago,
        pagado: montoPagado >= calcularTotal(),
        estado: montoPagado >= calcularTotal() ? 'pagada' : 'emitida',
        datosCliente: {
          nombre: (pacienteSeleccionado.nombre || '') + ' ' + (pacienteSeleccionado.apellido || ''),
          cedula: pacienteSeleccionado.cedula || '',
          telefono: pacienteSeleccionado.telefono || ''
        },
        notas: autorizacion ? 'Autorizacion: ' + autorizacion : ''
      };

      const facturaResponse = await api.createFactura(facturaData);
      const factura = facturaResponse.data || facturaResponse;

      setFacturaGenerada({
        ...factura,
        montoPagado: montoPagado,
        autorizacion: autorizacion
      });
      setMostrarFactura(true);

    } catch (err) {
      console.error('Error:', err);
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    setPaso(1);
    setBusqueda('');
    setPacientes([]);
    setPacienteSeleccionado(null);
    setEstudiosSeleccionados([]);
    setFacturaGenerada(null);
    setMostrarFactura(false);
    setDescuento(0);
    setMontoPagado(0);
    setAutorizacion('');
    setNuevoPaciente({
      nombre: '', apellido: '', cedula: '', telefono: '', email: '',
      fechaNacimiento: '', sexo: 'M', nacionalidad: 'Dominicano', tipoSangre: '',
      seguroNombre: '', seguroNumeroAfiliado: ''
    });
  };

  const getTexto = (valor) => {
    if (!valor) return '';
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'object') return valor.nombre || valor.tipo || '';
    return String(valor);
  };

  const getSeguroNombre = (pac) => {
    if (!pac?.seguro) return '';
    if (typeof pac.seguro === 'string') return pac.seguro;
    if (typeof pac.seguro === 'object') return pac.seguro.nombre || '';
    return '';
  };

  const getSeguroAfiliado = (pac) => {
    if (!pac?.seguro) return '';
    if (typeof pac.seguro === 'object') return pac.seguro.numeroAfiliado || pac.seguro.numeroPoliza || '';
    return '';
  };

  if (mostrarFactura && facturaGenerada) {
    return (
      <FacturaTermica
        factura={facturaGenerada}
        paciente={pacienteSeleccionado}
        estudios={estudiosSeleccionados}
        onClose={reiniciar}
      />
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 25, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FaUserPlus style={{ color: '#3498db' }} /> Nuevo Registro
      </h1>

      {/* PASOS */}
      <div style={{ display: 'flex', marginBottom: 30, background: '#f8f9fa', borderRadius: 10, padding: 15 }}>
        {[1, 2, 3].map(p => (
          <div key={p} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', margin: '0 auto 10px',
              background: paso >= p ? '#3498db' : '#ddd', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
              {paso > p ? <FaCheck /> : p}
            </div>
            <div style={{ fontSize: 14, color: paso >= p ? '#3498db' : '#999' }}>
              {p === 1 ? 'Paciente' : p === 2 ? 'Estudios' : 'Pago'}
            </div>
          </div>
        ))}
      </div>

      {/* PASO 1: PACIENTE */}
      {paso === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 25 }}>
          {/* Buscar existente */}
          <div style={{ background: 'white', padding: 25, borderRadius: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}><FaSearch /> Buscar Paciente Existente</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Buscar por nombre o cedula..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && buscarPaciente()}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }}
              />
              <button onClick={buscarPaciente} disabled={loading} style={{ padding: '12px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {loading ? <FaSpinner className="spin" /> : <FaSearch />}
              </button>
            </div>
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {pacientes.map(p => (
                <div key={p._id || p.id} onClick={() => seleccionarPacienteExistente(p)} style={{
                  padding: 15, border: '1px solid #eee', borderRadius: 8, marginBottom: 10, cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.background = '#e3f2fd'}
                   onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <strong>{p.nombre} {p.apellido}</strong>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Cedula: {p.cedula} | Tel: {p.telefono}
                    {p.nacionalidad && <span> | {p.nacionalidad}</span>}
                  </div>
                  {getSeguroNombre(p) && (
                    <div style={{ fontSize: 12, color: '#1976d2' }}>
                      Seguro: {getSeguroNombre(p)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Crear nuevo */}
          <div style={{ background: 'white', padding: 25, borderRadius: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}><FaUserPlus /> Crear Nuevo Paciente</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Nombre *</label>
                <input type="text" placeholder="Nombre" value={nuevoPaciente.nombre}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Apellido *</label>
                <input type="text" placeholder="Apellido" value={nuevoPaciente.apellido}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, apellido: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Cedula *</label>
                <input type="text" placeholder="000-0000000-0" value={nuevoPaciente.cedula}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, cedula: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Telefono *</label>
                <input type="text" placeholder="809-000-0000" value={nuevoPaciente.telefono}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Fecha Nacimiento *</label>
                <input type="date" value={nuevoPaciente.fechaNacimiento}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, fechaNacimiento: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Sexo *</label>
                <select value={nuevoPaciente.sexo}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, sexo: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Nacionalidad *</label>
                <select value={nuevoPaciente.nacionalidad}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, nacionalidad: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}>
                  <option value="Dominicano">Dominicano</option>
                  <option value="Haitiano">Haitiano</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Tipo de Sangre</label>
                <select value={nuevoPaciente.tipoSangre}
                  onChange={e => setNuevoPaciente({...nuevoPaciente, tipoSangre: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}>
                  <option value="">Seleccionar...</option>
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

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Email</label>
              <input type="email" placeholder="correo@ejemplo.com" value={nuevoPaciente.email}
                onChange={e => setNuevoPaciente({...nuevoPaciente, email: e.target.value})}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
            </div>

            {/* SECCION DE SEGURO */}
            <div style={{ marginTop: 20, padding: 15, background: '#e3f2fd', borderRadius: 10 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>Datos del Seguro (opcional)</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>Seguro</label>
                  <select value={nuevoPaciente.seguroNombre}
                    onChange={e => setNuevoPaciente({...nuevoPaciente, seguroNombre: e.target.value})}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}>
                    <option value="">Sin seguro</option>
                    <option value="SENASA">SENASA</option>
                    <option value="ARS Humano">ARS Humano</option>
                    <option value="ARS Palic">ARS Palic</option>
                    <option value="ARS Universal">ARS Universal</option>
                    <option value="Mapfre Salud">Mapfre Salud</option>
                    <option value="ARS Meta Salud">ARS Meta Salud</option>
                    <option value="ARS Monumental">ARS Monumental</option>
                    <option value="ARS Futuro">ARS Futuro</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}># Afiliado (NSS)</label>
                  <input type="text" placeholder="Numero de afiliado" value={nuevoPaciente.seguroNumeroAfiliado}
                    onChange={e => setNuevoPaciente({...nuevoPaciente, seguroNumeroAfiliado: e.target.value})}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }} />
                </div>
              </div>
            </div>

            <button onClick={crearPaciente} disabled={loading} style={{
              width: '100%', padding: 14, marginTop: 20, background: '#27ae60', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15
            }}>
              {loading ? <FaSpinner className="spin" /> : 'Crear y Continuar'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: ESTUDIOS */}
      {paso === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 25 }}>
          <div style={{ background: 'white', padding: 25, borderRadius: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>Estudios Disponibles</h3>
            
            {/* Barra de búsqueda de estudios */}
            <div style={{ position: 'relative', marginBottom: 15 }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                placeholder="Buscar por nombre, código o categoría..."
                value={filtroCategoria}
                onChange={e => setFiltroCategoria(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 14 }}
              />
            </div>

            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {estudios
                .filter(e => {
                  if (!filtroCategoria) return true;
                  const q = filtroCategoria.toLowerCase();
                  const nombre = (e.nombre?.es || e.nombre || '').toLowerCase();
                  const codigo = (e.codigo || '').toLowerCase();
                  const cat = (e.categoria?.nombre?.es || e.categoria?.nombre || e.categoria || '').toLowerCase();
                  return nombre.includes(q) || codigo.includes(q) || cat.includes(q);
                })
                .map(e => (
                  <div key={e._id || e.id} onClick={() => agregarEstudio(e)} style={{
                    padding: 12, border: '1px solid #eee', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background 0.15s'
                  }} onMouseEnter={ev => ev.currentTarget.style.background = '#e8f5e9'}
                     onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                    <div>
                      <strong>{getTexto(e.nombre)}</strong>
                      <div style={{ fontSize: 12, color: '#888' }}>{e.codigo} · {getTexto(e.categoria?.nombre || e.categoria)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 'bold', color: '#27ae60' }}>RD$ {(e.precio || 0).toLocaleString()}</span>
                      <FaPlus style={{ color: '#27ae60' }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ background: 'white', padding: 25, borderRadius: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#f0f8ff', padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <strong>Paciente:</strong> {pacienteSeleccionado?.nombre} {pacienteSeleccionado?.apellido}
              <div style={{ fontSize: 13, color: '#666' }}>
                Cedula: {pacienteSeleccionado?.cedula} | {pacienteSeleccionado?.nacionalidad || 'Dominicano'}
              </div>
              {getSeguroNombre(pacienteSeleccionado) && (
                <div style={{ fontSize: 12, color: '#1976d2' }}>
                  Seguro: {getSeguroNombre(pacienteSeleccionado)} | # {getSeguroAfiliado(pacienteSeleccionado) || 'N/A'}
                </div>
              )}
            </div>

            <h3>Estudios Seleccionados ({estudiosSeleccionados.length})</h3>
            
            {estudiosSeleccionados.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>Seleccione estudios de la lista</p>
            ) : (
              <>
                {estudiosSeleccionados.map(e => (
                  <div key={e._id || e.id} style={{
                    padding: 12, border: '1px solid #eee', borderRadius: 8, marginBottom: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <strong>{getTexto(e.nombre)}</strong>
                      <div style={{ fontSize: 13, color: '#27ae60' }}>${e.precio || 0}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>Cobertura</label>
                        <input type="number" value={e.cobertura || 0} min="0" max={e.precio}
                          onChange={ev => actualizarCobertura(e._id || e.id, ev.target.value)}
                          style={{ width: 70, padding: 5, borderRadius: 4, border: '1px solid #ddd', textAlign: 'center' }} />
                      </div>
                      <button onClick={() => quitarEstudio(e._id || e.id)} style={{
                        background: '#ff5252', color: 'white', border: 'none', borderRadius: 6, padding: 8, cursor: 'pointer'
                      }}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ borderTop: '2px solid #333', marginTop: 20, paddingTop: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Subtotal:</span>
                    <span>${calcularSubtotal().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: calcularCobertura() > 0 ? 'green' : '#666' }}>
                    <span>Cobertura:</span>
                    <span>-${calcularCobertura().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 'bold' }}>
                    <span>TOTAL:</span>
                    <span>${calcularTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button onClick={() => setPaso(3)} style={{
                  width: '100%', padding: 14, marginTop: 20, background: '#3498db', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15
                }}>
                  Continuar al Pago
                </button>
              </>
            )}

            <button onClick={() => setPaso(1)} style={{
              width: '100%', padding: 12, marginTop: 10, background: '#f8f9fa', color: '#333',
              border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer'
            }}>
              Volver
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: PAGO */}
      {paso === 3 && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>Resumen de Pago</h3>

            <div style={{ background: '#f0f8ff', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <strong>{pacienteSeleccionado?.nombre} {pacienteSeleccionado?.apellido}</strong>
              <div style={{ fontSize: 13, color: '#666' }}>
                Cedula: {pacienteSeleccionado?.cedula} | Tel: {pacienteSeleccionado?.telefono}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                Nacionalidad: {pacienteSeleccionado?.nacionalidad || 'Dominicano'}
              </div>
              <div style={{ fontSize: 13, color: '#1976d2', marginTop: 5 }}>
                Seguro: {getSeguroNombre(pacienteSeleccionado) || 'Sin seguro'} | # {getSeguroAfiliado(pacienteSeleccionado) || 'N/A'}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4>Estudios:</h4>
              {estudiosSeleccionados.map(e => (
                <div key={e._id || e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span>{getTexto(e.nombre)}</span>
                  <div>
                    <span style={{ color: e.cobertura > 0 ? 'green' : '#999', marginRight: 10 }}>-${(e.cobertura || 0).toFixed(2)}</span>
                    <span style={{ fontWeight: 'bold' }}>${e.precio}</span>
                  </div>
                </div>
              ))}
            </div>

            {(getSeguroNombre(pacienteSeleccionado) || calcularCobertura() > 0) && (
              <div style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}># Autorizacion</label>
                <input type="text" value={autorizacion} onChange={e => setAutorizacion(e.target.value)}
                  placeholder="Numero de autorizacion del seguro"
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
              </div>
            )}

            <div style={{ marginBottom: 15 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Metodo de Pago</label>
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Descuento Adicional</label>
              <input type="number" value={descuento} onChange={e => setDescuento(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
            </div>

            <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Subtotal:</span><span>${calcularSubtotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: calcularCobertura() > 0 ? 'green' : '#666' }}>
                <span>Cobertura Seguro:</span><span>-${calcularCobertura().toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'orange' }}>
                  <span>Descuento:</span><span>-${descuento.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 20, borderTop: '2px solid #333', paddingTop: 10 }}>
                <span>TOTAL:</span><span>${calcularTotal().toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Monto Pagado</label>
              <input type="number" value={montoPagado} onChange={e => setMontoPagado(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 18, fontWeight: 'bold' }} />
            </div>

            {montoPagado > 0 && (
              <div style={{
                padding: 15, borderRadius: 8, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', fontSize: 18,
                background: calcularCambio() >= 0 ? '#d4edda' : '#fff3cd',
                color: calcularCambio() >= 0 ? '#155724' : '#856404'
              }}>
                {calcularCambio() >= 0 ? (
                  <>Cambio: ${calcularCambio().toFixed(2)}</>
                ) : (
                  <>Pendiente: ${Math.abs(calcularCambio()).toFixed(2)}</>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPaso(2)} style={{
                flex: 1, padding: 14, background: '#6c757d', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
              }}>
                Volver
              </button>
              <button onClick={finalizarRegistro} disabled={loading} style={{
                flex: 2, padding: 14, background: '#27ae60', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
                {loading ? <FaSpinner className="spin" /> : <><FaPrint /> Finalizar e Imprimir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroInteligente;
