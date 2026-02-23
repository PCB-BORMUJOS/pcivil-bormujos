'use client'

import { useState, useEffect } from 'react'
import { Radio, Package, AlertTriangle, Battery, Plus, RefreshCw, Eye, Search, Layers, ShoppingCart } from 'lucide-react'

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

const TIPOS_EQUIPO = [
  { value: 'portatil', label: 'Portátil (Walkie)' },
  { value: 'movil', label: 'Móvil (Emisora)' },
  { value: 'base', label: 'Base' },
  { value: 'repetidor', label: 'Repetidor' }
]

const CONFIGURACIONES = [
  { value: 'analogico', label: 'Analógico' },
  { value: 'dmr', label: 'DMR' },
  { value: 'tetra', label: 'TETRA' }
]

const ESTADOS_EQUIPO = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_carga', label: 'En Carga' },
  { value: 'averiado', label: 'Averiado' },
  { value: 'mantenimiento', label: 'Mantenimiento' }
]

const TIPOS_MANTENIMIENTO = [
  { value: 'revision', label: 'Revisión' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'cambio_bateria', label: 'Cambio de Batería' },
  { value: 'actualizacion_firmware', label: 'Actualización Firmware' }
]

export default function TransmisionesPage() {
  const [mainTab, setMainTab] = useState<'inventario' | 'equipos'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [loading, setLoading] = useState(true)
  
  const [articulos, setArticulos] = useState<any[]>([])
  const [familias, setFamilias] = useState<any[]>([])
  const [peticiones, setPeticiones] = useState<any[]>([])
  const [equipos, setEquipos] = useState<any[]>([])
  const [categoriaTransmisiones, setCategoriaTransmisiones] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')
  
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoEquipo, setShowNuevoEquipo] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null)
  
  const [showDetalleEquipo, setShowDetalleEquipo] = useState(false)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any>(null)
  const [detalleTab, setDetalleTab] = useState<'ficha' | 'bateria' | 'ciclos'>('ficha')
  const [showEditarEquipo, setShowEditarEquipo] = useState(false)
  
  const [mantenimientos, setMantenimientos] = useState<any[]>([])
  const [ciclosCarga, setCiclosCarga] = useState<any[]>([])
  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false)
  const [mantenimientoSeleccionado, setMantenimientoSeleccionado] = useState<any>(null)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const resEquipos = await fetch('/api/logistica?tipo=equipos-radio')
      const dataEquipos = await resEquipos.json()
      setEquipos(dataEquipos.equipos || [])
      
      const resInventario = await fetch('/api/logistica?inventario=transmisiones')
      const dataInventario = await resInventario.json()
      setArticulos(dataInventario.articulos || [])
      setFamilias(dataInventario.familias || [])
      
      const resCat = await fetch('/api/logistica?tipo=categoria&slug=transmisiones')
      const dataCat = await resCat.json()
      if (dataCat.categoria) {
        setCategoriaTransmisiones(dataCat.categoria.id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarPeticiones = async () => {
    try {
      const res = await fetch('/api/logistica/peticiones?area=transmisiones')
      const data = await res.json()
      setPeticiones(data.peticiones || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleVerDetalleEquipo = (equipo: any) => {
    setEquipoSeleccionado(equipo)
    setDetalleTab('ficha')
    setShowDetalleEquipo(true)
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
          categoriaId: categoriaTransmisiones
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
          areaOrigen: 'transmisiones'
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
    if (!categoriaTransmisiones) return
    
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'familia',
          nombre,
          categoriaId: categoriaTransmisiones
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

  const handleCrearEquipo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/logistica', {
        method: equipoSeleccionado ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'equipo-radio',
          id: equipoSeleccionado?.id,
          codigo: formData.get('codigo'),
          tipo: formData.get('tipoEquipo'),
          marca: formData.get('marca'),
          modelo: formData.get('modelo'),
          numeroSerie: formData.get('numeroSerie'),
          configuracion: formData.get('configuracion'),
          estado: formData.get('estado'),
          estadoBateria: formData.get('estadoBateria'),
          fechaInstalacionBat: formData.get('fechaInstalacionBat'),
          ubicacion: formData.get('ubicacion'),
          observaciones: formData.get('observaciones')
        })
      })

      if (res.ok) {
        await cargarDatos()
        setShowNuevoEquipo(false)
        setShowEditarEquipo(false)
        setEquipoSeleccionado(null)
        alert(equipoSeleccionado ? 'Equipo actualizado' : 'Equipo creado')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEliminarEquipo = async (id: string) => {
    if (!confirm('¿Eliminar este equipo?')) return
    
    try {
      const res = await fetch(`/api/logistica?tipo=equipo-radio&id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await cargarDatos()
        alert('Equipo eliminado')
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

  const getBateriaColor = (nivel: number | null) => {
    if (!nivel) return 'text-slate-400'
    if (nivel >= 80) return 'text-green-600'
    if (nivel >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBateriaAlert = (fechaInstalacion: Date | null) => {
    if (!fechaInstalacion) return null
    const años = (new Date().getTime() - new Date(fechaInstalacion).getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (años > 2) return '⚠️ Batería antigua (>2 años)'
    return null
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (inventoryTab === 'peticiones') {
      cargarPeticiones()
    }
  }, [inventoryTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
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
          <div className="bg-amber-100 p-3 rounded-xl">
            <Radio className="text-amber-600" size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">TRANSMISIONES</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Equipos de Comunicación</h1>
            <p className="text-slate-500 text-xs md:text-sm">Gestión de radios y sistemas de comunicaciones</p>
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
          <button onClick={() => setShowNuevoEquipo(true)} className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2 font-medium text-sm">
            <Radio size={16} />
            <span className="hidden sm:inline">Nuevo Equipo</span>
            <span className="sm:hidden">Equipo</span>
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
              <p className="text-slate-500 text-xs font-medium">Equipos</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{equipos.length}</h3>
            </div>
            <div className="bg-amber-100 p-2.5 rounded-xl">
              <Radio size={22} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Disponibles</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                {equipos.filter(e => e.estado === 'disponible').length}
              </h3>
            </div>
            <div className="bg-green-100 p-2.5 rounded-xl">
              <Radio size={22} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-medium">Averiados</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                {equipos.filter(e => e.estado === 'averiado').length}
              </h3>
            </div>
            <div className="bg-red-100 p-2.5 rounded-xl">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
          {[
            { id: 'inventario', label: 'Inventario del Área', icon: Package },
            { id: 'equipos', label: 'Equipos de Radio', icon: Radio },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                mainTab === tab.id 
                  ? 'border-amber-500 text-amber-600 bg-amber-50' 
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

        {/* TAB EQUIPOS */}
        {mainTab === 'equipos' && (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Marca/Modelo</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">S/N</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Config</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Batería</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipos.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-bold text-amber-600">{eq.codigo}</span>
                      </td>
                      <td className="p-3 text-sm capitalize">{eq.tipo}</td>
                      <td className="p-3 text-sm">{eq.marca} {eq.modelo}</td>
                      <td className="p-3 text-xs text-slate-500 font-mono hidden md:table-cell">{eq.numeroSerie || '-'}</td>
                      <td className="p-3 text-xs text-slate-600 uppercase hidden lg:table-cell">{eq.configuracion}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Battery className={`${getBateriaColor(eq.estadoBateria)}`} size={18} />
                          <span className="text-sm font-medium">{eq.estadoBateria || '-'}%</span>
                        </div>
                        {getBateriaAlert(eq.fechaInstalacionBat) && (
                          <p className="text-xs text-yellow-600 mt-1">{getBateriaAlert(eq.fechaInstalacionBat)}</p>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                          eq.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                          eq.estado === 'en_carga' ? 'bg-blue-100 text-blue-700' :
                          eq.estado === 'averiado' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {eq.estado}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleVerDetalleEquipo(eq)} className="text-amber-600 hover:text-amber-800" title="Ver detalles">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => {
                            setEquipoSeleccionado(eq)
                            setShowEditarEquipo(true)
                          }} className="text-blue-600 hover:text-blue-800" title="Editar equipo">
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
        )}
      </div>

      {/* MODALES - Continuará en siguiente parte... */}
    </div>
  )
}
