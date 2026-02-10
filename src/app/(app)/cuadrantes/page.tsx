'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, AlertCircle, CheckCircle2, User, X, Trash2, Sparkles, Download } from 'lucide-react';

// Tipos
enum ShiftType { MORNING = 'Mañana', AFTERNOON = 'Tarde', EXTRA = 'Extra' }

interface Shift {
  id?: string;
  date: string;
  type: ShiftType;
  turno: 'mañana' | 'tarde';
  startTime: string;
  endTime: string;
  assignment?: { volunteerId: string; nombre: string; numeroVoluntario: string };
  isComplete: boolean;
}

interface Voluntario {
  id: string;
  nombre: string;
  apellidos: string;
  numeroVoluntario: string;
  responsableTurno?: boolean;
  carnetConducir?: boolean;
}

interface Sugerencia {
  fecha: string;
  turno: string;
  usuarioId: string;
  usuario: {
    nombre: string;
    apellidos: string;
    numeroVoluntario: string;
  };
}

// Helpers
const getNextMonday = (date: Date) => {
  const d = new Date(date);
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d;
};

const getWeekDays = (startDate: Date) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const formatDateRange = (start: Date) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `Del ${start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} al ${end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

export default function CuadrantesPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getNextMonday(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [voluntariosDisponibles, setVoluntariosDisponibles] = useState<Voluntario[]>([]);
  const [turnosAsignados, setTurnosAsignados] = useState<Record<string, number>>({});
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [loadingGuardias, setLoadingGuardias] = useState(false);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);

  // Cargar voluntarios
  useEffect(() => {
    fetch('/api/voluntarios')
      .then(res => res.json())
      .then(data => setVoluntarios(data.voluntarios || []))
      .catch(err => console.error('Error cargando voluntarios:', err));
  }, []);

  // Cargar guardias de la semana
  useEffect(() => {
    cargarGuardias();
  }, [currentWeekStart]);

  const cargarGuardias = async () => {
    setLoadingGuardias(true);
    try {
      const semanaStr = currentWeekStart.toISOString().split('T')[0];
      const res = await fetch(`/api/cuadrantes?semana=${semanaStr}`);
      const data = await res.json();

      // Generar estructura de turnos vacía para toda la semana
      const weekDays = getWeekDays(currentWeekStart);
      const newShifts: Shift[] = [];

      weekDays.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];

        // Buscar guardias existentes para este día
        const guardiasMañana = data.guardias?.filter((g: any) =>
          new Date(g.fecha).toISOString().split('T')[0] === dateStr && g.turno === 'mañana'
        ) || [];

        const guardiasTarde = data.guardias?.filter((g: any) =>
          new Date(g.fecha).toISOString().split('T')[0] === dateStr && g.turno === 'tarde'
        ) || [];

        // Turno mañana
        newShifts.push({
          id: guardiasMañana[0]?.id,
          date: dateStr,
          type: ShiftType.MORNING,
          turno: 'mañana',
          startTime: '09:00',
          endTime: '14:00',
          assignment: guardiasMañana[0] ? {
            volunteerId: guardiasMañana[0].usuario.id,
            nombre: `${guardiasMañana[0].usuario.nombre} ${guardiasMañana[0].usuario.apellidos}`,
            numeroVoluntario: guardiasMañana[0].usuario.numeroVoluntario
          } : undefined,
          isComplete: guardiasMañana.length > 0
        });

        // Turno tarde
        newShifts.push({
          id: guardiasTarde[0]?.id,
          date: dateStr,
          type: ShiftType.AFTERNOON,
          turno: 'tarde',
          startTime: '17:00',
          endTime: '22:00',
          assignment: guardiasTarde[0] ? {
            volunteerId: guardiasTarde[0].usuario.id,
            nombre: `${guardiasTarde[0].usuario.nombre} ${guardiasTarde[0].usuario.apellidos}`,
            numeroVoluntario: guardiasTarde[0].usuario.numeroVoluntario
          } : undefined,
          isComplete: guardiasTarde.length > 0
        });
      });

      setShifts(newShifts);
    } catch (error) {
      console.error('Error cargando guardias:', error);
    } finally {
      setLoadingGuardias(false);
    }
  };

  const changeWeek = (dir: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (dir === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  // Cargar voluntarios disponibles para un turno específico
  const cargarDisponiblesPorTurno = async (fecha: string, turno: 'mañana' | 'tarde') => {
    setLoadingDisponibles(true);
    try {
      // Llamar a la API de disponibilidad por turno
      const res = await fetch(`/api/disponibilidad/por-turno?fecha=${fecha}&turno=${turno}`);
      const data = await res.json();

      if (data.voluntarios) {
        setVoluntariosDisponibles(data.voluntarios);
      } else {
        setVoluntariosDisponibles([]);
      }

      // Calcular turnos asignados en la semana para cada voluntario
      const conteo: Record<string, number> = {};
      shifts.forEach(shift => {
        if (shift.assignment) {
          const volId = shift.assignment.volunteerId;
          conteo[volId] = (conteo[volId] || 0) + 1;
        }
      });
      setTurnosAsignados(conteo);
    } catch (error) {
      console.error('Error cargando disponibles:', error);
      setVoluntariosDisponibles([]);
    } finally {
      setLoadingDisponibles(false);
    }
  };

  const handleAsignarVoluntario = async (shift: Shift, volunteerId: string) => {
    try {
      // Si ya existe una guardia, eliminarla primero
      if (shift.id) {
        await fetch(`/api/cuadrantes?id=${shift.id}`, { method: 'DELETE' });
      }

      // Crear nueva guardia
      const res = await fetch('/api/cuadrantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: shift.date,
          turno: shift.turno,
          usuarioId: volunteerId,
          tipo: 'programada'
        })
      });

      if (res.ok) {
        await cargarGuardias();
        // NO cerrar modal para permitir múltiples asignaciones
        // setSelectedShift(null);
      } else {
        alert('Error al asignar voluntario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al asignar voluntario');
    }
  };

  const handleEliminarAsignacion = async (shiftId: string) => {
    if (!confirm('¿Eliminar esta asignación?')) return;

    try {
      const res = await fetch(`/api/cuadrantes?id=${shiftId}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarGuardias();
        setSelectedShift(null);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar asignación');
    }
  };

  const handleGenerarAutomatico = async () => {
    setLoadingSugerencias(true);
    try {
      const semanaStr = currentWeekStart.toISOString().split('T')[0];
      const res = await fetch('/api/cuadrantes/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semanaInicio: semanaStr })
      });

      const data = await res.json();

      if (data.sugerencias && data.sugerencias.length > 0) {
        setSugerencias(data.sugerencias);
        setShowSugerencias(true);
      } else {
        alert('No hay disponibilidades registradas para esta semana. Pide a los voluntarios que registren su disponibilidad en el Dashboard.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar cuadrante automático');
    } finally {
      setLoadingSugerencias(false);
    }
  };

  const handleAplicarSugerencias = async () => {
    try {
      // Crear todas las guardias sugeridas
      for (const sug of sugerencias) {
        await fetch('/api/cuadrantes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: sug.fecha,
            turno: sug.turno,
            usuarioId: sug.usuarioId,
            tipo: 'programada'
          })
        });
      }

      alert('✅ Cuadrante generado correctamente');
      setShowSugerencias(false);
      await cargarGuardias();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al aplicar sugerencias');
    }
  };

  const weekDays = getWeekDays(currentWeekStart);
  const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-orange-600" /> Planificador de Turnos
          </h1>
          <p className="text-slate-500 text-sm">Gestión operativa de servicios.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerarAutomatico}
            disabled={loadingSugerencias}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={16} /> {loadingSugerencias ? 'Generando...' : 'Generar desde Disponibilidad'}
          </button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-slate-100 rounded">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium px-2 min-w-[200px] text-center">
              {formatDateRange(currentWeekStart)}
            </span>
            <button onClick={() => changeWeek('next')} className="p-2 hover:bg-slate-100 rounded">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {weekDays.map((day, idx) => (
            <div key={idx} className="p-4 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-xs font-bold text-slate-500 uppercase">{dayNames[idx]}</div>
              <div className="text-2xl font-bold text-slate-800">{day.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Shifts */}
        {loadingGuardias ? (
          <div className="text-center py-12 text-slate-500">Cargando guardias...</div>
        ) : (
          <div className="grid grid-cols-7">
            {weekDays.map((day, dayIdx) => {
              const dateStr = day.toISOString().split('T')[0];
              const dayShifts = shifts.filter(s => s.date === dateStr);

              return (
                <div key={dayIdx} className="border-r border-slate-100 last:border-r-0 min-h-[200px] p-2">
                  {dayShifts.map(shift => (
                    <div
                      key={`${shift.date}-${shift.turno}`}
                      onClick={() => {
                        cargarDisponiblesPorTurno(shift.date, shift.turno);
                        setSelectedShift(shift);
                      }}
                      className={`p-2 rounded-lg border text-xs cursor-pointer mb-2 transition-all hover:shadow-md ${shift.isComplete ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 border-l-4 border-l-orange-400'
                        }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700">{shift.startTime} - {shift.endTime}</span>
                        {shift.isComplete ? <CheckCircle2 size={12} className="text-green-600" /> : <AlertCircle size={12} className="text-orange-400" />}
                      </div>
                      {shift.assignment ? (
                        <div className="text-slate-700 font-medium">{shift.assignment.numeroVoluntario}</div>
                      ) : (
                        <div className="text-slate-400">Sin asignar</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de asignación */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedShift(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {selectedShift.type} - {new Date(selectedShift.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-slate-400 text-sm">{selectedShift.startTime} - {selectedShift.endTime}</p>
              </div>
              <button onClick={() => setSelectedShift(null)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="p-6">
              {selectedShift.assignment ? (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-green-600 font-bold">ASIGNADO</div>
                      <div className="text-lg font-bold text-slate-800">{selectedShift.assignment.numeroVoluntario} - {selectedShift.assignment.nombre}</div>
                    </div>
                    <button
                      onClick={() => selectedShift.id && handleEliminarAsignacion(selectedShift.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <p className="text-orange-700 font-medium">Este turno no tiene asignación. Selecciona un voluntario.</p>
                </div>
              )}

              <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase flex items-center gap-2">
                Voluntarios Disponibles
                {loadingDisponibles && <span className="text-xs text-orange-600">(Cargando...)</span>}
                {!loadingDisponibles && <span className="text-xs text-green-600">({voluntariosDisponibles.length} disponibles)</span>}
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {voluntariosDisponibles.length === 0 && !loadingDisponibles ? (
                  <div className="p-6 text-center text-slate-400">
                    <p className="text-sm">No hay voluntarios disponibles para este turno</p>
                    <p className="text-xs mt-2">Los voluntarios deben registrar su disponibilidad primero</p>
                  </div>
                ) : (
                  voluntariosDisponibles.map(vol => {
                    const turnosYaAsignados = turnosAsignados[vol.id] || 0;
                    return (
                      <div key={vol.id} className="bg-green-50 p-3 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-sm text-slate-800">{vol.numeroVoluntario}</div>
                              {vol.responsableTurno && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-bold">🎯 Responsable</span>
                              )}
                              {vol.carnetConducir && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-bold">🚗</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{vol.nombre} {vol.apellidos}</div>
                            {turnosYaAsignados > 0 && (
                              <div className="text-xs text-orange-600 mt-1">
                                Ya tiene {turnosYaAsignados} turno{turnosYaAsignados !== 1 ? 's' : ''} esta semana
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAsignarVoluntario(selectedShift, vol.id)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600"
                          >
                            Asignar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sugerencias */}
      {showSugerencias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles size={20} /> Cuadrante Generado Automáticamente
                </h3>
                <p className="text-purple-200 text-sm">Revisa las asignaciones antes de aplicar</p>
              </div>
              <button onClick={() => setShowSugerencias(false)} className="text-purple-200 hover:text-white"><X size={24} /></button>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map((dia, idx) => (
                  <div key={idx} className="text-center text-xs font-bold text-slate-500">{dia}</div>
                ))}
              </div>

              {weekDays.map((day, dayIdx) => {
                const dateStr = day.toISOString().split('T')[0];
                const sugsDia = sugerencias.filter(s => s.fecha === dateStr);

                return (
                  <div key={dayIdx} className="grid grid-cols-7 gap-2 mb-2">
                    {dayIdx === 0 && <div className="col-span-7 text-sm font-bold text-slate-700 mt-2">Turnos Propuestos</div>}
                    <div className="col-span-7 grid grid-cols-7 gap-2">
                      {weekDays.map((d, i) => {
                        const ds = d.toISOString().split('T')[0];
                        const s = sugerencias.filter(sg => sg.fecha === ds);
                        return (
                          <div key={i} className="space-y-1">
                            {s.map((sug, idx) => (
                              <div key={idx} className="bg-purple-50 border border-purple-200 rounded p-2 text-xs">
                                <div className="font-bold text-purple-700">{sug.turno === 'mañana' ? '🌅 M' : '🌆 T'}</div>
                                <div className="text-slate-700 font-medium">{sug.usuario.numeroVoluntario}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowSugerencias(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-lg text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAplicarSugerencias}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-bold hover:from-purple-700 hover:to-indigo-700"
                >
                  ✅ Aplicar Cuadrante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
