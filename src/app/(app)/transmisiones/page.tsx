'use client';

import { Radio, Signal, Battery, Wifi } from 'lucide-react';

export default function TransmisionesPage() {
  const equipos = [
    { id: 'r1', code: 'RADIO-01', type: 'Motorola DP4800e', status: 'Operativo', battery: 95, lastCheck: '2024-12-20' },
    { id: 'r2', code: 'RADIO-02', type: 'Motorola DP4800e', status: 'Operativo', battery: 87, lastCheck: '2024-12-20' },
    { id: 'r3', code: 'RADIO-03', type: 'Motorola DP4800e', status: 'Cargando', battery: 45, lastCheck: '2024-12-20' },
    { id: 'r4', code: 'RADIO-04', type: 'Motorola DP4800e', status: 'Mantenimiento', battery: 0, lastCheck: '2024-12-15' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Radio className="text-orange-600"/> Transmisiones</h1>
        <p className="text-slate-500 text-sm">Gestión de equipos de radio y comunicaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500 uppercase">Total Equipos</p><p className="text-3xl font-bold">{equipos.length}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500 uppercase">Operativos</p><p className="text-3xl font-bold text-green-600">{equipos.filter(e => e.status === 'Operativo').length}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500 uppercase">Cargando</p><p className="text-3xl font-bold text-yellow-600">{equipos.filter(e => e.status === 'Cargando').length}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500 uppercase">Mantenimiento</p><p className="text-3xl font-bold text-red-600">{equipos.filter(e => e.status === 'Mantenimiento').length}</p></div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Inventario de Equipos</h3></div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Código</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Modelo</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Batería</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Última Revisión</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {equipos.map(eq => (
              <tr key={eq.id} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-800">{eq.code}</td>
                <td className="p-4 text-sm text-slate-600">{eq.type}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${eq.status === 'Operativo' ? 'bg-green-100 text-green-700' : eq.status === 'Cargando' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{eq.status}</span></td>
                <td className="p-4"><div className="flex items-center gap-2"><Battery size={16} className={eq.battery > 50 ? 'text-green-500' : eq.battery > 20 ? 'text-yellow-500' : 'text-red-500'}/><span className="text-sm">{eq.battery}%</span></div></td>
                <td className="p-4 text-sm text-slate-600">{eq.lastCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
