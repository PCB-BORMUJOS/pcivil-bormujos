'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Truck, Package, AlertTriangle, CheckCircle, ShoppingCart, Plus, RefreshCw, Eye, Search, Layers } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false })

const ESTADOS_PETICION: Record<string, { color: string; icono: string }> = {
  pendiente: { color: 'bg-yellow-100 text-yellow-800', icono: '⏳' },
  aprobada: { color: 'bg-blue-100 text-blue-800', icono: '✓' },
  en_compra: { color: 'bg-purple-100 text-purple-800', icono: '🛒' },
  recibida: { color: 'bg-green-100 text-green-800', icono: '✓✓' },
  rechazada: { color: 'bg-red-100 text-red-800', icono: '✗' },
  cancelada: { color: 'bg-gray-100 text-gray-800', icono: '⊗' }
}

const PRIORIDADES: Record<string, string> = {
  baja: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700'
}

const TIPOS_DOCUMENTO = [
  { value: 'itv', label: 'ITV' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'permiso_circulacion', label: 'Permiso de Circulación' },
  { value: 'otros', label: 'Otros' }
]

const TIPOS_MANTENIMIENTO = [
  { value: 'revision', label: 'Revisión' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'cambio_aceite', label: 'Cambio de Aceite' },
  { value: 'neumaticos', label: 'Neumáticos' },
  { value: 'itv', label: 'ITV' },
  { value: 'otros', label: 'Otros' }
]

