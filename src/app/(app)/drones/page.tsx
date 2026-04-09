'use client'
import { TbDrone as Drone } from 'react-icons/tb'
import { usePermisos } from '@/lib/permisos'
import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Check, ClipboardList, 
  Plus, RefreshCw, Battery, User, Map, FileText, 
  Wrench, AlertTriangle, CheckCircle2, Clock, Calendar,
  Shield, Radio, Wind, Eye, CloudRain, Navigation,
  Download, Edit, Trash2, ChevronRight, Info,
  Zap, Target, Activity, BarChart3, Save, X,
  MapPin, Layers, Bell, BookOpen, Settings, ShoppingCart, History, Search, Package, CheckCircle
} from 'lucide-react'
import { TbDrone as DroneIcon } from 'react-icons/tb'
import { ChevronDown } from 'lucide-react'
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
interface Bateria { id: string; droneId?: string; codigo: string; marca?: string; modelo?: string; compatibilidad: string; capacidadMah?: number; ciclosActuales: number; ciclosMaximos: number; estado: string; observaciones?: string; minutosVuelo?: number }
interface Piloto { id: string; usuarioId?: string; nombre: string; apellidos: string; email?: string; telefono?: string; externo: boolean; certificaciones: any; seguroRCNumero?: string; seguroRCVigencia?: string; activo: boolean; observaciones?: string }
interface Vuelo { id: string; numero: string; droneId: string; pilotoId: string; fecha: string; horaInicio?: string; horaFin?: string; duracionMinutos?: number; tipoOperacion: string; municipio: string; descripcionZona?: string; latitudInicio?: number; longitudInicio?: number; alturaMaxima?: number; alturaMedia?: number; condicionesMeteo: any; notamConsultado: boolean; notamReferencia?: string; incidencias?: string; observaciones?: string; estado: string; drone?: any; piloto?: any; checklist?: any; categoriaAESA?: string; lugarDespegue?: string; lugarAterrizaje?: string; bateriaId?: string; objetivoMision?: string; resultadoMision?: string; personalApoyo?: string; numeroVccOperador?: string; zonaAerea?: string; condicionesVuelo?: string; bateriasUsadas?: any }
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
  const [tab, setTab] = useState<'inventario' | 'dashboard' | 'flota' | 'pilotos' | 'operaciones' | 'mantenimiento' | 'mapa' | 'checklist'>('inventario')
  const { canCreate, canEdit, canDelete } = usePermisos()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Datos
  const [stats, setStats] = useState<Stats | null>(null)
  const [drones, setDrones] = useState<Drone[]>([])
  const [pilotos, setPilotos] = useState<Piloto[]>([])
  const [isPiloto, setIsPiloto] = useState(false)
  const [vuelos, setVuelos] = useState<Vuelo[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [notams, setNotams] = useState<Notam[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [articulos, setArticulos] = useState<any[]>([])
  const [familias, setFamilias] = useState<any[]>([])
  const [peticiones, setPeticiones] = useState<any[]>([])
  const [inventoryTab, setInventoryTab] = useState<'stock'|'peticiones'|'movimientos'>('stock')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showEditarArticulo, setShowEditarArticulo] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null)
  const [categoriaArea, setCategoriaArea] = useState<string|null>(null)

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
  const [showEditarPiloto, setShowEditarPiloto] = useState(false)
  const [pilotoSeleccionado, setPilotoSeleccionado] = useState<any>(null)
  const [showNuevoVuelo, setShowNuevoVuelo] = useState(false)
  const [pasoNuevoVuelo, setPasoNuevoVuelo] = useState<1|2>(1)
  const [vueloExpandido, setVueloExpandido] = useState<string | null>(null)
  const [vueloFormData, setVueloFormData] = useState<any>(null)
  const [checklistNuevo, setChecklistNuevo] = useState<Record<string,boolean>>({})
  const [bateriasSeleccionadas, setBateriasSeleccionadas] = useState<Record<string,number>>({})
  const [todasBaterias, setTodasBaterias] = useState<Bateria[]>([])
  const [droneSeleccionadoWizard, setDroneSeleccionadoWizard] = useState<string>('')
  const [showChecklist, setShowChecklist] = useState(false)
  const [showDetalleVuelo, setShowDetalleVuelo] = useState(false)
  const [showEditarVuelo, setShowEditarVuelo] = useState(false)
  const [notamsZona, setNotamsZona] = useState<any[]>([])
  const [consultandoNotams, setConsultandoNotams] = useState(false)
  const [geolocalizando, setGeolocalizando] = useState(false)
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
      const [statsR, dronesR, pilotosR, vuelosR, mantR, notamsR, zonasR, bateriasR] = await Promise.all([
        fetch('/api/drones?tipo=stats'),
        fetch('/api/drones?tipo=drones'),
        fetch('/api/drones?tipo=pilotos'),
        fetch('/api/drones?tipo=vuelos'),
        fetch('/api/drones?tipo=mantenimientos'),
        fetch('/api/drones?tipo=notams'),
        fetch('/api/drones?tipo=zonas'),
        fetch('/api/drones?tipo=baterias-todas')
      ])
      const [sd, dd, pd, vd, md, nd, zd, bd] = await Promise.all([
        statsR.json(), dronesR.json(), pilotosR.json(), vuelosR.json(), mantR.json(), notamsR.json(), zonasR.json(), bateriasR.json()
      ])
      setStats(sd)
      setDrones(dd.drones || [])
      setTodasBaterias(bd.baterias || [])
      const pilotosData = pd.pilotos || []
      setPilotos(pilotosData)
      // Comprobar si el usuario actual es piloto registrado
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      const emailActual = sessionData?.user?.email || ''
      const esPiloto = pilotosData.some((p: any) => p.email === emailActual)
      setIsPiloto(esPiloto)
      setVuelos(vd.vuelos || [])
      setMantenimientos(md.mantenimientos || [])
      setNotams(nd.notams || [])
      setZonas(zd.zonas || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])
  const cargarInventario = useCallback(async () => { try { const [resInv, resCat] = await Promise.all([fetch("/api/logistica?inventario=drones"), fetch("/api/logistica?tipo=categoria&slug=drones")]); const dataInv = await resInv.json(); const dataCat = await resCat.json(); setArticulos(dataInv.articulos || []); setFamilias(dataInv.familias || []); if (dataCat.categoria) setCategoriaArea(dataCat.categoria.id) } catch(e) { console.error(e) } }, [])
  const cargarPeticiones = useCallback(async () => { try { const r = await fetch("/api/logistica/peticiones?area=drones"); const d = await r.json(); setPeticiones(d.peticiones || []) } catch(e) { console.error(e) } }, [])
  useEffect(() => { cargarInventario() }, [cargarInventario])
  useEffect(() => { if (inventoryTab === "peticiones") cargarPeticiones() }, [inventoryTab, cargarPeticiones])

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

  const handleEditarPiloto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pilotoSeleccionado) return
    const form = e.currentTarget
    const f = new FormData(form)
    try {
      setSaving(true)
      const certs: any = {}
      if (f.get('a1a3Num')) certs.A1A3 = { numero: f.get('a1a3Num'), caducidad: f.get('a1a3Cad') }
      if (f.get('a2Num')) certs.A2 = { numero: f.get('a2Num'), caducidad: f.get('a2Cad') }
      if (f.get('sts01Num')) certs.STS01 = { numero: f.get('sts01Num'), caducidad: f.get('sts01Cad') }
      if (f.get('sts02Num')) certs.STS02 = { numero: f.get('sts02Num'), caducidad: f.get('sts02Cad') }
      const r = await fetch('/api/drones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'piloto', id: pilotoSeleccionado.id, nombre: f.get('nombre'), apellidos: f.get('apellidos'), email: f.get('email'), telefono: f.get('telefono'), esExterno: f.get('externo') === 'true', certificaciones: certs, seguroRCNumero: f.get('seguroRCNumero'), seguroRCVigencia: f.get('seguroRCVigencia'), observaciones: f.get('observaciones') }) })
      if (r.ok) { setShowEditarPiloto(false); setPilotoSeleccionado(null); cargarDatos() }
    } finally { setSaving(false) }
  }

  const CHECKLIST_SECCIONES_NUEVO = [
    { id: 'aeronave', label: 'Aeronave', items: [
      { id: 'bat_carga', label: 'Bateria principal >= 80% de carga' },
      { id: 'bat_estado', label: 'Estado fisico de baterias: sin hinchazón, golpes ni corrosión' },
      { id: 'helices', label: 'Helices integras: sin fisuras, grietas ni deformaciones' },
      { id: 'estructura', label: 'Estructura del fuselaje sin daños visibles' },
      { id: 'gps', label: 'Señal GPS estable (>= 8 satelites)' },
      { id: 'imu', label: 'Calibracion IMU correcta, sin alertas' },
      { id: 'luces', label: 'Luces de navegacion operativas' },
    ]},
    { id: 'control', label: 'Mando y Comunicaciones', items: [
      { id: 'rc_carga', label: 'Bateria del mando >= 80%' },
      { id: 'rc_enlace', label: 'Enlace RC establecido y estable' },
      { id: 'rth', label: 'RTH configurado y punto de inicio correcto' },
      { id: 'telemetria', label: 'Telemetria operativa en app de vuelo' },
    ]},
    { id: 'espacio_aereo', label: 'Espacio Aereo', items: [
      { id: 'notam_ok', label: 'NOTAMs consultados y sin restricciones activas en la zona' },
      { id: 'zona_ok', label: 'Zona verificada en Drones ENAIRE: categoria U-Space' },
      { id: 'altura_ok', label: 'Altura maxima de vuelo <= 120 m (o autorizacion expresa)' },
      { id: 'vlos', label: 'Vuelo dentro de linea visual (VLOS) garantizado' },
      { id: 'distancias', label: 'Distancias de seguridad a personas/infraestructuras respetadas' },
    ]},
    { id: 'piloto', label: 'Piloto y Documentacion', items: [
      { id: 'licencia', label: 'Licencia AESA vigente y categoria adecuada a la operacion' },
      { id: 'seguro', label: 'Seguro de responsabilidad civil en vigor' },
      { id: 'matricula', label: 'Matricula AESA visible en la aeronave' },
      { id: 'apto_fisico', label: 'Piloto en condiciones fisicas y psiquicas aptas para el vuelo' },
    ]},
    { id: 'meteorologia', label: 'Meteorologia', items: [
      { id: 'viento_ok', label: 'Viento dentro de limites del fabricante' },
      { id: 'visib_ok', label: 'Visibilidad suficiente para operacion VLOS' },
      { id: 'lluvia_ok', label: 'Sin precipitaciones ni riesgo de lluvia' },
    ]},
  ]

  const handlePaso1Vuelo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const meteo = { viento: f.get('viento'), visibilidad: f.get('visibilidad'), nubes: f.get('nubes'), temperatura: f.get('temperatura'), condicion: f.get('condicion') }
    setVueloFormData({ tipo: 'vuelo', droneId: f.get('droneId'), pilotoId: f.get('pilotoId'), fecha: f.get('fecha'), horaInicio: f.get('horaInicio'), horaFin: f.get('horaFin'), duracionMinutos: f.get('duracionMinutos') ? parseInt(f.get('duracionMinutos') as string) : null, tipoOperacion: f.get('tipoOperacion'), categoriaAESA: f.get('categoriaAESA'), municipio: f.get('municipio') || 'Bormujos', lugarDespegue: f.get('lugarDespegue'), lugarAterrizaje: f.get('lugarAterrizaje'), descripcionZona: f.get('descripcionZona'), zonaAerea: f.get('zonaAerea'), latitudInicio: f.get('latitudInicio'), longitudInicio: f.get('longitudInicio'), alturaMaxima: f.get('alturaMaxima'), alturaMedia: f.get('alturaMedia'), condicionesMeteo: meteo, condicionesVuelo: f.get('condicionesVuelo'), notamConsultado: f.get('notamConsultado') === 'on', notamReferencia: f.get('notamReferencia'), objetivoMision: f.get('objetivoMision'), resultadoMision: f.get('resultadoMision'), personalApoyo: f.get('personalApoyo'), numeroVccOperador: f.get('numeroVccOperador'), incidencias: f.get('incidencias'), observaciones: f.get('observaciones'), estado: 'completado', bateriasUsadas: bateriasSeleccionadas })
    setChecklistNuevo({})
    setBateriasSeleccionadas({})
    setPasoNuevoVuelo(2)
  }

  const handleNuevoVuelo = async () => {
    if (!vueloFormData) return
    const todosItems = CHECKLIST_SECCIONES_NUEVO.flatMap(s => s.items.map(i => i.id))
    const todosOk = todosItems.every(id => checklistNuevo[id])
    if (!todosOk) { alert('Debes completar todos los items del checklist antes de registrar el vuelo.'); return }
    try {
      setSaving(true)
      const rVuelo = await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vueloFormData) })
      if (!rVuelo.ok) { alert('Error al crear el vuelo'); return }
      const dataVuelo = await rVuelo.json()
      const itemsChecklist: Record<string, any[]> = {}
      CHECKLIST_SECCIONES_NUEVO.forEach(s => {
        itemsChecklist[s.id] = s.items.map(i => ({ id: i.id, label: i.label, ok: checklistNuevo[i.id] || false, naAplicable: false }))
      })
      await fetch('/api/drones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'checklist', vueloId: dataVuelo.vuelo.id, items: itemsChecklist, completado: true, firmadoPor: vueloFormData.pilotoId, observaciones: '' }) })
      // Actualizar ciclos y minutos de cada bateria usada
      const batUsadas = vueloFormData.bateriasUsadas || {}
      for (const [batId, minutos] of Object.entries(batUsadas)) {
        if (minutos && Number(minutos) > 0) {
          await fetch('/api/drones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'bateria-uso', id: batId, minutosVuelo: Number(minutos), duracionVuelo: vueloFormData.duracionMinutos || Number(minutos) }) })
        }
      }
      setShowNuevoVuelo(false)
      setPasoNuevoVuelo(1)
      setVueloFormData(null)
      setChecklistNuevo({})
      cargarDatos()
    } finally { setSaving(false) }
  }

  const consultarNotamsZona = async (lat: number, lon: number) => {
    try {
      setConsultandoNotams(true)
      const r = await fetch(`/api/drones/notams-proxy?tipo=notams&lat=${lat}&lon=${lon}`)
      const data = await r.json()
      setNotamsZona(data.notams || [])
      return data.notams || []
    } catch (e) {
      console.error('Error NOTAMs:', e)
      return []
    } finally {
      setConsultandoNotams(false)
    }
  }

  const handleGuardarVuelo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!vueloSeleccionado) return
    const f = new FormData(e.currentTarget)
    const horaFin = f.get('horaFin') as string
    const incidencias = f.get('incidencias') as string
    const duracion = f.get('duracionMinutos') ? parseInt(f.get('duracionMinutos') as string) : null
    let nuevoEstado = vueloSeleccionado.estado
    if (horaFin) nuevoEstado = 'completado'
    if (incidencias?.trim()) nuevoEstado = 'incidencia'
    try {
      setSaving(true)
      await fetch('/api/drones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        tipo: 'vuelo', id: vueloSeleccionado.id,
        estado: nuevoEstado,
        horaFin, duracionMinutos: duracion,
        incidencias: incidencias || null,
        observaciones: f.get('observaciones'),
        resultadoMision: f.get('resultadoMision'),
      })})
      setShowEditarVuelo(false)
      cargarDatos()
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

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase mb-1'
  const TABS = [
    { id: 'inventario', label: 'Inventario del Área', icon: Package },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'flota', label: 'Flota', icon: DroneIcon },
    { id: 'pilotos', label: 'Pilotos', icon: User },
    { id: 'operaciones', label: 'Operaciones', icon: BookOpen },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
    { id: 'mapa', label: 'Mapa de Vuelo', icon: Map },
    { id: "checklist", label: "Check Pre-Vuelo", icon: ClipboardList },
  ] as const

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 rounded-xl flex-shrink-0"><DroneIcon className="w-6 h-6 text-white" /></div>
          <div>
            <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">DRONES — RPAS</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Gestión operativa de aeronaves</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Aeronaves no tripuladas · Protección Civil Bormujos</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <button onClick={cargarDatos} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"><RefreshCw size={16} /></button>
          <button onClick={() => setShowNuevoVuelo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg"><Plus size={16} />Nuevo Vuelo</button>
          <button disabled={!canCreate} onClick={() => setShowNuevoDrone(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"><DroneIcon size={16} />Añadir Drone</button>
          <button onClick={() => setTab('mapa')} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg"><Map size={16} />NOTAM</button>
        </div>
        {/* Móvil */}
        <div className="flex sm:hidden gap-2 mt-1">
          <button onClick={cargarDatos} className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"><RefreshCw size={16} /></button>
          <button onClick={() => setShowNuevoVuelo(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg"><Plus size={15} />Vuelo</button>
          <button disabled={!canCreate} onClick={() => setShowNuevoDrone(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg disabled:opacity-40"><DroneIcon size={15} />Drone</button>
          <button onClick={() => setTab('mapa')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg"><Map size={15} />NOTAM</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Drones operativos', value: `${stats?.dronesOperativos ?? 0}/${stats?.totalDrones ?? 0}`, icon: DroneIcon, color: 'text-teal-600' },
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
      <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-teal-500 text-teal-600 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={20} />{t.label}
          </button>
        ))}
      </div>

      {/* ─── DASHBOARD ─── */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Flota resumen */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><DroneIcon className="w-4 h-4 text-teal-600" />Estado de la flota</h3>
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
                        {Object.keys(certs).map(c => <span key={c} className="text-[9px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">{c}</span>)}
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
              <button key={e} onClick={() => setFiltroEstadoDrone(e)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filtroEstadoDrone === e ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {e === 'todos' ? 'Todos' : ESTADO_DRONE[e]?.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {dronesF.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-xl"><DroneIcon className="w-5 h-5 text-teal-600" /></div>
                    <div>
                      <p className="font-bold text-slate-900">{d.codigo}</p>
                      <p className="text-sm text-slate-500">{d.marca} {d.modelo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ESTADO_DRONE[d.estado]?.color}`}>{ESTADO_DRONE[d.estado]?.label}</span>
                    <button onClick={() => { setDroneSeleccionado(d); setShowEditarDrone(true) }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit size={14} /></button>
                    <button onClick={() => { if(confirm('¿Eliminar drone ' + d.codigo + '?')) { fetch('/api/drones?tipo=drone&id=' + d.id, {method:'DELETE'}).then(r => { if(r.ok) cargarDatos() }) } }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-black text-slate-800">{d.horasVuelo}h</p><p className="text-[10px] text-slate-500">Horas vuelo</p></div>
                  <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-black text-slate-800">{d._count?.vuelos ?? 0}</p><p className="text-[10px] text-slate-500">Vuelos</p></div>
                  <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-black text-slate-800">{d.categoria}</p><p className="text-[10px] text-slate-500">Categoría</p></div>
                </div>
                {d.matriculaAESA && <p className="text-xs text-slate-500">Matrícula AESA: <span className="font-bold text-slate-700">{d.matriculaAESA}</span></p>}
                {/* Baterías — Panel de seguimiento */}
                {(d.baterias || []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                      <Battery size={11} />Baterías ({d.baterias!.length})
                    </p>
                    <div className="space-y-2">
                      {(d.baterias || []).map((b: Bateria) => {
                        const pctCiclos = Math.round((b.ciclosActuales / b.ciclosMaximos) * 100)
                        const vidaRestante = 100 - pctCiclos
                        const horas = Math.floor((b.minutosVuelo || 0) / 60)
                        const mins = (b.minutosVuelo || 0) % 60
                        const estadoColor = b.estado === 'operativa' ? 'text-green-600 bg-green-50 border-green-100'
                          : b.estado === 'degradada' ? 'text-amber-600 bg-amber-50 border-amber-100'
                          : 'text-red-600 bg-red-50 border-red-100'
                        const barColor = vidaRestante > 50 ? 'bg-green-400' : vidaRestante > 20 ? 'bg-amber-400' : 'bg-red-400'
                        return (
                          <div key={b.id} className={`rounded-lg border p-2.5 ${estadoColor}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <Battery size={13} />
                                <span className="text-xs font-bold">{b.codigo}</span>
                                {b.capacidadMah && <span className="text-[10px] opacity-70">{b.capacidadMah}mAh</span>}
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                b.estado === 'operativa' ? 'bg-green-100 text-green-700'
                                : b.estado === 'degradada' ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                              }`}>{b.estado?.toUpperCase()}</span>
                            </div>
                            {/* Barra de vida útil */}
                            <div className="mb-1">
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="opacity-70">Vida útil restante</span>
                                <span className="font-bold">{vidaRestante}%</span>
                              </div>
                              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${vidaRestante}%` }} />
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-1 mt-1.5">
                              <div className="text-center">
                                <p className="text-[10px] opacity-60">Ciclos usados</p>
                                <p className="text-xs font-bold">{b.ciclosActuales}<span className="opacity-50">/{b.ciclosMaximos}</span></p>
                              </div>
                              <div className="text-center border-x border-current/10">
                                <p className="text-[10px] opacity-60">Tiempo vuelo</p>
                                <p className="text-xs font-bold">{horas}h {mins}m</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] opacity-60">Ciclos restantes</p>
                                <p className="text-xs font-bold">{b.ciclosMaximos - b.ciclosActuales}</p>
                              </div>
                            </div>
                            {pctCiclos >= 90 && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-red-600">
                                <AlertTriangle size={10} />Proxima a limite — revisar o retirar
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <button onClick={() => { setDroneSeleccionado(d); setShowNuevaBateria(true) }} className="w-full text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center justify-center gap-1 py-1.5 border border-dashed border-teal-200 rounded-lg hover:bg-teal-50">
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
            <button disabled={!canCreate} onClick={() => setShowNuevoPiloto(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={14} />Nuevo piloto</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pilotos.map(p => {
              const certs = p.certificaciones || {}
              const segVence = p.seguroRCVigencia ? new Date(p.seguroRCVigencia) < new Date() : false
              return (
                <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-700">{p.nombre[0]}{p.apellidos[0]}</div>
                      <div>
                        <p className="font-bold text-slate-900">{p.nombre} {p.apellidos}</p>
                        <p className="text-xs text-slate-500">{p.externo ? '🔗 Piloto externo' : '👮 Voluntario PC'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {segVence && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Seguro vencido</span>}
                      <button onClick={() => { setPilotoSeleccionado(p); setShowEditarPiloto(true) }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit size={14} /></button>
                      <button onClick={() => { if(confirm('¿Eliminar piloto ' + p.nombre + ' ' + p.apellidos + '?')) { fetch('/api/drones?tipo=piloto&id=' + p.id, {method:'DELETE'}).then(r => { if(r.ok) cargarDatos() }) } }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {/* Certificaciones */}
                  {(() => {
                    // certificaciones viene como String[] con JSON dentro
                    let certsObj: Record<string, any> = {}
                    try {
                      const raw = Array.isArray(p.certificaciones) ? p.certificaciones : []
                      if (raw.length > 0) {
                        const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0]
                        certsObj = parsed || {}
                      }
                    } catch { certsObj = {} }
                    const certEntries = Object.entries(certsObj)
                    const CERT_COLORS: Record<string, string> = {
                      A1A3: 'bg-sky-100 border-sky-200 text-sky-800',
                      A2:   'bg-violet-100 border-violet-200 text-violet-800',
                      STS01: 'bg-amber-100 border-amber-200 text-amber-800',
                      STS02: 'bg-orange-100 border-orange-200 text-orange-800',
                    }
                    return (
                      <div className="space-y-3">
                        {certEntries.length > 0 ? (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Certificaciones AESA</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {certEntries.map(([cert, data]: [string, any]) => {
                                const vencido = data?.caducidad && new Date(data.caducidad) < new Date()
                                const colorCls = CERT_COLORS[cert] || 'bg-teal-100 border-teal-200 text-teal-800'
                                return (
                                  <div key={cert} className={`rounded-xl border p-3 ${colorCls}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-black">{cert}</span>
                                      {vencido
                                        ? <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">VENCIDO</span>
                                        : <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">VIGENTE</span>
                                      }
                                    </div>
                                    {data?.numero && <p className="text-[10px] font-semibold opacity-80 truncate">{data.numero}</p>}
                                    {data?.caducidad && <p className={`text-[10px] mt-0.5 font-medium ${vencido ? 'text-red-600' : 'opacity-60'}`}>Cad: {formatFecha(data.caducidad)}</p>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <AlertTriangle size={14} className="text-slate-300" />
                            <span className="text-xs text-slate-400 italic">Sin certificaciones registradas</span>
                          </div>
                        )}
                        {/* Seguro RC y contacto */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                          {p.seguroRCNumero && (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${p.seguroRCVigencia && new Date(p.seguroRCVigencia) > new Date() ? 'bg-green-400' : 'bg-red-400'}`} />
                              <span className="text-xs text-slate-600">Seguro RC: <span className="font-semibold">{p.seguroRCNumero}</span></span>
                              {p.seguroRCVigencia && <span className="text-[10px] text-slate-400">· Hasta {formatFecha(p.seguroRCVigencia)}</span>}
                            </div>
                          )}
                          {p.email && <span className="text-xs text-slate-400">{p.email}</span>}
                          {p.telefono && <span className="text-xs text-slate-400">{p.telefono}</span>}
                        </div>
                      </div>
                    )
                  })()}
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
                <button key={e} onClick={() => setFiltroEstadoVuelo(e)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filtroEstadoVuelo === e ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {e === 'todos' ? 'Todos' : ESTADO_VUELO[e]?.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Download size={14} />Exportar libro vuelos</button>
          </div>
          <div className="space-y-2">
            {vuelosF.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100">
                <p className="text-sm">No hay vuelos registrados</p>
              </div>
            )}
            {vuelosF.map(v => {
              const isOpen = vueloExpandido === v.id
              const meteo = v.condicionesMeteo || {}
              return (
                <div key={v.id} className={`bg-white rounded-xl border overflow-hidden transition-all shadow-sm ${v.incidencias ? 'border-l-4 border-l-red-400 border-slate-100' : 'border-slate-100'}`}>
                  {/* Cabecera siempre visible */}
                  <button onClick={() => setVueloExpandido(isOpen ? null : v.id)} className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Numero */}
                      <span className="font-mono text-sm font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg shrink-0">{v.numero}</span>
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">{v.piloto?.nombre} {v.piloto?.apellidos}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{v.drone?.codigo} — {v.drone?.marca} {v.drone?.modelo}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{formatFecha(v.fecha)}</span>
                          {v.horaInicio && <span className="text-xs text-slate-400">{v.horaInicio}{v.horaFin ? ` → ${v.horaFin}` : ''}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_VUELO[v.estado]?.color}`}>{ESTADO_VUELO[v.estado]?.label}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{TIPO_OPERACION[v.tipoOperacion]}</span>
                          {v.categoriaAESA && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{v.categoriaAESA.replace('_', ' ')}</span>}
                          {v.duracionMinutos && <span className="text-[10px] text-slate-500">{formatHoras(v.duracionMinutos)}</span>}
                          {v.alturaMaxima && <span className="text-[10px] text-slate-500">Alt. max: {v.alturaMaxima}m</span>}
                          {v.municipio && <span className="text-[10px] text-slate-400">{v.municipio}</span>}
                        </div>
                      </div>
                      {/* Indicadores */}
                      <div className="flex items-center gap-2 shrink-0">
                        {v.checklist?.completado
                          ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100"><CheckCircle2 size={10} />Checklist OK</span>
                          : <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><AlertTriangle size={10} />Sin checklist</span>
                        }
                        {v.notamConsultado && <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">NOTAMs OK</span>}
                        {v.incidencias && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Incidencia</span>}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>
                  {/* Detalle expandible */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      <div className="px-5 py-4 space-y-4">
                        {/* Grid principal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Aeronave y piloto */}
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Aeronave</p>
                            <p className="text-sm font-bold text-teal-700">{v.drone?.codigo}</p>
                            <p className="text-xs text-slate-600">{v.drone?.marca} {v.drone?.modelo}</p>
                            {v.drone?.matriculaAESA && <p className="text-[10px] text-slate-400 mt-1">Mat: {v.drone.matriculaAESA}</p>}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Piloto al mando</p>
                            <p className="text-sm font-bold text-slate-800">{v.piloto?.nombre} {v.piloto?.apellidos}</p>
                            {v.numeroVccOperador && <p className="text-[10px] text-slate-500 mt-1">Operador: {v.numeroVccOperador}</p>}
                            {v.personalApoyo && <p className="text-[10px] text-slate-400 mt-0.5">Apoyo: {v.personalApoyo}</p>}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Tiempos</p>
                            <p className="text-sm font-bold text-slate-800">{formatFecha(v.fecha)}</p>
                            <p className="text-xs text-slate-600">{v.horaInicio || '—'} → {v.horaFin || '—'}</p>
                            {v.duracionMinutos && <p className="text-[10px] text-teal-600 font-bold mt-1">{formatHoras(v.duracionMinutos)} de vuelo</p>}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Alturas</p>
                            <div className="flex items-end gap-3">
                              <div><p className="text-[10px] text-slate-400">Max</p><p className="text-sm font-bold text-slate-800">{v.alturaMaxima ? `${v.alturaMaxima}m` : '—'}</p></div>
                              <div><p className="text-[10px] text-slate-400">Media</p><p className="text-sm font-bold text-slate-600">{v.alturaMedia ? `${v.alturaMedia}m` : '—'}</p></div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{v.condicionesVuelo?.replace('_', ' ') || '—'}</p>
                          </div>
                        </div>
                        {/* Zona de operacion */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Zona de operacion</p>
                            <div className="space-y-1">
                              {v.lugarDespegue && <p className="text-xs text-slate-600"><span className="text-slate-400">Despegue:</span> {v.lugarDespegue}</p>}
                              {v.lugarAterrizaje && <p className="text-xs text-slate-600"><span className="text-slate-400">Aterrizaje:</span> {v.lugarAterrizaje}</p>}
                              {v.zonaAerea && <p className="text-xs text-slate-600"><span className="text-slate-400">Zona aerea:</span> {v.zonaAerea}</p>}
                              {v.municipio && <p className="text-xs text-slate-600"><span className="text-slate-400">Municipio:</span> {v.municipio}</p>}
                              {v.descripcionZona && <p className="text-xs text-slate-500 mt-1 italic">{v.descripcionZona}</p>}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Meteorologia</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {meteo.viento && <p className="text-xs text-slate-600"><span className="text-slate-400">Viento:</span> {meteo.viento} km/h</p>}
                              {meteo.visibilidad && <p className="text-xs text-slate-600"><span className="text-slate-400">Visib:</span> {meteo.visibilidad}m</p>}
                              {meteo.temperatura && <p className="text-xs text-slate-600"><span className="text-slate-400">Temp:</span> {meteo.temperatura}°C</p>}
                              {meteo.condicion && <p className="text-xs text-slate-600 capitalize">{meteo.condicion?.replace('_', ' ')}</p>}
                            </div>
                          </div>
                        </div>
                        {/* Mision */}
                        {(v.objetivoMision || v.resultadoMision) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {v.objetivoMision && <div className="bg-white rounded-lg p-3 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Objetivo</p><p className="text-xs text-slate-600">{v.objetivoMision}</p></div>}
                            {v.resultadoMision && <div className="bg-white rounded-lg p-3 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Resultado</p><p className="text-xs text-slate-600">{v.resultadoMision}</p></div>}
                          </div>
                        )}
                        {/* NOTAMs + Incidencias */}
                        <div className="flex flex-wrap gap-3">
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${v.notamConsultado ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            {v.notamConsultado ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                            NOTAMs {v.notamConsultado ? 'consultados' : 'NO consultados'}
                            {v.notamReferencia && <span className="font-mono">{v.notamReferencia}</span>}
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${v.checklist?.completado ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                            <CheckCircle2 size={12} />
                            Checklist pre-vuelo {v.checklist?.completado ? 'completada' : 'pendiente'}
                          </div>
                        </div>
                        {v.incidencias && (
                          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1">Incidencias registradas</p>
                            <p className="text-xs text-red-700">{v.incidencias}</p>
                          </div>
                        )}
                        {v.observaciones && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Observaciones</p>
                            <p className="text-xs text-slate-600">{v.observaciones}</p>
                          </div>
                        )}
                        {/* Acciones */}
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => { setVueloSeleccionado(v); setChecklistData(v.checklist || { items: {}, firmadoPor: '', observaciones: '' }); setShowChecklist(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"><CheckCircle2 size={12} />Ver checklist</button>
                          <button onClick={() => { setVueloSeleccionado(v); setShowDetalleVuelo(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700"><Eye size={12} />Detalle completo</button>
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

      {/* ─── MANTENIMIENTO ─── */}
      {tab === 'mantenimiento' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{mantenimientos.length} registros de mantenimiento</p>
            <button onClick={() => setShowNuevoMant(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700"><Plus size={14} />Registrar mantenimiento</button>
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
                      <td className="px-4 py-3 text-xs font-bold text-teal-700">{m.drone?.codigo}</td>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />Vuelo reg.
                </span>
              </div>
              <button
                onClick={consultarNotamsENAIRE}
                disabled={cargandoNotams}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
                  const sel = notamSeleccionado?.referencia === n.referencia
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
            // Parser NOTAMs ICAO: las fechas vienen de fechaInicio/fechaFin, la descripción de itemE (n.descripcion)
            const rawDesc = (n.descripcionHtml || n.descripcion || '')
            const descLimpia = rawDesc.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim()
            const desde = n.fechaInicio ? new Date(n.fechaInicio).toLocaleString('es-ES', {dateStyle:'short',timeStyle:'short'}) : null
            const hasta = n.fechaFin ? new Date(n.fechaFin).toLocaleString('es-ES', {dateStyle:'short',timeStyle:'short'}) : null
            const horario: string | null = null
            const descripcionFinal = descLimpia || 'Sin descripción disponible'
            const hoy = n.fechaFin && new Date(n.fechaFin) < new Date(Date.now() + 24*3600*1000)
            return (
              <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
                <div className={`h-1 w-full ${hoy ? 'bg-yellow-400' : 'bg-red-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-teal-100 rounded-xl"><Bell className="w-4 h-4 text-teal-600" /></div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{n.referencia || 'NOTAM sin referencia'}</p>
                        <p className="text-xs text-slate-500">{n.fuente}{n.tipo ? ` · ${n.tipo}` : ''}{n.estado ? ` · ${n.estado}` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => setNotamSeleccionado(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
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
                  const sel = notamSeleccionado?.referencia === n.referencia
                  const rawD = (n.descripcionHtml || n.descripcion || '').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim()
                  return (
                    <div
                      key={n.id}
                      onClick={() => setNotamSeleccionado(sel ? null : n)}
                      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${sel ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${vencido ? 'bg-slate-300' : hoy ? 'bg-yellow-400' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold ${sel ? 'text-teal-700' : 'text-slate-800'}`}>{n.referencia || 'NOTAM'}</span>
                          {n.tipo && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{n.tipo}</span>}
                          {hoy && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">Vence hoy</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{rawD.slice(0, 120)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {n.alturaMax != null && <p className="text-[10px] font-semibold text-orange-600">↑{n.alturaMax} ft</p>}
                        {n.fechaFin && <p className="text-[10px] text-slate-400">{new Date(n.fechaFin).toLocaleDateString('es-ES')}</p>}
                      </div>
                      <ChevronRight size={14} className={sel ? 'text-teal-400' : 'text-slate-200'} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {notams.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
              <Bell size={24} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin NOTAMs activos · <button onClick={consultarNotamsENAIRE} className="text-teal-600 hover:underline font-semibold">Actualizar ENAIRE</button></p>
            </div>
          )}
        </div>
      )}

      {/* ─── CHECK PRE-VUELO ─── */}
      {tab === 'checklist' && (() => {
        const SECCIONES_CHECK = [
          {
            id: 'aeronave', label: 'Aeronave', icon: '✈',
            color: "teal",
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
          purple: 'bg-teal-50 border-teal-100 text-teal-700',
          blue: 'bg-blue-50 border-blue-100 text-blue-700',
          orange: 'bg-orange-50 border-orange-100 text-orange-700',
          green: 'bg-green-50 border-green-100 text-green-700',
          sky: 'bg-sky-50 border-sky-100 text-sky-700',
          red: 'bg-red-50 border-red-100 text-red-700',
        }
        const headerColor: Record<string, string> = {
          purple: 'text-teal-700', blue: 'text-blue-700', orange: 'text-orange-700',
          green: 'text-green-700', sky: 'text-sky-700', red: 'text-red-700',
        }

        return (
          <div className="space-y-5">
            {/* Cabecera con progreso */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 justify-between mb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900">Lista de verificación pre-vuelo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Normativa AESA · Reglamento UE 2019/947 (EASA) · {totalItems} verificaciones · 6 secciones</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetChecklist} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-semibold">
                    <RefreshCw size={12} />Nueva verificación
                  </button>
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${aptoVuelo ? 'bg-green-500 border-green-500 text-white shadow-md' : fallidos > 0 ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {aptoVuelo ? <><CheckCircle2 size={15} />APTO PARA VUELO</> : fallidos > 0 ? <><AlertTriangle size={15} />NO APTO</> : `${marcados} / ${totalItems}`}
                  </div>
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${aptoVuelo ? 'bg-green-500' : fallidos > 0 ? 'bg-red-400' : 'bg-teal-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 w-10 text-right">{pct}%</span>
              </div>
              <div className="flex gap-4 mt-3">
                <span className="text-[11px] text-green-600 font-semibold">{marcados} OK</span>
                {fallidos > 0 && <span className="text-[11px] text-red-600 font-semibold">{fallidos} NO</span>}
                <span className="text-[11px] text-slate-400">— {totalItems - marcados - fallidos} pendientes</span>
              </div>
              {/* Datos vuelo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Piloto al mando</label>
                  <select value={piloCheck} onChange={e => setPiloCheck(e.target.value)} className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"><option value="">Seleccionar piloto...</option>{pilotos.map(p => <option key={p.id} value={`${p.nombre} ${p.apellidos}`}>{p.nombre} {p.apellidos}{p.externo ? " (externo)" : ""}</option>)}</select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Aeronave</label>
                  <select value={droneCheck} onChange={e => setDroneCheck(e.target.value)} className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400">
                    <option value="">Seleccionar drone...</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.modelo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</label>
                  <input value={notasCheck} onChange={e => setNotasCheck(e.target.value)} placeholder="Notas adicionales..." className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
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
                  <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 ${secOK === secTotal && secNOK === 0 ? 'bg-green-50' : secNOK > 0 ? 'bg-red-50/60' : 'bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${colorMap[sec.color]}`}>
                        {(() => { const icons: Record<string, any> = { Drone: DroneIcon, Radio, Map, User, Wind, AlertTriangle }; const Icon = icons[sec.icon]; return Icon ? <Icon size={15} /> : null })()}
                      </div>
                      <div>
                        <p className={`text-sm font-black ${headerColor[sec.color]}`}>{sec.label}</p>
                        <p className="text-[10px] text-slate-400">{secTotal} verificaciones</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {secOK === secTotal && secNOK === 0
                        ? <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-xl"><CheckCircle2 size={13} />Sección completa</span>
                        : <>
                            {secOK > 0 && <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-xl"><Check size={11} />{secOK}</span>}
                            {secNOK > 0 && <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-xl"><X size={11} />{secNOK} NO</span>}
                            <span className="text-[11px] text-slate-400">{secTotal - secOK - secNOK} pend.</span>
                          </>
                      }
                      {/* Mini barra progreso sección */}
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
                        <div className={`h-full rounded-full transition-all ${secNOK > 0 ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${Math.round((secOK / secTotal) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sec.items.map((item, idx) => {
                      const estado = secChecks[item.id]
                      const esOK = estado === true
                      const esNO = estado === false
                      const esPendiente = estado === null || estado === undefined
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 px-5 py-4 transition-all duration-150 ${esOK ? 'bg-green-50' : esNO ? 'bg-red-50' : 'bg-white hover:bg-slate-50/60'}`}
                        >
                          {/* Indicador estado */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[11px] transition-all ${esOK ? 'bg-green-500 text-white shadow-sm' : esNO ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                            {esOK ? <Check size={14} strokeWidth={3} /> : esNO ? <X size={14} strokeWidth={3} /> : String(idx + 1).padStart(2, '0')}
                          </div>
                          {/* Texto del ítem */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold leading-snug ${esOK ? 'text-green-900' : esNO ? 'text-red-900' : 'text-slate-800'}`}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold tracking-wider uppercase">{item.normativa}</p>
                          </div>
                          {/* Botones OK / NO */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                            <button
                              onClick={() => setCheck(sec.id, item.id, esOK ? null : true)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 border-2 min-w-[64px] justify-center ${esOK ? 'bg-green-500 border-green-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50'}`}
                            >
                              <Check size={12} strokeWidth={3} />OK
                            </button>
                            <button
                              onClick={() => setCheck(sec.id, item.id, esNO ? null : false)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 border-2 min-w-[64px] justify-center ${esNO ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-red-400 hover:text-red-600 hover:bg-red-50'}`}
                            >
                              <X size={12} strokeWidth={3} />NO
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
                    {aptoVuelo ? 'Aeronave apta para operación de vuelo' : fallidos > 0 ? 'Operación NO autorizada — Subsanar ítems marcados NO' : 'Checklist pendiente de completar'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {piloCheck && `Piloto: ${piloCheck} · `}
                    {new Date().toLocaleString('es-ES', {dateStyle: 'long', timeStyle: 'short'})}
                  </p>
                </div>
                {aptoVuelo && (
                  <button
                    onClick={() => { if (!droneCheck) { alert('Selecciona una aeronave'); return }; setShowChecklist(false); setShowNuevoVuelo(true) }}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Crear drone'}</button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-xs font-bold text-teal-700">{label}</p>
                      <input name={`${key}Num`} placeholder="Nº certificado" className={inputCls} />
                      <input name={`${key}Cad`} type="date" placeholder="Caducidad" className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelCls}>Seguro RC — Nº póliza</label><input name="seguroRCNumero" className={inputCls} /></div>
                <div><label className={labelCls}>Seguro RC — Vigencia</label><input name="seguroRCVigencia" type="date" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNuevoPiloto(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar piloto'}</button>
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
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registrar vuelo — Parte AESA</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${pasoNuevoVuelo === 1 ? 'text-teal-600' : 'text-gray-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${pasoNuevoVuelo === 1 ? 'bg-teal-600 text-white' : 'bg-green-500 text-white'}`}>1</span>
                    Datos del vuelo
                  </div>
                  <div className="w-8 h-0.5 bg-gray-200" />
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${pasoNuevoVuelo === 2 ? 'text-teal-600' : 'text-gray-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${pasoNuevoVuelo === 2 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                    Checklist pre-vuelo
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => { setShowNuevoVuelo(false); setPasoNuevoVuelo(1); setVueloFormData(null); setChecklistNuevo({}) }}><X size={20} className="text-slate-400" /></button>
            </div>
            {pasoNuevoVuelo === 1 && <form onSubmit={handlePaso1Vuelo} className="p-6 space-y-5">
              {/* Aeronave y piloto */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><DroneIcon size={12} />Aeronave y piloto</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Drone *</label>
                    <select name="droneId" required className={inputCls} value={droneSeleccionadoWizard} onChange={e => { setDroneSeleccionadoWizard(e.target.value); setBateriasSeleccionadas({}) }}>
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
                {/* Selector de baterias */}
                {droneSeleccionadoWizard && (() => {
                  const droneActual = drones.find(d => d.id === droneSeleccionadoWizard)
                  const droneCompat = droneActual?.modelo?.toLowerCase().includes('mini') ? 'mini'
                    : droneActual?.modelo?.toLowerCase().includes('pro') ? 'pro' : 'universal'
                  const batsDisponibles = todasBaterias.filter((b: Bateria) =>
                    b.estado === 'operativa' &&
                    (b.compatibilidad === 'universal' || b.compatibilidad === droneCompat || b.compatibilidad === droneActual?.modelo)
                  )
                  if (batsDisponibles.length === 0) return null
                  return (
                    <div className="mt-3 border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Baterias a usar en este vuelo</p>
                        <p className="text-[10px] text-slate-400">Marca las baterias y registra los minutos de uso</p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {batsDisponibles.map((b: Bateria) => {
                          const pct = Math.round((b.ciclosActuales / b.ciclosMaximos) * 100)
                          const isSelected = bateriasSeleccionadas[b.id] !== undefined
                          return (
                            <div key={b.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setBateriasSeleccionadas(prev => ({ ...prev, [b.id]: 0 }))
                                  } else {
                                    setBateriasSeleccionadas(prev => { const n = { ...prev }; delete n[b.id]; return n })
                                  }
                                }}
                                className="w-4 h-4 accent-teal-600 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-800">{b.codigo}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pct < 70 ? 'bg-green-100 text-green-700' : pct < 90 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                    {b.ciclosActuales}/{b.ciclosMaximos} ciclos ({pct}%)
                                  </span>
                                  {b.minutosVuelo !== undefined && <span className="text-[10px] text-slate-400">{Math.round((b.minutosVuelo || 0) / 60)}h {(b.minutosVuelo || 0) % 60}min totales</span>}
                                  {b.capacidadMah && <span className="text-[10px] text-slate-400">{b.capacidadMah} mAh</span>}
                                </div>
                                <div className="mt-1 h-1 bg-slate-100 rounded-full w-32">
                                  <div className={`h-full rounded-full ${pct < 70 ? 'bg-green-400' : pct < 90 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <label className="text-xs text-slate-500">Minutos usados:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="180"
                                    placeholder="30"
                                    value={bateriasSeleccionadas[b.id] || ''}
                                    onChange={e => setBateriasSeleccionadas(prev => ({ ...prev, [b.id]: parseInt(e.target.value) || 0 }))}
                                    className="w-20 border border-teal-200 rounded-lg px-2 py-1 text-sm text-center font-bold text-teal-700 bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {Object.keys(bateriasSeleccionadas).length > 0 && (
                        <div className="bg-teal-50 px-4 py-2 border-t border-teal-100">
                          <p className="text-xs text-teal-700 font-medium">
                            {Object.keys(bateriasSeleccionadas).length} bateria/s seleccionada/s · Total: {Object.values(bateriasSeleccionadas).reduce((a, b) => a + b, 0)} min
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              {/* Identificacion AESA */}
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <p className="text-xs font-bold text-teal-700 uppercase mb-3 flex items-center gap-2"><Shield size={12} />Identificacion AESA / Operador</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Categoria AESA *</label>
                    <select name="categoriaAESA" required className={inputCls}>
                      <option value="">— Seleccionar —</option>
                      <option value="OPEN_A1">OPEN A1 — Sobre personas no implicadas</option>
                      <option value="OPEN_A2">OPEN A2 — Cerca de personas</option>
                      <option value="OPEN_A3">OPEN A3 — Lejos de personas</option>
                      <option value="SPECIFIC_STS01">SPECIFIC STS-01</option>
                      <option value="SPECIFIC_STS02">SPECIFIC STS-02</option>
                      <option value="SPECIFIC_PDRA">SPECIFIC PDRA</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Nº Operador UAS / VCC</label><input name="numeroVccOperador" placeholder="ESP-OP-XXXXXXXX" className={inputCls} /></div>
                </div>
              </div>
              {/* Fecha y hora */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Calendar size={12} />Fecha y horas de vuelo</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className={labelCls}>Fecha *</label><input name="fecha" type="date" required defaultValue={new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Madrid'})} className={inputCls} /></div>
                  <div><label className={labelCls}>Hora inicio</label><input name="horaInicio" type="time" className={inputCls} /></div>
                  <div><label className={labelCls}>Hora fin</label><input name="horaFin" type="time" className={inputCls} /></div>
                  <div><label className={labelCls}>Duracion (min)</label><input name="duracionMinutos" type="number" placeholder="30" className={inputCls} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div><label className={labelCls}>Tipo operacion *</label>
                    <select name="tipoOperacion" required className={inputCls}>
                      {Object.entries(TIPO_OPERACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Condiciones de vuelo</label>
                    <select name="condicionesVuelo" className={inputCls}>
                      <option value="VLOS_DIA">VLOS diurno</option>
                      <option value="VLOS_NOCHE">VLOS nocturno</option>
                      <option value="EVLOS">EVLOS</option>
                      <option value="BVLOS">BVLOS (requiere autorizacion)</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Zona de vuelo */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><MapPin size={12} />Zona de operacion</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Lugar de despegue</label><input name="lugarDespegue" placeholder="Ej: Parque Municipal Bormujos" className={inputCls} /></div>
                  <div><label className={labelCls}>Lugar de aterrizaje</label><input name="lugarAterrizaje" placeholder="Ej: Mismo punto de despegue" className={inputCls} /></div>
                  <div><label className={labelCls}>Municipio</label><input name="municipio" defaultValue="Bormujos" className={inputCls} /></div>
                  <div><label className={labelCls}>Zona aerea (ENAIRE)</label><input name="zonaAerea" placeholder="Ej: U-SPACE, CTR Sevilla, TMA..." className={inputCls} /></div>
                  <div><label className={labelCls}>Altura maxima (m)</label><input name="alturaMaxima" type="number" placeholder="120" className={inputCls} /></div>
                  <div><label className={labelCls}>Altura media (m)</label><input name="alturaMedia" type="number" placeholder="60" className={inputCls} /></div>
                  <div>
                    <label className={labelCls}>Latitud despegue</label>
                    <input name="latitudInicio" type="number" step="0.000001" id="latitudInicio" defaultValue="37.3710" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Longitud despegue</label>
                    <input name="longitudInicio" type="number" step="0.000001" id="longitudInicio" defaultValue="-6.0719" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <button type="button" disabled={geolocalizando} onClick={() => {
                      if (!navigator.geolocation) { alert('Geolocalización no disponible en este dispositivo'); return }
                      setGeolocalizando(true)
                      navigator.geolocation.getCurrentPosition(
                        pos => {
                          const lat = pos.coords.latitude
                          const lon = pos.coords.longitude
                          const latInput = document.getElementById('latitudInicio') as HTMLInputElement
                          const lonInput = document.getElementById('longitudInicio') as HTMLInputElement
                          if (latInput) latInput.value = lat.toFixed(6)
                          if (lonInput) lonInput.value = lon.toFixed(6)
                          setGeolocalizando(false)
                          consultarNotamsZona(lat, lon)
                        },
                        err => { alert('No se pudo obtener la ubicación. Asegúrate de que la app tiene permisos de localización.'); setGeolocalizando(false) },
                        { enableHighAccuracy: true, timeout: 10000 }
                      )
                    }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${geolocalizando ? 'bg-slate-100 text-slate-400' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                      <MapPin size={14} />
                      {geolocalizando ? 'Obteniendo ubicación...' : 'Usar mi ubicación GPS'}
                    </button>
                  </div>
                </div>
                <div className="mt-3"><label className={labelCls}>Descripcion de la zona / area de operacion</label><textarea name="descripcionZona" rows={2} placeholder="Descripcion detallada del area de operacion, puntos de referencia..." className={inputCls} /></div>
              </div>
              {/* Mision */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><ClipboardList size={12} />Mision</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Objetivo de la mision</label><textarea name="objetivoMision" rows={2} placeholder="Describe el objetivo operativo de este vuelo..." className={inputCls} /></div>
                  <div><label className={labelCls}>Personal de apoyo en tierra</label><input name="personalApoyo" placeholder="Nombres del personal de apoyo" className={inputCls} /></div>
                </div>
              </div>
              {/* Condiciones meteorologicas */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Wind size={12} />Condiciones meteorologicas</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className={labelCls}>Viento (km/h)</label><input name="viento" type="number" placeholder="15" className={inputCls} /></div>
                  <div><label className={labelCls}>Visibilidad (m)</label><input name="visibilidad" type="number" placeholder="5000" className={inputCls} /></div>
                  <div><label className={labelCls}>Temperatura (C)</label><input name="temperatura" type="number" className={inputCls} /></div>
                  <div><label className={labelCls}>Condicion</label>
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
                <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Bell size={12} />NOTAMs y espacio aereo</p>
                {consultandoNotams && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                    <span className="text-xs text-blue-600 font-medium animate-pulse">Consultando NOTAMs en ENAIRE...</span>
                  </div>
                )}
                {notamsZona.length > 0 && (
                  <div className="mb-3 border border-amber-200 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{notamsZona.length} NOTAM{notamsZona.length > 1 ? 's' : ''} activo{notamsZona.length > 1 ? 's' : ''} en tu zona (25km)</p>
                      <span className="text-[10px] text-amber-600 font-medium">Fuente: ENAIRE</span>
                    </div>
                    <div className="divide-y divide-amber-50 max-h-48 overflow-y-auto">
                      {notamsZona.map((n: any, i: number) => (
                        <div key={i} className="px-4 py-2.5 bg-white">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-bold text-amber-700">{n.referencia}</span>
                            <span className="text-[10px] text-slate-500">{n.tipo}</span>
                            {n.fechaFin && <span className="text-[10px] text-slate-400">hasta {new Date(n.fechaFin).toLocaleDateString('es-ES')}</span>}
                          </div>
                          <p className="text-xs text-slate-600 truncate">{n.descripcion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <input type="checkbox" name="notamConsultado" id="notamCons" className="w-4 h-4 accent-teal-600" required />
                  <label htmlFor="notamCons" className="text-sm text-slate-700 font-medium">Confirmo que he consultado los NOTAMs vigentes en ENAIRE para esta operacion</label>
                </div>
                <div><label className={labelCls}>Referencia NOTAM (si aplica)</label><input name="notamReferencia" id="notamReferenciaInput" placeholder="Se rellenará automáticamente al usar GPS..." className={inputCls} /></div>
              </div>
              {/* Incidencias y observaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelCls}>Incidencias durante el vuelo</label><textarea name="incidencias" rows={2} placeholder="Ninguna / descripcion de incidencias..." className={inputCls} /></div>
                <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} className={inputCls} /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowNuevoVuelo(false); setPasoNuevoVuelo(1) }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700">Continuar a Checklist</button>
              </div>
            </form>}
            {pasoNuevoVuelo === 2 && vueloFormData && (() => {
              const todosItems = CHECKLIST_SECCIONES_NUEVO.flatMap((s: any) => s.items.map((i: any) => i.id))
              const completados = todosItems.filter((id: string) => checklistNuevo[id]).length
              const total = todosItems.length
              const todoOk = completados === total
              return (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Completa todos los items antes de registrar el vuelo</p>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${todoOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{completados}/{total} items</span>
                  </div>
                  {!todoOk && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-red-600 text-xs font-semibold">Todos los items son obligatorios para poder registrar el vuelo</span>
                    </div>
                  )}
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {CHECKLIST_SECCIONES_NUEVO.map((seccion: any) => (
                      <div key={seccion.id} className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{seccion.label}</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {seccion.items.map((item: any) => (
                            <label key={item.id} className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checklistNuevo[item.id] ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={checklistNuevo[item.id] || false} onChange={e => setChecklistNuevo(prev => ({ ...prev, [item.id]: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0" />
                              <span className={`text-sm ${checklistNuevo[item.id] ? 'text-green-700 line-through opacity-70' : 'text-slate-700'}`}>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setPasoNuevoVuelo(1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Volver a datos</button>
                    <button type="button" onClick={handleNuevoVuelo} disabled={saving || !todoOk} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${todoOk ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {saving ? 'Registrando...' : todoOk ? 'Registrar vuelo' : `Faltan ${total - completados} items`}
                    </button>
                  </div>
                </div>
              )
            })()}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button>
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
                  <div className="p-2 bg-teal-100 rounded-lg"><Bell className="w-5 h-5 text-teal-600" /></div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Circle
                          center={[notamSeleccionado.latitud, notamSeleccionado.longitud]}
                          radius={2000}
                          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.5, weight: 3 }}
                        >
                          <Popup>{notamSeleccionado.referencia || 'NOTAM'}</Popup>
                        </Circle>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar NOTAM'}</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─── INVENTARIO ─── */}
      {tab === 'inventario' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {[{key:'stock',label:'Stock',icon:Package},{key:'peticiones',label:'Peticiones',icon:ShoppingCart},{key:'movimientos',label:'Movimientos',icon:History}].map(t => (
              <button key={t.key} onClick={() => setInventoryTab(t.key as any)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${inventoryTab === t.key ? 'border-teal-500 text-teal-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800'}`}><t.icon className="w-4 h-4" />{t.label}</button>
            ))}
          </div>
          {inventoryTab === 'stock' && (
            <div className="p-5">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar artículos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <select value={selectedFamiliaFilter} onChange={e => setSelectedFamiliaFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"><option value="all">Todas las familias</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"><Plus className="w-4 h-4" />Artículo</button>
                <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900"><Layers className="w-4 h-4" />Familias</button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100"><th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Artículo</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Familia</th><th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th><th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th><th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {articulos.filter(a => (selectedFamiliaFilter === 'all' || a.familiaId === selectedFamiliaFilter) && (searchTerm === '' || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()))).length === 0
                    ? <tr><td colSpan={5} className="text-center py-12 text-slate-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No hay artículos registrados</p></td></tr>
                    : articulos.filter(a => (selectedFamiliaFilter === 'all' || a.familiaId === selectedFamiliaFilter) && (searchTerm === '' || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()))).map(art => (
                      <tr key={art.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3"><p className="font-medium text-slate-800">{art.nombre}</p>{art.codigo && <p className="text-xs text-slate-400">{art.codigo}</p>}</td>
                        <td className="px-4 py-3 text-slate-500">{art.familia?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-center"><span className={`text-lg font-bold ${art.stockActual <= art.stockMinimo ? 'text-red-600' : 'text-slate-800'}`}>{art.stockActual}</span><span className="text-slate-400 text-xs ml-1">/ {art.stockMinimo}</span></td>
                        <td className="px-4 py-3 text-center">{art.stockActual <= art.stockMinimo ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" />Bajo</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" />OK</span>}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => { setArticuloSeleccionado(art); setShowEditarArticulo(true) }} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg"><Edit className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {inventoryTab === 'peticiones' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"><Plus className="w-4 h-4" />Nueva Petición</button>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {peticiones.length === 0 ? <div className="text-center py-12 text-slate-400"><ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No hay peticiones</p></div>
                : peticiones.map(pet => (
                  <div key={pet.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-slate-400">{pet.numero}</span><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">{pet.estado}</span></div>
                    <p className="font-medium text-slate-800">{pet.nombreArticulo}</p>
                    <p className="text-sm text-slate-500">{pet.cantidad} {pet.unidad} · {new Date(pet.fechaSolicitud).toLocaleDateString('es-ES')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inventoryTab === 'movimientos' && <div className="p-12 text-center text-slate-400"><History className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Historial de movimientos</p><p className="text-sm mt-1">Los movimientos de stock se registrarán aquí</p></div>}
        </div>
      )}

      {/* Modal Detalle Vuelo */}
      {showEditarVuelo && vueloSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Editar vuelo {vueloSeleccionado.numero}</h3>
                <p className="text-xs text-slate-500">Actualiza los datos del vuelo. Si registras hora fin → estado Completado. Si hay incidencias → estado Incidencia.</p>
              </div>
              <button onClick={() => setShowEditarVuelo(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleGuardarVuelo} className="p-6 space-y-5">
              {/* Estado */}
              <div>
                <label className={labelCls}>Estado del vuelo</label>
                <select name="estado" defaultValue={vueloSeleccionado.estado} className={inputCls}>
                  <option value="planificado">Planificado</option>
                  <option value="en_curso">En curso</option>
                  <option value="completado">Completado</option>
                  <option value="incidencia">Incidencia</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Se actualiza automaticamente: hora fin registrada → Completado · incidencias → Incidencia</p>
              </div>
              {/* Horas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Hora inicio</label>
                  <input name="horaInicio" type="time" defaultValue={vueloSeleccionado.horaInicio || ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Hora fin</label>
                  <input name="horaFin" type="time" defaultValue={vueloSeleccionado.horaFin || ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Duracion (min)</label>
                  <input name="duracionMinutos" type="number" defaultValue={vueloSeleccionado.duracionMinutos || ''} className={inputCls} />
                </div>
              </div>
              {/* Resultado mision */}
              <div>
                <label className={labelCls}>Resultado de la mision</label>
                <textarea name="resultadoMision" rows={2} defaultValue={vueloSeleccionado.resultadoMision || ''} placeholder="Describe el resultado operativo del vuelo..." className={inputCls} />
              </div>
              {/* Incidencias */}
              <div>
                <label className={labelCls}>Incidencias durante el vuelo</label>
                <textarea name="incidencias" rows={2} defaultValue={vueloSeleccionado.incidencias || ''} placeholder="Si hubo incidencias describirlas aqui. El estado cambiara automaticamente a Incidencia." className={inputCls} />
              </div>
              {/* Observaciones */}
              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea name="observaciones" rows={2} defaultValue={vueloSeleccionado.observaciones || ''} className={inputCls} />
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditarVuelo(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetalleVuelo && vueloSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Vuelo {vueloSeleccionado.numero}</h3>
                <p className="text-sm text-slate-500">{new Date(vueloSeleccionado.fecha).toLocaleDateString('es-ES')}</p>
              </div>
              <button onClick={() => setShowDetalleVuelo(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Dron</p>
                  <p className="font-semibold text-slate-800">{vueloSeleccionado.drone?.nombre || vueloSeleccionado.drone?.codigo || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Piloto</p>
                  <p className="font-semibold text-slate-800">{vueloSeleccionado.piloto ? `${vueloSeleccionado.piloto.nombre} ${vueloSeleccionado.piloto.apellidos}` : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Tipo operación</p>
                  <p className="font-semibold text-slate-800">{TIPO_OPERACION[vueloSeleccionado.tipoOperacion] || vueloSeleccionado.tipoOperacion}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Estado</p>
                  <p className={`font-semibold ${ESTADO_VUELO[vueloSeleccionado.estado]?.color || 'text-slate-800'}`}>{ESTADO_VUELO[vueloSeleccionado.estado]?.label || vueloSeleccionado.estado}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Hora inicio</p>
                  <p className="font-semibold text-slate-800">{vueloSeleccionado.horaInicio || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Duración</p>
                  <p className="font-semibold text-slate-800">{vueloSeleccionado.duracionMinutos ? `${vueloSeleccionado.duracionMinutos} min` : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Municipio</p>
                  <p className="font-semibold text-slate-800">{vueloSeleccionado.municipio}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">NOTAM consultado</p>
                  <p className="font-semibold text-slate-800">{vueloSeleccionado.notamConsultado ? 'Sí' : 'No'}</p>
                </div>
              </div>
              {vueloSeleccionado.descripcionZona && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-1">Descripción zona</p>
                  <p className="text-slate-800">{vueloSeleccionado.descripcionZona}</p>
                </div>
              )}
              {vueloSeleccionado.incidencias && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs text-red-500 font-medium mb-1">Incidencias</p>
                  <p className="text-red-800">{vueloSeleccionado.incidencias}</p>
                </div>
              )}
              <div className="flex justify-between">
                <button onClick={() => { setShowDetalleVuelo(false); setShowEditarVuelo(true) }} className="px-6 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700">Editar vuelo</button>
                <button onClick={() => setShowDetalleVuelo(false)} className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Batería */}
      {showNuevaBateria && droneSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900">Nueva Batería — {droneSeleccionado.nombre}</h3>
              <button onClick={() => setShowNuevaBateria(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const form = e.currentTarget
              const f = new FormData(form)
              setSaving(true)
              const r = await fetch('/api/drones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'bateria',
                  droneId: droneSeleccionado.id,
                  codigo: f.get('codigo'),
                  capacidadMah: f.get('capacidadMah'),
                  ciclosMaximos: f.get('ciclosMaximos'),
                  estado: f.get('estado'),
                  observaciones: f.get('observaciones'),
                })
              })
              setSaving(false)
              if (r.ok) { setShowNuevaBateria(false); setDroneSeleccionado(null); cargarDatos() }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Código *</label><input name="codigo" required placeholder="BAT-001" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Capacidad (mAh)</label><input name="capacidadMah" type="number" placeholder="5000" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Ciclos máx.</label><input name="ciclosMaximos" type="number" defaultValue="200" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Estado</label>
                  <select name="estado" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    <option value="buena">Buena</option>
                    <option value="degradada">Degradada</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Observaciones</label><textarea name="observaciones" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevaBateria(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Añadir batería'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Artículo */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900">Nuevo artículo</h3>
              <button onClick={() => setShowNuevoArticulo(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const form = e.currentTarget
              const f = new FormData(form)
              setSaving(true)
              const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', nombre: f.get('nombre'), codigo: f.get('codigo'), stockActual: parseInt(f.get('stockActual') as string) || 0, stockMinimo: parseInt(f.get('stockMinimo') as string) || 0, unidad: f.get('unidad') || 'ud', familiaId: f.get('familiaId'), servicioId: 'default' }) })
              setSaving(false)
              if (r.ok) { setShowNuevoArticulo(false); cargarInventario() }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre *</label><input name="nombre" required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Código</label><input name="codigo" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Unidad</label><input name="unidad" defaultValue="ud" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Stock actual</label><input name="stockActual" type="number" defaultValue="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Stock mínimo</label><input name="stockMinimo" type="number" defaultValue="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Familia *</label>
                  <select name="familiaId" required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400">
                    <option value="">Seleccionar familia...</option>
                    {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Crear artículo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión Familias */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900">Gestión de familias</h3>
              <button onClick={() => setShowGestionFamilias(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={async e => {
                e.preventDefault()
                const form = e.currentTarget
                const f = new FormData(form)
                const nombre = f.get('nombre') as string
                if (!nombre?.trim() || !categoriaArea) return
                setSaving(true)
                const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', nombre: nombre.trim(), categoriaId: categoriaArea }) })
                setSaving(false)
                if (r.ok) { form.reset(); cargarInventario() }
              }} className="flex gap-2">
                <input name="nombre" placeholder="Nombre de la nueva familia..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">Añadir</button>
              </form>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {familias.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">No hay familias creadas</p>
                : familias.map(fam => (
                  <div key={fam.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{fam.nombre}</p>
                      <p className="text-xs text-slate-400">{articulos.filter(a => a.familiaId === fam.id).length} artículos</p>
                    </div>
                    <button onClick={async () => {
                      if (articulos.filter(a => a.familiaId === fam.id).length > 0) { alert('No se puede eliminar una familia con artículos'); return }
                      if (!confirm('¿Eliminar esta familia?')) return
                      await fetch(`/api/logistica?tipo=familia&id=${fam.id}`, { method: 'DELETE' })
                      cargarInventario()
                    }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setShowGestionFamilias(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Petición */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900">Nueva petición</h3>
              <button onClick={() => setShowNuevaPeticion(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const form = e.currentTarget
              const f = new FormData(form)
              setSaving(true)
              const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'peticion', nombreArticulo: f.get('nombreArticulo'), cantidad: parseInt(f.get('cantidad') as string) || 1, unidad: f.get('unidad') || 'ud', prioridad: f.get('prioridad') || 'normal', descripcion: f.get('descripcion'), areaOrigen: 'drones' }) })
              setSaving(false)
              if (r.ok) { setShowNuevaPeticion(false); cargarInventario() }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Material solicitado *</label>
                  <select name="nombreArticulo" required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400">
                    <option value="">Seleccionar artículo...</option>
                    {articulos.map(a => <option key={a.id} value={a.nombre}>{a.nombre} (stock: {a.stockActual})</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Cantidad *</label><input name="cantidad" type="number" min="1" defaultValue="1" required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Prioridad</label>
                  <select name="prioridad" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400">
                    <option value="baja">Baja</option>
                    <option value="normal" selected>Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Motivo</label><textarea name="descripcion" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Crear petición'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Artículo */}
      {showEditarArticulo && articuloSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900">Editar artículo</h3>
              <button onClick={() => setShowEditarArticulo(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form key={articuloSeleccionado.id} onSubmit={async e => {
              e.preventDefault()
              const form = e.currentTarget
              const f = new FormData(form)
              setSaving(true)
              const r = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', id: articuloSeleccionado.id, nombre: f.get('nombre'), codigo: f.get('codigo'), stockActual: parseInt(f.get('stockActual') as string) || 0, stockMinimo: parseInt(f.get('stockMinimo') as string) || 0, unidad: f.get('unidad') || 'ud', familiaId: f.get('familiaId') }) })
              setSaving(false)
              if (r.ok) { setShowEditarArticulo(false); setArticuloSeleccionado(null); cargarInventario() }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre *</label><input name="nombre" required defaultValue={articuloSeleccionado.nombre} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Código</label><input name="codigo" defaultValue={articuloSeleccionado.codigo || ''} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Unidad</label><input name="unidad" defaultValue={articuloSeleccionado.unidad || 'ud'} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Stock actual</label><input name="stockActual" type="number" defaultValue={articuloSeleccionado.stockActual} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Stock mínimo</label><input name="stockMinimo" type="number" defaultValue={articuloSeleccionado.stockMinimo} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Familia</label>
                  <select name="familiaId" defaultValue={articuloSeleccionado.familiaId} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400">
                    {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditarArticulo(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Piloto */}
      {showEditarPiloto && pilotoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900">Editar piloto</h3>
              <button onClick={() => setShowEditarPiloto(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form key={pilotoSeleccionado.id} onSubmit={handleEditarPiloto} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelCls}>Nombre *</label><input name="nombre" required defaultValue={pilotoSeleccionado.nombre} className={inputCls} /></div>
                <div><label className={labelCls}>Apellidos *</label><input name="apellidos" required defaultValue={pilotoSeleccionado.apellidos} className={inputCls} /></div>
                <div><label className={labelCls}>Email</label><input name="email" type="email" defaultValue={pilotoSeleccionado.email} className={inputCls} /></div>
                <div><label className={labelCls}>Teléfono</label><input name="telefono" defaultValue={pilotoSeleccionado.telefono} className={inputCls} /></div>
                <div><label className={labelCls}>Tipo</label>
                  <select name="externo" defaultValue={pilotoSeleccionado.externo ? 'true' : 'false'} className={inputCls}>
                    <option value="false">Voluntario PC Bormujos</option>
                    <option value="true">Piloto externo</option>
                  </select>
                </div>
                <div><label className={labelCls}>Seguro RC Nº</label><input name="seguroRCNumero" defaultValue={pilotoSeleccionado.seguroRCNumero} className={inputCls} /></div>
                <div><label className={labelCls}>Vigencia seguro RC</label><input name="seguroRCVigencia" type="date" defaultValue={pilotoSeleccionado.seguroRCVigencia?.slice(0,10)} className={inputCls} /></div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Certificaciones AESA</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[['A1A3','a1a3'],['A2','a2'],['STS01','sts01'],['STS02','sts02']].map(([label,key]) => {
                    const certs = typeof pilotoSeleccionado.certificaciones === 'string' ? JSON.parse(pilotoSeleccionado.certificaciones) : (pilotoSeleccionado.certificaciones || {})
                    const d = certs[label] || {}
                    return (
                      <div key={key} className="bg-slate-50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-bold text-teal-700">{label.replace('STS01','STS-01').replace('STS02','STS-02')}</p>
                        <input name={key+'Num'} placeholder="Nº certificado" defaultValue={d.numero} className={inputCls} />
                        <input name={key+'Cad'} type="date" placeholder="Caducidad" defaultValue={d.caducidad?.slice(0,10)} className={inputCls} />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={2} defaultValue={pilotoSeleccionado.observaciones} className={inputCls} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditarPiloto(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
