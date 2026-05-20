'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Package, Eye, X, Pencil, Archive, Trash2,
  ChevronDown, ChevronUp, ExternalLink,
  Flame, Heart, Truck, Radio, BookOpen, Shirt, Tent, Users,
  ClipboardList, ShoppingCart, Check, FileText, FileCheck, Send, Ban,
  History, User, Building, Calendar, Filter, Plus,
  Clock, CheckCircle, TrendingUp, TrendingDown, BarChart3
} from 'lucide-react'
import { TbDrone } from 'react-icons/tb'

// ============================================
// TIPOS
// ============================================
export interface PeticionItem {
  id: string
  nombreArticulo: string
  cantidad: number
  cantidadRecibida: number | null
  unidad: string
  costeUnitario: number | null
  notas: string | null
  articuloId: string | null
  articulo: { id: string; nombre: string; codigo: string; stockActual: number } | null
}

interface HistorialPeticion {
  id: string
  estadoAnterior: string | null
  estadoNuevo: string
  comentario: string | null
  createdAt: string
  usuario: { nombre: string; apellidos: string }
}

export interface Peticion {
  id: string
  numero: string
  areaOrigen: string
  nombreArticulo: string | null
  cantidad: number | null
  unidad: string | null
  motivo: string
  prioridad: string
  descripcion: string | null
  estado: string
  fechaSolicitud: string
  fechaAprobacion: string | null
  fechaCompra: string | null
  fechaRecepcion: string | null
  proveedor: string | null
  costeEstimado: number | null
  costeFinal: number | null
  numeroFactura: string | null
  numeroRc: string | null
  numeroAlbaran: string | null
  notasAprobacion: string | null
  notasCompra: string | null
  notasRecepcion: string | null
  motivoRechazo: string | null
  urlRc: string | null
  urlAlbaran: string | null
  items: PeticionItem[]
  solicitante: { nombre: string; apellidos: string; numeroVoluntario: string }
  articulo: { id: string; nombre: string; codigo: string } | null
  aprobadoPor: { nombre: string; apellidos: string } | null
  recibidoPor: { nombre: string; apellidos: string } | null
  historial: HistorialPeticion[]
}

// ============================================
// CONSTANTES
// ============================================
const ICONOS_AREA: Record<string, any> = {
  logistica: Package, socorrismo: Heart, incendios: Flame, eci: Package,
  'parque-movil': Truck, vehiculos: Truck, transmisiones: Radio, formacion: BookOpen,
  pma: Tent, vestuario: Shirt, drones: TbDrone, accion_social: Users,
}

const ESTADOS_PETICION = {
  pendiente: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Pendiente', icon: Clock },
  aprobada: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Aprobada', icon: Check },
  en_compra: { color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'En Compra', icon: ShoppingCart },
  recibida: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Recibida', icon: CheckCircle },
  rechazada: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Rechazada', icon: Ban },
  cancelada: { color: 'bg-slate-100 text-slate-700 border-slate-300', label: 'Cancelada', icon: X },
}

const PRIORIDADES = {
  baja: { color: 'bg-slate-100 text-slate-600', label: 'Baja' },
  normal: { color: 'bg-blue-100 text-blue-600', label: 'Normal' },
  alta: { color: 'bg-orange-100 text-orange-600', label: 'Alta' },
  urgente: { color: 'bg-red-100 text-red-600', label: 'Urgente' },
}

const MOTIVOS_PETICION = [
  { value: 'reposicion', label: 'Reposición de stock' },
  { value: 'urgente', label: 'Necesidad urgente' },
  { value: 'nuevo', label: 'Material nuevo' },
  { value: 'preventivo', label: 'Aprovisionamiento preventivo' },
  { value: 'proyecto', label: 'Para proyecto/evento' },
]

export const AREAS_NOMBRE: Record<string, string> = {
  logistica: 'Logística', socorrismo: 'Socorrismo', incendios: 'Incendios', eci: 'ECI',
  'parque-movil': 'Parque Móvil', vehiculos: 'Vehículos', transmisiones: 'Transmisiones',
  formacion: 'Formación', pma: 'PMA', vestuario: 'Vestuario', drones: 'Drones',
  accion_social: 'Acción Social',
}

const UNIDADES = ['unidad', 'paquete', 'caja', 'par', 'kg', 'l', 'rollo', 'set']

const getIconoArea = (slug: string) => ICONOS_AREA[slug] || Package

