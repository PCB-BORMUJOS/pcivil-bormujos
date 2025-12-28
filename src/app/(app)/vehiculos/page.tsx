'use client';

import React, { useState } from 'react';
import { Truck, MapPin, Navigation, Compass, Car, Bike, Cross, X, FileText, Wrench, AlertTriangle, Bell } from 'lucide-react';

// Mock vehicles
const MOCK_VEHICLES = [
  { id: 'veh1', code: 'A-01', model: 'Mercedes Sprinter', plate: '1234-KBC', type: 'Ambulancia', status: 'Disponible', lastCheck: '2023-10-20', location: { lat: 37.371, lng: -6.072, lastUpdate: '10 min' } },
  { id: 'veh2', code: 'V-02', model: 'Toyota Land Cruiser', plate: '5678-XYZ', type: 'VIR', status: 'En Servicio', lastCheck: '2023-11-15', location: { lat: 37.373, lng: -6.068, lastUpdate: '5 min' } },
  { id: 'veh3', code: 'L-01', model: 'Ford Transit', plate: '9012-ABC', type: 'Logística', status: 'Mantenimiento', lastCheck: '2023-09-01', location: null },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Disponible': return 'bg-green-100 text-green-700 border-green-200';
    case 'En Servicio': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Mantenimiento': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default: return 'bg-red-100 text-red-700 border-red-200';
  }
};

const getVehicleIcon = (type: string) => {
  if (type.includes('Ambulancia')) return <Cross size={14} className="text-white" />;
  if (type.includes('Motocicleta')) return <Bike size={14} className="text-white" />;
  if (type.includes('VIR')) return <Car size={14} className="text-white" />;
  return <Truck size={14} className="text-white" />;
};

