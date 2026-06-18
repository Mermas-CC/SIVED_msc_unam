import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Activity, RefreshCw, Download, Sparkles, Send, Stethoscope, Skull, HeartPulse, FileText } from 'lucide-react';

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

  // AI Serotype Analysis States
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const token = localStorage.getItem('token');

  // Reload data whenever filter props change
  useEffect(() => {
    fetchData();
  }, [selectedDepto, selectedProv, selectedDist, selectedAnio, selectedSemanaInicio, selectedSemanaFin]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setAiResponse('');
    setChatHistory([]);
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
      const indRes = await fetch(`http://localhost:5001/api/dashboard/indicadores${query}`, { headers });
      // 2. Casos semanales
      const semRes = await fetch(`http://localhost:5001/api/dashboard/graficos/casos-semanales${query}`, { headers });
      // 3. Serotipos
      const serRes = await fetch(`http://localhost:5001/api/dashboard/graficos/serotipos${query}`, { headers });
      // 4. Letalidad
      const letRes = await fetch(`http://localhost:5001/api/dashboard/graficos/letalidad${query}`, { headers });
      // 5. Síntomas
      const sinRes = await fetch(`http://localhost:5001/api/dashboard/graficos/sintomas${query}`, { headers });

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

  const handleFetchAiAnalysis = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const deptoName = selectedDepto 
        ? departamentos.find(d => d.id_departamento === selectedDepto)?.nombre_departamento 
        : 'Perú (Nacional)';
      
      const serotiposStr = serotipos.map(s => `${s.serotipo}: ${s.casos} casos`).join(', ');
      
      const prompt = `Como epidemiólogo experto, genera un reporte clínico y sanitario breve (máximo 85 palabras) sobre la distribución de serotipos de dengue en ${deptoName}. La distribución es: ${serotiposStr}. Explica el peligro específico de Dengue Grave (Fiebre Hemorrágica) debido a la cocirculación y los serotipos predominantes. Presenta la respuesta de forma concisa y profesional.`;
      
      const res = await fetch('http://localhost:5001/api/pronostico/asistente-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          tipo: 'chat',
          prompt: prompt
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        const responseText = data.respuesta || 'No se pudo generar el análisis.';
        setAiResponse(responseText);
        setChatHistory([{ sender: 'ai', text: responseText }]);
      } else {
        setAiResponse('Error al consultar al asistente de IA.');
      }
    } catch (err) {
      console.error("Error al obtener análisis de IA", err);
      setAiResponse('No se pudo conectar con el asistente de IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendCustomQuery = async (e) => {
    e.preventDefault();
    if (!customQuery.trim() || aiLoading) return;
    
    const queryText = customQuery;
    setCustomQuery('');
    setChatHistory(prev => [...prev, { sender: 'user', text: queryText }]);
    setAiLoading(true);
    
    try {
      const deptoName = selectedDepto 
        ? departamentos.find(d => d.id_departamento === selectedDepto)?.nombre_departamento 
        : 'Perú (Nacional)';
        
      const contextPrompt = `Pregunta médica/epidemiológica del usuario sobre la distribución de serotipos en ${deptoName}: "${queryText}". Responde brevemente (máximo 80 palabras) basándote en los datos de serotipos: ${serotipos.map(s => `${s.serotipo}: ${s.casos} casos`).join(', ')}.`;
      
      const res = await fetch('http://localhost:5001/api/pronostico/asistente-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          tipo: 'chat',
          prompt: contextPrompt
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: 'ai', text: data.respuesta || 'No obtuve respuesta.' }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'ai', text: 'Error al procesar tu consulta.' }]);
      }
    } catch (err) {
      console.error("Error en consulta custom", err);
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'Error de conexión.' }]);
    } finally {
      setAiLoading(false);
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
      
      const res = await fetch(`http://localhost:5001/api/dashboard/exportar/${formato}${query}`, {
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
              <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
              <Line type="monotone" dataKey="casos" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} name="Casos Notificados" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cocirculación de Serotipos e Inteligencia Epidemiológica (SIVED-AI) */}
      <div className="chart-card bg-white p-5 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2 mb-4 border-b border-indigo-100 pb-2">
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">✦ Cocirculación de Serotipos & Inteligencia Epidemiológica SIVED-AI</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Lado Izquierdo: Gráfico de Serotipos */}
          <div className="flex flex-col justify-between h-72">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Distribución por Genotipos y Serotipos</h4>
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
                <p className="text-slate-400 text-xs font-medium">No se han registrado serotipos tipificados en esta región</p>
              </div>
            )}
          </div>

          {/* Lado Derecho: Asistente IA */}
          <div className="flex flex-col justify-between h-72 bg-slate-50/50 p-4 border border-slate-200 rounded-md">
            {chatHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-2.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">Consultor Epidemiológico SIVED-AI</h4>
                <p className="text-slate-400 text-[10px] leading-relaxed max-w-[280px] mb-3">
                  La presencia de múltiples serotipos simultáneos incrementa el riesgo de Dengue Grave. Obtenga recomendaciones clínicas y sanitarias rápidas.
                </p>
                <button
                  onClick={handleFetchAiAnalysis}
                  disabled={aiLoading || serotipos.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white border border-indigo-700 rounded-md text-xs font-medium transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Analizar Serotipos con IA
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-3 flex-1 pr-1 scrollbar-thin">
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[90%] rounded-md p-2.5 text-xs ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-slate-700 border border-slate-200 shadow-2xs'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-400 border border-slate-200 rounded-md p-2 flex items-center gap-1.5 text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      <span>Analizando variables clínicas...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <form onSubmit={handleSendCustomQuery} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Consultar a la IA sobre severidad o contención..."
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                disabled={aiLoading}
              />
              <button
                type="submit"
                disabled={aiLoading || !customQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-2.5 rounded-md flex items-center justify-center transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
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
