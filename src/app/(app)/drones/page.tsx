'use client'
import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Check, ClipboardList, 
  Drone, Plus, RefreshCw, Battery, User, Map, FileText, 
  Wrench, AlertTriangle, CheckCircle2, Clock, Calendar,
  Shield, Radio, Wind, Eye, CloudRain, Navigation,
  Download, Edit, Trash2, ChevronRight, Info,
  Zap, Target, Activity, BarChart3, Save, X,
  MapPin, Layers, Bell, BookOpen, Settings
} from 'lucide-react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false })
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false })

// ─── Interfaces ───────────────────────────────────────────────
interface Drone { id: string; codigo: string; nombre: string; marca: string; modelo: string; numeroSerie?: string; matriculaAESA?: string; categoria: string; pesoMaxDespegue?: number; estado: string; horasVuelo: number; fechaCompra?: string; fechaUltimaRevision?: string; observaciones?: string; baterias?: Bateria[]; mantenimientos?: Mantenimiento[]; _count?: { vuelos: number } }
interface Bateria { id: string; droneId: string; codigo: string; capacidadMah?: number; ciclosActuales: number; ciclosMaximos: number; estado: string; observaciones?: string }
interface Piloto { id: string; usuarioId?: string; nombre: string; apellidos: string; email?: string; telefono?: string; externo: boolean; certificaciones: any; seguroRCNumero?: string; seguroRCVigencia?: string; activo: boolean; observaciones?: string }
interface Vuelo { id: string; numero: string; droneId: string; pilotoId: string; fecha: string; horaInicio?: string; horaFin?: string; duracionMinutos?: number; tipoOperacion: string; municipio: string; descripcionZona?: string; latitudInicio?: number; longitudInicio?: number; alturaMaxima?: number; condicionesMeteo: any; notamConsultado: boolean; notamReferencia?: string; incidencias?: string; observaciones?: string; estado: string; drone?: any; piloto?: any; checklist?: any }
interface Mantenimiento { id: string; droneId: string; tipo: string; descripcion: string; fecha: string; horasEnElMomento?: number; realizadoPor?: string; coste?: number; piezasSustituidas?: string; proximoMantenimiento?: string; observaciones?: string; drone?: any }
interface Notam { id: string; referencia?: string; tipo?: string; estado?: string; servicio?: string; icao?: string; descripcionHtml?: string; geoJson?: any; atributosRaw?: any; fechaInicio?: string; fechaFin?: string; alturaMin?: number; alturaMax?: number; radio?: number; latitud?: number; longitud?: number; descripcion?: string; activo: boolean; fuente: string }
interface Zona { id: string; nombre: string; descripcion?: string; tipo: string; coordenadas: number[][]; alturaMaxima?: number; radio?: number; activa: boolean }
interface Stats { totalDrones: number; dronesOperativos: number; totalPilotos: number; vuelosMes: number; totalVuelos: number; horasTotales: number; bateriasAlerta: number; mantPendientes: number }

const TIPO_OPERACION: Record<string, string> = { reconocimiento: 'Reconocimiento', emergencia: 'Emergencia', busqueda: 'Búsqueda y rescate', inspeccion: 'Inspección', otro: 'Otro' }
const ESTADO_VUELO: Record<string, { color: string; label: string }> = {
  planificado: { color: 'bg-blue-100 text-blue-700', label: 'Planificado' },
  en_curso: { color: 'bg-yellow-100 text-yellow-700', label: 'En curso' },
  completado: { color: 'bg-green-100 text-green-700', label: 'Completado' },
  cancelado: { color: 'bg-slate-100 text-slate-500', label: 'Cancelado' },
  incidencia: { color: 'bg-red-100 text-red-700', label: 'Incidencia' }
}
const ESTADO_DRONE: Record<string, { color: string; label: string }> = {
  operativo: { color: 'bg-green-100 text-green-700', label: 'Operativo' },
  mantenimiento: { color: 'bg-yellow-100 text-yellow-700', label: 'En mantenimiento' },
  baja: { color: 'bg-red-100 text-red-700', label: 'Baja' }
}
const TIPO_MANT: Record<string, string> = {
  revision_preoperacional: 'Rev. Preoperacional',
  revision_100h: 'Revisión 100h',
  revision_anual: 'Revisión anual',
  reparacion: 'Reparación',
  actualizacion_fw: 'Actualización firmware'
}
const ZONA_COLOR: Record<string, string> = {
  habitual: '#3b82f6',
  restringida: '#ef4444',
  peligro: '#f97316',
  informacion: '#8b5cf6'
}

