'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, Filter, AlertCircle, MapPin, Activity, Package, AlertTriangle, Building2, Eye, Edit, RefreshCw, ShoppingCart, Heart, Droplet, Calendar, User, Layers, Trash2, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Imports dinámicos para Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

// Interfaces
interface Articulo {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  stockActual: number
  stockMinimo: number
  unidad: string
  familia: {
    id: string
    nombre: string
  }
}

interface Familia {
  id: string
  nombre: string
  slug: string
}

interface Edificio {
  id: string
  nombre: string
  direccion?: string
}

interface DEA {
  id: string
  codigo: string
  tipo: string
  marca?: string
  modelo?: string
  numeroSerie?: string
  ubicacion: string
  latitud?: number
  longitud?: number
  estado: string
  accesible24h: boolean
  caducidadBateria?: string
  caducidadParches?: string
  caducidadPilas?: string
}

interface Peticion {
  id: string
  numero: string
  nombreArticulo: string
  cantidad: number
  unidad: string
  prioridad: string
  estado: string
  descripcion?: string
  fechaSolicitud: string
  solicitante: {
    id: string
    nombre: string
    apellidos: string
  }
}

// Constantes de estados
const ESTADOS_PETICION = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertCircle },
  aprobada: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: AlertCircle },
  en_compra: { label: 'En Compra', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: ShoppingCart },
  recibida: { label: 'Recibida', color: 'bg-green-100 text-green-700 border-green-300', icon: Package },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700 border-red-300', icon: X },
}

