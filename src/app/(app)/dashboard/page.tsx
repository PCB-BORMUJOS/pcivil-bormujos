'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Car, MapPin, Sun, Wind, 
  ChevronLeft, ChevronRight, Clock, 
  CheckSquare, Square, Save, Droplets, 
  Calendar as CalendarIcon, X, AlertTriangle,
  Package, FileText
} from 'lucide-react';

// Datos Mock
const MOCK_VOLUNTEERS = [
  { id: 'j44', name: 'EMILIO', surname: 'SIMÓN GÓMEZ', badgeNumber: 'J-44', rank: 'Jefe de Servicio', status: 'Activo', avatarUrl: 'https://ui-avatars.com/api/?name=EMILIO+SIMON&background=ea580c&color=fff' },
  { id: 's01', name: 'TANYA', surname: 'GONZÁLEZ MEDINA', badgeNumber: 'S-01', rank: 'Coordinador Socorrismo', status: 'Activo', avatarUrl: 'https://ui-avatars.com/api/?name=TANYA+GONZALEZ&background=0ea5e9&color=fff' },
  { id: 'b29', name: 'JOSE CARLOS', surname: 'BAILÓN LÓPEZ', badgeNumber: 'B-29', rank: 'Responsable Logística', status: 'Activo', avatarUrl: 'https://ui-avatars.com/api/?name=JOSE+BAILON&background=22c55e&color=fff' },
  { id: 's02', name: 'ANA MARÍA', surname: 'FERNÁNDEZ PÉREZ', badgeNumber: 'S-02', rank: 'Voluntario', status: 'Activo', avatarUrl: 'https://ui-avatars.com/api/?name=ANA+FERNANDEZ&background=8b5cf6&color=fff' },
];

const MOCK_VEHICLES = [
  { id: 'veh1', code: 'A-01', model: 'Mercedes Sprinter', type: 'Ambulancia', status: 'Disponible' },
  { id: 'veh2', code: 'V-02', model: 'Toyota Land Cruiser', type: 'VIR', status: 'En Servicio' },
];

const MOCK_EVENTS = [
  { id: 'e1', title: 'Feria de Bormujos', description: 'Dispositivo preventivo', date: new Date().toISOString().split('T')[0], startTime: '16:00', endTime: '22:00', location: 'Recinto Ferial', type: 'Preventivo' },
];

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Modal Component
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

