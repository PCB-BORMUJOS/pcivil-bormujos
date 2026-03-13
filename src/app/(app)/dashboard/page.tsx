'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Car, MapPin, Sun, Wind,
  ChevronLeft, ChevronRight, Clock,
  CheckSquare, Square, Save, Droplets,
  Calendar as CalendarIcon, X, AlertTriangle,
  Search, Bell, ChevronDown, Thermometer,
  CloudRain, Cloud, CloudSun, Plus, Lock, Globe, Edit, Trash2
} from 'lucide-react';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Modal Component
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

// Función para obtener color del tipo de evento
function getEventColor(tipo: string, color?: string) {
  if (color) return color;
  switch (tipo) {
    case 'preventivo': return '#EC4899';
    case 'formacion': return '#8B5CF6';
    case 'reunion': return '#F59E0B';
    case 'simulacro': return '#EF4444';
    case 'emergencia': return '#DC2626';
    default: return '#6B7280';
  }
}

// Función para obtener el icono del clima
function getWeatherIcon(icono: string) {
  switch (icono) {
    case 'sun': return '☀️';
    case 'partly-cloudy': return '🌤️';
    case 'cloudy': return '☁️';
    case 'overcast': return '🌥️';
    case 'rain': return '🌧️';
    case 'storm': return '⛈️';
    case 'snow': return '🌨️';
    case 'fog': return '🌫️';
    default: return '🌤️';
  }
}

