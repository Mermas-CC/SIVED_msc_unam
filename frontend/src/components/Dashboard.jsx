import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Activity, ShieldAlert, Award, Users, RefreshCw, Filter, Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [indicadores, setIndicadores] = useState(null);
  const [casosSemanales, setCasosSemanales] = useState([]);
  const [serotipos, setSerotipos] = useState([]);
  const [letalidad, setLetalidad] = useState([]);
  const [sintomas, setSintomas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [selectedDepto, setSelectedDepto] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedDepto]);

  const fetchDepartamentos = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/geografia/departamentos', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setDepartamentos(data);
      }
    } catch (err) {
      console.error("Error al cargar departamentos", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': token };
      const query = selectedDepto ? `?id_departamento=${selectedDepto}` : '';

      // 1. Indicadores
      const indRes = await fetch(`http://localhost:5001/api/dashboard/indicadores${query}`, { headers });
      // 2. Casos semanales
      const semRes = await fetch(`http://localhost:5001/api/dashboard/graficos/casos-semanales${query}`, { headers });
      // 3. Serotipos
      const serRes = await fetch(`http://localhost:5001/api/dashboard/graficos/serotipos${query}`, { headers });
      // 4. Letalidad
      const letRes = await fetch(`http://localhost:5001/api/dashboard/graficos/letalidad`, { headers });
      // 5. Síntomas
      const sinRes = await fetch(`http://localhost:5001/api/dashboard/graficos/sintomas${query}`, { headers });

      if (indRes.ok && semRes.ok && serRes.ok && letRes.ok && sinRes.ok) {
        setIndicadores(await indRes.json());
        
        // Formatear casos semanales (solo tomar los últimos 50 periodos para que se vea legible)
        const semData = await semRes.json();
        setCasosSemanales(semData.slice(-52)); // Último año epidemiológico
        
        setSerotipos(await serRes.json());
        setLetalidad(await letRes.json());
        setSintomas(await sinRes.json());
      } else {
        throw new Error("Error al consultar la API de estadísticas");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (formato) => {
    try {
      const query = selectedDepto ? `?id_departamento=${selectedDepto}` : '';
      window.open(`http://localhost:5001/api/dashboard/exportar/${formato}${query}?Authorization=${token}`, '_blank');
      // La API REST de Flask permite pasar token en el query o header. Para descargas directas en el navegador
      // pasamos el token y el controlador lo recibirá. Agregamos soporte para token en query en Flask en un momento.
      // O simplemente hacemos fetch y descargamos los bytes en js:
      const res = await fetch(`http://localhost:5001/api/dashboard/exportar/${formato}${query}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_sived.${formato}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert("Error al exportar reporte: " + err.message);
    }
  };

  if (loading && !indicadores) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-gray-500 font-medium">Cargando estadísticas del dengue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-xl mx-auto my-12">
        <p className="text-red-700 font-semibold text-lg">Error al conectar con el servidor backend</p>
        <p className="text-red-500 text-sm mt-1 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg btn-premium">
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard Epidemiológico del Dengue</h1>
          <p className="text-slate-500 text-sm mt-1">Análisis de vigilancia epidemiológica y control en tiempo real — SIVED-Perú</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Departamento */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 mr-2" />
            <select
              value={selectedDepto}
              onChange={(e) => setSelectedDepto(e.target.value)}
              className="bg-transparent text-slate-700 text-sm focus:outline-hidden w-full font-medium"
            >
              <option value="">Todos los Departamentos (Nacional)</option>
              {departamentos.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>
                  {d.nombre_departamento}
                </option>
              ))}
            </select>
          </div>

          {/* Botones de Exportar */}
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold btn-premium"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold btn-premium"
          >
            <Download className="w-4 h-4" /> Reporte PDF
          </button>
        </div>
      </div>

      {/* Tarjetas de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 card-premium">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Casos Notificados</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{indicadores?.total_casos}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 card-premium">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmados</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{indicadores?.total_confirmados}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 card-premium">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fallecidos</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{indicadores?.total_fallecidos}</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 card-premium">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Letalidad Promedio</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{indicadores?.letalidad_pct}%</h3>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 card-premium">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Incidencia / 100K</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{indicadores?.incidencia_por_100k}</h3>
          </div>
        </div>
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva Epidémica */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
          <h3 className="text-base font-bold text-slate-800 mb-4">Curva Epidémica (Casos por Semana Epidemiológica)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={casosSemanales} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="numero_semana" tickFormatter={(val) => `Sem ${val}`} stroke="#94a3b8" style={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: 12 }} />
                <Line type="monotone" dataKey="casos" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Casos de Dengue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución por Serotipos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 mb-4">Distribución por Serotipos Tipificados</h3>
          <div className="h-72 flex flex-col items-center justify-center">
            {serotipos.length > 0 ? (
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serotipos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="casos"
                      nameKey="serotipo"
                    >
                      {serotipos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Leyenda */}
                <div className="flex justify-center gap-4 flex-wrap mt-2">
                  {serotipos.map((entry, index) => (
                    <div key={entry.serotipo} className="flex items-center text-xs font-semibold text-slate-600">
                      <span className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {entry.serotipo}: {entry.casos}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">No se han registrado serotipos en esta región</p>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos Secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Letalidad por Departamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 mb-4">Top 6 Departamentos con Mayor Casuística</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={letalidad.slice(0, 6)} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nombre_departamento" stroke="#94a3b8" style={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: 12 }} />
                <Legend style={{ fontSize: 11 }} />
                <Bar dataKey="casos" fill="#3b82f6" name="Total Casos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fallecidos" fill="#ef4444" name="Fallecidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Síntomas Frecuentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 mb-4">Sintomatología Frecuente</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sintomas} layout="yield" margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="casos" type="number" stroke="#94a3b8" style={{ fontSize: 10 }} />
                <YAxis dataKey="sintoma" type="category" stroke="#94a3b8" style={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: 12 }} />
                <Bar dataKey="casos" fill="#10b981" name="Frecuencia" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
