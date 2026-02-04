'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Car, MapPin, Sun, Wind, 
  ChevronLeft, ChevronRight, Clock, 
  CheckSquare, Square, Save, Droplets, 
  Calendar as CalendarIcon, X, AlertTriangle,
  Search, Bell, ChevronDown, Thermometer,
  CloudRain, Cloud, CloudSun, Plus, Lock, Globe
} from 'lucide-react';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Modal Component
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
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
  const [semanasDisponibles, setSemanasDisponibles] = useState<{value: string, label: string}[]>([]);
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

  // Generar próximas 4 semanas
  useEffect(() => {
    const semanas: {value: string, label: string}[] = [];
    const hoy = new Date();
    
    for (let i = 0; i < 4; i++) {
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
        className={`border p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
          noDisponible ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
        onClick={() => setNoDisponible(!noDisponible)}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
          noDisponible ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'
        }`}>
          {noDisponible && <CheckSquare size={14}/>}
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
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    turnos.includes('mañana') ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                  }`}>
                    {turnos.includes('mañana') && <CheckSquare size={14}/>}
                  </div>
                </div>
                <div 
                  className="p-3 flex justify-center cursor-pointer"
                  onClick={() => toggleTurno(key, 'tarde')}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    turnos.includes('tarde') ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 hover:border-blue-400'
                  }`}>
                    {turnos.includes('tarde') && <CheckSquare size={14}/>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div 
        className={`border p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
          noDisponible ? 'opacity-40 pointer-events-none' : ''
        } ${puedeDobleturno ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
        onClick={() => !noDisponible && setPuedeDobleturno(!puedeDobleturno)}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
          puedeDobleturno ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'
        }`}>
          {puedeDobleturno && <CheckSquare size={14}/>}
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
            <Save size={18}/> Guardar Disponibilidad
          </>
        )}
      </button>
    </form>
  );
}