export default function VehiculosPage() {
  const [mainTab, setMainTab] = useState<'inventario' | 'flota'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [loading, setLoading] = useState(true)
  
  const [articulos, setArticulos] = useState<any[]>([])
  const [familias, setFamilias] = useState<any[]>([])
  const [peticiones, setPeticiones] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [categoriaVehiculos, setCategoriaVehiculos] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')
  
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoVehiculo, setShowNuevoVehiculo] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null)
  
  const [showDetalleVehiculo, setShowDetalleVehiculo] = useState(false)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<any>(null)
  const [detalleTab, setDetalleTab] = useState<'ficha' | 'documentacion' | 'mantenimiento'>('ficha')
  
  const [showEditarVehiculo, setShowEditarVehiculo] = useState(false)
  const [documentos, setDocumentos] = useState<any[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  
  const [mantenimientos, setMantenimientos] = useState<any[]>([])
  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false)
  const [mantenimientoSeleccionado, setMantenimientoSeleccionado] = useState<any>(null)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const resVehiculos = await fetch('/api/vehiculos')
      const dataVehiculos = await resVehiculos.json()
      setVehiculos(dataVehiculos.vehiculos || [])
      
      const resInventario = await fetch('/api/logistica?inventario=vehiculos')
      const dataInventario = await resInventario.json()
      setArticulos(dataInventario.articulos || [])
      setFamilias(dataInventario.familias || [])
      
      const resCat = await fetch('/api/logistica?tipo=categoria&slug=vehiculos')
      const dataCat = await resCat.json()
      if (dataCat.categoria) {
        setCategoriaVehiculos(dataCat.categoria.id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarPeticiones = async () => {
    try {
      const res = await fetch('/api/logistica/peticiones?area=vehiculos')
      const data = await res.json()
      setPeticiones(data.peticiones || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarDocumentos = async (vehiculoId: string) => {
    try {
      const res = await fetch(`/api/vehiculos?tipo=documentos&vehiculoId=${vehiculoId}`)
      const data = await res.json()
      setDocumentos(data.documentos || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarMantenimientos = async (vehiculoId: string) => {
    try {
      const res = await fetch(`/api/vehiculos?tipo=mantenimientos&vehiculoId=${vehiculoId}`)
      const data = await res.json()
      setMantenimientos(data.mantenimientos || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleGuardarVehiculo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!vehiculoSeleccionado) return

    const formData = new FormData(e.currentTarget)
    const data = {
      id: vehiculoSeleccionado.id,
      estado: formData.get('estado') as string,
      kilometraje: formData.get('kmActual') as string,
      ubicacion: vehiculoSeleccionado.ubicacion,
      observaciones: vehiculoSeleccionado.observaciones
    }

    try {
      const res = await fetch('/api/vehiculos?tipo=vehiculo', {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        await cargarDatos()
        setShowEditarVehiculo(false)
        setVehiculoSeleccionado(null)
        alert('Vehículo actualizado correctamente')
      } else {
        alert('Error al actualizar vehículo')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar vehículo')
    }
  }

  const handleVerDetalleVehiculo = (vehiculo: any) => {
    setVehiculoSeleccionado(vehiculo)
    setDetalleTab('ficha')
    setShowDetalleVehiculo(true)
  }

  const handleCrearArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/logistica', {
        method: articuloSeleccionado ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'articulo',
          id: articuloSeleccionado?.id,
          codigo: formData.get('codigo'),
          nombre: formData.get('nombre'),
          descripcion: formData.get('descripcion'),
          stockActual: parseInt(formData.get('stockActual') as string),
          stockMinimo: parseInt(formData.get('stockMinimo') as string),
          unidad: formData.get('unidad'),
          familiaId: formData.get('familiaId'),
          categoriaId: categoriaVehiculos
        })
      })

      if (res.ok) {
        await cargarDatos()
        setShowNuevoArticulo(false)
        setArticuloSeleccionado(null)
        alert(articuloSeleccionado ? 'Artículo actualizado' : 'Artículo creado')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCrearPeticion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'peticion',
          articuloId: formData.get('articuloId'),
          nombreArticulo: articulos.find(a => a.id === formData.get('articuloId'))?.nombre || formData.get('nombreArticulo'),
          cantidad: parseInt(formData.get('cantidad') as string),
          unidad: formData.get('unidad'),
          prioridad: formData.get('prioridad'),
          descripcion: formData.get('descripcion'),
          areaOrigen: 'vehiculos'
        })
      })

      if (res.ok) {
        await cargarPeticiones()
        setShowNuevaPeticion(false)
        alert('Petición creada')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCrearFamilia = async (nombre: string) => {
    if (!categoriaVehiculos) return
    
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'familia',
          nombre,
          categoriaId: categoriaVehiculos
        })
      })

      if (res.ok) {
        await cargarDatos()
        alert('Familia creada')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEliminarFamilia = async (id: string) => {
    if (!confirm('¿Eliminar esta familia?')) return
    
    try {
      const res = await fetch(`/api/logistica?tipo=familia&id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await cargarDatos()
        alert('Familia eliminada')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSubirDocumento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!vehiculoSeleccionado) return

    const formData = new FormData(e.currentTarget)
    formData.append('vehiculoId', vehiculoSeleccionado.id)
    
    const tipoDoc = formData.get('tipo') as string
    formData.set('tipoDoc', tipoDoc)
    formData.delete('tipo')

    try {
      setUploadingDoc(true)
      const res = await fetch('/api/vehiculos?tipo=documento', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        await cargarDocumentos(vehiculoSeleccionado.id)
        ;(e.target as HTMLFormElement).reset()
        alert('Documento subido')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleEliminarDocumento = async (id: string) => {
    if (!confirm('¿Eliminar?')) return

    try {
      const res = await fetch(`/api/vehiculos?tipo=documento&id=${id}`, { method: 'DELETE' })
      if (res.ok && vehiculoSeleccionado) {
        await cargarDocumentos(vehiculoSeleccionado.id)
        alert('Eliminado')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCrearMantenimiento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!vehiculoSeleccionado) return

    const formData = new FormData(e.currentTarget)
    const data = {
      vehiculoId: vehiculoSeleccionado.id,
      fecha: formData.get('fecha'),
      tipo: formData.get('tipo'),
      descripcion: formData.get('descripcion'),
      kilometraje: formData.get('kilometraje'),
      coste: formData.get('coste'),
      proximaRevision: formData.get('proximaRevision'),
      realizadoPor: formData.get('realizadoPor'),
      observaciones: formData.get('observaciones')
    }

    try {
      const res = await fetch('/api/vehiculos?tipo=mantenimiento', {
        method: mantenimientoSeleccionado ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mantenimientoSeleccionado ? { ...data, id: mantenimientoSeleccionado.id } : data)
      })

      if (res.ok) {
        await cargarMantenimientos(vehiculoSeleccionado.id)
        setShowNuevoMantenimiento(false)
        setMantenimientoSeleccionado(null)
        alert(mantenimientoSeleccionado ? 'Actualizado' : 'Registrado')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEliminarMantenimiento = async (id: string) => {
    if (!confirm('¿Eliminar?')) return

    try {
      const res = await fetch(`/api/vehiculos?tipo=mantenimiento&id=${id}`, { method: 'DELETE' })
      if (res.ok && vehiculoSeleccionado) {
        await cargarMantenimientos(vehiculoSeleccionado.id)
        alert('Eliminado')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const articulosFiltrados = articulos.filter(art => {
    const matchSearch = art.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || art.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchFamilia = selectedFamiliaFilter === 'all' || art.familia?.id === selectedFamiliaFilter
    return matchSearch && matchFamilia
  })

  const peticionesFiltradas = peticiones.filter(pet => filtroPeticiones === 'all' || pet.estado === filtroPeticiones)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (inventoryTab === 'peticiones') {
      cargarPeticiones()
    }
  }, [inventoryTab])

  useEffect(() => {
    if (vehiculoSeleccionado) {
      if (detalleTab === 'documentacion') {
        cargarDocumentos(vehiculoSeleccionado.id)
      } else if (detalleTab === 'mantenimiento') {
        cargarMantenimientos(vehiculoSeleccionado.id)
      }
    }
  }, [vehiculoSeleccionado, detalleTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* HEADER */}
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
  <div className="flex items-center gap-4">
    <div className="bg-indigo-100 p-3 rounded-xl">
      <Truck className="text-indigo-600" size={28} />
    </div>
    <div>
      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">VEHÍCULOS</p>
      <h1 className="text-xl md:text-2xl font-bold text-slate-800">Gestión de Flota</h1>
            <p className="text-slate-500 text-xs md:text-sm">Inventario y mantenimiento del parque móvil</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
          <button onClick={cargarDatos} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowNuevaPeticion(true)} className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium text-sm">
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Nueva Petición</span>
            <span className="sm:hidden">Petición</span>
          </button>
          <button onClick={() => setShowNuevoArticulo(true)} className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium text-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Artículo</span>
            <span className="sm:hidden">Artículo</span>
          </button>
          <button onClick={() => setShowNuevoVehiculo(true)} className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium text-sm">
            <Truck size={16} />
            <span className="hidden sm:inline">Nuevo Vehículo</span>
            <span className="sm:hidden">Vehículo</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Material del Área</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{articulos.length}</h3>
            </div>
            <div className="bg-purple-100 p-2.5 rounded-xl">
              <Package size={22} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Stock Bajo</p>
              <h3 className="text-2xl md:text-3xl font-bold text-red-600 mt-1">
                {articulos.filter(a => a.stockActual <= a.stockMinimo).length}
              </h3>
            </div>
            <div className="bg-yellow-100 p-2.5 rounded-xl">
              <AlertTriangle size={22} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Vehículos</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{vehiculos.length}</h3>
            </div>
            <div className="bg-indigo-100 p-2.5 rounded-xl">
            <Truck size={22} className="text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Operativos</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                {vehiculos.filter(v => v.estado === 'operativo').length}
              </h3>
            </div>
            <div className="bg-green-100 p-2.5 rounded-xl">
              <CheckCircle size={22} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">En Taller</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                {vehiculos.filter(v => v.estado === 'taller').length}
              </h3>
            </div>
            <div className="bg-yellow-100 p-2.5 rounded-xl">
              <AlertTriangle size={22} className="text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
          {[
            { id: 'inventario', label: 'Inventario del Área', icon: Package },
            { id: 'flota', label: 'Gestión de Flota', icon: Truck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                mainTab === tab.id 
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB INVENTARIO */}
        {mainTab === 'inventario' && (
          <div>
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide">
              {[
                { id: 'stock', label: 'Stock', icon: Package },
                { id: 'peticiones', label: 'Peticiones', icon: ShoppingCart },
                { id: 'movimientos', label: 'Movimientos', icon: RefreshCw },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setInventoryTab(tab.id as any); if (tab.id === 'peticiones') cargarPeticiones(); }}
                  className={`flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
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

            <div className="p-4 md:p-6">
              {inventoryTab === 'stock' && (
                <div>
                  <div className="flex flex-col md:flex-row gap-3 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text"
                        placeholder="Buscar artículos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg"
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
                    <button onClick={() => setShowGestionFamilias(true)} className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 text-sm">
                      <Layers size={18} />
                      <span className="hidden md:inline">Familias</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="w-full min-w-[640px]">
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
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">⚠ Bajo</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">✓ OK</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setArticuloSeleccionado(art)
                                  setShowNuevoArticulo(true)
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inventoryTab === 'peticiones' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <select
                      value={filtroPeticiones}
                      onChange={(e) => setFiltroPeticiones(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="en_compra">En compra</option>
                      <option value="recibida">Recibida</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {peticionesFiltradas.map(pet => (
                      <div key={pet.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-mono text-sm text-slate-600">{pet.numero}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${ESTADOS_PETICION[pet.estado]?.color}`}>
                                {ESTADOS_PETICION[pet.estado]?.icono} {pet.estado}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${PRIORIDADES[pet.prioridad]}`}>
                                {pet.prioridad}
                              </span>
                            </div>
                            <h4 className="font-medium text-slate-900">{pet.nombreArticulo}</h4>
                            <p className="text-sm text-slate-600">Cantidad: {pet.cantidad} {pet.unidad}</p>
                          </div>
                        </div>
                        {pet.descripcion && (
                          <p className="text-sm text-slate-600 mt-2">{pet.descripcion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inventoryTab === 'movimientos' && (
                <div className="text-center py-12 text-slate-500">
                  <RefreshCw size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Historial de movimientos próximamente</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB FLOTA */}
        {mainTab === 'flota' && (
          <div className="p-4 md:p-6">
            <div className="space-y-6">
              <div className="h-64 md:h-96 rounded-lg overflow-hidden border border-slate-200">
                <MapContainer center={[37.3716, -6.0719]} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {vehiculos.filter(v => v.latitud && v.longitud).map(v => (
                    <Marker key={v.id} position={[v.latitud, v.longitud]}>
                      <Popup>
                        <div className="text-center">
                          <div className="font-bold text-lg">{v.indicativo}</div>
                          <div className="text-sm text-slate-600">{v.matricula}</div>
                          <button
                            onClick={() => handleVerDetalleVehiculo(v)}
                            className="mt-2 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                          >
                            Ver Ficha
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Indicativo</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Matrícula</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Tipo</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Marca/Modelo</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehiculos.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="font-bold text-indigo-600">{v.indicativo}</span>
                        </td>
                        <td className="p-3 text-sm font-mono">{v.matricula}</td>
                        <td className="p-3 text-sm text-slate-600 capitalize hidden md:table-cell">{v.tipo}</td>
                        <td className="p-3 text-sm">{v.marca} {v.modelo}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                          v.estado === 'operativo' || v.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                          v.estado === 'taller' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                          }`}>
                            {v.estado}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleVerDetalleVehiculo(v)} className="text-indigo-600 hover:text-indigo-800" title="Ver detalles">
                        <Eye size={18} />
                        </button>
                        <button onClick={() => {
                       setVehiculoSeleccionado(v)
                       setShowEditarVehiculo(true)
                       }} className="text-blue-600 hover:text-blue-800" title="Editar vehículo">
                       <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  </div>
</td>
</tr>
                    ))}
</tbody>
</table>
</div>
</div>
</div>
        )}
</div>

      {/* MODAL NUEVO/EDITAR ARTÍCULO */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white rounded-t-xl">
              <h2 className="text-2xl font-bold">{articuloSeleccionado ? 'Editar' : 'Nuevo'} Artículo</h2>
            </div>

            <form onSubmit={handleCrearArticulo} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código</label>
                  <input type="text" name="codigo" defaultValue={articuloSeleccionado?.codigo || ''} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <input type="text" name="nombre" defaultValue={articuloSeleccionado?.nombre || ''} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea name="descripcion" defaultValue={articuloSeleccionado?.descripcion || ''} rows={2} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Actual *</label>
                  <input type="number" name="stockActual" defaultValue={articuloSeleccionado?.stockActual || 0} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Mínimo *</label>
                  <input type="number" name="stockMinimo" defaultValue={articuloSeleccionado?.stockMinimo || 0} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad *</label>
                  <input type="text" name="unidad" defaultValue={articuloSeleccionado?.unidad || 'Unidad'} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Familia *</label>
                  <select name="familiaId" defaultValue={articuloSeleccionado?.familia?.id || ''} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleccionar...</option>
                    {familias.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowNuevoArticulo(false); setArticuloSeleccionado(null); }} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">{articuloSeleccionado ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA PETICIÓN */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white rounded-t-xl">
              <h2 className="text-2xl font-bold">Nueva Petición</h2>
            </div>

            <form onSubmit={handleCrearPeticion} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Artículo *</label>
                  <select name="articuloId" required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleccionar...</option>
                    {articulos.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} (Stock: {a.stockActual})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad *</label>
                  <input type="number" name="cantidad" required min="1" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad *</label>
                  <input type="text" name="unidad" required defaultValue="Unidad" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Prioridad *</label>
                  <select name="prioridad" required className="w-full px-3 py-2 border rounded-lg">
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Motivo</label>
                  <textarea name="descripcion" rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Crear Petición</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN FAMILIAS */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6 text-white rounded-t-xl">
              <h2 className="text-2xl font-bold">Gestión de Familias</h2>
            </div>

            <div className="p-4 md:p-6">
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  id="nuevaFamilia"
                  placeholder="Nombre de la nueva familia"
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('nuevaFamilia') as HTMLInputElement
                    if (input.value.trim()) {
                      handleCrearFamilia(input.value.trim())
                      input.value = ''
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Añadir
                </button>
              </div>

              <div className="space-y-2">
                {familias.map(f => (
                  <div key={f.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                    <div>
                      <span className="font-medium">{f.nombre}</span>
                      <span className="text-xs text-slate-500 ml-2">({f._count?.articulos || 0} artículos)</span>
                    </div>
                    <button
                      onClick={() => handleEliminarFamilia(f.id)}
                      disabled={f._count?.articulos > 0}
                      className="text-red-600 hover:text-red-800 disabled:text-slate-400 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowGestionFamilias(false)} className="px-4 py-2 border rounded-lg">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR VEHÍCULO */}
{showEditarVehiculo && vehiculoSeleccionado && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Editar Vehículo: {vehiculoSeleccionado.indicativo}</h2>
          <button
            onClick={() => {
              setShowEditarVehiculo(false)
              setVehiculoSeleccionado(null)
            }}
            className="text-white hover:bg-white/20 rounded-lg p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form onSubmit={handleGuardarVehiculo} className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Indicativo *</label>
            <input 
              type="text" 
              name="indicativo" 
              defaultValue={vehiculoSeleccionado.indicativo}
              required 
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Matrícula *</label>
            <input 
              type="text" 
              name="matricula" 
              defaultValue={vehiculoSeleccionado.matricula}
              required 
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo *</label>
            <select 
              name="tipo" 
              defaultValue={vehiculoSeleccionado.tipo}
              required 
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="furgoneta">Furgoneta</option>
              <option value="turismo">Turismo</option>
              <option value="pickup">Pickup</option>
              <option value="remolque">Remolque</option>
              <option value="moto">Moto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado *</label>
            <select 
              name="estado" 
              defaultValue={vehiculoSeleccionado.estado}
              required 
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="operativo">Operativo</option>
              <option value="disponible">Disponible</option>
              <option value="taller">En Taller</option>
              <option value="fuera_servicio">Fuera de Servicio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Marca *</label>
            <input 
              type="text" 
              name="marca" 
              defaultValue={vehiculoSeleccionado.marca}
              required 
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Modelo *</label>
            <input 
              type="text" 
              name="modelo" 
              defaultValue={vehiculoSeleccionado.modelo}
              required 
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kilometraje</label>
            <input 
              type="number" 
              name="kmActual" 
              defaultValue={vehiculoSeleccionado.kmActual || ''}
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Año</label>
            <input 
              type="number" 
              name="anio" 
              defaultValue={vehiculoSeleccionado.anio || ''}
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Latitud</label>
            <input 
              type="number" 
              step="0.00000001"
              name="latitud" 
              defaultValue={vehiculoSeleccionado.latitud || ''}
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Longitud</label>
            <input 
              type="number" 
              step="0.00000001"
              name="longitud" 
              defaultValue={vehiculoSeleccionado.longitud || ''}
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button 
            type="button" 
            onClick={() => {
              setShowEditarVehiculo(false)
              setVehiculoSeleccionado(null)
            }} 
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* MODAL DETALLE VEHÍCULO MEJORADO */}
{showDetalleVehiculo && vehiculoSeleccionado && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Truck size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{vehiculoSeleccionado.indicativo}</h2>
              <p className="text-indigo-100 font-mono text-lg">{vehiculoSeleccionado.matricula}</p>
              <p className="text-indigo-200 text-sm mt-1">{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowDetalleVehiculo(false)
              setVehiculoSeleccionado(null)
            }}
            className="text-white hover:bg-white/20 rounded-lg p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="flex overflow-x-auto scrollbar-hide px-6">
          <button
            onClick={() => setDetalleTab('ficha')}
            className={`pb-3 pt-4 px-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
              detalleTab === 'ficha' 
                ? 'text-indigo-600 border-indigo-600' 
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            📋 Ficha Técnica
          </button>
          <button
            onClick={() => setDetalleTab('documentacion')}
            className={`pb-3 pt-4 px-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
              detalleTab === 'documentacion' 
                ? 'text-indigo-600 border-indigo-600' 
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            📄 Documentación
          </button>
          <button
            onClick={() => setDetalleTab('mantenimiento')}
            className={`pb-3 pt-4 px-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
              detalleTab === 'mantenimiento' 
                ? 'text-indigo-600 border-indigo-600' 
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            🔧 Mantenimiento
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {detalleTab === 'ficha' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identificación */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-indigo-600">🚗</span> Identificación
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Tipo:</span>
                  <span className="font-medium capitalize">{vehiculoSeleccionado.tipo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Marca:</span>
                  <span className="font-medium">{vehiculoSeleccionado.marca}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Modelo:</span>
                  <span className="font-medium">{vehiculoSeleccionado.modelo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Año:</span>
                  <span className="font-medium">{vehiculoSeleccionado.anio || '-'}</span>
                </div>
              </div>
            </div>

            {/* Estado y Uso */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-indigo-600">📊</span> Estado y Uso
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Estado:</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    vehiculoSeleccionado.estado === 'operativo' || vehiculoSeleccionado.estado === 'disponible'
                      ? 'bg-green-100 text-green-700' 
                      : vehiculoSeleccionado.estado === 'taller' 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {vehiculoSeleccionado.estado}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Kilometraje:</span>
                  <span className="font-medium">{vehiculoSeleccionado.kmActual?.toLocaleString() || '-'} km</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Ubicación:</span>
                  <span className="font-medium text-xs">
                    {vehiculoSeleccionado.latitud && vehiculoSeleccionado.longitud 
                      ? `${vehiculoSeleccionado.latitud.toFixed(6)}, ${vehiculoSeleccionado.longitud.toFixed(6)}`
                      : 'No disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {detalleTab === 'documentacion' && (
          <div>
            <form onSubmit={handleSubirDocumento} className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-indigo-600">📤</span> Subir Documento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="tipo" required className="px-3 py-2 border border-slate-300 rounded-lg">
                  {TIPOS_DOCUMENTO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input type="file" name="file" accept="application/pdf" required className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <button type="submit" disabled={uploadingDoc} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {uploadingDoc ? 'Subiendo...' : '📤 Subir Documento'}
              </button>
            </form>

            <div className="space-y-3">
              {documentos.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p>No hay documentos registrados</p>
                </div>
              ) : (
                documentos.map(doc => (
                  <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-slate-200 rounded-lg p-4 gap-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{doc.nombre}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {TIPOS_DOCUMENTO.find(t => t.value === doc.tipo)?.label}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        Ver PDF
                      </a>
                      <button onClick={() => handleEliminarDocumento(doc.id)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {detalleTab === 'mantenimiento' && (
          <div>
            <button
              onClick={() => {
                setMantenimientoSeleccionado(null)
                setShowNuevoMantenimiento(true)
              }}
              className="mb-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus size={18} />
              Registrar Mantenimiento
            </button>

            <div className="space-y-4">
              {mantenimientos.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No hay registros de mantenimiento</p>
                </div>
              ) : (
                mantenimientos.map(mant => (
                  <div key={mant.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                          mant.tipo === 'revision' ? 'bg-blue-100 text-blue-700' : 
                          mant.tipo === 'reparacion' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {TIPOS_MANTENIMIENTO.find(t => t.value === mant.tipo)?.label}
                        </span>
                        <span className="text-sm text-slate-600">{new Date(mant.fecha).toLocaleDateString('es-ES')}</span>
                      </div>
                      {mant.coste && (
                        <span className="text-sm font-semibold text-green-600">{mant.coste.toFixed(2)} €</span>
                      )}
                    </div>
                    <h4 className="font-medium text-slate-900 mb-2">{mant.descripcion}</h4>
                    {mant.kilometraje && (
                      <p className="text-sm text-slate-600 mb-2">📊 Kilometraje: {mant.kilometraje.toLocaleString()} km</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setMantenimientoSeleccionado(mant)
                          setShowNuevoMantenimiento(true)
                        }}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleEliminarMantenimiento(mant.id)} 
                        className="text-red-600 text-sm hover:underline"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}


      {/* MODAL NUEVO MANTENIMIENTO */}
      {showNuevoMantenimiento && vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
              <h2 className="text-2xl font-bold">{mantenimientoSeleccionado ? 'Editar' : 'Nuevo'} Mantenimiento</h2>
            </div>

            <form onSubmit={handleCrearMantenimiento} className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha *</label>
                  <input type="date" name="fecha" defaultValue={mantenimientoSeleccionado?.fecha.split('T')[0] || ''} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select name="tipo" defaultValue={mantenimientoSeleccionado?.tipo || ''} required className="w-full px-3 py-2 border rounded-lg">
                    {TIPOS_MANTENIMIENTO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Descripción *</label>
                  <textarea name="descripcion" defaultValue={mantenimientoSeleccionado?.descripcion || ''} required rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kilometraje</label>
                  <input type="number" name="kilometraje" defaultValue={mantenimientoSeleccionado?.kilometraje || ''} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Coste (€)</label>
                  <input type="number" name="coste" step="0.01" defaultValue={mantenimientoSeleccionado?.coste || ''} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowNuevoMantenimiento(false); setMantenimientoSeleccionado(null); }} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{mantenimientoSeleccionado ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO VEHÍCULO */}
      {showNuevoVehiculo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white rounded-t-xl">
              <h2 className="text-2xl font-bold">Nuevo Vehículo</h2>
            </div>

            <div className="p-4 md:p-6">
              <p className="text-slate-600 text-sm">Funcionalidad próximamente disponible</p>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowNuevoVehiculo(false)} 
                  className="px-4 py-2 border rounded-lg"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
