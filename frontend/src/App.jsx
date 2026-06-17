import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CasoCRUD from './components/CasoCRUD';
import Usuarios from './components/Usuarios';
import AsistenteIA from './components/AsistenteIA';
import { Activity, ShieldAlert, BarChart3, Shield, LogOut, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarColapsado, setSidebarColapsado] = useState(true);

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
      <aside 
        onMouseEnter={() => setSidebarColapsado(false)}
        onMouseLeave={() => setSidebarColapsado(true)}
        className={`${sidebarColapsado ? 'w-16' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out`}
      >
        <div className="space-y-6">
          {/* Logo */}
          <div className="py-5 border-b border-slate-800 flex items-center px-[18px] gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
              sidebarColapsado ? 'opacity-0 max-w-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs translate-x-0 pointer-events-auto'
            }`}>
              <span className="font-bold text-white text-base tracking-wide block">SIVED-Perú</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vigilancia Dengue</span>
            </div>
          </div>

          {/* Menú de pestañas */}
          <nav className="px-2 space-y-1.5">
            {/* Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
              title={sidebarColapsado ? "Estadísticas Dashboard" : ""}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
                sidebarColapsado ? 'opacity-0 max-w-0 ml-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs ml-3 translate-x-0 pointer-events-auto'
              }`}>
                Estadísticas Dashboard
              </span>
            </button>

            {/* Casos (CRUD) */}
            <button
              onClick={() => setActiveTab('casos')}
              className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'casos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
              title={sidebarColapsado ? "Casos de Dengue" : ""}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
                sidebarColapsado ? 'opacity-0 max-w-0 ml-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs ml-3 translate-x-0 pointer-events-auto'
              }`}>
                Casos de Dengue
              </span>
            </button>

            {/* Asistente IA */}
            <button
              onClick={() => setActiveTab('asistente-ia')}
              className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'asistente-ia'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
              title={sidebarColapsado ? "Asistente IA" : ""}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
                sidebarColapsado ? 'opacity-0 max-w-0 ml-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs ml-3 translate-x-0 pointer-events-auto'
              }`}>
                Asistente IA
              </span>
            </button>



            {/* Control de Usuarios */}
            {esAdmin && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                title={sidebarColapsado ? "Usuarios y Accesos" : ""}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
                  sidebarColapsado ? 'opacity-0 max-w-0 ml-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs ml-3 translate-x-0 pointer-events-auto'
                }`}>
                  Usuarios y Accesos
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* 2. PERFIL DE USUARIO Y LOGOUT */}
        <div className="p-3.5 border-t border-slate-800 space-y-4">
          <div className="flex items-center px-1">
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
              {usuario.username.substring(0, 2).toUpperCase()}
            </div>
            <div className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
              sidebarColapsado ? 'opacity-0 max-w-0 ml-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs ml-3 translate-x-0 pointer-events-auto'
            }`}>
              <span className="font-semibold text-slate-200 text-sm block truncate">{usuario.username}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">{usuario.rol}</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-2.5 py-2.5 bg-slate-800/40 hover:bg-red-950/20 hover:text-red-400 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer"
            title={sidebarColapsado ? "Cerrar Sesión" : ""}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
              sidebarColapsado ? 'opacity-0 max-w-0 ml-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs ml-2 translate-x-0 pointer-events-auto'
            }`}>
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* 3. CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior de estado dinámica */}
        <header className="h-16 bg-white border-b border-slate-100 px-8 flex justify-between items-center shrink-0">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Sala de Situación & Vigilancia Epidemiológica</h1>
              <p className="text-[10px] text-slate-400 font-medium">Control y monitoreo en tiempo real de Dengue y Arbovirosis — MINSA Perú</p>
            </div>
          )}
          {activeTab === 'casos' && (
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Casos de Dengue</h1>
              <p className="text-[10px] text-slate-400 font-medium">Registro y control de casos clínicos notificados — SIVED-Perú</p>
            </div>
          )}
          {activeTab === 'asistente-ia' && (
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Asistente Clínico IA (SIVED-AI)</h1>
              <p className="text-[10px] text-slate-400 font-medium">Soporte inteligente para la toma de decisiones sanitarias</p>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Usuarios y Accesos</h1>
              <p className="text-[10px] text-slate-400 font-medium">Administración de usuarios y control de accesos al sistema</p>
            </div>
          )}


        </header>

        {/* Zona del contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'casos' && <CasoCRUD usuario={usuario} />}
          {activeTab === 'asistente-ia' && <AsistenteIA />}

          {activeTab === 'usuarios' && esAdmin && <Usuarios />}
        </main>
      </div>
    </div>
  );
}
