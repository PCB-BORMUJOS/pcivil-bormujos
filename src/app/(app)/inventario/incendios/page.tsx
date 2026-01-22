'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import {
  Flame, Package, Search, AlertTriangle, Plus, RefreshCw, Building2, Shield, Droplet, MapPin,
  Edit, Trash2, Eye, X, Save, ArrowLeft, ShoppingCart, Layers, Clock, Check, CheckCircle,
  Ban, Filter, User, Building, Calendar, History, Send
} from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

const createHidranteIcon = (tipo: string, estado: string) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  
  // Color del borde según estado
  const borderColor = estado === 'operativo' ? '#22c55e' : estado === 'averiado' ? '#f59e0b' : '#ef4444';
  const shadowColor = estado === 'operativo' ? 'rgba(34, 197, 94, 0.4)' : estado === 'averiado' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  
  return L.divIcon({
    className: 'custom-hidrante-icon',
    html: `
      <div style="
        position: relative;
        width: 48px; 
        height: 48px; 
        border-radius: 50%; 
        border: 4px solid ${borderColor}; 
        background: white;
        box-shadow: 0 4px 12px ${shadowColor}, 0 0 0 2px white; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        overflow: hidden;
      ">
        <img src="/images/hidrante.png" alt="hidrante" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

const TIPOS_EQUIPO_ICONS: Record<string, string> = {
  extintor: '🧯', bie: '🚿', detector: '🔔', pulsador: '🔴', alarma: '📢', señalizacion: '🪧',
};

const TIPOS_EQUIPO_LABELS: Record<string, string> = {
  extintor: 'Extintor', bie: 'BIE', detector: 'Detector', pulsador: 'Pulsador', 
  alarma: 'Alarma/Sirena', señalizacion: 'Señalización',
};

interface Articulo {
  id: string; codigo: string; nombre: string; descripcion?: string;
  stockActual: number; stockMinimo: number; unidad: string;
  familia: { nombre: string; id: string };
}
interface Familia { id: string; nombre: string; slug: string; }
interface Edificio { id: string; nombre: string; direccion: string | null; responsable?: string | null; telefono?: string | null; _count?: { equiposECI: number }; }
interface EquipoECI {
  id: string; tipo: string; subtipo: string | null; ubicacion: string; numeroSerie: string | null;
  estado: string; fechaInstalacion: string | null; proximaRevision: string | null;
  edificio: Edificio; edificioId: string;
}
interface Hidrante {
  id: string; codigo: string; tipo: string; ubicacion: string;
  latitud: number | null; longitud: number | null; presion: number | null;
  caudal: number | null; estado: string;
}

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

const AREAS_NOMBRE: Record<string, string> = {
  'incendios': 'Incendios',
  'socorrismo': 'Socorrismo',
  'logistica': 'Logística',
};

export default function IncendiosPage() {
  const [mainTab, setMainTab] = useState<'inventario' | 'eci-edificios' | 'inventario-eci' | 'hidrantes'>('inventario');
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock');
  
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [equiposECI, setEquiposECI] = useState<EquipoECI[]>([]);
  const [todosEquiposECI, setTodosEquiposECI] = useState<EquipoECI[]>([]);
  const [hidrantes, setHidrantes] = useState<Hidrante[]>([]);
  const [selectedEdificio, setSelectedEdificio] = useState<Edificio | null>(null);
  
  const [categoriaIncendios, setCategoriaIncendios] = useState<string | null>(null);
  const [statsArticulos, setStatsArticulos] = useState({ totalArticulos: 0, stockBajo: 0 });
  const [equiposStats, setEquiposStats] = useState({ total: 0, operativos: 0, revisionPendiente: 0 });
  const [hidrantesStats, setHidrantesStats] = useState({ total: 0, operativos: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all');
  const [filterTipoEquipo, setFilterTipoEquipo] = useState('all');
  const [filterEdificio, setFilterEdificio] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [searchEquipos, setSearchEquipos] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false);
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false);
  const [showGestionFamilias, setShowGestionFamilias] = useState(false);
  const [showNuevoEdificio, setShowNuevoEdificio] = useState(false);
  const [showNuevoEquipo, setShowNuevoEquipo] = useState(false);
  const [showNuevoHidrante, setShowNuevoHidrante] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [peticiones, setPeticiones] = useState<any[]>([]);
  const [filtroPeticiones, setFiltroPeticiones] = useState("all");
  const [peticionStats, setPeticionStats] = useState({ total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 });
  
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [edificioSeleccionado, setEdificioSeleccionado] = useState<Edificio | null>(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoECI | null>(null);
  const [hidranteSeleccionado, setHidranteSeleccionado] = useState<Hidrante | null>(null);
  // ===== USE EFFECTS =====
  useEffect(() => {
    cargarDatos();
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (inventoryTab === 'peticiones') {
      cargarPeticiones();
    }
  }, [inventoryTab, filtroPeticiones]);
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resArt, resEd, resEq, resHid, resCat] = await Promise.all([
        fetch("/api/logistica?inventario=incendios"),
        fetch("/api/logistica?tipo=edificios"),
        fetch("/api/logistica?tipo=equipos-eci"),
        fetch("/api/logistica?tipo=hidrantes"),
        fetch("/api/logistica?tipo=categoria&slug=incendios")
      ]);
      const dataArt = await resArt.json();
      const dataEd = await resEd.json();
      const dataEq = await resEq.json();
      const dataHid = await resHid.json();
      const dataCat = await resCat.json();
      
      setArticulos(dataArt.articulos || []);
      setFamilias(dataArt.familias || []);
      if (dataCat.categoria?.id) {
        setCategoriaIncendios(dataCat.categoria.id);
      } else if (dataArt.familias && dataArt.familias.length > 0 && dataArt.familias[0].categoria) {
        setCategoriaIncendios(dataArt.familias[0].categoria.id);
      }
      setStatsArticulos({ totalArticulos: dataArt.stats?.totalArticulos || 0, stockBajo: dataArt.stats?.stockBajo || 0 });
      setEdificios(dataEd.edificios || []);
      setTodosEquiposECI(dataEq.equipos || []);
      setEquiposStats({ total: dataEq.stats?.total || 0, operativos: dataEq.stats?.operativos || 0, revisionPendiente: dataEq.stats?.revisionPendiente || 0 });
      setHidrantes(dataHid.hidrantes || []);
      setHidrantesStats({ total: dataHid.stats?.total || 0, operativos: dataHid.stats?.operativos || 0 });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };
  const cargarEquiposEdificio = async (edificioId: string) => {
    try {
      const res = await fetch(`/api/logistica?tipo=equipos-eci&edificioId=${edificioId}`);
      const data = await res.json();
      setEquiposECI(data.equipos || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ===== FUNCIONES DE GUARDADO =====

  const cargarPeticiones = async () => {
    try {
      const params = new URLSearchParams();
      params.append("area", "incendios");
      if (filtroPeticiones !== "all") params.append("estado", filtroPeticiones);
      const res = await fetch(`/api/logistica/peticiones?${params.toString()}`);
      const data = await res.json();
      setPeticiones(data.peticiones || []);
      setPeticionStats(data.stats || { total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 });
    } catch (error) {
      console.error("Error cargando peticiones:", error);
    }
  };
  const guardarArticulo = async (formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'articulo', ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const guardarEdificio = async (formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'edificio', ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const guardarEquipoECI = async (formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'equipo-eci', ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const guardarHidrante = async (formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'hidrante', ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const editarArticulo = async (id: string, formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'articulo', id, ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const editarEdificio = async (id: string, formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'edificio', id, ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const editarEquipo = async (id: string, formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'equipo-eci', id, ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const editarHidrante = async (id: string, formData: any) => {
    try {
      const res = await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'hidrante', id, ...formData })
      })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const eliminarItem = async (tipo: string, id: string) => {
    try {
      const res = await fetch(`/api/logistica?tipo=${tipo}&id=${id}`, { method: 'DELETE' })
      if (res.ok) { await cargarDatos(); return true }
      return false
    } catch (error) {
      console.error('Error:', error)
      return false
    }
  }

  const centerPosition: [number, number] = [37.3710, -6.0710];
  
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = searchTerm === '' || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || a.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia.id === selectedFamiliaFilter;
    return matchSearch && matchFamilia;
  });
  
  const equiposFiltrados = todosEquiposECI.filter(eq => {
    const matchTipo = filterTipoEquipo === 'all' || eq.tipo === filterTipoEquipo;
    const matchEdificio = filterEdificio === 'all' || eq.edificioId === filterEdificio;
    const matchEstado = filterEstado === 'all' || eq.estado === filterEstado;
    const matchSearch = searchEquipos === '' || eq.ubicacion.toLowerCase().includes(searchEquipos.toLowerCase()) || (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(searchEquipos.toLowerCase()));
    return matchTipo && matchEdificio && matchEstado && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl">
            <Flame className="text-red-600" size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">INCENDIOS</p>
            <h1 className="text-2xl font-bold text-slate-800">Gestión y Equipamiento</h1>
            <p className="text-slate-500 text-sm">Inventario, equipos ECI y red de hidrantes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cargarDatos} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowNuevaPeticion(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
            <ShoppingCart size={18} />
            Nueva Petición
          </button>
          <button onClick={() => setShowNuevoArticulo(true)} className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium">
            <Plus size={18} />
            Nuevo Artículo
          </button>
          <button onClick={() => setShowNuevoHidrante(true)} className="px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 font-medium">
            <Droplet size={18} />
            Nuevo Hidrante
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Material del Área</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{statsArticulos.totalArticulos}</h3>
            </div>
            <div className="bg-purple-100 p-2.5 rounded-xl">
              <Package size={22} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Stock Bajo</p>
              <h3 className={`text-3xl font-bold mt-1 ${statsArticulos.stockBajo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {statsArticulos.stockBajo}
              </h3>
            </div>
            <div className="bg-yellow-100 p-2.5 rounded-xl">
              <AlertTriangle size={22} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Equipos ECI</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{equiposStats.total}</h3>
            </div>
            <div className="bg-red-100 p-2.5 rounded-xl">
              <Shield size={22} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Hidrantes</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{hidrantesStats.total}</h3>
            </div>
            <div className="bg-cyan-100 p-2.5 rounded-xl">
              <Droplet size={22} className="text-cyan-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Edificios</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{edificios.length}</h3>
            </div>
            <div className="bg-slate-100 p-2.5 rounded-xl">
              <Building2 size={22} className="text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { id: 'inventario', label: 'Inventario del Área', icon: Package },
            { id: 'eci-edificios', label: 'ECI Edificios', icon: Building2 },
            { id: 'inventario-eci', label: 'Inventario ECI', icon: Layers },
            { id: 'hidrantes', label: 'Red de Hidrantes', icon: Droplet },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                mainTab === tab.id 
                  ? 'border-red-500 text-red-600 bg-red-50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: INVENTARIO DEL ÁREA */}
        {mainTab === 'inventario' && (
          <div>
            <div className="flex border-b border-slate-200 bg-slate-50">
              {[
                { id: 'stock', label: 'Stock', icon: Package },
                { id: 'peticiones', label: 'Peticiones', icon: ShoppingCart },
                { id: 'movimientos', label: 'Movimientos', icon: RefreshCw },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setInventoryTab(tab.id as any); if (tab.id === 'peticiones') cargarPeticiones(); }}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                    inventoryTab === tab.id 
                      ? 'border-purple-500 text-purple-600 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {inventoryTab === 'stock' && (
                <div>
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text"
                        placeholder="Buscar artículos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <select
                      value={selectedFamiliaFilter}
                      onChange={(e) => setSelectedFamiliaFilter(e.target.value)}
                      className="px-4 py-2.5 border border-slate-200 rounded-lg"
                    >
                      <option value="all">Todas las familias</option>
                      {familias.map(fam => (
                        <option key={fam.id} value={fam.id}>{fam.nombre}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowGestionFamilias(true)} className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
                      <Layers size={18} />
                      Familias
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-12 text-slate-400">
                      <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                      <p>Cargando...</p>
                    </div>
                  ) : articulosFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Package size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No hay artículos</p>
                    </div>
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
                            <td className="p-3">
                              <p className="font-medium text-slate-800">{art.nombre}</p>
                              <p className="text-xs text-slate-500">Cód: {art.codigo}</p>
                            </td>
                            <td className="p-3 text-sm text-slate-600">{art.familia?.nombre || '-'}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-slate-800">{art.stockActual}</span>
                              <span className="text-slate-400 text-sm ml-1">{art.unidad}</span>
                            </td>
                            <td className="p-3 text-center">
                              {art.stockActual <= art.stockMinimo ? (
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">⚠ Bajo</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">✓ OK</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => setArticuloSeleccionado(art)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Ver detalles">
                                  <Eye size={16} />
                                </button>
                                <button onClick={() => setArticuloSeleccionado(art)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Editar">
                                  <Edit size={16} />
                                </button>
                                <button onClick={async () => { if(confirm(`¿Eliminar "${art.nombre}"?`)) { await eliminarItem('articulo', art.id); } }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                                  <Trash2 size={16} />
                                </button>
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
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Filter size={18} className="text-slate-400" />
                      <select value={filtroPeticiones} onChange={e => setFiltroPeticiones(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        <option value="all">Todos los estados</option>
                        <option value="pendiente">Pendientes ({peticionStats.pendientes})</option>
                        <option value="aprobada">Aprobadas ({peticionStats.aprobadas})</option>
                        <option value="en_compra">En Compra ({peticionStats.enCompra})</option>
                        <option value="recibida">Recibidas ({peticionStats.recibidas})</option>
                        <option value="rechazada">Rechazadas ({peticionStats.rechazadas})</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> {peticionStats.pendientes} Pendientes</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400"></span> {peticionStats.aprobadas} Aprobadas</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400"></span> {peticionStats.enCompra} En Compra</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400"></span> {peticionStats.recibidas} Recibidas</span>
                    </div>
                  </div>
                  {peticiones.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay peticiones de material</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {peticiones.map(peticion => {
                        const estadoInfo = ESTADOS_PETICION[peticion.estado as keyof typeof ESTADOS_PETICION] || ESTADOS_PETICION.pendiente;
                        const prioridadInfo = PRIORIDADES[peticion.prioridad as keyof typeof PRIORIDADES] || PRIORIDADES.normal;
                        const EstadoIcon = estadoInfo.icon;
                        return (
                          <div key={peticion.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                  <Flame size={24} className="text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800">{peticion.numero}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${estadoInfo.color}`}>
                                      <EstadoIcon size={12} className="inline mr-1" />{estadoInfo.label}
                                    </span>
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
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                              <div className={`flex items-center gap-1 text-xs ${peticion.fechaSolicitud ? 'text-green-600' : 'text-slate-300'}`}>
                                <div className={`w-2 h-2 rounded-full ${peticion.fechaSolicitud ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                Solicitada
                              </div>
                              <div className="flex-1 h-px bg-slate-200"></div>
                              <div className={`flex items-center gap-1 text-xs ${peticion.fechaAprobacion ? 'text-green-600' : 'text-slate-300'}`}>
                                <div className={`w-2 h-2 rounded-full ${peticion.fechaAprobacion ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                Aprobada
                              </div>
                              <div className="flex-1 h-px bg-slate-200"></div>
                              <div className={`flex items-center gap-1 text-xs ${peticion.fechaCompra ? 'text-green-600' : 'text-slate-300'}`}>
                                <div className={`w-2 h-2 rounded-full ${peticion.fechaCompra ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                En Compra
                              </div>
                              <div className="flex-1 h-px bg-slate-200"></div>
                              <div className={`flex items-center gap-1 text-xs ${peticion.fechaRecepcion ? 'text-green-600' : 'text-slate-300'}`}>
                                <div className={`w-2 h-2 rounded-full ${peticion.fechaRecepcion ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                Recibida
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {inventoryTab === 'movimientos' && (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Próximamente</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: ECI EDIFICIOS */}
        {mainTab === 'eci-edificios' && (
          <div className="p-6">
            {selectedEdificio ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => { setSelectedEdificio(null); cargarDatos(); }}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedEdificio.nombre}</h2>
                      {selectedEdificio.direccion && (
                        <p className="text-sm text-slate-500">{selectedEdificio.direccion}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setShowNuevoEquipo(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <Plus size={18} />
                    Añadir Equipo
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Total Equipos</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{equiposECI.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 font-medium">Operativos</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {equiposECI.filter(e => e.estado === 'operativo').length}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-600 font-medium">Revisión Pendiente</p>
                    <p className="text-2xl font-bold text-yellow-700 mt-1">
                      {equiposECI.filter(e => e.estado === 'revision_pendiente').length}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-xs text-red-600 font-medium">Fuera de Servicio</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">
                      {equiposECI.filter(e => e.estado === 'fuera_servicio').length}
                    </p>
                  </div>
                </div>

                {equiposECI.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Shield size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay equipos</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-y border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                        <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                        <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">N° Serie</th>
                        <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                        <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Próx. Revisión</th>
                        <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equiposECI.map(eq => (
                        <tr key={eq.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{TIPOS_EQUIPO_ICONS[eq.tipo] || '📦'}</span>
                              <div>
                                <p className="font-medium text-slate-800">{TIPOS_EQUIPO_LABELS[eq.tipo]}</p>
                                {eq.subtipo && <p className="text-xs text-slate-500">{eq.subtipo}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-slate-600">{eq.ubicacion}</td>
                          <td className="p-3 text-sm text-slate-600">{eq.numeroSerie || '-'}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              eq.estado === 'operativo' ? 'bg-green-100 text-green-700' :
                              eq.estado === 'revision_pendiente' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {eq.estado === 'operativo' ? 'Operativo' :
                               eq.estado === 'revision_pendiente' ? 'Rev. Pendiente' :
                               'Fuera Servicio'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-sm text-slate-600">
                            {eq.proximaRevision ? new Date(eq.proximaRevision).toLocaleDateString('es-ES') : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => setEquipoSeleccionado(eq)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Editar equipo">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => { if(confirm(`¿Eliminar equipo en "${eq.ubicacion}"?`)) alert('Eliminando...'); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Edificios Municipales</h2>
                  <button onClick={() => setShowNuevoEdificio(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <Plus size={18} />
                    Nuevo Edificio
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {edificios.map(ed => (
                    <div key={ed.id} className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-3">
                        <div className="bg-slate-100 p-3 rounded-lg">
                          <Building2 size={24} className="text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800">{ed.nombre}</h4>
                          {ed.direccion && <p className="text-xs text-slate-500 mt-1">{ed.direccion}</p>}
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Shield size={14} className="text-slate-400" />
                              <span className="text-sm font-medium text-slate-600">
                                {ed._count?.equiposECI || 0} equipos
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => { setSelectedEdificio(ed); cargarEquiposEdificio(ed.id); }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                                title="Ver equipos"
                              >
                                <Eye size={14} />
                              </button>
                              <button onClick={() => setEdificioSeleccionado(ed)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Editar">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => { if(confirm(`¿Eliminar edificio "${ed.nombre}"?`)) alert('Eliminando...'); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: INVENTARIO ECI CONSOLIDADO */}
        {mainTab === 'inventario-eci' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Inventario ECI Consolidado</h2>
              <p className="text-sm text-slate-500">Total: {todosEquiposECI.length} equipos en {edificios.length} edificios</p>
            </div>

            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por ubicación o n° serie..."
                  value={searchEquipos}
                  onChange={(e) => setSearchEquipos(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={filterTipoEquipo}
                onChange={(e) => setFilterTipoEquipo(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg"
              >
                <option value="all">Todos los tipos</option>
                {Object.keys(TIPOS_EQUIPO_LABELS).map(tipo => (
                  <option key={tipo} value={tipo}>{TIPOS_EQUIPO_LABELS[tipo]}</option>
                ))}
              </select>
              <select
                value={filterEdificio}
                onChange={(e) => setFilterEdificio(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg"
              >
                <option value="all">Todos los edificios</option>
                {edificios.map(ed => (
                  <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                ))}
              </select>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg"
              >
                <option value="all">Todos los estados</option>
                <option value="operativo">Operativo</option>
                <option value="revision_pendiente">Revisión Pendiente</option>
                <option value="fuera_servicio">Fuera de Servicio</option>
              </select>
            </div>

            {equiposFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Shield size={48} className="mx-auto mb-4 opacity-50" />
                <p>No se encontraron equipos</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Edificio</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">N° Serie</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Instalación</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Próx. Revisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equiposFiltrados.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TIPOS_EQUIPO_ICONS[eq.tipo] || '📦'}</span>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{TIPOS_EQUIPO_LABELS[eq.tipo]}</p>
                            {eq.subtipo && <p className="text-xs text-slate-500">{eq.subtipo}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-slate-800 text-sm">{eq.edificio.nombre}</p>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{eq.ubicacion}</td>
                      <td className="p-3 text-sm text-slate-600">{eq.numeroSerie || '-'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          eq.estado === 'operativo' ? 'bg-green-100 text-green-700' :
                          eq.estado === 'revision_pendiente' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {eq.estado === 'operativo' ? 'Operativo' :
                           eq.estado === 'revision_pendiente' ? 'Rev. Pend.' :
                           'Fuera Servicio'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm text-slate-600">
                        {eq.fechaInstalacion ? new Date(eq.fechaInstalacion).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="p-3 text-center text-sm text-slate-600">
                        {eq.proximaRevision ? new Date(eq.proximaRevision).toLocaleDateString('es-ES') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB: RED DE HIDRANTES */}
        {mainTab === 'hidrantes' && (
          <div>
            <div className="border-b border-slate-200">
              <div className="p-4 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={18} className="text-cyan-600" /> Mapa de Hidrantes - Bormujos
                </h3>
                <button onClick={() => setShowNuevoHidrante(true)} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2">
                  <Plus size={18} />
                  Nuevo Hidrante
                </button>
              </div>
              <div className="h-[400px] relative z-0">
  {mapReady && hidrantes.length > 0 && (
    <MapContainer center={centerPosition} zoom={15} style={{ height: '100%', width: '100%' }} key="hidrantes-map">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {hidrantes.filter(h => h.latitud && h.longitud).map((hid) => (
                      <Marker 
                        key={hid.id} 
                        position={[hid.latitud!, hid.longitud!]}
                        icon={createHidranteIcon(hid.tipo, hid.estado) || undefined}
                      >
                        <Popup>
                          <div className="text-center min-w-[150px]">
                            <strong className="text-lg block">{hid.codigo}</strong>
                            <p className="text-sm text-slate-600">{hid.tipo}</p>
                            <p className="text-xs text-slate-500 mt-1">{hid.ubicacion}</p>
                            {hid.presion && <p className="text-xs mt-1">Presión: {hid.presion} bar</p>}
                            {hid.caudal && <p className="text-xs">Caudal: {hid.caudal} l/min</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </div>

            <div className="p-4">
              {hidrantes.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Droplet size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay hidrantes</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Latitud</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Longitud</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Presión</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Caudal</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hidrantes.map(hid => (
                      <tr key={hid.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{hid.codigo}</td>
                        <td className="p-3 text-sm text-slate-600">{hid.tipo}</td>
                        <td className="p-3 text-sm text-slate-600">{hid.ubicacion}</td>
                        <td className="p-3 text-center text-sm text-slate-600">
                          {hid.latitud ? hid.latitud.toFixed(8) : '-'}
                        </td>
                        <td className="p-3 text-center text-sm text-slate-600">
                          {hid.longitud ? hid.longitud.toFixed(8) : '-'}
                        </td>
                        <td className="p-3 text-center text-sm">{hid.presion ? `${hid.presion} bar` : '-'}</td>
                        <td className="p-3 text-center text-sm">{hid.caudal ? `${hid.caudal} l/min` : '-'}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            hid.estado === 'operativo' ? 'bg-green-100 text-green-700' : 
                            hid.estado === 'averiado' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {hid.estado}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => setHidranteSeleccionado(hid)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Editar hidrante">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => { if(confirm(`¿Eliminar hidrante "${hid.codigo}"?`)) alert('Eliminando...'); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

           {/* ========================================
          MODAL: NUEVO ARTÍCULO
          ======================================== */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoArticulo(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Artículo</h2>
              <button onClick={() => setShowNuevoArticulo(false)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
                nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
                descripcion: (form.elements.namedItem('descripcion') as HTMLTextAreaElement).value,
                stockActual: (form.elements.namedItem('stockActual') as HTMLInputElement).value,
                stockMinimo: (form.elements.namedItem('stockMinimo') as HTMLInputElement).value,
                unidad: (form.elements.namedItem('unidad') as HTMLSelectElement).value,
                familiaId: (form.elements.namedItem('familiaId') as HTMLSelectElement).value
              }
              const success = await guardarArticulo(formData)
              if (success) {
                setShowNuevoArticulo(false)
                form.reset()
              }
            }} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código</label>
                  <input name="codigo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ej: EXT-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Familia *</label>
                  <select name="familiaId" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                    <option value="">Seleccionar familia...</option>
                    {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                <input name="nombre" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Nombre del artículo" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                <textarea name="descripcion" className="w-full border border-slate-300 rounded-lg p-2.5" rows={3} placeholder="Descripción opcional..."></textarea>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock Inicial</label>
                  <input name="stockActual" type="number" defaultValue="0" className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock Mínimo</label>
                  <input name="stockMinimo" type="number" defaultValue="5" className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unidad</label>
                  <select name="unidad" className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option>Unidad</option>
                    <option>Pack</option>
                    <option>Caja</option>
                    <option>Saco</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">Crear Artículo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: VER/EDITAR ARTÍCULO
          ======================================== */}
      {articuloSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setArticuloSeleccionado(null)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Artículo</h2>
              <button onClick={() => setArticuloSeleccionado(null)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
                nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
                descripcion: (form.elements.namedItem('descripcion') as HTMLTextAreaElement).value,
                stockActual: parseInt((form.elements.namedItem('stockActual') as HTMLInputElement).value),
                stockMinimo: parseInt((form.elements.namedItem('stockMinimo') as HTMLInputElement).value),
                unidad: (form.elements.namedItem('unidad') as HTMLSelectElement).value,
                familiaId: (form.elements.namedItem('familiaId') as HTMLSelectElement).value
              }
              const success = await editarArticulo(articuloSeleccionado.id, formData)
              if (success) setArticuloSeleccionado(null)
            }} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código</label>
                  <input name="codigo" type="text" defaultValue={articuloSeleccionado.codigo} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Familia *</label>
                  <select name="familiaId" defaultValue={articuloSeleccionado.familia.id} className="w-full border border-slate-300 rounded-lg p-2.5" required>
                    <option value="">Seleccionar familia...</option>
                    {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                <input name="nombre" type="text" defaultValue={articuloSeleccionado.nombre} className="w-full border border-slate-300 rounded-lg p-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                <textarea name="descripcion" defaultValue={articuloSeleccionado.descripcion || ''} className="w-full border border-slate-300 rounded-lg p-2.5" rows={3}></textarea>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock Actual</label>
                  <input name="stockActual" type="number" defaultValue={articuloSeleccionado.stockActual} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock Mínimo</label>
                  <input name="stockMinimo" type="number" defaultValue={articuloSeleccionado.stockMinimo} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unidad</label>
                  <select name="unidad" defaultValue={articuloSeleccionado.unidad} className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option>Unidad</option>
                    <option>Pack</option>
                    <option>Caja</option>
                    <option>Saco</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setArticuloSeleccionado(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: NUEVA PETICIÓN
          ======================================== */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevaPeticion(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nueva Petición</h2>
              <button onClick={() => setShowNuevaPeticion(false)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const articuloIdInput = (form.elements.namedItem('articuloId') as HTMLSelectElement)
              const articuloSeleccionado = articulos.find(a => a.id === articuloIdInput.value)
              const formData = {
                articuloId: articuloIdInput.value,
                nombreArticulo: articuloSeleccionado?.nombre || 'Material solicitado',
                cantidad: parseInt((form.elements.namedItem('cantidad') as HTMLInputElement).value),
                prioridad: (form.elements.namedItem('prioridad') as HTMLSelectElement).value,
                motivo: (form.elements.namedItem('motivo') as HTMLTextAreaElement).value,
                areaOrigen: 'incendios'
              }
              try {
                const res = await fetch('/api/logistica', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: 'peticion', ...formData })
                })
                if (res.ok) {
                  setShowNuevaPeticion(false)
                  form.reset()
                  alert('Petición creada correctamente')
                }
              } catch (error) {
                console.error('Error:', error)
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Artículo *</label>
                <select name="articuloId" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                  <option value="">Seleccionar artículo...</option>
                  {articulos.map(art => (
                    <option key={art.id} value={art.id}>{art.nombre} (Stock: {art.stockActual})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad *</label>
                  <input name="cantidad" type="number" min="1" defaultValue="1" className="w-full border border-slate-300 rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prioridad</label>
                  <select name="prioridad" className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo</label>
                <textarea name="motivo" className="w-full border border-slate-300 rounded-lg p-2.5" rows={3} placeholder="Razón de la petición..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Crear Petición</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: GESTIÓN DE FAMILIAS (solo lectura por ahora)
          ======================================== */}
      {/* ========================================
          MODAL: GESTIÓN DE FAMILIAS
          ======================================== */}
      {showGestionFamilias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowGestionFamilias(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-700 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Gestión de Familias</h2>
              <button onClick={() => setShowGestionFamilias(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {/* Formulario para nueva familia */}
              <form onSubmit={async (e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const nombreInput = form.elements.namedItem('nombreFamilia') as HTMLInputElement
                const nombre = nombreInput.value.trim()
                
                if (!nombre) return
                if (!categoriaIncendios) {
                  alert("Error: No se pudo cargar la categoría de incendios")
                  return
                }
                
                try {
                  const res = await fetch('/api/logistica', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipo: 'familia', nombre, categoriaId: categoriaIncendios })
                  })
                  if (res.ok) {
                    await cargarDatos()
                    nombreInput.value = ''
                  }
                } catch (error) {
                  console.error('Error:', error)
                }
              }} className="mb-6 flex gap-2">
                <input 
                  name="nombreFamilia"
                  type="text" 
                  placeholder="Nueva familia..." 
                  className="flex-1 border border-slate-300 rounded-lg p-2.5"
                />
                <button type="submit" className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
                  <Plus size={18} />
                  Añadir
                </button>
              </form>

              {/* Lista de familias */}
              <div className="space-y-2">
                {familias.map(fam => (
                  <div key={fam.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center">
                    <div className="flex-1">
                      <span className="font-medium text-slate-700">{fam.nombre}</span>
                      <span className="text-sm text-slate-500 ml-2">
                        ({articulos.filter(a => a.familia.id === fam.id).length} artículos)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          const nuevoNombre = prompt('Nuevo nombre de la familia:', fam.nombre)
                          if (nuevoNombre && nuevoNombre.trim() !== fam.nombre) {
                            try {
                              const res = await fetch('/api/logistica', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tipo: 'familia', id: fam.id, nombre: nuevoNombre.trim() })
                              })
                              if (res.ok) await cargarDatos()
                            } catch (error) {
                              console.error('Error:', error)
                            }
                          }
                        }}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" 
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          const articulosEnFamilia = articulos.filter(a => a.familia.id === fam.id).length
                          if (articulosEnFamilia > 0) {
                            alert(`No se puede eliminar. Hay ${articulosEnFamilia} artículos en esta familia.`)
                            return
                          }
                          if (confirm(`¿Eliminar familia "${fam.nombre}"?`)) {
                            try {
                              const res = await fetch(`/api/logistica?tipo=familia&id=${fam.id}`, {
                                method: 'DELETE'
                              })
                              if (res.ok) await cargarDatos()
                            } catch (error) {
                              console.error('Error:', error)
                            }
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <button onClick={() => setShowGestionFamilias(false)} className="w-full px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: NUEVO EDIFICIO
          ======================================== */}
      {showNuevoEdificio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoEdificio(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Edificio Municipal</h2>
              <button onClick={() => setShowNuevoEdificio(false)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
                direccion: (form.elements.namedItem('direccion') as HTMLInputElement).value,
                responsable: (form.elements.namedItem('responsable') as HTMLInputElement).value,
                telefono: (form.elements.namedItem('telefono') as HTMLInputElement).value
              }
              const success = await guardarEdificio(formData)
              if (success) {
                setShowNuevoEdificio(false)
                form.reset()
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Edificio *</label>
                <input name="nombre" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ej: Ayuntamiento" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dirección</label>
                <input name="direccion" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Calle, número..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Responsable</label>
                  <input name="responsable" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Nombre responsable" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
                  <input name="telefono" type="tel" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Teléfono contacto" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevoEdificio(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Crear Edificio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: NUEVO EQUIPO ECI
          ======================================== */}
      {showNuevoEquipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoEquipo(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Equipo ECI</h2>
              <button onClick={() => setShowNuevoEquipo(false)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                edificioId: (form.elements.namedItem('edificioId') as HTMLSelectElement).value,
                tipoEquipo: (form.elements.namedItem('tipoEquipo') as HTMLSelectElement).value,
                subtipo: (form.elements.namedItem('subtipo') as HTMLInputElement).value,
                ubicacion: (form.elements.namedItem('ubicacion') as HTMLInputElement).value,
                numeroSerie: (form.elements.namedItem('numeroSerie') as HTMLInputElement).value,
                estado: (form.elements.namedItem('estado') as HTMLSelectElement).value,
                observaciones: (form.elements.namedItem('observaciones') as HTMLTextAreaElement).value
              }
              const success = await guardarEquipoECI(formData)
              if (success) {
                setShowNuevoEquipo(false)
                form.reset()
              }
            }} className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Edificio *</label>
                <select name="edificioId" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                  <option value="">Seleccionar edificio...</option>
                  {edificios.map(ed => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                  <select name="tipoEquipo" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                    <option value="">Seleccionar...</option>
                    <option value="extintor">🧯 Extintor</option>
                    <option value="bie">🚿 BIE</option>
                    <option value="detector">🔔 Detector</option>
                    <option value="pulsador">🔴 Pulsador</option>
                    <option value="alarma">📢 Alarma/Sirena</option>
                    <option value="señalizacion">🪧 Señalización</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subtipo</label>
                  <input name="subtipo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ej: CO2, Polvo ABC..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación *</label>
                <input name="ubicacion" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Planta, pasillo, sala..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nº Serie</label>
                  <input name="numeroSerie" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Número de serie" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                  <select name="estado" className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="operativo">Operativo</option>
                    <option value="revision_pendiente">Revisión Pendiente</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones</label>
                <textarea name="observaciones" className="w-full border border-slate-300 rounded-lg p-2.5" rows={2} placeholder="Notas adicionales..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevoEquipo(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Crear Equipo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: NUEVO HIDRANTE
          ======================================== */}
      {showNuevoHidrante && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoHidrante(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-cyan-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Hidrante</h2>
              <button onClick={() => setShowNuevoHidrante(false)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
                tipo: (form.elements.namedItem('tipo') as HTMLSelectElement).value,
                ubicacion: (form.elements.namedItem('ubicacion') as HTMLInputElement).value,
                latitud: (form.elements.namedItem('latitud') as HTMLInputElement).value,
                longitud: (form.elements.namedItem('longitud') as HTMLInputElement).value,
                presion: (form.elements.namedItem('presion') as HTMLInputElement).value,
                caudal: (form.elements.namedItem('caudal') as HTMLInputElement).value,
                estado: (form.elements.namedItem('estado') as HTMLSelectElement).value
              }
              const success = await guardarHidrante(formData)
              if (success) {
                setShowNuevoHidrante(false)
                form.reset()
              }
            }} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código *</label>
                  <input name="codigo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="H-001" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                  <select name="tipo" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                    <option value="columna">Columna</option>
                    <option value="arqueta">Arqueta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                  <select name="estado" className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="operativo">Operativo</option>
                    <option value="averiado">Averiado</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación *</label>
                <input name="ubicacion" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Calle, número..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Latitud</label>
                  <input name="latitud" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="37.371234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Longitud</label>
                  <input name="longitud" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="-6.072000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Presión (bar)</label>
                  <input name="presion" type="number" step="0.1" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="3.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Caudal (l/min)</label>
                  <input name="caudal" type="number" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="1500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevoHidrante(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium">Crear Hidrante</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: EDITAR EDIFICIO
          ======================================== */}
      {edificioSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEdificioSeleccionado(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Edificio</h2>
              <button onClick={() => setEdificioSeleccionado(null)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
                direccion: (form.elements.namedItem('direccion') as HTMLInputElement).value,
                responsable: (form.elements.namedItem('responsable') as HTMLInputElement).value,
                telefono: (form.elements.namedItem('telefono') as HTMLInputElement).value
              }
              const success = await editarEdificio(edificioSeleccionado.id, formData)
              if (success) setEdificioSeleccionado(null)
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre</label>
                <input name="nombre" type="text" defaultValue={edificioSeleccionado.nombre} className="w-full border border-slate-300 rounded-lg p-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dirección</label>
                <input name="direccion" type="text" defaultValue={edificioSeleccionado.direccion || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Responsable</label>
                  <input name="responsable" type="text" defaultValue={edificioSeleccionado.responsable || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
                  <input name="telefono" type="tel" defaultValue={edificioSeleccionado.telefono || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEdificioSeleccionado(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: EDITAR EQUIPO ECI
          ======================================== */}
      {equipoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEquipoSeleccionado(null)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Equipo ECI</h2>
              <button onClick={() => setEquipoSeleccionado(null)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                tipo: (form.elements.namedItem('tipo') as HTMLSelectElement).value,
                subtipo: (form.elements.namedItem('subtipo') as HTMLInputElement).value,
                ubicacion: (form.elements.namedItem('ubicacion') as HTMLInputElement).value,
                numeroSerie: (form.elements.namedItem('numeroSerie') as HTMLInputElement).value,
                estado: (form.elements.namedItem('estado') as HTMLSelectElement).value
              }
              const success = await editarEquipo(equipoSeleccionado.id, formData)
              if (success) setEquipoSeleccionado(null)
            }} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                  <select name="tipo" defaultValue={equipoSeleccionado.tipo} className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="extintor">🧯 Extintor</option>
                    <option value="bie">🚿 BIE</option>
                    <option value="detector">🔔 Detector</option>
                    <option value="pulsador">🔴 Pulsador</option>
                    <option value="alarma">📢 Alarma/Sirena</option>
                    <option value="señalizacion">🪧 Señalización</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subtipo</label>
                  <input name="subtipo" type="text" defaultValue={equipoSeleccionado.subtipo || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación</label>
                <input name="ubicacion" type="text" defaultValue={equipoSeleccionado.ubicacion} className="w-full border border-slate-300 rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nº Serie</label>
                  <input name="numeroSerie" type="text" defaultValue={equipoSeleccionado.numeroSerie || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                  <select name="estado" defaultValue={equipoSeleccionado.estado} className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="operativo">Operativo</option>
                    <option value="revision_pendiente">Revisión Pendiente</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEquipoSeleccionado(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: EDITAR HIDRANTE
          ======================================== */}
      {hidranteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setHidranteSeleccionado(null)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-cyan-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Hidrante</h2>
              <button onClick={() => setHidranteSeleccionado(null)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
                tipo: (form.elements.namedItem('tipo') as HTMLSelectElement).value,
                ubicacion: (form.elements.namedItem('ubicacion') as HTMLInputElement).value,
                latitud: (form.elements.namedItem('latitud') as HTMLInputElement).value,
                longitud: (form.elements.namedItem('longitud') as HTMLInputElement).value,
                presion: (form.elements.namedItem('presion') as HTMLInputElement).value,
                caudal: (form.elements.namedItem('caudal') as HTMLInputElement).value,
                estado: (form.elements.namedItem('estado') as HTMLSelectElement).value
              }
              const success = await editarHidrante(hidranteSeleccionado.id, formData)
              if (success) setHidranteSeleccionado(null)
            }} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código</label>
                  <input name="codigo" type="text" defaultValue={hidranteSeleccionado.codigo} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                  <select name="tipo" defaultValue={hidranteSeleccionado.tipo} className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="columna">Columna</option>
                    <option value="arqueta">Arqueta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                  <select name="estado" defaultValue={hidranteSeleccionado.estado} className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="operativo">Operativo</option>
                    <option value="averiado">Averiado</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación</label>
                <input name="ubicacion" type="text" defaultValue={hidranteSeleccionado.ubicacion} className="w-full border border-slate-300 rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Latitud</label>
                  <input name="latitud" type="text" defaultValue={hidranteSeleccionado.latitud?.toFixed(8) || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Longitud</label>
                  <input name="longitud" type="text" defaultValue={hidranteSeleccionado.longitud?.toFixed(8) || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Presión (bar)</label>
                  <input name="presion" type="number" step="0.1" defaultValue={hidranteSeleccionado.presion || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Caudal (l/min)</label>
                  <input name="caudal" type="number" defaultValue={hidranteSeleccionado.caudal || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setHidranteSeleccionado(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                 <button type="submit" className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}