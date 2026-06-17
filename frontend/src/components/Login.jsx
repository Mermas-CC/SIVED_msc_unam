import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, KeyRound, User } from 'lucide-react';

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
      const res = await fetch('http://localhost:5001/api/auth/login', {
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-blue-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md shadow-2xl">
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
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all btn-premium shadow-md shadow-blue-900/10"
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

        <div className="text-center border-t border-slate-800/80 pt-4 text-xs text-slate-500 font-medium">
          Maestría en Ciencia de Datos — Curso Programación en Ciencia de Datos
        </div>
      </div>
    </div>
  );
}