// Calendar Component
function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="bg-orange-100 p-1 rounded text-orange-600"><Clock size={18}/></span>
          Calendario Operativo
        </h2>
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
          <button onClick={() => changeMonth('prev')} className="p-1 hover:bg-white rounded"><ChevronLeft size={18} className="text-slate-500"/></button>
          <span className="text-sm font-medium text-slate-700 px-2 capitalize min-w-[140px] text-center">{monthName}</span>
          <button onClick={() => changeMonth('next')} className="p-1 hover:bg-white rounded"><ChevronRight size={18} className="text-slate-500"/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {daysOfWeek.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, idx) => {
          const event = day.current ? MOCK_EVENTS.find(e => e.date === day.date) : null;
          return (
            <div key={idx} className={`min-h-[70px] border-b border-r border-slate-50 p-1 relative ${day.current ? 'bg-white' : 'bg-slate-50/50'}`}>
              {day.current && (
                <span className={`text-xs font-medium absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>
                  {day.num}
                </span>
              )}
              {event && (
                <div className="mt-6 text-[10px] p-1 rounded bg-blue-100 text-blue-800 border border-blue-200 truncate">
                  <div className="font-bold">{event.startTime}</div>
                  <div className="truncate">{event.title}</div>
                </div>
              )}
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
  const [voluntarios, setVoluntarios] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
  const [loadingVol, setLoadingVol] = useState(true);

  useEffect(() => {
    fetch('/api/voluntarios')
      .then(res => res.json())
      .then(data => {
        setVoluntarios(data.voluntarios || []);
        setStats(data.stats || { total: 0, responsablesTurno: 0, conCarnet: 0, experienciaAlta: 0 });
        setLoadingVol(false);
      })
      .catch(() => setLoadingVol(false));
  }, []);
  const [availForm, setAvailForm] = useState({ isNotAvailable: false, details: {} as Record<string, string[]>, desiredShifts: 1, canDouble: false });

  const activeVolunteers = MOCK_VOLUNTEERS.filter(v => v.status === 'Activo');
  const availableVehicles = MOCK_VEHICLES.filter(v => v.status === 'Disponible');

  const toggleAvail = (day: string, shift: string) => {
    const current = availForm.details[day] || [];
    const updated = current.includes(shift) ? current.filter(s => s !== shift) : [...current, shift];
    setAvailForm({ ...availForm, details: { ...availForm.details, [day]: updated } });
  };

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => setShowAvailability(true)} className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]">
          <p className="text-orange-100 text-xs font-bold uppercase tracking-wider">Acción Requerida</p>
          <h3 className="text-xl font-bold mt-1">Enviar Disponibilidad</h3>
          <button className="mt-4 bg-white/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <CalendarIcon size={16}/> Próxima Semana
          </button>
        </div>
        
        <div onClick={() => setShowPersonnel(true)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group">
          <p className="text-slate-500 text-xs font-medium">Personal Activo</p>
         <h3 className="text-3xl font-bold text-slate-800 mt-1">{loadingVol ? '...' : stats.total}<span className="text-lg text-slate-400 font-normal">/{stats.total}</span></h3>
          <div className="mt-2 bg-slate-100 group-hover:bg-orange-100 p-2 rounded-lg w-fit text-slate-500 group-hover:text-orange-600 transition-colors"><Users size={20}/></div>
        </div>
        
        <div onClick={() => setShowVehicles(true)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group">
          <p className="text-slate-500 text-xs font-medium">Vehículos Disp.</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-1">{availableVehicles.length}<span className="text-lg text-slate-400 font-normal">/{MOCK_VEHICLES.length}</span></h3>
          <div className="mt-2 bg-slate-100 group-hover:bg-green-100 p-2 rounded-lg w-fit text-slate-500 group-hover:text-green-600 transition-colors"><Car size={20}/></div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[500px]">
          <CalendarView />
        </div>
        
        <div className="space-y-6">
          {/* Weather */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={12}/> Bormujos (Sevilla)</p>
                <h3 className="text-4xl font-bold text-slate-800 mt-1">28°C</h3>
                <p className="text-slate-600 text-sm">Cielos Despejados</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl text-yellow-600"><Sun size={32}/></div>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
              <span className="flex items-center gap-1"><Droplets size={14}/> 45%</span>
              <span className="flex items-center gap-1"><Wind size={14}/> 15 km/h NO</span>
              <span>☀️ UV: Alto (7)</span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
            <h4 className="font-bold flex items-center gap-2 mb-3">✨ IA Operativa - Gemini</h4>
            <p className="text-sm text-indigo-100 leading-relaxed">
              <strong>**Resumen de Jornada:**</strong> Despliegue del dispositivo preventivo para la Feria de Bormujos (Turno Tarde, 16:00h). 
              Sin incidencias de relevancia reportadas al inicio del servicio.
            </p>
          </div>

          {/* Fleet Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">Estado de Flota</h4>
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full border-8 border-green-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{availableVehicles.length}/{MOCK_VEHICLES.length}</span>
              </div>
            </div>
            <div className="flex justify-around text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Disponible</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> En Servicio</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Mant.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPersonnel && (
        <Modal title={`Personal Activo (${stats.total} voluntarios)`} onClose={() => setShowPersonnel(false)}>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-50 p-2 rounded-lg">
              <div className="text-xl font-bold text-green-600">{stats.responsablesTurno}</div>
              <div className="text-[10px] text-green-700">Resp. Turno</div>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{stats.conCarnet}</div>
              <div className="text-[10px] text-blue-700">Con Carnet</div>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{stats.experienciaAlta}</div>
              <div className="text-[10px] text-purple-700">Exp. Alta</div>
            </div>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loadingVol ? (
              <p className="text-center text-slate-500">Cargando...</p>
            ) : (
              voluntarios.map(v => (
                <div key={v.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    {v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{v.numeroVoluntario}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        v.experiencia === 'ALTA' ? 'bg-green-100 text-green-700' :
                        v.experiencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{v.experiencia}</span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{v.nombre} {v.apellidos}</p>
                    <div className="flex gap-1 mt-1">
                     {v.responsableTurno && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Users size={10}/> Resp.</span>}
{v.carnetConducir && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Car size={10}/> Carnet</span>} 
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {showVehicles && (
        <Modal title="Vehículos Disponibles" onClose={() => setShowVehicles(false)}>
          <div className="space-y-3">
            {availableVehicles.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="bg-white p-2 rounded border border-slate-100 text-slate-600"><Car size={20}/></div>
                <div><h4 className="font-bold text-slate-800">{v.code}</h4><p className="text-xs text-slate-500">{v.model} - {v.type}</p></div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showAvailability && (
        <Modal title="Mi Disponibilidad Semanal" onClose={() => setShowAvailability(false)}>
          <form onSubmit={e => { e.preventDefault(); alert('Disponibilidad guardada'); setShowAvailability(false); }} className="space-y-4">
            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs">Por favor, indique sus preferencias detalladas por día y franja horaria.</div>
            
            <div className="border border-red-100 bg-red-50 p-3 rounded-lg flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" checked={availForm.isNotAvailable} onChange={e => setAvailForm({...availForm, isNotAvailable: e.target.checked})}/>
              <label className="text-sm font-bold text-red-700">MARCAR COMO NO DISPONIBLE</label>
            </div>

            {!availForm.isNotAvailable && (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 bg-slate-100 text-xs font-bold text-slate-600 border-b border-slate-200">
                    <div className="p-2">Día</div><div className="p-2 text-center border-l border-slate-200">Mañana</div><div className="p-2 text-center border-l border-slate-200">Tarde</div>
                  </div>
                  {DAYS_OF_WEEK.map(day => {
                    const shifts = availForm.details[day] || [];
                    return (
                      <div key={day} className="grid grid-cols-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <div className="p-2 text-xs font-medium text-slate-700">{day}</div>
                        <div className="border-l border-slate-200 p-1 flex justify-center cursor-pointer" onClick={() => toggleAvail(day, 'Mañana')}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${shifts.includes('Mañana') ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300'}`}>
                            {shifts.includes('Mañana') && <CheckSquare size={14}/>}
                          </div>
                        </div>
                        <div className="border-l border-slate-200 p-1 flex justify-center cursor-pointer" onClick={() => toggleAvail(day, 'Tarde')}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${shifts.includes('Tarde') ? 'bg-blue-500 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                            {shifts.includes('Tarde') && <CheckSquare size={14}/>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-2 cursor-pointer border p-2 rounded hover:bg-slate-50" onClick={() => setAvailForm({...availForm, canDouble: !availForm.canDouble})}>
                  {availForm.canDouble ? <CheckSquare className="text-blue-600" size={18}/> : <Square className="text-slate-400" size={18}/>}
                  <span className="text-sm font-bold text-slate-700">Disponible para Doblar Turno (M+T)</span>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Turnos Deseados (Semanal)</label>
                  <input type="number" min="1" max="14" className="w-full border border-slate-300 rounded p-2 text-sm" value={availForm.desiredShifts} onChange={e => setAvailForm({...availForm, desiredShifts: parseInt(e.target.value)})}/>
                </div>
              </>
            )}
            
            <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 flex justify-center items-center gap-2">
              <Save size={18}/> Guardar Disponibilidad
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
