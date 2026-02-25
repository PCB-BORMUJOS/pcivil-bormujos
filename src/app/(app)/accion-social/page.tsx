'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import {
  Heart, Phone, Building2, MapPin, Users, AlertTriangle,
  Plus, RefreshCw, Search, ChevronDown, ChevronUp, Edit,
  Trash2, X, ShieldAlert, BookUser, Hotel, Package,
  Calendar, User, Baby, Shield, UserCheck, Clock
} from 'lucide-react'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Articulo {
  id: string; codigo?: string; nombre: string
  stockActual: number; stockMinimo: number; unidad: string
  familia?: { nombre: string }
}
interface Familia {
  id: string; nombre: string; _count?: { articulos: number }
}
interface Peticion {
  id: string; numero: string; nombreArticulo: string
  cantidad: number; unidad: string; prioridad: string
  estado: string; fechaSolicitud: string
  solicitante?: { nombre: string }; descripcion?: string
}
interface EspacioAcogida {
  id: string; nombre: string; tipo: string; direccion: string
  telefono?: string; email?: string; contacto?: string
  plazas?: number; plazasUrgencia?: number
  latitud?: number; longitud?: number; estado: string; notas?: string
}
interface CentroEmergencia {
  id: string; nombre: string; tipo: string; direccion: string
  telefono?: string; responsable?: string; capacidad?: number
  latitud?: number; longitud?: number; descripcion?: string; activo: boolean
}
interface Contacto {
  id: string; nombre: string; entidad?: string; categoria: string
  cargo?: string; telefono: string; telefonoAlt?: string
  email?: string; disponibilidad?: string; notas?: string
}
interface CasoViogen {
  id: string; numeroCaso: string; fechaIntervencion: string
  victimaNombre: string; victimaDni?: string; victimaTelefono?: string
  victimaDireccion: string; victimaEdad?: number
  tieneHijos: boolean; numeroHijos?: number; edadesHijos?: string
  agresorNombre?: string; motivoIntervencion: string
  activadoPor?: string; recursosActivados?: string
  derivadoA?: string; observaciones?: string; estado: string; createdAt: string
}
interface DisponibilidadViogen {
  id: string; usuarioId: string; usuarioNombre: string; fecha: string; disponible: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_ESPACIO: Record<string, { label: string; color: string }> = {
  hotel:       { label: 'Hotel',                color: 'bg-blue-100 text-blue-800' },
  hostal:      { label: 'Hostal',               color: 'bg-sky-100 text-sky-800' },
  apartamento: { label: 'Apartamento Turístico', color: 'bg-indigo-100 text-indigo-800' },
  pension:     { label: 'Pensión',              color: 'bg-violet-100 text-violet-800' },
  albergue:    { label: 'Albergue',             color: 'bg-purple-100 text-purple-800' },
  otro:        { label: 'Otro',                 color: 'bg-gray-100 text-gray-800' }
}

const TIPOS_CENTRO: Record<string, { label: string; color: string }> = {
  pabellon:              { label: 'Pabellón Cubierto',       color: 'bg-teal-100 text-teal-800' },
  centro_multifuncional: { label: 'Centro Multifuncional',   color: 'bg-cyan-100 text-cyan-800' },
  ceu:                   { label: 'CEU San Pablo',           color: 'bg-emerald-100 text-emerald-800' },
  otro:                  { label: 'Otro',                    color: 'bg-gray-100 text-gray-800' }
}

const CATEGORIAS_DIRECTORIO: Record<string, { label: string; color: string }> = {
  servicios_sociales: { label: 'Servicios Sociales', color: 'bg-rose-100 text-rose-800' },
  policia:            { label: 'Policía',             color: 'bg-blue-100 text-blue-800' },
  sanidad:            { label: 'Sanidad',             color: 'bg-green-100 text-green-800' },
  juzgado:            { label: 'Juzgado/Fiscal',      color: 'bg-yellow-100 text-yellow-800' },
  vivienda:           { label: 'Vivienda',            color: 'bg-orange-100 text-orange-800' },
  educacion:          { label: 'Educación',           color: 'bg-purple-100 text-purple-800' },
  otro:               { label: 'Otro',                color: 'bg-gray-100 text-gray-800' }
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

// Miembros fijos del área VIOGEN (8 personas)
const MIEMBROS_VIOGEN = [
  'Voluntario 1', 'Voluntario 2', 'Voluntario 3', 'Voluntario 4',
  'Voluntario 5', 'Voluntario 6', 'Voluntario 7', 'Voluntario 8'
]

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function AccionSocialPage() {
  const { data: session } = useSession()

  // Tabs
  const [mainTab, setMainTab] = useState<'inventario' | 'espacios' | 'centros' | 'directorio' | 'viogen' | 'cuadrante'>('inventario')
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

  // Cuadrante VIOGEN - semana actual
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [cuadrante, setCuadrante] = useState<Record<string, Record<string, boolean>>>({})

  // Modales
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showEditArticulo, setShowEditArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoEspacio, setShowNuevoEspacio] = useState(false)
  const [showEditEspacio, setShowEditEspacio] = useState(false)
  const [showNuevoCentro, setShowNuevoCentro] = useState(false)
  const [showEditCentro, setShowEditCentro] = useState(false)
  const [showNuevoContacto, setShowNuevoContacto] = useState(false)
  const [showEditContacto, setShowEditContacto] = useState(false)
  const [showNuevoCaso, setShowNuevoCaso] = useState(false)
  const [articuloSel, setArticuloSel] = useState<Articulo | null>(null)
  const [espacioSel, setEspacioSel] = useState<EspacioAcogida | null>(null)
  const [centroSel, setCentroSel] = useState<CentroEmergencia | null>(null)
  const [contactoSel, setContactoSel] = useState<Contacto | null>(null)
  const [reincidencia, setReincidencia] = useState<CasoViogen[]>([])

  // ─── Carga de datos ────────────────────────────────────────────────────────

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [resInv, resCat, resEsp, resCent, resCont, resCasos, resStats] = await Promise.all([
        fetch('/api/logistica?inventario=accion_social'),
        fetch('/api/logistica?tipo=categoria&slug=accion_social'),
        fetch('/api/accion-social?tipo=espacios'),
        fetch('/api/accion-social?tipo=centros'),
        fetch('/api/accion-social?tipo=directorio'),
        fetch('/api/accion-social?tipo=viogen'),
        fetch('/api/accion-social?tipo=stats')
      ])
      const [dInv, dCat, dEsp, dCent, dCont, dCasos, dStats] = await Promise.all([
        resInv.json(), resCat.json(), resEsp.json(),
        resCent.json(), resCont.json(), resCasos.json(), resStats.json()
      ])
      setArticulos(dInv.articulos || [])
      setFamilias(dInv.familias || [])
      if (dCat.categoria) setCategoriaId(dCat.categoria.id)
      setEspacios(dEsp.espacios || [])
      setCentros(dCent.centros || [])
      setContactos(dCont.contactos || [])
      setCasos(dCasos.casos || [])
      setStats(dStats)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const cargarPeticiones = async () => {
    try {
      const r = await fetch('/api/logistica/peticiones?area=accion_social')
      const d = await r.json()
      setPeticiones(d.peticiones || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab])

  // ─── Cuadrante VIOGEN - generar días de la semana ─────────────────────────

  const getDiasSemana = () => {
    const hoy = new Date()
    hoy.setDate(hoy.getDate() + semanaOffset * 7)
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes)
      d.setDate(lunes.getDate() + i)
      return d
    })
  }

  const toggleDisponibilidad = (miembro: string, fecha: string) => {
    setCuadrante(prev => ({
      ...prev,
      [fecha]: { ...(prev[fecha] || {}), [miembro]: !(prev[fecha]?.[miembro] ?? false) }
    }))
  }

  const diasSemana = getDiasSemana()
  const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const artsFiltrados = articulos.filter(a => {
    const ms = a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (a.codigo?.toLowerCase().includes(searchTerm.toLowerCase()))
    const mf = filtroFamilia === 'all' || a.familia?.nombre === filtroFamilia
    return ms && mf
  })

  const petsFiltradas = peticiones.filter(p => filtroPeticiones === 'all' || p.estado === filtroPeticiones)

  const contFiltrados = contactos.filter(c => {
    const ms = c.nombre.toLowerCase().includes(searchContacto.toLowerCase()) || (c.entidad?.toLowerCase().includes(searchContacto.toLowerCase()))
    const mc = filtroCategoria === 'all' || c.categoria === filtroCategoria
    return ms && mc
  })

  const casosFiltrados = casos.filter(c => {
    const ms = c.victimaNombre.toLowerCase().includes(searchViogen.toLowerCase()) || c.numeroCaso.toLowerCase().includes(searchViogen.toLowerCase())
    const me = filtroViogen === 'all' || c.estado === filtroViogen
    return ms && me
  })

  const esReincidente = (caso: CasoViogen) => {
    if (!caso.victimaDni) return false
    return casos.filter(c => c.victimaDni === caso.victimaDni && c.id !== caso.id).length > 0
  }

  const checkDni = async (dni: string) => {
    if (dni.length < 5) { setReincidencia([]); return }
    const r = await fetch(`/api/accion-social?tipo=viogen-check-dni&dni=${encodeURIComponent(dni)}`)
    const d = await r.json()
    setReincidencia(d.casos || [])
  }

  const plazasTotales = espacios.reduce((s, e) => s + (e.plazasUrgencia || 0), 0)
  const stockBajo = articulos.filter(a => a.stockActual <= a.stockMinimo).length

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
            <Heart className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">ACCIÓN SOCIAL</p>
            <h1 className="text-2xl font-bold text-gray-900">Gestión Social y VIOGEN</h1>
            <p className="text-sm text-gray-500">Espacios de acogida, directorio de emergencias y coordinación VIOGEN</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNuevaPeticion(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-600 text-rose-600 hover:bg-rose-50 text-sm font-medium">
            <Package className="w-4 h-4" /> Nueva Petición
          </button>
          <button onClick={() => setShowNuevoArticulo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nuevo Artículo
          </button>
          <button onClick={() => setShowNuevoCaso(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-sm font-medium">
            <ShieldAlert className="w-4 h-4" /> Nuevo Caso VIOGEN
          </button>
          <button onClick={cargarDatos} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── STATS CARDS (5) ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Material del Área', value: articulos.length, icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Stock Bajo', value: stockBajo, icon: AlertTriangle, color: stockBajo > 0 ? 'text-yellow-600' : 'text-gray-400', bg: stockBajo > 0 ? 'bg-yellow-50' : 'bg-gray-50' },
          { label: 'Plazas Urgencia', value: plazasTotales, sub: `${stats.espacios} espacios activos`, icon: Hotel, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Centros Emergencia', value: stats.centros, sub: `${stats.contactos} en directorio`, icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Casos VIOGEN Activos', value: stats.casosActivos, icon: ShieldAlert, color: stats.casosActivos > 0 ? 'text-red-600' : 'text-gray-400', bg: stats.casosActivos > 0 ? 'bg-red-50' : 'bg-gray-50' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
              </div>
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS PRINCIPALES ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: 'inventario', icon: Package,    label: 'Inventario del Área' },
              { key: 'espacios',   icon: Hotel,       label: 'Espacios de Acogida' },
              { key: 'centros',    icon: Building2,   label: 'Centros de Emergencia' },
              { key: 'directorio', icon: BookUser,    label: 'Directorio' },
              { key: 'viogen',     icon: ShieldAlert, label: 'VIOGEN', badge: stats.casosActivos },
              { key: 'cuadrante',  icon: Calendar,    label: 'Cuadrante VIOGEN' }
            ].map(t => (
              <button key={t.key} onClick={() => setMainTab(t.key as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  mainTab === t.key ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                {(t as any).badge > 0 && (
                  <span className="ml-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{(t as any).badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">

          {/* ══ TAB: INVENTARIO ═══════════════════════════════════════════════ */}
          {mainTab === 'inventario' && (
            <div className="space-y-4">
              <div className="flex border-b border-gray-100 gap-1 pb-1">
                {(['stock', 'peticiones', 'movimientos'] as const).map(sub => (
                  <button key={sub} onClick={() => setInventoryTab(sub)}
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
                        placeholder="Buscar artículos..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <select value={filtroFamilia} onChange={e => setFiltroFamilia(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[180px]">
                      <option value="all">Todas las familias</option>
                      {familias.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
                    </select>
                    <button onClick={() => setShowGestionFamilias(true)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      <Package className="w-4 h-4" /> Familias
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['ARTÍCULO', 'FAMILIA', 'STOCK', 'MÍNIMO', 'UNIDAD', 'ESTADO', 'ACCIONES'].map(h => (
                          <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {artsFiltrados.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No hay artículos en el inventario del Área Social</td></tr>
                      ) : artsFiltrados.map(a => (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-900">{a.nombre}</p>
                            {a.codigo && <p className="text-xs text-gray-400">Cód: {a.codigo}</p>}
                          </td>
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
                              : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ OK</span>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-1">
                              <button onClick={() => { setArticuloSel(a); setShowEditArticulo(true) }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={async () => {
                                if (!confirm(`¿Eliminar "${a.nombre}"?`)) return
                                await fetch(`/api/logistica?tipo=articulo&id=${a.id}`, { method: 'DELETE' })
                                cargarDatos()
                              }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {inventoryTab === 'peticiones' && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries({ all: 'Todas', pendiente: 'Pendientes', aprobada: 'Aprobadas', en_compra: 'En Compra', recibida: 'Recibidas' }).map(([k, v]) => (
                      <button key={k} onClick={() => setFiltroPeticiones(k)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
                          filtroPeticiones === k ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>{v}</button>
                    ))}
                  </div>
                  {petsFiltradas.length === 0
                    ? <p className="text-center py-12 text-gray-400 text-sm">No hay peticiones registradas</p>
                    : petsFiltradas.map(p => (
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
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {inventoryTab === 'movimientos' && (
                <p className="text-center py-12 text-gray-400 text-sm">No hay movimientos registrados</p>
              )}
            </div>
          )}

          {/* ══ TAB: ESPACIOS DE ACOGIDA ══════════════════════════════════════ */}
          {mainTab === 'espacios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Registro de establecimientos para acogida de urgencia por razones sociales.</p>
                <button onClick={() => setShowNuevoEspacio(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Nuevo Espacio
                </button>
              </div>
              {espacios.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Hotel className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay espacios registrados</p>
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
                        <div className="flex gap-1">
                          <button onClick={() => { setEspacioSel(esp); setShowEditEspacio(true) }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => {
                            if (!confirm(`¿Eliminar "${esp.nombre}"?`)) return
                            await fetch(`/api/accion-social?tipo=espacio&id=${esp.id}`, { method: 'DELETE' })
                            cargarDatos()
                          }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{esp.direccion}</p>
                      {esp.telefono && <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Phone className="w-3 h-3" />{esp.telefono}</p>}
                      {esp.contacto && <p className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{esp.contacto}</p>}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                        <div><p className="text-lg font-bold text-gray-900">{esp.plazas ?? '—'}</p><p className="text-xs text-gray-400">Plazas totales</p></div>
                        <div><p className="text-lg font-bold text-rose-600">{esp.plazasUrgencia ?? '—'}</p><p className="text-xs text-gray-400">Urgencia</p></div>
                        <div className="ml-auto self-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${esp.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {esp.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      {esp.notas && <p className="text-xs text-gray-400 mt-2 italic">{esp.notas}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: CENTROS DE EMERGENCIA ════════════════════════════════════ */}
          {mainTab === 'centros' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Instalaciones municipales para concentración y acogida en emergencias activas.</p>
                <button onClick={() => setShowNuevoCentro(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Nuevo Centro
                </button>
              </div>
              {/* MAPA COMPLETO */}
              <div className="h-[380px] rounded-xl overflow-hidden border border-gray-200 w-full">
                <MapContainer center={[37.3710, -6.0710]} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {centros.filter(c => c.latitud && c.longitud).map(c => (
                    <Marker key={c.id} position={[c.latitud!, c.longitud!]}>
                      <Popup>
                        <div className="text-sm min-w-[180px]">
                          <p className="font-bold text-gray-900">{c.nombre}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPOS_CENTRO[c.tipo]?.color}`}>{TIPOS_CENTRO[c.tipo]?.label}</span>
                          <p className="text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.direccion}</p>
                          {c.capacidad && <p className="text-teal-700 font-semibold mt-1">Capacidad: {c.capacidad} personas</p>}
                          {c.telefono && <p className="text-gray-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{c.telefono}</p>}
                          {c.responsable && <p className="text-gray-500">{c.responsable}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {espacios.filter(e => e.latitud && e.longitud && e.estado === 'activo').map(e => (
                    <Marker key={e.id} position={[e.latitud!, e.longitud!]}>
                      <Popup>
                        <div className="text-sm min-w-[160px]">
                          <p className="font-bold text-gray-900">{e.nombre}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPOS_ESPACIO[e.tipo]?.color}`}>{TIPOS_ESPACIO[e.tipo]?.label}</span>
                          <p className="text-gray-500 mt-1">{e.direccion}</p>
                          {e.plazasUrgencia && <p className="text-rose-700 font-semibold mt-1">Plazas urgencia: {e.plazasUrgencia}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              {/* LISTADO BAJO EL MAPA */}
              {centros.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay centros registrados. Añade el primero.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Centro', 'Tipo', 'Dirección', 'Responsable', 'Capacidad', 'Teléfono', 'Acciones'].map(h => (
                        <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {centros.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-900">{c.nombre}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPOS_CENTRO[c.tipo]?.color}`}>
                            {TIPOS_CENTRO[c.tipo]?.label || c.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{c.direccion}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{c.responsable || '—'}</td>
                        <td className="py-3 px-3">
                          {c.capacidad ? <span className="font-semibold text-teal-700">{c.capacidad} pers.</span> : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{c.telefono || '—'}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setCentroSel(c); setShowEditCentro(true) }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => {
                              if (!confirm(`¿Eliminar "${c.nombre}"?`)) return
                              await fetch(`/api/accion-social?tipo=centro&id=${c.id}`, { method: 'DELETE' })
                              cargarDatos()
                            }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ══ TAB: DIRECTORIO ═══════════════════════════════════════════════ */}
          {mainTab === 'directorio' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Contactos de profesionales, entidades y servicios para situaciones de necesidad.</p>
                <button onClick={() => setShowNuevoContacto(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Nuevo Contacto
                </button>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchContacto} onChange={e => setSearchContacto(e.target.value)}
                    placeholder="Buscar contacto o entidad..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[180px]">
                  <option value="all">Todas las categorías</option>
                  {Object.entries(CATEGORIAS_DIRECTORIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Nombre', 'Categoría', 'Entidad / Cargo', 'Teléfono', 'Disponibilidad', 'Email', 'Acciones'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No hay contactos registrados</td></tr>
                  ) : contFiltrados.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{c.nombre}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIAS_DIRECTORIO[c.categoria]?.color}`}>
                          {CATEGORIAS_DIRECTORIO[c.categoria]?.label || c.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs">
                        {c.entidad && <p>{c.entidad}</p>}
                        {c.cargo && <p className="text-gray-400">{c.cargo}</p>}
                      </td>
                      <td className="py-3 px-3">
                        <a href={`tel:${c.telefono}`} className="text-rose-600 hover:text-rose-800 font-medium">{c.telefono}</a>
                        {c.telefonoAlt && <p className="text-xs text-gray-400">{c.telefonoAlt}</p>}
                      </td>
                      <td className="py-3 px-3">
                        {c.disponibilidad && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.disponibilidad === '24h' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.disponibilidad === '24h' ? '24h' : c.disponibilidad === 'horario_oficina' ? 'Oficina' : 'Guardia'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{c.email || '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setContactoSel(c); setShowEditContacto(true) }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => {
                            if (!confirm(`¿Eliminar contacto "${c.nombre}"?`)) return
                            await fetch(`/api/accion-social?tipo=contacto&id=${c.id}`, { method: 'DELETE' })
                            cargarDatos()
                          }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ TAB: VIOGEN ═══════════════════════════════════════════════════ */}
          {mainTab === 'viogen' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  <strong>Información confidencial.</strong> Registro de intervenciones en colaboración con Policía Local en materia VIOGEN. Acceso restringido.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchViogen} onChange={e => setSearchViogen(e.target.value)}
                    placeholder="Buscar por nombre o número de caso..."
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
                    const reinc = esReincidente(caso)
                    const exp = expandedCaso === caso.id
                    return (
                      <div key={caso.id} className={`border rounded-xl overflow-hidden ${reinc ? 'border-orange-300' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 ${reinc ? 'bg-orange-50' : 'bg-white'}`}
                          onClick={() => setExpandedCaso(exp ? null : caso.id)}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-gray-400">{caso.numeroCaso}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADOS_VIOGEN[caso.estado]?.color}`}>
                                {ESTADOS_VIOGEN[caso.estado]?.label}
                              </span>
                              {reinc && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-200 text-orange-800">
                                  <AlertTriangle className="w-3 h-3" /> REINCIDENTE — INTERVENCIÓN PREVIA REGISTRADA
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
                              {new Date(caso.fechaIntervencion).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                              {caso.activadoPor && ` · Activado por: ${caso.activadoPor}`}
                              {' · '}{caso.victimaDireccion}
                            </p>
                          </div>
                          {exp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        {exp && (
                          <div className="border-t border-gray-100 p-4 bg-white space-y-4">
                            {reinc && (
                              <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3">
                                <p className="text-xs font-bold text-orange-800 flex items-center gap-1 mb-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> ATENCIÓN: Esta persona ya ha sido atendida anteriormente
                                </p>
                                <p className="text-xs text-orange-700">
                                  Casos previos: {casos.filter(c => c.victimaDni === caso.victimaDni && c.id !== caso.id).map(c =>
                                    `${c.numeroCaso} (${new Date(c.fechaIntervencion).toLocaleDateString('es-ES')})`
                                  ).join(' · ')}
                                </p>
                              </div>
                            )}
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
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Menores</p>
                                  <p className="font-medium">{caso.numeroHijos} hijo(s)</p>
                                  {caso.edadesHijos && <p className="text-gray-500">Edades: {caso.edadesHijos}</p>}
                                </div>
                              )}
                              {caso.agresorNombre && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Posible Agresor</p>
                                  <p className="font-medium">{caso.agresorNombre}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Motivo intervención</p>
                                <p className="text-gray-700">{caso.motivoIntervencion}</p>
                              </div>
                              {caso.activadoPor && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Activado por</p>
                                  <p className="text-gray-700">{caso.activadoPor}</p>
                                </div>
                              )}
                              {caso.recursosActivados && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Recursos activados</p>
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
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: CUADRANTE VIOGEN ═════════════════════════════════════════ */}
          {mainTab === 'cuadrante' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Cuadrante de Disponibilidad VIOGEN</p>
                  <p className="text-sm text-gray-500">Planificación semanal de disponibilidad para atención a víctimas VIOGEN</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSemanaOffset(s => s - 1)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
                    {diasSemana[0] && `${diasSemana[0].getDate()} ${MESES[diasSemana[0].getMonth()]}`}
                    {' — '}
                    {diasSemana[6] && `${diasSemana[6].getDate()} ${MESES[diasSemana[6].getMonth()]} ${diasSemana[6].getFullYear()}`}
                  </span>
                  <button onClick={() => setSemanaOffset(s => s + 1)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                  <button onClick={() => setSemanaOffset(0)}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                    Hoy
                  </button>
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                  <span>No disponible / Sin definir</span>
                </div>
                <p className="ml-4 text-gray-400">Haz clic en una celda para marcar/desmarcar disponibilidad</p>
              </div>

              {/* Tabla cuadrante */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 min-w-[140px]">
                        Voluntario
                      </th>
                      {diasSemana.map((dia, i) => {
                        const hoy = new Date()
                        const esHoy = dia.toDateString() === hoy.toDateString()
                        return (
                          <th key={i} className={`py-3 px-3 text-center border-b border-gray-200 ${esHoy ? 'bg-rose-50' : ''}`}>
                            <p className={`text-xs font-semibold uppercase ${esHoy ? 'text-rose-600' : 'text-gray-500'}`}>{DIAS_LABEL[i]}</p>
                            <p className={`text-sm font-bold mt-0.5 ${esHoy ? 'text-rose-600' : 'text-gray-700'}`}>
                              {dia.getDate()} {MESES[dia.getMonth()]}
                            </p>
                          </th>
                        )
                      })}
                      <th className="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                        Total semana
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MIEMBROS_VIOGEN.map((miembro, mi) => {
                      const totalDisp = diasSemana.filter(d => {
                        const k = d.toISOString().split('T')[0]
                        return cuadrante[k]?.[miembro]
                      }).length
                      return (
                        <tr key={mi} className={`border-b border-gray-100 ${mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-700">
                                {miembro.split(' ').map(w => w[0]).join('').slice(0, 2)}
                              </div>
                              <span className="font-medium text-gray-800 text-sm">{miembro}</span>
                            </div>
                          </td>
                          {diasSemana.map((dia, di) => {
                            const fechaKey = dia.toISOString().split('T')[0]
                            const disponible = cuadrante[fechaKey]?.[miembro] ?? false
                            const esHoy = dia.toDateString() === new Date().toDateString()
                            return (
                              <td key={di} className={`py-2 px-2 text-center ${esHoy ? 'bg-rose-50/50' : ''}`}>
                                <button
                                  onClick={() => toggleDisponibilidad(miembro, fechaKey)}
                                  className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                                    disponible
                                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200'
                                  }`}>
                                  {disponible ? (
                                    <span className="flex items-center justify-center gap-1">
                                      <UserCheck className="w-3 h-3" /> Disp.
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </button>
                              </td>
                            )
                          })}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              totalDisp >= 5 ? 'bg-green-100 text-green-700'
                              : totalDisp >= 3 ? 'bg-yellow-100 text-yellow-700'
                              : totalDisp > 0 ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-400'
                            }`}>{totalDisp}/7</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Disponibles / día</td>
                      {diasSemana.map((dia, i) => {
                        const k = dia.toISOString().split('T')[0]
                        const count = MIEMBROS_VIOGEN.filter(m => cuadrante[k]?.[m]).length
                        return (
                          <td key={i} className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              count >= 3 ? 'bg-green-100 text-green-700'
                              : count >= 1 ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-600'
                            }`}>{count}</span>
                          </td>
                        )
                      })}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Nota:</strong> El cuadrante es una herramienta de planificación visual. Los cambios se guardan en la sesión actual.
                  Para persistencia permanente, los voluntarios deben registrar su disponibilidad desde su perfil en "Mi Área".
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════ MODALES ═══════════════════════════════ */}

      {/* Modal Nuevo Artículo */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Nuevo Artículo</h3>
              <button onClick={() => setShowNuevoArticulo(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              if (!categoriaId) { alert('Categoría Acción Social no encontrada en BD'); return }
              if (!fd.get('familiaId')) { alert('Selecciona una familia'); return }
              await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'articulo', codigo: fd.get('codigo'), nombre: fd.get('nombre'),
                  stockActual: parseInt(fd.get('stockActual') as string) || 0,
                  stockMinimo: parseInt(fd.get('stockMinimo') as string) || 0,
                  unidad: fd.get('unidad'), familiaId: fd.get('familiaId'), servicioId: 'default' }) })
              setShowNuevoArticulo(false); cargarDatos()
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
              <input name="unidad" placeholder="Unidad" defaultValue="ud" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Artículo */}
      {showEditArticulo && articuloSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Editar Artículo</h3>
              <button onClick={() => { setShowEditArticulo(false); setArticuloSel(null) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'articulo', id: articuloSel.id, codigo: fd.get('codigo'),
                  nombre: fd.get('nombre'), stockActual: parseInt(fd.get('stockActual') as string) || 0,
                  stockMinimo: parseInt(fd.get('stockMinimo') as string) || 0, unidad: fd.get('unidad') }) })
              setShowEditArticulo(false); setArticuloSel(null); cargarDatos()
            }} className="p-4 space-y-3">
              <input name="codigo" defaultValue={articuloSel.codigo} placeholder="Código" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input name="nombre" defaultValue={articuloSel.nombre} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input name="stockActual" type="number" defaultValue={articuloSel.stockActual} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="stockMinimo" type="number" defaultValue={articuloSel.stockMinimo} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <input name="unidad" defaultValue={articuloSel.unidad} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditArticulo(false); setArticuloSel(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Guardar</button>
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
              <button onClick={() => setShowNuevaPeticion(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'peticion', nombreArticulo: fd.get('nombreArticulo'),
                  cantidad: parseInt(fd.get('cantidad') as string), unidad: fd.get('unidad'),
                  prioridad: fd.get('prioridad'), descripcion: fd.get('descripcion'), areaOrigen: 'accion_social' }) })
              setShowNuevaPeticion(false); cargarPeticiones()
            }} className="p-4 space-y-3">
              <input name="nombreArticulo" placeholder="Material solicitado *" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input name="cantidad" type="number" min="1" placeholder="Cantidad *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="unidad" placeholder="Unidad" defaultValue="ud" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <select name="prioridad" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="normal">Normal</option><option value="alta">Alta</option>
                <option value="urgente">Urgente</option><option value="baja">Baja</option>
              </select>
              <textarea name="descripcion" placeholder="Motivo / observaciones" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Enviar</button>
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
              <button onClick={() => setShowGestionFamilias(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <form onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                if (!categoriaId) { alert('Categoría no encontrada'); return }
                await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: 'familia', nombre: fd.get('nombre'), categoriaId }) })
                ;(e.target as HTMLFormElement).reset(); cargarDatos()
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
                      <button onClick={async () => {
                        if ((f._count?.articulos ?? 0) > 0) { alert('No se puede eliminar: tiene artículos'); return }
                        if (!confirm(`¿Eliminar familia "${f.nombre}"?`)) return
                        await fetch(`/api/logistica?tipo=familia&id=${f.id}`, { method: 'DELETE' })
                        cargarDatos()
                      }} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Espacio */}
      {showNuevoEspacio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Nuevo Espacio de Acogida</h3>
              <button onClick={() => setShowNuevoEspacio(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'espacio', nombre: fd.get('nombre'), tipoEspacio: fd.get('tipoEspacio'),
                  direccion: fd.get('direccion'), telefono: fd.get('telefono'), email: fd.get('email'),
                  contacto: fd.get('contacto'), plazas: fd.get('plazas'), plazasUrgencia: fd.get('plazasUrgencia'),
                  latitud: fd.get('latitud'), longitud: fd.get('longitud'), notas: fd.get('notas') }) })
              setShowNuevoEspacio(false); cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" placeholder="Nombre *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
                <input name="latitud" placeholder="Latitud (37.3710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="longitud" placeholder="Longitud (-6.0710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="notas" placeholder="Notas" rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoEspacio(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Espacio */}
      {showEditEspacio && espacioSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Editar Espacio</h3>
              <button onClick={() => { setShowEditEspacio(false); setEspacioSel(null) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'espacio', id: espacioSel.id, nombre: fd.get('nombre'),
                  tipoEspacio: fd.get('tipoEspacio'), direccion: fd.get('direccion'), telefono: fd.get('telefono'),
                  email: fd.get('email'), contacto: fd.get('contacto'), plazas: fd.get('plazas'),
                  plazasUrgencia: fd.get('plazasUrgencia'), latitud: fd.get('latitud'), longitud: fd.get('longitud'),
                  estado: fd.get('estado'), notas: fd.get('notas') }) })
              setShowEditEspacio(false); setEspacioSel(null); cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" defaultValue={espacioSel.nombre} required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="tipoEspacio" defaultValue={espacioSel.tipo} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(TIPOS_ESPACIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select name="estado" defaultValue={espacioSel.estado} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
                </select>
                <input name="direccion" defaultValue={espacioSel.direccion} required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefono" defaultValue={espacioSel.telefono} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="contacto" defaultValue={espacioSel.contacto} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="plazas" type="number" defaultValue={espacioSel.plazas ?? ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="plazasUrgencia" type="number" defaultValue={espacioSel.plazasUrgencia ?? ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="latitud" defaultValue={espacioSel.latitud ?? ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="longitud" defaultValue={espacioSel.longitud ?? ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="notas" defaultValue={espacioSel.notas} rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditEspacio(false); setEspacioSel(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Centro */}
      {showNuevoCentro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Nuevo Centro de Emergencia</h3>
              <button onClick={() => setShowNuevoCentro(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'centro', nombre: fd.get('nombre'), tipoCentro: fd.get('tipoCentro'),
                  direccion: fd.get('direccion'), telefono: fd.get('telefono'), responsable: fd.get('responsable'),
                  capacidad: fd.get('capacidad'), latitud: fd.get('latitud'), longitud: fd.get('longitud'),
                  descripcion: fd.get('descripcion') }) })
              setShowNuevoCentro(false); cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" placeholder="Nombre *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="tipoCentro" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Tipo *</option>
                  {Object.entries(TIPOS_CENTRO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input name="capacidad" type="number" min="0" placeholder="Capacidad (personas)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="direccion" placeholder="Dirección *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefono" placeholder="Teléfono" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="responsable" placeholder="Responsable" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="latitud" placeholder="Latitud (37.3710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="longitud" placeholder="Longitud (-6.0710)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="descripcion" placeholder="Descripción" rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoCentro(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Contacto */}
      {showNuevoContacto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Nuevo Contacto</h3>
              <button onClick={() => setShowNuevoContacto(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'contacto', nombre: fd.get('nombre'), entidad: fd.get('entidad'),
                  categoria: fd.get('categoria'), cargo: fd.get('cargo'), telefono: fd.get('telefono'),
                  telefonoAlt: fd.get('telefonoAlt'), email: fd.get('email'), disponibilidad: fd.get('disponibilidad'),
                  notas: fd.get('notas') }) })
              setShowNuevoContacto(false); cargarDatos()
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
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Contacto */}
      {showEditContacto && contactoSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Editar Contacto</h3>
              <button onClick={() => { setShowEditContacto(false); setContactoSel(null) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'contacto', id: contactoSel.id, nombre: fd.get('nombre'),
                  entidad: fd.get('entidad'), categoria: fd.get('categoria'), cargo: fd.get('cargo'),
                  telefono: fd.get('telefono'), telefonoAlt: fd.get('telefonoAlt'), email: fd.get('email'),
                  disponibilidad: fd.get('disponibilidad'), notas: fd.get('notas'), activo: true }) })
              setShowEditContacto(false); setContactoSel(null); cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" defaultValue={contactoSel.nombre} required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="entidad" defaultValue={contactoSel.entidad} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="cargo" defaultValue={contactoSel.cargo} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="categoria" defaultValue={contactoSel.categoria} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(CATEGORIAS_DIRECTORIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select name="disponibilidad" defaultValue={contactoSel.disponibilidad} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Disponibilidad</option>
                  <option value="24h">24 horas</option>
                  <option value="horario_oficina">Horario de oficina</option>
                  <option value="guardia">Guardia</option>
                </select>
                <input name="telefono" defaultValue={contactoSel.telefono} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefonoAlt" defaultValue={contactoSel.telefonoAlt} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="email" defaultValue={contactoSel.email} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="notas" defaultValue={contactoSel.notas} rows={2} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditContacto(false); setContactoSel(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium">Guardar</button>
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
              <button onClick={() => { setShowNuevoCaso(false); setReincidencia([]) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const fd = new FormData(e.currentTarget)
              await fetch('/api/accion-social', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'viogen',
                  fechaIntervencion: fd.get('fechaIntervencion'),
                  activadoPor: fd.get('activadoPor'),
                  victimaNombre: fd.get('victimaNombre'), victimaDni: fd.get('victimaDni'),
                  victimaTelefono: fd.get('victimaTelefono'), victimaDireccion: fd.get('victimaDireccion'),
                  victimaEdad: fd.get('victimaEdad'), tieneHijos: fd.get('tieneHijos') === 'on',
                  numeroHijos: fd.get('numeroHijos'), edadesHijos: fd.get('edadesHijos'),
                  agresorNombre: fd.get('agresorNombre'), agresorDni: fd.get('agresorDni'),
                  motivoIntervencion: fd.get('motivoIntervencion'), recursosActivados: fd.get('recursosActivados'),
                  derivadoA: fd.get('derivadoA'), observaciones: fd.get('observaciones') }) })
              setShowNuevoCaso(false); setReincidencia([]); cargarDatos()
            }} className="p-4 space-y-5">

              {reincidencia.length > 0 && (
                <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">⚠️ REINCIDENTE — Esta persona ya tiene intervenciones registradas</p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      {reincidencia.map(c => `${c.numeroCaso} (${new Date(c.fechaIntervencion).toLocaleDateString('es-ES')})`).join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha y hora de la intervención *</label>
                  <input name="fechaIntervencion" type="datetime-local" required
                    defaultValue={new Date().toISOString().slice(0, 16)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">¿Quién nos activa? *</label>
                  <select name="activadoPor" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Seleccionar *</option>
                    <option value="Policía Local">Policía Local</option>
                    <option value="Guardia Civil">Guardia Civil</option>
                    <option value="Servicios Sociales">Servicios Sociales</option>
                    <option value="Iniciativa propia">Iniciativa propia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Datos de la Víctima</p>
                <div className="grid grid-cols-2 gap-3">
                  <input name="victimaNombre" placeholder="Nombre completo *" required className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaDni" placeholder="DNI / NIE"
                    onChange={e => checkDni(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaEdad" type="number" min="0" max="120" placeholder="Edad" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaTelefono" placeholder="Teléfono" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="victimaDireccion" placeholder="Domicilio *" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Baby className="w-3.5 h-3.5" /> Menores</p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 col-span-1">
                    <input name="tieneHijos" type="checkbox" className="rounded" /> Tiene hijos menores
                  </label>
                  <input name="numeroHijos" type="number" min="0" placeholder="Nº hijos" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="edadesHijos" placeholder="Edades (3, 7, 12)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Datos del Posible Agresor</p>
                <div className="grid grid-cols-2 gap-3">
                  <input name="agresorNombre" placeholder="Nombre del posible agresor" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="agresorDni" placeholder="DNI del posible agresor" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Intervención</p>
                <div className="space-y-3">
                  <textarea name="motivoIntervencion" placeholder="Motivo de la intervención *" required rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                  <input name="recursosActivados" placeholder="Recursos activados (sanitarios, alojamiento...)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="derivadoA" placeholder="Derivado a (servicios sociales, juzgado, albergue...)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <textarea name="observaciones" placeholder="Observaciones adicionales" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
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
