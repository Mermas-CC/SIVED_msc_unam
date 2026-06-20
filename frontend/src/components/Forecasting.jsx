import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BrainCircuit, CloudSun, Play, ShieldAlert, Sparkles, RefreshCw, Info } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Forecasting() {
  const [departamentos, setDepartamentos] = useState([]);
  const [selectedDepto, setSelectedDepto] = useState('');
  const [modelo, setModelo] = useState('SARIMA');
  const [horizonte, setHorizonte] = useState(8);
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [alertasHistoricas, setAlertasHistoricas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  useEffect(() => {
    if (selectedDepto) {
      fetchAlertas();
    } else {
      setResultados(null);
      setAlertasHistoricas([]);
    }
  }, [selectedDepto]);

  const fetchDepartamentos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/geografia/departamentos`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) setDepartamentos(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlertas = async () => {
    setLoadingAlertas(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pronostico/alertas/${selectedDepto}`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        setAlertasHistoricas(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAlertas(false);
    }
  };

  const handleSyncClima = async () => {
    if (!selectedDepto) {
      alert("Seleccione un departamento primero");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pronostico/sincronizar-clima`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ id_departamento: selectedDepto })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Sincronización exitosa. Registros nuevos guardados: ${data.registros_sincronizados}`);
      } else {
        alert(data.mensaje || "Error al sincronizar clima");
      }
    } catch (err) {
      alert("Error de conexión: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRunForecasting = async () => {
    if (!selectedDepto) {
      alert("Seleccione un departamento para el pronóstico");
      return;
    }
    setRunning(true);
    setResultados(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pronostico/predecir/${selectedDepto}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ modelo, horizonte })
      });

      const data = await res.json();
      if (res.ok) {
        setResultados(data);
        fetchAlertas(); // recargar histórico de predicciones/alertas
      } else {
        alert(data.mensaje || "Error al ejecutar pronóstico");
      }
    } catch (err) {
      alert("Error al ejecutar pronóstico: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  // Preparar datos para el gráfico
  const getChartData = () => {
    if (!resultados) return [];
    return resultados.predicciones.map((p, idx) => ({
      semana: `Semana ${p.periodo}`,
      'Casos Predichos': p.casos_predichos,
      'Umbral Esperado (Q2)': p.casos_esperados,
      'Límite de Alerta (Q3)': Math.round(p.casos_esperados * 1.3),
      alerta: p.nivel_alerta
    }));
  };

  const chartData = getChartData();
  const alertaActiva = resultados?.predicciones.some(p => p.nivel_alerta === 'Alerta');

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-blue-500" />
            Módulo de Inteligencia Artificial & Forecasting
          </h2>
          <p className="text-slate-500 text-xs mt-1">Simulación predictiva de brotes epidémicos utilizando modelos matemáticos y clima</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSyncClima}
            disabled={syncing || !selectedDepto}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 btn-premium"
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSun className="w-4 h-4 text-amber-500" />}
            Sincronizar Clima (Open-Meteo)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Configuración */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Configurar Parámetros</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Departamento Objetivo</label>
              <select
                value={selectedDepto}
                onChange={(e) => setSelectedDepto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value="">Seleccione Departamento</option>
                {departamentos.map(d => (
                  <option key={d.id_departamento} value={d.id_departamento}>{d.nombre_departamento}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Algoritmo Predictivo (Polimorfismo)</label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value="SARIMA">SARIMA (Series Temporales Estocásticas)</option>
                <option value="Prophet">Prophet (Tendencias No Lineales y Picos)</option>
                <option value="Regresion">Regresión Lineal Multivariable (con Clima)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Horizonte de Predicción</label>
              <select
                value={horizonte}
                onChange={(e) => setHorizonte(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value={4}>4 Semanas (1 Mes)</option>
                <option value={8}>8 Semanas (2 Meses)</option>
                <option value={12}>12 Semanas (3 Meses)</option>
              </select>
            </div>

            <button
              onClick={handleRunForecasting}
              disabled={running || !selectedDepto}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-100 disabled:opacity-50 btn-premium"
            >
              {running ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Entrenando Modelos...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" /> Ejecutar Pronóstico IA
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 text-xs text-slate-500">
            <Info className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Nota de los modelos</span>
              Los modelos se entrenan dinámicamente con los casos históricos reales del departamento seleccionado y cruzan los patrones de correlación con la temperatura y lluvias de la API de Open-Meteo.
            </div>
          </div>
        </div>

        {/* Panel de Resultados del Pronóstico */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Resultados de la Simulación</span>
              {resultados && (
                <span className="text-xs text-slate-400 font-semibold">
                  Error Medio (MAE): <strong className="text-slate-700">{resultados.mae} casos</strong>
                </span>
              )}
            </h3>

            {!resultados ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-medium italic">
                Seleccione un departamento y ejecute la predicción.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alerta Sanitaria */}
                {alertaActiva ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 animate-bounce" />
                    <div>
                      <h4 className="font-bold text-sm">¡ALERTA DE BROTE DETECTADA!</h4>
                      <p className="text-xs text-red-600 mt-0.5">La proyección indica que los casos de dengue superarán significativamente el umbral histórico de alerta sanitaria en las semanas pronosticadas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700">
                    <Sparkles className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Comportamiento Esperado Estable</h4>
                      <p className="text-xs text-emerald-600 mt-0.5">La tendencia predictiva se mantiene por debajo de los límites críticos de alerta epidemiológica.</p>
                    </div>
                  </div>
                )}

                {/* Gráfico Recharts de Predicción */}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="semana" stroke="#94a3b8" style={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: 12 }} />
                      <Legend style={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Casos Predichos" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 5 }} />
                      <Line type="dashed" dataKey="Umbral Esperado (Q2)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                      <Line type="dashed" dataKey="Límite de Alerta (Q3)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de predicciones / alertas */}
      {selectedDepto && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Historial de Predicciones y Alertas</h3>
          
          {loadingAlertas ? (
            <div className="flex items-center justify-center p-6 text-slate-400 text-sm">
              Cargando historial de alertas...
            </div>
          ) : alertasHistoricas.length === 0 ? (
            <p className="text-slate-400 text-xs italic">No hay registros de alertas en la base de datos para este departamento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-semibold text-xs border-b border-slate-100">
                    <th className="px-5 py-3">ID Predicción</th>
                    <th className="px-5 py-3">Semana Proyectada</th>
                    <th className="px-5 py-3">Casos Observados</th>
                    <th className="px-5 py-3">Casos Proyectados</th>
                    <th className="px-5 py-3">Umbral Esperado</th>
                    <th className="px-5 py-3">Nivel Alerta</th>
                    <th className="px-5 py-3">Algoritmo</th>
                    <th className="px-5 py-3">MAE del Modelo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {alertasHistoricas.map((a) => (
                    <tr key={a.id_prediccion} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-semibold text-slate-900"># {a.id_prediccion}</td>
                      <td className="px-5 py-3 text-slate-500 font-semibold">{a.anio} - S{a.numero_semana} (Periodo {a.id_periodo})</td>
                      <td className="px-5 py-3 font-semibold">{a.casos_observados !== null ? a.casos_observados : 'Pendiente'}</td>
                      <td className="px-5 py-3 font-semibold text-blue-600">{a.casos_predichos}</td>
                      <td className="px-5 py-3">{a.casos_esperados}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          a.nivel_alerta === 'Alerta' ? 'bg-red-500 text-white' :
                          a.nivel_alerta === 'Vigilancia' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                        }`}>
                          {a.nivel_alerta}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium">{a.modelo}</td>
                      <td className="px-5 py-3 text-slate-400 font-semibold">{a.mae}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
