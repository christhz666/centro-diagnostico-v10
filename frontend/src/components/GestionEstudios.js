import React, { useState, useEffect, useRef } from 'react';
import { FaFlask, FaPlus, FaEdit, FaTrash, FaUpload, FaFileExcel, FaSpinner, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../services/api';

const GestionEstudios = () => {
  const [estudios, setEstudios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [excelData, setExcelData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    precio: '',
    categoria: '',
    descripcion: '',
    tiempoEntrega: '24',
    requiereCita: false,
    activo: true
  });

  // Categorias predefinidas con palabras clave para auto-asignacion
  const categoriasConfig = [
    { nombre: 'Hematologia', keywords: ['sangre', 'hematol', 'hemograma', 'plaqueta', 'leucocito', 'eritrocito', 'hemoglobina', 'hematocrito', 'vcm', 'hcm', 'chcm', 'reticulocito', 'coagul', 'protrombina', 'fibrinogeno'] },
    { nombre: 'Quimica Sanguinea', keywords: ['glucosa', 'colesterol', 'triglicerido', 'acido urico', 'creatinina', 'urea', 'bilirrubina', 'transaminasa', 'alt', 'ast', 'fosfatasa', 'amilasa', 'lipasa', 'albumina', 'proteina', 'electrolito', 'sodio', 'potasio', 'cloro', 'calcio', 'magnesio', 'hierro', 'ferritina', 'transferrina', 'ldh', 'cpk', 'gamma'] },
    { nombre: 'Uroanalisis', keywords: ['orina', 'uro', 'urocultivo', 'sedimento'] },
    { nombre: 'Coprologia', keywords: ['heces', 'copro', 'parasit', 'ameba', 'giardia', 'sangre oculta', 'coproculti'] },
    { nombre: 'Inmunologia', keywords: ['hiv', 'vih', 'hepatitis', 'vdrl', 'rpr', 'inmuno', 'anticuerpo', 'antigeno', 'elisa', 'western', 'pcr', 'covid', 'sars', 'dengue', 'toxoplasma', 'rubeola', 'citomegalovirus', 'herpes', 'epstein', 'factor reumatoide', 'aso', 'complemento', 'inmunoglobulina', 'ige', 'alergia'] },
    { nombre: 'Hormonas', keywords: ['hormona', 'tsh', 't3', 't4', 'tiroides', 'prolactina', 'testosterona', 'estradiol', 'progesterona', 'fsh', 'lh', 'cortisol', 'insulina', 'paratohormona', 'pth', 'dhea', 'androgeno', 'estrogeno', 'hgh', 'igf'] },
    { nombre: 'Marcadores Tumorales', keywords: ['psa', 'cea', 'ca 125', 'ca 19', 'ca 15', 'afp', 'alfa feto', 'tumor', 'oncol', 'cancer', 'marcador'] },
    { nombre: 'Pruebas de Embarazo', keywords: ['embarazo', 'hcg', 'beta hcg', 'prenatal', 'gestacion'] },
    { nombre: 'Microbiologia', keywords: ['cultivo', 'antibiograma', 'bacteria', 'gram', 'koh', 'fungi', 'hongo', 'micolog'] },
    { nombre: 'Perfiles', keywords: ['perfil', 'panel', 'completo', 'basico', 'ejecutivo', 'prenupcial', 'preoperatorio'] },
    { nombre: 'Otros', keywords: [] }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [estResponse, catResponse] = await Promise.all([
        api.getEstudios(),
        api.getCategorias()
      ]);
      setEstudios(estResponse.data || estResponse || []);
      setCategorias(catResponse.data || catResponse || categoriasConfig.map(c => ({ nombre: c.nombre, _id: c.nombre })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Funcion para determinar categoria automaticamente
  const determinarCategoria = (nombreEstudio) => {
    const nombreLower = nombreEstudio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const cat of categoriasConfig) {
      for (const keyword of cat.keywords) {
        if (nombreLower.includes(keyword)) {
          return cat.nombre;
        }
      }
    }
    return 'Otros';
  };

  // Procesar archivo Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Procesar datos (saltar encabezado si existe)
        const estudiosExcel = [];
        const startRow = data[0]?.some(cell => 
          typeof cell === 'string' && (cell.toLowerCase().includes('nombre') || cell.toLowerCase().includes('precio'))
        ) ? 1 : 0;

        for (let i = startRow; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0]) continue;

          const nombre = String(row[0] || '').trim();
          let precio = row[1];
          
          // Convertir precio a numero
          if (typeof precio === 'string') {
            precio = parseFloat(precio.replace(/[^0-9.]/g, '')) || 0;
          } else {
            precio = parseFloat(precio) || 0;
          }

          if (nombre) {
            const categoria = determinarCategoria(nombre);
            estudiosExcel.push({
              nombre,
              precio,
              categoria,
              codigo: 'EST-' + (i + 1).toString().padStart(4, '0'),
              selected: true
            });
          }
        }

        setExcelData(estudiosExcel);
        setShowUploadModal(true);
      } catch (err) {
        alert('Error al leer el archivo: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Subir estudios del Excel
  const subirEstudios = async () => {
    const estudiosSeleccionados = excelData.filter(e => e.selected);
    if (estudiosSeleccionados.length === 0) {
      alert('Seleccione al menos un estudio');
      return;
    }

    setUploading(true);
    let exitosos = 0;
    let errores = 0;

    for (const estudio of estudiosSeleccionados) {
      try {
        await api.createEstudio({
          nombre: estudio.nombre,
          precio: estudio.precio,
          categoria: estudio.categoria,
          codigo: estudio.codigo,
          activo: true,
          tiempoEntrega: '24'
        });
        exitosos++;
      } catch (err) {
        console.error('Error creando estudio:', estudio.nombre, err);
        errores++;
      }
    }

    setUploading(false);
    setShowUploadModal(false);
    setExcelData([]);
    alert(`Estudios creados: ${exitosos}\nErrores: ${errores}`);
    fetchData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.precio) {
      alert('Complete nombre y precio');
      return;
    }

    try {
      setLoading(true);
      if (editando) {
        await api.updateEstudio(editando._id || editando.id, formData);
      } else {
        await api.createEstudio(formData);
      }
      setShowModal(false);
      setEditando(null);
      setFormData({ nombre: '', codigo: '', precio: '', categoria: '', descripcion: '', tiempoEntrega: '24', requiereCita: false, activo: true });
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editarEstudio = (estudio) => {
    setEditando(estudio);
    setFormData({
      nombre: estudio.nombre || '',
      codigo: estudio.codigo || '',
      precio: estudio.precio || '',
      categoria: estudio.categoria?.nombre || estudio.categoria || '',
      descripcion: estudio.descripcion || '',
      tiempoEntrega: estudio.tiempoEntrega || '24',
      requiereCita: estudio.requiereCita || false,
      activo: estudio.activo !== false
    });
    setShowModal(true);
  };

  const eliminarEstudio = async (id) => {
    if (!window.confirm('¿Eliminar este estudio?')) return;
    try {
      await api.deleteEstudio(id);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const estudiosFiltrados = estudios.filter(e => {
    const matchBusqueda = !busqueda || 
      e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !filtroCategoria || 
      (e.categoria?.nombre || e.categoria) === filtroCategoria;
    return matchBusqueda && matchCategoria;
  });

  if (loading && estudios.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <FaSpinner className="spin" style={{ fontSize: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#1a3a5c' }}>
          <FaFlask style={{ color: '#87CEEB' }} /> Catalogo de Estudios
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none',
            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold'
          }}>
            <FaFileExcel /> Cargar Excel
          </button>
          <button onClick={() => { setEditando(null); setFormData({ nombre: '', codigo: '', precio: '', categoria: '', descripcion: '', tiempoEntrega: '24', requiereCita: false, activo: true }); setShowModal(true); }} style={{
            padding: '10px 20px', background: '#1a3a5c', color: 'white', border: 'none',
            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold'
          }}>
            <FaPlus /> Nuevo Estudio
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar estudio..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid #ddd' }}
          />
        </div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', minWidth: 200 }}>
          <option value="">Todas las categorias</option>
          {categoriasConfig.map(c => (
            <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Estadisticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg, #1a3a5c, #2d5a87)', padding: 20, borderRadius: 10, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Total Estudios</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{estudios.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #87CEEB, #5fa8d3)', padding: 20, borderRadius: 10, color: '#1a3a5c' }}>
          <div style={{ fontSize: 14 }}>Categorias</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{new Set(estudios.map(e => e.categoria?.nombre || e.categoria)).size}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)', padding: 20, borderRadius: 10, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Activos</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{estudios.filter(e => e.activo !== false).length}</div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a3a5c', color: 'white' }}>
              <th style={{ padding: 15, textAlign: 'left' }}>Codigo</th>
              <th style={{ padding: 15, textAlign: 'left' }}>Nombre</th>
              <th style={{ padding: 15, textAlign: 'left' }}>Categoria</th>
              <th style={{ padding: 15, textAlign: 'right' }}>Precio</th>
              <th style={{ padding: 15, textAlign: 'center' }}>Estado</th>
              <th style={{ padding: 15, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                  No hay estudios registrados
                </td>
              </tr>
            ) : (
              estudiosFiltrados.map(e => (
                <tr key={e._id || e.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 15, fontFamily: 'monospace' }}>{e.codigo || '-'}</td>
                  <td style={{ padding: 15, fontWeight: 'bold', color: '#1a3a5c' }}>{e.nombre}</td>
                  <td style={{ padding: 15 }}>
                    <span style={{ background: '#87CEEB', color: '#1a3a5c', padding: '4px 10px', borderRadius: 15, fontSize: 12 }}>
                      {e.categoria?.nombre || e.categoria || 'Sin categoria'}
                    </span>
                  </td>
                  <td style={{ padding: 15, textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                    RD$ {(e.precio || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: 15, textAlign: 'center' }}>
                    <span style={{
                      padding: '5px 12px', borderRadius: 15, fontSize: 12,
                      background: e.activo !== false ? '#d4edda' : '#f8d7da',
                      color: e.activo !== false ? '#155724' : '#721c24'
                    }}>
                      {e.activo !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: 15, textAlign: 'center' }}>
                    <button onClick={() => editarEstudio(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 10 }}>
                      <FaEdit style={{ color: '#1a3a5c', fontSize: 18 }} />
                    </button>
                    <button onClick={() => eliminarEstudio(e._id || e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <FaTrash style={{ color: '#e74c3c', fontSize: 18 }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo/Editar */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,58,92,0.9)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, width: '100%', maxWidth: 500 }}>
            <h2 style={{ marginTop: 0, color: '#1a3a5c' }}>{editando ? 'Editar Estudio' : 'Nuevo Estudio'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Nombre *</label>
                <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Codigo</label>
                  <input type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Precio *</label>
                  <input type="number" value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }} required />
                </div>
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Categoria</label>
                <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }}>
                  <option value="">Seleccionar...</option>
                  {categoriasConfig.map(c => (
                    <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" style={{
                  flex: 1, padding: 12, background: '#1a3a5c', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
                }}>
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  flex: 1, padding: 12, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
                }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cargar Excel */}
      {showUploadModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,58,92,0.9)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20
        }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 15, width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#1a3a5c' }}>
                <FaFileExcel style={{ color: '#27ae60' }} /> Importar Estudios desde Excel
              </h2>
              <button onClick={() => { setShowUploadModal(false); setExcelData([]); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ background: '#e8f5e9', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <p style={{ margin: 0 }}>
                <strong>Estudios encontrados:</strong> {excelData.length} |
                <strong> Seleccionados:</strong> {excelData.filter(e => e.selected).length} |
                <strong> Categorias asignadas automaticamente</strong>
              </p>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={excelData.every(e => e.selected)} 
                  onChange={e => setExcelData(excelData.map(est => ({...est, selected: e.target.checked})))} />
                Seleccionar todos
              </label>
            </div>

            <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ background: '#1a3a5c', color: 'white' }}>
                    <th style={{ padding: 10, width: 40 }}></th>
                    <th style={{ padding: 10, textAlign: 'left' }}>Nombre</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Precio</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>Categoria (Auto)</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee', background: e.selected ? '#f0fff0' : '#fff' }}>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <input type="checkbox" checked={e.selected} 
                          onChange={ev => {
                            const newData = [...excelData];
                            newData[i].selected = ev.target.checked;
                            setExcelData(newData);
                          }} />
                      </td>
                      <td style={{ padding: 10 }}>{e.nombre}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold' }}>RD$ {e.precio.toLocaleString()}</td>
                      <td style={{ padding: 10 }}>
                        <select value={e.categoria} onChange={ev => {
                          const newData = [...excelData];
                          newData[i].categoria = ev.target.value;
                          setExcelData(newData);
                        }} style={{ padding: 5, borderRadius: 4, border: '1px solid #ddd', width: '100%' }}>
                          {categoriasConfig.map(c => (
                            <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={subirEstudios} disabled={uploading} style={{
                flex: 2, padding: 15, background: uploading ? '#ccc' : '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 16
              }}>
                {uploading ? <><FaSpinner className="spin" /> Subiendo...</> : <><FaUpload /> Importar {excelData.filter(e => e.selected).length} Estudios</>}
              </button>
              <button onClick={() => { setShowUploadModal(false); setExcelData([]); }} style={{
                flex: 1, padding: 15, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionEstudios;
