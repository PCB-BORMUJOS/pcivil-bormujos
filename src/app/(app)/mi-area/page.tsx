'use client';

import React, { useState } from 'react';
import { Users, GraduationCap, Clock, FileText, Bell, Shield, Save, Edit, Download, ChevronRight } from 'lucide-react';

const MOCK_USER = {
  id: 'j44', name: 'EMILIO', surname: 'SIMÓN GÓMEZ', email: 'emilio.simon@pcbormujos.es',
  badgeNumber: 'J-44', rank: 'Jefe de Servicio', systemRole: 'superadmin',
  phone: '600 123 456', dni: '12345678A', birthDate: '1985-05-15', joinDate: '2015-03-01',
  municipio: 'Bormujos', kmAllowance: 0,
  avatarUrl: 'https://ui-avatars.com/api/?name=EMILIO+SIMON&background=ea580c&color=fff&size=128',
};

const MOCK_VOLUNTEERS = [
  { id: 'j44', name: 'EMILIO', surname: 'SIMÓN GÓMEZ', badgeNumber: 'J-44', rank: 'Jefe de Servicio', systemRole: 'superadmin', municipio: 'Bormujos', kmAllowance: 0, lopdAccepted: true, avatarUrl: 'https://ui-avatars.com/api/?name=ES&background=ea580c&color=fff' },
  { id: 's01', name: 'TANYA', surname: 'GONZÁLEZ MEDINA', badgeNumber: 'S-01', rank: 'Coordinador', systemRole: null, municipio: 'Mairena', kmAllowance: 5.25, lopdAccepted: true, avatarUrl: 'https://ui-avatars.com/api/?name=TG&background=0ea5e9&color=fff' },
  { id: 'b29', name: 'JOSE CARLOS', surname: 'BAILÓN LÓPEZ', badgeNumber: 'B-29', rank: 'Responsable', systemRole: null, municipio: 'Tomares', kmAllowance: 3.50, lopdAccepted: false, avatarUrl: 'https://ui-avatars.com/api/?name=JB&background=22c55e&color=fff' },
];

