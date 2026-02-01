'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Truck, MapPin, Car, Ambulance, Package, Calendar, Gauge, Shield, Wrench, Plus, Edit, Eye, X, Check, RefreshCw, FileText, AlertTriangle } from 'lucide-react'
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

interface Vehiculo {
  id: string
  matricula: string
  indicativo: string | null
  tipo: string
  marca: string | null
  modelo: string | null
  anio: number | null
  estado: string
  kmActual: number | null
  fechaItv: string | null
  fechaSeguro: string | null
  servicioId: string
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  disponibles: number
  enServicio: number
  mantenimiento: number
}

const getStatusColor = (estado: string) => {
  switch (estado) {
    case 'disponible': return 'bg-green-100 text-green-700 border-green-200'
    case 'en_servicio': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'mantenimiento': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'fuera_servicio': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const getStatusLabel = (estado: string) => {
  switch (estado) {
    case 'disponible': return 'Disponible'
    case 'en_servicio': return 'En Servicio'
    case 'mantenimiento': return 'Mantenimiento'
    case 'fuera_servicio': return 'Fuera de Servicio'
    default: return estado
  }
}

const getVehicleIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'ambulancia': return <Ambulance size={20} />
    case 'turismo': return <Car size={20} />
    case 'furgoneta': return <Truck size={20} />
    case 'pickup': return <Truck size={20} />
    case 'remolque': return <Package size={20} />
    default: return <Truck size={20} />
  }
}

