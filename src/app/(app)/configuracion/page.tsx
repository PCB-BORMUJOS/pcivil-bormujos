'use client';

import { useState } from 'react';
import { Settings, Shield, CreditCard, History, Users, TrendingUp, Download, Edit, Loader2 } from 'lucide-react';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'liquidaciones' | 'roles' | 'audit'>('liquidaciones');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const dietRules = [
    { id: 'd1', minHours: 4, amount: 29, label: 'Tramo > 4h' },
    { id: 'd2', minHours: 8, amount: 45, label: 'Tramo > 8h' },
    { id: 'd3', minHours: 12, amount: 65, label: 'Tramo > 12h' }
  ];

  const volunteers = [
    { id: 'j44', name: 'EMILIO SIMÓN', badgeNumber: 'J-44', area: 'JEFATURA', systemRole: 'superadmin', avatarUrl: 'https://ui-avatars.com/api/?name=ES&background=ea580c&color=fff' },
    { id: 's01', name: 'TANYA GONZÁLEZ', badgeNumber: 'S-01', area: 'SOCORRISMO', systemRole: null, avatarUrl: 'https://ui-avatars.com/api/?name=TG&background=0ea5e9&color=fff' },
    { id: 'b29', name: 'JOSE C. BAILÓN', badgeNumber: 'B-29', area: 'LOGÍSTICA', systemRole: 'admin', avatarUrl: 'https://ui-avatars.com/api/?name=JB&background=22c55e&color=fff' },
  ];

  const generateReport = () => {
    setLoading(true);
    setTimeout(() => {
      setReportData([
        { indicativo: 'J-44', nombre: 'EMILIO SIMÓN', municipio: 'Bormujos', kmUnitario: 0, numTurnos: 5, subtotalDietas: 145, subtotalKm: 0, total: 145 },
        { indicativo: 'S-01', nombre: 'TANYA GONZÁLEZ', municipio: 'Mairena', kmUnitario: 5.25, numTurnos: 8, subtotalDietas: 232, subtotalKm: 42, total: 274 },
        { indicativo: 'B-29', nombre: 'JOSE C. BAILÓN', municipio: 'Tomares', kmUnitario: 3.50, numTurnos: 6, subtotalDietas: 174, subtotalKm: 21, total: 195 },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl"><Shield size={32}/></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Panel de Gestión Administrativa</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Configuración de dietas, kilometraje y auditoría</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 pb-px">
        <button onClick={() => setActiveTab('liquidaciones')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'liquidaciones' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <CreditCard size={16}/> Liquidaciones
        </button>
        <button onClick={() => setActiveTab('roles')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'roles' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <Users size={16}/> Roles y Permisos
        </button>
        <button onClick={() => setActiveTab('audit')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'audit' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <History size={16}/> Trazabilidad
        </button>
      </div>

      {/* Liquidaciones */}
      {activeTab === 'liquidaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-orange-600"/> Baremo de Dietas</h3>
              <div className="space-y-4">
                {dietRules.map(rule => (
                  <div key={rule.id} className="p-4 bg-slate-50 rounded-lg border">
                    <label className="text-xs text-slate-400 font-bold block mb-2">{rule.label}</label>
                    <div className="flex gap-4">
                      <div className="flex-1"><span className="text-xs text-slate-500">Min. Horas</span><input type="number" className="w-full border rounded p-2 text-sm" defaultValue={rule.minHours}/></div>
                      <div className="flex-1"><span className="text-xs text-slate-500">Importe €</span><input type="number" className="w-full border rounded p-2 text-sm" defaultValue={rule.amount}/></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Generador de Informe Mensual</h3>
              <div className="flex gap-4">
                <input type="month" className="border rounded p-2 text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}/>
                <button onClick={generateReport} disabled={loading} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : null} Generar
                </button>
              </div>
            </div>

            {reportData.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Indicativo</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Nombre</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Municipio</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Turnos</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Dietas</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">KM</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-bold text-slate-700">{row.indicativo}</td>
                      <td className="p-4 font-bold text-slate-800">{row.nombre}</td>
                      <td className="p-4 text-sm text-slate-600">{row.municipio}</td>
                      <td className="p-4 text-center font-bold">{row.numTurnos}</td>
                      <td className="p-4 text-right">{row.subtotalDietas.toFixed(2)}€</td>
                      <td className="p-4 text-right">{row.subtotalKm.toFixed(2)}€</td>
                      <td className="p-4 text-right"><span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-bold">{row.total.toFixed(2)}€</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center text-slate-400">
                <CreditCard size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-sm">Seleccione periodo y genere el informe</p>
              </div>
            )}

            {reportData.length > 0 && (
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Total {selectedMonth}</p>
                  <p className="text-3xl font-bold">{reportData.reduce((acc, r) => acc + r.total, 0).toFixed(2)} €</p>
                </div>
                <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Download size={18}/> Exportar PDF</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roles */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Control de Acceso y Privilegios</h3></div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Identidad</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Área</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Nivel Acceso</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Modificar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {volunteers.map(vol => (
                <tr key={vol.id} className="hover:bg-slate-50">
                  <td className="p-4 flex items-center gap-3">
                    <img src={vol.avatarUrl} className="w-10 h-10 rounded-full" alt=""/>
                    <div><div className="font-bold text-slate-800">{vol.name}</div><div className="text-xs text-slate-400 font-mono">{vol.badgeNumber}</div></div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{vol.area}</td>
                  <td className="p-4"><span className={`px-3 py-1 rounded-lg text-xs font-bold ${vol.systemRole === 'superadmin' ? 'bg-indigo-100 text-indigo-700' : vol.systemRole === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{vol.systemRole || 'Básico'}</span></td>
                  <td className="p-4 text-right"><button className="text-slate-400 hover:text-orange-600"><Edit size={18}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border shadow-sm p-20 text-center">
          <History size={64} className="mx-auto mb-4 text-slate-200"/>
          <h3 className="font-bold text-slate-600 text-lg">Módulo de Seguridad Alta</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">Los logs de auditoría están siendo migrados a la bóveda de datos securizada. Disponible próximamente.</p>
        </div>
      )}
    </div>
  );
}