// Componente de Formulario de Disponibilidad
function AvailabilityForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState('');
  const [semanasDisponibles, setSemanasDisponibles] = useState<{ value: string, label: string }[]>([]);
  const [noDisponible, setNoDisponible] = useState(false);
  const [detalles, setDetalles] = useState<Record<string, string[]>>({
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: []
  });
  const [puedeDobleturno, setPuedeDobleturno] = useState(false);
  const [turnosDeseados, setTurnosDeseados] = useState(1);
  const [notas, setNotas] = useState('');

  const diasSemana = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  // Generar próximas 6 semanas (mínimo 3 semanas de antelación)
  useEffect(() => {
    const semanas: { value: string, label: string }[] = [];
    // Empezar desde la semana actual
    const hoy = new Date();

    for (let i = 0; i < 6; i++) {
      const inicioSemana = new Date(hoy);
      const diasHastaLunes = (8 - hoy.getDay()) % 7 || 7;
      inicioSemana.setDate(hoy.getDate() + diasHastaLunes + (i * 7));

      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);

      const formatoCorto = (fecha: Date) => `${fecha.getDate()}/${fecha.getMonth() + 1}`;
      const value = inicioSemana.toISOString().split('T')[0];
      const label = `Del ${formatoCorto(inicioSemana)} al ${formatoCorto(finSemana)}/${finSemana.getFullYear().toString().slice(-2)}`;

      semanas.push({ value, label });
    }

    setSemanasDisponibles(semanas);
    if (semanas.length > 0) {
      setSemanaSeleccionada(semanas[0].value);
    }
  }, []);

  // Cargar disponibilidad existente cuando cambia la semana
  useEffect(() => {
    if (!semanaSeleccionada) return;

    setLoading(true);
    fetch(`/api/disponibilidad?semana=${semanaSeleccionada}`)
      .then(res => res.json())
      .then(data => {
        if (data.disponibilidad) {
          setNoDisponible(data.disponibilidad.noDisponible || false);
          setDetalles(data.disponibilidad.detalles || {
            lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: []
          });
          setPuedeDobleturno(data.disponibilidad.puedeDobleturno || false);
          setTurnosDeseados(data.disponibilidad.turnosDeseados || 1);
          setNotas(data.disponibilidad.notas || '');
        } else {
          setNoDisponible(false);
          setDetalles({ lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [] });
          setPuedeDobleturno(false);
          setTurnosDeseados(1);
          setNotas('');
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [semanaSeleccionada]);

  const toggleTurno = (dia: string, turno: string) => {
    if (noDisponible) return;
    const actual = detalles[dia] || [];
    const nuevo = actual.includes(turno)
      ? actual.filter(t => t !== turno)
      : [...actual, turno];
    setDetalles({ ...detalles, [dia]: nuevo });
  };

  const contarTurnosSeleccionados = () => {
    return Object.values(detalles).reduce((total, turnos) => total + turnos.length, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semanaInicio: semanaSeleccionada,
          noDisponible,
          detalles: noDisponible ? {} : detalles,
          turnosDeseados: noDisponible ? 0 : turnosDeseados,
          puedeDobleturno: noDisponible ? false : puedeDobleturno,
          notas
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Disponibilidad guardada correctamente');
        onClose();
      } else {
        alert('Error: ' + (data.error || 'No se pudo guardar'));
      }
    } catch (error) {
      alert('Error al guardar la disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
        Por favor, indique sus preferencias detalladas por día y franja horaria.
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semana Referencia</label>
        <select
          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
          value={semanaSeleccionada}
          onChange={e => setSemanaSeleccionada(e.target.value)}
        >
          {semanasDisponibles.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div
        className={`border p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${noDisponible ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
          }`}
        onClick={() => setNoDisponible(!noDisponible)}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${noDisponible ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'
          }`}>
          {noDisponible && <CheckSquare size={14} />}
        </div>
        <span className={`text-sm font-bold ${noDisponible ? 'text-red-700' : 'text-slate-700'}`}>
          MARCAR COMO NO DISPONIBLE
        </span>
      </div>

      <div className={`transition-opacity ${noDisponible ? 'opacity-40 pointer-events-none' : ''}`}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selección de Franjas</label>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-100 text-xs font-bold text-slate-600">
            <div className="p-3 border-r border-slate-200">Día</div>
            <div className="p-3 text-center border-r border-slate-200">Mañana</div>
            <div className="p-3 text-center">Tarde</div>
          </div>
          {diasSemana.map(({ key, label }) => {
            const turnos = detalles[key] || [];
            return (
              <div key={key} className="grid grid-cols-3 border-t border-slate-200 hover:bg-slate-50">
                <div className="p-3 text-sm font-medium text-slate-700 border-r border-slate-200">{label}</div>
                <div
                  className="p-3 flex justify-center border-r border-slate-200 cursor-pointer"
                  onClick={() => toggleTurno(key, 'mañana')}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${turnos.includes('mañana') ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                    }`}>
                    {turnos.includes('mañana') && <CheckSquare size={14} />}
                  </div>
                </div>
                <div
                  className="p-3 flex justify-center cursor-pointer"
                  onClick={() => toggleTurno(key, 'tarde')}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${turnos.includes('tarde') ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 hover:border-blue-400'
                    }`}>
                    {turnos.includes('tarde') && <CheckSquare size={14} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`border p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${noDisponible ? 'opacity-40 pointer-events-none' : ''
          } ${puedeDobleturno ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
        onClick={() => !noDisponible && setPuedeDobleturno(!puedeDobleturno)}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${puedeDobleturno ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'
          }`}>
          {puedeDobleturno && <CheckSquare size={14} />}
        </div>
        <span className="text-sm font-medium text-slate-700">
          Disponible para Doblar Turno (M+T)
        </span>
      </div>

      <div className={`transition-opacity ${noDisponible ? 'opacity-40 pointer-events-none' : ''}`}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turnos Deseados (Semanal)</label>
        <select
          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
          value={turnosDeseados}
          onChange={e => setTurnosDeseados(parseInt(e.target.value))}
          disabled={noDisponible}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Guardando...
          </>
        ) : (
          <>
            <Save size={18} /> Guardar Disponibilidad
          </>
        )}
      </button>
    </form>
  );
}

// Calendar Component with Events, Guardias and Drag & Drop
function CalendarView({ eventos, guardias, resumenDisponibilidad, onEventClick, onDayClick, onGuardiaClick, onEventDrop, onMesChange, userRole }: {
  eventos: any[];
  guardias: any[];
  resumenDisponibilidad: Record<string, any>;
  onEventClick: (evento: any) => void;
  onDayClick: (date: string) => void;
  onGuardiaClick: (date: string, turno: string, guardias: any[]) => void;
  onEventDrop: (eventoId: string, nuevaFecha: string) => void;
  onMesChange: (fecha: Date) => void;
  userRole: string;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedEvent, setDraggedEvent] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const daysOfWeek = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1;

  const days: { num: number; date: string; current: boolean }[] = [];
  for (let i = 0; i < firstDayIndex; i++) days.push({ num: 0, date: '', current: false });
  for (let i = 1; i <= daysCount; i++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ num: i, date, current: true });
  }

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const changeMonth = (dir: 'prev' | 'next') => {
    const newDate = new Date(year, month + (dir === 'next' ? 1 : -1), 1);
    setCurrentDate(newDate);
    onMesChange(newDate);
  };
  const _tn = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }).split('/');
  const todayDay = parseInt(_tn[0]);
  const todayMonth = parseInt(_tn[1]) - 1;
  const todayYear = parseInt(_tn[2]);
  const isToday = (d: typeof days[0]) => d.current && d.num === todayDay && month === todayMonth && year === todayYear;

  const getEventosDelDia = (date: string) => {
    return eventos.filter(e => {
      const _fe = new Date(e.fecha); const fechaEvento = `${_fe.getFullYear()}-${String(_fe.getMonth()+1).padStart(2,'0')}-${String(_fe.getDate()).padStart(2,'0')}`;
      return fechaEvento === date;
    });
  };

  const getGuardiasDelDia = (date: string) => {
    return guardias.filter(g => {
      const _fg = new Date(g.fecha); const fechaGuardia = `${_fg.getFullYear()}-${String(_fg.getMonth()+1).padStart(2,'0')}-${String(_fg.getDate()).padStart(2,'0')}`;
      return fechaGuardia === date;
    });
  };

  const handleDragStart = (e: React.DragEvent, evento: any) => {
    setDraggedEvent(evento);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    if (draggedEvent && date !== new Date(draggedEvent.fecha).toISOString().split('T')[0]) {
      onEventDrop(draggedEvent.id, date);
    }
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const canDragEvent = (evento: any) => {
    return ['superadmin', 'admin', 'coordinador'].includes(userRole) || evento.privado;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><CalendarIcon size={18} /></span>
          Calendario Operativo
        </h2>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></span> <span className="font-medium text-slate-600">Mañana ≥4</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></span> <span className="font-medium text-slate-600">3 personas</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span> <span className="font-medium text-slate-600">≤2 personas</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></span> <span className="font-medium text-slate-600">Tarde ≥4</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-pink-500 flex-shrink-0"></span> <span className="font-medium text-slate-600">Evento</span></span>
            <span className="flex items-center gap-1.5"><Lock size={13} className="text-slate-400" /> <span className="font-medium text-slate-600">Privado</span></span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
            <button onClick={() => changeMonth('prev')} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={18} className="text-slate-500" /></button>
            <span className="text-sm font-semibold text-slate-700 px-3 capitalize min-w-[160px] text-center">{monthName}</span>
            <button onClick={() => changeMonth('next')} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ChevronRight size={18} className="text-slate-500" /></button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {daysOfWeek.map(d => <div key={d} className="py-3 text-center text-xs font-bold text-slate-500 tracking-wider">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const eventosDelDia = day.current ? getEventosDelDia(day.date) : [];
          const guardiasDelDia = day.current ? getGuardiasDelDia(day.date) : [];
          const guardiasMañana = guardiasDelDia.filter(g => g.turno === 'mañana');
          const guardiasTarde = guardiasDelDia.filter(g => g.turno === 'tarde');
          const isDragOver = dragOverDate === day.date;

          return (
            <div
              key={idx}
              className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 relative transition-colors ${day.current ? 'bg-white hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/50'
                } ${isDragOver ? 'bg-orange-50 ring-2 ring-orange-300 ring-inset' : ''}`}
              onClick={() => day.current && onDayClick(day.date)}
              onDragOver={(e) => day.current && handleDragOver(e, day.date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => day.current && handleDrop(e, day.date)}
            >
              {day.current && (
                <span className={`text-sm font-medium absolute top-1.5 left-1.5 w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {day.num}
                </span>
              )}
              <div className="mt-8 space-y-1">
                {(() => {
                  const resumenDia = resumenDisponibilidad[day.date] || {};
                  const resMañana = resumenDia['mañana'];
                  const resTarde = resumenDia['tarde'];

                  // Reglas de color por número de indicativos asignados
                  const colorPorCount = (turno: 'mañana' | 'tarde', count: number) => {
                    if (count >= 4) return turno === 'mañana'
                      ? 'bg-green-100 text-green-700 border-green-500 hover:bg-green-200'
                      : 'bg-blue-100 text-blue-700 border-blue-500 hover:bg-blue-200';
                    if (count === 3) return 'bg-amber-100 text-amber-700 border-amber-500 hover:bg-amber-200';
                    return 'bg-red-100 text-red-700 border-red-500 hover:bg-red-200';
                  };

                  // Color para disponibilidad estimada (sin guardias asignadas, usa total del resumen)
                  const colorDisponibilidad = (turno: 'mañana' | 'tarde', total: number) => {
                    if (total >= 4) return turno === 'mañana'
                      ? 'bg-green-100 text-green-700 border-green-500'
                      : 'bg-blue-100 text-blue-700 border-blue-500';
                    if (total === 3) return 'bg-amber-100 text-amber-700 border-amber-500';
                    return 'bg-red-100 text-red-700 border-red-500';
                  };

                  return (
                    <>
                      {guardiasMañana.length > 0 ? (
                        <div
                          className={`text-[9px] px-1.5 py-1 rounded border-l-2 cursor-pointer ${colorPorCount('mañana', guardiasMañana.length)}`}
                          onClick={(e) => { e.stopPropagation(); onGuardiaClick(day.date, 'mañana', guardiasMañana); }}
                        >
                          <span className="font-bold">T. Mañana</span> ({guardiasMañana.length})
                        </div>
                      ) : resMañana ? (
                        <div
                          className={`text-[9px] px-1.5 py-1 rounded border-l-2 cursor-pointer ${colorDisponibilidad('mañana', resMañana.total)}`}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGuardiaClick(day.date, 'mañana', []); }}
                          title={`Mañana: ${resMañana.total} disponibles | Resp: ${resMañana.responsables} | Carnet: ${resMañana.conCarnet}`}
                        >
                          <span className="font-bold">Mañana</span> <span className="font-semibold">{resMañana.total}</span>
                        </div>
                      ) : null}
                      {guardiasTarde.length > 0 ? (
                        <div
                          className={`text-[9px] px-1.5 py-1 rounded border-l-2 cursor-pointer ${colorPorCount('tarde', guardiasTarde.length)}`}
                          onClick={(e) => { e.stopPropagation(); onGuardiaClick(day.date, 'tarde', guardiasTarde); }}
                        >
                          <span className="font-bold">T. Tarde</span> ({guardiasTarde.length})
                        </div>
                      ) : resTarde ? (
                        <div
                          className={`text-[9px] px-1.5 py-1 rounded border-l-2 cursor-pointer ${colorDisponibilidad('tarde', resTarde.total)}`}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGuardiaClick(day.date, 'tarde', []); }}
                          title={`Tarde: ${resTarde.total} disponibles | Resp: ${resTarde.responsables} | Carnet: ${resTarde.conCarnet}`}
                        >
                          <span className="font-bold">Tarde</span> <span className="font-semibold">{resTarde.total}</span>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
                {eventosDelDia.slice(0, 2).map((evento, i) => (
                  <div
                    key={evento.id || i}
                    draggable={canDragEvent(evento)}
                    onDragStart={(e) => canDragEvent(evento) && handleDragStart(e, evento)}
                    onClick={(e) => { e.stopPropagation(); onEventClick(evento); }}
                    className={`text-[10px] p-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity truncate flex items-center gap-1 ${canDragEvent(evento) ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                    style={{
                      backgroundColor: `${getEventColor(evento.tipo, evento.color)}20`,
                      borderLeft: `3px solid ${getEventColor(evento.tipo, evento.color)}`,
                      color: getEventColor(evento.tipo, evento.color)
                    }}
                  >
                    {evento.privado && <Lock size={10} />}
                    <span className="font-bold">{evento.horaInicio}</span> {evento.titulo}
                  </div>
                ))}
                {eventosDelDia.length > 2 && (
                  <div className="text-[10px] text-slate-500 pl-1">+{eventosDelDia.length - 2} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main Dashboard
export default function DashboardPage() {
  const [showPersonnel, setShowPersonnel] = useState(false);

  // Ordenación J→S→B numérico ascendente (igual que planificador)
  const sortInd = (a: string | null, b: string | null): number => {
    const p = (s: string | null) => !s ? 99 : s.startsWith('J') ? 0 : s.startsWith('S') ? 1 : s.startsWith('B') ? 2 : 3
    const n = (s: string | null) => { const m = s?.match(/\d+/); return m ? parseInt(m[0]) : 9999 }
    return p(a) !== p(b) ? p(a) - p(b) : n(a) - n(b)
  }
  const [showVehicles, setShowVehicles] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showClima, setShowClima] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState<any>(null);
  const [miembrosViogen, setMiembrosViogen] = useState<any[]>([]);
  const [guardiasHoy, setGuardiasHoy] = useState<any>({});
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showParticipantesEvento, setShowParticipantesEvento] = useState<any>(null);
  const [participantesEvento, setParticipantesEvento] = useState<any[]>([]);
  const [showGuardiaDetail, setShowGuardiaDetail] = useState<{ date: string, turno: string, guardias: any[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [voluntarios, setVoluntarios] = useState<any[]>([]);
  const [todosVoluntarios, setTodosVoluntarios] = useState<any[]>([]);  // lista completa, nunca sobreescrita
  const [enTurno, setEnTurno] = useState<any[]>([]);
  const [todosHoy, setTodosHoy] = useState<any[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [statsVeh, setStatsVeh] = useState({ total: 0, disponibles: 0, enServicio: 0, mantenimiento: 0 });
  const [clima, setClima] = useState<any>(null);
  const [loadingVol, setLoadingVol] = useState(true);
  const [eventos, setEventos] = useState<any[]>([]);
  const [guardias, setGuardias] = useState<any[]>([]);
  const [resumenDisponibilidad, setResumenDisponibilidad] = useState<Record<string, any>>({});
  const [formaciones, setFormaciones] = useState<any[]>([]);

  // Estados para disponibilidad contextual
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<{ fecha: string; turno: string; diaSemanaNombre: string } | null>(null);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);

  const [editEventId, setEditEventId] = useState<string | null>(null);
  // — Estados para edición inline de turno en modal de guardia —
  const [editarGuardiaId, setEditarGuardiaId] = useState<string | null>(null);
  const [editarVoluntarioId, setEditarVoluntarioId] = useState<string>('');
  const [savingGuardia, setSavingGuardia] = useState(false);
  // ————————————————————————————————————————————————
  const [newEvent, setNewEvent] = useState({
    titulo: '', descripcion: '', tipo: 'preventivo', horaInicio: '09:00', horaFin: '14:00',
    ubicacion: '', color: '#EC4899', voluntariosMin: 0, voluntariosMax: 0, visible: true, privado: false,
    modalidadFormacion: 'recibimos', formadoresIds: [] as string[], destinatariosExternos: '', numAsistentesExternos: 0
  });

  const cargarEventos = () => {
    fetch('/api/eventos?privados=true').then(res => res.json()).then(data => setEventos(data.eventos || [])).catch(() => { });
  };

  const cargarFormaciones = () => {
    fetch('/api/formacion?tipo=convocatorias&estado=inscripciones_abiertas')
      .then(res => res.json())
      .then(data => setFormaciones(data.convocatorias || []))
      .catch(() => { });
  };

  useEffect(() => {
    const fetchTimeout = (url: string, ms: number) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout: ${url}`)), ms);
        fetch(url)
          .then(res => res.json())
          .then(data => {
            clearTimeout(timeout);
            resolve(data);
          })
          .catch(err => {
            clearTimeout(timeout);
            reject(err);
          });
      });
    };

    Promise.all([
      fetchTimeout('/api/voluntarios', 5000),
      fetchTimeout('/api/vehiculos', 5000),
      fetchTimeout('/api/clima', 5000),
      fetchTimeout('/api/eventos?privados=true', 5000),
      fetchTimeout('/api/guardias', 5000),
    ])
      .then(([volData, vehData, climaData, eventosData, guardiasData]: any[]) => {
        setVoluntarios(volData.voluntarios || []);
        setTodosVoluntarios(volData.voluntarios || []);  // guardar copia completa para el selector
        fetch('/api/accion-social?tipo=miembros-viogen').then(r => r.json()).then(d => setMiembrosViogen(d.miembros || [])).catch(() => {});
        setEnTurno(volData.enTurno || []);
        setTodosHoy(Array.isArray(volData.todosHoy) ? volData.todosHoy : []);
        setTurnoActivo(volData.turnoActivo || null);
        setStats(volData.stats || { total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
        setVehiculos(vehData.vehiculos || []);
        setStatsVeh(vehData.stats || { total: 0, disponibles: 0, enServicio: 0, mantenimiento: 0 });
        setClima(climaData);
        setEventos(eventosData.eventos || []);
        setGuardias(guardiasData.guardias || []);
        // Cargar resumen disponibilidad mes actual
        cargarResumenMes(new Date());
      })
      .catch((err) => {
        /* error silenciado */;
      })
      .finally(() => {
        setLoadingVol(false);
        cargarFormaciones(); // Cargar formaciones abiertas
      });
  }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data?.user?.rol) setUserRole(data.user.rol);
      if (data?.user?.id) setUserId(data.user.id);
    }).catch(() => { });
  }, []);

  // Carga el resumen de disponibilidad de todas las semanas del mes visible
  const cargarResumenMes = async (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    // Obtener lunes de la semana que contiene el día 1 del mes
    const primerDia = new Date(year, month, 1);
    const primerDiaSemana = primerDia.getDay();
    const diasHastaLunes = primerDiaSemana === 0 ? -6 : 1 - primerDiaSemana;
    const primerLunes = new Date(primerDia);
    primerLunes.setDate(primerDia.getDate() + diasHastaLunes);
    // Cargar hasta 6 semanas (cubre cualquier mes)
    const semanas: string[] = [];
    for (let i = -1; i < 7; i++) {
      const lunes = new Date(primerLunes);
      lunes.setDate(primerLunes.getDate() + i * 7);
      const y = lunes.getFullYear();
      const m = String(lunes.getMonth() + 1).padStart(2, '0');
      const d = String(lunes.getDate()).padStart(2, '0');
      semanas.push(`${y}-${m}-${d}`);
    }
    try {
      const resultados = await Promise.all(
        semanas.map(s =>
          fetch('/api/disponibilidad/resumen-semana?semana=' + s)
            .then(r => r.json())
            .then(d => d.resumen || {})
            .catch(() => ({}))
        )
      );
      const resumenTotal: Record<string, any> = {};
      resultados.forEach(r => Object.assign(resumenTotal, r));
      setResumenDisponibilidad(resumenTotal);
    } catch {}
  };

  const handleEventClick = (evento: any) => setShowEventDetail(evento);

  const handleDayClick = (date: string) => {
    if (userRole) {
      setSelectedDate(date);
      const esAdmin = ['superadmin', 'admin', 'coordinador'].includes(userRole);
      setNewEvent({
        titulo: '', descripcion: '', tipo: 'preventivo', horaInicio: '09:00', horaFin: '14:00',
        ubicacion: '', color: '#EC4899', voluntariosMin: 0, voluntariosMax: 0,
        modalidadFormacion: 'recibimos', formadoresIds: [], destinatariosExternos: '', numAsistentesExternos: 0,
        visible: esAdmin, privado: !esAdmin
      });
      setShowCreateEvent(true);
    }
  };

  const handleGuardiaClick = (date: string, turno: string, guardias: any[]) => {
    setShowGuardiaDetail({ date, turno, guardias });

    // Cargar disponibilidad para este turno específico
    cargarDisponibilidadPorTurno(date, turno);
  };

  const handleEventDrop = async (eventoId: string, nuevaFecha: string) => {
    try {
      const response = await fetch('/api/eventos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventoId, fecha: nuevaFecha })
      });
      const data = await response.json();
      if (data.success) {
        cargarEventos();
      } else {
        alert('Error: ' + (data.error || 'No se pudo mover el evento'));
      }
    } catch (error) {
      alert('Error al mover el evento');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const esEdicion = !!editEventId;
      const response = await fetch('/api/eventos', {
        method: esEdicion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(esEdicion
          ? { ...newEvent, id: editEventId }
          : { ...newEvent, fecha: selectedDate }
        )
      });
      const data = await response.json();
      if (data.success) {
        cargarEventos();
        setShowCreateEvent(false);
        setEditEventId(null);
        if (!esEdicion && data.evento) {
          setShowParticipantesEvento(data.evento);
          setParticipantesEvento([]);
        }
      } else {
        alert('Error: ' + (data.error || 'No se pudo guardar el evento'));
      }
    } catch (error) {
      alert('Error al guardar el evento');
    }
  };

  // Nueva función para cargar disponibilidad por turno
  const cargarDisponibilidadPorTurno = async (fecha: string, turno: string) => {
    setLoadingDisponibilidad(true);
    setTurnoSeleccionado({ fecha, turno, diaSemanaNombre: '' });

    try {
      const res = await fetch(`/api/disponibilidad/por-turno?fecha=${fecha}&turno=${turno}`);
      const data = await res.json();

      if (res.ok) {
        setVoluntarios(data.voluntarios || []);
        setEnTurno(data.enTurno || []);
        setTodosHoy(Array.isArray(data.todosHoy) ? data.todosHoy : []);
        setTurnoActivo(data.turnoActivo || null);
        setStats(data.stats || { total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
        setTurnoSeleccionado({ fecha, turno, diaSemanaNombre: data.diaSemanaNombre });
        // NO abrimos showPersonnel — ya queda integrado en showGuardiaDetail
      } else {
        /* error silenciado */;
        // En caso de error, cargar todos los voluntarios como fallback
        cargarTodosVoluntarios();
      }
    } catch (error) {
      /* error silenciado */;
      cargarTodosVoluntarios();
    } finally {
      setLoadingDisponibilidad(false);
    }
  };

  // Función para cargar todos los voluntarios (modo genérico)
  const cargarTodosVoluntarios = () => {
    setTurnoSeleccionado(null);
    fetch('/api/voluntarios')
      .then(res => res.json())
      .then(data => {
        setVoluntarios(data.voluntarios || []);
        setEnTurno(data.enTurno || []);
        setTodosHoy(Array.isArray(data.todosHoy) ? data.todosHoy : []);
        setStats(data.stats || { total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
      })
      .catch(() => { });
  };

  // Reasignar guardia a otro voluntario (solo admin): DELETE + POST
  const handleReasignarGuardia = async (guardiaId: string, nuevoVoluntarioId: string, fecha: string, turno: string) => {
    if (!nuevoVoluntarioId) return;
    setSavingGuardia(true);
    try {
      // Eliminar guardia actual
      const delRes = await fetch(`/api/cuadrantes?id=${guardiaId}`, { method: 'DELETE' });
      if (!delRes.ok) throw new Error('Error al eliminar guardia');
      // Crear nueva con el voluntario seleccionado
      const postRes = await fetch('/api/cuadrantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, turno, usuarioId: nuevoVoluntarioId, tipo: 'programada' })
      });
      if (!postRes.ok) throw new Error('Error al crear guardia');
      // Recargar guardias del calendario
      const guardiasRes = await fetch('/api/guardias');
      const guardiasData = await guardiasRes.json();
      setGuardias(guardiasData.guardias || []);
      // Actualizar el modal con las guardias nuevas del mismo turno
      const nuevasGuardias = (guardiasData.guardias || []).filter((g: any) =>
        new Date(g.fecha).toISOString().split('T')[0] === fecha && g.turno === turno
      );
      setShowGuardiaDetail(prev => prev ? { ...prev, guardias: nuevasGuardias } : null);
      setEditarGuardiaId(null);
      setEditarVoluntarioId('');
    } catch (e) {
      alert('Error al reasignar el turno. Inténtalo de nuevo.');
    } finally {
      setSavingGuardia(false);
    }
  };

  // Eliminar guardia directamente desde el modal (solo admin)
  const handleEliminarGuardia = async (guardiaId: string, fecha: string, turno: string) => {
    if (!confirm('¿Eliminar esta asignación de turno? Esta acción no se puede deshacer.')) return;
    setSavingGuardia(true);
    try {
      const res = await fetch(`/api/cuadrantes?id=${guardiaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      // Recargar guardias del calendario + stats de personal en turno
      const [guardiasRes, volRes] = await Promise.all([
        fetch('/api/guardias'),
        fetch('/api/voluntarios')
      ]);
      const guardiasData = await guardiasRes.json();
      const volData = await volRes.json();
      setGuardias(guardiasData.guardias || []);
      setEnTurno(volData.enTurno || []);
      setTodosHoy(Array.isArray(volData.todosHoy) ? volData.todosHoy : []);
      setStats(volData.stats || { total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
      // Actualizar modal con guardias restantes del mismo turno
      const restantes = (guardiasData.guardias || []).filter((g: any) =>
        new Date(g.fecha).toISOString().split('T')[0] === fecha && g.turno === turno
      );
      setShowGuardiaDetail(prev => prev ? { ...prev, guardias: restantes } : null);
      setEditarGuardiaId(null);
      setEditarVoluntarioId('');
    } catch (e) {
      alert('Error al eliminar la guardia. Inténtalo de nuevo.');
    } finally {
      setSavingGuardia(false);
    }
  };

  const esAdmin = ['superadmin', 'admin', 'coordinador'].includes(userRole);

  return (
    <div className="space-y-6">

      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setShowAvailability(true)} className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-[10px] font-bold uppercase tracking-wider">Acción Requerida</p>
              <h3 className="text-lg font-bold mt-1">Enviar Disponibilidad</h3>
            </div>
            <div className="bg-white/20 p-2 rounded-lg"><CalendarIcon size={20} /></div>
          </div>
          <button className="mt-4 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-white/30 transition-colors">
            <CalendarIcon size={14} /> Próxima Semana
          </button>
        </div>

        <div
          onClick={() => { cargarTodosVoluntarios(); setShowPersonnel(true); }}
          className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium flex items-center gap-1">
                {turnoSeleccionado ? (
                  <>
                    Disponibles <span className="font-bold text-slate-700">{turnoSeleccionado.diaSemanaNombre?.charAt(0).toUpperCase() + turnoSeleccionado.diaSemanaNombre?.slice(1)} {turnoSeleccionado.turno === 'mañana' ? '🌅' : '🌆'}</span>
                  </>
                ) : (
                  <>En Turno / Activos<ChevronDown size={14} className="text-slate-400" /></>
                )}
              </p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">
                {loadingVol || loadingDisponibilidad ? '...' : enTurno.length}
                <span className="text-base text-slate-400 font-normal ml-1">
                  / {stats.total}
                </span>
              </h3>
            </div>
            <div className={`bg-slate-100 group-hover:bg-orange-100 p-2.5 rounded-xl text-slate-500 group-hover:text-orange-600 transition-colors ${turnoSeleccionado ? 'ring-2 ring-orange-400' : ''
              }`}>
              <Users size={22} />
            </div>
          </div>
        </div>

        <div onClick={() => setShowVehicles(true)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium flex items-center gap-1">Vehículos Disp.<ChevronDown size={14} className="text-slate-400" /></p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{statsVeh.disponibles}<span className="text-base text-slate-400 font-normal ml-1">/ {statsVeh.total}</span></h3>
            </div>
            <div className="bg-slate-100 group-hover:bg-green-100 p-2.5 rounded-xl text-slate-500 group-hover:text-green-600 transition-colors"><Car size={22} /></div>
          </div>
        </div>

        <div onClick={() => setShowClima(true)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
          {clima?.alertas?.length > 0 && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><MapPin size={10} /> {clima?.municipio?.toUpperCase() || 'BORMUJOS'}</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{clima?.temperatura || '--'}°C</h3>
              <p className="text-slate-500 text-sm">{clima?.estadoCielo || 'Cargando...'}</p>
              {clima?.alertas?.length > 0 && (
                <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> {clima.alertas.length} alerta{clima.alertas.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="bg-yellow-100 p-2.5 rounded-xl text-2xl">{getWeatherIcon(clima?.proximosDias?.[0]?.icono || 'sun')}</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        eventos={eventos}
        guardias={guardias}
        resumenDisponibilidad={resumenDisponibilidad}
        onEventClick={handleEventClick}
        onDayClick={handleDayClick}
        onGuardiaClick={handleGuardiaClick}
        onEventDrop={handleEventDrop}
        onMesChange={cargarResumenMes}
        userRole={userRole}
      />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <h4 className="font-bold flex items-center gap-2 mb-3 text-lg"><span className="text-2xl">✨</span> IA Operativa - Gemini</h4>
          <p className="text-sm text-indigo-100 leading-relaxed">
            <strong>Resumen:</strong> Dispositivo preventivo activo. {guardias.length} turnos programados esta semana. {eventos.length} eventos planificados.
          </p>
        </div>

        {/* Próximas Formaciones */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">📚</span> Próximas Formaciones
          </h4>
          {formaciones.length === 0 ? (
            <p className="text-sm text-slate-400">No hay formaciones abiertas</p>
          ) : (
            <div className="space-y-3">
              {formaciones.slice(0, 3).map((f: any) => (
                <div key={f.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="font-medium text-slate-800 text-sm">{f.curso?.nombre}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(f.fechaInicio).toLocaleDateString()} • {f.plazasOcupadas}/{f.plazasDisponibles} plazas
                  </p>
                  {f.curso?.formadorPrincipal && (
                    <p className="text-xs text-slate-400 mt-0.5">👤 {f.curso.formadorPrincipal}</p>
                  )}
                  {f.curso?.entidadOrganiza && (
                    <p className="text-xs text-slate-400">🏛 {f.curso.entidadOrganiza}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.plazasDisponibles - f.plazasOcupadas > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {f.plazasDisponibles - f.plazasOcupadas > 0 ? `${f.plazasDisponibles - f.plazasOcupadas} plazas libres` : 'Sin plazas'}
                    </span>
                    {f.plazasDisponibles - f.plazasOcupadas > 0 && (
                      <button
                        onClick={async () => {
                          const res = await fetch('/api/formacion', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tipo: 'inscripcion', convocatoriaId: f.id })
                          })
                          const data = await res.json()
                          if (res.ok) {
                            alert('✅ Inscripción realizada correctamente')
                            fetch('/api/formacion?tipo=convocatorias&estado=inscripciones_abiertas')
                              .then(r => r.json())
                              .then(d => setFormaciones(d.convocatorias || []))
                          } else {
                            alert(data.error || 'Error al inscribirse')
                          }
                        }}
                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                      >
                        Inscribirme
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {formaciones.length > 3 && (
                <p className="text-xs text-purple-600 text-center">+ {formaciones.length - 3} más</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Estado de Flota</h4>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray={`${(statsVeh.disponibles / (statsVeh.total || 1)) * 251.2} 251.2`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{statsVeh.disponibles}/{statsVeh.total}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-600"><span className="w-3 h-3 rounded-full bg-green-500"></span> Disponible</span><span className="font-bold text-slate-800">{statsVeh.disponibles}</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-600"><span className="w-3 h-3 rounded-full bg-orange-500"></span> En Servicio</span><span className="font-bold text-slate-800">{statsVeh.enServicio}</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-600"><span className="w-3 h-3 rounded-full bg-red-500"></span> Mantenimiento</span><span className="font-bold text-slate-800">{statsVeh.mantenimiento}</span></div>
            </div>
          </div>
        </div>

        {/* Tarjeta Viogen */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <span className="text-rose-600 font-bold text-sm">V</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Viogen</h4>
              <p className="text-xs text-slate-400">Disponibilidad hoy</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          {(() => {
            const hoy = new Date().toISOString().split('T')[0];
            const hoyData = guardiasHoy[hoy] || {};
            const manana = miembrosViogen.filter((m: any) => hoyData[m.id]?.manana);
            const tarde = miembrosViogen.filter((m: any) => hoyData[m.id]?.tarde);
            return (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-xs font-bold text-amber-700 uppercase">{"Mañana · 09:00–15:00"}</span>
                    <span className="ml-auto text-xs font-bold text-amber-700">{manana.length}</span>
                  </div>
                  {manana.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin cobertura</p>
                  ) : (
                    <div className="space-y-1">
                      {manana.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                            {m?.nombre?.charAt(0)}{m?.apellidos?.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{m?.numeroVoluntario} {m?.nombre} {m?.apellidos}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-xs font-bold text-blue-700 uppercase">Tarde · 15:00–21:00</span>
                    <span className="ml-auto text-xs font-bold text-blue-700">{tarde.length}</span>
                  </div>
                  {tarde.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin cobertura</p>
                  ) : (
                    <div className="space-y-1">
                      {tarde.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                            {m?.nombre?.charAt(0)}{m?.apellidos?.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{m?.numeroVoluntario} {m?.nombre} {m?.apellidos}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal Event Detail */}
      {showEventDetail && (
        <Modal title={showEventDetail.titulo} onClose={() => setShowEventDetail(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getEventColor(showEventDetail.tipo, showEventDetail.color) }}>{showEventDetail.tipo?.toUpperCase()}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${showEventDetail.estado === 'programado' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{showEventDetail.estado?.toUpperCase()}</span>
              {showEventDetail.privado && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1"><Lock size={12} /> PRIVADO</span>
              )}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-800">{new Date(showEventDetail.fecha).getDate()}</div>
                  <div className="text-sm text-slate-500 capitalize">{new Date(showEventDetail.fecha).toLocaleDateString('es-ES', { month: 'short' })}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-slate-700"><Clock size={16} /><span className="font-medium">{showEventDetail.horaInicio}</span>{showEventDetail.horaFin && <><span className="text-slate-400">→</span><span className="font-medium">{showEventDetail.horaFin}</span></>}</div>
                  {showEventDetail.ubicacion && <div className="flex items-center gap-2 text-slate-500 mt-1"><MapPin size={16} /><span>{showEventDetail.ubicacion}</span></div>}
                </div>
              </div>
            </div>
            {showEventDetail.descripcion && <div><h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Descripción</h4><p className="text-slate-700">{showEventDetail.descripcion}</p></div>}

            {/* Acciones admin: Editar / Eliminar */}
            {['superadmin', 'admin'].includes(userRole) && (
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setNewEvent({
                      titulo: showEventDetail.titulo,
                      descripcion: showEventDetail.descripcion || '',
                      tipo: showEventDetail.tipo,
                      horaInicio: showEventDetail.horaInicio || '09:00',
                      horaFin: showEventDetail.horaFin || '14:00',
                      ubicacion: showEventDetail.ubicacion || '',
                      color: showEventDetail.color || '#EC4899',
                      voluntariosMin: showEventDetail.voluntariosMin || 0,
                      voluntariosMax: showEventDetail.voluntariosMax || 0,
                      visible: showEventDetail.visible !== false,
                      privado: showEventDetail.privado || false,
                      modalidadFormacion: showEventDetail.modalidadFormacion || 'recibimos',
                      formadoresIds: showEventDetail.formadoresIds ? showEventDetail.formadoresIds.split(',') : [],
                      destinatariosExternos: showEventDetail.destinatariosExternos || '',
                      numAsistentesExternos: showEventDetail.numAsistentesExternos || 0,
                    });
                    setSelectedDate(showEventDetail.fecha?.split('T')[0] || '');
                    setEditEventId(showEventDetail.id);
                    setShowEventDetail(null);
                    setShowCreateEvent(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  <Edit size={16} /> Editar
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
                    const res = await fetch(`/api/eventos?id=${showEventDetail.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      setShowEventDetail(null);
                      cargarEventos();
                    } else {
                      alert('Error al eliminar el evento');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            )}
            {/* Si es un evento de formación, permitir inscripción */}
            {showEventDetail.tipo === 'formacion' && (
              <div className="pt-4 border-t mt-4">
                <button
                  onClick={async () => {
                    const res = await fetch('/api/formacion', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        tipo: 'inscripcion',
                        convocatoriaId: showEventDetail.esConvocatoria ? showEventDetail.id : (
                          // Intentar encontrar en la lista de formaciones cargadas si no es una convocatoria directa
                          formaciones.find((f: any) =>
                            f.curso?.nombre === showEventDetail.titulo.replace('Formación: ', '') &&
                            new Date(f.fechaInicio).toDateString() === new Date(showEventDetail.fecha).toDateString()
                          )?.id
                        ),
                        usuarioId: userId
                      })
                    });

                    const data = await res.json();
                    if (res.ok) {
                      alert(`✅ ${data.mensaje || 'Solicitud enviada'}`);
                      setShowEventDetail(null);
                      cargarFormaciones();
                    } else {
                      alert('Error: ' + (data.error || 'No se pudo realizar la inscripción'));
                    }
                  }}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Users size={18} /> Inscribirme en esta formación
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Create Event */}
      {showCreateEvent && (
        <Modal title={editEventId ? 'Editar Evento' : `Crear Evento - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={() => { setShowCreateEvent(false); setEditEventId(null); }} wide>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            {esAdmin && (
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewEvent({ ...newEvent, privado: false, visible: true })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${!newEvent.privado ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Globe size={16} /> Público
                </button>
                <button
                  type="button"
                  onClick={() => setNewEvent({ ...newEvent, privado: true, visible: false })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${newEvent.privado ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Lock size={16} /> Privado
                </button>
              </div>
            )}

            {!esAdmin && (
              <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                <Lock size={16} /> Este evento será privado y solo visible para ti
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
              <input type="text" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.titulo} onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })} placeholder="Ej: Dispositivo Feria" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" rows={2} value={newEvent.descripcion} onChange={e => setNewEvent({ ...newEvent, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.tipo} onChange={e => {
                  const tipo = e.target.value;
                  let color = '#6B7280';
                  if (tipo === 'preventivo') color = '#EC4899';
                  if (tipo === 'formacion') color = '#8B5CF6';
                  if (tipo === 'reunion') color = '#F59E0B';
                  if (tipo === 'simulacro') color = '#EF4444';
                  if (tipo === 'emergencia') color = '#DC2626';
                  setNewEvent({ ...newEvent, tipo, color });
                }}>
                  <option value="preventivo">Preventivo</option>
                  <option value="formacion">Formación</option>
                  <option value="reunion">Reunión</option>
                  <option value="simulacro">Simulacro</option>
                  <option value="emergencia">Emergencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.ubicacion} onChange={e => setNewEvent({ ...newEvent, ubicacion: e.target.value })} />
              </div>
            </div>
            {newEvent.tipo === 'formacion' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-semibold text-purple-700">Modalidad de Formación</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewEvent({ ...newEvent, modalidadFormacion: 'recibimos' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${newEvent.modalidadFormacion === 'recibimos' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                    Recibimos formación
                  </button>
                  <button type="button" onClick={() => setNewEvent({ ...newEvent, modalidadFormacion: 'impartimos' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${newEvent.modalidadFormacion === 'impartimos' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                    Impartimos formación
                  </button>
                </div>
                {newEvent.modalidadFormacion === 'impartimos' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Formadores (voluntarios del servicio)</label>
                      <div className="border border-slate-300 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                        {[...voluntarios].sort((a: any, b: any) => sortInd(a.numeroVoluntario, b.numeroVoluntario)).map((v: any) => (
                          <label key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-purple-600"
                              checked={(newEvent.formadoresIds || []).includes(v.id)}
                              onChange={e => {
                                const ids = e.target.checked
                                  ? [...(newEvent.formadoresIds || []), v.id]
                                  : (newEvent.formadoresIds || []).filter((id: string) => id !== v.id)
                                setNewEvent({ ...newEvent, formadoresIds: ids })
                              }} />
                            <span className="text-sm text-slate-700">{v.nombre} {v.apellidos}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Destinatarios (personas externas)</label>
                      <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                        placeholder="Ej: Vecinos del barrio, alumnos IES..." value={newEvent.destinatariosExternos}
                        onChange={e => setNewEvent({ ...newEvent, destinatariosExternos: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nº asistentes estimados</label>
                      <input type="number" min={0} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                        value={newEvent.numAsistentesExternos}
                        onChange={e => setNewEvent({ ...newEvent, numAsistentesExternos: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio *</label>
                <input type="time" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.horaInicio} onChange={e => setNewEvent({ ...newEvent, horaInicio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Fin</label>
                <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.horaFin} onChange={e => setNewEvent({ ...newEvent, horaFin: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateEvent(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center justify-center gap-2">
                {editEventId ? <><Edit size={18} /> Guardar Cambios</> : <><Plus size={18} /> {newEvent.privado ? 'Crear Evento Privado' : 'Crear Evento'}</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Guardia Detail — unificado con disponibilidad */}
      {showGuardiaDetail && (
        <Modal
          title={`Turno ${showGuardiaDetail.turno === 'mañana' ? 'Mañana' : 'Tarde'} — ${new Date(showGuardiaDetail.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          onClose={() => { setShowGuardiaDetail(null); setTurnoSeleccionado(null); }}
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

            {/* Franja horaria */}
            <div className={`p-3 rounded-lg flex items-center gap-3 ${showGuardiaDetail.turno === 'mañana' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${showGuardiaDetail.turno === 'mañana' ? 'bg-green-500' : 'bg-blue-500'}`} />
              <span className="font-bold text-slate-700">
                {showGuardiaDetail.turno === 'mañana' ? '09:00 – 14:30' : '17:00 – 22:00'}
              </span>
            </div>

            {/* Personal asignado a la guardia */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                Personal Asignado ({showGuardiaDetail.guardias.length})
              </h4>
              {showGuardiaDetail.guardias.length === 0 ? (
                <p className="text-xs text-slate-400 italic pl-4">Sin personal asignado a esta guardia</p>
              ) : (
                <div className="space-y-2">
                  {[...showGuardiaDetail.guardias].sort((a: any, b: any) => sortInd(a.usuario?.numeroVoluntario, b.usuario?.numeroVoluntario)).map((g, i) => (
                    <div key={i} className="rounded-lg border border-orange-100 overflow-hidden">
                      {/* Fila principal de la guardia */}
                      <div className="flex items-center gap-3 p-2.5 bg-orange-50">
                        <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {g.usuario?.nombre?.charAt(0)}{g.usuario?.apellidos?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{g.usuario?.numeroVoluntario}</span>
                            {g.rol === 'Responsable' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">RESPONSABLE</span>}
                            {g.rol === 'Cecopal' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">CECOPAL</span>}
                          </div>
                          <p className="text-xs text-slate-600 truncate">{g.usuario?.nombre} {g.usuario?.apellidos}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold flex-shrink-0 ${g.estado === 'programada' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {g.estado?.toUpperCase() || 'PROGRAMADA'}
                        </div>
                        {/* Botón editar — solo admin */}
                        {esAdmin && g.id && (
                          <button
                            onClick={() => {
                              if (editarGuardiaId === g.id) {
                                setEditarGuardiaId(null);
                                setEditarVoluntarioId('');
                              } else {
                                setEditarGuardiaId(g.id);
                                setEditarVoluntarioId(g.usuario?.id || '');
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-100 transition-colors flex-shrink-0"
                            title="Editar asignación de turno"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                      {/* Panel inline de edición */}
                      {esAdmin && editarGuardiaId === g.id && (
                        <div className="bg-slate-50 border-t border-orange-100 p-3 space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Reasignar indicativo</p>
                          <select
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                            value={editarVoluntarioId}
                            onChange={e => setEditarVoluntarioId(e.target.value)}
                          >
                            <option value="">— Seleccionar voluntario —</option>
                            {todosVoluntarios.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.numeroVoluntario} — {v.nombre} {v.apellidos}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReasignarGuardia(g.id, editarVoluntarioId, showGuardiaDetail.date, showGuardiaDetail.turno)}
                              disabled={savingGuardia || !editarVoluntarioId}
                              className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {savingGuardia ? (
                                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                              ) : (
                                <><Save size={12} /> Guardar</>
                              )}
                            </button>
                            <button
                              onClick={() => handleEliminarGuardia(g.id, showGuardiaDetail.date, showGuardiaDetail.turno)}
                              disabled={savingGuardia}
                              className="py-1.5 px-3 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                              title="Eliminar esta asignación"
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={() => { setEditarGuardiaId(null); setEditarVoluntarioId(''); }}
                              className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Separador */}
            <div className="border-t border-slate-100" />

            {/* Disponibilidad del turno */}
            {loadingDisponibilidad ? (
              <p className="text-xs text-slate-400 text-center py-2">Cargando disponibilidad...</p>
            ) : (
              <>
                {/* Voluntarios disponibles para este turno */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Disponibles este turno ({enTurno.length})
                  </h4>
                  {enTurno.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-4">Sin disponibilidad confirmada</p>
                  ) : (
                    <div className="space-y-1.5">
                      {[...todosHoy].sort((a: any, b: any) => sortInd(a.numeroVoluntario, b.numeroVoluntario)).map((v: any) => (
                        <div key={v.id} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-100">
                          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 text-xs">{v.numeroVoluntario}</span>
                              {v.turno && <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-700 font-bold">{v.turno}</span>}
                            </div>
                            <p className="text-xs text-slate-600 truncate">{v.nombre} {v.apellidos}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Personal activo total */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    Personal Activo ({stats.total})
                  </h4>
                  <div className="space-y-1.5">
                    {[...voluntarios].sort((a: any, b: any) => sortInd(a.numeroVoluntario, b.numeroVoluntario)).map((v: any) => (
                      <div key={v.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-800 text-xs">{v.numeroVoluntario}</span>
                          <p className="text-xs text-slate-600 truncate">{v.nombre} {v.apellidos}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Personnel */}
      {showPersonnel && (
        <Modal
          title={`Personal — ${enTurno.length} en turno / ${stats.total} activos`}
          onClose={() => { setShowPersonnel(false); setTurnoSeleccionado(null); }}
        >
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {/* En Turno Hoy */}
            <div>
              {(() => {
                // Filtrar por turno activo y ordenar J→S→B
                const turnoLabel = turnoActivo === 'mañana' ? 'Mañana · 09:00–14:30' : turnoActivo === 'tarde' ? 'Tarde · 17:00–22:00' : null
                const enTurnoActivo = turnoActivo
                  ? [...todosHoy]
                      .filter((v: any) => v.turno === turnoActivo)
                      .sort((a: any, b: any) => sortInd(a.numeroVoluntario, b.numeroVoluntario))
                  : []
                return (
                  <>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                      {turnoLabel ? `En Turno Ahora — ${turnoLabel}` : 'Personal Hoy'}
                      <span className="ml-auto text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{enTurnoActivo.length} personas</span>
                    </h4>
                    {enTurnoActivo.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pl-4">
                        {turnoActivo ? `Sin guardias programadas para el turno ${turnoActivo}` : 'Fuera de horario de turno'}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {enTurnoActivo.map((v: any) => (
                          <div key={`${v.id}-${v.turno}`} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-100">
                            <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{v.numeroVoluntario}</span>
                                {v.rol && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{v.rol}</span>}
                              </div>
                              <p className="text-xs text-slate-600 truncate">{v.nombre} {v.apellidos}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            {/* Todos los Activos */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                Personal Activo ({stats.total})
              </h4>
              <div className="space-y-1.5">
                {[...voluntarios].sort((a: any, b: any) => sortInd(a.numeroVoluntario, b.numeroVoluntario)).map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">{v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-800 text-sm">{v.numeroVoluntario}</span>
                      <p className="text-xs text-slate-600 truncate">{v.nombre} {v.apellidos}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Vehicles */}
      {showVehicles && (
        <Modal title={`Vehículos (${statsVeh.total})`} onClose={() => setShowVehicles(false)}>
          <div className="space-y-2">
            {vehiculos.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className={`p-2 rounded-lg ${v.estado === 'disponible' ? 'bg-green-100 text-green-600' : v.estado === 'en_servicio' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}><Car size={24} /></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800">{v.indicativo}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${v.estado === 'disponible' ? 'bg-green-100 text-green-700' : v.estado === 'en_servicio' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{v.estado?.toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-slate-600">{v.marca} {v.modelo}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Modal Availability */}
      {showAvailability && (
        <Modal title="Mi Disponibilidad Semanal" onClose={() => setShowAvailability(false)}>
          <AvailabilityForm onClose={() => setShowAvailability(false)} />
        </Modal>
      )}

      {/* Modal Weather */}
      {showClima && clima && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowClima(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Previsión del Tiempo</h3>
                <p className="text-slate-500 text-sm flex items-center gap-1"><MapPin size={14} /> {clima.municipio}, {clima.provincia}</p>
              </div>
              <button onClick={() => setShowClima(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            {/* Alerts Section */}
            {clima.alertas && clima.alertas.length > 0 && (
              <div className="mb-4 space-y-2">
                {clima.alertas.map((alerta: any, i: number) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border flex items-start gap-3 ${alerta.nivel === 'rojo'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : alerta.nivel === 'naranja'
                        ? 'bg-orange-50 border-orange-200 text-orange-800'
                        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }`}
                  >
                    <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">{alerta.tipo}</p>
                      <p className="text-xs opacity-80">{alerta.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center py-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl mb-4">
              <span className="text-6xl">{getWeatherIcon(clima.proximosDias?.[0]?.icono)}</span>
              <h4 className="text-4xl font-bold text-slate-800 mt-2">{clima.temperatura}°C</h4>
              <p className="text-slate-600">{clima.estadoCielo}</p>
              <div className="flex justify-center gap-6 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Droplets size={16} /> {clima.humedad}%</span>
                <span className="flex items-center gap-1"><Wind size={16} /> {clima.viento?.velocidad} km/h</span>
              </div>
            </div>
            {clima.proximosDias?.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-3">Próximos días</p>
                <div className="space-y-2">
                  {clima.proximosDias.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getWeatherIcon(d.icono)}</span>
                        <div><p className="font-bold text-slate-800">{d.dia}</p><p className="text-xs text-slate-500">{d.estado}</p></div>
                      </div>
                      <div><span className="font-bold text-orange-500">{d.tempMax}°</span><span className="text-slate-400 mx-1">/</span><span className="text-blue-500">{d.tempMin}°</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 text-xs text-slate-400 text-center">
              Fuente: {clima.fuente}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}