export default function VehiculosPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<typeof MOCK_VEHICLES[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'maintenance'>('info');
  const [showBreakdownForm, setShowBreakdownForm] = useState(false);
  const [breakdownMessage, setBreakdownMessage] = useState('');

  const trackedVehicles = MOCK_VEHICLES.filter(v => v.location && (v.status === 'En Servicio' || v.status === 'Disponible'));

  // Map bounds for Bormujos
  const minLat = 37.360, maxLat = 37.380, minLng = -6.080, maxLng = -6.060;
  const getPosition = (lat: number, lng: number) => ({
    left: `${Math.max(5, Math.min(95, ((lng - minLng) / (maxLng - minLng)) * 100))}%`,
    bottom: `${Math.max(5, Math.min(95, ((lat - minLat) / (maxLat - minLat)) * 100))}%`
  });

  const handleReportBreakdown = () => {
    if (!breakdownMessage) return;
    alert(`Aviso de avería enviado para ${selectedVehicle?.code}. Motivo: ${breakdownMessage}`);
    setShowBreakdownForm(false);
    setBreakdownMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Flota</h1>
          <p className="text-slate-500 text-sm">Control de vehículos y ubicación en tiempo real.</p>
        </div>
        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
          Añadir Vehículo
        </button>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[400px]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Compass size={18} className="text-orange-600"/> Mapa Táctico de Flota
          </h3>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> En Servicio</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Disponible</span>
          </div>
        </div>
        
        <div className="relative flex-1 bg-slate-100 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>
          
          {/* Coordinates Display */}
          <div className="absolute top-4 right-4 bg-white/80 p-2 rounded text-[10px] font-mono border border-slate-200 backdrop-blur-sm">
            LAT: 37.37 N <br/> LNG: 06.07 W
          </div>
          
          {/* Radar Ping */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-orange-200/50 rounded-full animate-pulse pointer-events-none"></div>

          {/* Vehicle Markers */}
          {trackedVehicles.map(veh => {
            const pos = getPosition(veh.location!.lat, veh.location!.lng);
            return (
              <div 
                key={veh.id}
                className="absolute cursor-pointer transform -translate-x-1/2 translate-y-1/2 hover:scale-110 transition-transform z-10"
                style={{ left: pos.left, bottom: pos.bottom }}
                onClick={() => setSelectedVehicle(veh)}
              >
                <div className="relative group/pin">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                    veh.status === 'En Servicio' ? 'bg-orange-500 animate-bounce' : 'bg-green-500'
                  }`}>
                    {getVehicleIcon(veh.type)}
                  </div>
                  
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap">
                    {veh.code}
                  </div>

                  {veh.status === 'En Servicio' && (
                    <div className="absolute inset-0 rounded-full bg-orange-500 opacity-30 animate-ping"></div>
                  )}
                </div>
              </div>
            );
          })}

          {trackedVehicles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Navigation size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-sm">Sin vehículos geolocalizados activos</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-2 bg-slate-50 text-[10px] text-slate-400 text-center border-t border-slate-200">
          * Ubicaciones simuladas para demostración del sistema
        </div>
      </div>

      {/* Vehicles List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Listado de Vehículos</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Código</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Modelo</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Matrícula</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Última Revisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_VEHICLES.map(veh => (
              <tr key={veh.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedVehicle(veh)}>
                <td className="p-4 font-bold text-slate-800">{veh.code}</td>
                <td className="p-4 text-sm text-slate-600">{veh.model}</td>
                <td className="p-4 text-sm font-mono text-slate-600">{veh.plate}</td>
                <td className="p-4 text-sm text-slate-600">{veh.type}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(veh.status)}`}>
                    {veh.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-600">{veh.lastCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="bg-slate-900 p-6 flex justify-between items-start text-white">
              <div className="flex gap-4 items-center">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <Truck size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedVehicle.code}</h2>
                  <p className="text-slate-400 text-sm">{selectedVehicle.model} - {selectedVehicle.plate}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button onClick={() => setActiveTab('info')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-slate-500'}`}>Ficha Técnica</button>
              <button onClick={() => setActiveTab('docs')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'docs' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-slate-500'}`}>Documentación</button>
              <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'maintenance' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-slate-500'}`}>Mantenimiento</button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Estado Actual</h3>
                      <div className={`text-center py-4 rounded-lg font-bold text-lg mb-4 ${getStatusColor(selectedVehicle.status)}`}>
                        {selectedVehicle.status}
                      </div>
                      <div className="flex justify-between items-center text-sm text-slate-600 border-t pt-4">
                        <span>Última Revisión:</span>
                        <span className="font-mono">{selectedVehicle.lastCheck}</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Datos del Vehículo</h3>
                      <div className="space-y-3">
                        <div><label className="text-xs text-slate-500 block">Tipo</label><span className="font-medium text-slate-800">{selectedVehicle.type}</span></div>
                        <div><label className="text-xs text-slate-500 block">Matrícula</label><span className="font-medium text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedVehicle.plate}</span></div>
                        <div><label className="text-xs text-slate-500 block">Modelo</label><span className="font-medium text-slate-800">{selectedVehicle.model}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Reportar Incidencia</h3>
                      <button 
                        onClick={() => setShowBreakdownForm(!showBreakdownForm)}
                        className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded font-bold hover:bg-red-200"
                      >
                        {showBreakdownForm ? 'Cancelar' : 'Notificar Avería'}
                      </button>
                    </div>
                    {showBreakdownForm && (
                      <div className="mt-4">
                        <textarea 
                          className="w-full p-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                          placeholder="Describe la avería o el problema..."
                          rows={3}
                          value={breakdownMessage}
                          onChange={(e) => setBreakdownMessage(e.target.value)}
                        ></textarea>
                        <button 
                          onClick={handleReportBreakdown}
                          className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 w-full"
                        >
                          Enviar Alerta a Jefatura
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="text-center py-10 bg-white rounded-lg border border-dashed border-slate-300">
                  <FileText size={48} className="mx-auto mb-4 text-slate-300"/>
                  <p className="text-slate-400 text-sm">No hay documentos subidos.</p>
                  <button className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">Subir PDF</button>
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="text-center py-10 bg-white rounded-lg border border-dashed border-slate-300">
                  <Wrench size={48} className="mx-auto mb-4 text-slate-300"/>
                  <p className="text-slate-400 text-sm">Sin historial de mantenimiento registrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
