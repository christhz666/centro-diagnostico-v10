import React, { useState, useEffect } from 'react';
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSpinner } from 'react-icons/fa';
import api from '../services/api';

const AdminSucursales = () => {
    const [sucursales, setSucursales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [sucursalForm, setSucursalForm] = useState({ nombre: '', codigo: '', direccion: '', telefono: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchSucursales();
    }, []);

    const fetchSucursales = async () => {
        try {
            setLoading(true);
            const res = await api.request('/sucursales');
            setSucursales(res && Array.isArray(res) ? res : res.data || []);
        } catch (err) {
            console.error('Error:', err);
            alert('Error cargando sucursales: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSucursalForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.request(`/sucursales/${editingId}`, { method: 'PUT', body: JSON.stringify(sucursalForm) });
                alert('Sucursal actualizada con éxito');
            } else {
                await api.request('/sucursales', { method: 'POST', body: JSON.stringify(sucursalForm) });
                alert('Sucursal creada exitosamente');
            }
            setShowModal(false);
            fetchSucursales();
        } catch (err) {
            alert('Error guardando sucursal: ' + err.message);
        }
    };

    const confirmDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta sucursal? ESTO DETENDRÁ LA OPERACIÓN OFFLINE DE ESA LOCALIDAD.')) return;
        try {
            await api.request(`/sucursales/${id}`, { method: 'DELETE' });
            alert('Sucursal eliminada');
            fetchSucursales();
        } catch (err) {
            alert('Error eliminando: ' + err.message);
        }
    };

    const openEdit = (sucursal) => {
        setSucursalForm({
            nombre: sucursal.nombre,
            codigo: sucursal.codigo || '',
            direccion: sucursal.direccion || '',
            telefono: sucursal.telefono || ''
        });
        setEditingId(sucursal._id);
        setShowModal(true);
    };

    const openNew = () => {
        setSucursalForm({ nombre: '', codigo: '', direccion: '', telefono: '' });
        setEditingId(null);
        setShowModal(true);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 50 }}><FaSpinner className="spin" size={40} /></div>;
    }

    return (
        <div style={{ padding: 20 }}>
            {/* Boton Crear Sucursal */}
            <button
                onClick={openNew}
                style={{ marginBottom: 20, padding: '10px 20px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'bold' }}>
                <FaPlus /> Añadir Sucursal (Sede Local)
            </button>

            {/* Grid Sucursales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {sucursales.map(s => (
                    <div key={s._id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderTop: '4px solid #3498db', position: 'relative' }}>
                        <FaBuilding style={{ color: '#3498db', fontSize: 30, marginBottom: 10 }} />
                        <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{s.nombre}</h3>
                        <p style={{ margin: '5px 0', fontSize: 14 }}><strong>Código LIS:</strong> {s.codigo || 'N/A'}</p>
                        <p style={{ margin: '5px 0', fontSize: 14 }}><strong>Dirección:</strong> {s.direccion || 'N/A'}</p>
                        <p style={{ margin: '5px 0', fontSize: 14 }}><strong>Teléfono:</strong> {s.telefono || 'N/A'}</p>

                        <div style={{ position: 'absolute', top: 15, right: 15, display: 'flex', gap: 10 }}>
                            <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', color: '#f39c12', cursor: 'pointer', fontSize: 18 }} title="Editar">
                                <FaEdit />
                            </button>
                            <button onClick={() => confirmDelete(s._id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 18 }} title="Eliminar">
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}

                {sucursales.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#888', gridColumn: '1 / -1', background: '#f8f9fa', borderRadius: 10 }}>
                        No hay sucursales registradas en el sistema. Debe existir al menos una para reportar Offline.
                    </div>
                )}
            </div>

            {/* MODAL CREAR/EDITAR */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', padding: 30, borderRadius: 10, width: '100%', maxWidth: 500 }}>
                        <h2 style={{ marginTop: 0 }}>{editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                        <form onSubmit={handleCreateOrUpdate}>
                            <div style={{ marginBottom: 15 }}>
                                <label style={{ display: 'block', marginBottom: 5 }}>Nombre Oficial (Ej. "Sede Piantini") *</label>
                                <input required type="text" name="nombre" value={sucursalForm.nombre} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ marginBottom: 15 }}>
                                <label style={{ display: 'block', marginBottom: 5 }}>Código LIS/Corto (Ej. "PIA", "PRINC") *</label>
                                <input required type="text" name="codigo" value={sucursalForm.codigo} onChange={handleChange} placeholder="Ej. PIA" maxLength={10} style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ marginBottom: 15 }}>
                                <label style={{ display: 'block', marginBottom: 5 }}>Dirección Física</label>
                                <input type="text" name="direccion" value={sucursalForm.direccion} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', marginBottom: 5 }}>Teléfono</label>
                                <input type="text" name="telefono" value={sucursalForm.telefono} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="submit" style={{ flex: 1, padding: 10, background: '#3498db', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, fontWeight: 'bold' }}>
                                    <FaSave /> {editingId ? 'Actualizar' : 'Guardar'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, background: '#95a5a6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, fontWeight: 'bold' }}>
                                    <FaTimes /> Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminSucursales;
