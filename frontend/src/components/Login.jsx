import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, KeyRound, User } from 'lucide-react';
import { API_BASE_URL } from '../config';
import baulSvg from '../assets/baul.svg';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        onLoginSuccess(data.usuario);
      } else {
        setError(data.mensaje || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al conectar con el servidor. Verifique que el backend esté ejecutándose.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans overflow-hidden relative bg-[#0b1428] w-full">
      
      {/* Hand-Drawn Blueprint Title Overlay (Top-Right, White) */}
      <div className="absolute top-10 right-10 z-10 select-none pointer-events-none hidden sm:flex flex-col items-end text-right">
        <h2 
          className="text-3xl text-white/90 tracking-wide font-normal"
          style={{ fontFamily: "'Architects Daughter', cursive" }}
        >
          Cerro Baúl
        </h2>
        <span 
          className="text-xs text-white/60 tracking-widest mt-1 uppercase"
          style={{ fontFamily: "'Architects Daughter', cursive" }}
        >
          Moquegua - Perú
        </span>
        <div className="w-28 h-[1px] bg-white/30 mt-3" />
      </div>

      {/* Background with Vectorized Cerro Baúl SVG Blueprint */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none">
        <div 
          className="w-full h-full bg-no-repeat bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${baulSvg})`,
            opacity: 0.80,
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.05) 0%, rgba(0,0,0,1) 40%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.05) 0%, rgba(0,0,0,1) 40%)'
          }}
        />
        {/* Soft radial overlay for deep dark vignette effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, rgba(11, 20, 40, 0.35) 0%, rgba(11, 20, 40, 0.9) 100%)'
          }}
        />
      </div>

      {/* Content Overlay - Centered Card */}
      <div className="relative z-10 w-full flex items-center justify-center p-4 min-h-screen">
        
        {/* Premium Glassmorphism Login Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-[32px] backdrop-blur-md shadow-[0_25px_60px_rgba(0,0,0,0.45)] w-full max-w-[420px] animate-in fade-in zoom-in duration-500 flex flex-col">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert className="h-9 w-9 animate-pulse" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">SIVED-Perú</h2>
            <p className="mt-2 text-sm text-slate-400">
              Sistema de Vigilancia y Dashboard Epidemiológico de Dengue
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-400 text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombre de Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm font-semibold focus:outline-hidden focus:border-blue-500 transition-colors"
                    placeholder="admin / epidemio / notifica"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm font-semibold focus:outline-hidden focus:border-blue-500 transition-colors"
                    placeholder="Contraseña"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all btn-premium shadow-md shadow-blue-900/10 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" /> Verificando...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </div>
          </form>

          <div className="text-center border-t border-slate-800/80 pt-4 mt-6 text-xs text-slate-500 font-medium">
            Maestría en Ciencia de Datos — Curso Programación en Ciencia de Datos
          </div>
        </div>
      </div>
    </div>
  );
}
