import React, { useState, useEffect } from 'react';
import { Building2, UserCheck, FolderTree, Plus, Edit2, Trash2, RefreshCw, Layers, ClipboardList, Tag, Search, MapPin, Upload, FileDown } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Catalogos() {
  const [activeTab, setActiveTab] = useState('establecimientos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = localStorage.getItem('token');

  // Estados para importación CSV
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resultReport, setResultReport] = useState(null);

  // Listados principales
  const [establecimientos, setEstablecimientos] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [serotipos, setSerotipos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [sintomas, setSintomas] = useState([]);

  // Datos geográficos para formularios
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);

  // Filtros geográficos cascada en formulario
  const [formDepto, setFormDepto] = useState('');
  const [formProv, setFormProv] = useState('');

  // Estados de búsqueda / filtros locales
  const [searchQuery, setSearchQuery] = useState('');

  // Modales y formularios
  const [modalOpen, setModalOpen] = useState(false);
  const [entityType, setEntityType] = useState(''); // 'establecimiento', 'profesional', 'serotipo', 'clasificacion', 'sintoma'
  const [selectedItem, setSelectedItem] = useState(null);

  const [estForm, setEstForm] = useState({ nombre_establecimiento: '', categoria: '', id_distrito: '' });
  const [profForm, setProfForm] = useState({ nombres: '', apellidos: '', colegiatura: '', cargo: '', id_establecimiento: '' });
  const [serotipoForm, setSerotipoForm] = useState({ codigo: '', descripcion: '' });
  const [clasificacionForm, setClasificacionForm] = useState({ nombre: '', descripcion: '' });
  const [sintomaForm, setSintomaForm] = useState({ nombre: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': token };
      if (activeTab === 'establecimientos') {
        const res = await fetch(`${API_BASE_URL}/api/geografia/establecimientos`, { headers });
        if (res.ok) setEstablecimientos(await res.json());
        // Cargar departamentos por si abre el formulario
        const depRes = await fetch(`${API_BASE_URL}/api/geografia/departamentos`, { headers });
        if (depRes.ok) setDepartamentos(await depRes.json());
      } else if (activeTab === 'profesionales') {
        const res = await fetch(`${API_BASE_URL}/api/geografia/profesionales`, { headers });
        if (res.ok) setProfesionales(await res.json());
        // Cargar todos los establecimientos para la selección en formulario
        const estRes = await fetch(`${API_BASE_URL}/api/geografia/establecimientos`, { headers });
        if (estRes.ok) setEstablecimientos(await estRes.json());
      } else if (activeTab === 'catalogos') {
        const res = await fetch(`${API_BASE_URL}/api/geografia/catalogos`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSerotipos(data.serotipos || []);
          setClasificaciones(data.clasificaciones || []);
          setSintomas(data.sintomas || []);
        }
      }
    } catch (err) {
      setError('Error al conectar con el servidor para obtener los catálogos.');
      console.error(err);
    } finally {
      fetchDataCompleted();
    }
  };

  const fetchDataCompleted = () => {
    setLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
      setSuccess('');
      setResultReport(null);
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Por favor seleccione un archivo CSV primero.');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    setResultReport(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/casos/importar-csv`, {
        method: 'POST',
        headers: {
          'Authorization': token
        },
        body: formData
      });

      if (res.ok) {
        const report = await res.json();
        setResultReport(report);
        setSuccess(`Proceso de importación finalizado. Éxitos: ${report.exitosos}, Errores: ${report.fallidos}`);
        setSelectedFile(null);
      } else {
        const err = await res.json();
        setError(err.mensaje || 'Error al importar los datos.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Carga de Provincias en Cascada (Formulario)
  useEffect(() => {
    if (formDepto) {
      fetchProvincias(formDepto);
    } else {
      setProvincias([]);
      setDistritos([]);
      setFormProv('');
    }
  }, [formDepto]);

  // Carga de Distritos en Cascada (Formulario)
  useEffect(() => {
    if (formProv) {
      fetchDistritos(formProv);
    } else {
      setDistritos([]);
    }
  }, [formProv]);

  const fetchProvincias = async (deptoId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/geografia/provincias?id_departamento=${deptoId}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) setProvincias(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchDistritos = async (provId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/geografia/distritos?id_provincia=${provId}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) setDistritos(await res.json());
    } catch (e) { console.error(e); }
  };

  // Enviar formulario (Agregar/Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let url = '';
    let method = selectedItem ? 'PUT' : 'POST';
    let body = {};

    if (entityType === 'establecimiento') {
      url = `${API_BASE_URL}/api/geografia/establecimientos`;
      body = selectedItem ? { id_establecimiento: selectedItem.id_establecimiento, ...estForm } : estForm;
      if (!body.nombre_establecimiento || !body.id_distrito) {
        setError('El nombre y distrito del establecimiento son requeridos.');
        return;
      }
    } else if (entityType === 'profesional') {
      url = `${API_BASE_URL}/api/geografia/profesionales`;
      body = selectedItem ? { id_profesional: selectedItem.id_profesional, ...profForm } : profForm;
      if (!body.nombres || !body.apellidos || !body.id_establecimiento) {
        setError('Nombre, apellidos y establecimiento del profesional son requeridos.');
        return;
      }
    } else if (entityType === 'serotipo') {
      url = `${API_BASE_URL}/api/geografia/catalogos/serotipo`;
      body = selectedItem ? { id_serotipo: selectedItem.id_serotipo, ...serotipoForm } : serotipoForm;
      if (!body.codigo) {
        setError('El código del serotipo es requerido.');
        return;
      }
    } else if (entityType === 'clasificacion') {
      url = `${API_BASE_URL}/api/geografia/catalogos/clasificacion`;
      body = selectedItem ? { id_clasificacion: selectedItem.id_clasificacion, ...clasificacionForm } : clasificacionForm;
      if (!body.nombre) {
        setError('El nombre de la clasificación es requerido.');
        return;
      }
    } else if (entityType === 'sintoma') {
      url = `${API_BASE_URL}/api/geografia/catalogos/sintoma`;
      body = selectedItem ? { id_sintoma: selectedItem.id_sintoma, ...sintomaForm } : sintomaForm;
      if (!body.nombre) {
        setError('El nombre del síntoma es requerido.');
        return;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setSuccess(`Se guardó el registro correctamente.`);
        setModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.mensaje || 'Error al guardar el registro.');
      }
    } catch (err) {
      setError('Error de conexión al servidor: ' + err.message);
    }
  };

  // Abrir Modal de Creación
  const handleOpenCreate = (type) => {
    setEntityType(type);
    setSelectedItem(null);
    setError('');
    setSuccess('');

    // Resetear cascade en establecimientos
    setFormDepto('');
    setFormProv('');

    if (type === 'establecimiento') {
      setEstForm({ nombre_establecimiento: '', categoria: '', id_distrito: '' });
    } else if (type === 'profesional') {
      setProfForm({ nombres: '', apellidos: '', colegiatura: '', cargo: '', id_establecimiento: '' });
    } else if (type === 'serotipo') {
      setSerotipoForm({ codigo: '', descripcion: '' });
    } else if (type === 'clasificacion') {
      setClasificacionForm({ nombre: '', descripcion: '' });
    } else if (type === 'sintoma') {
      setSintomaForm({ nombre: '' });
    }

    setModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = async (type, item) => {
    setEntityType(type);
    setSelectedItem(item);
    setError('');
    setSuccess('');

    if (type === 'establecimiento') {
      setEstForm({
        nombre_establecimiento: item.nombre_establecimiento,
        categoria: item.categoria || '',
        id_distrito: item.id_distrito
      });
      if (item.id_distrito) {
        const distCode = item.id_distrito;
        const dCode = distCode.substring(0, 2);
        const pCode = distCode.substring(0, 4);
        setFormDepto(dCode);
        await fetchProvincias(dCode);
        setFormProv(pCode);
        await fetchDistritos(pCode);
      }
    } else if (type === 'profesional') {
      setProfForm({
        nombres: item.nombres,
        apellidos: item.apellidos,
        colegiatura: item.colegiatura || '',
        cargo: item.cargo || '',
        id_establecimiento: item.id_establecimiento
      });
    } else if (type === 'serotipo') {
      setSerotipoForm({
        codigo: item.codigo,
        descripcion: item.descripcion || ''
      });
    } else if (type === 'clasificacion') {
      setClasificacionForm({
        nombre: item.nombre,
        descripcion: item.descripcion || ''
      });
    } else if (type === 'sintoma') {
      setSintomaForm({
        nombre: item.nombre
      });
    }

    setModalOpen(true);
  };

  // Eliminar Registro
  const handleDelete = async (type, id, displayName) => {
    if (!window.confirm(`¿Está seguro de eliminar el registro "${displayName}"?`)) return;
    setError('');
    setSuccess('');

    let url = '';
    if (type === 'establecimiento') {
      url = `${API_BASE_URL}/api/geografia/establecimientos/${id}`;
    } else if (type === 'profesional') {
      url = `${API_BASE_URL}/api/geografia/profesionales/${id}`;
    } else if (type === 'serotipo') {
      url = `${API_BASE_URL}/api/geografia/catalogos/serotipo/${id}`;
    } else if (type === 'clasificacion') {
      url = `${API_BASE_URL}/api/geografia/catalogos/clasificacion/${id}`;
    } else if (type === 'sintoma') {
      url = `${API_BASE_URL}/api/geografia/catalogos/sintoma/${id}`;
    }

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });

      if (res.ok) {
        setSuccess(`Se eliminó el registro exitosamente.`);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.mensaje || 'Error al eliminar el registro.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor: ' + err.message);
    }
  };

  // Filtrado local por búsqueda
  const filteredEstablecimientos = establecimientos.filter(e =>
    e.nombre_establecimiento.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.categoria && e.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredProfesionales = profesionales.filter(p =>
    (p.nombres + ' ' + p.apellidos).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.colegiatura && p.colegiatura.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.cargo && p.cargo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-blue-600" />
            Gestión de Catálogos y Red de Salud
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Administración de establecimientos, profesionales de salud, serotipos, clasificaciones de casos y síntomas clínicos
          </p>
        </div>
        <div className="flex gap-2">
        <button
            onClick={() => handleOpenCreate(
              activeTab === 'establecimientos' ? 'establecimiento' :
              activeTab === 'profesionales' ? 'profesional' : 'serotipo'
            )}
            disabled={activeTab === 'catalogos' || activeTab === 'importar-csv'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Agregar Registro
          </button>
        </div>
      </div>

      {/* Barra de Navegación de Pestañas */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl border border-slate-100 shadow-xs">
        <button
          onClick={() => { setActiveTab('establecimientos'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'establecimientos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Establecimientos de Salud
        </button>
        <button
          onClick={() => { setActiveTab('profesionales'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profesionales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Profesionales Médicos
        </button>
        <button
          onClick={() => { setActiveTab('catalogos'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'catalogos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Catálogos de Vigilancia
        </button>
        <button
          onClick={() => { setActiveTab('importar-csv'); setSearchQuery(''); setError(''); setSuccess(''); setResultReport(null); setSelectedFile(null); }}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'importar-csv'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" /> Importación Masiva (CSV)
        </button>
      </div>

      {/* Alertas de Feedback */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
          <span>❌</span> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <span>✅</span> {success}
        </div>
      )}

      {/* Buscador Local (Solo para Establecimientos y Profesionales) */}
      {activeTab !== 'catalogos' && activeTab !== 'importar-csv' && (
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder={activeTab === 'establecimientos' ? "Buscar por establecimiento o categoría..." : "Buscar por nombre, cargo o colegiatura..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 transition-all shadow-xs"
          />
        </div>
      )}

      {/* Tablas e Interfaces de Datos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Cargando catálogo...</p>
          </div>
        ) : (
          <>
            {activeTab === 'establecimientos' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-semibold uppercase text-xs border-b border-slate-100">
                      <th className="px-5 py-4">ID</th>
                      <th className="px-5 py-4">Nombre del Establecimiento</th>
                      <th className="px-5 py-4">Categoría</th>
                      <th className="px-5 py-4">Ubigeo Distrito</th>
                      <th className="px-5 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEstablecimientos.map((e) => (
                      <tr key={e.id_establecimiento} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900"># {e.id_establecimiento}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{e.nombre_establecimiento}</td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                            {e.categoria || 'S/N'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-500">{e.id_distrito}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit('establecimiento', e)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('establecimiento', e.id_establecimiento, e.nombre_establecimiento)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEstablecimientos.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-5 py-10 text-center text-slate-400 font-medium">
                          No se encontraron establecimientos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'profesionales' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-semibold uppercase text-xs border-b border-slate-100">
                      <th className="px-5 py-4">ID</th>
                      <th className="px-5 py-4">Profesional</th>
                      <th className="px-5 py-4">Colegiatura</th>
                      <th className="px-5 py-4">Cargo / Función</th>
                      <th className="px-5 py-4">Establecimiento Vinculado</th>
                      <th className="px-5 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProfesionales.map((p) => {
                      const est = establecimientos.find(e => e.id_establecimiento === p.id_establecimiento);
                      return (
                        <tr key={p.id_profesional} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900"># {p.id_profesional}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{p.nombre_completo}</td>
                          <td className="px-5 py-4 font-mono font-medium text-slate-600">{p.colegiatura || 'S/C'}</td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-md">
                              {p.cargo || 'Médico'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-medium">{est ? est.nombre_establecimiento : `ID: ${p.id_establecimiento}`}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => handleOpenEdit('profesional', p)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete('profesional', p.id_profesional, p.nombre_completo)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProfesionales.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-5 py-10 text-center text-slate-400 font-medium">
                          No se encontraron profesionales de salud registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'catalogos' && (
              <div className="p-6 space-y-8">
                {/* Serotipos */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                      <Tag className="w-4 h-4 text-blue-600" />
                      Serotipos del Virus del Dengue
                    </h3>
                    <button
                      onClick={() => handleOpenCreate('serotipo')}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      + Agregar Serotipo
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {serotipos.map((s) => (
                      <div key={s.id_serotipo} className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex justify-between items-start hover:shadow-xs transition-shadow">
                        <div>
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold rounded-md block w-fit mb-1">{s.codigo}</span>
                          <span className="text-slate-500 text-[11px] font-medium block">{s.descripcion || 'Sin descripción'}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEdit('serotipo', s)}
                            className="p-1 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('serotipo', s.id_serotipo, s.codigo)}
                            className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clasificaciones */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      Clasificaciones Clínicas del Caso
                    </h3>
                    <button
                      onClick={() => handleOpenCreate('clasificacion')}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      + Agregar Clasificación
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clasificaciones.map((c) => (
                      <div key={c.id_clasificacion} className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex justify-between items-start hover:shadow-xs transition-shadow">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block mb-1">{c.nombre}</span>
                          <p className="text-slate-500 text-[11px] leading-relaxed">{c.descripcion || 'Sin descripción disponible'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-4">
                          <button
                            onClick={() => handleOpenEdit('clasificacion', c)}
                            className="p-1 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('clasificacion', c.id_clasificacion, c.nombre)}
                            className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Síntomas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                      <Plus className="w-4 h-4 text-blue-600" />
                      Signos y Síntomas Clínicos
                    </h3>
                    <button
                      onClick={() => handleOpenCreate('sintoma')}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      + Agregar Síntoma
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {sintomas.map((ss) => (
                      <div key={ss.id_sintoma} className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 flex items-center gap-3">
                        <span className="font-semibold text-slate-800 text-xs">{ss.nombre}</span>
                        <div className="flex gap-0.5 border-l border-slate-200 pl-1.5">
                          <button
                            onClick={() => handleOpenEdit('sintoma', ss)}
                            className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete('sintoma', ss.id_sintoma, ss.nombre)}
                            className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer ml-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'importar-csv' && (
              <div className="p-6 space-y-6">
                {/* Explicación y Plantilla */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                   <div className="space-y-1">
                     <h4 className="font-bold text-slate-800 text-sm">Plantilla de Carga Masiva</h4>
                     <p className="text-slate-500 text-xs">
                       Descargue la plantilla con el formato requerido. Complete los datos demográficos y clínicos respetando los códigos geográficos e IDs de establecimientos del sistema.
                     </p>
                   </div>
                   
                   <a
                     href={"data:text/csv;charset=utf-8-sig," + encodeURIComponent(
                       "dni,nombres,apellidos,fecha_nacimiento,sexo,id_distrito,id_establecimiento,id_profesional,fecha_notificacion,fecha_inicio_sintomas,id_serotipo,id_clasificacion,tipo_diagnostico,condicion\n00000000,Juan,Perez Perez,1990-05-15,M,D0001,1,1,2026-06-15,2026-06-12,,1,Probable,Vivo"
                     )}
                     download="plantilla_importacion_casos.csv"
                     className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-bold border border-blue-200 bg-blue-50 px-4 py-2 rounded-xl transition-all w-fit cursor-pointer shrink-0"
                   >
                     <FileDown className="w-4 h-4" /> Descargar Plantilla CSV
                   </a>
                </div>

                {/* Formulario de Carga */}
                <form onSubmit={handleCsvImport} className="border border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 bg-slate-50/30">
                   <div className="p-4 bg-blue-50 text-blue-500 rounded-full border border-blue-100">
                     <Upload className="w-8 h-8" />
                   </div>
                   
                   <div className="text-center space-y-1">
                     <p className="text-slate-700 text-sm font-bold">Seleccione un archivo CSV</p>
                     <p className="text-slate-400 text-xs">Tamaño máximo recomendado: 5MB</p>
                   </div>

                   <input
                     type="file"
                     accept=".csv"
                     onChange={handleFileChange}
                     className="hidden"
                     id="csv-file-upload"
                   />
                   
                   <label
                     htmlFor="csv-file-upload"
                     className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                   >
                     {selectedFile ? 'Cambiar archivo' : 'Buscar archivo en mi equipo'}
                   </label>

                   {selectedFile && (
                     <div className="text-center space-y-2">
                       <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                         📁 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                       </span>
                       
                       <div className="pt-2">
                         <button
                           type="submit"
                           disabled={uploading}
                           className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                         >
                           {uploading ? (
                             <span className="flex items-center gap-1.5 justify-center">
                               <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando importación...
                             </span>
                           ) : (
                             'Iniciar Importación'
                           )}
                         </button>
                       </div>
                     </div>
                   )}
                </form>

                {/* Reporte de resultados */}
                {resultReport && (
                   <div className="space-y-4 border-t border-slate-100 pt-6">
                     <h4 className="font-bold text-slate-800 text-sm">Resumen del Proceso</h4>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-center">
                         <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Filas Procesadas</span>
                         <span className="text-xl font-bold text-slate-800 mt-1 block">{resultReport.total_filas_procesadas}</span>
                       </div>
                       <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                         <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider block">Registros Exitosos</span>
                         <span className="text-xl font-bold text-emerald-700 mt-1 block">{resultReport.exitosos}</span>
                       </div>
                       <div className={`p-4 rounded-xl text-center border ${
                         resultReport.fallidos > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-150'
                       }`}>
                         <span className={`${
                           resultReport.fallidos > 0 ? 'text-rose-500' : 'text-slate-400'
                         } text-[10px] font-bold uppercase tracking-wider block`}>Registros Fallidos</span>
                         <span className={`text-xl font-bold mt-1 block ${
                           resultReport.fallidos > 0 ? 'text-rose-700' : 'text-slate-800'
                         }`}>{resultReport.fallidos}</span>
                       </div>
                     </div>

                     {resultReport.errores && resultReport.errores.length > 0 && (
                       <div className="space-y-2">
                         <h5 className="font-bold text-rose-700 text-xs">Detalle de Errores Encontrados</h5>
                         <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                           <table className="w-full text-left border-collapse text-xs">
                             <thead>
                               <tr className="bg-rose-50 border-b border-rose-100 text-rose-800 font-bold">
                                 <th className="px-4 py-2.5">Fila CSV</th>
                                 <th className="px-4 py-2.5">Descripción del Error</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-150 text-slate-700 bg-white">
                               {resultReport.errores.map((err, i) => (
                                 <tr key={i} className="hover:bg-slate-50/50">
                                   <td className="px-4 py-2 font-bold text-slate-800">Fila {err.fila}</td>
                                   <td className="px-4 py-2 text-rose-600 font-medium">{err.error}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     )}
                   </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-800">
                {selectedItem ? 'Editar Registro' : 'Agregar Nuevo Registro'} - {
                  entityType === 'establecimiento' ? 'Establecimiento' :
                  entityType === 'profesional' ? 'Profesional de Salud' :
                  entityType === 'serotipo' ? 'Serotipo' :
                  entityType === 'clasificacion' ? 'Clasificación' : 'Síntoma'
                }
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-950 text-2xl font-bold leading-none cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Formulario: Establecimiento */}
              {entityType === 'establecimiento' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Establecimiento</label>
                    <input
                      type="text"
                      value={estForm.nombre_establecimiento}
                      onChange={(e) => setEstForm({ ...estForm, nombre_establecimiento: e.target.value })}
                      placeholder="Ej. Centro de Salud San Martín"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                    <select
                      value={estForm.categoria}
                      onChange={(e) => setEstForm({ ...estForm, categoria: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                    >
                      <option value="">Seleccione Categoría</option>
                      <option value="I-1">Puesto de Salud (I-1)</option>
                      <option value="I-2">Centro de Salud (I-2)</option>
                      <option value="I-3">Centro de Salud con Médico (I-3)</option>
                      <option value="I-4">Centro de Salud con Internamiento (I-4)</option>
                      <option value="II-1">Hospital de Apoyo (II-1)</option>
                      <option value="II-2">Hospital Regional (II-2)</option>
                      <option value="III-1">Hospital Nacional / Instituto (III-1)</option>
                    </select>
                  </div>

                  {/* Ubicación en Cascada para el Distrito */}
                  <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#004b87]" /> Distrito de Ubicación
                    </span>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Departamento</label>
                      <select
                        value={formDepto}
                        onChange={(e) => setFormDepto(e.target.value)}
                        className="block w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none font-medium"
                      >
                        <option value="">Seleccione Departamento</option>
                        {departamentos.map(d => (
                          <option key={d.id_departamento} value={d.id_departamento}>{d.nombre_departamento}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Provincia</label>
                      <select
                        value={formProv}
                        onChange={(e) => setFormProv(e.target.value)}
                        disabled={!formDepto}
                        className="block w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none font-medium disabled:opacity-40"
                      >
                        <option value="">Seleccione Provincia</option>
                        {provincias.map(p => (
                          <option key={p.id_provincia} value={p.id_provincia}>{p.nombre_provincia}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Distrito</label>
                      <select
                        value={estForm.id_distrito}
                        onChange={(e) => setEstForm({ ...estForm, id_distrito: e.target.value })}
                        disabled={!formProv}
                        className="block w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none font-medium disabled:opacity-40 border-blue-400 focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="">Seleccione Distrito</option>
                        {distritos.map(di => (
                          <option key={di.id_distrito} value={di.id_distrito}>{di.nombre_distrito} ({di.id_distrito})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario: Profesional de Salud */}
              {entityType === 'profesional' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombres</label>
                      <input
                        type="text"
                        value={profForm.nombres}
                        onChange={(e) => setProfForm({ ...profForm, nombres: e.target.value })}
                        placeholder="Nombres"
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Apellidos</label>
                      <input
                        type="text"
                        value={profForm.apellidos}
                        onChange={(e) => setProfForm({ ...profForm, apellidos: e.target.value })}
                        placeholder="Apellidos"
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Colegiatura</label>
                    <input
                      type="text"
                      value={profForm.colegiatura}
                      onChange={(e) => setProfForm({ ...profForm, colegiatura: e.target.value })}
                      placeholder="Ej. CMP-54890 o COP-7489"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cargo / Especialidad</label>
                    <input
                      type="text"
                      value={profForm.cargo}
                      onChange={(e) => setProfForm({ ...profForm, cargo: e.target.value })}
                      placeholder="Ej. Médico General, Epidemiólogo"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Establecimiento Asignado</label>
                    <select
                      value={profForm.id_establecimiento}
                      onChange={(e) => setProfForm({ ...profForm, id_establecimiento: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                      required
                    >
                      <option value="">Seleccione Establecimiento</option>
                      {establecimientos.map(es => (
                        <option key={es.id_establecimiento} value={es.id_establecimiento}>
                          {es.nombre_establecimiento} ({es.categoria || 'S/C'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Formulario: Serotipo */}
              {entityType === 'serotipo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código del Serotipo</label>
                    <input
                      type="text"
                      value={serotipoForm.codigo}
                      onChange={(e) => setSerotipoForm({ ...serotipoForm, codigo: e.target.value })}
                      placeholder="Ej. DENV-1 o DENV-4"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                    <input
                      type="text"
                      value={serotipoForm.descripcion}
                      onChange={(e) => setSerotipoForm({ ...serotipoForm, descripcion: e.target.value })}
                      placeholder="Ej. Variante de interés regional"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Formulario: Clasificación del Caso */}
              {entityType === 'clasificacion' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre de la Clasificación</label>
                    <input
                      type="text"
                      value={clasificacionForm.nombre}
                      onChange={(e) => setClasificacionForm({ ...clasificacionForm, nombre: e.target.value })}
                      placeholder="Ej. Dengue Grave"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                    <textarea
                      value={clasificacionForm.descripcion}
                      onChange={(e) => setClasificacionForm({ ...clasificacionForm, descripcion: e.target.value })}
                      placeholder="Indique los criterios clínicos de esta clasificación"
                      rows="3"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Formulario: Síntoma */}
              {entityType === 'sintoma' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Síntoma</label>
                    <input
                      type="text"
                      value={sintomaForm.nombre}
                      onChange={(e) => setSintomaForm({ ...sintomaForm, nombre: e.target.value })}
                      placeholder="Ej. Fiebre alta, Mialgias"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Footer del Modal */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