const PRIORIDADES = {
  baja: { label: 'Baja', color: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-600' },
}

export default function SocorrismoPage() {
  // Estados principales
  const [mainTab, setMainTab] = useState<'inventario' | 'deas' | 'botiquines'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const createDEAIcon = (estado: string) => {
    if (typeof window === 'undefined') return undefined
    
    // Importar L dinámicamente solo en el cliente
    const L = require('leaflet')
    
    const color = estado === 'operativo' ? '#10b981' : 
      estado === 'revision_pendiente' ? '#f59e0b' : '#ef4444'
    return L.divIcon({
      className: 'custom-dea-icon',
      html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
        <svg width="18" height="18" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
  }

  // Estados de datos
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [deas, setDeas] = useState<DEA[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [botiquines, setBotiquines] = useState<any[]>([])
  const [peticiones, setPeticiones] = useState<Peticion[]>([])
  const [categoriaSocorrismo, setCategoriaSocorrismo] = useState<string | null>(null)

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')

  // Estados de modales
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoDEA, setShowNuevoDEA] = useState(false)
  const [showNuevoBotiquin, setShowNuevoBotiquin] = useState(false)
  const [botiquinSeleccionado, setBotiquinSeleccionado] = useState<any>(null)
  const [showGestionItems, setShowGestionItems] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [deaSeleccionado, setDEASeleccionado] = useState<DEA | null>(null)

  // Stats
  const [statsArticulos, setStatsArticulos] = useState({ totalArticulos: 0, stockBajo: 0 })
  const [deasStats, setDeasStats] = useState({ total: 0, operativos: 0 })
  const [botiquinesStats, setBotiquinesStats] = useState({ total: 0, operativos: 0, revisionPendiente: 0, incompletos: 0 })
  const [peticionStats, setPeticionStats] = useState({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    enCompra: 0,
    recibidas: 0,
    rechazadas: 0
  })

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos()
    setMapReady(true)
  }, [])

  // Cargar peticiones cuando cambia el tab
  useEffect(() => {
    if (inventoryTab === 'peticiones') {
      cargarPeticiones()
    }
  }, [inventoryTab, filtroPeticiones])

  // Función para cargar todos los datos
  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar artículos de socorrismo
      const resArticulos = await fetch('/api/logistica?inventario=socorrismo')
      const dataArticulos = await resArticulos.json()
      
      setArticulos(dataArticulos.articulos || [])
      setFamilias(dataArticulos.familias || [])
      
      // Obtener ID de categoría socorrismo
      const resCat = await fetch('/api/logistica?tipo=categoria&slug=socorrismo')
      const dataCat = await resCat.json()
      if (dataCat.categoria) {
        setCategoriaSocorrismo(dataCat.categoria.id)
      }

      // Cargar edificios
      const resEdificios = await fetch('/api/logistica?tipo=edificios')
      const dataEdificios = await resEdificios.json()
      setEdificios(dataEdificios.edificios || [])

      // Cargar Vehículos
      const resVehiculos = await fetch('/api/vehiculos')
      const dataVehiculos = await resVehiculos.json()
      setVehiculos(dataVehiculos.vehiculos || [])

      // Cargar DEAs
      const resDeas = await fetch('/api/logistica?tipo=deas')
      const dataDeas = await resDeas.json()
      setDeas(dataDeas.deas || [])

      // Cargar Botiquines
      const resBotiquines = await fetch('/api/logistica?tipo=botiquines')
      const dataBotiquines = await resBotiquines.json()
      setBotiquines(dataBotiquines.botiquines || [])

      // Calcular stats
      setStatsArticulos({
        totalArticulos: dataArticulos.articulos?.length || 0,
        stockBajo: dataArticulos.articulos?.filter((a: Articulo) => a.stockActual <= a.stockMinimo).length || 0
      })

      setDeasStats({
        total: dataDeas.deas?.length || 0,
        operativos: dataDeas.deas?.filter((d: DEA) => d.estado === 'operativo').length || 0
      })

      setBotiquinesStats({
        total: dataBotiquines.botiquines?.length || 0,
        operativos: dataBotiquines.botiquines?.filter((b: any) => b.estado === 'operativo').length || 0,
        revisionPendiente: dataBotiquines.botiquines?.filter((b: any) => b.estado === 'revision_pendiente').length || 0,
        incompletos: dataBotiquines.botiquines?.filter((b: any) => b.estado === 'incompleto').length || 0
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar peticiones
  const cargarPeticiones = async () => {
    try {
      const params = new URLSearchParams()
      params.append('area', 'socorrismo')
      if (filtroPeticiones !== 'all') params.append('estado', filtroPeticiones)
      
      const res = await fetch(`/api/logistica/peticiones?${params.toString()}`)
      const data = await res.json()
      
      setPeticiones(data.peticiones || [])
      setPeticionStats(data.stats || {
        total: 0,
        pendientes: 0,
        aprobadas: 0,
        enCompra: 0,
        recibidas: 0,
        rechazadas: 0
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Posición del mapa (Bormujos)
  const centerPosition: [number, number] = [37.3710, -6.0710]

   // Filtrar artículos
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = searchTerm === '' || 
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia.id === selectedFamiliaFilter
    return matchSearch && matchFamilia
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl">
            <Heart className="text-red-600" size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">SOCORRISMO</p>
            <h1 className="text-2xl font-bold text-slate-800">Área de Socorrismo</h1>
            <p className="text-slate-500 text-sm">Material sanitario, DEAs y recursos de socorrismo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={cargarDatos} 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowNuevaPeticion(true)} 
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <ShoppingCart size={18} />
            Nueva Petición
          </button>
          <button 
            onClick={() => setShowNuevoArticulo(true)} 
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium"
          >
            <Plus size={18} />
            Nuevo Artículo
          </button>
          <button 
            onClick={() => setShowNuevoDEA(true)} 
            className="px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 font-medium"
          >
            <Droplet size={18} />
            Nuevo DEA
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Material del Área', value: statsArticulos.totalArticulos, icon: Package, bg: 'bg-purple-100', color: 'text-purple-600' },
          { label: 'Stock Bajo', value: statsArticulos.stockBajo, icon: AlertTriangle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
          { label: 'DEAs Totales', value: deasStats.total, icon: Droplet, bg: 'bg-cyan-100', color: 'text-cyan-600' },
          { label: 'Edificios', value: edificios.length, icon: Building2, bg: 'bg-slate-100', color: 'text-slate-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-medium">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.bg} p-2.5 rounded-xl`}>
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs Principales */}
        <div className="flex border-b border-slate-200">
          {[
            { id: 'inventario', label: 'Inventario del Área', icon: Package },
            { id: 'deas', label: 'Red de DEAs', icon: Droplet },
            { id: 'botiquines', label: 'Botiquines SVB', icon: Heart },
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

        {/* Contenido de Inventario */}
        {mainTab === 'inventario' && (
          <div>
            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              {[
                { id: 'stock', label: 'Stock', icon: Package },
                { id: 'peticiones', label: 'Peticiones', icon: ShoppingCart },
                { id: 'movimientos', label: 'Movimientos', icon: RefreshCw },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setInventoryTab(tab.id as any)
                    if (tab.id === 'peticiones') cargarPeticiones()
                  }}
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
              {/* Tab Stock */}
              {inventoryTab === 'stock' && (
                <div>
                  {/* Filtros */}
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
                    <button
                      onClick={() => setShowGestionFamilias(true)}
                      className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Layers size={18} />
                      Familias
                    </button>
                  </div>

                  {/* Tabla de artículos */}
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
                                <button
                                  onClick={() => setArticuloSeleccionado(art)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                                >
                                  <Edit size={16} />
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

              {/* Tab Peticiones */}
              {inventoryTab === 'peticiones' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Filter size={18} className="text-slate-400" />
                      <select
                        value={filtroPeticiones}
                        onChange={e => setFiltroPeticiones(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="all">Todos los estados</option>
                        <option value="pendiente">Pendientes ({peticionStats.pendientes})</option>
                        <option value="aprobada">Aprobadas ({peticionStats.aprobadas})</option>
                        <option value="en_compra">En Compra ({peticionStats.enCompra})</option>
                        <option value="recibida">Recibidas ({peticionStats.recibidas})</option>
                      </select>
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
                        const estadoInfo = ESTADOS_PETICION[peticion.estado as keyof typeof ESTADOS_PETICION] || ESTADOS_PETICION.pendiente
                        const prioridadInfo = PRIORIDADES[peticion.prioridad as keyof typeof PRIORIDADES] || PRIORIDADES.normal
                        const EstadoIcon = estadoInfo.icon

                        return (
                          <div key={peticion.id} className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                  <Heart size={24} className="text-red-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800">{peticion.numero}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${estadoInfo.color}`}>
                                      <EstadoIcon size={12} className="inline mr-1" />
                                      {estadoInfo.label}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${prioridadInfo.color}`}>
                                      {prioridadInfo.label}
                                    </span>
                                  </div>
                                  <p className="font-medium text-slate-700 mt-1">
                                    {peticion.nombreArticulo}{' '}
                                    <span className="text-slate-400">× {peticion.cantidad} {peticion.unidad}</span>
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <User size={12} /> {peticion.solicitante.nombre} {peticion.solicitante.apellidos}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} /> {new Date(peticion.fechaSolicitud).toLocaleDateString('es-ES')}
                                    </span>
                                  </div>
                                  {peticion.descripcion && (
                                    <p className="text-sm text-slate-500 mt-2">{peticion.descripcion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Movimientos */}
              {inventoryTab === 'movimientos' && (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Próximamente: Historial de movimientos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contenido de DEAs */}
        {mainTab === 'deas' && (
          <div>
            {/* Header del mapa */}
            <div className="border-b border-slate-200">
              <div className="p-4 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={18} className="text-cyan-600" /> Mapa de DEAs - Bormujos
                </h3>
                <button
                  onClick={() => setShowNuevoDEA(true)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nuevo DEA
                </button>
              </div>

              {/* Mapa */}
              <div className="h-[400px] relative z-0">
                {mapReady && deas.length > 0 && deas.some(d => d.latitud && d.longitud) ? (
                  <MapContainer 
                   center={centerPosition} 
                   zoom={15} 
                   style={{ height: '100%', width: '100%' }}
                   key={`deas-map-${deas.length}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {deas.filter(d => d.latitud && d.longitud).map((dea) => (
                      <Marker
                        key={dea.id}
                        position={[dea.latitud!, dea.longitud!]}
                        icon={createDEAIcon(dea.estado)}
                      >
                        <Popup>
                          <div className="text-center min-w-[150px]">
                            <strong className="text-lg block">{dea.codigo}</strong>
                            <p className="text-sm text-slate-600">{dea.tipo}</p>
                            <p className="text-xs text-slate-500 mt-1">{dea.ubicacion}</p>
                            {dea.marca && <p className="text-xs mt-1">Marca: {dea.marca}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                      <Droplet size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-slate-500">No hay DEAs con coordenadas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de DEAs */}
            <div className="p-4">
              {deas.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Droplet size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay DEAs registrados</p>
                </div>
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
                        <td className="p-3 text-center">
                          {dea.accesible24h ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-slate-300">✗</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            dea.estado === 'operativo' 
                              ? 'bg-green-100 text-green-700' 
                              : dea.estado === 'revision_pendiente' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {dea.estado === 'operativo' 
                              ? 'Operativo' 
                              : dea.estado === 'revision_pendiente' 
                              ? 'Rev. Pendiente' 
                              : 'Fuera Servicio'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setDEASeleccionado(dea)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Edit size={16} />
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


        {/* Contenido de Botiquines */}
        {mainTab === 'botiquines' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Botiquines SVB</h3>
              <p className="text-slate-600 text-sm mb-6">
                Gestión de botiquines de Soporte Vital Básico ubicados en vehículos y PMA
              </p>
            </div>

            {botiquines.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Heart size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-4">No hay botiquines registrados</p>
                <button onClick={() => setShowNuevoBotiquin(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <Plus size={18} className="inline mr-2" />
                  Crear Primer Botiquín
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {botiquines.map(botiquin => (
                  <div key={botiquin.id} className="bg-white border-2 border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          botiquin.estado === 'operativo' ? 'bg-green-100' :
                          botiquin.estado === 'revision_pendiente' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          <Heart size={24} className={
                            botiquin.estado === 'operativo' ? 'text-green-600' :
                            botiquin.estado === 'revision_pendiente' ? 'text-yellow-600' : 'text-red-600'
                          } />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{botiquin.codigo}</h4>
                          <p className="text-sm text-slate-500">{botiquin.nombre}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-slate-600">{botiquin.ubicacionActual}</span>
                      </div>
                      {botiquin.vehiculo && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package size={14} className="text-slate-400" />
                          <span className="text-slate-600">{botiquin.vehiculo.indicativo || botiquin.vehiculo.matricula}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Layers size={14} className="text-slate-400" />
                        <span className="text-slate-600">{botiquin._count.items} items</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        botiquin.estado === 'operativo' ? 'bg-green-100 text-green-700' :
                        botiquin.estado === 'revision_pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {botiquin.estado === 'operativo' ? '✓ Operativo' :
                         botiquin.estado === 'revision_pendiente' ? '⚠ Revisión Pendiente' :
                         '❌ Incompleto'}
                      </span>
                      <button className="text-slate-600 hover:bg-slate-100 p-2 rounded-lg">
                        <Edit size={16} />
                      </button>
                    </div>

                    {botiquin.ultimaRevision && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                          Última revisión: {new Date(botiquin.ultimaRevision).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      {/* MODALES */}
      
      {/* Modal Nuevo Artículo */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoArticulo(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Artículo</h2>
              <button onClick={() => setShowNuevoArticulo(false)}>
                <X size={24} />
              </button>
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
              try {
                const res = await fetch('/api/logistica', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: 'articulo', ...formData })
                })
                if (res.ok) {
                  await cargarDatos()
                  setShowNuevoArticulo(false)
                  form.reset()
                }
              } catch (error) {
                console.error('Error:', error)
              }
            }} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código</label>
                  <input name="codigo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ej: BOT-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Familia *</label>
                  <select name="familiaId" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                    <option value="">Seleccionar familia...</option>
                    {familias.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
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
                    <option>Botella</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                  Crear Artículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Artículo */}
      {articuloSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setArticuloSeleccionado(null)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Artículo</h2>
              <button onClick={() => setArticuloSeleccionado(null)}>
                <X size={24} />
              </button>
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
              try {
                const res = await fetch('/api/logistica', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: 'articulo', id: articuloSeleccionado.id, ...formData })
                })
                if (res.ok) {
                  await cargarDatos()
                  setArticuloSeleccionado(null)
                }
              } catch (error) {
                console.error('Error:', error)
              }
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
                    {familias.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
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
                    <option>Botella</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setArticuloSeleccionado(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Petición */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevaPeticion(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nueva Petición</h2>
              <button onClick={() => setShowNuevaPeticion(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const articuloIdInput = (form.elements.namedItem('articuloId') as HTMLSelectElement)
              const articuloSelec = articulos.find(a => a.id === articuloIdInput.value)
              const formData = {
                articuloId: articuloIdInput.value || null,
                nombreArticulo: articuloSelec?.nombre || (form.elements.namedItem('nombreArticulo') as HTMLInputElement)?.value || 'Material solicitado',
                cantidad: parseInt((form.elements.namedItem('cantidad') as HTMLInputElement).value),
                unidad: articuloSelec?.unidad || 'Unidad',
                prioridad: (form.elements.namedItem('prioridad') as HTMLSelectElement).value,
                descripcion: (form.elements.namedItem('motivo') as HTMLTextAreaElement).value,
                areaOrigen: 'socorrismo'
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
                  alert('✅ Petición creada correctamente')
                  if (inventoryTab === 'peticiones') {
                    cargarPeticiones()
                  }
                }
              } catch (error) {
                console.error('Error:', error)
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Artículo</label>
                <select name="articuloId" className="w-full border border-slate-300 rounded-lg p-2.5">
                  <option value="">Seleccionar artículo...</option>
                  {articulos.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.nombre} (Stock: {art.stockActual})
                    </option>
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
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo</label>
                <textarea name="motivo" className="w-full border border-slate-300 rounded-lg p-2.5" rows={3} placeholder="Razón de la petición..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Crear Petición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión de Familias */}
      {showGestionFamilias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowGestionFamilias(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-700 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Gestión de Familias</h2>
              <button onClick={() => setShowGestionFamilias(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={async (e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const nombreInput = form.elements.namedItem('nombreFamilia') as HTMLInputElement
                const nombre = nombreInput.value.trim()
                if (!nombre) return
                if (!categoriaSocorrismo) {
                  alert('Error: No se pudo cargar la categoría de socorrismo')
                  return
                }
                try {
                  const res = await fetch('/api/logistica', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipo: 'familia', nombre, categoriaId: categoriaSocorrismo })
                  })
                  if (res.ok) {
                    await cargarDatos()
                    nombreInput.value = ''
                  }
                } catch (error) {
                  console.error('Error:', error)
                }
              }} className="mb-6 flex gap-2">
                <input name="nombreFamilia" type="text" placeholder="Nueva familia..." className="flex-1 border border-slate-300 rounded-lg p-2.5" />
                <button type="submit" className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
                  <Plus size={18} />
                  Añadir
                </button>
              </form>
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
                      <button onClick={async () => {
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
                      }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded">
                        <Edit size={16} />
                      </button>
                      <button onClick={async () => {
                        const articulosEnFamilia = articulos.filter(a => a.familia.id === fam.id).length
                        if (articulosEnFamilia > 0) {
                          alert(`No se puede eliminar. Hay ${articulosEnFamilia} artículos en esta familia.`)
                          return
                        }
                        if (confirm(`¿Eliminar familia "${fam.nombre}"?`)) {
                          try {
                            const res = await fetch(`/api/logistica?tipo=familia&id=${fam.id}`, { method: 'DELETE' })
                            if (res.ok) await cargarDatos()
                          } catch (error) {
                            console.error('Error:', error)
                          }
                        }
                      }} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t">
                <button onClick={() => setShowGestionFamilias(false)} className="w-full px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo DEA */}
{showNuevoDEA && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoDEA(false)}>
    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="bg-cyan-600 p-5 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold">Nuevo DEA</h2>
        <button onClick={() => setShowNuevoDEA(false)}>
          <X size={24} />
        </button>
      </div>
      <form onSubmit={async (e) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const latitudValue = (form.elements.namedItem('latitud') as HTMLInputElement).value
        const longitudValue = (form.elements.namedItem('longitud') as HTMLInputElement).value
        
        const formData = {
          codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
          tipoDea: (form.elements.namedItem('tipoDea') as HTMLSelectElement).value,
          marca: (form.elements.namedItem('marca') as HTMLInputElement).value,
          modelo: (form.elements.namedItem('modelo') as HTMLInputElement).value,
          numeroSerie: (form.elements.namedItem('numeroSerie') as HTMLInputElement).value,
          ubicacion: (form.elements.namedItem('ubicacion') as HTMLInputElement).value,
          latitud: latitudValue ? parseFloat(latitudValue) : null,
          longitud: longitudValue ? parseFloat(longitudValue) : null,
          estado: (form.elements.namedItem('estado') as HTMLSelectElement).value,
          accesible24h: (form.elements.namedItem('accesible24h') as HTMLInputElement).checked,
          caducidadBateria: (form.elements.namedItem('caducidadBateria') as HTMLInputElement).value || null,
          caducidadParches: (form.elements.namedItem('caducidadParches') as HTMLInputElement).value || null,
          caducidadPilas: (form.elements.namedItem('caducidadPilas') as HTMLInputElement).value || null
        }
        try {
          const res = await fetch('/api/logistica', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'dea', ...formData })
          })
          if (res.ok) {
            await cargarDatos()
            setShowNuevoDEA(false)
            form.reset()
          } else {
            const error = await res.json()
            alert(`Error: ${error.error || 'No se pudo crear el DEA'}`)
          }
        } catch (error) {
          console.error('Error:', error)
          alert('Error al crear DEA')
        }
      }} className="p-6 overflow-y-auto space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Código *</label>
            <input name="codigo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="DEA-001" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
            <select name="tipoDea" className="w-full border border-slate-300 rounded-lg p-2.5" required>
              <option value="automatico">Automático</option>
              <option value="semiautomatico">Semiautomático</option>
            </select>
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Marca</label>
            <input name="marca" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ej: Philips" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Modelo</label>
            <input name="modelo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ej: HeartStart HS1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Número de Serie</label>
            <input name="numeroSerie" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="NS123456" />
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Caducidad Batería</label>
            <input name="caducidadBateria" type="date" className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Caducidad Parches</label>
            <input name="caducidadParches" type="date" className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Caducidad Pilas</label>
            <input name="caducidadPilas" type="date" className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input name="accesible24h" type="checkbox" id="accesible24h" defaultChecked className="w-4 h-4" />
          <label htmlFor="accesible24h" className="text-sm font-medium text-slate-700">Accesible 24 horas</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => setShowNuevoDEA(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium">
            Crear DEA
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Modal Editar DEA */}
{deaSeleccionado && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDEASeleccionado(null)}>
    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="bg-cyan-600 p-5 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold">Editar DEA</h2>
        <button onClick={() => setDEASeleccionado(null)}>
          <X size={24} />
        </button>
      </div>
      <form onSubmit={async (e) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const latitudValue = (form.elements.namedItem('latitud') as HTMLInputElement).value
        const longitudValue = (form.elements.namedItem('longitud') as HTMLInputElement).value
        
        const formData = {
          codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
          tipoDea: (form.elements.namedItem('tipoDea') as HTMLSelectElement).value,
          marca: (form.elements.namedItem('marca') as HTMLInputElement).value,
          modelo: (form.elements.namedItem('modelo') as HTMLInputElement).value,
          numeroSerie: (form.elements.namedItem('numeroSerie') as HTMLInputElement).value,
          ubicacion: (form.elements.namedItem('ubicacion') as HTMLInputElement).value,
          latitud: latitudValue ? parseFloat(latitudValue) : null,
          longitud: longitudValue ? parseFloat(longitudValue) : null,
          estado: (form.elements.namedItem('estado') as HTMLSelectElement).value,
          accesible24h: (form.elements.namedItem('accesible24h') as HTMLInputElement).checked,
          caducidadBateria: (form.elements.namedItem('caducidadBateria') as HTMLInputElement).value || null,
          caducidadParches: (form.elements.namedItem('caducidadParches') as HTMLInputElement).value || null,
          caducidadPilas: (form.elements.namedItem('caducidadPilas') as HTMLInputElement).value || null
        }
        try {
          const res = await fetch('/api/logistica', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'dea', id: deaSeleccionado.id, ...formData })
          })
          if (res.ok) {
            await cargarDatos()
            setDEASeleccionado(null)
          } else {
            const error = await res.json()
            alert(`Error: ${error.error || 'No se pudo actualizar el DEA'}`)
          }
        } catch (error) {
          console.error('Error:', error)
          alert('Error al actualizar DEA')
        }
      }} className="p-6 overflow-y-auto space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Código</label>
            <input name="codigo" type="text" defaultValue={deaSeleccionado.codigo} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
            <select name="tipoDea" defaultValue={deaSeleccionado.tipo} className="w-full border border-slate-300 rounded-lg p-2.5">
              <option value="automatico">Automático</option>
              <option value="semiautomatico">Semiautomático</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
            <select name="estado" defaultValue={deaSeleccionado.estado} className="w-full border border-slate-300 rounded-lg p-2.5">
              <option value="operativo">Operativo</option>
              <option value="revision_pendiente">Revisión Pendiente</option>
              <option value="fuera_servicio">Fuera de Servicio</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Marca</label>
            <input name="marca" type="text" defaultValue={deaSeleccionado.marca || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Modelo</label>
            <input name="modelo" type="text" defaultValue={deaSeleccionado.modelo || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Número de Serie</label>
            <input name="numeroSerie" type="text" defaultValue={deaSeleccionado.numeroSerie || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación</label>
          <input name="ubicacion" type="text" defaultValue={deaSeleccionado.ubicacion} className="w-full border border-slate-300 rounded-lg p-2.5" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Latitud</label>
            <input name="latitud" type="text" defaultValue={deaSeleccionado.latitud?.toFixed(8) || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Longitud</label>
            <input name="longitud" type="text" defaultValue={deaSeleccionado.longitud?.toFixed(8) || ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Caducidad Batería</label>
            <input name="caducidadBateria" type="date" defaultValue={deaSeleccionado.caducidadBateria ? new Date(deaSeleccionado.caducidadBateria).toISOString().split('T')[0] : ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Caducidad Parches</label>
            <input name="caducidadParches" type="date" defaultValue={deaSeleccionado.caducidadParches ? new Date(deaSeleccionado.caducidadParches).toISOString().split('T')[0] : ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Caducidad Pilas</label>
            <input name="caducidadPilas" type="date" defaultValue={deaSeleccionado.caducidadPilas ? new Date(deaSeleccionado.caducidadPilas).toISOString().split('T')[0] : ''} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input name="accesible24h" type="checkbox" id="accesible24h-edit" defaultChecked={deaSeleccionado.accesible24h} className="w-4 h-4" />
          <label htmlFor="accesible24h-edit" className="text-sm font-medium text-slate-700">Accesible 24 horas</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => setDEASeleccionado(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium">
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Modal Nuevo Botiquín */}
      {showNuevoBotiquin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNuevoBotiquin(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Botiquín SVB</h2>
              <button onClick={() => setShowNuevoBotiquin(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                codigo: (form.elements.namedItem('codigo') as HTMLInputElement).value,
                nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
                tipo: (form.elements.namedItem('tipo') as HTMLSelectElement).value,
                ubicacionActual: (form.elements.namedItem('ubicacionActual') as HTMLInputElement).value,
                vehiculoId: (form.elements.namedItem('vehiculoId') as HTMLSelectElement).value || null,
                observaciones: (form.elements.namedItem('observaciones') as HTMLTextAreaElement).value
              }
              try {
                const res = await fetch('/api/logistica', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: 'botiquin', ...formData })
                })
                if (res.ok) {
                  await cargarDatos()
                  setShowNuevoBotiquin(false)
                  form.reset()
                  alert('✅ Botiquín creado correctamente')
                }
              } catch (error) {
                console.error('Error:', error)
                alert('❌ Error al crear botiquín')
              }
            }} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código *</label>
                  <input name="codigo" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="BOT-UMJ-01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                  <select name="tipo" className="w-full border border-slate-300 rounded-lg p-2.5" required>
                    <option value="vehiculo">Vehículo</option>
                    <option value="pma">PMA</option>
                    <option value="almacen">Almacén</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                <input name="nombre" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Botiquín SVB UMJ" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación Actual *</label>
                  <input name="ubicacionActual" type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="En vehículo UMJ" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vehículo Asignado</label>
                  <select name="vehiculoId" className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="">Sin asignar</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.indicativo || v.matricula} - {v.tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones</label>
                <textarea name="observaciones" className="w-full border border-slate-300 rounded-lg p-2.5" rows={3} placeholder="Notas adicionales..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNuevoBotiquin(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                  Crear Botiquín
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}