import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, Calendar, User, FileText, CheckSquare, PlusCircle, Trash, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function CasoCRUD({ usuario }) {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCaso, setSelectedCaso] = useState(null);
  
  // Catálogos
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [serotipos, setSerotipos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [sintomas, setSintomas] = useState([]);

  // Filtros de búsqueda
  const [filterDepto, setFilterDepto] = useState('');
  const [filterProv, setFilterProv] = useState('');
  const [filterDist, setFilterDist] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [filterSemana, setFilterSemana] = useState('');
  const [filterSerotipo, setFilterSerotipo] = useState('');
  const [filterClasificacion, setFilterClasificacion] = useState('');

  // Dropdowns en cascada del Formulario
  const [formProvincias, setFormProvincias] = useState([]);
  const [formDistritos, setFormDistritos] = useState([]);
  const [formEstablecimientos, setFormEstablecimientos] = useState([]);
  const [formProfesionales, setFormProfesionales] = useState([]);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    paciente_documento: '',
    paciente_nombres: '',
    paciente_apellidos: '',
    paciente_fecha_nacimiento: '',
    paciente_sexo: 'M',
    paciente_id_distrito: '',
    paciente_id_depto: '',
    paciente_id_prov: '',
    
    id_establecimiento: '',
    id_profesional: '',
    id_serotipo: '',
    id_clasificacion: '1',
    fecha_notificacion: new Date().toISOString().split('T')[0],
    fecha_inicio_sintomas: '',
    tipo_diagnostico: 'Probable',
    condicion: 'Vivo',
    sintomas: [],
    diagnosticos_lab: []
  });

  const [formError, setFormError] = useState('');
  const [formInfo, setFormInfo] = useState('');
  const [dniSearching, setDniSearching] = useState(false);

  const token = localStorage.getItem('token');
  const esAdminOrEpi = usuario.rol === 'Administrador' || usuario.rol === 'Epidemiologo';
  const esLecturaOnly = usuario.rol === 'Autoridad';

  useEffect(() => {
    fetchCasos();
    fetchInitialGeoCatalogos();
  }, []);

  // Cascadas de filtros
  useEffect(() => {
    if (filterDepto) {
      fetchGeoData('provincias', filterDepto).then(setProvincias);
      setFilterProv('');
      setFilterDist('');
      setDistritos([]);
    } else {
      setProvincias([]);
      setDistritos([]);
      setFilterProv('');
      setFilterDist('');
    }
  }, [filterDepto]);

  useEffect(() => {
    if (filterProv) {
      fetchGeoData('distritos', filterProv).then(setDistritos);
      setFilterDist('');
    } else {
      setDistritos([]);
      setFilterDist('');
    }
  }, [filterProv]);

  // Cascadas de formulario
  useEffect(() => {
    if (formData.paciente_id_depto) {
      fetchGeoData('provincias', formData.paciente_id_depto).then(setFormProvincias);
    } else {
      setFormProvincias([]);
    }
  }, [formData.paciente_id_depto]);

  useEffect(() => {
    if (formData.paciente_id_prov) {
      fetchGeoData('distritos', formData.paciente_id_prov).then(setFormDistritos);
    } else {
      setFormDistritos([]);
    }
  }, [formData.paciente_id_prov]);

  useEffect(() => {
    if (formData.paciente_id_distrito) {
      fetchGeoData('establecimientos', formData.paciente_id_distrito).then(setFormEstablecimientos);
    } else {
      setFormEstablecimientos([]);
    }
  }, [formData.paciente_id_distrito]);

  useEffect(() => {
    if (formData.id_establecimiento) {
      fetchGeoData('profesionales', formData.id_establecimiento).then(setFormProfesionales);
    } else {
      setFormProfesionales([]);
    }
  }, [formData.id_establecimiento]);

  const fetchGeoData = async (tipo, id) => {
    const paramName = tipo === 'provincias' ? 'id_departamento' : 
                      tipo === 'distritos' ? 'id_provincia' : 
                      tipo === 'establecimientos' ? 'id_distrito' : 'id_establecimiento';
    try {
      const res = await fetch(`${API_BASE_URL}/api/geografia/${tipo}?${paramName}=${id}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return [];
  };

  const fetchInitialGeoCatalogos = async () => {
    try {
      const headers = { 'Authorization': token };
      
      const depRes = await fetch(`${API_BASE_URL}/api/geografia/departamentos`, { headers });
      if (depRes.ok) setDepartamentos(await depRes.json());

      const catRes = await fetch(`${API_BASE_URL}/api/geografia/catalogos`, { headers });
      if (catRes.ok) {
        const cat = await catRes.json();
        setSerotipos(cat.serotipos);
        setClasificaciones(cat.clasificaciones);
        setSintomas(cat.sintomas);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCasos = async () => {
    setLoading(true);
    try {
      let query = `?id_departamento=${filterDepto}&id_provincia=${filterProv}&id_distrito=${filterDist}`;
      query += `&anio=${filterAnio}&semana=${filterSemana}&id_serotipo=${filterSerotipo}&id_clasificacion=${filterClasificacion}`;
      
      const res = await fetch(`${API_BASE_URL}/api/casos${query}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        setCasos(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDni = async () => {
    const dni = formData.paciente_documento;
    if (!dni || dni.length < 8) {
      setFormError("Ingrese un DNI de al menos 8 dígitos para buscar");
      setFormInfo("");
      return;
    }
    setDniSearching(true);
    setFormError("");
    setFormInfo("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/casos/paciente/buscar/${dni}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const p = await res.json();
        
        // Cargar cascadas de ubicación del paciente
        // Para esto necesitamos encontrar el depto y provincia de su distrito
        // Haremos un fetch simple para sincronizar ubicación
        const detailsRes = await fetch(`${API_BASE_URL}/api/geografia/distritos`, {
          headers: { 'Authorization': token }
        });
        let p_depto = '';
        let p_prov = '';
        if (detailsRes.ok) {
          const allDists = await detailsRes.json();
          const pDist = allDists.find(d => d.id_distrito === p.id_distrito);
          if (pDist) {
            p_prov = pDist.id_provincia;
            // Buscar provincia
            const provsRes = await fetch(`${API_BASE_URL}/api/geografia/provincias`, {
              headers: { 'Authorization': token }
            });
            if (provsRes.ok) {
              const allProvs = await provsRes.json();
              const pProv = allProvs.find(pr => pr.id_provincia === p_prov);
              if (pProv) p_depto = pProv.id_departamento;
            }
          }
        }

        setFormData(prev => ({
          ...prev,
          paciente_nombres: p.nombres,
          paciente_apellidos: p.apellidos,
          paciente_fecha_nacimiento: p.fecha_nacimiento,
          paciente_sexo: p.sexo,
          paciente_id_depto: p_depto,
          paciente_id_prov: p_prov,
          paciente_id_distrito: p.id_distrito
        }));

        if (p.id_paciente === null) {
          setFormInfo(`Paciente nuevo encontrado en RENIEC/externo: ${p.nombres} ${p.apellidos}. Complete los demás datos (Fecha de nacimiento, Sexo, Distrito).`);
        } else {
          setFormInfo(`Paciente registrado encontrado en el sistema local: ${p.nombres} ${p.apellidos}.`);
        }
      } else {
        setFormError("Paciente no encontrado en el sistema ni en RENIEC. Ingrese los datos demográficos manualmente.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Error al consultar el DNI: " + err.message);
    } finally {
      setDniSearching(false);
    }
  };

  const handleSintomaToggle = (s_id) => {
    setFormData(prev => {
      const current = prev.sintomas;
      const index = current.indexOf(s_id);
      if (index > -1) {
        return { ...prev, sintomas: current.filter(id => id !== s_id) };
      } else {
        return { ...prev, sintomas: [...current, s_id] };
      }
    });
  };

  const handleAddLab = () => {
    setFormData(prev => ({
      ...prev,
      diagnosticos_lab: [
        ...prev.diagnosticos_lab,
        { tipo_prueba: 'NS1', resultado: 'Positivo', fecha_resultado: new Date().toISOString().split('T')[0] }
      ]
    }));
  };

  const handleRemoveLab = (index) => {
    setFormData(prev => ({
      ...prev,
      diagnosticos_lab: prev.diagnosticos_lab.filter((_, idx) => idx !== index)
    }));
  };

  const handleLabChange = (index, field, value) => {
    setFormData(prev => {
      const list = [...prev.diagnosticos_lab];
      list[index][field] = value;
      return { ...prev, diagnosticos_lab: list };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validaciones del Frontend
    if (!formData.paciente_documento || formData.paciente_documento.length < 8) {
      setFormError("El documento del paciente debe tener entre 8 y 12 dígitos");
      return;
    }
    if (!formData.paciente_nombres || !formData.paciente_apellidos) {
      setFormError("Los nombres y apellidos del paciente son requeridos");
      return;
    }
    if (!formData.paciente_fecha_nacimiento) {
      setFormError("La fecha de nacimiento del paciente es requerida");
      return;
    }
    if (!formData.paciente_sexo) {
      setFormError("El sexo del paciente es requerido");
      return;
    }
    if (!formData.paciente_id_distrito) {
      setFormError("El distrito de residencia del paciente es requerido (debe seleccionar Departamento, Provincia y Distrito)");
      return;
    }
    if (!formData.id_establecimiento || !formData.id_profesional) {
      setFormError("Debe seleccionar un establecimiento y profesional de salud");
      return;
    }
    if (formData.fecha_inicio_sintomas && formData.fecha_inicio_sintomas > formData.fecha_notificacion) {
      setFormError("La fecha de inicio de síntomas no puede ser posterior a la fecha de notificación");
      return;
    }

    try {
      const url = selectedCaso ? `${API_BASE_URL}/api/casos/${selectedCaso.id_caso}` : `${API_BASE_URL}/api/casos`;
      const method = selectedCaso ? 'PUT' : 'POST';
      
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
        fetchCasos();
      } else {
        const err = await res.json();
        setFormError(err.mensaje || "Error al registrar caso clínico");
      }
    } catch (err) {
      setFormError("Error de red: " + err.message);
    }
  };

  const handleOpenCreate = () => {
    setSelectedCaso(null);
    setFormError('');
    setFormInfo('');
    setFormData({
      paciente_documento: '',
      paciente_nombres: '',
      paciente_apellidos: '',
      paciente_fecha_nacimiento: '',
      paciente_sexo: 'M',
      paciente_id_distrito: '',
      paciente_id_depto: '',
      paciente_id_prov: '',
      id_establecimiento: '',
      id_profesional: '',
      id_serotipo: '',
      id_clasificacion: '1',
      fecha_notificacion: new Date().toISOString().split('T')[0],
      fecha_inicio_sintomas: '',
      tipo_diagnostico: 'Probable',
      condicion: 'Vivo',
      sintomas: [1], // Fiebre por defecto
      diagnosticos_lab: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = async (caso) => {
    setLoading(true);
    setFormError('');
    setFormInfo('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/casos/${caso.id_caso}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCaso(caso);
        
        // Cargar cascadas de ubicación del paciente
        const detailsRes = await fetch(`${API_BASE_URL}/api/geografia/distritos`, {
          headers: { 'Authorization': token }
        });
        let p_depto = '';
        let p_prov = '';
        if (detailsRes.ok) {
          const allDists = await detailsRes.json();
          const pDist = allDists.find(d => d.id_distrito === data.paciente.id_distrito);
          if (pDist) {
            p_prov = pDist.id_provincia;
            const provsRes = await fetch(`${API_BASE_URL}/api/geografia/provincias`, {
              headers: { 'Authorization': token }
            });
            if (provsRes.ok) {
              const allProvs = await provsRes.json();
              const pProv = allProvs.find(pr => pr.id_provincia === p_prov);
              if (pProv) p_depto = pProv.id_departamento;
            }
          }
        }

        // Cargar cascadas de establecimiento
        const estsRes = await fetch(`${API_BASE_URL}/api/geografia/establecimientos`, {
          headers: { 'Authorization': token }
        });
        let est_depto = '';
        let est_prov = '';
        let est_dist = '';
        if (estsRes.ok) {
          const allEsts = await estsRes.json();
          const cEst = allEsts.find(e => e.id_establecimiento === data.id_establecimiento);
          if (cEst) {
            est_dist = cEst.id_distrito;
            const distsRes = await fetch(`${API_BASE_URL}/api/geografia/distritos`, {
              headers: { 'Authorization': token }
            });
            if (distsRes.ok) {
              const allDists = await distsRes.json();
              const cDist = allDists.find(d => d.id_distrito === est_dist);
              if (cDist) {
                est_prov = cDist.id_provincia;
                const provsRes = await fetch(`${API_BASE_URL}/api/geografia/provincias`, {
                  headers: { 'Authorization': token }
                });
                if (provsRes.ok) {
                  const allProvs = await provsRes.json();
                  const cProv = allProvs.find(pr => pr.id_provincia === est_prov);
                  if (cProv) est_depto = cProv.id_departamento;
                }
              }
            }
          }
        }

        // Llenar formulario
        setFormData({
          paciente_documento: data.paciente.documento,
          paciente_nombres: data.paciente.nombres,
          paciente_apellidos: data.paciente.apellidos,
          paciente_fecha_nacimiento: data.paciente.fecha_nacimiento,
          paciente_sexo: data.paciente.sexo,
          paciente_id_depto: p_depto,
          paciente_id_prov: p_prov,
          paciente_id_distrito: data.paciente.id_distrito,
          
          id_establecimiento: data.id_establecimiento,
          id_profesional: data.id_profesional,
          id_serotipo: data.id_serotipo || '',
          id_clasificacion: String(data.id_clasificacion),
          fecha_notificacion: data.fecha_notificacion,
          fecha_inicio_sintomas: data.fecha_inicio_sintomas || '',
          tipo_diagnostico: data.tipo_diagnostico || 'Probable',
          condicion: data.condicion || 'Vivo',
          sintomas: data.sintomas,
          diagnosticos_lab: data.diagnosticos_lab
        });
        setModalOpen(true);
      }
    } catch (err) {
      alert("Error al cargar caso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenView = async (caso) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/casos/${caso.id_caso}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        setSelectedCaso(await res.json());
        setViewModalOpen(true);
      }
    } catch (err) {
      alert("Error al cargar caso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (caso) => {
    if (!window.confirm(`¿Está seguro de eliminar el caso Nº ${caso.id_caso}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/casos/${caso.id_caso}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        fetchCasos();
      } else {
        const err = await res.json();
        alert(err.mensaje || "Error al eliminar caso");
      }
    } catch (err) {
      alert("Error de red: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de la sección */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Vigilancia Epidemiológica (Notificaciones)</h2>
          <p className="text-slate-500 text-xs mt-1">Gestión integral de la base de datos de casos de dengue — SIVED-Perú</p>
        </div>
        {!esLecturaOnly && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold btn-premium shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Registrar Notificación
          </button>
        )}
      </div>

      {/* Caja de Búsqueda y Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Filtros Avanzados de Búsqueda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ubicación */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Departamento</label>
            <select
              value={filterDepto}
              onChange={(e) => setFilterDepto(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Todos</option>
              {departamentos.map(d => (
                <option key={d.id_departamento} value={d.id_departamento}>{d.nombre_departamento}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Provincia</label>
            <select
              value={filterProv}
              disabled={!filterDepto}
              onChange={(e) => setFilterProv(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Todas</option>
              {provincias.map(p => (
                <option key={p.id_provincia} value={p.id_provincia}>{p.nombre_provincia}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Distrito</label>
            <select
              value={filterDist}
              disabled={!filterProv}
              onChange={(e) => setFilterDist(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Todos</option>
              {distritos.map(d => (
                <option key={d.id_distrito} value={d.id_distrito}>{d.nombre_distrito}</option>
              ))}
            </select>
          </div>

          {/* Temporal */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Año</label>
            <input
              type="number"
              placeholder="Ej. 2023"
              value={filterAnio}
              onChange={(e) => setFilterAnio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Más Filtros */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Semana</label>
            <input
              type="number"
              placeholder="Ej. 18"
              value={filterSemana}
              onChange={(e) => setFilterSemana(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Serotipo</label>
            <select
              value={filterSerotipo}
              onChange={(e) => setFilterSerotipo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Todos</option>
              {serotipos.map(s => (
                <option key={s.id_serotipo} value={s.id_serotipo}>{s.codigo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Clasificación</label>
            <select
              value={filterClasificacion}
              onChange={(e) => setFilterClasificacion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Todas</option>
              {clasificaciones.map(c => (
                <option key={c.id_clasificacion} value={c.id_clasificacion}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Botón de Ejecutar Filtros */}
          <div className="flex items-end">
            <button
              onClick={fetchCasos}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-semibold btn-premium"
            >
              <Search className="w-4 h-4" /> Buscar Registros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla / Grid de Datos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Buscando en la base de datos...</p>
          </div>
        ) : casos.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            No se encontraron registros de dengue con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-semibold uppercase text-xs border-b border-slate-100">
                  <th className="px-5 py-4">ID Caso</th>
                  <th className="px-5 py-4">Paciente</th>
                  <th className="px-5 py-4">Establecimiento</th>
                  <th className="px-5 py-4">F. Notificación</th>
                  <th className="px-5 py-4">Semana</th>
                  <th className="px-5 py-4">Clasificación</th>
                  <th className="px-5 py-4">Diagnóstico</th>
                  <th className="px-5 py-4">Condición</th>
                  <th className="px-5 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {casos.map((caso) => (
                  <tr key={caso.id_caso} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">Nº {caso.id_caso}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{caso.pac_nombres} {caso.pac_apellidos}</div>
                      <div className="text-slate-400 text-xs font-semibold mt-0.5">{caso.documento}</div>
                    </td>
                    <td className="px-5 py-4 font-medium">{caso.nombre_establecimiento}</td>
                    <td className="px-5 py-4 text-slate-500 font-semibold">{caso.fecha_notificacion}</td>
                    <td className="px-5 py-4 text-slate-500 font-semibold">{caso.anio} - S{caso.numero_semana}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        caso.id_clasificacion === 3 ? 'bg-red-50 text-red-700 border border-red-100' :
                        caso.id_clasificacion === 2 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {caso.clasificacion_nombre}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium">{caso.tipo_diagnostico}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        caso.condicion === 'Fallecido' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {caso.condicion}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleOpenView(caso)}
                          title="Ver detalle completo"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!esLecturaOnly && (
                          <button
                            onClick={() => handleOpenEdit(caso)}
                            title="Editar caso"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {esAdminOrEpi && (
                          <button
                            onClick={() => handleDelete(caso)}
                            title="Eliminar caso"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedCaso ? `Editar Caso Clínico Nº ${selectedCaso.id_caso}` : 'Registrar Nueva Notificación de Dengue'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 flex-1">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl">
                  {formError}
                </div>
              )}

              {formInfo && (
                <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-xl">
                  {formInfo}
                </div>
              )}

              {/* Sección 1: Paciente */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <h4 className="text-sm font-bold text-slate-800">Información del Paciente</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Documento (DNI/CE) *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={12}
                        value={formData.paciente_documento}
                        onChange={(e) => setFormData({...formData, paciente_documento: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                        placeholder="Ingrese DNI"
                      />
                      <button
                        type="button"
                        onClick={handleSearchDni}
                        disabled={dniSearching}
                        className="px-3 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black disabled:opacity-50 flex items-center justify-center"
                      >
                        {dniSearching ? '...' : 'Buscar'}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nombres *</label>
                    <input
                      type="text"
                      value={formData.paciente_nombres}
                      onChange={(e) => setFormData({...formData, paciente_nombres: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Apellidos *</label>
                    <input
                      type="text"
                      value={formData.paciente_apellidos}
                      onChange={(e) => setFormData({...formData, paciente_apellidos: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de Nacimiento *</label>
                    <input
                      type="date"
                      value={formData.paciente_fecha_nacimiento}
                      onChange={(e) => setFormData({...formData, paciente_fecha_nacimiento: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Sexo *</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          value="M"
                          checked={formData.paciente_sexo === 'M'}
                          onChange={() => setFormData({...formData, paciente_sexo: 'M'})}
                          className="mr-2"
                        /> Masculino
                      </label>
                      <label className="flex items-center text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          value="F"
                          checked={formData.paciente_sexo === 'F'}
                          onChange={() => setFormData({...formData, paciente_sexo: 'F'})}
                          className="mr-2"
                        /> Femenino
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Dpto. Residencia *</label>
                    <select
                      value={formData.paciente_id_depto}
                      onChange={(e) => setFormData({...formData, paciente_id_depto: e.target.value, paciente_id_prov: '', paciente_id_distrito: ''})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">Seleccione</option>
                      {departamentos.map(d => (
                        <option key={d.id_departamento} value={d.id_departamento}>{d.nombre_departamento}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Prov. Residencia *</label>
                    <select
                      value={formData.paciente_id_prov}
                      disabled={!formData.paciente_id_depto}
                      onChange={(e) => setFormData({...formData, paciente_id_prov: e.target.value, paciente_id_distrito: ''})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">Seleccione</option>
                      {formProvincias.map(p => (
                        <option key={p.id_provincia} value={p.id_provincia}>{p.nombre_provincia}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Dist. Residencia *</label>
                    <select
                      value={formData.paciente_id_distrito}
                      disabled={!formData.paciente_id_prov}
                      onChange={(e) => setFormData({...formData, paciente_id_distrito: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">Seleccione</option>
                      {formDistritos.map(d => (
                        <option key={d.id_distrito} value={d.id_distrito}>{d.nombre_distrito}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Datos del Caso y Red de Salud */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h4 className="text-sm font-bold text-slate-800">Establecimiento Notificante y Profesional</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Establecimiento de Salud *</label>
                    <select
                      value={formData.id_establecimiento}
                      disabled={!formData.paciente_id_distrito}
                      onChange={(e) => setFormData({...formData, id_establecimiento: e.target.value, id_profesional: ''})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">Seleccione</option>
                      {formEstablecimientos.map(e => (
                        <option key={e.id_establecimiento} value={e.id_establecimiento}>{e.nombre_establecimiento}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Profesional que Registra *</label>
                    <select
                      value={formData.id_profesional}
                      disabled={!formData.id_establecimiento}
                      onChange={(e) => setFormData({...formData, id_profesional: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">Seleccione</option>
                      {formProfesionales.map(p => (
                        <option key={p.id_profesional} value={p.id_profesional}>{p.nombre_completo}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos Clínicos y Fechas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <h4 className="text-sm font-bold text-slate-800">Información Clínica y Epidemiológica</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de Notificación *</label>
                    <input
                      type="date"
                      value={formData.fecha_notificacion}
                      onChange={(e) => setFormData({...formData, fecha_notificacion: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Inicio Síntomas</label>
                    <input
                      type="date"
                      value={formData.fecha_inicio_sintomas}
                      onChange={(e) => setFormData({...formData, fecha_inicio_sintomas: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Clasificación Clínica *</label>
                    <select
                      value={formData.id_clasificacion}
                      onChange={(e) => setFormData({...formData, id_clasificacion: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      {clasificaciones.map(c => (
                        <option key={c.id_clasificacion} value={c.id_clasificacion}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Serotipo Identificado</label>
                    <select
                      value={formData.id_serotipo}
                      onChange={(e) => setFormData({...formData, id_serotipo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">No Identificado (Nulo)</option>
                      {serotipos.map(s => (
                        <option key={s.id_serotipo} value={s.id_serotipo}>{s.codigo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Diagnóstico *</label>
                    <select
                      value={formData.tipo_diagnostico}
                      onChange={(e) => setFormData({...formData, tipo_diagnostico: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="Probable">Probable</option>
                      <option value="Confirmado" disabled={!esAdminOrEpi}>Confirmado (Solo Epidemiólogo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Condición Final *</label>
                    <select
                      value={formData.condicion}
                      onChange={(e) => setFormData({...formData, condicion: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="Vivo">Vivo</option>
                      <option value="Fallecido">Fallecido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 4: Síntomas Presentados */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CheckSquare className="w-5 h-5 text-blue-500" />
                  <h4 className="text-sm font-bold text-slate-800">Síntomas Clínicos Presentados (Selección Múltiple N:M)</h4>
                </div>
                
                <div className="flex flex-wrap gap-2.5">
                  {sintomas.map(s => {
                    const isChecked = formData.sintomas.includes(s.id_sintoma);
                    return (
                      <button
                        type="button"
                        key={s.id_sintoma}
                        onClick={() => handleSintomaToggle(s.id_sintoma)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {s.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección 5: Pruebas de Laboratorio */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-500" />
                    <h4 className="text-sm font-bold text-slate-800">Pruebas de Laboratorio de Apoyo (Composición)</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLab}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <PlusCircle className="w-4 h-4" /> Agregar Prueba
                  </button>
                </div>

                {formData.diagnosticos_lab.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No se han registrado análisis de laboratorio para este caso.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.diagnosticos_lab.map((lab, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 relative">
                        <div className="w-full sm:w-auto">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                          <select
                            value={lab.tipo_prueba}
                            onChange={(e) => handleLabChange(index, 'tipo_prueba', e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-hidden"
                          >
                            <option value="NS1">NS1 (Antígeno)</option>
                            <option value="IgM">IgM (Anticuerpo)</option>
                            <option value="RT-PCR">RT-PCR (Genético)</option>
                          </select>
                        </div>

                        <div className="w-full sm:w-auto">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Resultado</label>
                          <select
                            value={lab.resultado}
                            onChange={(e) => handleLabChange(index, 'resultado', e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-hidden"
                          >
                            <option value="Positivo">Positivo</option>
                            <option value="Negativo">Negativo</option>
                          </select>
                        </div>

                        <div className="w-full sm:w-auto flex-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Fecha Resultado</label>
                          <input
                            type="date"
                            value={lab.fecha_resultado}
                            onChange={(e) => handleLabChange(index, 'fecha_resultado', e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-hidden w-full"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLab(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-lg"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
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
                  {selectedCaso ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZACIÓN DE DETALLES */}
      {viewModalOpen && selectedCaso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Detalles Completos del Caso Nº {selectedCaso.id_caso}</h3>
              <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-bold">×</button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Paciente */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">Paciente afectado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-400 font-medium">Nombres:</span> <span className="font-semibold text-slate-800">{selectedCaso.paciente.nombres} {selectedCaso.paciente.apellidos}</span></div>
                  <div><span className="text-slate-400 font-medium">Documento:</span> <span className="font-semibold text-slate-800">{selectedCaso.paciente.documento}</span></div>
                  <div><span className="text-slate-400 font-medium">Fecha de Nacimiento:</span> <span className="font-semibold text-slate-800">{selectedCaso.paciente.fecha_nacimiento}</span></div>
                  <div><span className="text-slate-400 font-medium">Sexo:</span> <span className="font-semibold text-slate-800">{selectedCaso.paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></div>
                </div>
              </div>

              {/* Registro */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">Ubicación y Registro Sanitario</h4>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div><span className="text-slate-400 font-medium">Establecimiento de Salud:</span> <span className="font-semibold text-slate-800">{casos.find(c => c.id_caso === selectedCaso.id_caso)?.nombre_establecimiento}</span></div>
                  <div><span className="text-slate-400 font-medium">Médico / Profesional a cargo:</span> <span className="font-semibold text-slate-800">ID Profesional {selectedCaso.id_profesional}</span></div>
                  <div><span className="text-slate-400 font-medium">Semana Epidemiológica del caso:</span> <span className="font-semibold text-slate-800">ID Periodo {selectedCaso.id_periodo}</span></div>
                </div>
              </div>

              {/* Datos Clínicos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">Cuadro Clínico y Fechas</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-400 font-medium">Fecha Notificación:</span> <span className="font-semibold text-slate-850">{selectedCaso.fecha_notificacion}</span></div>
                  <div><span className="text-slate-400 font-medium">Fecha Inicio de Síntomas:</span> <span className="font-semibold text-slate-850">{selectedCaso.fecha_inicio_sintomas || 'No Registra'}</span></div>
                  
                  <div><span className="text-slate-400 font-medium">Clasificación:</span> 
                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedCaso.id_clasificacion === 3 ? 'bg-red-50 text-red-700' :
                      selectedCaso.id_clasificacion === 2 ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {clasificaciones.find(c => c.id_clasificacion === selectedCaso.id_clasificacion)?.nombre}
                    </span>
                  </div>
                  
                  <div><span className="text-slate-400 font-medium">Serotipo:</span> <span className="font-semibold text-slate-800">{serotipos.find(s => s.id_serotipo === selectedCaso.id_serotipo)?.codigo || 'No tipificado'}</span></div>
                  <div><span className="text-slate-400 font-medium">Tipo Diagnóstico:</span> <span className="font-semibold text-slate-800">{selectedCaso.tipo_diagnostico}</span></div>
                  <div><span className="text-slate-400 font-medium">Condición Final:</span> <span className="font-semibold text-slate-800">{selectedCaso.condicion}</span></div>
                </div>
              </div>

              {/* Síntomas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">Síntomas Identificados</h4>
                {selectedCaso.sintomas.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">Ninguno registrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedCaso.sintomas.map(s_id => (
                      <span key={s_id} className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl">
                        {sintomas.find(s => s.id_sintoma === s_id)?.nombre || `Sintoma ${s_id}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Lab */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">Exámenes de Laboratorio</h4>
                {selectedCaso.diagnosticos_lab.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No registra análisis de laboratorio.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCaso.diagnosticos_lab.map((dl, index) => (
                      <div key={index} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-sm">
                        <div>
                          <span className="font-bold text-slate-800">{dl.tipo_prueba}</span>
                          <span className="text-slate-400 text-xs ml-3">Fecha: {dl.fecha_resultado || 'n/a'}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          dl.resultado === 'Positivo' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {dl.resultado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-black btn-premium shadow-sm"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
