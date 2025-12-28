'use client';

import React, { useState } from 'react';
import { Package, Search, AlertTriangle, Plus, ClipboardList, ShoppingCart, Check, X, Archive, Calendar } from 'lucide-react';

// Mock Data
const MOCK_INVENTORY = [
  { id: 'i1', name: 'Gasas Estériles 20x20', family: 'Sanitario', subfamily: 'Curas', quantity: 500, minStock: 100, unit: 'u', expiryDate: '2026-09-01', location: 'Almacén 1 - A2', area: 'Socorrismo' },
  { id: 'i2', name: 'Guantes Nitrilo M', family: 'EPI', subfamily: 'Protección', quantity: 45, minStock: 50, unit: 'pares', expiryDate: '2025-08-15', location: 'Almacén 1 - B1', area: 'Socorrismo' },
  { id: 'i3', name: 'Extintor CO2 5kg', family: 'Extinción', subfamily: 'Portátil', quantity: 12, minStock: 5, unit: 'u', expiryDate: '2028-01-01', location: 'Almacén 2 - C1', area: 'Incendios' },
  { id: 'i4', name: 'Vendas elásticas 10cm', family: 'Sanitario', subfamily: 'Curas', quantity: 200, minStock: 50, unit: 'u', expiryDate: '2027-03-15', location: 'Almacén 1 - A3', area: 'Socorrismo' },
  { id: 'i5', name: 'Mascarillas FFP2', family: 'EPI', subfamily: 'Protección respiratoria', quantity: 30, minStock: 100, unit: 'u', expiryDate: '2025-06-01', location: 'Almacén 1 - B2', area: 'Logística' },
];

interface MaterialRequest {
  id: string;
  itemId: string;
  itemName: string;
  area: string;
  requestedBy: string;
  quantity: number;
  reason: string;
  status: 'Pendiente' | 'Aprobada' | 'Recepcionada' | 'Rechazada';
  requestDate: string;
}

export default function LogisticaPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'requests'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [showRequestModal, setShowRequestModal] = useState<typeof MOCK_INVENTORY[0] | null>(null);
  const [reqQuantity, setReqQuantity] = useState(1);
  const [reqReason, setReqReason] = useState('');
  const [requests, setRequests] = useState<MaterialRequest[]>([]);

  const uniqueFamilies = Array.from(new Set(MOCK_INVENTORY.map(i => i.family)));

  const filteredItems = MOCK_INVENTORY.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.family.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = selectedFamily === 'all' || item.family === selectedFamily;
    return matchesSearch && matchesFamily;
  });

  const lowStockCount = MOCK_INVENTORY.filter(i => i.quantity < i.minStock).length;
  const expiringCount = MOCK_INVENTORY.filter(i => {
    if (!i.expiryDate) return false;
    const expiry = new Date(i.expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths;
  }).length;

  const handleSubmitRequest = () => {
    if (!showRequestModal || !reqReason) return;
    
    const newRequest: MaterialRequest = {
      id: `req-${Date.now()}`,
      itemId: showRequestModal.id,
      itemName: showRequestModal.name,
      area: showRequestModal.area,
      requestedBy: 'Usuario Actual',
      quantity: reqQuantity,
      reason: reqReason,
      status: 'Pendiente',
      requestDate: new Date().toISOString()
    };
    
    setRequests(prev => [newRequest, ...prev]);
    setShowRequestModal(null);
    setReqQuantity(1);
    setReqReason('');
    alert('Ticket de petición enviado a Logística correctamente.');
  };

  const handleUpdateStatus = (id: string, status: MaterialRequest['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario: Global (Logística)</h1>
          <p className="text-slate-500 text-sm">Gestión centralizada de stock y pedidos.</p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'stock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={16}/> Stock Global
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ClipboardList size={16}/> Peticiones de Material
            {requests.filter(r => r.status === 'Pendiente').length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">
                {requests.filter(r => r.status === 'Pendiente').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'stock' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs uppercase font-medium">Total Referencias</p>
              <p className="text-3xl font-bold text-slate-800">{MOCK_INVENTORY.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs uppercase font-medium">Bajo Stock</p>
              <p className="text-3xl font-bold text-red-600">{lowStockCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs uppercase font-medium">Caducados / Próx.</p>
              <p className="text-3xl font-bold text-orange-600">{expiringCount}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                type="text"
                placeholder="Buscar por nombre, familia..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border border-slate-200 rounded-lg px-4 py-2 text-sm bg-slate-50"
              value={selectedFamily}
              onChange={e => setSelectedFamily(e.target.value)}
            >
              <option value="all">Todas las Familias</option>
              {uniqueFamilies.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Artículo / Familia</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Área</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Caducidad</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Solicitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const isLowStock = item.quantity < item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.family} &gt; {item.subfamily}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm font-bold ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {item.quantity} {item.unit}
                        </span>
                        {isLowStock && <AlertTriangle size={14} className="inline ml-2 text-red-500"/>}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">{item.area}</span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{item.location}</td>
                      <td className="p-4">
                        {item.expiryDate && (
                          <span className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar size={14}/> {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => setShowRequestModal(item)}
                          className="text-slate-400 hover:text-orange-600"
                        >
                          <ShoppingCart size={18}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-orange-600"/> Gestión de Tickets de Material
            </h3>
            <p className="text-sm text-slate-500 mt-1">Aprobar, pedir y recepcionar material solicitado por las áreas.</p>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Fecha / Solicitante</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Artículo</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Cantidad</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Motivo</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length > 0 ? requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="text-xs font-bold text-slate-600">{new Date(req.requestDate).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">{req.requestedBy}</div>
                    <div className="text-[10px] bg-slate-100 px-1 rounded inline-block mt-1 text-slate-500">{req.area}</div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-800">{req.itemName}</td>
                  <td className="p-4 font-bold text-slate-800">{req.quantity}</td>
                  <td className="p-4 text-sm text-slate-600 italic">"{req.reason}"</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      req.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'Aprobada' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'Recepcionada' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {req.status === 'Pendiente' && (
                        <>
                          <button onClick={() => handleUpdateStatus(req.id, 'Aprobada')} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700" title="Aprobar y Pedir">
                            <Check size={16}/>
                          </button>
                          <button onClick={() => handleUpdateStatus(req.id, 'Rechazada')} className="bg-white border border-red-200 text-red-600 p-2 rounded hover:bg-red-50" title="Rechazar">
                            <X size={16}/>
                          </button>
                        </>
                      )}
                      {req.status === 'Aprobada' && (
                        <button onClick={() => handleUpdateStatus(req.id, 'Recepcionada')} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 flex items-center gap-1">
                          <Archive size={14}/> Recepcionar Stock
                        </button>
                      )}
                      {(req.status === 'Recepcionada' || req.status === 'Rechazada') && (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No hay solicitudes registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRequestModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShoppingCart className="text-orange-600"/> Petición de Material
            </h3>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
              <p className="text-sm font-bold text-slate-700">{showRequestModal.name}</p>
              <p className="text-xs text-slate-500">Stock Actual: {showRequestModal.quantity} {showRequestModal.unit}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad Solicitada</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={reqQuantity}
                  onChange={e => setReqQuantity(parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Justificación</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  rows={3}
                  placeholder="Ej: Reposición por caducidad, rotura en servicio..."
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRequestModal(null)} className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleSubmitRequest} disabled={!reqReason} className="flex-1 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg font-bold shadow disabled:opacity-50">Enviar Petición</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
