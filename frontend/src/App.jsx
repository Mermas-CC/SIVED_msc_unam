import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CasoCRUD from './components/CasoCRUD';
import Forecasting from './components/Forecasting';
import Usuarios from './components/Usuarios';
import AsistenteIA from './components/AsistenteIA';
import { Activity, ShieldAlert, BarChart3, Shield, LogOut, Sparkles } from 'lucide-react';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Verificar si hay una sesión activa guardada
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    if (token && cachedUser) {
      try {
        setUsuario(JSON.parse(cachedUser));
      } catch (err) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUsuario(null);
    setActiveTab('dashboard');
  };

  if (!usuario) {
    return <Login onLoginSuccess={setUsuario} />;
  }

  const esAdmin = usuario.rol === 'Administrador';
  const esAdminOrEpi = usuario.rol === 'Administrador' || usuario.rol === 'Epidemiologo';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* 1. SIDEBAR DE NAVEGACIÓN */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-wide block">SIVED-Perú</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vigilancia Dengue</span>
            </div>
          </div>

          {/* Menú de pestañas */}
          <nav className="px-4 space-y-1.5">
            {/* Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estadísticas Dashboard</span>
            </button>

            {/* Casos (CRUD) */}
            <button
              onClick={() => setActiveTab('casos')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'casos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Casos de Dengue</span>
            </button>

            {/* Asistente IA */}
            <button
              onClick={() => setActiveTab('asistente-ia')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'asistente-ia'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Asistente IA</span>
            </button>

            {/* Forecasting (AI) */}
            {esAdminOrEpi && (
              <button
                onClick={() => setActiveTab('forecasting')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'forecasting'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Pronóstico & Alertas</span>
              </button>
            )}

            {/* Control de Usuarios */}
            {esAdmin && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'usuarios'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Usuarios y Accesos</span>
              </button>
            )}
          </nav>
        </div>

        {/* 2. PERFIL DE USUARIO Y LOGOUT */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-slate-300 font-bold text-sm">
              {usuario.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold text-slate-200 text-sm block truncate">{usuario.username}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">{usuario.rol}</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/40 hover:bg-red-950/20 hover:text-red-400 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 3. CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior de estado */}
        <header className="h-16 bg-white border-b border-slate-100 px-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>UNAM Moquegua</span>
            <span>·</span>
            <span>Maestría en Ciencia de Datos</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Servidor Conectado
          </div>
        </header>

        {/* Zona del contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'casos' && <CasoCRUD usuario={usuario} />}
          {activeTab === 'asistente-ia' && <AsistenteIA />}
          {activeTab === 'forecasting' && esAdminOrEpi && <Forecasting />}
          {activeTab === 'usuarios' && esAdmin && <Usuarios />}
        </main>
      </div>
    </div>
  );
}