const getTipoLabel = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'ambulancia': return 'Ambulancia'
    case 'turismo': return 'Turismo'
    case 'furgoneta': return 'Furgoneta'
    case 'pickup': return 'Pick-up'
    case 'remolque': return 'Remolque'
    default: return tipo
  }
}

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, disponibles: 0, enServicio: 0, mantenimiento: 0 })
  const [loading, setLoading] = useState(true)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null)
  const [showNuevoVehiculo, setShowNuevoVehiculo] = useState(false)
  const [showEditarVehiculo, setShowEditarVehiculo] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [busqueda, setBusqueda] = useState('')
  const [mainTab, setMainTab] = useState<'flota' | 'inventario'>('inventario')
  const [detalleTab, setDetalleTab] = useState<'ficha' | 'documentacion' | 'mantenimiento'>('ficha')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vehiculos')
      const data = await res.json()
      setVehiculos(data.vehiculos || [])
      setStats(data.stats || { total: 0, disponibles: 0, enServicio: 0, mantenimiento: 0 })
    } catch (error) {
      console.error('Error cargando vehículos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const vehiculosFiltrados = vehiculos.filter(v => {
    const matchEstado = filtroEstado === 'all' || v.estado === filtroEstado
    const matchBusqueda = busqueda === '' || 
      v.indicativo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.matricula.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-teal-600 text-xs font-bold uppercase tracking-wider">PARQUE MÓVIL</p>
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Flota</h1>
            <p className="text-slate-500 text-sm">Control de vehículos y mantenimiento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Recargar datos"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => alert('Próximamente: Nueva Petición')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <FileText size={18} />
            <span className="hidden sm:inline">Petición</span>
          </button>
          <button
            onClick={() => alert('Próximamente: Nuevo Artículo')}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Artículo</span>
          </button>
          <button
            onClick={() => setShowNuevoVehiculo(true)}
            className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            <Truck size={18} />
            <span className="hidden sm:inline">Vehículo</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Flota</p>
              <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <Truck size={24} className="text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Disponibles</p>
              <p className="text-3xl font-bold text-green-600">{stats.disponibles}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Check size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">En Servicio</p>
              <p className="text-3xl font-bold text-orange-600">{stats.enServicio}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <MapPin size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Mantenimiento</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.mantenimiento}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Wrench size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Principales */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setMainTab('inventario')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              mainTab === 'inventario'
                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Package size={18} />
            <span className="hidden sm:inline">Inventario del Área</span>
            <span className="sm:hidden">Inventario</span>
          </button>
          <button
            onClick={() => setMainTab('flota')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              mainTab === 'flota'
                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Truck size={18} />
            <span className="hidden sm:inline">Gestión de Flota</span>
            <span className="sm:hidden">Flota</span>
          </button>
        </div>
      </div>

      {mainTab === 'inventario' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">Inventario del Área de Vehículos</p>
          <p className="text-slate-400 text-sm mt-1">Próximamente: Gestión de material y peticiones</p>
        </div>
      )}

      {mainTab === 'flota' && (
        <>
          {/* Mapa Táctico */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={18} className="text-teal-600" />
                Mapa Táctico de Flota
              </h3>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> En Servicio
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Disponible
                </span>
              </div>
            </div>
            <div className="h-[350px]">
              <MapContainer
                center={[37.3716, -6.0719]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {vehiculos
                  .filter(v => v.estado === 'disponible' || v.estado === 'en_servicio')
                  .map((vehiculo, index) => {
                    // Coordenadas simuladas en Bormujos
                    const coordenadas = [
                      [37.3725, -6.0735],
                      [37.3708, -6.0698],
                      [37.3732, -6.0680],
                      [37.3698, -6.0745],
                      [37.3715, -6.0760],
                    ]
                    const [lat, lng] = coordenadas[index % coordenadas.length]
                    
                    // Crear icono personalizado
                    const L = typeof window !== 'undefined' ? require('leaflet') : null
                    const customIcon = L ? new L.DivIcon({
                      html: `<div style="
                        background-color: ${vehiculo.estado === 'en_servicio' ? '#f97316' : '#22c55e'};
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                      ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                        </svg>
                      </div>`,
                      className: 'custom-vehicle-marker',
                      iconSize: [32, 32],
                      iconAnchor: [16, 16],
                    }) : undefined

                    return customIcon ? (
                      <Marker
                        key={vehiculo.id}
                        position={[lat, lng]}
                        icon={customIcon}
                        eventHandlers={{
                          click: () => setVehiculoSeleccionado(vehiculo)
                        }}
                      >
                        <Popup>
                          <div className="text-center">
                            <p className="font-bold text-slate-800">{vehiculo.indicativo || vehiculo.matricula}</p>
                            <p className="text-xs text-slate-500">{vehiculo.marca} {vehiculo.modelo}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              vehiculo.estado === 'en_servicio' 
                                ? 'bg-orange-100 text-orange-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {vehiculo.estado === 'en_servicio' ? 'En Servicio' : 'Disponible'}
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    ) : null
                  })}
              </MapContainer>
            </div>
            <div className="p-2 text-center text-xs text-slate-400 border-t">
              * Ubicaciones simuladas para demostración del sistema
            </div>
          </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por indicativo, matrícula, marca..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="en_servicio">En Servicio</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="fuera_servicio">Fuera de Servicio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Vehículos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={32} className="mx-auto mb-4 text-slate-400 animate-spin" />
            <p className="text-slate-500">Cargando vehículos...</p>
          </div>
        ) : vehiculosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay vehículos</p>
            <p className="text-slate-400 text-sm">Añade el primer vehículo de la flota</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vehículo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Matrícula</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">ITV</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Seguro</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehiculosFiltrados.map((vehiculo) => (
                  <tr key={vehiculo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                          {getVehicleIcon(vehiculo.tipo)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{vehiculo.indicativo || vehiculo.matricula}</p>
                          <p className="text-xs text-slate-500">{vehiculo.marca} {vehiculo.modelo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{getTipoLabel(vehiculo.tipo)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-slate-700">{vehiculo.matricula}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(vehiculo.estado)}`}>
                        {getStatusLabel(vehiculo.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${
                        isExpired(vehiculo.fechaItv) ? 'text-red-600 font-bold' :
                        isExpiringSoon(vehiculo.fechaItv) ? 'text-yellow-600 font-medium' :
                        'text-slate-600'
                      }`}>
                        {formatDate(vehiculo.fechaItv)}
                        {isExpired(vehiculo.fechaItv) && <AlertTriangle size={14} className="inline ml-1" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${
                        isExpired(vehiculo.fechaSeguro) ? 'text-red-600 font-bold' :
                        isExpiringSoon(vehiculo.fechaSeguro) ? 'text-yellow-600 font-medium' :
                        'text-slate-600'
                      }`}>
                        {formatDate(vehiculo.fechaSeguro)}
                        {isExpired(vehiculo.fechaSeguro) && <AlertTriangle size={14} className="inline ml-1" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setVehiculoSeleccionado(vehiculo)}
                          className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => { setVehiculoSeleccionado(vehiculo); setShowEditarVehiculo(true); }}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
      {/* Modal Ver Detalles */}
      {vehiculoSeleccionado && !showEditarVehiculo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  {getVehicleIcon(vehiculoSeleccionado.tipo)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{vehiculoSeleccionado.indicativo || vehiculoSeleccionado.matricula}</h3>
                  <p className="text-slate-300 text-sm">{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} - {vehiculoSeleccionado.matricula}</p>
                </div>
              </div>
              <button onClick={() => setVehiculoSeleccionado(null)} className="p-1 hover:bg-white/20 rounded">
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs del modal */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setDetalleTab('ficha')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  detalleTab === 'ficha'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Ficha Técnica
              </button>
              <button
                onClick={() => setDetalleTab('documentacion')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  detalleTab === 'documentacion'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Documentación
              </button>
              <button
                onClick={() => setDetalleTab('mantenimiento')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  detalleTab === 'mantenimiento'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Mantenimiento
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tab Ficha Técnica */}
              {detalleTab === 'ficha' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 uppercase font-medium mb-2">Estado Actual</p>
                      <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(vehiculoSeleccionado.estado)}`}>
                        {getStatusLabel(vehiculoSeleccionado.estado)}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 uppercase font-medium mb-2">Última Revisión</p>
                      <p className="font-semibold text-slate-800">{formatDate(vehiculoSeleccionado.updatedAt)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase font-medium mb-3">Datos del Vehículo</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Tipo</p>
                        <p className="font-semibold text-slate-800">{getTipoLabel(vehiculoSeleccionado.tipo)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Matrícula</p>
                        <p className="font-mono font-semibold text-slate-800">{vehiculoSeleccionado.matricula}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Marca</p>
                        <p className="font-semibold text-slate-800">{vehiculoSeleccionado.marca || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Modelo</p>
                        <p className="font-semibold text-slate-800">{vehiculoSeleccionado.modelo || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Año</p>
                        <p className="font-semibold text-slate-800">{vehiculoSeleccionado.anio || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Kilómetros</p>
                        <p className="font-semibold text-slate-800">{vehiculoSeleccionado.kmActual?.toLocaleString() || '-'} km</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${isExpired(vehiculoSeleccionado.fechaItv) ? 'bg-red-50 border-red-200' : isExpiringSoon(vehiculoSeleccionado.fechaItv) ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-xs text-slate-500 uppercase font-medium flex items-center gap-1 mb-1">
                        <Calendar size={12} /> ITV
                      </p>
                      <p className={`font-semibold ${isExpired(vehiculoSeleccionado.fechaItv) ? 'text-red-600' : isExpiringSoon(vehiculoSeleccionado.fechaItv) ? 'text-yellow-600' : 'text-green-600'}`}>
                        {formatDate(vehiculoSeleccionado.fechaItv)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border-2 ${isExpired(vehiculoSeleccionado.fechaSeguro) ? 'bg-red-50 border-red-200' : isExpiringSoon(vehiculoSeleccionado.fechaSeguro) ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-xs text-slate-500 uppercase font-medium flex items-center gap-1 mb-1">
                        <Shield size={12} /> Seguro
                      </p>
                      <p className={`font-semibold ${isExpired(vehiculoSeleccionado.fechaSeguro) ? 'text-red-600' : isExpiringSoon(vehiculoSeleccionado.fechaSeguro) ? 'text-yellow-600' : 'text-green-600'}`}>
                        {formatDate(vehiculoSeleccionado.fechaSeguro)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle size={18} />
                        <span className="font-medium">Reportar Incidencia</span>
                      </div>
                      <button
                        onClick={() => alert('Próximamente: Notificar avería')}
                        className="px-3 py-1.5 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-medium hover:bg-red-50"
                      >
                        Notificar Avería
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tab Documentación */}
              {detalleTab === 'documentacion' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 font-medium">No hay documentos subidos.</p>
                    <button
                      onClick={() => alert('Próximamente: Subir PDF')}
                      className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium"
                    >
                      Subir PDF
                    </button>
                  </div>
                </div>
              )}
              
              {/* Tab Mantenimiento */}
              {detalleTab === 'mantenimiento' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <Wrench size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 font-medium">Sin historial de mantenimiento registrado.</p>
                    <button
                      onClick={() => alert('Próximamente: Registrar mantenimiento')}
                      className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                      Registrar Mantenimiento
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-slate-50 flex gap-3">
              <button
                onClick={() => setVehiculoSeleccionado(null)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() => setShowEditarVehiculo(true)}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo/Editar Vehículo */}
      {(showNuevoVehiculo || showEditarVehiculo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white flex items-center justify-between sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {showEditarVehiculo ? <Edit size={20} /> : <Plus size={20} />}
                {showEditarVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h3>
              <button onClick={() => { setShowNuevoVehiculo(false); setShowEditarVehiculo(false); }} className="p-1 hover:bg-white/20 rounded">
                <X size={20} />
              </button>
            </div>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const data = {
                  matricula: formData.get('matricula'),
                  indicativo: formData.get('indicativo') || null,
                  tipo: formData.get('tipo'),
                  marca: formData.get('marca') || null,
                  modelo: formData.get('modelo') || null,
                  anio: formData.get('anio') ? parseInt(formData.get('anio') as string) : null,
                  estado: formData.get('estado'),
                  kmActual: formData.get('kmActual') ? parseInt(formData.get('kmActual') as string) : null,
                  fechaItv: formData.get('fechaItv') || null,
                  fechaSeguro: formData.get('fechaSeguro') || null,
                }
                
                try {
                  const url = showEditarVehiculo ? `/api/vehiculos/${vehiculoSeleccionado?.id}` : '/api/vehiculos'
                  const method = showEditarVehiculo ? 'PUT' : 'POST'
                  
                  const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  })
                  
                  if (res.ok) {
                    alert(showEditarVehiculo ? 'Vehículo actualizado' : 'Vehículo creado')
                    setShowNuevoVehiculo(false)
                    setShowEditarVehiculo(false)
                    setVehiculoSeleccionado(null)
                    cargarDatos()
                  } else {
                    const error = await res.json()
                    alert('Error: ' + (error.message || 'No se pudo guardar'))
                  }
                } catch (error) {
                  alert('Error al guardar vehículo')
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matrícula *</label>
                  <input
                    type="text"
                    name="matricula"
                    required
                    defaultValue={vehiculoSeleccionado?.matricula || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="1234-ABC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Indicativo</label>
                  <input
                    type="text"
                    name="indicativo"
                    defaultValue={vehiculoSeleccionado?.indicativo || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="UMJ, VIR, FSV..."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                  <select
                    name="tipo"
                    required
                    defaultValue={vehiculoSeleccionado?.tipo || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="turismo">Turismo</option>
                    <option value="furgoneta">Furgoneta</option>
                    <option value="pickup">Pick-up</option>
                    <option value="ambulancia">Ambulancia</option>
                    <option value="remolque">Remolque</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                  <select
                    name="estado"
                    required
                    defaultValue={vehiculoSeleccionado?.estado || 'disponible'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="en_servicio">En Servicio</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
                  <input
                    type="text"
                    name="marca"
                    defaultValue={vehiculoSeleccionado?.marca || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Renault, Peugeot..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    defaultValue={vehiculoSeleccionado?.modelo || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Master, 3008..."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                  <input
                    type="number"
                    name="anio"
                    defaultValue={vehiculoSeleccionado?.anio || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="2020"
                    min="1990"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kilómetros</label>
                  <input
                    type="number"
                    name="kmActual"
                    defaultValue={vehiculoSeleccionado?.kmActual || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="50000"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha ITV</label>
                  <input
                    type="date"
                    name="fechaItv"
                    defaultValue={vehiculoSeleccionado?.fechaItv?.split('T')[0] || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Seguro</label>
                  <input
                    type="date"
                    name="fechaSeguro"
                    defaultValue={vehiculoSeleccionado?.fechaSeguro?.split('T')[0] || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowNuevoVehiculo(false); setShowEditarVehiculo(false); }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  {showEditarVehiculo ? 'Guardar Cambios' : 'Crear Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
