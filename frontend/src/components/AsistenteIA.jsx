import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, RefreshCw, Copy, Download, Trash2, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

const renderInlineText = (text) => {
  if (!text) return '';
  
  // Regex to match bold (** or __), italic (* or _), inline code (`), and markdown links ([text](url))
  const regex = /(\*\*.*?\*\*|__.*?__|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);
  
  return parts.map((part, idx) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={idx} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-slate-100 text-red-650 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium border border-slate-200">{part.slice(1, -1)}</code>;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a 
          key={idx} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
};

const renderMessageContent = (content, isUser = false) => {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];
  let currentParagraph = [];
  let currentList = [];
  let listType = null; // 'ul' or 'ol'
  let currentTable = null;
  let inTable = false;
  let inCodeBlock = false;
  let currentCodeLines = [];
  let codeLanguage = '';

  const textColorClass = isUser ? 'text-white' : 'text-slate-700';

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={`p-${elements.length}`} className={`mb-2 leading-relaxed ${textColorClass} whitespace-pre-line last:mb-0`}>
          {renderInlineText(currentParagraph.join('\n'))}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <Tag key={`list-${elements.length}`} className={`mb-3 pl-5 ${listType === 'ol' ? 'list-decimal' : 'list-disc'} space-y-1.5 ${textColorClass}`}>
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{renderInlineText(item)}</li>
          ))}
        </Tag>
      );
      currentList = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      elements.push(
        <div key={`table-${elements.length}`} className="my-4 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-bold">
                {currentTable.headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-4 py-3.5 border-b border-slate-200 font-semibold tracking-wide">{renderInlineText(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 font-medium whitespace-nowrap">{renderInlineText(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
      inTable = false;
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock && currentCodeLines.length > 0) {
      elements.push(
        <div key={`code-${elements.length}`} className="my-4 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900">
          <div className="bg-slate-800 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 flex justify-between items-center">
            <span>{codeLanguage || 'código'}</span>
            <button 
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(currentCodeLines.join('\n'));
                alert('Código copiado al portapapeles');
              }}
              className="hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold"
            >
              Copiar
            </button>
          </div>
          <pre className="p-4 overflow-x-auto font-mono text-[11px] text-slate-200 leading-relaxed max-w-full">
            <code>{currentCodeLines.join('\n')}</code>
          </pre>
        </div>
      );
      currentCodeLines = [];
      inCodeBlock = false;
      codeLanguage = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 0. Code block support
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushParagraph();
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLanguage = trimmed.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeLines.push(line);
      continue;
    }

    // 1. Table support
    if (trimmed.startsWith('|')) {
      flushParagraph();
      flushList();
      
      let rowText = trimmed;
      if (rowText.startsWith('|')) rowText = rowText.slice(1);
      if (rowText.endsWith('|')) rowText = rowText.slice(0, -1);
      const cells = rowText.split('|').map(c => c.trim());
      
      const isSeparator = cells.every(cell => cell.match(/^[:\s-]+$/));
      if (isSeparator) {
        continue;
      }
      
      if (!inTable) {
        inTable = true;
        currentTable = { headers: cells, rows: [] };
      } else if (currentTable) {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable();
      }
    }

    // 2. Headers support
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      elements.push(<h3 key={`h3-${elements.length}`} className="text-sm font-bold text-slate-800 mt-4 mb-2">{renderInlineText(trimmed.substring(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      elements.push(<h2 key={`h2-${elements.length}`} className="text-base font-bold text-slate-850 mt-5 mb-2.5">{renderInlineText(trimmed.substring(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      elements.push(<h1 key={`h1-${elements.length}`} className="text-lg font-bold text-slate-900 mt-6 mb-3">{renderInlineText(trimmed.substring(2))}</h1>);
      continue;
    }

    // 3. Bullet list support
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(trimmed.substring(2));
      continue;
    }

    // 4. Numbered list support
    const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numListMatch) {
      flushParagraph();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(numListMatch[2]);
      continue;
    }

    // 5. Blockquote support
    if (trimmed.startsWith('>')) {
      flushParagraph();
      flushList();
      flushTable();
      const quoteText = trimmed.startsWith('> ') ? trimmed.substring(2) : trimmed.substring(1);
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="my-3 pl-4 border-l-4 border-blue-500 italic text-slate-650 bg-slate-50/50 py-2.5 rounded-r-xl">
          {renderInlineText(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Empty line separates paragraphs
    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Accumulate paragraph text
    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();
  flushTable();
  flushCodeBlock();

  return <div className="space-y-1.5">{elements}</div>;
};

export default function AsistenteIA() {
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [serotipos, setSerotipos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);

  // Filtros Estadísticos
  const [selectedDepto, setSelectedDepto] = useState('');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [selectedAnio, setSelectedAnio] = useState('');
  const [selectedSemana, setSelectedSemana] = useState('');
  const [selectedSerotipo, setSelectedSerotipo] = useState('');
  const [selectedClasificacion, setSelectedClasificacion] = useState('');

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu Asistente de IA de SIVED-Perú. Puedo ayudarte a responder consultas sobre el dengue, realizar análisis de la situación epidemiológica actual por fechas o regiones utilizando la base de datos o generar campañas de prevención. ¿En qué te puedo ayudar hoy?'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchInitialGeoCatalogos();
  }, []);

  useEffect(() => {
    if (selectedDepto) {
      fetchGeoData('provincias', selectedDepto).then(setProvincias);
      setSelectedProv('');
      setSelectedDist('');
      setDistritos([]);
    } else {
      setProvincias([]);
      setDistritos([]);
      setSelectedProv('');
      setSelectedDist('');
    }
  }, [selectedDepto]);

  useEffect(() => {
    if (selectedProv) {
      fetchGeoData('distritos', selectedProv).then(setDistritos);
      setSelectedDist('');
    } else {
      setDistritos([]);
      setSelectedDist('');
    }
  }, [selectedProv]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchGeoData = async (tipo, id) => {
    const paramName = tipo === 'provincias' ? 'id_departamento' : 'id_provincia';
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (text, customType = 'chat') => {
    const promptToSend = text || input;
    if (!promptToSend.trim()) return;

    // Agregar mensaje de usuario al chat
    const newMsg = { role: 'user', content: promptToSend };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/pronostico/asistente-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          tipo: customType,
          prompt: promptToSend,
          history: [...messages, newMsg],
          id_departamento: selectedDepto || null,
          id_provincia: selectedProv || null,
          id_distrito: selectedDist || null,
          anio: selectedAnio || null,
          semana: selectedSemana || null,
          id_serotipo: selectedSerotipo || null,
          id_clasificacion: selectedClasificacion || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.respuesta }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Lo siento, ocurrió un error: ${data.mensaje || 'No se pudo conectar con el servicio de IA.'}` 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error de red: no se pudo establecer comunicación con el servidor. (${err.message})` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (tipo) => {
    if (tipo === 'analisis') {
      const deptoName = selectedDepto ? departamentos.find(d => d.id_departamento === selectedDepto)?.nombre_departamento : 'Nacional';
      const filters = [];
      if (selectedProv) filters.push(`Provincia: ${provincias.find(p => p.id_provincia === selectedProv)?.nombre_provincia}`);
      if (selectedDist) filters.push(`Distrito: ${distritos.find(d => d.id_distrito === selectedDist)?.nombre_distrito}`);
      if (selectedAnio) filters.push(`Año: ${selectedAnio}`);
      if (selectedSemana) filters.push(`Semana: ${selectedSemana}`);
      if (selectedSerotipo) filters.push(`Serotipo: ${serotipos.find(s => String(s.id_serotipo) === selectedSerotipo)?.codigo}`);
      if (selectedClasificacion) filters.push(`Clasificación: ${clasificaciones.find(c => String(c.id_clasificacion) === selectedClasificacion)?.nombre}`);
      
      const filterStr = filters.length > 0 ? ` con filtros [${filters.join(', ')}]` : '';
      handleSend(`Generar análisis epidemiológico en base a los indicadores del área de ${deptoName}${filterStr}`, 'analisis');
    } else if (tipo === 'campana') {
      const deptoName = selectedDepto 
        ? departamentos.find(d => d.id_departamento === selectedDepto)?.nombre_departamento 
        : 'general';
      handleSend(`Generar campaña de comunicación y prevención comunitaria enfocado en el área de ${deptoName}`, 'campana');
    }
  };

  const handleCopyChat = () => {
    const chatText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente IA'}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(chatText);
    alert('Historial de chat copiado al portapapeles.');
  };

  const handleDownloadChat = () => {
    const chatText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente IA'}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sived_asistente_ia_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearChat = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar el historial de la conversación?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Chat reiniciado. ¿En qué te puedo ayudar hoy?'
        }
      ]);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-10rem)]">
      {/* 1. CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500 animate-bounce" />
            Asistente IA Generativo — SIVED-Perú
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Consultas inteligentes, análisis epidemiológico filtrado por región/fecha y generación de campañas.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amazon Nova Pro Activo</span>
        </div>
      </div>

      {/* 2. AREA CENTRAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* PANEL LATERAL DE FILTROS ESTADÍSTICOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between lg:col-span-1 min-h-0">
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Filtros de Datos de la BD</h3>
            
            {/* Departamento */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Departamento</label>
              <select
                value={selectedDepto}
                onChange={(e) => setSelectedDepto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value="">Nacional / Todos</option>
                {departamentos.map(d => (
                  <option key={d.id_departamento} value={d.id_departamento}>{d.nombre_departamento}</option>
                ))}
              </select>
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Provincia</label>
              <select
                value={selectedProv}
                disabled={!selectedDepto}
                onChange={(e) => setSelectedProv(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Todas</option>
                {provincias.map(p => (
                  <option key={p.id_provincia} value={p.id_provincia}>{p.nombre_provincia}</option>
                ))}
              </select>
            </div>

            {/* Distrito */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Distrito</label>
              <select
                value={selectedDist}
                disabled={!selectedProv}
                onChange={(e) => setSelectedDist(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Todos</option>
                {distritos.map(d => (
                  <option key={d.id_distrito} value={d.id_distrito}>{d.nombre_distrito}</option>
                ))}
              </select>
            </div>

            {/* Año */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Año</label>
              <input
                type="number"
                placeholder="Ej. 2023"
                value={selectedAnio}
                onChange={(e) => setSelectedAnio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Semana */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Semana Epidemiológica</label>
              <input
                type="number"
                placeholder="Ej. 18"
                value={selectedSemana}
                onChange={(e) => setSelectedSemana(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Serotipo */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serotipo</label>
              <select
                value={selectedSerotipo}
                onChange={(e) => setSelectedSerotipo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value="">Todos</option>
                {serotipos.map(s => (
                  <option key={s.id_serotipo} value={s.id_serotipo}>{s.codigo}</option>
                ))}
              </select>
            </div>

            {/* Clasificación */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clasificación</label>
              <select
                value={selectedClasificacion}
                onChange={(e) => setSelectedClasificacion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value="">Todas</option>
                {clasificaciones.map(c => (
                  <option key={c.id_clasificacion} value={c.id_clasificacion}>{c.nombre}</option>
                ))}
              </select>
            </div>
            
            {/* Quick buttons */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleQuickAction('analisis')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Reporte de Brotes IA
              </button>

              <button
                onClick={() => handleQuickAction('campana')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                Diseñar Campaña IA
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 shrink-0">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones del Chat</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCopyChat}
                title="Copiar conversación"
                className="flex items-center justify-center p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownloadChat}
                title="Descargar conversación"
                className="flex items-center justify-center p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearChat}
                title="Limpiar chat"
                className="flex items-center justify-center p-2.5 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENEDOR DE CONVERSACIÓN (CHAT) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs lg:col-span-3 flex flex-col h-full overflow-hidden min-h-0">
          
          {/* Listado de mensajes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-800 text-slate-200'
                }`}>
                  {m.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
                </div>

                {/* Burbuja de mensaje */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 w-full'
                }`}>
                  {renderMessageContent(m.content, m.role === 'user')}
                </div>
              </div>
            ))}

            {/* Cargador animado */}
            {loading && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-slate-800 text-slate-200">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl rounded-tl-none border border-slate-100 text-xs font-semibold italic flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce"></span>
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce delay-200"></span>
                  </div>
                  El Asistente está formulando una respuesta...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Campo de entrada de texto */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 items-center shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Realiza una consulta sobre Dengue en el Perú..."
              disabled={loading}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