// Calendar Component with Events, Guardias and Drag & Drop
function CalendarView({ eventos, guardias, onEventClick, onDayClick, onGuardiaClick, onEventDrop, userRole }: { 
  eventos: any[]; 
  guardias: any[];
  onEventClick: (evento: any) => void;
  onDayClick: (date: string) => void;
  onGuardiaClick: (date: string, turno: string, guardias: any[]) => void;
  onEventDrop: (eventoId: string, nuevaFecha: string) => void;
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
  const changeMonth = (dir: 'prev' | 'next') => setCurrentDate(new Date(year, month + (dir === 'next' ? 1 : -1), 1));
  const today = new Date();
  const isToday = (d: typeof days[0]) => d.current && d.num === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getEventosDelDia = (date: string) => {
    return eventos.filter(e => {
      const fechaEvento = new Date(e.fecha).toISOString().split('T')[0];
      return fechaEvento === date;
    });
  };

  const getGuardiasDelDia = (date: string) => {
    return guardias.filter(g => {
      const fechaGuardia = new Date(g.fecha).toISOString().split('T')[0];
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
          <span className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><CalendarIcon size={18}/></span>
          Calendario Operativo
        </h2>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Mañana</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Tarde</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Evento</span>
            <span className="flex items-center gap-1"><Lock size={10} className="text-slate-400"/> Privado</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
            <button onClick={() => changeMonth('prev')} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={18} className="text-slate-500"/></button>
            <span className="text-sm font-semibold text-slate-700 px-3 capitalize min-w-[160px] text-center">{monthName}</span>
            <button onClick={() => changeMonth('next')} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ChevronRight size={18} className="text-slate-500"/></button>
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
              className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 relative transition-colors ${
                day.current ? 'bg-white hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/50'
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
                {guardiasMañana.length > 0 && (
                  <div 
                    className="text-[9px] px-1.5 py-1 rounded bg-green-100 text-green-700 border-l-2 border-green-500 cursor-pointer hover:bg-green-200"
                    onClick={(e) => { e.stopPropagation(); onGuardiaClick(day.date, 'mañana', guardiasMañana); }}
                  >
                    <span className="font-bold">T. Mañana</span> ({guardiasMañana.length})
                  </div>
                )}
                {guardiasTarde.length > 0 && (
                  <div 
                    className="text-[9px] px-1.5 py-1 rounded bg-blue-100 text-blue-700 border-l-2 border-blue-500 cursor-pointer hover:bg-blue-200"
                    onClick={(e) => { e.stopPropagation(); onGuardiaClick(day.date, 'tarde', guardiasTarde); }}
                  >
                    <span className="font-bold">T. Tarde</span> ({guardiasTarde.length})
                  </div>
                )}
                {eventosDelDia.slice(0, 2).map((evento, i) => (
                  <div 
                    key={evento.id || i}
                    draggable={canDragEvent(evento)}
                    onDragStart={(e) => canDragEvent(evento) && handleDragStart(e, evento)}
                    onClick={(e) => { e.stopPropagation(); onEventClick(evento); }}
                    className={`text-[10px] p-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity truncate flex items-center gap-1 ${
                      canDragEvent(evento) ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                    style={{ 
                      backgroundColor: `${getEventColor(evento.tipo, evento.color)}20`,
                      borderLeft: `3px solid ${getEventColor(evento.tipo, evento.color)}`,
                      color: getEventColor(evento.tipo, evento.color)
                    }}
                  >
                    {evento.privado && <Lock size={10}/>}
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
  const [showVehicles, setShowVehicles] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showClima, setShowClima] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState<any>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showGuardiaDetail, setShowGuardiaDetail] = useState<{date: string, turno: string, guardias: any[]} | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [voluntarios, setVoluntarios] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [statsVeh, setStatsVeh] = useState({ total: 0, disponibles: 0, enServicio: 0, mantenimiento: 0 });
  const [clima, setClima] = useState<any>(null);
  const [loadingVol, setLoadingVol] = useState(true);
  const [eventos, setEventos] = useState<any[]>([]);
  const [guardias, setGuardias] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    titulo: '', descripcion: '', tipo: 'preventivo', horaInicio: '09:00', horaFin: '14:00',
    ubicacion: '', color: '#EC4899', voluntariosMin: 0, voluntariosMax: 0, visible: true, privado: false
  });

  const cargarEventos = () => {
    fetch('/api/eventos?privados=true').then(res => res.json()).then(data => setEventos(data.eventos || [])).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/voluntarios').then(res => res.json()).then(data => {
      setVoluntarios(data.voluntarios || []);
      setStats(data.stats || { total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
      setLoadingVol(false);
    }).catch(() => setLoadingVol(false));

    fetch('/api/vehiculos').then(res => res.json()).then(data => {
      setVehiculos(data.vehiculos || []);
      setStatsVeh(data.stats || { total: 0, disponibles: 0, enServicio: 0, mantenimiento: 0 });
    }).catch(() => {});

    fetch('/api/clima').then(res => res.json()).then(data => setClima(data)).catch(() => {});
    cargarEventos();
    fetch('/api/guardias').then(res => res.json()).then(data => setGuardias(data.guardias || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data?.user?.rol) setUserRole(data.user.rol);
      if (data?.user?.id) setUserId(data.user.id);
    }).catch(() => {});
  }, []);

  const handleEventClick = (evento: any) => setShowEventDetail(evento);

  const handleDayClick = (date: string) => {
    if (userRole) {
      setSelectedDate(date);
      const esAdmin = ['superadmin', 'admin', 'coordinador'].includes(userRole);
      setNewEvent({ 
        titulo: '', descripcion: '', tipo: 'preventivo', horaInicio: '09:00', horaFin: '14:00', 
        ubicacion: '', color: '#EC4899', voluntariosMin: 0, voluntariosMax: 0, 
        visible: esAdmin, privado: !esAdmin 
      });
      setShowCreateEvent(true);
    }
  };

  const handleGuardiaClick = (date: string, turno: string, guardias: any[]) => {
    setShowGuardiaDetail({ date, turno, guardias });
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
      const response = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, fecha: selectedDate })
      });
      const data = await response.json();
      if (data.success) {
        cargarEventos();
        setShowCreateEvent(false);
      } else {
        alert('Error: ' + (data.error || 'No se pudo crear el evento'));
      }
    } catch (error) {
      alert('Error al crear el evento');
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
            <div className="bg-white/20 p-2 rounded-lg"><CalendarIcon size={20}/></div>
          </div>
          <button className="mt-4 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-white/30 transition-colors">
            <CalendarIcon size={14}/> Próxima Semana
          </button>
        </div>
        
        <div onClick={() => setShowPersonnel(true)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium flex items-center gap-1">Personal Activo<ChevronDown size={14} className="text-slate-400"/></p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{loadingVol ? '...' : stats.total}<span className="text-base text-slate-400 font-normal ml-1">/ {stats.total}</span></h3>
            </div>
            <div className="bg-slate-100 group-hover:bg-orange-100 p-2.5 rounded-xl text-slate-500 group-hover:text-orange-600 transition-colors"><Users size={22}/></div>
          </div>
        </div>
        
        <div onClick={() => setShowVehicles(true)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium flex items-center gap-1">Vehículos Disp.<ChevronDown size={14} className="text-slate-400"/></p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{statsVeh.disponibles}<span className="text-base text-slate-400 font-normal ml-1">/ {statsVeh.total}</span></h3>
            </div>
            <div className="bg-slate-100 group-hover:bg-green-100 p-2.5 rounded-xl text-slate-500 group-hover:text-green-600 transition-colors"><Car size={22}/></div>
          </div>
        </div>

        <div onClick={() => setShowClima(true)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
          {clima?.alertas?.length > 0 && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><MapPin size={10}/> {clima?.municipio?.toUpperCase() || 'BORMUJOS'}</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{clima?.temperatura || '--'}°C</h3>
              <p className="text-slate-500 text-sm">{clima?.estadoCielo || 'Cargando...'}</p>
              {clima?.alertas?.length > 0 && (
                <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12}/> {clima.alertas.length} alerta{clima.alertas.length > 1 ? 's' : ''}
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
        onEventClick={handleEventClick} 
        onDayClick={handleDayClick} 
        onGuardiaClick={handleGuardiaClick}
        onEventDrop={handleEventDrop}
        userRole={userRole}
      />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <h4 className="font-bold flex items-center gap-2 mb-3 text-lg"><span className="text-2xl">✨</span> IA Operativa - Gemini</h4>
          <p className="text-sm text-indigo-100 leading-relaxed">
            <strong>Resumen:</strong> Dispositivo preventivo activo. {guardias.length} turnos programados esta semana. {eventos.length} eventos planificados.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Estado de Flota</h4>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray={`${(statsVeh.disponibles / (statsVeh.total || 1)) * 251.2} 251.2`} strokeLinecap="round"/>
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
      </div>

      {/* Modal Event Detail */}
      {showEventDetail && (
        <Modal title={showEventDetail.titulo} onClose={() => setShowEventDetail(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getEventColor(showEventDetail.tipo, showEventDetail.color) }}>{showEventDetail.tipo?.toUpperCase()}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${showEventDetail.estado === 'programado' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{showEventDetail.estado?.toUpperCase()}</span>
              {showEventDetail.privado && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1"><Lock size={12}/> PRIVADO</span>
              )}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-800">{new Date(showEventDetail.fecha).getDate()}</div>
                  <div className="text-sm text-slate-500 capitalize">{new Date(showEventDetail.fecha).toLocaleDateString('es-ES', { month: 'short' })}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-slate-700"><Clock size={16}/><span className="font-medium">{showEventDetail.horaInicio}</span>{showEventDetail.horaFin && <><span className="text-slate-400">→</span><span className="font-medium">{showEventDetail.horaFin}</span></>}</div>
                  {showEventDetail.ubicacion && <div className="flex items-center gap-2 text-slate-500 mt-1"><MapPin size={16}/><span>{showEventDetail.ubicacion}</span></div>}
                </div>
              </div>
            </div>
            {showEventDetail.descripcion && <div><h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Descripción</h4><p className="text-slate-700">{showEventDetail.descripcion}</p></div>}
          </div>
        </Modal>
      )}

      {/* Modal Create Event */}
      {showCreateEvent && (
        <Modal title={`Crear Evento - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={() => setShowCreateEvent(false)} wide>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            {esAdmin && (
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewEvent({...newEvent, privado: false, visible: true})}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    !newEvent.privado ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Globe size={16}/> Público
                </button>
                <button
                  type="button"
                  onClick={() => setNewEvent({...newEvent, privado: true, visible: false})}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    newEvent.privado ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Lock size={16}/> Privado
                </button>
              </div>
            )}
            
            {!esAdmin && (
              <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                <Lock size={16}/> Este evento será privado y solo visible para ti
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
              <input type="text" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.titulo} onChange={e => setNewEvent({...newEvent, titulo: e.target.value})} placeholder="Ej: Dispositivo Feria"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" rows={2} value={newEvent.descripcion} onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})}/>
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
                  setNewEvent({...newEvent, tipo, color});
                }}>
                  <option value="preventivo">🚨 Preventivo</option>
                  <option value="formacion">📚 Formación</option>
                  <option value="reunion">👥 Reunión</option>
                  <option value="simulacro">🎯 Simulacro</option>
                  <option value="emergencia">🆘 Emergencia</option>
                  <option value="otro">📌 Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.ubicacion} onChange={e => setNewEvent({...newEvent, ubicacion: e.target.value})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio *</label>
                <input type="time" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.horaInicio} onChange={e => setNewEvent({...newEvent, horaInicio: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Fin</label>
                <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={newEvent.horaFin} onChange={e => setNewEvent({...newEvent, horaFin: e.target.value})}/>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateEvent(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center justify-center gap-2">
                <Plus size={18}/> Crear {newEvent.privado ? 'Evento Privado' : 'Evento'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Guardia Detail */}
      {showGuardiaDetail && (
        <Modal title={`Turno ${showGuardiaDetail.turno === 'mañana' ? 'Mañana' : 'Tarde'} - ${new Date(showGuardiaDetail.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={() => setShowGuardiaDetail(null)}>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${showGuardiaDetail.turno === 'mañana' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${showGuardiaDetail.turno === 'mañana' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <span className="font-bold text-slate-700">
                  {showGuardiaDetail.turno === 'mañana' ? '08:00 - 15:00' : '15:00 - 22:00'}
                </span>
              </div>
            </div>
            
            <h4 className="text-sm font-bold text-slate-500 uppercase">Personal Asignado ({showGuardiaDetail.guardias.length})</h4>
            
            <div className="space-y-2">
              {showGuardiaDetail.guardias.map((g, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    {g.usuario?.nombre?.charAt(0)}{g.usuario?.apellidos?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{g.usuario?.numeroVoluntario}</span>
                      {i === 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">RESPONSABLE</span>}
                    </div>
                    <p className="text-sm text-slate-600">{g.usuario?.nombre} {g.usuario?.apellidos}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-bold ${g.estado === 'programada' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {g.estado?.toUpperCase() || 'PROGRAMADA'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Personnel */}
      {showPersonnel && (
        <Modal title={`Personal Activo (${stats.total})`} onClose={() => setShowPersonnel(false)}>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-50 p-2 rounded-lg"><div className="text-xl font-bold text-green-600">{stats.responsablesTurno}</div><div className="text-[10px] text-green-700">Resp. Turno</div></div>
            <div className="bg-blue-50 p-2 rounded-lg"><div className="text-xl font-bold text-blue-600">{stats.conCarnet}</div><div className="text-[10px] text-blue-700">Con Carnet</div></div>
            <div className="bg-purple-50 p-2 rounded-lg"><div className="text-xl font-bold text-purple-600">{stats.experienciaAlta}</div><div className="text-[10px] text-purple-700">Exp. Alta</div></div>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {voluntarios.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">{v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{v.numeroVoluntario}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${v.experiencia === 'ALTA' ? 'bg-green-100 text-green-700' : v.experiencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{v.experiencia}</span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{v.nombre} {v.apellidos}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Modal Vehicles */}
      {showVehicles && (
        <Modal title={`Vehículos (${statsVeh.total})`} onClose={() => setShowVehicles(false)}>
          <div className="space-y-2">
            {vehiculos.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className={`p-2 rounded-lg ${v.estado === 'disponible' ? 'bg-green-100 text-green-600' : v.estado === 'en_servicio' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}><Car size={24}/></div>
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
                <p className="text-slate-500 text-sm flex items-center gap-1"><MapPin size={14}/> {clima.municipio}, {clima.provincia}</p>
              </div>
              <button onClick={() => setShowClima(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            {/* Alerts Section */}
            {clima.alertas && clima.alertas.length > 0 && (
              <div className="mb-4 space-y-2">
                {clima.alertas.map((alerta: any, i: number) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg border flex items-start gap-3 ${
                      alerta.nivel === 'rojo' 
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
                <span className="flex items-center gap-1"><Droplets size={16}/> {clima.humedad}%</span>
                <span className="flex items-center gap-1"><Wind size={16}/> {clima.viento?.velocidad} km/h</span>
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