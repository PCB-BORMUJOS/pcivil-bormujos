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
          tipoEquipo: formData.get('tipoEquipo'),
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

 {/* MODAL NUEVO/EDITAR ARTÍCULO */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{articuloSeleccionado ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
                <button
                  onClick={() => {
                    setShowNuevoArticulo(false)
                    setArticuloSeleccionado(null)
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCrearArticulo} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código</label>
                  <input 
                    type="text" 
                    name="codigo" 
                    defaultValue={articuloSeleccionado?.codigo}
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Familia *</label>
                  <select 
                    name="familiaId" 
                    defaultValue={articuloSeleccionado?.familia?.id}
                    required 
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    {familias.map(fam => (
                      <option key={fam.id} value={fam.id}>{fam.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input 
                  type="text" 
                  name="nombre" 
                  defaultValue={articuloSeleccionado?.nombre}
                  required 
                  className="w-full px-3 py-2 border rounded-lg" 
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea 
                  name="descripcion" 
                  defaultValue={articuloSeleccionado?.descripcion}
                  rows={3} 
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Actual *</label>
                  <input 
                    type="number" 
                    name="stockActual" 
                    defaultValue={articuloSeleccionado?.stockActual || 0}
                    required 
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Mínimo *</label>
                  <input 
                    type="number" 
                    name="stockMinimo" 
                    defaultValue={articuloSeleccionado?.stockMinimo || 0}
                    required 
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad *</label>
                  <input 
                    type="text" 
                    name="unidad" 
                    defaultValue={articuloSeleccionado?.unidad || 'unidad'}
                    required 
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNuevoArticulo(false)
                    setArticuloSeleccionado(null)
                  }} 
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {articuloSeleccionado ? 'Actualizar' : 'Crear'}
                </button>
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
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Nueva Petición de Material</h2>
                <button
                  onClick={() => setShowNuevaPeticion(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCrearPeticion} className="p-4 md:p-6">
              <div>
                <label className="block text-sm font-medium mb-1">Artículo *</label>
                <select 
                  name="articuloId" 
                  required 
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar artículo...</option>
                  {articulos.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.nombre} (Stock: {art.stockActual} {art.unidad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad *</label>
                  <input 
                    type="number" 
                    name="cantidad" 
                    required 
                    min="1"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad *</label>
                  <input 
                    type="text" 
                    name="unidad" 
                    required 
                    defaultValue="unidad"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Prioridad *</label>
                <select 
                  name="prioridad" 
                  required 
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Motivo / Descripción</label>
                <textarea 
                  name="descripcion" 
                  rows={3} 
                  placeholder="Describe el motivo de la petición..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowNuevaPeticion(false)} 
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear Petición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN FAMILIAS */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestión de Familias</h2>
                <button
                  onClick={() => setShowGestionFamilias(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleCrearFamilia(formData.get('nombre') as string)
                e.currentTarget.reset()
              }} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  name="nombre" 
                  placeholder="Nombre de nueva familia..." 
                  required 
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Añadir
                </button>
              </form>

              <div className="space-y-2">
                {familias.map(fam => (
                  <div key={fam.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                    <div>
                      <p className="font-medium text-slate-900">{fam.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {articulos.filter(a => a.familia?.id === fam.id).length} artículos
                      </p>
                    </div>
                    <button
                      onClick={() => handleEliminarFamilia(fam.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO/EDITAR EQUIPO */}
      {(showNuevoEquipo || showEditarEquipo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {equipoSeleccionado ? `Editar Equipo: ${equipoSeleccionado.codigo}` : 'Nuevo Equipo de Radio'}
                </h2>
                <button
                  onClick={() => {
                    setShowNuevoEquipo(false)
                    setShowEditarEquipo(false)
                    setEquipoSeleccionado(null)
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCrearEquipo} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código *</label>
                  <input 
                    type="text" 
                    name="codigo" 
                    defaultValue={equipoSeleccionado?.codigo}
                    required 
                    placeholder="TR-01"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select 
                    name="tipo" 
                    defaultValue={equipoSeleccionado?.tipo}
                    required 
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {TIPOS_EQUIPO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marca *</label>
                  <input 
                    type="text" 
                    name="marca" 
                    defaultValue={equipoSeleccionado?.marca}
                    required 
                    placeholder="Motorola"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modelo *</label>
                  <input 
                    type="text" 
                    name="modelo" 
                    defaultValue={equipoSeleccionado?.modelo}
                    required 
                    placeholder="DP4400"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Número de Serie</label>
                  <input 
                    type="text" 
                    name="numeroSerie" 
                    defaultValue={equipoSeleccionado?.numeroSerie}
                    placeholder="SN123456789"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Configuración *</label>
                  <select 
                    name="configuracion" 
                    defaultValue={equipoSeleccionado?.configuracion}
                    required 
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {CONFIGURACIONES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado *</label>
                  <select 
                    name="estado" 
                    defaultValue={equipoSeleccionado?.estado || 'disponible'}
                    required 
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {ESTADOS_EQUIPO.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Salud Batería (%)</label>
                  <input 
                    type="number" 
                    name="estadoBateria" 
                    defaultValue={equipoSeleccionado?.estadoBateria}
                    min="0"
                    max="100"
                    placeholder="85"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Instalación Batería</label>
                  <input 
                    type="date" 
                    name="fechaInstalacionBat" 
                    defaultValue={equipoSeleccionado?.fechaInstalacionBat?.split('T')[0]}
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ubicación</label>
                  <input 
                    type="text" 
                    name="ubicacion" 
                    defaultValue={equipoSeleccionado?.ubicacion}
                    placeholder="Almacén principal"
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Observaciones</label>
                <textarea 
                  name="observaciones" 
                  defaultValue={equipoSeleccionado?.observaciones}
                  rows={3} 
                  placeholder="Notas adicionales sobre el equipo..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNuevoEquipo(false)
                    setShowEditarEquipo(false)
                    setEquipoSeleccionado(null)
                  }} 
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  {equipoSeleccionado ? 'Actualizar' : 'Crear'} Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE EQUIPO */}
      {showDetalleEquipo && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Radio size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{equipoSeleccionado.codigo}</h2>
                    <p className="text-amber-100 text-lg">{equipoSeleccionado.marca} {equipoSeleccionado.modelo}</p>
                    <p className="text-amber-200 text-sm mt-1 uppercase">{equipoSeleccionado.configuracion}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetalleEquipo(false)
                    setEquipoSeleccionado(null)
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
                      ? 'text-amber-600 border-amber-600' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  📋 Ficha Técnica
                </button>
                <button
                  onClick={() => setDetalleTab('bateria')}
                  className={`pb-3 pt-4 px-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    detalleTab === 'bateria' 
                      ? 'text-amber-600 border-amber-600' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  🔋 Batería y Mantenimiento
                </button>
                <button
                  onClick={() => setDetalleTab('ciclos')}
                  className={`pb-3 pt-4 px-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    detalleTab === 'ciclos' 
                      ? 'text-amber-600 border-amber-600' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  ⚡ Ciclos de Carga
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detalleTab === 'ficha' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-amber-600">📻</span> Identificación
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-medium capitalize">
                          {TIPOS_EQUIPO.find(t => t.value === equipoSeleccionado.tipo)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Marca:</span>
                        <span className="font-medium">{equipoSeleccionado.marca}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Modelo:</span>
                        <span className="font-medium">{equipoSeleccionado.modelo}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">S/N:</span>
                        <span className="font-medium font-mono text-xs">{equipoSeleccionado.numeroSerie || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-amber-600">📊</span> Estado y Configuración
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Estado:</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          equipoSeleccionado.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                          equipoSeleccionado.estado === 'en_carga' ? 'bg-blue-100 text-blue-700' :
                          equipoSeleccionado.estado === 'averiado' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {ESTADOS_EQUIPO.find(e => e.value === equipoSeleccionado.estado)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Configuración:</span>
                        <span className="font-medium uppercase">{equipoSeleccionado.configuracion}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Ubicación:</span>
                        <span className="font-medium">{equipoSeleccionado.ubicacion || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {equipoSeleccionado.observaciones && (
                    <div className="md:col-span-2 bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">📝 Observaciones</h4>
                      <p className="text-sm text-blue-800">{equipoSeleccionado.observaciones}</p>
                    </div>
                  )}
                </div>
              )}

              {detalleTab === 'bateria' && (
                <div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-6">
                    <div className="flex items-center gap-3">
                      <Battery className={`${
                        equipoSeleccionado.estadoBateria >= 80 ? 'text-green-600' :
                        equipoSeleccionado.estadoBateria >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`} size={48} />
                      <div>
                        <h3 className="font-bold text-lg">Estado de Batería</h3>
                        <p className="text-2xl font-bold text-amber-900">
                          {equipoSeleccionado.estadoBateria || '-'}%
                        </p>
                        {getBateriaAlerta(equipoSeleccionado.fechaInstalacionBat) && (
                          <p className="text-sm text-orange-600 mt-1">
                            {getBateriaAlerta(equipoSeleccionado.fechaInstalacionBat)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-12 text-slate-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>Historial de mantenimiento próximamente</p>
                  </div>
                </div>
              )}

              {detalleTab === 'ciclos' && (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p>Registro de ciclos de carga próximamente</p>
                  <p className="text-xs mt-2">Ciclos registrados: {equipoSeleccionado.ciclosCarga || 0}</p>
                </div>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleEliminarEquipo(equipoSeleccionado.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Eliminar Equipo
                </button>
                <button
                  onClick={() => {
                    setShowDetalleEquipo(false)
                    setShowEditarEquipo(true)
                  }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Editar Equipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