export default function DronesPage() {
  const [tab, setTab] = useState<'dashboard' | 'flota' | 'pilotos' | 'operaciones' | 'mantenimiento' | 'mapa' | 'checklist'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Datos
  const [stats, setStats] = useState<Stats | null>(null)
  const [drones, setDrones] = useState<Drone[]>([])
  const [pilotos, setPilotos] = useState<Piloto[]>([])
  const [vuelos, setVuelos] = useState<Vuelo[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [notams, setNotams] = useState<Notam[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])

  // Selección
  const [droneSeleccionado, setDroneSeleccionado] = useState<Drone | null>(null)
  const [vueloSeleccionado, setVueloSeleccionado] = useState<Vuelo | null>(null)
  const [checklistData, setChecklistData] = useState<any>(null)
  // Estados checklist pre-vuelo
  const [checks, setChecks] = React.useState<Record<string, Record<string, boolean | null>>>({})
  const [notasCheck, setNotasCheck] = React.useState('')
  const [piloCheck, setPiloCheck] = React.useState('')
  const [droneCheck, setDroneCheck] = React.useState('')

  // Modales
  const [showNuevoDrone, setShowNuevoDrone] = useState(false)
  const [showEditarDrone, setShowEditarDrone] = useState(false)
  const [showNuevoPiloto, setShowNuevoPiloto] = useState(false)
  const [showNuevoVuelo, setShowNuevoVuelo] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showDetalleVuelo, setShowDetalleVuelo] = useState(false)
  const [showNuevoMant, setShowNuevoMant] = useState(false)
  const [showNuevaBateria, setShowNuevaBateria] = useState(false)
  const [showNotamManual, setShowNotamManual] = useState(false)

  // Filtros
  const [filtroEstadoDrone, setFiltroEstadoDrone] = useState('todos')
  const [filtroEstadoVuelo, setFiltroEstadoVuelo] = useState('todos')
  const [cargandoNotams, setCargandoNotams] = useState(false)
  const [notamSeleccionado, setNotamSeleccionado] = useState<any>(null)
  const [avisoNotam, setAvisoNotam] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const [statsR, dronesR, pilotosR, vuelosR, mantR, notamsR, zonasR] = await Promise.all([
        fetch('/api/drones?tipo=stats'),
        fetch('/api/drones?tipo=drones'),
        fetch('/api/drones?tipo=pilotos'),
        fetch('/api/drones?tipo=vuelos'),
        fetch('/api/drones?tipo=mantenimientos'),
        fetch('/api/drones?tipo=notams'),
        fetch('/api/drones?tipo=zonas')
      ])
      const [sd, dd, pd, vd, md, nd, zd] = await Promise.all([
        statsR.json(), dronesR.json(), pilotosR.json(), vuelosR.json(), mantR.json(), notamsR.json(), zonasR.json()
      ])
      setStats(sd)
      setDrones(dd.drones || [])
      setPilotos(pd.pilotos || [])
      setVuelos(vd.vuelos || [])
      setMantenimientos(md.mantenimientos || [])
      setNotams(nd.notams || [])
      setZonas(zd.zonas || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const consultarNotamsENAIRE = async () => {
    setCargandoNotams(true)
    setAvisoNotam(null)
    try {
      const r = await fetch('/api/drones/notams-proxy?lat=37.3710&lon=-6.0719&radius=30')
      if (r.ok) {
        const data = await r.json()
        setNotams(data.notams || [])
        if (data.aviso) setAvisoNotam(data.aviso)
        if (data.total === 0) setAvisoNotam('No hay NOTAMs activos en el área de Bormujos (30km)')
      } else { setAvisoNotam('No se pudo conectar con ENAIRE') }
    } catch { setAvisoNotam('Error consultando NOTAMs de ENAIRE') }
    finally { setCargandoNotams(false) }
  }

  const handleNuevoDrone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      setSaving(true)
      const r = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'drone', codigo: f.get('codigo'), nombre: f.get('nombre'), marca: f.get('marca'), modelo: f.get('modelo'), numeroSerie: f.get('numeroSerie'), matriculaAESA: f.get('matriculaAESA'), categoria: f.get('categoria'), pesoMaxDespegue: f.get('pesoMaxDespegue'), estado: f.get('estado'), fechaCompra: f.get('fechaCompra'), observaciones: f.get('observaciones') }) })
      if (r.ok) { setShowNuevoDrone(false); cargarDatos() }
    } finally { setSaving(false) }
  }

  const handleEditarDrone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!droneSeleccionado) return
    const f = new FormData(e.currentTarget)
    try {
      setSaving(true)
      const r = await fetch('/api/drones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'drone', id: droneSeleccionado.id, codigo: f.get('codigo'), nombre: f.get('nombre'), marca: f.get('marca'), modelo: f.get('modelo'), numeroSerie: f.get('numeroSerie'), matriculaAESA: f.get('matriculaAESA'), categoria: f.get('categoria'), pesoMaxDespegue: f.get('pesoMaxDespegue'), estado: f.get('estado'), fechaCompra: f.get('fechaCompra'), observaciones: f.get('observaciones') }) })
      if (r.ok) { setShowEditarDrone(false); setDroneSeleccionado(null); cargarDatos() }
    } finally { setSaving(false) }
  }

  const handleNuevoPiloto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      setSaving(true)
      const certs: any = {}
      if (f.get('a1a3Num')) certs.A1A3 = { numero: f.get('a1a3Num'), caducidad: f.get('a1a3Cad') }
      if (f.get('a2Num')) certs.A2 = { numero: f.get('a2Num'), caducidad: f.get('a2Cad') }
      if (f.get('sts01Num')) certs.STS01 = { numero: f.get('sts01Num'), caducidad: f.get('sts01Cad') }
      if (f.get('sts02Num')) certs.STS02 = { numero: f.get('sts02Num'), caducidad: f.get('sts02Cad') }
      const r = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'piloto', nombre: f.get('nombre'), apellidos: f.get('apellidos'), email: f.get('email'), telefono: f.get('telefono'), externo: f.get('externo') === 'true', certificaciones: certs, seguroRCNumero: f.get('seguroRCNumero'), seguroRCVigencia: f.get('seguroRCVigencia'), observaciones: f.get('observaciones') }) })
      if (r.ok) { setShowNuevoPiloto(false); cargarDatos() }
    } finally { setSaving(false) }
  }

  const handleNuevoVuelo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      setSaving(true)
      const meteo = { viento: f.get('viento'), visibilidad: f.get('visibilidad'), nubes: f.get('nubes'), temperatura: f.get('temperatura'), condicion: f.get('condicion') }
      const r = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'vuelo', droneId: f.get('droneId'), pilotoId: f.get('pilotoId'), fecha: f.get('fecha'), horaInicio: f.get('horaInicio'), tipoOperacion: f.get('tipoOperacion'), municipio: f.get('municipio') || 'Bormujos', descripcionZona: f.get('descripcionZona'), latitudInicio: f.get('latitudInicio'), longitudInicio: f.get('longitudInicio'), alturaMaxima: f.get('alturaMaxima'), condicionesMeteo: meteo, notamConsultado: f.get('notamConsultado') === 'on', notamReferencia: f.get('notamReferencia'), observaciones: f.get('observaciones'), estado: 'planificado' }) })
      if (r.ok) { setShowNuevoVuelo(false); cargarDatos() }
    } finally { setSaving(false) }
  }

  const handleGuardarChecklist = async () => {
    if (!vueloSeleccionado || !checklistData) return
    try {
      setSaving(true)
      const todosOk = Object.values(checklistData.items as Record<string, any[]>).flat().every((item: any) => item.ok || item.naAplicable)
      const r = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'checklist', vueloId: vueloSeleccionado.id, items: checklistData.items, completado: todosOk, firmadoPor: checklistData.firmadoPor, observaciones: checklistData.observaciones }) })
      if (r.ok) { setShowChecklist(false); cargarDatos() }
    } finally { setSaving(false) }
  }

  const handleNuevoMant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      setSaving(true)
      const r = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'mantenimiento', droneId: f.get('droneId'), tipoMant: f.get('tipoMant'), descripcion: f.get('descripcion'), fecha: f.get('fecha'), horasEnElMomento: f.get('horasEnElMomento'), realizadoPor: f.get('realizadoPor'), coste: f.get('coste'), piezasSustituidas: f.get('piezasSustituidas'), proximoMantenimiento: f.get('proximoMantenimiento'), observaciones: f.get('observaciones') }) })
      if (r.ok) { setShowNuevoMant(false); cargarDatos() }
    } finally { setSaving(false) }
  }

  const formatFecha = (s?: string) => s ? new Date(s).toLocaleDateString('es-ES') : '-'
  const formatHoras = (min?: number) => min ? `${Math.floor(min / 60)}h ${min % 60}m` : '-'
  const pctBateria = (b: Bateria) => Math.round((b.ciclosActuales / b.ciclosMaximos) * 100)

  const dronesF = drones.filter(d => filtroEstadoDrone === 'todos' || d.estado === filtroEstadoDrone)
  const vuelosF = vuelos.filter(v => filtroEstadoVuelo === 'todos' || v.estado === filtroEstadoVuelo)

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase mb-1'
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'flota', label: 'Flota', icon: Drone },
    { id: 'pilotos', label: 'Pilotos', icon: User },
    { id: 'operaciones', label: 'Operaciones', icon: BookOpen },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
    { id: 'mapa', label: 'Mapa de Vuelo', icon: Map },
    { id: 'checklist', label: 'Check Pre-Vuelo', icon: ClipboardList }
  ] as const

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 rounded-xl"><Drone className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Drones — RPAS</h1>
            <p className="text-sm text-slate-500">Gestión operativa de aeronaves no tripuladas · Protección Civil Bormujos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargarDatos} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"><RefreshCw size={16} /></button>
          <button onClick={() => setShowNuevoVuelo(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg"><Plus size={16} />Nuevo Vuelo</button>
          <button onClick={() => setShowNuevoDrone(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg"><Drone size={16} />Añadir Drone</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Drones operativos', value: `${stats?.dronesOperativos ?? 0}/${stats?.totalDrones ?? 0}`, icon: Drone, color: 'text-purple-600' },
          { label: 'Vuelos este mes', value: stats?.vuelosMes ?? 0, icon: Activity, color: 'text-blue-600' },
          { label: 'Horas de vuelo', value: `${stats?.horasTotales ?? 0}h`, icon: Clock, color: 'text-green-600' },
          { label: 'Alertas', value: (stats?.bateriasAlerta ?? 0) + (stats?.mantPendientes ?? 0), icon: AlertTriangle, color: 'text-red-500' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-medium">{s.label}</p><p className="text-3xl font-black text-slate-900 mt-1">{s.value}</p></div>
            <s.icon className={`w-8 h-8 ${s.color}`} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === t.id ? 'bg-white border border-b-white border-slate-200 text-purple-700 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ─── DASHBOARD ─── */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Flota resumen */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Drone className="w-4 h-4 text-purple-600" />Estado de la flota</h3>
            <div className="space-y-3">
              {drones.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${d.estado === 'operativo' ? 'bg-green-500' : d.estado === 'mantenimiento' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{d.codigo}</p>
                      <p className="text-xs text-slate-500">{d.marca} {d.modelo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{d.horasVuelo}h</p>
                    <p className="text-xs text-slate-400">{d._count?.vuelos ?? 0} vuelos</p>
                  </div>
                </div>
              ))}
              {drones.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin drones registrados</p>}
            </div>
          </div>
          {/* Últimos vuelos */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" />Últimas operaciones</h3>
            <div className="space-y-2">
              {vuelos.slice(0, 6).map(v => (
                <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => { setVueloSeleccionado(v); setShowDetalleVuelo(true) }}>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{v.numero}</p>
                    <p className="text-xs text-slate-500">{TIPO_OPERACION[v.tipoOperacion]} · {formatFecha(v.fecha)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_VUELO[v.estado]?.color}`}>{ESTADO_VUELO[v.estado]?.label}</span>
                </div>
              ))}
              {vuelos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin vuelos registrados</p>}
            </div>
          </div>
          {/* Alertas mantenimiento */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Alertas y pendientes</h3>
            <div className="space-y-2">
              {drones.filter(d => d.estado === 'mantenimiento').map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2.5 bg-yellow-50 rounded-lg">
                  <AlertTriangle size={14} className="text-yellow-600" />
                  <span className="text-xs text-yellow-800 font-medium">{d.codigo} — En mantenimiento</span>
                </div>
              ))}
              {mantenimientos.filter(m => m.proximoMantenimiento && new Date(m.proximoMantenimiento) <= new Date()).map(m => (
                <div key={m.id} className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg">
                  <Wrench size={14} className="text-red-600" />
                  <span className="text-xs text-red-800 font-medium">{m.drone?.codigo} — {TIPO_MANT[m.tipo]} vencido</span>
                </div>
              ))}
              {drones.flatMap(d => d.baterias || []).filter(b => b.estado === 'degradada').map(b => (
                <div key={b.id} className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-lg">
                  <Battery size={14} className="text-orange-600" />
                  <span className="text-xs text-orange-800 font-medium">Batería {b.codigo} degradada ({b.ciclosActuales}/{b.ciclosMaximos} ciclos)</span>
                </div>
              ))}
              {stats?.bateriasAlerta === 0 && stats?.mantPendientes === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin alertas activas</p>}
            </div>
          </div>
          {/* Pilotos y certificaciones */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><User className="w-4 h-4 text-green-600" />Pilotos activos ({stats?.totalPilotos ?? 0})</h3>
            <div className="space-y-2">
              {pilotos.map(p => {
                const certs = p.certificaciones || {}
                const segVence = p.seguroRCVigencia ? new Date(p.seguroRCVigencia) < new Date() : false
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.nombre} {p.apellidos}</p>
                      <div className="flex gap-1 mt-0.5">
                        {Object.keys(certs).map(c => <span key={c} className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{c}</span>)}
                        {p.externo && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">EXT</span>}
                      </div>
                    </div>
                    {segVence && <span title="Seguro RC vencido"><AlertTriangle size={14} className="text-red-500" /></span>}
                  </div>
                )
              })}
              {pilotos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin pilotos registrados</p>}
            </div>
          </div>
        </div>
      )}

      {/* ─── FLOTA ─── */}
      {tab === 'flota' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {['todos', 'operativo', 'mantenimiento', 'baja'].map(e => (
              <button key={e} onClick={() => setFiltroEstadoDrone(e)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filtroEstadoDrone === e ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {e === 'todos' ? 'Todos' : ESTADO_DRONE[e]?.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {dronesF.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl"><Drone className="w-5 h-5 text-purple-600" /></div>
                    <div>
                      <p className="font-bold text-slate-900">{d.codigo}</p>
                      <p className="text-sm text-slate-500">{d.marca} {d.modelo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ESTADO_DRONE[d.estado]?.color}`}>{ESTADO_DRONE[d.estado]?.label}</span>
                    <button onClick={() => { setDroneSeleccionado(d); setShowEditarDrone(true) }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-black text-slate-800">{d.horasVuelo}h</p><p className="text-[10px] text-slate-500">Horas vuelo</p></div>
                  <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-black text-slate-800">{d._count?.vuelos ?? 0}</p><p className="text-[10px] text-slate-500">Vuelos</p></div>
                  <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-black text-slate-800">{d.categoria}</p><p className="text-[10px] text-slate-500">Categoría</p></div>
                </div>
                {d.matriculaAESA && <p className="text-xs text-slate-500">Matrícula AESA: <span className="font-bold text-slate-700">{d.matriculaAESA}</span></p>}
                {/* Baterías */}
                {(d.baterias || []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Baterías</p>
                    <div className="space-y-1.5">
                      {(d.baterias || []).map(b => (
                        <div key={b.id} className="flex items-center gap-2">
                          <Battery size={12} className={b.estado === 'ok' ? 'text-green-500' : b.estado === 'degradada' ? 'text-yellow-500' : 'text-red-500'} />
                          <span className="text-xs font-medium text-slate-700">{b.codigo}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${100 - pctBateria(b) < 50 ? 'bg-green-400' : 'bg-yellow-400'}`} style={{ width: `${100 - pctBateria(b)}%` }} /></div>
                          <span className="text-[10px] text-slate-500">{b.ciclosActuales}/{b.ciclosMaximos}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { setDroneSeleccionado(d); setShowNuevaBateria(true) }} className="w-full text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center justify-center gap-1 py-1.5 border border-dashed border-purple-200 rounded-lg hover:bg-purple-50">
                  <Plus size={12} />Añadir batería
                </button>
              </div>
            ))}
            {dronesF.length === 0 && <div className="col-span-2 text-center py-12 text-slate-400">No hay drones que mostrar</div>}
          </div>
        </div>
      )}

      {/* ─── PILOTOS ─── */}
      {tab === 'pilotos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{pilotos.length} pilotos activos</p>
            <button onClick={() => setShowNuevoPiloto(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700"><Plus size={14} />Nuevo piloto</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {pilotos.map(p => {
              const certs = p.certificaciones || {}
              const segVence = p.seguroRCVigencia ? new Date(p.seguroRCVigencia) < new Date() : false
              return (
                <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-700">{p.nombre[0]}{p.apellidos[0]}</div>
                      <div>
                        <p className="font-bold text-slate-900">{p.nombre} {p.apellidos}</p>
                        <p className="text-xs text-slate-500">{p.externo ? '🔗 Piloto externo' : '👮 Voluntario PC'}</p>
                      </div>
                    </div>
                    {segVence && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Seguro vencido</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(certs).map(([cert, data]: [string, any]) => (
                      <div key={cert} className="flex flex-col items-center bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] font-black text-purple-700">{cert}</span>
                        {data?.numero && <span className="text-[9px] text-purple-500">{data.numero}</span>}
                        {data?.caducidad && <span className={`text-[9px] font-medium ${new Date(data.caducidad) < new Date() ? 'text-red-500' : 'text-slate-500'}`}>Cad: {formatFecha(data.caducidad)}</span>}
                      </div>
                    ))}
                    {Object.keys(certs).length === 0 && <span className="text-xs text-slate-400 italic">Sin certificaciones registradas</span>}
                  </div>
                  {p.seguroRCNumero && <p className="text-xs text-slate-500">Seguro RC: <span className="font-semibold">{p.seguroRCNumero}</span> · Vigencia: {formatFecha(p.seguroRCVigencia)}</p>}
                  {p.email && <p className="text-xs text-slate-400">{p.email} {p.telefono && `· ${p.telefono}`}</p>}
                </div>
              )
            })}
            {pilotos.length === 0 && <div className="col-span-2 text-center py-12 text-slate-400">No hay pilotos registrados</div>}
          </div>
        </div>
      )}

      {/* ─── OPERACIONES ─── */}
      {tab === 'operaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['todos', 'planificado', 'en_curso', 'completado', 'incidencia'].map(e => (
                <button key={e} onClick={() => setFiltroEstadoVuelo(e)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filtroEstadoVuelo === e ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {e === 'todos' ? 'Todos' : ESTADO_VUELO[e]?.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Download size={14} />Exportar libro vuelos</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Nº Vuelo', 'Fecha', 'Drone', 'Piloto', 'Tipo', 'Duración', 'Estado', 'Checklist', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {vuelosF.map(v => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-purple-700">{v.numero}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatFecha(v.fecha)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{v.drone?.codigo}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.piloto?.nombre} {v.piloto?.apellidos}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{TIPO_OPERACION[v.tipoOperacion]}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.duracionMinutos ? formatHoras(v.duracionMinutos) : '-'}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_VUELO[v.estado]?.color}`}>{ESTADO_VUELO[v.estado]?.label}</span></td>
                    <td className="px-4 py-3">{v.checklist?.completado ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertTriangle size={14} className="text-yellow-500" />}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setVueloSeleccionado(v); setShowDetalleVuelo(true) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400"><Eye size={13} /></button>
                        <button onClick={() => { setVueloSeleccionado(v); setChecklistData(v.checklist || { items: {}, firmadoPor: '', observaciones: '' }); setShowChecklist(true) }} className="p-1.5 hover:bg-purple-50 rounded text-purple-400" title="Checklist pre-vuelo"><CheckCircle2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vuelosF.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-slate-400">No hay vuelos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MANTENIMIENTO ─── */}
      {tab === 'mantenimiento' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{mantenimientos.length} registros de mantenimiento</p>
            <button onClick={() => setShowNuevoMant(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700"><Plus size={14} />Registrar mantenimiento</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Drone', 'Tipo', 'Fecha', 'Horas', 'Realizado por', 'Coste', 'Próximo', 'Observaciones'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {mantenimientos.map(m => {
                  const vencido = m.proximoMantenimiento && new Date(m.proximoMantenimiento) <= new Date()
                  return (
                    <tr key={m.id} className={`border-b border-slate-50 hover:bg-slate-50 ${vencido ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 text-xs font-bold text-purple-700">{m.drone?.codigo}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700">{TIPO_MANT[m.tipo] || m.tipo}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{formatFecha(m.fecha)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{m.horasEnElMomento ?? '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{m.realizadoPor || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{m.coste ? `${m.coste}€` : '-'}</td>
                      <td className="px-4 py-3 text-xs"><span className={vencido ? 'text-red-600 font-bold' : 'text-slate-600'}>{formatFecha(m.proximoMantenimiento)}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{m.observaciones || '-'}</td>
                    </tr>
                  )
                })}
                {mantenimientos.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-slate-400">Sin registros de mantenimiento</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MAPA ─── */}
      {tab === 'mapa' && (
        <div className="space-y-4">
          {/* Cabecera con leyenda y acciones */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Mapa operativo de vuelo</h3>
              <p className="text-xs text-slate-500">Zonas configuradas · NOTAMs activos ENAIRE · Vuelos registrados</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                {Object.entries(ZONA_COLOR).map(([tipo, color]) => (
                  <span key={tipo} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />NOTAM
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />Vuelo reg.
                </span>
              </div>
              <button
                onClick={consultarNotamsENAIRE}
                disabled={cargandoNotams}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {cargandoNotams ? <><RefreshCw size={12} className="animate-spin" />Consultando...</> : <><RefreshCw size={12} />Actualizar NOTAMs</>}
              </button>
            </div>
          </div>

          {/* Mapa ancho completo */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div style={{ height: '500px' }}>
              <MapContainer center={[37.3710, -6.0719]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                {/* Radio operativo 30km */}
                <Circle center={[37.3710, -6.0719]} radius={30000} pathOptions={{ color: '#94a3b8', fillOpacity: 0.03, weight: 1.5, dashArray: '8 5' }} />
                {/* Base Bormujos */}
                <Circle center={[37.3710, -6.0719]} radius={500} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.7, weight: 2 }}>
                  <Popup><strong>Bormujos</strong><br />Base Protección Civil</Popup>
                </Circle>
                {/* Zonas configuradas */}
                {zonas.map(z => z.coordenadas && z.coordenadas.length > 0 ? (
                  <Polygon key={z.id} positions={z.coordenadas as any} pathOptions={{ color: ZONA_COLOR[z.tipo] || '#6b7280', fillOpacity: 0.18, weight: 2 }}>
                    <Popup>
                      <strong>{z.nombre}</strong><br />
                      <span style={{fontSize:'11px',color:'#6b7280'}}>Tipo: {z.tipo}</span>
                      {z.descripcion && <><br /><span style={{fontSize:'11px'}}>{z.descripcion}</span></>}
                      {z.alturaMaxima && <><br /><span style={{fontSize:'11px',color:'#ea580c'}}>Alt. máx: {z.alturaMaxima} m</span></>}
                    </Popup>
                  </Polygon>
                ) : null)}
                {/* NOTAMs ENAIRE */}
                {notams.filter(n => n.latitud && n.longitud).map(n => {
                  const hoy = n.fechaFin && new Date(n.fechaFin) < new Date(Date.now() + 24*3600*1000)
                  const sel = notamSeleccionado?.id === n.id
                  const color = sel ? '#7c3aed' : hoy ? '#f59e0b' : '#ef4444'
                  return (
                    <Circle
                      key={n.id}
                      center={[n.latitud!, n.longitud!]}
                      radius={(n.radio || 8) * 1000}
                      pathOptions={{ color, fillColor: color, fillOpacity: sel ? 0.22 : 0.1, weight: sel ? 2.5 : 1.5 }}
                      eventHandlers={{ click: () => setNotamSeleccionado(sel ? null : n) }}
                    >
                      <Popup>
                        <div style={{minWidth:'180px'}}>
                          <p style={{fontWeight:'bold',marginBottom:'4px'}}>{n.referencia || 'NOTAM'}</p>
                          {n.fechaFin && <p style={{fontSize:'11px',color:'#6b7280'}}>Hasta: {new Date(n.fechaFin).toLocaleDateString('es-ES')}</p>}
                          {n.alturaMax != null && <p style={{fontSize:'11px',color:'#ea580c'}}>Alt. máx: {n.alturaMax} ft</p>}
                        </div>
                      </Popup>
                    </Circle>
                  )
                })}
                {/* Vuelos registrados */}
                {vuelos.filter(v => v.latitudInicio && v.longitudInicio).map(v => (
                  <Marker key={v.id} position={[v.latitudInicio!, v.longitudInicio!] as [number, number]}>
                    <Popup>
                      <strong>{v.numero}</strong><br />
                      <span style={{fontSize:'11px',color:'#6b7280'}}>{TIPO_OPERACION[v.tipoOperacion]}</span><br />
                      <span style={{fontSize:'11px'}}>{formatFecha(v.fecha)}</span>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Panel detalle NOTAM seleccionado */}
          {notamSeleccionado && (() => {
            const n = notamSeleccionado
            const rawDesc = (n.descripcionHtml || n.descripcion || '')
            const descLimpia = rawDesc.replace(/<br\s*\/?>/gi, ' | ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim()
            const partes = descLimpia.split(' | ').map((s: string) => s.trim()).filter(Boolean)
            const findPart = (key: string) => { const p = partes.find((s: string) => s.toUpperCase().startsWith(key.toUpperCase() + ':')); return p ? p.slice(key.length + 1).trim() : null }
            const desde = findPart('DESDE') || (n.fechaInicio ? new Date(n.fechaInicio).toLocaleString('es-ES', {dateStyle:'short',timeStyle:'short'}) : null)
            const hasta = findPart('HASTA') || (n.fechaFin ? new Date(n.fechaFin).toLocaleString('es-ES', {dateStyle:'short',timeStyle:'short'}) : null)
            const horario = findPart('HORARIO')
            const descripcionFinal = findPart('DESCRIPCIÓN') || findPart('DESCRIPCION') || partes.filter((s: string) => !s.match(/^(DESDE|HASTA|HORARIO)/i)).join(' ').slice(0, 500)
            const hoy = n.fechaFin && new Date(n.fechaFin) < new Date(Date.now() + 24*3600*1000)
            return (
              <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
                <div className={`h-1 w-full ${hoy ? 'bg-yellow-400' : 'bg-red-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-100 rounded-xl"><Bell className="w-4 h-4 text-purple-600" /></div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{n.referencia || 'NOTAM sin referencia'}</p>
                        <p className="text-xs text-slate-500">{n.fuente}{n.tipo ? ` · ${n.tipo}` : ''}{n.estado ? ` · ${n.estado}` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => setNotamSeleccionado(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Válido desde</p>
                      <p className="text-xs font-semibold text-slate-700">{desde || '—'}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${hoy ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Válido hasta</p>
                      <p className={`text-xs font-semibold ${hoy ? 'text-yellow-700' : 'text-slate-700'}`}>{hasta || 'Permanente'}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Altitudes</p>
                      <p className="text-xs font-semibold text-orange-700">{n.alturaMin ?? 'SFC'} – {n.alturaMax ?? 'UNL'} ft</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Radio afectado</p>
                      <p className="text-xs font-semibold text-blue-700">{n.radio ? `${n.radio} km` : '—'}</p>
                    </div>
                    {horario && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Horario</p>
                        <p className="text-xs font-semibold text-slate-700">{horario}</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Descripción</p>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{descripcionFinal || 'Sin descripción disponible'}</p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                    <p className="text-[11px] text-amber-700">Verifica siempre en <strong>drones.enaire.es</strong> o sistema Ícaro antes de cada operación.</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Lista NOTAMs activos (compacta) */}
          {notams.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-2"><Bell size={13} />NOTAMs activos en área ({notams.length})</p>
                <p className="text-[10px] text-slate-400">Haz clic en un NOTAM para verlo en el mapa</p>
              </div>
              <div className="divide-y divide-slate-50">
                {notams.map(n => {
                  const hoy = n.fechaFin && new Date(n.fechaFin) < new Date(Date.now() + 24*3600*1000)
                  const vencido = n.fechaFin && new Date(n.fechaFin) < new Date()
                  const sel = notamSeleccionado?.id === n.id
                  const rawD = (n.descripcionHtml || n.descripcion || '').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim()
                  return (
                    <div
                      key={n.id}
                      onClick={() => setNotamSeleccionado(sel ? null : n)}
                      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${sel ? 'bg-purple-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${vencido ? 'bg-slate-300' : hoy ? 'bg-yellow-400' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold ${sel ? 'text-purple-700' : 'text-slate-800'}`}>{n.referencia || 'NOTAM'}</span>
                          {n.tipo && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{n.tipo}</span>}
                          {hoy && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">Vence hoy</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{rawD.slice(0, 120)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {n.alturaMax != null && <p className="text-[10px] font-semibold text-orange-600">↑{n.alturaMax} ft</p>}
                        {n.fechaFin && <p className="text-[10px] text-slate-400">{new Date(n.fechaFin).toLocaleDateString('es-ES')}</p>}
                      </div>
                      <ChevronRight size={14} className={sel ? 'text-purple-400' : 'text-slate-200'} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {notams.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
              <Bell size={24} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin NOTAMs activos · <button onClick={consultarNotamsENAIRE} className="text-purple-600 hover:underline font-semibold">Actualizar ENAIRE</button></p>
            </div>
          )}
        </div>
      )}

      {/* ─── CHECK PRE-VUELO ─── */}
      {tab === 'checklist' && (() => {
        const SECCIONES_CHECK = [
          {
            id: 'aeronave', label: 'Aeronave', icon: '✈',
            color: 'purple',
            items: [
              { id: 'bat_carga', label: 'Batería principal ≥ 80% de carga', normativa: 'AESA OP 3.2' },
              { id: 'bat_estado', label: 'Estado físico de baterías: sin hinchazón, golpes ni corrosión', normativa: 'AESA OP 3.2' },
              { id: 'helices', label: 'Hélices íntegras: sin fisuras, grietas ni deformaciones', normativa: 'AESA OP 4.1' },
              { id: 'estructura', label: 'Estructura del fuselaje sin daños visibles', normativa: 'AESA OP 4.1' },
              { id: 'camara', label: 'Cámara y gimbal operativos, sin obstrucción', normativa: 'AESA OP 5.1' },
              { id: 'gps', label: 'Señal GPS estable (≥ 8 satélites)', normativa: 'EASA UAS.OPEN.020' },
              { id: 'imu', label: 'Calibración IMU correcta, sin alertas', normativa: 'Fabricante' },
              { id: 'firmware', label: 'Firmware actualizado a versión estable', normativa: 'AESA OP 2.1' },
              { id: 'luces', label: 'Luces de navegación operativas', normativa: 'AESA OP 6.2' },
              { id: 'sensores', label: 'Sensores de evitación de obstáculos activos y calibrados', normativa: 'Fabricante' },
            ]
          },
          {
            id: 'control', label: 'Mando y Comunicaciones', icon: '📡',
            color: 'blue',
            items: [
              { id: 'rc_carga', label: 'Batería del mando ≥ 80%', normativa: 'AESA OP 3.2' },
              { id: 'rc_enlace', label: 'Enlace RC establecido y estable', normativa: 'EASA UAS.OPEN.020' },
              { id: 'rth', label: 'RTH (Retorno a casa) configurado y punto de inicio correcto', normativa: 'AESA OP 7.1' },
              { id: 'geofencing', label: 'Geofencing configurado según zona de operación', normativa: 'EASA UAS.OPEN.030' },
              { id: 'telemetria', label: 'Telemetría operativa en app de vuelo', normativa: 'Fabricante' },
            ]
          },
          {
            id: 'espacio_aereo', label: 'Espacio Aéreo', icon: '🗺',
            color: 'orange',
            items: [
              { id: 'notam_ok', label: 'NOTAMs consultados y sin restricciones activas en la zona', normativa: 'AESA OP 1.1 / Reg. 2019/947' },
              { id: 'zona_ok', label: 'Zona de vuelo verificada en Drones ENAIRE: categoría U-Space', normativa: 'EASA UAS.OPEN.010' },
              { id: 'altura_ok', label: 'Altura máxima de vuelo ≤ 120 m (o autorización expresa)', normativa: 'EASA UAS.OPEN.020 / AESA' },
              { id: 'coord_torre', label: 'Coordinación con torre de control si aplica (zonas CTR/TMA)', normativa: 'AESA OP 1.2' },
              { id: 'vlos', label: 'Vuelo dentro de línea visual (VLOS) garantizado', normativa: 'EASA UAS.OPEN.020(b)' },
              { id: 'distancias', label: 'Distancias de seguridad a personas/infraestructuras respetadas', normativa: 'EASA UAS.OPEN.030' },
            ]
          },
          {
            id: 'piloto', label: 'Piloto y Documentación', icon: '👨‍✈️',
            color: 'green',
            items: [
              { id: 'licencia', label: 'Licencia AESA vigente y categoría adecuada a la operación', normativa: 'AESA / Reg. UE 2019/947' },
              { id: 'seguro', label: 'Seguro de responsabilidad civil en vigor', normativa: 'Reg. UE 785/2004' },
              { id: 'matricula', label: 'Matrícula AESA visible en la aeronave', normativa: 'AESA / Reg. UE 2019/945' },
              { id: 'operador', label: 'Número de operador UAS registrado y actualizado', normativa: 'EASA UAS.OPEN.060' },
              { id: 'briefing', label: 'Briefing de seguridad realizado a personal de apoyo', normativa: 'AESA OP 8.1' },
              { id: 'apto_fisico', label: 'Piloto en condiciones físicas y psíquicas aptas para el vuelo', normativa: 'AESA OP 9.1' },
            ]
          },
          {
            id: 'meteorologia', label: 'Meteorología', icon: '🌤',
            color: 'sky',
            items: [
              { id: 'viento', label: 'Viento ≤ velocidad máxima del fabricante', normativa: 'AESA OP 3.3 / Fabricante' },
              { id: 'visibilidad', label: 'Visibilidad horizontal ≥ 500 m', normativa: 'EASA UAS.OPEN.020' },
              { id: 'precipitacion', label: 'Sin precipitación activa en zona de operación', normativa: 'Fabricante' },
              { id: 'niebla', label: 'Sin niebla, bruma intensa ni condiciones IMC', normativa: 'AESA OP 3.3' },
              { id: 'tormenta', label: 'Sin tormenta eléctrica en radio 10 km', normativa: 'AESA OP 3.3' },
            ]
          },
          {
            id: 'emergencia', label: 'Procedimientos de Emergencia', icon: '🚨',
            color: 'red',
            items: [
              { id: 'zona_ate', label: 'Zona de aterrizaje de emergencia identificada y libre', normativa: 'AESA OP 7.2' },
              { id: 'procedimiento', label: 'Procedimiento de pérdida de enlace conocido y configurado', normativa: 'AESA OP 7.1' },
              { id: 'extintor', label: 'Extintor de clase D o arena disponible en zona de operación', normativa: 'AESA OP 7.3' },
              { id: 'contacto', label: 'Contacto de emergencia y coordinador de vuelo identificados', normativa: 'AESA OP 8.2' },
            ]
          }
        ]

        const totalItems = SECCIONES_CHECK.reduce((a, s) => a + s.items.length, 0)
        const marcados = Object.values(checks).reduce((a, sec) => a + Object.values(sec).filter(v => v === true).length, 0)
        const fallidos = Object.values(checks).reduce((a, sec) => a + Object.values(sec).filter(v => v === false).length, 0)
        const pct = Math.round((marcados / totalItems) * 100)
        const aptoVuelo = marcados === totalItems && fallidos === 0

        const setCheck = (secId: string, itemId: string, val: boolean | null) => {
          setChecks(prev => ({ ...prev, [secId]: { ...(prev[secId] || {}), [itemId]: val } }))
        }
        const resetChecklist = () => { setChecks({}); setNotasCheck(''); setPiloCheck(''); setDroneCheck('') }

        const colorMap: Record<string, string> = {
          purple: 'bg-purple-50 border-purple-100 text-purple-700',
          blue: 'bg-blue-50 border-blue-100 text-blue-700',
          orange: 'bg-orange-50 border-orange-100 text-orange-700',
          green: 'bg-green-50 border-green-100 text-green-700',
          sky: 'bg-sky-50 border-sky-100 text-sky-700',
          red: 'bg-red-50 border-red-100 text-red-700',
        }
        const headerColor: Record<string, string> = {
          purple: 'text-purple-700', blue: 'text-blue-700', orange: 'text-orange-700',
          green: 'text-green-700', sky: 'text-sky-700', red: 'text-red-700',
        }

        return (
          <div className="space-y-5">
            {/* Cabecera con progreso */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Lista de verificación pre-vuelo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Normativa AESA y Reglamento UE 2019/947 (EASA) · {totalItems} verificaciones en 6 secciones</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetChecklist} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
                    <RefreshCw size={12} />Resetear
                  </button>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${aptoVuelo ? 'bg-green-100 text-green-700' : fallidos > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    {aptoVuelo ? <><CheckCircle2 size={14} />APTO PARA VUELO</> : fallidos > 0 ? <><AlertTriangle size={14} />NO APTO</> : `${marcados}/${totalItems} verificados`}
                  </div>
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${aptoVuelo ? 'bg-green-500' : fallidos > 0 ? 'bg-red-400' : 'bg-purple-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 w-10 text-right">{pct}%</span>
              </div>
              <div className="flex gap-4 mt-3">
                <span className="text-[11px] text-green-600 font-semibold">{marcados} OK</span>
                {fallidos > 0 && <span className="text-[11px] text-red-600 font-semibold">{fallidos} NOK</span>}
                <span className="text-[11px] text-slate-400">— {totalItems - marcados - fallidos} pendientes</span>
              </div>
              {/* Datos vuelo */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Piloto al mando</label>
                  <input value={piloCheck} onChange={e => setPiloCheck(e.target.value)} placeholder="Nombre del piloto" className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Aeronave</label>
                  <select value={droneCheck} onChange={e => setDroneCheck(e.target.value)} className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400">
                    <option value="">Seleccionar drone...</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.modelo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</label>
                  <input value={notasCheck} onChange={e => setNotasCheck(e.target.value)} placeholder="Notas adicionales..." className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                </div>
              </div>
            </div>

            {/* Secciones del checklist */}
            {SECCIONES_CHECK.map(sec => {
              const secChecks = checks[sec.id] || {}
              const secOK = sec.items.filter(i => secChecks[i.id] === true).length
              const secNOK = sec.items.filter(i => secChecks[i.id] === false).length
              const secTotal = sec.items.length
              return (
                <div key={sec.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      {(() => { const icons: Record<string, any> = { Drone, Radio, Map, User, Wind, AlertTriangle }; const Icon = icons[sec.icon]; return Icon ? <Icon size={15} className={headerColor[sec.color]} /> : null })()}
                      <span className={`text-sm font-black ${headerColor[sec.color]}`}>{sec.label}</span>
                      <span className="text-[10px] text-slate-400">{secTotal} verificaciones</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {secOK > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={9} />{secOK} OK</span>}
                      {secNOK > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><X size={9} />{secNOK} NOK</span>}
                      {secOK === secTotal && secNOK === 0 && <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={11} />Sección completa</span>}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {sec.items.map((item, idx) => {
                      const estado = secChecks[item.id]
                      return (
                        <div key={item.id} className={`flex items-center gap-4 px-5 py-3 transition-colors ${estado === true ? 'bg-green-50/50' : estado === false ? 'bg-red-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <span className="text-[11px] font-bold text-slate-300 w-5 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">{item.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Ref: {item.normativa}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => setCheck(sec.id, item.id, estado === true ? null : true)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${estado === true ? 'bg-green-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'}`}
                            >
                              <Check size={11} />OK
                            </button>
                            <button
                              onClick={() => setCheck(sec.id, item.id, estado === false ? null : false)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${estado === false ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700'}`}
                            >
                              <X size={11} />NOK
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Firma y confirmación */}
            <div className={`rounded-xl border p-5 ${aptoVuelo ? 'bg-green-50 border-green-200' : fallidos > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-black ${aptoVuelo ? 'text-green-700' : fallidos > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                    {aptoVuelo ? 'Aeronave apta para operación de vuelo' : fallidos > 0 ? 'Operación NO autorizada — Subsanar ítems NOK' : 'Checklist pendiente de completar'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {piloCheck && `Piloto: ${piloCheck} · `}
                    {new Date().toLocaleString('es-ES', {dateStyle: 'long', timeStyle: 'short'})}
                  </p>
                </div>
                {aptoVuelo && (
                  <button
                    onClick={() => alert('Checklist guardado. Puedes proceder al registro del vuelo.')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700"
                  >
                    <ClipboardList size={15} />Confirmar y registrar vuelo
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ════════════════════════════════════════════════
          MODALES
      ════════════════════════════════════════════════ */}

      {/* Modal Nuevo Drone */}
      {showNuevoDrone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b"><h3 className="text-lg font-bold text-slate-900">Nuevo drone</h3><button onClick={() => setShowNuevoDrone(false)}><X size={20} className="text-slate-400" /></button></div>
            <form onSubmit={handleNuevoDrone} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Código *</label><input name="codigo" required placeholder="DJI-001" className={inputCls} /></div>
                <div><label className={labelCls}>Nombre</label><input name="nombre" placeholder="Mavic 2 Pro Principal" className={inputCls} /></div>
                <div><label className={labelCls}>Marca *</label><input name="marca" required placeholder="DJI" className={inputCls} /></div>
                <div><label className={labelCls}>Modelo *</label><input name="modelo" required placeholder="Mavic 2 Pro" className={inputCls} /></div>
                <div><label className={labelCls}>Nº Serie</label><input name="numeroSerie" className={inputCls} /></div>
                <div><label className={labelCls}>Matrícula AESA</label><input name="matriculaAESA" placeholder="ES.UAS.A.XXXXX" className={inputCls} /></div>
                <div><label className={labelCls}>Categoría AESA</label>
                  <select name="categoria" className={inputCls}>
                    <option value="A1">A1 — Menos de 250g</option>
                    <option value="A2">A2 — Hasta 4kg</option>
                    <option value="A3">A3 — Hasta 25kg</option>
                  </select>
                </div>
                <div><label className={labelCls}>Peso máx. despegue (kg)</label><input name="pesoMaxDespegue" type="number" step="0.001" className={inputCls} /></div>
                <div><label className={labelCls}>Estado</label>
                  <select name="estado" className={inputCls}>
                    <option value="operativo">Operativo</option>
                    <option value="mantenimiento">En mantenimiento</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div><label className={labelCls}>Fecha compra</label><input name="fechaCompra" type="date" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} className={inputCls} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevoDrone(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Crear drone'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Drone */}
      {showEditarDrone && droneSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b"><h3 className="text-lg font-bold text-slate-900">Editar {droneSeleccionado.codigo}</h3><button onClick={() => setShowEditarDrone(false)}><X size={20} className="text-slate-400" /></button></div>
            <form key={droneSeleccionado.id} onSubmit={handleEditarDrone} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Código *</label><input name="codigo" required defaultValue={droneSeleccionado.codigo} className={inputCls} /></div>
                <div><label className={labelCls}>Nombre</label><input name="nombre" defaultValue={droneSeleccionado.nombre} className={inputCls} /></div>
                <div><label className={labelCls}>Marca *</label><input name="marca" required defaultValue={droneSeleccionado.marca} className={inputCls} /></div>
                <div><label className={labelCls}>Modelo *</label><input name="modelo" required defaultValue={droneSeleccionado.modelo} className={inputCls} /></div>
                <div><label className={labelCls}>Nº Serie</label><input name="numeroSerie" defaultValue={droneSeleccionado.numeroSerie} className={inputCls} /></div>
                <div><label className={labelCls}>Matrícula AESA</label><input name="matriculaAESA" defaultValue={droneSeleccionado.matriculaAESA} className={inputCls} /></div>
                <div><label className={labelCls}>Categoría</label>
                  <select name="categoria" defaultValue={droneSeleccionado.categoria} className={inputCls}>
                    <option value="A1">A1</option><option value="A2">A2</option><option value="A3">A3</option>
                  </select>
                </div>
                <div><label className={labelCls}>Peso máx. (kg)</label><input name="pesoMaxDespegue" type="number" step="0.001" defaultValue={droneSeleccionado.pesoMaxDespegue} className={inputCls} /></div>
                <div><label className={labelCls}>Estado</label>
                  <select name="estado" defaultValue={droneSeleccionado.estado} className={inputCls}>
                    <option value="operativo">Operativo</option><option value="mantenimiento">En mantenimiento</option><option value="baja">Baja</option>
                  </select>
                </div>
                <div><label className={labelCls}>Fecha compra</label><input name="fechaCompra" type="date" defaultValue={droneSeleccionado.fechaCompra?.slice(0,10)} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} defaultValue={droneSeleccionado.observaciones} className={inputCls} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditarDrone(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Piloto */}
      {showNuevoPiloto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b"><h3 className="text-lg font-bold text-slate-900">Nuevo piloto RPAS</h3><button onClick={() => setShowNuevoPiloto(false)}><X size={20} className="text-slate-400" /></button></div>
            <form onSubmit={handleNuevoPiloto} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Nombre *</label><input name="nombre" required className={inputCls} /></div>
                <div><label className={labelCls}>Apellidos *</label><input name="apellidos" required className={inputCls} /></div>
                <div><label className={labelCls}>Email</label><input name="email" type="email" className={inputCls} /></div>
                <div><label className={labelCls}>Teléfono</label><input name="telefono" className={inputCls} /></div>
                <div><label className={labelCls}>Tipo</label>
                  <select name="externo" className={inputCls}>
                    <option value="false">Voluntario PC Bormujos</option>
                    <option value="true">Piloto externo</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Shield size={12} />Certificaciones AESA/EASA</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['A1/A3', 'a1a3'], ['A2', 'a2'], ['STS-01', 'sts01'], ['STS-02', 'sts02']].map(([label, key]) => (
                    <div key={key} className="border border-slate-100 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-bold text-purple-700">{label}</p>
                      <input name={`${key}Num`} placeholder="Nº certificado" className={inputCls} />
                      <input name={`${key}Cad`} type="date" placeholder="Caducidad" className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Seguro RC — Nº póliza</label><input name="seguroRCNumero" className={inputCls} /></div>
                <div><label className={labelCls}>Seguro RC — Vigencia</label><input name="seguroRCVigencia" type="date" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNuevoPiloto(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar piloto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Vuelo */}
      {showNuevoVuelo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div><h3 className="text-lg font-bold text-slate-900">Registrar vuelo — Parte AESA</h3><p className="text-xs text-slate-500">Se generará checklist pre-vuelo automáticamente</p></div>
              <button onClick={() => setShowNuevoVuelo(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleNuevoVuelo} className="p-6 space-y-5">
              {/* Aeronave y piloto */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Drone size={12} />Aeronave y piloto</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Drone *</label>
                    <select name="droneId" required className={inputCls}>
                      <option value="">— Seleccionar —</option>
                      {drones.filter(d => d.estado === 'operativo').map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.marca} {d.modelo}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Piloto *</label>
                    <select name="pilotoId" required className={inputCls}>
                      <option value="">— Seleccionar —</option>
                      {pilotos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {/* Fecha y hora */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Calendar size={12} />Fecha y hora</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={labelCls}>Fecha *</label><input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className={inputCls} /></div>
                  <div><label className={labelCls}>Hora inicio</label><input name="horaInicio" type="time" className={inputCls} /></div>
                  <div><label className={labelCls}>Tipo operación *</label>
                    <select name="tipoOperacion" required className={inputCls}>
                      {Object.entries(TIPO_OPERACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {/* Zona de vuelo */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><MapPin size={12} />Zona de vuelo</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Municipio</label><input name="municipio" defaultValue="Bormujos" className={inputCls} /></div>
                  <div><label className={labelCls}>Altura máxima (m)</label><input name="alturaMaxima" type="number" placeholder="120" className={inputCls} /></div>
                  <div><label className={labelCls}>Latitud inicio</label><input name="latitudInicio" type="number" step="0.000001" defaultValue="37.3710" className={inputCls} /></div>
                  <div><label className={labelCls}>Longitud inicio</label><input name="longitudInicio" type="number" step="0.000001" defaultValue="-6.0719" className={inputCls} /></div>
                </div>
                <div className="mt-3"><label className={labelCls}>Descripción zona</label><textarea name="descripcionZona" rows={2} placeholder="Descripción detallada del área de operación..." className={inputCls} /></div>
              </div>
              {/* Condiciones meteorológicas */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Wind size={12} />Condiciones meteorológicas</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Viento (km/h)</label><input name="viento" type="number" placeholder="15" className={inputCls} /></div>
                  <div><label className={labelCls}>Visibilidad (m)</label><input name="visibilidad" type="number" placeholder="5000" className={inputCls} /></div>
                  <div><label className={labelCls}>Temperatura (°C)</label><input name="temperatura" type="number" className={inputCls} /></div>
                  <div><label className={labelCls}>Condición</label>
                    <select name="condicion" className={inputCls}>
                      <option value="despejado">Despejado</option>
                      <option value="nublado_parcial">Nublado parcial</option>
                      <option value="nublado">Nublado</option>
                      <option value="lluvia_ligera">Lluvia ligera</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* NOTAMs */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Bell size={12} />NOTAMs</p>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" name="notamConsultado" id="notamCons" className="w-4 h-4 accent-purple-600" />
                  <label htmlFor="notamCons" className="text-sm text-slate-700">Confirmo que he consultado los NOTAMs vigentes para esta operación</label>
                </div>
                <div><label className={labelCls}>Referencia NOTAM (si aplica)</label><input name="notamReferencia" placeholder="A1234/26, B5678/26..." className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Observaciones previas</label><textarea name="observaciones" rows={2} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNuevoVuelo(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar vuelo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Checklist AESA */}
      {showChecklist && vueloSeleccionado && checklistData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Checklist pre-vuelo — AESA/EASA</h3>
                <p className="text-xs text-slate-500">{vueloSeleccionado.numero} · {formatFecha(vueloSeleccionado.fecha)}</p>
              </div>
              <button onClick={() => setShowChecklist(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              {checklistData.items && Object.entries(checklistData.items).map(([seccion, items]: [string, any]) => (
                <div key={seccion}>
                  <p className="text-xs font-black text-slate-500 uppercase mb-3 tracking-wider border-b border-slate-100 pb-1">{seccion.replace('_', ' ')}</p>
                  <div className="space-y-2">
                    {(items as any[]).map((item: any) => (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${item.ok ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}>
                        <input type="checkbox" checked={item.ok} onChange={e => {
                          const updated = { ...checklistData }
                          const sec = updated.items[seccion] as any[]
                          const idx = sec.findIndex((i: any) => i.id === item.id)
                          sec[idx] = { ...sec[idx], ok: e.target.checked }
                          setChecklistData({ ...updated })
                        }} className="w-4 h-4 accent-green-600 flex-shrink-0" />
                        <span className={`text-sm flex-1 ${item.ok ? 'text-green-800' : 'text-slate-700'}`}>{item.label}</span>
                        {item.ok && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div><label className={labelCls}>Firmado por</label><input value={checklistData.firmadoPor || ''} onChange={e => setChecklistData({ ...checklistData, firmadoPor: e.target.value })} placeholder="Nombre del piloto al mando" className={inputCls} /></div>
                <div><label className={labelCls}>Observaciones</label><textarea value={checklistData.observaciones || ''} onChange={e => setChecklistData({ ...checklistData, observaciones: e.target.value })} rows={2} className={inputCls} /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowChecklist(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleGuardarChecklist} disabled={saving} className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Firmar y guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Mantenimiento */}
      {showNuevoMant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b"><h3 className="text-lg font-bold text-slate-900">Registrar mantenimiento</h3><button onClick={() => setShowNuevoMant(false)}><X size={20} className="text-slate-400" /></button></div>
            <form onSubmit={handleNuevoMant} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Drone *</label>
                  <select name="droneId" required className={inputCls}>
                    <option value="">— Seleccionar —</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.modelo}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Tipo *</label>
                  <select name="tipoMant" required className={inputCls}>
                    {Object.entries(TIPO_MANT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Fecha *</label><input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className={inputCls} /></div>
                <div><label className={labelCls}>Horas en el momento</label><input name="horasEnElMomento" type="number" step="0.1" className={inputCls} /></div>
                <div><label className={labelCls}>Realizado por</label><input name="realizadoPor" className={inputCls} /></div>
                <div><label className={labelCls}>Coste (€)</label><input name="coste" type="number" step="0.01" className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Próximo mantenimiento</label><input name="proximoMantenimiento" type="date" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Descripción *</label><textarea name="descripcion" required rows={2} className={inputCls} /></div>
              <div><label className={labelCls}>Piezas sustituidas</label><textarea name="piezasSustituidas" rows={2} className={inputCls} /></div>
              <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNuevoMant(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle NOTAM */}
      {notamSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><Bell className="w-5 h-5 text-purple-600" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{notamSeleccionado.referencia || 'NOTAM sin referencia'}</h3>
                    <p className="text-xs text-slate-500">Fuente: {notamSeleccionado.fuente} {notamSeleccionado.estado && `· ${notamSeleccionado.estado}`}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setNotamSeleccionado(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Datos principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Vigencia</p>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-700"><span className="font-semibold">Desde:</span> {notamSeleccionado.fechaInicio ? new Date(notamSeleccionado.fechaInicio).toLocaleString('es-ES') : '-'}</p>
                    <p className="text-xs text-slate-700"><span className="font-semibold">Hasta:</span> {notamSeleccionado.fechaFin ? new Date(notamSeleccionado.fechaFin).toLocaleString('es-ES') : 'Permanente'}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Espacio aéreo afectado</p>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-700"><span className="font-semibold">Alt. mín:</span> {notamSeleccionado.alturaMin != null ? `${notamSeleccionado.alturaMin} ft` : 'SFC'}</p>
                    <p className="text-xs text-slate-700"><span className="font-semibold">Alt. máx:</span> {notamSeleccionado.alturaMax != null ? `${notamSeleccionado.alturaMax} ft` : 'UNL'}</p>
                    <p className="text-xs text-slate-700"><span className="font-semibold">Radio:</span> {notamSeleccionado.radio ? `${notamSeleccionado.radio} km` : '-'}</p>
                  </div>
                </div>
              </div>
              {/* Descripción */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Descripción completa</p>
                <div className="bg-slate-50 rounded-xl p-4">
                  {notamSeleccionado.descripcionHtml ? (
                    <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: notamSeleccionado.descripcionHtml }} />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{notamSeleccionado.descripcion || 'Sin descripción'}</p>
                  )}
                </div>
              </div>
              {/* Mapa */}
              {(notamSeleccionado.latitud && notamSeleccionado.longitud) && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Área afectada</p>
                  <div className="rounded-xl overflow-hidden border border-slate-100" style={{ height: '280px' }}>
                    <MapContainer
                      center={[notamSeleccionado.latitud, notamSeleccionado.longitud]}
                      zoom={notamSeleccionado.radio ? Math.max(8, 13 - Math.log2(notamSeleccionado.radio)) : 11}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                      {notamSeleccionado.radio ? (
                        <Circle
                          center={[notamSeleccionado.latitud, notamSeleccionado.longitud]}
                          radius={notamSeleccionado.radio * 1000}
                          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }}
                        />
                      ) : (
                        <Marker position={[notamSeleccionado.latitud, notamSeleccionado.longitud]}>
                          <Popup>{notamSeleccionado.referencia || 'NOTAM'}</Popup>
                        </Marker>
                      )}
                      {/* Punto Bormujos como referencia */}
                      <Circle center={[37.3710, -6.0719]} radius={500} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 2 }}>
                        <Popup>Bormujos — Protección Civil</Popup>
                      </Circle>
                    </MapContainer>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => setNotamSeleccionado(null)} className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal NOTAM Manual */}
      {showNotamManual && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b"><h3 className="text-lg font-bold text-slate-900">Registrar NOTAM manual</h3><button onClick={() => setShowNotamManual(false)}><X size={20} className="text-slate-400" /></button></div>
            <form onSubmit={async e => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              setSaving(true)
              const r = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'notam-manual', referencia: f.get('referencia'), tipoNotam: f.get('tipoNotam'), fechaInicio: f.get('fechaInicio'), fechaFin: f.get('fechaFin'), alturaMin: f.get('alturaMin'), alturaMax: f.get('alturaMax'), radio: f.get('radio'), latitud: f.get('latitud'), longitud: f.get('longitud'), descripcion: f.get('descripcion') }) })
              setSaving(false)
              if (r.ok) { setShowNotamManual(false); cargarDatos() }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Referencia</label><input name="referencia" placeholder="A1234/26" className={inputCls} /></div>
                <div><label className={labelCls}>Tipo</label><input name="tipoNotam" placeholder="AERÓDROMO / ESPACIO AÉREO" className={inputCls} /></div>
                <div><label className={labelCls}>Válido desde</label><input name="fechaInicio" type="datetime-local" className={inputCls} /></div>
                <div><label className={labelCls}>Válido hasta</label><input name="fechaFin" type="datetime-local" className={inputCls} /></div>
                <div><label className={labelCls}>Altura mín. (ft)</label><input name="alturaMin" type="number" className={inputCls} /></div>
                <div><label className={labelCls}>Altura máx. (ft)</label><input name="alturaMax" type="number" className={inputCls} /></div>
                <div><label className={labelCls}>Latitud centro</label><input name="latitud" type="number" step="0.000001" defaultValue="37.3710" className={inputCls} /></div>
                <div><label className={labelCls}>Longitud centro</label><input name="longitud" type="number" step="0.000001" defaultValue="-6.0719" className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Radio (km)</label><input name="radio" type="number" step="0.1" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Descripción</label><textarea name="descripcion" rows={3} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNotamManual(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar NOTAM'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
