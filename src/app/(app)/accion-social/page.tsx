'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import {
  Heart, Phone, Building2, MapPin, Users, AlertTriangle,
  Plus, RefreshCw, Search, ChevronDown, ChevronUp, Edit,
  Trash2, X, Check, ShieldAlert, BookUser, Home, Hotel,
  Siren, Package, TrendingDown, ArrowRight, Eye, EyeOff,
  Info, Calendar, User, Baby
} from 'lucide-react'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Articulo {
  id: string
  codigo?: string
  nombre: string
  stockActual: number
  stockMinimo: number
  unidad: string
  familia?: { nombre: string }
}

interface Familia {
  id: string
  nombre: string
  _count?: { articulos: number }
}

interface Peticion {
  id: string
  numero: string
  nombreArticulo: string
  cantidad: number
  unidad: string
  prioridad: string
  estado: string
  fechaSolicitud: string
  solicitante?: { nombre: string }
  descripcion?: string
}

interface EspacioAcogida {
  id: string
  nombre: string
  tipo: string
  direccion: string
  telefono?: string
  email?: string
  contacto?: string
  plazas?: number
  plazasUrgencia?: number
  latitud?: number
  longitud?: number
  estado: string
  notas?: string
}

interface CentroEmergencia {
  id: string
  nombre: string
  tipo: string
  direccion: string
  telefono?: string
  responsable?: string
  capacidad?: number
  latitud?: number
  longitud?: number
  descripcion?: string
  activo: boolean
}

interface Contacto {
  id: string
  nombre: string
  entidad?: string
  categoria: string
  cargo?: string
  telefono: string
  telefonoAlt?: string
  email?: string
  disponibilidad?: string
  notas?: string
}