export default function MiAreaPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'formacion' | 'actividad' | 'docs' | 'preferencias' | 'admin_list'>('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(MOCK_USER);
  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState(false);

  const isAdmin = MOCK_USER.systemRole === 'superadmin';

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Mi Área Personal</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Gestión de ficha de voluntario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'perfil', label: 'Mis Datos', icon: Users },
          { id: 'formacion', label: 'Formación', icon: GraduationCap },
          { id: 'actividad', label: 'Mi Actividad', icon: Clock },
          { id: 'docs', label: 'Documentos', icon: FileText },
          { id: 'preferencias', label: 'Preferencias', icon: Bell },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => setActiveTab('admin_list')} className={`pb-3 px-2 text-xs font-black uppercase tracking-tighter flex items-center gap-2 ml-auto ${activeTab === 'admin_list' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-500'}`}>
            <Shield size={14} /> Registro FRI
          </button>
        )}
      </div>

      {/* Perfil */}
      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase">Ficha de Voluntario</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Información operativa básica</p>
                </div>
                <button onClick={() => isEditing ? (setIsEditing(false), alert('Guardado')) : setIsEditing(true)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 ${isEditing ? 'bg-green-600 text-white' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                  {isEditing ? <><Save size={14}/> Guardar</> : <><Edit size={14}/> Editar</>}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Nombre</label><input className="w-full border rounded p-2 text-sm" value={formData.name} disabled={!isEditing} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Apellidos</label><input className="w-full border rounded p-2 text-sm" value={formData.surname} disabled={!isEditing} onChange={e => setFormData({...formData, surname: e.target.value})}/></div>
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">DNI</label><input className="w-full border rounded p-2 text-sm font-mono" value={formData.dni} disabled={!isEditing}/></div>
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Email</label><input className="w-full border rounded p-2 text-sm" value={formData.email} disabled={!isEditing}/></div>
                </div>
                <div className="space-y-4">
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Teléfono</label><input className="w-full border rounded p-2 text-sm" value={formData.phone} disabled={!isEditing}/></div>
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Municipio</label><input className="w-full border rounded p-2 text-sm" value={formData.municipio} disabled={!isEditing}/></div>
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Fecha Alta</label><input className="w-full border rounded p-2 text-sm" value={formData.joinDate} disabled/></div>
                  <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Km/Turno</label><input className="w-full border rounded p-2 text-sm" value={`${formData.kmAllowance.toFixed(2)} €`} disabled/></div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <img src={formData.avatarUrl} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-orange-100" alt="Avatar"/>
              <h4 className="font-black text-slate-800 text-lg">{formData.badgeNumber}</h4>
              <p className="text-sm text-slate-600">{formData.name} {formData.surname}</p>
              <p className="text-xs text-slate-400 mt-2">{formData.rank}</p>
              <div className="mt-4 inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{formData.systemRole}</div>
            </div>
          </div>
        </div>
      )}

      {/* Formación */}
      {activeTab === 'formacion' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Formación Acreditada</h3>
          <div className="space-y-3">
            {['Nivel I Protección Civil', 'RCP y DESA', 'Comunicaciones'].map((curso, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                <div><p className="font-medium text-slate-800">{curso}</p><p className="text-xs text-slate-500">Vigente</p></div>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ACTIVO</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actividad */}
      {activeTab === 'actividad' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Historial de Actividad</h3>
          <div className="space-y-3">
            {[{ fecha: '2024-12-20', desc: 'Servicio Preventivo Feria', horas: 6 }, { fecha: '2024-12-15', desc: 'Romería', horas: 9 }].map((act, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                <div><p className="font-medium text-slate-800">{act.desc}</p><p className="text-xs text-slate-500">{act.fecha}</p></div>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{act.horas}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center py-12">
          <FileText size={48} className="mx-auto text-slate-300 mb-4"/>
          <p className="text-slate-500">Sin documentos subidos</p>
          <button className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Subir Documento</button>
        </div>
      )}

      {/* Preferencias */}
      {activeTab === 'preferencias' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-2xl">
          <h3 className="font-bold text-slate-800 mb-6">Ajustes de la Cuenta</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div><h4 className="font-bold text-slate-800">Notificaciones Push y Email</h4><p className="text-xs text-slate-500">Recibir alertas de servicios y cambios</p></div>
              <button onClick={() => setNotifications(!notifications)} className={`w-14 h-7 rounded-full p-1 transition-colors ${notifications ? 'bg-orange-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-7' : ''}`}></div>
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div><h4 className="font-bold text-slate-800">Privacidad de Perfil</h4><p className="text-xs text-slate-500">Hacer ficha visible para otros voluntarios</p></div>
              <button onClick={() => setPrivacy(!privacy)} className={`w-14 h-7 rounded-full p-1 transition-colors ${privacy ? 'bg-orange-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${privacy ? 'translate-x-7' : ''}`}></div>
              </button>
            </div>
          </div>
          <button className="mt-8 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2"><Save size={16}/> Guardar Ajustes</button>
        </div>
      )}

      {/* Admin FRI */}
      {activeTab === 'admin_list' && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Fichero de Registro Individualizado (FRI)</h3>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><Download size={16}/> Exportar XLS</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Identificativo</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Voluntario</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Municipio</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">KM/Turno</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">LOPD</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_VOLUNTEERS.map(vol => (
                <tr key={vol.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-slate-700">{vol.badgeNumber}</td>
                  <td className="p-4 flex items-center gap-3">
                    <img src={vol.avatarUrl} className="w-8 h-8 rounded-full" alt=""/>
                    <div><div className="font-bold text-slate-800">{vol.name} {vol.surname}</div><div className="text-xs text-slate-400">{vol.rank}</div></div>
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-600 uppercase">{vol.municipio}</td>
                  <td className="p-4 text-center font-mono font-bold">{vol.kmAllowance.toFixed(2)} €</td>
                  <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${vol.lopdAccepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{vol.lopdAccepted ? 'Aceptado' : 'Pendiente'}</span></td>
                  <td className="p-4 text-right"><button className="text-orange-600 hover:bg-orange-50 p-2 rounded"><ChevronRight size={20}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