function formatearFecha(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function formatearFechaHora(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function resumenItems(peticion: Peticion): string {
  if (peticion.items && peticion.items.length > 0) {
    if (peticion.items.length === 1) return peticion.items[0].nombreArticulo
    return `${peticion.items.length} artículos`
  }
  return peticion.nombreArticulo || '—'
}
function totalItems(peticion: Peticion): string {
  if (peticion.items && peticion.items.length > 0) {
    if (peticion.items.length === 1) return `× ${peticion.items[0].cantidad} ${peticion.items[0].unidad}`
    const total = peticion.items.reduce((s, i) => s + i.cantidad, 0)
    return `× ${total} uds`
  }
  return peticion.cantidad ? `× ${peticion.cantidad} ${peticion.unidad || ''}` : ''
}

// ============================================
// MODAL GENÉRICO
// ============================================
function Modal({ title, children, onClose, size = 'md', accentColor = 'from-purple-600 to-purple-700' }: {
  title: string; children: React.ReactNode; onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'; accentColor?: string
}) {
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className={`bg-gradient-to-r ${accentColor} px-6 py-4 flex justify-between items-center`}>
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  )
}

// ============================================
// PROPS DEL COMPONENTE
// ============================================
interface PeticionesTabProps {
  /** 'all' para mostrar todas las áreas (logística), o el slug del área específica */
  areaOrigen: string
  /** Si el usuario puede aprobar/rechazar/gestionar peticiones */
  isAdmin: boolean
  /** Color de acento para el modal (tailwind gradient) */
  accentColor?: string
}

type ItemForm = { nombreArticulo: string; cantidad: number; unidad: string; articuloId?: string }
const ITEM_VACIO: ItemForm = { nombreArticulo: '', cantidad: 1, unidad: 'unidad' }

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PeticionesTab({ areaOrigen, isAdmin, accentColor = 'from-purple-600 to-purple-700' }: PeticionesTabProps) {
  const [peticiones, setPeticiones] = useState<Peticion[]>([])
  const [stats, setStats] = useState({ total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 })
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('all')
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 10

  // Modales
  const [showNueva, setShowNueva] = useState(false)
  const [peticionEditando, setPeticionEditando] = useState<Peticion | null>(null)
  const [showDetalle, setShowDetalle] = useState<Peticion | null>(null)
  const [showAccion, setShowAccion] = useState<{ peticion: Peticion; accion: string } | null>(null)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  // Formulario nueva petición (multi-artículo)
  const [items, setItems] = useState<ItemForm[]>([{ ...ITEM_VACIO }])
  const [formBase, setFormBase] = useState({
    motivo: 'reposicion', prioridad: 'normal', descripcion: '',
    areaOrigenForm: areaOrigen === 'all' ? '' : areaOrigen
  })

  // Formulario acción
  const [accionForm, setAccionForm] = useState({
    comentario: '', proveedor: '', costeEstimado: '', costeFinal: '',
    numeroFactura: '', numeroRc: '', numeroAlbaran: '', urlRc: '', urlAlbaran: ''
  })

  // ──────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (areaOrigen !== 'all') params.set('area', areaOrigen)
      if (filtro !== 'all') params.set('estado', filtro)
      const r = await fetch(`/api/logistica/peticiones?${params}`)
      const d = await r.json()
      setPeticiones(d.peticiones || [])
      setStats(d.stats || stats)
    } catch { /* silenciado */ }
    finally { setLoading(false) }
  }, [areaOrigen, filtro]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar])

  // ──────────────────────────────────────────
  // Helpers items
  const addItem = () => setItems(prev => [...prev, { ...ITEM_VACIO }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i))
  const updateItem = (i: number, field: keyof ItemForm, val: string | number) =>
    setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: val } : item))

  const resetForm = () => {
    setItems([{ ...ITEM_VACIO }])
    setFormBase({ motivo: 'reposicion', prioridad: 'normal', descripcion: '', areaOrigenForm: areaOrigen === 'all' ? '' : areaOrigen })
    setPeticionEditando(null)
  }

  const toggleExpandida = (id: string) => {
    setExpandidas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  const togglePopup = (key: string) => {
    setExpandidas(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })
  }

  // ──────────────────────────────────────────
  // Guardar petición (crear o editar)
  const guardarPeticion = async () => {
    if (!formBase.areaOrigenForm) { alert('Selecciona el área solicitante'); return }
    const itemsValidos = items.filter(i => i.nombreArticulo.trim() && i.cantidad > 0)
    if (itemsValidos.length === 0) { alert('Añade al menos un artículo con nombre y cantidad'); return }
    if (!formBase.motivo) { alert('El motivo es obligatorio'); return }

    try {
      if (peticionEditando) {
        // Editar: solo metadatos de la cabecera (motivo, prioridad, descripcion)
        const r = await fetch(`/api/logistica/peticiones/${peticionEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'editar', motivo: formBase.motivo, prioridad: formBase.prioridad, descripcion: formBase.descripcion })
        })
        if (!r.ok) { const d = await r.json(); alert('Error: ' + d.error); return }
      } else {
        const r = await fetch('/api/logistica/peticiones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            areaOrigen: formBase.areaOrigenForm,
            motivo: formBase.motivo,
            prioridad: formBase.prioridad,
            descripcion: formBase.descripcion,
            items: itemsValidos
          })
        })
        if (!r.ok) { const d = await r.json(); alert('Error: ' + d.error); return }
      }
      setShowNueva(false)
      resetForm()
      cargar()
    } catch { alert('Error de conexión') }
  }

  // Acción (aprobar/rechazar/en_compra/recibir/cancelar)
  const ejecutarAccion = async () => {
    if (!showAccion) return
    try {
      const r = await fetch(`/api/logistica/peticiones/${showAccion.peticion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: showAccion.accion, ...accionForm })
      })
      if (r.ok) {
        setShowAccion(null)
        setAccionForm({ comentario: '', proveedor: '', costeEstimado: '', costeFinal: '', numeroFactura: '', numeroRc: '', numeroAlbaran: '', urlRc: '', urlAlbaran: '' })
        cargar()
      } else {
        const d = await r.json(); alert('Error: ' + d.error)
      }
    } catch { alert('Error de conexión') }
  }

  // Adjuntar documento (RC / albarán)
  const adjuntarDoc = async (peticionId: string, tipo: 'rc' | 'albaran', valor: string, numero: string) => {
    if (!valor && !numero) return
    try {
      await fetch(`/api/logistica/peticiones/${peticionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'actualizar_docs',
          ...(tipo === 'rc' ? { urlRc: valor, numeroRc: numero } : { urlAlbaran: valor, numeroAlbaran: numero })
        })
      })
      togglePopup(`${tipo}-popup-${peticionId}`)
      cargar()
    } catch { alert('Error al adjuntar') }
  }

  const abrirEditar = (peticion: Peticion) => {
    setPeticionEditando(peticion)
    setFormBase({
      motivo: peticion.motivo,
      prioridad: peticion.prioridad,
      descripcion: peticion.descripcion || '',
      areaOrigenForm: peticion.areaOrigen
    })
    setItems(peticion.items.length > 0
      ? peticion.items.map(i => ({ nombreArticulo: i.nombreArticulo, cantidad: i.cantidad, unidad: i.unidad, articuloId: i.articuloId || undefined }))
      : [{ nombreArticulo: peticion.nombreArticulo || '', cantidad: peticion.cantidad || 1, unidad: peticion.unidad || 'unidad' }]
    )
    setShowNueva(true)
  }

  const peticionesFiltradas = peticiones.filter(p => filtro === 'all' || p.estado === filtro)
  const paginadas = peticionesFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const totalPaginas = Math.ceil(peticionesFiltradas.length / POR_PAGINA)

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Cabecera / filtros / botón nueva */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select value={filtro} onChange={e => { setFiltro(e.target.value); setPagina(1) }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">Todos ({stats.total})</option>
              <option value="pendiente">Pendientes ({stats.pendientes})</option>
              <option value="aprobada">Aprobadas ({stats.aprobadas})</option>
              <option value="en_compra">En Compra ({stats.enCompra})</option>
              <option value="recibida">Recibidas ({stats.recibidas})</option>
              <option value="rechazada">Rechazadas ({stats.rechazadas})</option>
            </select>
          </div>
          {/* Resumen estado inline */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{stats.pendientes} pend.</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{stats.aprobadas} apr.</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />{stats.enCompra} compra</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{stats.recibidas} recib.</span>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowNueva(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Nueva Petición
        </button>
      </div>

      {/* Lista de peticiones */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : peticionesFiltradas.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay peticiones</p>
          <button onClick={() => { resetForm(); setShowNueva(true) }} className="mt-3 text-blue-600 text-sm hover:underline font-medium">
            Crear la primera petición
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginadas.map(peticion => {
              const estadoInfo = ESTADOS_PETICION[peticion.estado as keyof typeof ESTADOS_PETICION] || ESTADOS_PETICION.pendiente
              const prioridadInfo = PRIORIDADES[peticion.prioridad as keyof typeof PRIORIDADES] || PRIORIDADES.normal
              const EstadoIcon = estadoInfo.icon
              const AreaIcon = getIconoArea(peticion.areaOrigen)
              const estaExpandida = expandidas.has(peticion.id)

              return (
                <div key={peticion.id} className="bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all overflow-visible relative">
                  <div className="px-4 pt-3 pb-2">

                    {/* Fila 1: icono + número + estado + prioridad + meta + acciones CRUD */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                        onClick={() => toggleExpandida(peticion.id)}>
                        <AreaIcon size={16} className="text-slate-500" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{peticion.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${estadoInfo.color} flex items-center gap-1`}>
                        <EstadoIcon size={10} /> {estadoInfo.label}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${prioridadInfo.color}`}>{prioridadInfo.label}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1"><User size={10} /> {peticion.solicitante.nombre} {peticion.solicitante.apellidos}</span>
                      {areaOrigen === 'all' && (
                        <span className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1"><Building size={10} /> {AREAS_NOMBRE[peticion.areaOrigen] || peticion.areaOrigen}</span>
                      )}
                      <span className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1"><Calendar size={10} /> {formatearFecha(peticion.fechaSolicitud)}</span>

                      {/* CRUD */}
                      <div className="ml-auto flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5 border border-slate-100 flex-shrink-0">
                        <button onClick={() => setShowDetalle(peticion)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded" title="Ver detalle"><Eye size={14} /></button>
                        {(peticion.estado === 'pendiente' || isAdmin) && (
                          <button onClick={() => abrirEditar(peticion)} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-white rounded" title="Editar"><Pencil size={14} /></button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => { if (confirm('¿Cancelar esta petición?')) { fetch(`/api/logistica/peticiones/${peticion.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'cancelar' }) }).then(() => cargar()) } }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-white rounded" title="Cancelar"><Archive size={14} /></button>
                            <button onClick={() => { if (confirm('¿Eliminar permanentemente?')) { fetch(`/api/logistica/peticiones/${peticion.id}?force=true`, { method: 'DELETE' }).then(() => cargar()) } }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded" title="Eliminar"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Fila 2: artículo(s) + botones acción workflow */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 flex items-center gap-1.5 cursor-pointer group min-w-0" onClick={() => toggleExpandida(peticion.id)}>
                        <span className="font-medium text-slate-800 text-sm truncate">{resumenItems(peticion)}</span>
                        <span className="text-slate-400 text-xs whitespace-nowrap">{totalItems(peticion)}</span>
                        {peticion.items.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold">{peticion.items.length} arts.</span>
                        )}
                        {estaExpandida ? <ChevronUp size={14} className="text-slate-400 group-hover:text-blue-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 flex-shrink-0" />}
                      </div>

                      {/* Botones workflow — solo admin */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {peticion.estado === 'pendiente' && (<>
                            <button onClick={() => setShowAccion({ peticion, accion: 'rechazar' })}
                              className="px-2.5 py-1 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[11px] font-semibold">Rechazar</button>
                            <button onClick={() => setShowAccion({ peticion, accion: 'aprobar' })}
                              className="px-2.5 py-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"><Check size={12} /> Aprobar</button>
                          </>)}
                          {peticion.estado === 'aprobada' && (
                            <button onClick={() => setShowAccion({ peticion, accion: 'en_compra' })}
                              className="px-2.5 py-1 text-white bg-purple-600 hover:bg-purple-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"><ShoppingCart size={12} /> Compra</button>
                          )}
                          {(peticion.estado === 'aprobada' || peticion.estado === 'en_compra') && (
                            <button onClick={() => setShowAccion({ peticion, accion: 'recibir' })}
                              className="px-2.5 py-1 text-white bg-green-600 hover:bg-green-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"><CheckCircle size={12} /> Recibir</button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="flex items-start mt-3 px-2">
                      {/* Solicitada */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm ring-1 ring-green-300" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Solicitada</span>
                        <span className="text-[9px] text-slate-400">{formatearFecha(peticion.fechaSolicitud)}</span>
                      </div>

                      <div className={`flex-1 h-px mt-1.5 ${peticion.fechaAprobacion ? 'bg-green-400' : 'bg-slate-200'}`} />

                      {/* Aprobada + RC */}
                      <div className="flex flex-col items-center flex-1 relative">
                        <div className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ring-1 ${peticion.fechaAprobacion ? 'bg-green-500 ring-green-300' : 'bg-slate-200 ring-slate-200'}`} />
                          {/* Botón RC */}
                          {isAdmin && !peticion.urlRc && ['aprobada', 'en_compra', 'recibida'].includes(peticion.estado) && (
                            <div className="relative">
                              <button onClick={() => togglePopup(`rc-popup-${peticion.id}`)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[9px] font-bold border border-blue-200 whitespace-nowrap">
                                <FileText size={9} /> RC
                              </button>
                              {expandidas.has(`rc-popup-${peticion.id}`) && (
                                <DocPopup
                                  label="Adjuntar RC" icon={<FileText size={13} />} color="blue"
                                  onSave={(url, num) => adjuntarDoc(peticion.id, 'rc', url, num)}
                                  onCancel={() => togglePopup(`rc-popup-${peticion.id}`)}
                                />
                              )}
                            </div>
                          )}
                          {peticion.urlRc && (
                            <a href={peticion.urlRc} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold whitespace-nowrap">
                              <FileText size={9} /> RC <ExternalLink size={8} />
                            </a>
                          )}
                          {peticion.numeroRc && !peticion.urlRc && (
                            <span className="text-[9px] text-blue-600 font-mono">{peticion.numeroRc}</span>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold uppercase mt-0.5 ${peticion.fechaAprobacion ? 'text-slate-500' : 'text-slate-300'}`}>Aprobada</span>
                        {peticion.fechaAprobacion && <span className="text-[9px] text-slate-400">{formatearFecha(peticion.fechaAprobacion)}</span>}
                      </div>

                      <div className={`flex-1 h-px mt-1.5 ${peticion.fechaCompra ? 'bg-purple-400' : 'bg-slate-200'}`} />

                      {/* En compra */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ring-1 ${peticion.fechaCompra ? 'bg-purple-500 ring-purple-300' : 'bg-slate-200 ring-slate-200'}`} />
                        <span className={`text-[9px] font-bold uppercase mt-0.5 ${peticion.fechaCompra ? 'text-slate-500' : 'text-slate-300'}`}>En Compra</span>
                        {peticion.fechaCompra && <span className="text-[9px] text-slate-400">{formatearFecha(peticion.fechaCompra)}</span>}
                      </div>

                      <div className={`flex-1 h-px mt-1.5 ${peticion.fechaRecepcion ? 'bg-green-400' : 'bg-slate-200'}`} />

                      {/* Recibida + Albarán */}
                      <div className="flex flex-col items-center flex-1 relative">
                        <div className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ring-1 ${peticion.fechaRecepcion ? 'bg-green-500 ring-green-300' : 'bg-slate-200 ring-slate-200'}`} />
                          {isAdmin && !peticion.urlAlbaran && (peticion.estado === 'recibida') && (
                            <div className="relative">
                              <button onClick={() => togglePopup(`albaran-popup-${peticion.id}`)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-[9px] font-bold border border-green-200 whitespace-nowrap">
                                <FileCheck size={9} /> Albarán
                              </button>
                              {expandidas.has(`albaran-popup-${peticion.id}`) && (
                                <DocPopup
                                  label="Adjuntar Albarán" icon={<FileCheck size={13} />} color="green" align="right"
                                  onSave={(url, num) => adjuntarDoc(peticion.id, 'albaran', url, num)}
                                  onCancel={() => togglePopup(`albaran-popup-${peticion.id}`)}
                                />
                              )}
                            </div>
                          )}
                          {peticion.urlAlbaran && (
                            <a href={peticion.urlAlbaran} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-600 text-white rounded text-[9px] font-bold whitespace-nowrap">
                              <FileCheck size={9} /> Albarán <ExternalLink size={8} />
                            </a>
                          )}
                          {peticion.numeroAlbaran && !peticion.urlAlbaran && (
                            <span className="text-[9px] text-green-600 font-mono">{peticion.numeroAlbaran}</span>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold uppercase mt-0.5 ${peticion.fechaRecepcion ? 'text-slate-500' : 'text-slate-300'}`}>Recibida</span>
                        {peticion.fechaRecepcion && <span className="text-[9px] text-slate-400">{formatearFecha(peticion.fechaRecepcion)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Contenido expandido */}
                  {estaExpandida && (
                    <div className="px-4 py-4 bg-slate-50 border-t border-slate-200 space-y-4 text-sm">
                      {/* Artículos */}
                      {peticion.items.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Artículos solicitados</h4>
                          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                            {peticion.items.map((item, idx) => (
                              <div key={item.id || idx} className="flex items-center gap-3 px-3 py-2">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                                <span className="flex-1 font-medium text-slate-800">{item.nombreArticulo}</span>
                                <span className="text-slate-500">{item.cantidad} {item.unidad}</span>
                                {item.cantidadRecibida !== null && (
                                  <span className="text-green-600 text-xs font-medium">✓ {item.cantidadRecibida} recibidos</span>
                                )}
                                {item.costeUnitario !== null && (
                                  <span className="text-slate-400 text-xs">{Number(item.costeUnitario).toFixed(2)} €/u</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          {peticion.descripcion && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</h4>
                              <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200">{peticion.descripcion}</p>
                            </div>
                          )}
                          {peticion.notasAprobacion && (
                            <div>
                              <h4 className="text-xs font-bold text-blue-600 uppercase mb-1">Notas de aprobación</h4>
                              <p className="text-slate-700 bg-blue-50 p-2.5 rounded border border-blue-100">{peticion.notasAprobacion}</p>
                            </div>
                          )}
                          {peticion.notasCompra && (
                            <div>
                              <h4 className="text-xs font-bold text-purple-600 uppercase mb-1">Notas de compra</h4>
                              <p className="text-slate-700 bg-purple-50 p-2.5 rounded border border-purple-100">{peticion.notasCompra}</p>
                            </div>
                          )}
                          {peticion.notasRecepcion && (
                            <div>
                              <h4 className="text-xs font-bold text-green-600 uppercase mb-1">Notas de recepción</h4>
                              <p className="text-slate-700 bg-green-50 p-2.5 rounded border border-green-100">{peticion.notasRecepcion}</p>
                            </div>
                          )}
                          {peticion.motivoRechazo && (
                            <div>
                              <h4 className="text-xs font-bold text-red-600 uppercase mb-1">Motivo rechazo</h4>
                              <p className="text-slate-700 bg-red-50 p-2.5 rounded border border-red-100">{peticion.motivoRechazo}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(peticion.proveedor || peticion.costeEstimado !== null || peticion.costeFinal !== null) && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Datos económicos</h4>
                              <div className="space-y-1 text-sm">
                                {peticion.proveedor && <div className="flex justify-between"><span className="text-slate-500">Proveedor:</span><span className="font-medium">{peticion.proveedor}</span></div>}
                                {peticion.costeEstimado !== null && <div className="flex justify-between"><span className="text-slate-500">Estimado:</span><span className="font-medium">{Number(peticion.costeEstimado).toFixed(2)} €</span></div>}
                                {peticion.costeFinal !== null && <div className="flex justify-between"><span className="text-slate-500">Final:</span><span className="font-bold text-green-700">{Number(peticion.costeFinal).toFixed(2)} €</span></div>}
                                {peticion.numeroFactura && <div className="flex justify-between"><span className="text-slate-500">Factura:</span><span className="font-mono text-xs">{peticion.numeroFactura}</span></div>}
                              </div>
                            </div>
                          )}
                          {peticion.aprobadoPor && (
                            <div className="text-xs text-slate-500">
                              <span className="font-bold text-slate-600">Aprobada por:</span> {peticion.aprobadoPor.nombre} {peticion.aprobadoPor.apellidos}
                            </div>
                          )}
                          {peticion.recibidoPor && (
                            <div className="text-xs text-slate-500">
                              <span className="font-bold text-slate-600">Recibida por:</span> {peticion.recibidoPor.nombre} {peticion.recibidoPor.apellidos}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Historial compacto */}
                      {peticion.historial && peticion.historial.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><History size={12} /> Historial</h4>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {[...peticion.historial].reverse().map((h, i) => (
                              <div key={h.id} className="flex-shrink-0 bg-white border border-slate-200 rounded-lg p-2 text-xs min-w-[140px]">
                                <div className="font-bold text-slate-700">{h.estadoNuevo.replace('_', ' ').toUpperCase()}</div>
                                {h.comentario && <div className="text-slate-500 truncate max-w-[130px]">{h.comentario}</div>}
                                <div className="text-slate-400 mt-0.5">{h.usuario.nombre} · {formatearFecha(h.createdAt)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-500">
                {((pagina - 1) * POR_PAGINA) + 1}–{Math.min(pagina * POR_PAGINA, peticionesFiltradas.length)} de {peticionesFiltradas.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">← Ant.</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPagina(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${pagina === n ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}>{n}</button>
                ))}
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">Sig. →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ MODAL: NUEVA / EDITAR PETICIÓN ═══ */}
      {showNueva && (
        <Modal title={peticionEditando ? 'Editar Petición' : 'Nueva Petición de Material'}
          onClose={() => { setShowNueva(false); resetForm() }} size="lg" accentColor={accentColor}>
          <div className="space-y-5">
            {/* Área (solo visible si es logística / 'all') */}
            {areaOrigen === 'all' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Área solicitante *</label>
                <select value={formBase.areaOrigenForm}
                  onChange={e => setFormBase(prev => ({ ...prev, areaOrigenForm: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="">Seleccionar área...</option>
                  {Object.entries(AREAS_NOMBRE).map(([slug, nombre]) => (
                    <option key={slug} value={slug}>{nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista de artículos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Artículos *</label>
                {!peticionEditando && (
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Plus size={14} /> Añadir artículo
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-1">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input type="text" value={item.nombreArticulo}
                          onChange={e => updateItem(idx, 'nombreArticulo', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                          placeholder="Nombre del artículo *" />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input type="number" min={1} value={item.cantidad}
                          onChange={e => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white" />
                        <select value={item.unidad}
                          onChange={e => updateItem(idx, 'unidad', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white">
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    {items.length > 1 && !peticionEditando && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-1">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Prioridad + Motivo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
                <select value={formBase.prioridad}
                  onChange={e => setFormBase(prev => ({ ...prev, prioridad: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo *</label>
                <select value={formBase.motivo}
                  onChange={e => setFormBase(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  {MOTIVOS_PETICION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción / notas adicionales</label>
              <textarea value={formBase.descripcion}
                onChange={e => setFormBase(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                placeholder="Especificaciones, marca preferida, urgencia, para qué se usará..." />
            </div>

            <div className="flex gap-3 pt-2 border-t">
              <button onClick={() => { setShowNueva(false); resetForm() }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
                Cancelar
              </button>
              <button onClick={guardarPeticion}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2">
                {peticionEditando ? <Pencil size={16} /> : <Send size={16} />}
                {peticionEditando ? 'Guardar cambios' : 'Enviar petición'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ MODAL: DETALLE ═══ */}
      {showDetalle && (
        <Modal title={`Petición ${showDetalle.numero}`} onClose={() => setShowDetalle(null)} size="xl" accentColor={accentColor}>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Área: {AREAS_NOMBRE[showDetalle.areaOrigen] || showDetalle.areaOrigen}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${ESTADOS_PETICION[showDetalle.estado as keyof typeof ESTADOS_PETICION]?.color}`}>
                    {ESTADOS_PETICION[showDetalle.estado as keyof typeof ESTADOS_PETICION]?.label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORIDADES[showDetalle.prioridad as keyof typeof PRIORIDADES]?.color}`}>
                    {PRIORIDADES[showDetalle.prioridad as keyof typeof PRIORIDADES]?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Artículos */}
            {showDetalle.items.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Artículos solicitados</h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
                  <div className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-bold text-slate-400 uppercase">
                    <div className="col-span-2">Artículo</div><div>Cantidad</div><div>Recibido</div>
                  </div>
                  {showDetalle.items.map((item, idx) => (
                    <div key={item.id || idx} className="grid grid-cols-4 gap-2 px-3 py-2.5 text-sm">
                      <div className="col-span-2 font-medium text-slate-800">{item.nombreArticulo}</div>
                      <div className="text-slate-600">{item.cantidad} {item.unidad}</div>
                      <div>{item.cantidadRecibida !== null ? <span className="text-green-600 font-medium">{item.cantidadRecibida}</span> : <span className="text-slate-300">—</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Solicitante</p>
                <p className="font-medium">{showDetalle.solicitante.nombre} {showDetalle.solicitante.apellidos}</p>
                <p className="text-sm text-slate-500">{showDetalle.solicitante.numeroVoluntario}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Fechas</p>
                <p className="text-sm">Solicitud: {formatearFechaHora(showDetalle.fechaSolicitud)}</p>
                {showDetalle.fechaAprobacion && <p className="text-sm">Aprobación: {formatearFechaHora(showDetalle.fechaAprobacion)}</p>}
                {showDetalle.fechaRecepcion && <p className="text-sm text-green-600 font-medium">Recepción: {formatearFechaHora(showDetalle.fechaRecepcion)}</p>}
              </div>
            </div>

            {(showDetalle.proveedor || showDetalle.costeFinal !== null) && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Datos económicos</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {showDetalle.proveedor && <div><span className="text-slate-500">Proveedor:</span> <span className="font-medium">{showDetalle.proveedor}</span></div>}
                  {showDetalle.costeEstimado !== null && <div><span className="text-slate-500">Estimado:</span> <span className="font-medium">{Number(showDetalle.costeEstimado).toFixed(2)} €</span></div>}
                  {showDetalle.costeFinal !== null && <div><span className="text-slate-500">Final:</span> <span className="font-bold text-green-700">{Number(showDetalle.costeFinal).toFixed(2)} €</span></div>}
                  {showDetalle.numeroFactura && <div><span className="text-slate-500">Factura:</span> <span className="font-mono">{showDetalle.numeroFactura}</span></div>}
                  {showDetalle.numeroRc && <div><span className="text-slate-500">Nº RC:</span> <span className="font-mono">{showDetalle.numeroRc}</span></div>}
                  {showDetalle.numeroAlbaran && <div><span className="text-slate-500">Nº Albarán:</span> <span className="font-mono">{showDetalle.numeroAlbaran}</span></div>}
                </div>
              </div>
            )}

            {/* Historial */}
            <div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><History size={16} /> Historial</h4>
              <div className="space-y-2">
                {showDetalle.historial.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 text-sm">{h.estadoNuevo.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-xs text-slate-400">{formatearFechaHora(h.createdAt)}</span>
                      </div>
                      {h.comentario && <p className="text-sm text-slate-600 mt-1">{h.comentario}</p>}
                      <p className="text-xs text-slate-400 mt-1">Por: {h.usuario.nombre} {h.usuario.apellidos}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowDetalle(null)} className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium">Cerrar</button>
          </div>
        </Modal>
      )}

      {/* ═══ MODAL: ACCIÓN ═══ */}
      {showAccion && (
        <Modal
          title={
            showAccion.accion === 'aprobar' ? 'Aprobar Petición' :
            showAccion.accion === 'rechazar' ? 'Rechazar Petición' :
            showAccion.accion === 'en_compra' ? 'Pasar a Compra' : 'Recepcionar Material'
          }
          onClose={() => setShowAccion(null)} accentColor={accentColor}>
          <div className="space-y-4">
            {/* Resumen petición */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">{showAccion.peticion.numero} · {AREAS_NOMBRE[showAccion.peticion.areaOrigen] || showAccion.peticion.areaOrigen}</p>
              {showAccion.peticion.items.length > 0 ? (
                <div className="space-y-1">
                  {showAccion.peticion.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-medium text-slate-800">{item.nombreArticulo}</span>
                      <span className="text-slate-500">{item.cantidad} {item.unidad}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-medium text-slate-800">{showAccion.peticion.nombreArticulo} <span className="text-slate-400">× {showAccion.peticion.cantidad} {showAccion.peticion.unidad}</span></p>
              )}
            </div>

            {/* Campos específicos por acción */}
            {showAccion.accion === 'aprobar' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº RC</label>
                  <input type="text" value={accionForm.numeroRc} onChange={e => setAccionForm(prev => ({ ...prev, numeroRc: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="RC-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL del documento RC</label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                    <span className="bg-slate-50 flex items-center px-3 border-r border-slate-200 text-slate-400"><FileText size={16} /></span>
                    <input type="url" value={accionForm.urlRc} onChange={e => setAccionForm(prev => ({ ...prev, urlRc: e.target.value }))}
                      className="w-full p-2.5 text-sm outline-none" placeholder="https://..." />
                  </div>
                </div>
              </div>
            )}

            {showAccion.accion === 'en_compra' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor *</label>
                  <input type="text" value={accionForm.proveedor} onChange={e => setAccionForm(prev => ({ ...prev, proveedor: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Nombre del proveedor" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coste estimado (€)</label>
                    <input type="number" step="0.01" min="0" value={accionForm.costeEstimado}
                      onChange={e => setAccionForm(prev => ({ ...prev, costeEstimado: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº RC (si no se adjuntó antes)</label>
                    <input type="text" value={accionForm.numeroRc} onChange={e => setAccionForm(prev => ({ ...prev, numeroRc: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                  </div>
                </div>
              </>
            )}

            {showAccion.accion === 'recibir' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Albarán *</label>
                    <input type="text" value={accionForm.numeroAlbaran}
                      onChange={e => setAccionForm(prev => ({ ...prev, numeroAlbaran: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="ALB-2026-001" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Factura</label>
                    <input type="text" value={accionForm.numeroFactura}
                      onChange={e => setAccionForm(prev => ({ ...prev, numeroFactura: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coste final (€)</label>
                    <input type="number" step="0.01" min="0" value={accionForm.costeFinal}
                      onChange={e => setAccionForm(prev => ({ ...prev, costeFinal: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Albarán (opcional)</label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      <span className="bg-slate-50 flex items-center px-3 border-r border-slate-200 text-slate-400"><FileCheck size={16} /></span>
                      <input type="url" value={accionForm.urlAlbaran} onChange={e => setAccionForm(prev => ({ ...prev, urlAlbaran: e.target.value }))}
                        className="w-full p-2.5 text-sm outline-none" placeholder="https://..." />
                    </div>
                  </div>
                </div>
                {/* Info actualización stock */}
                {showAccion.peticion.items.some(i => i.articuloId) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">
                    ✓ Al recepcionar, se actualizará el stock de los artículos vinculados al inventario
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {showAccion.accion === 'rechazar' ? 'Motivo del rechazo *' : 'Comentario / notas'}
              </label>
              <textarea value={accionForm.comentario} onChange={e => setAccionForm(prev => ({ ...prev, comentario: e.target.value }))}
                rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAccion(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium">Cancelar</button>
              <button onClick={ejecutarAccion}
                className={`flex-1 py-2.5 text-white rounded-lg font-medium ${showAccion.accion === 'rechazar' ? 'bg-red-500 hover:bg-red-600' : showAccion.accion === 'aprobar' ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'}`}>
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// Sub-componente para popup de documento
// ──────────────────────────────────────────
function DocPopup({ label, icon, color, align = 'left', onSave, onCancel }: {
  label: string; icon: React.ReactNode; color: 'blue' | 'green'
  align?: 'left' | 'right'
  onSave: (url: string, numero: string) => void
  onCancel: () => void
}) {
  const [url, setUrl] = useState('')
  const [numero, setNumero] = useState('')
  const borderColor = color === 'blue' ? 'border-blue-200' : 'border-green-200'
  const textColor = color === 'blue' ? 'text-blue-700' : 'text-green-700'
  const btnColor = color === 'blue' ? 'bg-blue-600' : 'bg-green-600'
  const posClass = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <div className={`absolute top-6 ${posClass} z-50 bg-white border ${borderColor} rounded-xl shadow-xl p-3 w-72`}>
      <p className={`text-xs font-bold ${textColor} mb-2 flex items-center gap-1`}>{icon} {label}</p>
      <input type="text" value={numero} onChange={e => setNumero(e.target.value)}
        className="w-full text-xs p-2 border border-slate-200 rounded-lg mb-1.5 focus:ring-2 focus:ring-blue-400 outline-none"
        placeholder="Número (ej: RC-2026-001)" />
      <input type="url" value={url} onChange={e => setUrl(e.target.value)}
        className="w-full text-xs p-2 border border-slate-200 rounded-lg mb-2 focus:ring-2 focus:ring-blue-400 outline-none"
        placeholder="URL del documento (opcional)" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 text-xs py-1.5 border border-slate-200 rounded-lg text-slate-500">Cancelar</button>
        <button onClick={() => onSave(url, numero)} className={`flex-1 text-xs py-1.5 ${btnColor} text-white rounded-lg font-semibold`}>Guardar</button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Componente MovimientosTab reutilizable
// ──────────────────────────────────────────
export function MovimientosTab({ inventario }: { inventario: string }) {
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = inventario !== 'all' ? `?inventario=${inventario}` : ''
      const r = await fetch(`/api/logistica/movimiento${params}`)
      const d = await r.json()
      setMovimientos(d.movimientos || [])
    } catch { /* silenciado */ }
    finally { setLoading(false) }
  }, [inventario])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <div className="py-12 text-center text-slate-400">Cargando...</div>

  if (movimientos.length === 0) return (
    <div className="py-16 text-center text-slate-400">
      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No hay movimientos registrados</p>
      <p className="text-sm mt-1">Los movimientos se registran automáticamente al recepcionar peticiones</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {movimientos.map((mov: any) => (
        <div key={mov.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-600' : mov.tipo === 'salida' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {mov.tipo === 'entrada' ? <TrendingUp size={20} /> : mov.tipo === 'salida' ? <TrendingDown size={20} /> : <BarChart3 size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-800 truncate">{mov.articulo?.nombre || '—'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' : mov.tipo === 'salida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {mov.tipo === 'entrada' ? '+' : mov.tipo === 'salida' ? '-' : '≈'}{mov.cantidad}
              </span>
            </div>
            <p className="text-sm text-slate-500 truncate">{mov.motivo}</p>
            {mov.notas && <p className="text-xs text-slate-400 truncate">{mov.notas}</p>}
          </div>
          <div className="text-right text-sm flex-shrink-0">
            <p className="text-slate-600">{mov.usuario?.nombre} {mov.usuario?.apellidos}</p>
            <p className="text-slate-400 text-xs">{formatearFechaHora(mov.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
