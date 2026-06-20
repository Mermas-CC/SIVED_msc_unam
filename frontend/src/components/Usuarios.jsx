import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  const [formData, setFormData] = useState({
    nombre_usuario: '',
    password: '',
    correo: '',
    id_rol: 2, // Epidemiologo por defecto
    id_profesional: '',
    activo: true
  });
  
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsuariosAndRoles();
  }, []);

  const fetchUsuariosAndRoles = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': token };
      
      const usrRes = await fetch(`${API_BASE_URL}/api/usuarios`, { headers });
      const rolesRes = await fetch(`${API_BASE_URL}/api/geografia/catalogos`, { headers }); // Roles está mapeado en la BD
      
      // O consultar directamente a api/usuarios que lista roles
      if (usrRes.ok) {
        setUsuarios(await usrRes.json());
      }
      
      // Usaremos un catálogo estático de roles en el frontend si falla el fetch, 
      // o cargamos los roles autorizados
      setRoles([
        { id_rol: 1, nombre_rol: 'Administrador', descripcion: 'Acceso total' },
        { id_rol: 2, nombre_rol: 'Epidemiologo', descripcion: 'Vigilancia y análisis' },
        { id_rol: 4, nombre_rol: 'Autoridad', descripcion: 'Solo lectura del dashboard' }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre_usuario) {
      setError("El nombre de usuario es requerido");
      return;
    }
    if (!selectedUsuario && !formData.password) {
      setError("La contraseña es requerida para cuentas nuevas");
      return;
    }

    try {
      const url = selectedUsuario ? `${API_BASE_URL}/api/usuarios/${selectedUsuario.id_usuario}` : `${API_BASE_URL}/api/usuarios`;
      const method = selectedUsuario ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchUsuariosAndRoles();
      } else {
        const err = await res.json();
        setError(err.mensaje || "Error al guardar el usuario");
      }
    } catch (err) {
      setError("Error de conexión: " + err.message);
    }
  };

  const handleOpenCreate = () => {
    setSelectedUsuario(null);
    setError('');
    setFormData({
      nombre_usuario: '',
      password: '',
      correo: '',
      id_rol: 3,
      id_profesional: '',
      activo: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUsuario(u);
    setError('');
    setFormData({
      nombre_usuario: u.nombre_usuario,
      password: '', // dejar vacío si no se va a cambiar
      correo: u.correo || '',
      id_rol: u.id_rol,
      id_profesional: u.id_profesional || '',
      activo: u.activo
    });
    setModalOpen(true);
  };

  const handleDelete = async (u) => {
    if (u.nombre_usuario === 'admin') {
      alert("No se puede eliminar la cuenta de administrador maestro");
      return;
    }
    if (!window.confirm(`¿Está seguro de eliminar al usuario "${u.nombre_usuario}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/usuarios/${u.id_usuario}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        fetchUsuariosAndRoles();
      } else {
        const err = await res.json();
        alert(err.mensaje || "Error al eliminar usuario");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Administración de Usuarios y Permisos
          </h2>
          <p className="text-slate-500 text-xs mt-1">Gestión de credenciales, asignación de roles y perfiles clínicos de acceso</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold btn-premium shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Agregar Usuario
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Buscando cuentas de usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-semibold uppercase text-xs border-b border-slate-100">
                  <th className="px-5 py-4">ID Usuario</th>
                  <th className="px-5 py-4">Nombre de Usuario</th>
                  <th className="px-5 py-4">Correo Electrónico</th>
                  <th className="px-5 py-4">Rol Asignado</th>
                  <th className="px-5 py-4">ID Profesional Clínico</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900"># {u.id_usuario}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{u.nombre_usuario}</td>
                    <td className="px-5 py-4 text-slate-500">{u.correo || 'n/a'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.id_rol === 1 ? 'bg-red-50 text-red-700 border border-red-100' :
                        u.id_rol === 2 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        u.id_rol === 3 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium">{u.id_profesional || 'No vinculado (Nulo)'}</td>
                    <td className="px-5 py-4">
                      {u.activo ? (
                        <span className="flex items-center text-xs font-bold text-emerald-600 gap-1">
                          <CheckCircle className="w-4 h-4" /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center text-xs font-bold text-red-500 gap-1">
                          <XCircle className="w-4 h-4" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Editar usuario"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.nombre_usuario === 'admin'}
                          title="Eliminar usuario"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedUsuario ? `Editar Usuario: ${selectedUsuario.nombre_usuario}` : 'Agregar Nueva Cuenta de Usuario'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre de Usuario *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre_usuario}
                  onChange={(e) => setFormData({...formData, nombre_usuario: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  placeholder="Ej. juan_perez"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {selectedUsuario ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  required={!selectedUsuario}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  placeholder="Ingrese contraseña"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  placeholder="ejemplo@sived.gob.pe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Rol Asignado *</label>
                <select
                  value={formData.id_rol}
                  onChange={(e) => setFormData({...formData, id_rol: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  {roles.map(r => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ID Profesional Clínico Vinculado (Opcional)</label>
                <input
                  type="number"
                  value={formData.id_profesional}
                  onChange={(e) => setFormData({...formData, id_profesional: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  placeholder="Ej. 1"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mt-3">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="mr-2 w-4 h-4 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500"
                  />
                  Cuenta de usuario activa y habilitada
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 btn-premium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm btn-premium"
                >
                  {selectedUsuario ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
