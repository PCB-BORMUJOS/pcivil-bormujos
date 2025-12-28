'use client';

import { Tent, Package, Users, MapPin } from 'lucide-react';

export default function PMAPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Tent className="text-orange-600"/> Puesto de Mando Avanzado (PMA)</h1>
        <p className="text-slate-500 text-sm">Gestión de equipamiento y despliegue del PMA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><Package size={24}/></div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Equipamiento</p>
              <p className="text-2xl font-bold">12 items</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">Carpas, mesas, sillas, generadores...</p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Users size={24}/></div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Personal Formado</p>
              <p className="text-2xl font-bold">8 voluntarios</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">Con certificación en montaje PMA</p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-600"><MapPin size={24}/></div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Último Despliegue</p>
              <p className="text-2xl font-bold">15/12/2024</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">Feria de Navidad - Recinto Ferial</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Inventario PMA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Carpa Principal 6x6', qty: 1, status: 'ok' },
            { name: 'Carpa Auxiliar 3x3', qty: 2, status: 'ok' },
            { name: 'Mesas Plegables', qty: 4, status: 'ok' },
            { name: 'Sillas Plegables', qty: 12, status: 'ok' },
            { name: 'Generador 2.5kW', qty: 1, status: 'mantenimiento' },
            { name: 'Focos LED 500W', qty: 4, status: 'ok' },
            { name: 'Cables Extensión 25m', qty: 3, status: 'ok' },
            { name: 'Botiquín PMA', qty: 1, status: 'revisar' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">Cantidad: {item.qty}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'ok' ? 'bg-green-100 text-green-700' : item.status === 'mantenimiento' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                {item.status === 'ok' ? 'OK' : item.status === 'mantenimiento' ? 'MANT.' : 'REVISAR'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
