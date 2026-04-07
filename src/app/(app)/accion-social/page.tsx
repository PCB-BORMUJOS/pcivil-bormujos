'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import {
  Heart, Phone, Building2, MapPin, Users, AlertTriangle,
  Plus, RefreshCw, Search, ChevronDown, ChevronUp, Edit,
  Trash2, X, ShieldAlert, BookUser, Hotel, Package,
  Calendar, User, Baby, Shield, UserCheck, Clock, ShoppingCart
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
  estado?: string; email?: string; notas?: string
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
  agresorNombre?: string; agresorDni?: string; motivoIntervencion: string
  activadoPor?: string; recursosActivados?: string
  derivadoA?: string; observaciones?: string; estado: string; createdAt: string
  nivelRiesgo?: string; policiaSolicitante?: string
  horaActivacion?: string; horaLlegada?: string; horaFinIntervencion?: string
  trasladoCentroSalud: boolean; horaTrasladoSalud?: string; centroSaludDestino?: string
  trasladoGuardiaCivil: boolean; horaEntregaGC?: string
  trasladoJuzgado: boolean; horaLlegadaJuzgado?: string
  trasladoPradoSS: boolean; horaLlegadaPrado?: string
}
interface DisponibilidadViogen {
  id: string; usuarioId: string; usuarioNombre: string; fecha: string; disponible: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// ─── Iconos SVG para markers del mapa ────────────────────────────────────────
const MAP_ICON_SVGS: Record<string, { path: string; color: string; bg: string }> = {
  // Centros
  pabellon:              { path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', color: '#0d9488', bg: '#ccfbf1' },
  centro_multifuncional: { path: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16 M1 21h22 M9 21V9h6v12', color: '#0891b2', bg: '#cffafe' },
  ceu:                   { path: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5', color: '#059669', bg: '#d1fae5' },
  otro:                  { path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z M12 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z', color: '#6b7280', bg: '#f3f4f6' },
  // Espacios
  hotel:                 { path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', color: '#7c3aed', bg: '#ede9fe' },
  albergue:              { path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', color: '#db2777', bg: '#fce7f3' },
  polideportivo:         { path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', color: '#2563eb', bg: '#dbeafe' },
  // Directorio
  policia:               { path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: '#1d4ed8', bg: '#dbeafe' },
  guardia_civil:         { path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: '#15803d', bg: '#dcfce7' },
  sanidad:               { path: 'M22 12h-4l-3 9L9 3l-3 9H2', color: '#dc2626', bg: '#fee2e2' },
  juzgado:               { path: 'M3 21h18 M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4 M5 21V10.85', color: '#92400e', bg: '#fef3c7' },
  servicios_sociales:    { path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', color: '#be185d', bg: '#fce7f3' },
  vivienda:              { path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', color: '#b45309', bg: '#fef3c7' },
  educacion:             { path: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5', color: '#7c3aed', bg: '#ede9fe' },
  default:               { path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z M12 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z', color: '#6b7280', bg: '#f3f4f6' },
}

function createMapIcon(tipo: string): any {
  if (typeof window === 'undefined') return undefined
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  const def = MAP_ICON_SVGS[tipo] || MAP_ICON_SVGS.default
  const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${def.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${def.path}"/></svg>`
  return L.divIcon({
    html: `<div style="background:${def.bg};border:2px solid ${def.color};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${svgHtml}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

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

// Miembros VIOGEN cargados dinámicamente desde API

// ─── Componente Principal ─────────────────────────────────────────────────────


function GestionFamiliasModal({ familias, categoriaId, onClose, onRefresh }: {
  familias: Familia[]
  categoriaId: string | null
  onClose: () => void
  onRefresh: () => void
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCrear = async (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    e.preventDefault()
    if (!categoriaId) { alert('Categoría no encontrada en BD'); return }
    const fd = new FormData(form)
    const nombre = fd.get('nombre') as string
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'familia', nombre, categoriaId })
      })
      form.reset()
      onRefresh()
    } finally { setSaving(false) }
  }

  const handleEditar = async (id: string) => {
    if (!editandoNombre.trim()) return
    setSaving(true)
    try {
      await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'familia', id, nombre: editandoNombre })
      })
      setEditandoId(null)
      setEditandoNombre('')
      onRefresh()
    } finally { setSaving(false) }
  }

  const handleEliminar = async (fam: Familia) => {
    if ((fam._count?.articulos ?? 0) > 0) {
      alert(`No se puede eliminar "${fam.nombre}": tiene ${fam._count?.articulos} artículo(s).`)
      return
    }
    if (!confirm(`¿Eliminar la familia "${fam.nombre}"?`)) return
    await fetch(`/api/logistica?tipo=familia&id=${fam.id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Gestión de Familias</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <form onSubmit={handleCrear} className="flex gap-2">
            <input name="nombre" placeholder="Nueva familia..." required className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            <button type="submit" disabled={saving} className="px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">Añadir</button>
          </form>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {familias.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Sin familias creadas</p>}
            {familias.map(fam => (
              <div key={fam.id} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                {editandoId === fam.id ? (
                  <>
                    <input
                      value={editandoNombre}
                      onChange={e => setEditandoNombre(e.target.value)}
                      className="flex-1 border border-rose-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditar(fam.id)
                        if (e.key === 'Escape') { setEditandoId(null); setEditandoNombre('') }
                      }}
                    />
                    <button onClick={() => handleEditar(fam.id)} disabled={saving} className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-medium disabled:opacity-40">Guardar</button>
                    <button onClick={() => { setEditandoId(null); setEditandoNombre('') }} className="px-2 py-1 border border-gray-200 text-gray-500 rounded text-xs">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-700">{fam.nombre}</span>
                    <span className="text-xs text-gray-400 mr-1">{fam._count?.articulos ?? 0} art.</span>
                    <button onClick={() => { setEditandoId(fam.id); setEditandoNombre(fam.nombre) }} className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors" title="Editar">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEliminar(fam)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [cuadrante, setCuadrante] = useState<Record<string, Record<string, {manana: boolean, tarde: boolean}>>>({})
  const [miembrosViogen, setMiembrosViogen] = useState<any[]>([])

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
  const [casoEditando, setCasoEditando] = useState<CasoViogen | null>(null)
  const [filtroCasos, setFiltroCasos] = useState<string>('all')
  const [casoExpandido, setCasoExpandido] = useState<string | null>(null)
  const [articuloSel, setArticuloSel] = useState<Articulo | null>(null)
  const [espacioSel, setEspacioSel] = useState<EspacioAcogida | null>(null)
  const [centroSel, setCentroSel] = useState<CentroEmergencia | null>(null)
  const [contactoSel, setContactoSel] = useState<Contacto | null>(null)
  const [reincidencia, setReincidencia] = useState<CasoViogen[]>([])

  // ─── Carga de datos ────────────────────────────────────────────────────────

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [resInv, resCat, resEsp, resCent, resCont, resCasos, resMiembros, resStats] = await Promise.all([
        fetch('/api/logistica?inventario=accion-social'),
        fetch('/api/logistica?tipo=categoria&slug=accion-social'),
        fetch('/api/accion-social?tipo=espacios'),
        fetch('/api/accion-social?tipo=centros'),
        fetch('/api/accion-social?tipo=directorio'),
        fetch('/api/accion-social?tipo=viogen'),
        fetch('/api/accion-social?tipo=miembros-viogen'),
        fetch('/api/accion-social?tipo=stats')
      ])
      const [dInv, dCat, dEsp, dCent, dCont, dCasos, dMiembros, dStats] = await Promise.all([
        resInv.json(), resCat.json(), resEsp.json(),
        resCent.json(), resCont.json(), resCasos.json(), resMiembros.json(), resStats.json()
      ])
      setArticulos(dInv.articulos || [])
      setFamilias(dInv.familias || [])
      if (dCat.categoria) setCategoriaId(dCat.categoria.id)
      setEspacios(dEsp.espacios || [])
      setCentros(dCent.centros || [])
      setContactos(dCont.contactos || [])
      setCasos(dCasos.casos || [])
      setMiembrosViogen(dMiembros.miembros || [])
      setStats(dStats)
    } catch (e) { console.error("Error en operación:", e) }
    finally { setLoading(false) }
  }

  const cargarPeticiones = async () => {
    try {
      const r = await fetch('/api/logistica/peticiones?area=accion_social')
      const d = await r.json()
      setPeticiones(d.peticiones || [])
    } catch (e) { console.error("Error en operación:", e) }
  }

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab])
  useEffect(() => { if (mainTab === 'cuadrante') cargarCuadrante() }, [semanaOffset, mainTab])

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

  // Obtener lunes de la semana actual (para la API)
  const getLunesSemana = () => {
    const hoy = new Date()
    hoy.setDate(hoy.getDate() + semanaOffset * 7)
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
    return lunes.toISOString().split('T')[0]
  }

  const cargarCuadrante = async () => {
    try {
      const semana = getLunesSemana()
      const res = await fetch(`/api/accion-social?tipo=cuadrante-viogen&semana=${semana}`)
      const data = await res.json()
      setCuadrante(data.cuadrante || {})
    } catch (e) { console.error('Error cargando cuadrante viogen:', e) }
  }

  const toggleDisponibilidadTurno = async (usuarioId: string, fecha: string, turno: 'manana' | 'tarde', puedeEditar: boolean) => {
    if (!puedeEditar) return
    const actual = cuadrante[fecha]?.[usuarioId]?.[turno] ?? false
    const nuevoValor = !actual
    // Optimistic update
    setCuadrante(prev => ({
      ...prev,
      [fecha]: {
        ...(prev[fecha] || {}),
        [usuarioId]: {
          manana: prev[fecha]?.[usuarioId]?.manana ?? false,
          tarde: prev[fecha]?.[usuarioId]?.tarde ?? false,
          [turno]: nuevoValor
        }
      }
    }))
    try {
      await fetch('/api/accion-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'cuadrante-viogen',
          usuarioId,
          semana: getLunesSemana(),
          fecha,
          turno,
          valor: nuevoValor
        })
      })
    } catch (e) {
      console.error('Error guardando cuadrante:', e)
      // Revert on error
      setCuadrante(prev => ({
        ...prev,
        [fecha]: {
          ...(prev[fecha] || {}),
          [usuarioId]: {
            manana: prev[fecha]?.[usuarioId]?.manana ?? false,
            tarde: prev[fecha]?.[usuarioId]?.tarde ?? false,
            [turno]: actual
          }
        }
      }))
    }
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
    <div className="space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">ACCIÓN SOCIAL</p>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión Social y VIOGEN</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Espacios de acogida, directorio de emergencias y coordinación VIOGEN</p>
            </div>
          </div>
          {/* Botones desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={cargarDatos} className="flex items-center justify-center p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 flex-shrink-0" title="Recargar"><RefreshCw size={18} /></button>
            <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm" title="Nueva Petición"><ShoppingCart size={18} />Petición</button>
            <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400 font-medium text-sm" title="Nuevo Artículo"><Package size={18} />Artículo</button>
            <button onClick={() => setShowNuevoCaso(true)} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium text-sm" title="Nuevo Caso VIOGEN"><Shield size={18} />VIOGEN</button>
          </div>
        </div>
        {/* Botones móvil: fila completa */}
        <div className="flex sm:hidden gap-2 mt-3">
          <button onClick={cargarDatos} className="flex-1 flex items-center justify-center p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200" title="Recargar"><RefreshCw size={18} /></button>
          <button onClick={() => setShowNuevaPeticion(true)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"><ShoppingCart size={18} /><span className="sr-only">Petición</span></button>
          <button onClick={() => setShowNuevoArticulo(true)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400 font-medium text-sm"><Package size={18} /><span className="sr-only">Artículo</span></button>
          <button onClick={() => setShowNuevoCaso(true)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium text-sm"><Shield size={18} /><span className="sr-only">VIOGEN</span></button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500 text-xs font-medium">Material del Área</p><h3 className="text-3xl font-bold text-slate-800 mt-1">{articulos.length}</h3></div>
            <div className="bg-purple-100 p-2.5 rounded-xl"><Package size={22} className="text-purple-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500 text-xs font-medium">Stock Bajo</p><h3 className={`text-3xl font-bold mt-1 ${stockBajo > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stockBajo}</h3></div>
            <div className="bg-amber-100 p-2.5 rounded-xl"><AlertTriangle size={22} className="text-amber-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500 text-xs font-medium">Plazas Urgencia</p><h3 className="text-3xl font-bold text-slate-800 mt-1">{plazasTotales}</h3></div>
            <div className="bg-blue-100 p-2.5 rounded-xl"><Hotel size={22} className="text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500 text-xs font-medium">Centros Emergencia</p><h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.centros}</h3></div>
            <div className="bg-teal-100 p-2.5 rounded-xl"><Building2 size={22} className="text-teal-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500 text-xs font-medium">Casos VIOGEN Activos</p><h3 className={`text-3xl font-bold mt-1 ${stats.casosActivos > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.casosActivos}</h3></div>
            <div className={`p-2.5 rounded-xl ${stats.casosActivos > 0 ? 'bg-red-100' : 'bg-slate-100'}`}><ShieldAlert size={22} className={`${stats.casosActivos > 0 ? 'text-red-600' : 'text-slate-400'}`} /></div>
          </div>
        </div>
      </div>
            {/* ── TABS PRINCIPALES ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
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
                  mainTab === t.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                {(t as any).badge > 0 && (
                  <span className="ml-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{(t as any).badge}</span>
                )}
              </button>
            ))}
          </div>
          {/* ══ TAB: INVENTARIO ═══════════════════════════════════════════════ */}
          {mainTab === 'inventario' && (
            <div>
              <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
                {(['stock', 'peticiones', 'movimientos'] as const).map(sub => (
                  <button key={sub} onClick={() => setInventoryTab(sub)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${inventoryTab === sub ? 'border-violet-600 text-violet-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800'}`}>
                    {sub === 'stock' ? 'Stock' : sub === 'peticiones' ? 'Peticiones' : 'Movimientos'}
                  </button>
                ))}
              </div>
                            {inventoryTab === 'stock' && (
                <div className="space-y-3 p-6">
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
                    <Marker key={c.id} position={[c.latitud!, c.longitud!]} icon={createMapIcon(c.tipo)}>
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
                    <Marker key={e.id} position={[e.latitud!, e.longitud!]} icon={createMapIcon(e.tipo)}>
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
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-4 text-sm font-semibold text-gray-900">{c.nombre}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIPOS_CENTRO[c.tipo]?.color}`}>
                            {TIPOS_CENTRO[c.tipo]?.label || c.tipo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-600">{c.direccion}</td>
                        <td className="py-3.5 px-4 text-sm text-gray-600">{c.responsable || '—'}</td>
                        <td className="py-3.5 px-4 text-sm">
                          {c.capacidad ? <span className="font-semibold text-teal-700">{c.capacidad} pers.</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-600">{c.telefono || '—'}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => { setCentroSel(c); setShowEditCentro(true) }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                            <button onClick={async () => {
                              if (!confirm(`¿Eliminar "${c.nombre}"?`)) return
                              await fetch(`/api/accion-social?tipo=centro&id=${c.id}`, { method: 'DELETE' })
                              cargarDatos()
                            }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <ShieldAlert size={16} className="text-red-600 shrink-0" />
                <p className="text-sm text-red-700"><strong>Información confidencial.</strong> Registro de intervenciones en colaboración con Policía Local en materia VIOGEN. Acceso restringido.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchViogen} onChange={e => setSearchViogen(e.target.value)} placeholder="Buscar por nombre o número de caso..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['all','activo','cerrado','derivado'] as const).map(f => (
                    <button key={f} onClick={() => setFiltroCasos(f)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${filtroCasos === f ? f === 'all' ? 'bg-gray-800 text-white border-gray-800' : f === 'activo' ? 'bg-red-600 text-white border-red-600' : f === 'cerrado' ? 'bg-gray-500 text-white border-gray-500' : 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                      {f !== 'all' && <span className="ml-1.5 opacity-75">{casos.filter(x => x.estado === f).length}</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {casosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <ShieldAlert size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay casos registrados</p>
                  </div>
                )}
                {casosFiltrados.map(caso => {
                  const isOpen = casoExpandido === caso.id
                  const reincidente = esReincidente(caso)
                  const nivelColor = caso.nivelRiesgo === 'extremo' ? 'bg-red-100 text-red-700 border-red-200' : caso.nivelRiesgo === 'alto' ? 'bg-orange-100 text-orange-700 border-orange-200' : caso.nivelRiesgo === 'medio' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                  return (
                    <div key={caso.id} className={`bg-white rounded-xl border-l-4 shadow-sm overflow-hidden transition-all ${caso.estado === 'activo' ? 'border-l-red-500' : caso.estado === 'cerrado' ? 'border-l-gray-400' : 'border-l-blue-500'}`}>
                      <button onClick={() => setCasoExpandido(isOpen ? null : caso.id)} className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{caso.numeroCaso}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ESTADOS_VIOGEN[caso.estado]?.color}`}>{ESTADOS_VIOGEN[caso.estado]?.label}</span>
                              {caso.nivelRiesgo && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${nivelColor}`}>⚠ Riesgo {caso.nivelRiesgo}</span>}
                              {reincidente && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">Reincidente</span>}
                            </div>
                            <p className="font-bold text-gray-900 text-base truncate">{caso.victimaNombre}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1"><Clock size={11} />{new Date(caso.fechaIntervencion).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}</span>
                              <span className="flex items-center gap-1"><MapPin size={11} />{caso.victimaDireccion}</span>
                              {caso.tieneHijos && caso.numeroHijos && <span className="flex items-center gap-1 text-amber-600"><Baby size={11} />{caso.numeroHijos} hijo{caso.numeroHijos > 1 ? 's' : ''}</span>}
                            </div>
                          </div>
                          <ChevronDown size={16} className={`text-gray-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          <div className="px-5 py-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-white rounded-lg p-3.5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User size={11} /> Víctima</p>
                                <p className="font-semibold text-gray-900 text-sm">{caso.victimaNombre}</p>
                                {caso.victimaDni && <p className="text-xs text-gray-500 mt-0.5">DNI: {caso.victimaDni}</p>}
                                {caso.victimaEdad && <p className="text-xs text-gray-500">{caso.victimaEdad} años</p>}
                                {caso.victimaTelefono && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{caso.victimaTelefono}</p>}
                                {caso.tieneHijos && <p className="text-xs text-amber-600 mt-1 font-medium">{caso.numeroHijos} hijo/s{caso.edadesHijos ? ` (${caso.edadesHijos})` : ''}</p>}
                              </div>
                              <div className="bg-white rounded-lg p-3.5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><AlertTriangle size={11} /> Motivo</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{caso.motivoIntervencion}</p>
                                {caso.policiaSolicitante && <p className="text-xs text-blue-600 mt-1.5 font-medium">Solicita: {caso.policiaSolicitante}</p>}
                              </div>
                              <div className="bg-white rounded-lg p-3.5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><UserCheck size={11} /> Recursos y derivación</p>
                                {caso.recursosActivados && <p className="text-sm text-gray-700 mb-1.5">{caso.recursosActivados}</p>}
                                {caso.derivadoA && <p className="text-xs text-blue-600 font-medium">{caso.derivadoA}</p>}
                                {caso.agresorNombre && <div className="mt-2 pt-2 border-t border-gray-100"><p className="text-xs text-gray-400 mb-0.5">Agresor</p><p className="text-xs font-medium text-gray-700">{caso.agresorNombre}</p></div>}
                              </div>
                            </div>
                            {(caso.horaActivacion || caso.horaLlegada || caso.horaFinIntervencion) && (
                              <div className="bg-white rounded-lg p-3.5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Clock size={11} /> Tiempos operativos</p>
                                <div className="flex items-center">
                                  {[{label:'Activación',hora:caso.horaActivacion,color:'bg-blue-500'},{label:'Llegada',hora:caso.horaLlegada,color:'bg-amber-500'},{label:'Fin',hora:caso.horaFinIntervencion,color:'bg-green-500'}].map((item,i) => (
                                    <div key={i} className="flex items-center flex-1 last:flex-none">
                                      <div className="flex flex-col items-center">
                                        <div className={`w-3 h-3 rounded-full ${item.hora ? item.color : 'bg-gray-200'}`} />
                                        <p className="text-xs font-medium text-gray-700 mt-1.5">{item.label}</p>
                                        <p className="text-xs text-gray-500">{item.hora ? new Date(item.hora).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) : '—'}</p>
                                      </div>
                                      {i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${item.hora ? 'bg-gray-300' : 'bg-gray-100'}`} />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(caso.trasladoCentroSalud || caso.trasladoGuardiaCivil || caso.trasladoJuzgado || caso.trasladoPradoSS) && (
                              <div className="bg-white rounded-lg p-3.5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MapPin size={11} /> Traslados</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {caso.trasladoCentroSalud && <div className="flex items-start gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100"><div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[9px] font-bold">✓</span></div><div><p className="text-xs font-semibold text-gray-700">Centro de Salud</p>{caso.centroSaludDestino && <p className="text-xs text-gray-500">{caso.centroSaludDestino}</p>}{caso.horaTrasladoSalud && <p className="text-xs text-gray-400">{new Date(caso.horaTrasladoSalud).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</p>}</div></div>}
                                  {caso.trasladoGuardiaCivil && <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100"><div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[9px] font-bold">✓</span></div><div><p className="text-xs font-semibold text-gray-700">Guardia Civil</p>{caso.horaEntregaGC && <p className="text-xs text-gray-400">{new Date(caso.horaEntregaGC).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</p>}</div></div>}
                                  {caso.trasladoJuzgado && <div className="flex items-start gap-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100"><div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[9px] font-bold">✓</span></div><div><p className="text-xs font-semibold text-gray-700">Juzgado VIOGEN Sevilla</p>{caso.horaLlegadaJuzgado && <p className="text-xs text-gray-400">{new Date(caso.horaLlegadaJuzgado).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</p>}</div></div>}
                                  {caso.trasladoPradoSS && <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100"><div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[9px] font-bold">✓</span></div><div><p className="text-xs font-semibold text-gray-700">Prado San Sebastián</p>{caso.horaLlegadaPrado && <p className="text-xs text-gray-400">{new Date(caso.horaLlegadaPrado).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</p>}</div></div>}
                                </div>
                              </div>
                            )}
                            {caso.observaciones && <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100"><p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Observaciones</p><p className="text-sm text-gray-700">{caso.observaciones}</p></div>}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 font-medium">Estado:</span>
                                {(['activo','cerrado','derivado'] as const).map(est => (
                                  <button key={est} onClick={async () => { await fetch('/api/accion-social',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'viogen',id:caso.id,estado:est,observaciones:caso.observaciones,derivadoA:caso.derivadoA,recursosActivados:caso.recursosActivados})}); cargarDatos() }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${caso.estado===est ? est==='activo' ? 'bg-red-600 text-white border-red-600' : est==='cerrado' ? 'bg-gray-500 text-white border-gray-500' : 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                    {est.charAt(0).toUpperCase()+est.slice(1)}
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => { setCasoEditando(caso) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"><Edit size={13} /> Editar caso</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
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
                    {miembrosViogen.length === 0 ? (
                      <tr><td colSpan={9} className="py-8 text-center text-gray-400 text-sm">No hay miembros asignados al área de Acción Social</td></tr>
                    ) : miembrosViogen.map((miembro, mi) => {
                      const nombreCompleto = `${miembro.nombre} ${miembro.apellidos}`
                      const esAdmin = ['superadmin','admin','coordinador'].includes(session?.user?.rol || '')
                      const esMiembro = miembro.id === (session?.user as any)?.id
                      const puedeEditar = esAdmin || esMiembro
                      const totalDisp = diasSemana.reduce((acc, d) => {
                        const k = d.toISOString().split('T')[0]
                        const t = cuadrante[k]?.[miembro.id]
                        return acc + (t?.manana ? 1 : 0) + (t?.tarde ? 1 : 0)
                      }, 0)
                      const maxDisp = diasSemana.length * 2
                      return (
                        <tr key={mi} className={`border-b border-gray-100 ${mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                                {`${miembro.nombre[0]}${miembro.apellidos[0]}`}
                              </div>
                              <span className="font-medium text-gray-800 text-sm">{nombreCompleto}</span>
                            </div>
                          </td>
                          {diasSemana.map((dia, di) => {
                            const fechaKey = dia.toISOString().split('T')[0]
                            const dispManana = cuadrante[fechaKey]?.[miembro.id]?.manana ?? false
                            const dispTarde = cuadrante[fechaKey]?.[miembro.id]?.tarde ?? false
                            const esHoy = dia.toDateString() === new Date().toDateString()
                            return (
                              <td key={di} className={`py-2 px-1 text-center ${esHoy ? 'bg-rose-50/50' : ''}`}>
                                <div className="flex gap-0.5">
                                  {/* Mañana */}
                                  <button
                                    disabled={!puedeEditar}
                                    title="Mañana 09:00–15:00"
                                    onClick={() => toggleDisponibilidadTurno(miembro.id, fechaKey, 'manana', puedeEditar)}
                                    className={`flex-1 py-2 rounded-l-lg text-[10px] font-bold transition-all border ${
                                      dispManana
                                        ? 'bg-amber-400 text-white border-amber-500 shadow-sm'
                                        : 'bg-gray-100 text-gray-300 border-gray-200 hover:bg-amber-50 hover:text-amber-400'
                                    } ${!puedeEditar ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    M
                                  </button>
                                  {/* Tarde */}
                                  <button
                                    disabled={!puedeEditar}
                                    title="Tarde 15:00–21:00"
                                    onClick={() => toggleDisponibilidadTurno(miembro.id, fechaKey, 'tarde', puedeEditar)}
                                    className={`flex-1 py-2 rounded-r-lg text-[10px] font-bold transition-all border ${
                                      dispTarde
                                        ? 'bg-blue-400 text-white border-blue-500 shadow-sm'
                                        : 'bg-gray-100 text-gray-300 border-gray-200 hover:bg-blue-50 hover:text-blue-400'
                                    } ${!puedeEditar ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    T
                                  </button>
                                </div>
                              </td>
                            )
                          })}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              totalDisp >= 5 ? 'bg-green-100 text-green-700'
                              : totalDisp >= 3 ? 'bg-yellow-100 text-yellow-700'
                              : totalDisp > 0 ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-400'
                            }`}>{totalDisp}/{maxDisp}</span>
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
                        const countM = miembrosViogen.filter(m => cuadrante[k]?.[m.id]?.manana).length
                        const countT = miembrosViogen.filter(m => cuadrante[k]?.[m.id]?.tarde).length
                        const count = countM + countT
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
        <GestionFamiliasModal
          familias={familias}
          categoriaId={categoriaId}
          onClose={() => setShowGestionFamilias(false)}
          onRefresh={cargarDatos}
        />
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


      {/* Modal Editar Centro */}
      {showEditCentro && centroSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Editar Centro de Emergencia</h3>
              <button onClick={() => { setShowEditCentro(false); setCentroSel(null) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              const form = e.currentTarget
              e.preventDefault()
              const fd = new FormData(form)
              await fetch('/api/accion-social', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'centro', id: centroSel.id,
                  nombre: fd.get('nombre'), tipoCentro: fd.get('tipoCentro'),
                  direccion: fd.get('direccion'), responsable: fd.get('responsable'),
                  telefono: fd.get('telefono'), email: fd.get('email'),
                  capacidad: fd.get('capacidad') ? parseInt(fd.get('capacidad') as string) : null,
                  latitud: fd.get('latitud') ? parseFloat(fd.get('latitud') as string) : null,
                  longitud: fd.get('longitud') ? parseFloat(fd.get('longitud') as string) : null,
                  estado: fd.get('estado'), notas: fd.get('notas') }) })
              setShowEditCentro(false); setCentroSel(null); cargarDatos()
            }} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" defaultValue={centroSel.nombre} required placeholder="Nombre *" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select name="tipoCentro" defaultValue={centroSel.tipo} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(TIPOS_CENTRO).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select name="estado" defaultValue={centroSel.estado || 'activo'} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="mantenimiento">En mantenimiento</option>
                </select>
                <input name="direccion" defaultValue={centroSel.direccion} required placeholder="Dirección *" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="responsable" defaultValue={centroSel.responsable || ''} placeholder="Responsable" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="telefono" defaultValue={centroSel.telefono || ''} placeholder="Teléfono" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="email" defaultValue={centroSel.email || ''} placeholder="Email" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="capacidad" type="number" defaultValue={centroSel.capacidad || ''} placeholder="Capacidad (personas)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 flex items-center">Capacidad actual: {centroSel.capacidad || '—'}</div>
                <input name="latitud" defaultValue={centroSel.latitud || ''} placeholder="Latitud" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input name="longitud" defaultValue={centroSel.longitud || ''} placeholder="Longitud" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea name="notas" defaultValue={centroSel.notas || ''} rows={2} placeholder="Notas" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditCentro(false); setCentroSel(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
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

      {/* Modal Editar Caso VIOGEN */}
      {casoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Editar Caso {casoEditando.numeroCaso}</h3>
              </div>
              <button onClick={() => setCasoEditando(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async e => {
              const form = e.currentTarget
              e.preventDefault()
              const fd = new FormData(form)
              await fetch('/api/accion-social', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'viogen',
                  id: casoEditando.id,
                  estado: fd.get('estado'),
                  recursosActivados: fd.get('recursosActivados'),
                  derivadoA: fd.get('derivadoA'),
                  observaciones: fd.get('observaciones'),
                })
              })
              setCasoEditando(null)
              cargarDatos()
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Estado del caso</label>
                <select name="estado" defaultValue={casoEditando.estado} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="activo">Activo</option>
                  <option value="cerrado">Cerrado</option>
                  <option value="derivado">Derivado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Recursos activados</label>
                <input name="recursosActivados" defaultValue={casoEditando.recursosActivados || ''} placeholder="Sanitarios, alojamiento..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Derivado a</label>
                <input name="derivadoA" defaultValue={casoEditando.derivadoA || ''} placeholder="Servicios sociales, juzgado, albergue..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones</label>
                <textarea name="observaciones" defaultValue={casoEditando.observaciones || ''} rows={3} placeholder="Observaciones adicionales..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setCasoEditando(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