interface CasoViogen {
  id: string
  numeroCaso: string
  fechaIntervencion: string
  victimaNombre: string
  victimaDni?: string
  victimaTelefono?: string
  victimaDireccion: string
  victimaEdad?: number
  tieneHijos: boolean
  numeroHijos?: number
  edadesHijos?: string
  agresorNombre?: string
  motivoIntervencion: string
  recursosActivados?: string
  derivadoA?: string
  observaciones?: string
  estado: string
  createdAt: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_ESPACIO: Record<string, { label: string; color: string }> = {
  hotel:       { label: 'Hotel',               color: 'bg-blue-100 text-blue-800' },
  hostal:      { label: 'Hostal',              color: 'bg-sky-100 text-sky-800' },
  apartamento: { label: 'Apartamento Turístico', color: 'bg-indigo-100 text-indigo-800' },
  pension:     { label: 'Pensión',             color: 'bg-violet-100 text-violet-800' },
  albergue:    { label: 'Albergue',            color: 'bg-purple-100 text-purple-800' },
  otro:        { label: 'Otro',                color: 'bg-gray-100 text-gray-800' }
}

const TIPOS_CENTRO: Record<string, { label: string; color: string; icon: any }> = {
  pabellon:            { label: 'Pabellón Cubierto',      color: 'bg-teal-100 text-teal-800',    icon: Building2 },
  centro_multifuncional: { label: 'Centro Multifuncional', color: 'bg-cyan-100 text-cyan-800',   icon: Building2 },
  ceu:                 { label: 'CEU San Pablo',           color: 'bg-emerald-100 text-emerald-800', icon: Building2 },
  otro:                { label: 'Otro',                    color: 'bg-gray-100 text-gray-800',   icon: Building2 }
}

const CATEGORIAS_DIRECTORIO: Record<string, { label: string; color: string }> = {
  servicios_sociales: { label: 'Servicios Sociales', color: 'bg-rose-100 text-rose-800' },
  policia:            { label: 'Policía',            color: 'bg-blue-100 text-blue-800' },
  sanidad:            { label: 'Sanidad',            color: 'bg-green-100 text-green-800' },
  juzgado:            { label: 'Juzgado/Fiscal',     color: 'bg-yellow-100 text-yellow-800' },
  vivienda:           { label: 'Vivienda',           color: 'bg-orange-100 text-orange-800' },
  educacion:          { label: 'Educación',          color: 'bg-purple-100 text-purple-800' },
  otro:               { label: 'Otro',               color: 'bg-gray-100 text-gray-800' }
}

const ESTADOS_VIOGEN: Record<string, { label: string; color: string }> = {
  activo:   { label: 'Activo',   color: 'bg-red-100 text-red-800' },
  cerrado:  { label: 'Cerrado',  color: 'bg-gray-100 text-gray-700' },
  derivado: { label: 'Derivado', color: 'bg-blue-100 text-blue-800' }
}

const ESTADOS_PETICION: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  aprobada:  { label: 'Aprobada',  color: 'bg-blue-100 text-blue-800' },
  en_compra: { label: 'En Compra', color: 'bg-purple-100 text-purple-800' },
  recibida:  { label: 'Recibida',  color: 'bg-green-100 text-green-800' },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800' }
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function AccionSocialPage() {
  const { data: session } = useSession()

  // Tabs
  const [mainTab, setMainTab] = useState<'inventario' | 'espacios' | 'centros' | 'directorio' | 'viogen'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')

  // Datos
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [peticiones, setPeticiones] = useState<Peticion[]>([])
  const [espacios, setEspacios] = useState<EspacioAcogida[]>([])
  const [centros, setCentros] = useState<CentroEmergencia[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [casos, setCasos] = useState<CasoViogen[]>([])
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [stats, setStats] = useState({ espacios: 0, centros: 0, contactos: 0, casosActivos: 0, plazasUrgencia: 0 })

  // UI
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchContacto, setSearchContacto] = useState('')
  const [searchViogen, setSearchViogen] = useState('')
  const [filtroFamilia, setFiltroFamilia] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')
  const [filtroCategoria, setFiltroCategoria] = useState('all')
  const [filtroViogen, setFiltroViogen] = useState('all')
  const [expandedCaso, setExpandedCaso] = useState<string | null>(null)

  // Modales
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoEspacio, setShowNuevoEspacio] = useState(false)
  const [showNuevoCentro, setShowNuevoCentro] = useState(false)
  const [showNuevoContacto, setShowNuevoContacto] = useState(false)
  const [showNuevoCaso, setShowNuevoCaso] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<EspacioAcogida | null>(null)
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null)

  // VIOGEN - check reincidencia
  const [dniBusqueda, setDniBusqueda] = useState('')
  const [reincidencia, setReincidencia] = useState<CasoViogen[]>([])

  // ─── Carga de datos ────────────────────────────────────────────────────────

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [resInventario, resCat, resEspacios, resCentros, resContactos, resCasos, resStats] = await Promise.all([
        fetch('/api/logistica?inventario=accion_social'),
        fetch('/api/logistica?tipo=categoria&slug=accion_social'),
        fetch('/api/accion-social?tipo=espacios'),
        fetch('/api/accion-social?tipo=centros'),
        fetch('/api/accion-social?tipo=directorio'),
        fetch('/api/accion-social?tipo=viogen'),
        fetch('/api/accion-social?tipo=stats')
      ])

      const [dataInv, dataCat, dataEsp, dataCent, dataCont, dataCasos, dataStats] = await Promise.all([
        resInventario.json(),
        resCat.json(),
        resEspacios.json(),
        resCentros.json(),
        resContactos.json(),
        resCasos.json(),
        resStats.json()
      ])

      setArticulos(dataInv.articulos || [])
      setFamilias(dataInv.familias || [])
      if (dataCat.categoria) setCategoriaId(dataCat.categoria.id)
      setEspacios(dataEsp.espacios || [])
      setCentros(dataCent.centros || [])
      setContactos(dataCont.contactos || [])
      setCasos(dataCasos.casos || [])
      setStats(dataStats)
    } catch (error) {
      console.error('Error cargando Acción Social:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarPeticiones = async () => {
    try {
      const res = await fetch('/api/logistica/peticiones?area=accion_social')
      const data = await res.json()
      setPeticiones(data.peticiones || [])
    } catch (error) {
      console.error('Error peticiones:', error)
    }
  }

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab])

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchFamilia = filtroFamilia === 'all' || a.familia?.nombre === filtroFamilia
    return matchSearch && matchFamilia
  })

  const peticionesFiltradas = peticiones.filter(p =>
    filtroPeticiones === 'all' || p.estado === filtroPeticiones
  )

  const contactosFiltrados = contactos.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(searchContacto.toLowerCase()) ||
      (c.entidad && c.entidad.toLowerCase().includes(searchContacto.toLowerCase()))
    const matchCat = filtroCategoria === 'all' || c.categoria === filtroCategoria
    return matchSearch && matchCat
  })

  const casosFiltrados = casos.filter(c => {
    const matchSearch = c.victimaNombre.toLowerCase().includes(searchViogen.toLowerCase()) ||
      c.numeroCaso.toLowerCase().includes(searchViogen.toLowerCase())
    const matchEstado = filtroViogen === 'all' || c.estado === filtroViogen
    return matchSearch && matchEstado
  })

  // Detectar reincidencia en lista de casos
  const casosTienenReincidencia = (caso: CasoViogen): boolean => {
    if (!caso.victimaDni) return false
    return casos.filter(c => c.victimaDni === caso.victimaDni && c.id !== caso.id).length > 0
  }

  const checkDniReincidencia = async (dni: string) => {
    if (!dni || dni.length < 5) return
    const res = await fetch(`/api/accion-social?tipo=viogen-check-dni&dni=${encodeURIComponent(dni)}`)
    const data = await res.json()
    setReincidencia(data.casos || [])
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">ACCIÓN SOCIAL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Área de Acción Social</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión social, espacios de acogida, directorio y VIOGEN</p>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === 'inventario' && (
            <>
              <button onClick={() => setShowNuevaPeticion(true)}
                className="flex items-center gap-2 px-4 py-2 border border-rose-600 text-rose-600 rounded-lg hover:bg-rose-50 text-sm font-medium">
                <ArrowRight className="w-4 h-4" /> Petición
              </button>
              <button onClick={() => setShowNuevoArticulo(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
                <Plus className="w-4 h-4" /> Artículo
              </button>
            </>
          )}
          {mainTab === 'espacios' && (
            <button onClick={() => setShowNuevoEspacio(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Espacio
            </button>
          )}
          {mainTab === 'centros' && (
            <button onClick={() => setShowNuevoCentro(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Centro
            </button>
          )}
          {mainTab === 'directorio' && (
            <button onClick={() => setShowNuevoContacto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Contacto
            </button>
          )}
          {mainTab === 'viogen' && (
            <button onClick={() => setShowNuevoCaso(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-700 text-white rounded-lg hover:bg-rose-800 text-sm font-medium">
              <ShieldAlert className="w-4 h-4" /> Nuevo Caso VIOGEN
            </button>
          )}
          <button onClick={cargarDatos} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Material del Área</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{articulos.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Plazas Urgencia</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.plazasUrgencia}</p>
              <p className="text-xs text-gray-400">{stats.espacios} espacios activos</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Hotel className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Centros Emergencia</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.centros}</p>
              <p className="text-xs text-gray-400">{stats.contactos} contactos directorio</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Casos VIOGEN Activos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.casosActivos}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: 'inventario', icon: Package,     label: 'Inventario del Área' },
              { key: 'espacios',   icon: Hotel,        label: 'Espacios de Acogida' },
              { key: 'centros',    icon: Building2,    label: 'Centros de Emergencia' },
              { key: 'directorio', icon: BookUser,     label: 'Directorio' },
              { key: 'viogen',     icon: ShieldAlert,  label: 'VIOGEN' }
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setMainTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  mainTab === tab.key
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.key === 'viogen' && stats.casosActivos > 0 && (
                  <span className="ml-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {stats.casosActivos}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">

          {/* ── TAB: INVENTARIO ──────────────────────────────────────── */}
          {mainTab === 'inventario' && (
            <div className="space-y-4">
              <div className="flex gap-1 border-b border-gray-100 pb-2">
                {(['stock', 'peticiones', 'movimientos'] as const).map(sub => (
                  <button key={sub}
                    onClick={() => setInventoryTab(sub)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                      inventoryTab === sub ? 'bg-rose-50 text-rose-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}>
                    {sub === 'stock' ? 'Stock' : sub === 'peticiones' ? 'Peticiones' : 'Movimientos'}
                  </button>
                ))}
              </div>

              {inventoryTab === 'stock' && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar artículo..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <select value={filtroFamilia} onChange={e => setFiltroFamilia(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                      <option value="all">Todas las familias</option>
                      {familias.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
                    </select>
                    <button onClick={() => setShowGestionFamilias(true)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      Familias
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Artículo</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Familia</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Mínimo</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Unidad</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {articulosFiltrados.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                            No hay artículos en el inventario del Área Social
                          </td></tr>
                        ) : articulosFiltrados.map(a => (
                          <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-3 text-gray-500 font-mono text-xs">{a.codigo || '—'}</td>
                            <td className="py-3 px-3 font-medium text-gray-900">{a.nombre}</td>
                            <td className="py-3 px-3 text-gray-500">{a.familia?.nombre || '—'}</td>
                            <td className="py-3 px-3">
                              <span className={`font-semibold ${a.stockActual <= a.stockMinimo ? 'text-red-600' : 'text-gray-900'}`}>
                                {a.stockActual}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-500">{a.stockMinimo}</td>
                            <td className="py-3 px-3 text-gray-500">{a.unidad}</td>
                            <td className="py-3 px-3">
                              {a.stockActual <= a.stockMinimo
                                ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Stock bajo</span>
                                : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">OK</span>
                              }
                            </td>
                            <td className="py-3 px-3">
                              <button onClick={() => setArticuloSeleccionado(a)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                <Edit className="w-3.5 h-3.5" />
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
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {Object.entries({ all: 'Todas', pendiente: 'Pendientes', aprobada: 'Aprobadas', en_compra: 'En Compra', recibida: 'Recibidas' }).map(([k, v]) => (
                      <button key={k} onClick={() => setFiltroPeticiones(k)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
                          filtroPeticiones === k ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>{v}</button>
                    ))}
                  </div>
                  {peticionesFiltradas.length === 0
                    ? <p className="text-center py-12 text-gray-400 text-sm">No hay peticiones</p>
                    : peticionesFiltradas.map(p => (
                      <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-mono text-gray-400">{p.numero}</span>
                            <p className="font-medium text-gray-900 mt-0.5">{p.nombreArticulo} — {p.cantidad} {p.unidad}</p>
                            {p.descripcion && <p className="text-xs text-gray-500 mt-1">{p.descripcion}</p>}
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADOS_PETICION[p.estado]?.color}`}>
                              {ESTADOS_PETICION[p.estado]?.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.prioridad === 'urgente' ? 'bg-red-100 text-red-700'
                              : p.prioridad === 'alta' ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>{p.prioridad}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {inventoryTab === 'movimientos' && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No hay movimientos registrados
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ESPACIOS DE ACOGIDA ─────────────────────────────── */}
          {mainTab === 'espacios' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Registro de establecimientos para acogida de urgencia por razones sociales.</p>
              {espacios.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Hotel className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay espacios registrados</p>
                  <button onClick={() => setShowNuevoEspacio(true)}
                    className="mt-3 text-rose-600 text-sm hover:underline">Añadir el primero</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {espacios.map(esp => (
                    <div key={esp.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPOS_ESPACIO[esp.tipo]?.color}`}>
                            {TIPOS_ESPACIO[esp.tipo]?.label || esp.tipo}
                          </span>
                          <h3 className="font-semibold text-gray-900 mt-1">{esp.nombre}</h3>
                        </div>
                        <button onClick={() => setEspacioSeleccionado(esp)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" /> {esp.direccion}
                      </p>
                      {esp.telefono && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                          <Phone className="w-3 h-3" /> {esp.telefono}
                        </p>
                      )}
                      {esp.contacto && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                          <User className="w-3 h-3" /> {esp.contacto}
                        </p>
                      )}
                      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">{esp.plazas ?? '—'}</p>
                          <p className="text-xs text-gray-400">Plazas totales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-rose-600">{esp.plazasUrgencia ?? '—'}</p>
                          <p className="text-xs text-gray-400">Plazas urgencia</p>
                        </div>
                        <div className="ml-auto">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            esp.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{esp.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                        </div>
                      </div>
                      {esp.notas && <p className="text-xs text-gray-400 mt-2 italic">{esp.notas}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CENTROS DE EMERGENCIA ───────────────────────────── */}
          {mainTab === 'centros' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Instalaciones municipales para concentración y acogida en situaciones de emergencia activa.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista de centros */}
                <div className="space-y-3">
                  {centros.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No hay centros registrados</p>
                    </div>
                  ) : centros.map(c => (
                    <div key={c.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPOS_CENTRO[c.tipo]?.color}`}>
                            {TIPOS_CENTRO[c.tipo]?.label || c.tipo}
                          </span>
                          <h3 className="font-semibold text-gray-900 mt-1">{c.nombre}</h3>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {c.direccion}
                          </p>
                          {c.telefono && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" /> {c.telefono}
                            </p>
                          )}
                          {c.responsable && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" /> Responsable: {c.responsable}
                            </p>
                          )}
                          {c.descripcion && <p className="text-xs text-gray-400 mt-2 italic">{c.descripcion}</p>}
                        </div>
                        <div className="text-right">
                          {c.capacidad && (
                            <div>
                              <p className="text-2xl font-bold text-teal-600">{c.capacidad}</p>
                              <p className="text-xs text-gray-400">personas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mapa de centros */}
                <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200">
                  <MapContainer center={[37.3710, -6.0710]} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {centros.filter(c => c.latitud && c.longitud).map(c => (
                      <Marker key={c.id} position={[c.latitud!, c.longitud!]}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-bold">{c.nombre}</p>
                            <p className="text-gray-500">{c.direccion}</p>
                            {c.capacidad && <p className="text-teal-700 font-medium mt-1">Capacidad: {c.capacidad} personas</p>}
                            {c.telefono && <p className="text-gray-500">{c.telefono}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {espacios.filter(e => e.latitud && e.longitud && e.estado === 'activo').map(e => (
                      <Marker key={e.id} position={[e.latitud!, e.longitud!]}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-bold">{e.nombre}</p>
                            <p className="text-xs text-gray-400">{TIPOS_ESPACIO[e.tipo]?.label}</p>
                            <p className="text-gray-500">{e.direccion}</p>
                            {e.plazasUrgencia && <p className="text-rose-700 font-medium mt-1">Plazas urgencia: {e.plazasUrgencia}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: DIRECTORIO ──────────────────────────────────────── */}
          {mainTab === 'directorio' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Contactos de profesionales, entidades y servicios para situaciones de necesidad.</p>
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchContacto} onChange={e => setSearchContacto(e.target.value)}
                    placeholder="Buscar contacto..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="all">Todas las categorías</option>
                  {Object.entries(CATEGORIAS_DIRECTORIO).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {contactosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <BookUser className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay contactos registrados</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contactosFiltrados.map(c => (
                    <div key={c.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIAS_DIRECTORIO[c.categoria]?.color}`}>
                              {CATEGORIAS_DIRECTORIO[c.categoria]?.label || c.categoria}
                            </span>
                            {c.disponibilidad === '24h' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">24h</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 mt-1">{c.nombre}</h3>
                          {c.cargo && <p className="text-xs text-gray-500">{c.cargo}</p>}
                          {c.entidad && <p className="text-xs text-gray-400">{c.entidad}</p>}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => setContactoSeleccionado(c)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                        <a href={`tel:${c.telefono}`}
                          className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-800 font-medium">
                          <Phone className="w-3.5 h-3.5" /> {c.telefono}
                        </a>
                        {c.telefonoAlt && (
                          <a href={`tel:${c.telefonoAlt}`}
                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
                            <Phone className="w-3 h-3" /> {c.telefonoAlt}
                          </a>
                        )}
                        {c.email && (
                          <p className="text-xs text-gray-400">{c.email}</p>
                        )}
                      </div>
                      {c.notas && <p className="text-xs text-gray-400 mt-2 italic">{c.notas}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: VIOGEN ──────────────────────────────────────────── */}
          {mainTab === 'viogen' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  <strong>Información confidencial.</strong> Registro de intervenciones en colaboración con Policía Local en materia VIOGEN.
                  Acceso restringido. Los datos están protegidos.
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchViogen} onChange={e => setSearchViogen(e.target.value)}
                    placeholder="Buscar por nombre o número..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex gap-2">
                  {Object.entries({ all: 'Todos', activo: 'Activos', cerrado: 'Cerrados', derivado: 'Derivados' }).map(([k, v]) => (
                    <button key={k} onClick={() => setFiltroViogen(k)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
                        filtroViogen === k ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>{v}</button>
                  ))}
                </div>
              </div>

              {casosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay casos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {casosFiltrados.map(caso => {
                    const esReincidente = casosTienenReincidencia(caso)
                    const expanded = expandedCaso === caso.id
                    return (
                      <div key={caso.id} className={`border rounded-xl overflow-hidden ${
                        esReincidente ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
                      }`}>
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedCaso(expanded ? null : caso.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-gray-400">{caso.numeroCaso}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADOS_VIOGEN[caso.estado]?.color}`}>
                                {ESTADOS_VIOGEN[caso.estado]?.label}
                              </span>
                              {esReincidente && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-200 text-orange-800">
                                  <AlertTriangle className="w-3 h-3" /> REINCIDENTE
                                </span>
                              )}
                              {caso.tieneHijos && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  <Baby className="w-3 h-3" /> {caso.numeroHijos} hijo(s)
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 mt-0.5">{caso.victimaNombre}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(caso.fechaIntervencion).toLocaleDateString('es-ES')} · {caso.victimaDireccion}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t border-gray-100 p-4 bg-white space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Víctima</p>
                                <p className="font-medium">{caso.victimaNombre}</p>
                                {caso.victimaDni && <p className="text-gray-500">DNI: {caso.victimaDni}</p>}
                                {caso.victimaEdad && <p className="text-gray-500">Edad: {caso.victimaEdad} años</p>}
                                {caso.victimaTelefono && <p className="text-gray-500">Telf: {caso.victimaTelefono}</p>}
                                <p className="text-gray-500">{caso.victimaDireccion}</p>
                              </div>
                              {caso.tieneHijos && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Hijos</p>
                                  <p className="font-medium">{caso.numeroHijos} hijo(s)</p>
                                  {caso.edadesHijos && <p className="text-gray-500">Edades: {caso.edadesHijos}</p>}
                                </div>
                              )}
                              {caso.agresorNombre && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Agresor</p>
                                  <p className="font-medium">{caso.agresorNombre}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Intervención</p>
                                <p className="text-gray-700">{caso.motivoIntervencion}</p>
                              </div>
                              {caso.recursosActivados && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Recursos Activados</p>
                                  <p className="text-gray-700">{caso.recursosActivados}</p>
                                </div>
                              )}
                              {caso.derivadoA && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Derivado a</p>
                                  <p className="text-gray-700">{caso.derivadoA}</p>
                                </div>
                              )}
                            </div>
                            {caso.observaciones && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Observaciones</p>
                                <p className="text-sm text-gray-700">{caso.observaciones}</p>
                              </div>
                            )}
                            {esReincidente && (
                              <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                                <p className="text-xs font-bold text-orange-800 flex items-center gap-1 mb-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> ATENCIÓN: Persona con intervenciones anteriores
                                </p>
                                <p className="text-xs text-orange-700">
                                  {casos.filter(c => c.victimaDni === caso.victimaDni && c.id !== caso.id).map(c =>
                                    `${c.numeroCaso} (${new Date(c.fechaIntervencion).toLocaleDateString('es-ES')})`
                                  ).join(' · ')}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALES
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* Modal Nuevo Artículo */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Nuevo Artículo</h3>
              <button onClick={() => setShowNuevoArticulo(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              if (!categoriaId) { alert('No se encontró la categoría Acción Social en la BD'); return }
              const familiaId = fd.get('familiaId') as string
              if (!familiaId) { alert('Selecciona una familia'); return }
              await fetch('/api/logistica', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'articulo',
                  codigo: fd.get('codigo'),
                  nombre: fd.get('nombre'),
                  stockActual: parseInt(fd.get('stockActual') as string) || 0,
                  stockMinimo: parseInt(fd.get('stockMinimo') as string) || 0,
                  unidad: fd.get('unidad'),
                  familiaId,
                  servicioId: 'default'
                })
              })
              setShowNuevoArticulo(false)
              cargarDatos()
            }} className="p-4 space-y-3">
              <input name="codigo" placeholder="Código (opcional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input name="nombre" placeholder="Nombre del artículo *" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <select name="familiaId" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar familia *</option>
                {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input name="stockActual" type="number" min="0" placeholder="Stock actual *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="stockMinimo" type="number" min="0" placeholder="Stock mínimo *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <input name="unidad" placeholder="Unidad (ud, kg, l...)" defaultValue="ud" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Petición */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Nueva Petición de Material</h3>
              <button onClick={() => setShowNuevaPeticion(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await fetch('/api/logistica', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'peticion',
                  nombreArticulo: fd.get('nombreArticulo'),
                  cantidad: parseInt(fd.get('cantidad') as string),
                  unidad: fd.get('unidad'),
                  prioridad: fd.get('prioridad'),
                  descripcion: fd.get('descripcion'),
                  areaOrigen: 'accion_social'
                })
              })
              setShowNuevaPeticion(false)
              cargarPeticiones()
            }} className="p-4 space-y-3">
              <input name="nombreArticulo" placeholder="Material solicitado *" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input name="cantidad" type="number" min="1" placeholder="Cantidad *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="unidad" placeholder="Unidad" defaultValue="ud" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <select name="prioridad" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
                <option value="baja">Baja</option>
              </select>
              <textarea name="descripcion" placeholder="Motivo / observaciones" rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">Enviar Petición</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión Familias */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Gestión de Familias</h3>
              <button onClick={() => setShowGestionFamilias(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                if (!categoriaId) { alert('Categoría no encontrada'); return }
                await fetch('/api/logistica', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: 'familia', nombre: fd.get('nombre'), categoriaId })
                })
                ;(e.target as HTMLFormElement).reset()
                cargarDatos()
              }} className="flex gap-2">
                <input name="nombre" placeholder="Nueva familia..." required className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button type="submit" className="px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Añadir</button>
              </form>
              <div className="space-y-2">
                {familias.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{f.nombre}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{f._count?.articulos ?? 0} artículos</span>
                      <button
                        onClick={async () => {
                          if ((f._count?.articulos ?? 0) > 0) { alert('No se puede eliminar: tiene artículos'); return }
                          if (!confirm(`¿Eliminar familia "${f.nombre}"?`)) return
                          await fetch(`/api/logistica?tipo=familia&id=${f.id}`, { method: 'DELETE' })
                          cargarDatos()
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Espacio de Acogida */}
      {showNuevoEspacio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Nuevo Espacio de Acogida</h3>
              <button onClick={() => setShowNuevoEspacio(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const res = await fetch('/api/accion-social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'espacio',
                  nombre: fd.get('nombre'),
                  tipoEspacio: fd.get('tipoEspacio'),
                  direccion: fd.get('direccion'),
                  telefono: fd.get('telefono'),
                  email: fd.get('email'),
                  contacto: fd.get('contacto'),
                  plazas: fd.get('plazas'),
                  plazasUrgencia: fd.get('plazasUrgencia'),
                  latitud: fd.get('latitud'),
                  longitud: fd.get('longitud'),
                  notas: fd.get('notas')
                })
              })
              setShowNuevoEspacio(false)
              cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" placeholder="Nombre del establecimiento *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="tipoEspacio" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Tipo *</option>
                  {Object.entries(TIPOS_ESPACIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input name="contacto" placeholder="Persona de contacto" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="direccion" placeholder="Dirección *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefono" placeholder="Teléfono" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="email" type="email" placeholder="Email" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="plazas" type="number" min="0" placeholder="Plazas totales" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="plazasUrgencia" type="number" min="0" placeholder="Plazas urgencia" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="latitud" placeholder="Latitud (ej: 37.3710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="longitud" placeholder="Longitud (ej: -6.0710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="notas" placeholder="Notas adicionales" rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoEspacio(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Centro de Emergencia */}
      {showNuevoCentro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Nuevo Centro de Emergencia</h3>
              <button onClick={() => setShowNuevoCentro(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'centro',
                  nombre: fd.get('nombre'),
                  tipoCentro: fd.get('tipoCentro'),
                  direccion: fd.get('direccion'),
                  telefono: fd.get('telefono'),
                  responsable: fd.get('responsable'),
                  capacidad: fd.get('capacidad'),
                  latitud: fd.get('latitud'),
                  longitud: fd.get('longitud'),
                  descripcion: fd.get('descripcion')
                })
              })
              setShowNuevoCentro(false)
              cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" placeholder="Nombre del centro *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="tipoCentro" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Tipo *</option>
                  {Object.entries(TIPOS_CENTRO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input name="capacidad" type="number" min="0" placeholder="Capacidad (personas)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="direccion" placeholder="Dirección *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefono" placeholder="Teléfono" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="responsable" placeholder="Responsable" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="latitud" placeholder="Latitud (ej: 37.3710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="longitud" placeholder="Longitud (ej: -6.0710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="descripcion" placeholder="Descripción del centro" rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoCentro(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Contacto Directorio */}
      {showNuevoContacto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Nuevo Contacto</h3>
              <button onClick={() => setShowNuevoContacto(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'contacto',
                  nombre: fd.get('nombre'),
                  entidad: fd.get('entidad'),
                  categoria: fd.get('categoria'),
                  cargo: fd.get('cargo'),
                  telefono: fd.get('telefono'),
                  telefonoAlt: fd.get('telefonoAlt'),
                  email: fd.get('email'),
                  disponibilidad: fd.get('disponibilidad'),
                  notas: fd.get('notas')
                })
              })
              setShowNuevoContacto(false)
              cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" placeholder="Nombre *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="entidad" placeholder="Entidad / Organismo" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="cargo" placeholder="Cargo / Puesto" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="categoria" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Categoría *</option>
                  {Object.entries(CATEGORIAS_DIRECTORIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select name="disponibilidad" className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Disponibilidad</option>
                  <option value="24h">24 horas</option>
                  <option value="horario_oficina">Horario de oficina</option>
                  <option value="guardia">Guardia</option>
                </select>
                <input name="telefono" placeholder="Teléfono principal *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefonoAlt" placeholder="Teléfono alternativo" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="email" type="email" placeholder="Email" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="notas" placeholder="Notas" rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoContacto(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Caso VIOGEN */}
      {showNuevoCaso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Registrar Intervención VIOGEN</h3>
              </div>
              <button onClick={() => { setShowNuevoCaso(false); setReincidencia([]) }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'viogen',
                  fechaIntervencion: fd.get('fechaIntervencion'),
                  victimaNombre: fd.get('victimaNombre'),
                  victimaDni: fd.get('victimaDni'),
                  victimaTelefono: fd.get('victimaTelefono'),
                  victimaDireccion: fd.get('victimaDireccion'),
                  victimaEdad: fd.get('victimaEdad'),
                  tieneHijos: fd.get('tieneHijos') === 'on',
                  numeroHijos: fd.get('numeroHijos'),
                  edadesHijos: fd.get('edadesHijos'),
                  agresorNombre: fd.get('agresorNombre'),
                  agresorDni: fd.get('agresorDni'),
                  motivoIntervencion: fd.get('motivoIntervencion'),
                  recursosActivados: fd.get('recursosActivados'),
                  derivadoA: fd.get('derivadoA'),
                  observaciones: fd.get('observaciones')
                })
              })
              setShowNuevoCaso(false)
              setReincidencia([])
              cargarDatos()
            }} className="p-4 space-y-5">

              {/* Alerta reincidencia */}
              {reincidencia.length > 0 && (
                <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">⚠️ REINCIDENTE — Esta persona ya ha sido atendida</p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      {reincidencia.map(c => `${c.numeroCaso} (${new Date(c.fechaIntervencion).toLocaleDateString('es-ES')})`).join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Intervención *</label>
                <input name="fechaIntervencion" type="datetime-local" required
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* Datos víctima */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Datos de la Víctima
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input name="victimaNombre" placeholder="Nombre completo *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaDni" placeholder="DNI / NIE"
                    onChange={e => { setDniBusqueda(e.target.value); checkDniReincidencia(e.target.value) }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaEdad" type="number" min="0" max="120" placeholder="Edad" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaTelefono" placeholder="Teléfono de contacto" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaDireccion" placeholder="Domicilio *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Hijos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Baby className="w-3.5 h-3.5" /> Menores
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input name="tieneHijos" type="checkbox" className="rounded" /> Tiene hijos menores
                  </label>
                  <input name="numeroHijos" type="number" min="0" placeholder="Nº de hijos" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="edadesHijos" placeholder="Edades (ej: 3, 7, 12)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Agresor */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Datos del Agresor (si disponibles)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input name="agresorNombre" placeholder="Nombre del agresor" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="agresorDni" placeholder="DNI del agresor" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Intervención */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Intervención</p>
                <div className="space-y-3">
                  <textarea name="motivoIntervencion" placeholder="Motivo de la intervención *" required rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                  <input name="recursosActivados" placeholder="Recursos activados (policía, sanitarios, alojamiento...)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="derivadoA" placeholder="Derivado a (servicios sociales, juzgado, albergue...)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <textarea name="observaciones" placeholder="Observaciones adicionales" rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => { setShowNuevoCaso(false); setReincidencia([]) }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800">
                  Registrar Caso VIOGEN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
