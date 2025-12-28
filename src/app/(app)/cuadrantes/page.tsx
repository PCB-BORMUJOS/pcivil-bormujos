'use client';

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, AlertCircle, CheckCircle2, User, X, Trash2 } from 'lucide-react';

// Tipos
enum ShiftType { MORNING = 'Mañana', AFTERNOON = 'Tarde', EXTRA = 'Extra' }

interface Shift {
  id: string;
  date: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  assignments: { volunteerId: string; role: string }[];
  isComplete: boolean;
}

// Mock volunteers
const MOCK_VOLUNTEERS = [
  { id: 'j44', name: 'EMILIO', surname: 'SIMÓN', badgeNumber: 'J-44', canLead: true, canDrive: true },
  { id: 's01', name: 'TANYA', surname: 'GONZÁLEZ', badgeNumber: 'S-01', canLead: true, canDrive: true },
  { id: 'b29', name: 'JOSE CARLOS', surname: 'BAILÓN', badgeNumber: 'B-29', canLead: true, canDrive: true },
  { id: 's02', name: 'ANA MARÍA', surname: 'FERNÁNDEZ', badgeNumber: 'S-02', canLead: true, canDrive: false },
];

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

  // Generar turnos para la semana si no existen
  React.useEffect(() => {
    const weekDays = getWeekDays(currentWeekStart);
    const existingDates = shifts.map(s => s.date);
    const newShifts: Shift[] = [];

    weekDays.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      if (!existingDates.includes(dateStr)) {
        newShifts.push({
          id: `${dateStr}-m`,
          date: dateStr,
          type: ShiftType.MORNING,
          startTime: '09:00',
          endTime: '14:00',
          assignments: [],
          isComplete: false
        });
        newShifts.push({
          id: `${dateStr}-a`,
          date: dateStr,
          type: ShiftType.AFTERNOON,
          startTime: '17:00',
          endTime: '22:00',
          assignments: [],
          isComplete: false
        });
      }
    });

    if (newShifts.length > 0) {
      setShifts(prev => [...prev, ...newShifts]);
    }
  }, [currentWeekStart]);

  const changeWeek = (dir: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (dir === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const weekDays = getWeekDays(currentWeekStart);
  const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  const handleAssignment = (shiftId: string, volunteerId: string, role: string) => {
    setShifts(prev => prev.map(s => {
      if (s.id !== shiftId) return s;
      const existing = s.assignments.find(a => a.volunteerId === volunteerId);
      if (existing) return s;
      const newAssignments = [...s.assignments, { volunteerId, role }];
      const isComplete = newAssignments.filter(a => a.role === 'RESPONSABLE').length >= 1 &&
                         newAssignments.filter(a => a.role === 'CONDUCTOR').length >= 2;
      return { ...s, assignments: newAssignments, isComplete };
    }));
    
    // Actualizar selectedShift si es el que estamos editando
    if (selectedShift?.id === shiftId) {
      setSelectedShift(prev => {
        if (!prev) return null;
        const newAssignments = [...prev.assignments, { volunteerId, role }];
        const isComplete = newAssignments.filter(a => a.role === 'RESPONSABLE').length >= 1 &&
                           newAssignments.filter(a => a.role === 'CONDUCTOR').length >= 2;
        return { ...prev, assignments: newAssignments, isComplete };
      });
    }
  };

  const handleRemoveAssignment = (shiftId: string, volunteerId: string) => {
    setShifts(prev => prev.map(s => {
      if (s.id !== shiftId) return s;
      const newAssignments = s.assignments.filter(a => a.volunteerId !== volunteerId);
      return { ...s, assignments: newAssignments, isComplete: false };
    }));
    
    if (selectedShift?.id === shiftId) {
      setSelectedShift(prev => {
        if (!prev) return null;
        return { ...prev, assignments: prev.assignments.filter(a => a.volunteerId !== volunteerId), isComplete: false };
      });
    }
  };

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
            onClick={() => setShowExtraModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus size={16}/> Turno Extra
          </button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-slate-100 rounded">
              <ChevronLeft size={18}/>
            </button>
            <span className="text-sm font-medium px-2 min-w-[200px] text-center">
              {formatDateRange(currentWeekStart)}
            </span>
            <button onClick={() => changeWeek('next')} className="p-2 hover:bg-slate-100 rounded">
              <ChevronRight size={18}/>
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
        <div className="grid grid-cols-7">
          {weekDays.map((day, dayIdx) => {
            const dateStr = day.toISOString().split('T')[0];
            const dayShifts = shifts.filter(s => s.date === dateStr);

            return (
              <div key={dayIdx} className="border-r border-slate-100 last:border-r-0 min-h-[200px] p-2">
                {dayShifts.map(shift => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer mb-2 transition-all hover:shadow-md ${
                      shift.type === ShiftType.EXTRA ? 'bg-purple-50 border-purple-200' :
                      shift.isComplete ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 border-l-4 border-l-orange-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-700">{shift.startTime} - {shift.endTime}</span>
                      {shift.isComplete ? <CheckCircle2 size={12} className="text-green-600"/> : <AlertCircle size={12} className="text-orange-400"/>}
                    </div>
                    <div className="text-slate-500">{shift.assignments.length} Asignados</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedShift(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {selectedShift.type} - {new Date(selectedShift.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-slate-400 text-sm">{selectedShift.startTime} - {selectedShift.endTime}</p>
              </div>
              <button onClick={() => setSelectedShift(null)} className="text-slate-400 hover:text-white"><X size={24}/></button>
            </div>

            {/* Modal Content */}
            <div className="flex h-[500px]">
              {/* Left: Available Personnel */}
              <div className="w-1/2 p-4 border-r border-slate-200 overflow-y-auto bg-slate-50">
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Personal Disponible</h4>
                <div className="space-y-2">
                  {MOCK_VOLUNTEERS.filter(v => !selectedShift.assignments.find(a => a.volunteerId === v.id)).map(vol => (
                    <div key={vol.id} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{vol.badgeNumber.split('-')[0]}</div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">{vol.badgeNumber}</div>
                          <div className="text-xs text-slate-500">{vol.name} {vol.surname}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {vol.canLead && (
                          <button onClick={() => handleAssignment(selectedShift.id, vol.id, 'RESPONSABLE')} className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold hover:bg-blue-200">RESP</button>
                        )}
                        {vol.canDrive && (
                          <button onClick={() => handleAssignment(selectedShift.id, vol.id, 'CONDUCTOR')} className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold hover:bg-green-200">COND</button>
                        )}
                        <button onClick={() => handleAssignment(selectedShift.id, vol.id, 'CECOPAL')} className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold hover:bg-orange-200">CECO</button>
                        <button onClick={() => handleAssignment(selectedShift.id, vol.id, 'APOYO')} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold hover:bg-slate-200">APOYO</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Current Assignments */}
              <div className="w-1/2 p-4 overflow-y-auto">
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase flex justify-between">
                  Equipo Asignado
                  <span className={`text-xs px-2 py-0.5 rounded ${selectedShift.isComplete ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedShift.isComplete ? 'COMPLETO' : 'INCOMPLETO'}
                  </span>
                </h4>

                {/* Requirements */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`text-center p-2 rounded border ${selectedShift.assignments.filter(a => a.role === 'RESPONSABLE').length >= 1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Responsable</div>
                    <div className="text-lg font-bold">{selectedShift.assignments.filter(a => a.role === 'RESPONSABLE').length}/1</div>
                  </div>
                  <div className={`text-center p-2 rounded border ${selectedShift.assignments.filter(a => a.role === 'CONDUCTOR').length >= 2 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Conductores</div>
                    <div className="text-lg font-bold">{selectedShift.assignments.filter(a => a.role === 'CONDUCTOR').length}/2</div>
                  </div>
                  <div className={`text-center p-2 rounded border ${selectedShift.assignments.filter(a => a.role === 'CECOPAL').length >= 1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Cecopal</div>
                    <div className="text-lg font-bold">{selectedShift.assignments.filter(a => a.role === 'CECOPAL').length}/1</div>
                  </div>
                </div>

                {/* Assigned List */}
                <div className="space-y-2">
                  {selectedShift.assignments.map((assignment, idx) => {
                    const vol = MOCK_VOLUNTEERS.find(v => v.id === assignment.volunteerId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded w-20 text-center ${
                            assignment.role === 'RESPONSABLE' ? 'bg-blue-100 text-blue-700' :
                            assignment.role === 'CONDUCTOR' ? 'bg-green-100 text-green-700' :
                            assignment.role === 'CECOPAL' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {assignment.role}
                          </span>
                          <span className="font-bold text-sm text-slate-800">{vol?.badgeNumber} - {vol?.name}</span>
                        </div>
                        <button onClick={() => handleRemoveAssignment(selectedShift.id, assignment.volunteerId)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    );
                  })}
                  {selectedShift.assignments.length === 0 && (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                      Usa los botones de la izquierda para asignar personal
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra Shift Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crear Turno Extraordinario</h3>
            <form onSubmit={(e) => { e.preventDefault(); setShowExtraModal(false); alert('Turno creado'); }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Fecha</label>
                <input type="date" required className="w-full border p-2 rounded" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Inicio</label>
                  <input type="time" required className="w-full border p-2 rounded" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Fin</label>
                  <input type="time" required className="w-full border p-2 rounded" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Descripción / Evento</label>
                <input type="text" required placeholder="Ej: Refuerzo Feria" className="w-full border p-2 rounded" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowExtraModal(false)} className="flex-1 py-2 bg-slate-100 rounded text-slate-600 font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-purple-600 rounded text-white font-bold hover:bg-purple-700">Crear Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
