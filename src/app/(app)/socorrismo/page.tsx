'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import {
  Heart, Package, Search, AlertTriangle, Plus, RefreshCw, Building2, Droplet, MapPin,
  Edit, Trash2, Eye, X, ShoppingCart, Layers, Clock, Check, CheckCircle,
  Ban, Filter, User, Calendar, Save
} from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

const createDEAIcon = (estado: string) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const borderColor = estado === 'operativo' ? '#22c55e' : estado === 'revision_pendiente' ? '#f59e0b' : '#ef4444';
  const shadowColor = estado === 'operativo' ? 'rgba(34, 197, 94, 0.4)' : estado === 'revision_pendiente' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  return L.divIcon({
    className: 'custom-dea-icon',
    html: `<div style="position: relative; width: 48px; height: 48px; border-radius: 50%; border: 4px solid ${borderColor}; background: white; box-shadow: 0 4px 12px ${shadowColor}, 0 0 0 2px white; display: flex; align-items: center; justify-content: center; font-size: 24px;">❤️</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

interface Articulo { id: string; codigo: string; nombre: string; descripcion?: string; stockActual: number; stockMinimo: number; unidad: string; familia: { nombre: string; id: string }; }
interface Familia { id: string; nombre: string; slug: string; }
interface Edificio { id: string; nombre: string; direccion: string | null; }
interface DEA { id: string; codigo: string; tipo: string; marca?: string; modelo?: string; numeroSerie?: string; ubicacion: string; latitud: number | null; longitud: number | null; estado: string; accesible24h: boolean; }

const ESTADOS_PETICION = {
  pendiente: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Pendiente', icon: Clock },
  aprobada: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Aprobada', icon: Check },
  en_compra: { color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'En Compra', icon: ShoppingCart },
  recibida: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Recibida', icon: CheckCircle },
  rechazada: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Rechazada', icon: Ban },
  cancelada: { color: 'bg-slate-100 text-slate-700 border-slate-300', label: 'Cancelada', icon: X },
};

const PRIORIDADES = {
  baja: { color: 'bg-slate-100 text-slate-600', label: 'Baja' },
  normal: { color: 'bg-blue-100 text-blue-600', label: 'Normal' },
  alta: { color: 'bg-orange-100 text-orange-600', label: 'Alta' },
  urgente: { color: 'bg-red-100 text-red-600', label: 'Urgente' },
};

export default function SocorrismoPage() {
  const [mainTab, setMainTab] = useState<'inventario' | 'deas'>('inventario');
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock');
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [deas, setDEAs] = useState<DEA[]>([]);
  const [statsArticulos, setStatsArticulos] = useState({ totalArticulos: 0, stockBajo: 0 });
  const [deasStats, setDEAsStats] = useState({ total: 0, operativos: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false);
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false);
  const [showGestionFamilias, setShowGestionFamilias] = useState(false);
  const [showNuevoDEA, setShowNuevoDEA] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [peticiones, setPeticiones] = useState<any[]>([]);
  const [filtroPeticiones, setFiltroPeticiones] = useState("all");
  const [peticionStats, setPeticionStats] = useState({ total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 });
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [deaSeleccionado, setDEASeleccionado] = useState<DEA | null>(null);
  const [categoriaSocorrismo, setCategoriaSocorrismo] = useState<string | null>(null);

  useEffect(() => { cargarDatos(); setMapReady(true); }, []);
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones(); }, [inventoryTab, filtroPeticiones]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resArt, resEd, resHid, resCat] = await Promise.all([
        fetch("/api/logistica?inventario=socorrismo"),
        fetch("/api/logistica?tipo=edificios"),
        fetch("/api/logistica?tipo=deas"),
        fetch("/api/logistica?tipo=categoria&slug=socorrismo")
      ]);
      const dataArt = await resArt.json();
      const dataEd = await resEd.json();
      const dataHid = await resHid.json();
      const dataCat = await resCat.json();
      setArticulos(dataArt.articulos || []);
      setFamilias(dataArt.familias || []);
      if (dataCat.categoria?.id) setCategoriaSocorrismo(dataCat.categoria.id);
      setStatsArticulos({ totalArticulos: dataArt.stats?.totalArticulos || 0, stockBajo: dataArt.stats?.stockBajo || 0 });
      setEdificios(dataEd.edificios || []);
      setDEAs(dataHid.deas || []);
      setDEAsStats({ total: dataHid.stats?.total || 0, operativos: dataHid.stats?.operativos || 0 });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPeticiones = async () => {
    try {
      const params = new URLSearchParams();
      params.append("area", "socorrismo");
      if (filtroPeticiones !== "all") params.append("estado", filtroPeticiones);
      const res = await fetch(`/api/logistica/peticiones?${params.toString()}`);
      const data = await res.json();
      setPeticiones(data.peticiones || []);
      setPeticionStats(data.stats || { total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const centerPosition: [number, number] = [37.3710, -6.0710];
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = searchTerm === '' || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || a.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia.id === selectedFamiliaFilter;
    return matchSearch && matchFamilia;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl"><Heart className="text-red-600" size={28} /></div>
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">SOCORRISMO</p>
            <h1 className="text-2xl font-bold text-slate-800">Área de Socorrismo</h1>
            <p className="text-slate-500 text-sm">Material sanitario, DEAs y recursos de socorrismo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cargarDatos} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowNuevaPeticion(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"><ShoppingCart size={18} />Nueva Petición</button>
          <button onClick={() => setShowNuevoArticulo(true)} className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium"><Plus size={18} />Nuevo Artículo</button>
          <button onClick={() => setShowNuevoDEA(true)} className="px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 font-medium"><Droplet size={18} />Nuevo DEA</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[ { label: 'Material del Área', value: statsArticulos.totalArticulos, icon: Package, bg: 'bg-purple-100', color: 'text-purple-600' },
          { label: 'Stock Bajo', value: statsArticulos.stockBajo, icon: AlertTriangle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
          { label: 'DEAs Totales', value: deasStats.total, icon: Droplet, bg: 'bg-cyan-100', color: 'text-cyan-600' },
          { label: 'Edificios', value: edificios.length, icon: Building2, bg: 'bg-slate-100', color: 'text-slate-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div><p className="text-slate-500 text-xs font-medium">{stat.label}</p><h3 className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</h3></div>
              <div className={`${stat.bg} p-2.5 rounded-xl`}><stat.icon size={22} className={stat.color} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[ { id: 'inventario', label: 'Inventario del Área', icon: Package }, { id: 'deas', label: 'Red de DEAs', icon: Droplet },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMainTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${mainTab === tab.id ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon size={18} />{tab.label}
            </button>
          ))}
        </div>

        {mainTab === 'inventario' && (
          <div>
            <div className="flex border-b border-slate-200 bg-slate-50">
              {[ { id: 'stock', label: 'Stock', icon: Package }, { id: 'peticiones', label: 'Peticiones', icon: ShoppingCart }, { id: 'movimientos', label: 'Movimientos', icon: RefreshCw },
              ].map(tab => (
                <button key={tab.id} onClick={() => { setInventoryTab(tab.id as any); if (tab.id === 'peticiones') cargarPeticiones(); }} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${inventoryTab === tab.id ? 'border-purple-500 text-purple-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <tab.icon size={16} />{tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {inventoryTab === 'stock' && (
                <div>
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input type="text" placeholder="Buscar artículos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <select value={selectedFamiliaFilter} onChange={(e) => setSelectedFamiliaFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-lg">
                      <option value="all">Todas las familias</option>
                      {familias.map(fam => <option key={fam.id} value={fam.id}>{fam.nombre}</option>)}
                    </select>
                    <button onClick={() => setShowGestionFamilias(true)} className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"><Layers size={18} />Familias</button>
                  </div>
                  {loading ? (
                    <div className="text-center py-12 text-slate-400"><RefreshCw size={32} className="mx-auto mb-2 animate-spin" /><p>Cargando...</p></div>
                  ) : articulosFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-slate-400"><Package size={48} className="mx-auto mb-4 opacity-50" /><p>No hay artículos</p></div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 border-y border-slate-200">
                        <tr>
                          <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Artículo</th>
                          <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Familia</th>
                          <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                          <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                          <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {articulosFiltrados.map(art => (
                          <tr key={art.id} className="hover:bg-slate-50">
                            <td className="p-3"><p className="font-medium text-slate-800">{art.nombre}</p><p className="text-xs text-slate-500">Cód: {art.codigo}</p></td>
                            <td className="p-3 text-sm text-slate-600">{art.familia?.nombre || '-'}</td>
                            <td className="p-3 text-center"><span className="font-bold text-slate-800">{art.stockActual}</span><span className="text-slate-400 text-sm ml-1">{art.unidad}</span></td>
                            <td className="p-3 text-center">
                              {art.stockActual <= art.stockMinimo ? (
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">⚠ Bajo</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">✓ OK</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => setArticuloSeleccionado(art)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"><Eye size={16} /></button>
                                <button onClick={() => setArticuloSeleccionado(art)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"><Edit size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {inventoryTab === 'peticiones' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Filter size={18} className="text-slate-400" />
                      <select value={filtroPeticiones} onChange={e => setFiltroPeticiones(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        <option value="all">Todos los estados</option>
                        <option value="pendiente">Pendientes ({peticionStats.pendientes})</option>
                        <option value="aprobada">Aprobadas ({peticionStats.aprobadas})</option>
                        <option value="en_compra">En Compra ({peticionStats.enCompra})</option>
                        <option value="recibida">Recibidas ({peticionStats.recibidas})</option>
                      </select>
                    </div>
                  </div>
                  {peticiones.length === 0 ? (
                    <div className="text-center py-12 text-slate-500"><ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No hay peticiones de material</p></div>
                  ) : (
                    <div className="space-y-3">
                      {peticiones.map(peticion => {
                        const estadoInfo = ESTADOS_PETICION[peticion.estado as keyof typeof ESTADOS_PETICION] || ESTADOS_PETICION.pendiente;
                        const prioridadInfo = PRIORIDADES[peticion.prioridad as keyof typeof PRIORIDADES] || PRIORIDADES.normal;
                        const EstadoIcon = estadoInfo.icon;
                        return (
                          <div key={peticion.id} className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><Heart size={24} className="text-red-600" /></div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800">{peticion.numero}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${estadoInfo.color}`}><EstadoIcon size={12} className="inline mr-1" />{estadoInfo.label}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${prioridadInfo.color}`}>{prioridadInfo.label}</span>
                                  </div>
                                  <p className="font-medium text-slate-700 mt-1">{peticion.nombreArticulo} <span className="text-slate-400">× {peticion.cantidad} {peticion.unidad}</span></p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><User size={12} /> {peticion.solicitante.nombre} {peticion.solicitante.apellidos}</span>
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(peticion.fechaSolicitud).toLocaleDateString('es-ES')}</span>
                                  </div>
                                  {peticion.descripcion && <p className="text-sm text-slate-500 mt-2">{peticion.descripcion}</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {inventoryTab === 'movimientos' && <div className="text-center py-12 text-slate-400"><RefreshCw size={48} className="mx-auto mb-4 opacity-50" /><p>Próximamente: Historial de movimientos</p></div>}
            </div>
          </div>
        )}

        {mainTab === 'deas' && (
          <div>
            <div className="border-b border-slate-200">
              <div className="p-4 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin size={18} className="text-cyan-600" /> Mapa de DEAs - Bormujos</h3>
                <button onClick={() => setShowNuevoDEA(true)} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"><Plus size={18} />Nuevo DEA</button>
              </div>
              <div className="h-[400px] relative z-0">
                {mapReady && deas.length > 0 ? (
                  <MapContainer center={centerPosition} zoom={15} style={{ height: '100%', width: '100%' }} key="deas-map">
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {deas.filter(d => d.latitud && d.longitud).map((dea) => (
                      <Marker key={dea.id} position={[dea.latitud!, dea.longitud!]} icon={createDEAIcon(dea.estado) || undefined}>
                        <Popup><div className="text-center min-w-[150px]"><strong className="text-lg block">{dea.codigo}</strong><p className="text-sm text-slate-600">{dea.tipo}</p><p className="text-xs text-slate-500 mt-1">{dea.ubicacion}</p>{dea.marca && <p className="text-xs mt-1">Marca: {dea.marca}</p>}</div></Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50"><div className="text-center"><Droplet size={48} className="mx-auto mb-4 text-slate-300" /><p className="text-slate-500">No hay DEAs con coordenadas</p></div></div>
                )}
              </div>
            </div>
            <div className="p-4">
              {deas.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><Droplet size={48} className="mx-auto mb-4 opacity-50" /><p>No hay DEAs registrados</p></div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">24/7</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deas.map(dea => (
                      <tr key={dea.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{dea.codigo}</td>
                        <td className="p-3 text-sm text-slate-600">{dea.tipo}</td>
                        <td className="p-3 text-sm text-slate-600">{dea.ubicacion}</td>
                        <td className="p-3 text-center">{dea.accesible24h ? <span className="text-green-600">✓</span> : <span className="text-slate-300">✗</span>}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${dea.estado === 'operativo' ? 'bg-green-100 text-green-700' : dea.estado === 'revision_pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {dea.estado === 'operativo' ? 'Operativo' : dea.estado === 'revision_pendiente' ? 'Rev. Pendiente' : 'Fuera Servicio'}
                          </span>
                        </td>
                        <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => setDEASeleccionado(dea)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"><Edit size={16} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {showNuevoArticulo && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoArticulo(false)}><div className="bg-white rounded-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}><div className="bg-purple-600 p-5 text-white flex justify-between items-center"><h2 className="text-xl font-bold">Nuevo Artículo</h2><button onClick={() => setShowNuevoArticulo(false)}><X size={24} /></button></div><p className="p-6 text-slate-500">Formulario de nuevo artículo aquí</p></div></div>}
      
      {showNuevaPeticion && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevaPeticion(false)}><div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}><div className="bg-blue-600 p-5 text-white flex justify-between items-center"><h2 className="text-xl font-bold">Nueva Petición</h2><button onClick={() => setShowNuevaPeticion(false)}><X size={24} /></button></div><p className="p-6 text-slate-500">Formulario de nueva petición aquí</p></div></div>}
      
      {showGestionFamilias && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowGestionFamilias(false)}><div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}><div className="bg-slate-700 p-5 text-white flex justify-between items-center"><h2 className="text-xl font-bold">Gestión de Familias</h2><button onClick={() => setShowGestionFamilias(false)}><X size={24} /></button></div><p className="p-6 text-slate-500">Gestión de familias aquí</p></div></div>}
      
      {showNuevoDEA && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoDEA(false)}><div className="bg-white rounded-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}><div className="bg-cyan-600 p-5 text-white flex justify-between items-center"><h2 className="text-xl font-bold">Nuevo DEA</h2><button onClick={() => setShowNuevoDEA(false)}><X size={24} /></button></div><p className="p-6 text-slate-500">Formulario de nuevo DEA aquí</p></div></div>}
    </div>
  );
}