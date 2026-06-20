import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Activity, RefreshCw, Download, Stethoscope, Skull, HeartPulse, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';

// Soft, harmonious clinical color palette (Blue, Sky, Teal, Muted Slate)
const COLORS = ['#3b82f6', '#0ea5e9', '#10b981', '#64748b'];

export default function Dashboard({
  selectedDepto = '',
  selectedProv = '',
  selectedDist = '',
  selectedAnio = '',
  selectedSemanaInicio = '',
  selectedSemanaFin = ''
}) {
  const [indicadores, setIndicadores] = useState(null);
  const [casosSemanales, setCasosSemanales] = useState([]);
  const [serotipos, setSerotipos] = useState([]);
  const [letalidad, setLetalidad] = useState([]);
  const [sintomas, setSintomas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar departamentos del localStorage para los nombres en reportes
  const [departamentos, setDepartamentos] = useState([]);
  const token = localStorage.getItem('token');

  // Reload data whenever filter props change
  useEffect(() => {
    fetchData();
    // Recuperar departamentos del localStorage si existen
    const cachedDeptos = localStorage.getItem('departamentos');
    if (cachedDeptos) {
      try { setDepartamentos(JSON.parse(cachedDeptos)); } catch (e) {}
    }
  }, [selectedDepto, selectedProv, selectedDist, selectedAnio, selectedSemanaInicio, selectedSemanaFin]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': token };
      
      const params = new URLSearchParams();
      if (selectedDepto) params.append('id_departamento', selectedDepto);
      if (selectedProv) params.append('id_provincia', selectedProv);
      if (selectedDist) params.append('id_distrito', selectedDist);
      if (selectedAnio) params.append('anio', selectedAnio);
      if (selectedSemanaInicio) params.append('semana_inicio', selectedSemanaInicio);
      if (selectedSemanaFin) params.append('semana_fin', selectedSemanaFin);
      
      const query = params.toString() ? `?${params.toString()}` : '';

      // 1. Indicadores
      const indRes = await fetch(`${API_BASE_URL}/api/dashboard/indicadores${query}`, { headers });
      // 2. Casos semanales
      const semRes = await fetch(`${API_BASE_URL}/api/dashboard/graficos/casos-semanales${query}`, { headers });
      // 3. Serotipos
      const serRes = await fetch(`${API_BASE_URL}/api/dashboard/graficos/serotipos${query}`, { headers });
      // 4. Letalidad
      const letRes = await fetch(`${API_BASE_URL}/api/dashboard/graficos/letalidad${query}`, { headers });
      // 5. Síntomas
      const sinRes = await fetch(`${API_BASE_URL}/api/dashboard/graficos/sintomas${query}`, { headers });

      if (indRes.ok && semRes.ok && serRes.ok && letRes.ok && sinRes.ok) {
        setIndicadores(await indRes.json());
        
        const semData = await semRes.json();
        setCasosSemanales(selectedAnio ? semData : semData.slice(-52));
        
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
      const params = new URLSearchParams();
      if (selectedDepto) params.append('id_departamento', selectedDepto);
      if (selectedProv) params.append('id_provincia', selectedProv);
      if (selectedDist) params.append('id_distrito', selectedDist);
      if (selectedAnio) params.append('anio', selectedAnio);
      if (selectedSemanaInicio) params.append('semana_inicio', selectedSemanaInicio);
      if (selectedSemanaFin) params.append('semana_fin', selectedSemanaFin);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      
      const res = await fetch(`${API_BASE_URL}/api/dashboard/exportar/${formato}${query}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_sived_${formato === 'pdf' ? 'epidemiologico.pdf' : 'datos.csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert("Error al exportar reporte: " + err.message);
    }
  };

  const getAlertaStatus = () => {
    if (!indicadores) return null;
    const letalidad = indicadores.letalidad_pct;
    const casos = indicadores.total_casos;
    if (letalidad > 0.15 || casos > 50000) {
      return {
        label: "Alerta Sanitaria Crítica / Brote Activo",
        border: "border-l-4 border-l-[#c8102e]",
        bg: "bg-red-50/20 text-red-900 border border-red-100",
        desc: "Transmisión comunitaria sostenida o tasa de letalidad excediendo el umbral basal de control sanitario."
      };
    } else if (letalidad > 0.05 || casos > 10000) {
      return {
        label: "Vigilancia Epidemiológica Intensiva / Alerta Moderada",
        border: "border-l-4 border-l-[#f59e0b]",
        bg: "bg-amber-50/20 text-amber-900 border border-amber-100",
        desc: "Incremento focalizado de la casuística. Monitoreo permanente de signos de alarma clínicos."
      };
    } else {
      return {
        label: "Situación Estable / Vigilancia Rutinaria",
        border: "border-l-4 border-l-[#10b981]",
        bg: "bg-emerald-50/20 text-emerald-900 border border-emerald-100",
        desc: "Indicadores epidemiológicos basales y tasas de control dentro de la curva de seguridad."
      };
    }
  };

  const alertStatus = getAlertaStatus();

  if (loading && !indicadores) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-gray-400 font-medium font-sans text-xs">Procesando registros de vigilancia médica...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md text-center max-w-xl mx-auto my-12 font-sans">
        <p className="text-red-700 font-semibold text-lg">Error al conectar con la base de datos de SIVED-Perú</p>
        <p className="text-red-500 text-sm mt-1 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-xs font-semibold">
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2 scrollbar-thin">

      {/* Panel Unificado de Indicadores Médicos — KPIs con colores vivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Casos Notificados */}
        <div className="kpi-card bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none rounded-xl" />
          <div className="shrink-0 p-2 bg-blue-100 rounded-lg text-[#004b87]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider leading-none">Casos Notificados</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1.5 leading-none tabular-nums">{indicadores?.total_casos?.toLocaleString()}</h3>
          </div>
        </div>

        {/* Casos Confirmados */}
        <div className="kpi-card bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none rounded-xl" />
          <div className="shrink-0 p-2 bg-emerald-100 rounded-lg text-emerald-700">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider leading-none">Casos Confirmados</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1.5 leading-none tabular-nums">{indicadores?.total_confirmados?.toLocaleString()}</h3>
          </div>
        </div>

        {/* Defunciones */}
        <div className="kpi-card bg-white border border-rose-100 rounded-xl p-4 flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/60 to-transparent pointer-events-none rounded-xl" />
          <div className="shrink-0 p-2 bg-rose-100 rounded-lg text-rose-700">
            <Skull className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-rose-700 uppercase tracking-wider leading-none">Defunciones</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1.5 leading-none tabular-nums">{indicadores?.total_fallecidos?.toLocaleString()}</h3>
          </div>
        </div>

        {/* Letalidad (CFR) */}
        <div className="kpi-card bg-white border border-amber-100 rounded-xl p-4 flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none rounded-xl" />
          <div className="shrink-0 p-2 bg-amber-100 rounded-lg text-amber-700">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider leading-none">Letalidad (CFR)</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1.5 leading-none tabular-nums">{indicadores?.letalidad_pct}%</h3>
          </div>
        </div>

        {/* Incidencia */}
        <div className="kpi-card bg-white border border-violet-100 rounded-xl p-4 flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 to-transparent pointer-events-none rounded-xl" />
          <div className="shrink-0 p-2 bg-violet-100 rounded-lg text-violet-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-violet-700 uppercase tracking-wider leading-none">Incidencia / 100K hab.</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1.5 leading-none tabular-nums">{indicadores?.incidencia_por_100k?.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Curva Epidémica e Histograma */}
      <div className="chart-card bg-white p-5 border border-slate-200 rounded-xl">
        <h3 className="text-[10px] font-bold text-[#004b87] uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">
          📈 Curva Epidémica de Vigilancia {selectedAnio ? `— Año ${selectedAnio}` : '(Casos por Semana Epidemiológica)'}
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={casosSemanales} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="numero_semana" tickFormatter={(val) => `Sem ${val}`} stroke="#64748b" style={{ fontSize: 9 }} />
              <YAxis yAxisId="left" stroke="#64748b" style={{ fontSize: 9 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#f97316" style={{ fontSize: 9 }} unit="°C" />
              <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="casos" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} name="Casos Notificados" />
              <Line yAxisId="right" type="monotone" dataKey="temperatura" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} name="Temp. Promedio (°C)" connectNulls={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cocirculación de Serotipos */}
      <div className="chart-card bg-white p-5 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">✦ Cocirculación de Serotipos</h3>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          {/* Gráfico de Serotipos */}
          <div className="w-full max-w-xl flex flex-col justify-between h-72">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Distribución por Genotipos y Serotipos</h4>
            {serotipos.length > 0 ? (
              <div className="w-full flex-1 flex flex-col justify-center">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serotipos}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="casos"
                        nameKey="serotipo"
                      >
                        {serotipos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '4px', border: 'none', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Leyenda con casos y porcentajes */}
                <div className="flex justify-center gap-4 flex-wrap mt-2">
                  {serotipos.map((entry, index) => {
                    const totalCasos = serotipos.reduce((acc, curr) => acc + curr.casos, 0);
                    const pct = totalCasos > 0 ? ((entry.casos / totalCasos) * 100).toFixed(1) : 0;
                    return (
                      <div key={entry.serotipo} className="flex items-center text-xs font-semibold text-slate-500">
                        <span className="w-2 h-2 rounded-xs mr-1.5 block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {entry.serotipo}: {entry.casos.toLocaleString()} ({pct}%)
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 rounded-md">
                <p className="text-slate-400 text-xs font-medium text-center">No se han registrado serotipos tipificados en esta región</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos Secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Carga de Enfermedad por Localidad */}
        <div className="chart-card bg-white p-5 border border-slate-200 rounded-xl">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">
            🏥 {selectedDist 
              ? "Carga de Enfermedad por Establecimiento de Salud" 
              : selectedProv 
              ? "Carga de Enfermedad por Distritos" 
              : selectedDepto 
              ? "Carga de Enfermedad por Provincias" 
              : "Carga de Enfermedad por Departamentos (Nacional)"}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={letalidad.slice(0, 6)} margin={{ left: 15, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nombre_lugar" stroke="#64748b" style={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
                <Legend style={{ fontSize: 10 }} />
                <Bar dataKey="casos" fill="#2563eb" name="Casos Notificados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fallecidos" fill="#e11d48" name="Defunciones" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Perfil Clínico y Síntomas de Alarma */}
        <div className="chart-card bg-white p-5 border border-slate-200 rounded-xl">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2">
            🩺 Perfil Clínico y Síntomas de Alarma Frecuentes
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sintomas} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="casos" type="number" stroke="#64748b" style={{ fontSize: 9 }} />
                <YAxis dataKey="sintoma" type="category" stroke="#64748b" style={{ fontSize: 9 }} width={85} />
                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
                <Bar dataKey="casos" fill="#0d9488" name="Frecuencia Clínica" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Botones de Descarga al Final del Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Dirección General de Epidemiología — MINSA Perú
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">Sala de Situación Epidemiológica · Datos de Vigilancia en Tiempo Real</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => handleExport('csv')}
            className="btn-premium flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> Descargar Datos (CSV)
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn-premium flex items-center gap-1.5 px-4 py-2 bg-[#004b87] hover:bg-[#00355f] text-white border border-[#00355f] rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Reporte PDF
          </button>
        </div>
      </div>
    </div>
  );
}
