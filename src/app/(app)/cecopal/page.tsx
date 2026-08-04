'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import {
  Radio, Phone, AlertTriangle, Flame, Heart, Car, Waves, HelpCircle,
  Clock, Users, Truck, Shield, CheckCircle, MapPin,
  RefreshCw, Bell, FileText, Activity, Cloud, Wind, Droplets,
  Siren, Edit, Send, X, BookUser, Search, Plus, Trash2, Pencil,
  FlaskConical, ChevronDown, AlertOctagon, Flame as FlameIcon, Droplet, Wind as WindIcon,
  ShieldAlert, Eye, Zap, Package
} from 'lucide-react'
import { CLASES_ADR } from '@/data/adr-data'
import type { SustanciaADR } from '@/data/adr-data'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

const TIPOS_INCIDENCIA = [
  { value: 'accidente', label: 'Accidente', icon: Car, color: 'bg-orange-500' },
  { value: 'incendio', label: 'Incendio', icon: Flame, color: 'bg-red-500' },
  { value: 'sanitaria', label: 'Asistencia SVB', icon: Heart, color: 'bg-pink-500' },
  { value: 'inundacion', label: 'Inundación', icon: Waves, color: 'bg-blue-500' },
  { value: 'rescate', label: 'Rescate', icon: Shield, color: 'bg-purple-500' },
  { value: 'apoyo', label: 'Apoyo FFCCSS', icon: Radio, color: 'bg-indigo-500' },
  { value: 'prevencion', label: 'Prevención', icon: AlertTriangle, color: 'bg-amber-500' },
  { value: 'otros', label: 'Otros', icon: HelpCircle, color: 'bg-slate-500' },
]

const ORIGENES_AVISO = [
  { value: '112', label: '112', icon: Phone },
  { value: 'telefono', label: 'Teléfono', icon: Phone },
  { value: 'emisora', label: 'Emisora', icon: Radio },
  { value: 'presencial', label: 'Presencial', icon: Users },
]

const ISOCRONAS = [
  { campo: 'horaLlamada', label: 'T0 Llamada', color: 'bg-slate-600' },
  { campo: 'horaSalida', label: 'T1 Salida', color: 'bg-blue-600' },
  { campo: 'horaLlegada', label: 'T2 Llegada', color: 'bg-amber-600' },
  { campo: 'horaTerminado', label: 'T3 Finalizado', color: 'bg-emerald-600' },
  { campo: 'horaDisponible', label: 'T4 Disponible', color: 'bg-purple-600' },
]

function RelojDigital() {
  const [t, setT] = useState({ hora: '--:--:--', fecha: '' })
  useEffect(() => {
    const tick = () => {
      const ahora = new Date()
      const hora = ahora.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const fecha = ahora.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      setT({ hora, fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1) })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="text-right">
      <div className="text-3xl font-bold text-white font-mono tracking-wider">{t.hora}</div>
      <div className="text-blue-200 text-xs mt-0.5">{t.fecha}</div>
    </div>
  )
}

export default function CecopalPage() {
  const [turno, setTurno] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any>({ botiquines: [], deas: [], vehiculos: [] })
  // Varias incidencias activas en paralelo: lista + la seleccionada en pantalla.
  const [incidenciasActivas, setIncidenciasActivas] = useState<any[]>([])
  const [incidenciaSelId, setIncidenciaSelId] = useState<string | null>(null)
  const incidenciaActiva = incidenciasActivas.find(i => i.id === incidenciaSelId) || null
  const patchIncidencia = (id: string, patch: any) =>
    setIncidenciasActivas(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  const [editandoInc, setEditandoInc] = useState(false)
  const [editInc, setEditInc] = useState<any>({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<'turno' | 'nueva' | 'activa'>('turno')
  const [guardando, setGuardando] = useState(false)
  const [generandoParte, setGenerandoParte] = useState(false)
  const [novedadTexto, setNovedadTexto] = useState('')
  const [novedadTitulo, setNovedadTitulo] = useState('')
  const [novedadSel, setNovedadSel] = useState<any>(null)
  const [novedadEditando, setNovedadEditando] = useState(false)
  const [novedadEdit, setNovedadEdit] = useState({ titulo: '', descripcion: '' })
  const [guardandoNov, setGuardandoNov] = useState(false)
  const [alertasOpen, setAlertasOpen] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState('')
  const [origenSeleccionado, setOrigenSeleccionado] = useState('')
  const [direccion, setDireccion] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState<string[]>([])
  const [voluntariosSeleccionados, setVoluntariosSeleccionados] = useState<string[]>([])
  const [ubicacionesGPS, setUbicacionesGPS] = useState<any[]>([])
  const [meteo, setMeteo] = useState<any>(null)
  const [novedadesHoy, setNovedadesHoy] = useState<any[]>([])
  // ADR Mercancías Peligrosas
  const [adrOpen, setAdrOpen] = useState(false)
  const [adrQuery, setAdrQuery] = useState('')
  const [adrResultados, setAdrResultados] = useState<SustanciaADR[]>([])
  const [adrSel, setAdrSel] = useState<SustanciaADR | null>(null)
  const [adrBuscando, setAdrBuscando] = useState(false)

  const buscarADR = async (q: string) => {
    if (!q.trim()) { setAdrResultados([]); return }
    setAdrBuscando(true)
    try {
      const r = await fetch(`/api/adr?q=${encodeURIComponent(q)}`)
      const d = await r.json()
      setAdrResultados(d.resultados || [])
    } catch { setAdrResultados([]) } finally { setAdrBuscando(false) }
  }

  // Directorio CECOPAL
  const [dirContactos, setDirContactos] = useState<any[]>([])
  const [dirCategorias, setDirCategorias] = useState<any[]>([])
  const [dirBusqueda, setDirBusqueda] = useState('')
  const [dirCategoria, setDirCategoria] = useState('')
  const [dirModal, setDirModal] = useState<'nuevo' | 'editar' | 'categoria' | null>(null)
  const [dirContactoSel, setDirContactoSel] = useState<any>(null)
  const [dirForm, setDirForm] = useState<{ nombre: string; entidad: string; categoria: string; cargo: string; telefono: string; telefonoAlt: string; email: string; extension3cx: string; disponibilidad: string; notas: string; ambitos: string[] }>({ nombre: '', entidad: '', categoria: '', cargo: '', telefono: '', telefonoAlt: '', email: '', extension3cx: '', disponibilidad: '', notas: '', ambitos: ['cecopal'] })
  const [dirNuevaCat, setDirNuevaCat] = useState({ nombre: '', color: '#3b82f6' })
  // Pestaña de ámbito y proveedores
  const [dirTab, setDirTab] = useState<'todos' | 'accion_social' | 'cecopal' | 'proveedores'>('todos')

  const cargarDatos = useCallback(async () => {
    try {
      const [rTurno, rVeh, rAlerta, rInc, rNov] = await Promise.all([
        fetch('/api/cecopal?tipo=turno-hoy').then(r => r.json()),
        fetch('/api/cecopal?tipo=vehiculos-disponibles').then(r => r.json()),
        fetch('/api/cecopal?tipo=alertas').then(r => r.json()),
        fetch('/api/cecopal?tipo=incidencias-activas').then(r => r.json()),
        fetch('/api/cecopal?tipo=novedades-hoy').then(r => r.json()),
      ])
      setTurno(rTurno.guardias || [])
      setVehiculos(rVeh.vehiculos || [])
      setAlertas(rAlerta)
      const activas = rInc.incidencias || []
      setIncidenciasActivas(activas)
      if (activas.length) {
        // Conservar la seleccionada si sigue activa; si no, la primera.
        setIncidenciaSelId(prev => activas.some((i: any) => i.id === prev) ? prev : activas[0].id)
        setModo(m => m === 'nueva' ? m : 'activa')
      }
      setNovedadesHoy(rNov.novedades || [])
    } catch (e) { console.error('Error cargando datos CECOPAL:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    const fetchGPS = async () => {
      try {
        const res = await fetch('/api/vehiculos/ubicacion')
        const data = await res.json()
        setUbicacionesGPS(data.ubicaciones || [])
      } catch (e) { console.error('Error GPS CECOPAL:', e) }
    }
    fetchGPS()
    const iv = setInterval(fetchGPS, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const fetchMeteo = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.371&longitude=-6.071&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Europe/Madrid')
        const data = await res.json()
        setMeteo(data.current)
      } catch (e) { console.error('Error cargando meteo:', e) }
    }
    fetchMeteo()
    const iv = setInterval(fetchMeteo, 300000)
    return () => clearInterval(iv)
  }, [])

  const cargarDirectorio = async (busqueda = '', categoria = '') => {
    try {
      const p = new URLSearchParams()
      if (busqueda) p.set('busqueda', busqueda)
      if (categoria) p.set('categoria', categoria)
      const [rC, rCat] = await Promise.all([
        fetch('/api/directorio?' + p.toString()).then(r => r.json()),
        fetch('/api/directorio?tipo=categorias').then(r => r.json()),
      ])
      setDirContactos(rC.contactos || [])
      setDirCategorias(rCat.categorias || [])
    } catch { /* silencioso */ }
  }

  // Cargar el directorio al abrir la página.
  useEffect(() => { cargarDirectorio() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getMeteoIcon = (code: number) => {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅'
    if (code <= 48) return '🌫️'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '🌨️'
    if (code <= 82) return '🌦️'
    if (code <= 99) return '⛈️'
    return '🌡️'
  }

  const getMeteoDesc = (code: number) => {
    if (code === 0) return 'Despejado'
    if (code <= 3) return 'Parcialmente nublado'
    if (code <= 48) return 'Niebla'
    if (code <= 67) return 'Lluvia'
    if (code <= 77) return 'Nieve'
    if (code <= 82) return 'Chubascos'
    if (code <= 99) return 'Tormenta'
    return 'Variable'
  }

  const getHoraActual = () => new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })
  const WALKIES_LIST = ['WJ01', 'WJ02', ...Array.from({ length: 25 }, (_, i) => `W${String(i + 1).padStart(2, '0')}`)]
  const responsableTurno = turno.find(g => g.rol === 'Responsable' || g.rol === 'Apoyo/Cecopal' || g.rol === 'Cecopal')

  // Asigna un walkie a un indicativo al inicio del turno (queda registrado en la
  // guardia y se vuelca automáticamente al parte al generarlo).
  const asignarWalkie = async (guardiaId: string, walkie: string) => {
    setTurno(prev => prev.map(g => g.id === guardiaId ? { ...g, walkie } : g))
    try {
      await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'asignar-walkie', guardiaId, walkie }) })
    } catch (e) { console.error('Error asignando walkie:', e) }
  }

  // Desarrollo del servicio: texto que se va registrando durante la incidencia y
  // que se vuelca al cuerpo del parte (no se pierde nada de información).
  const guardarDesarrollo = (valor: string) => {
    if (!incidenciaActiva) return
    fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'actualizar', id: incidenciaActiva.id, desarrollo: valor }) }).catch(() => {})
  }
  const anadirHoraDesarrollo = () => {
    if (!incidenciaActiva) return
    const prev = incidenciaActiva.desarrollo || ''
    const nuevo = (prev ? prev.replace(/\s*$/, '') + '\n' : '') + `[${getHoraActual()}] `
    patchIncidencia(incidenciaActiva.id, { desarrollo: nuevo })
    guardarDesarrollo(nuevo)
  }
  const totalAlertas = (alertas.botiquines?.length || 0) + (alertas.deas?.length || 0) + (alertas.vehiculos?.length || 0)
  const tipoActivo = TIPOS_INCIDENCIA.find(t => t.value === incidenciaActiva?.tipoIncidencia)
  const TipoIcon = tipoActivo?.icon || AlertTriangle

  const activarIsocrona = async (campo: string) => {
    if (!incidenciaActiva || incidenciaActiva[campo]) return
    const valor = getHoraActual()
    patchIncidencia(incidenciaActiva.id, { [campo]: valor })
    await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'isocrona', id: incidenciaActiva.id, campo, valor }) })
  }

  const crearIncidencia = async () => {
    if (!tipoSeleccionado || !origenSeleccionado || !direccion) return
    setGuardando(true)
    try {
      const res = await fetch('/api/cecopal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'incidencia', tipoIncidencia: tipoSeleccionado, origenAviso: origenSeleccionado, direccion, descripcion, horaLlamada: getHoraActual(), vehiculosIds: vehiculosSeleccionados, voluntariosIds: voluntariosSeleccionados }) })
      const data = await res.json()
      if (data.incidencia) {
        setIncidenciasActivas(prev => [...prev, data.incidencia])
        setIncidenciaSelId(data.incidencia.id)
        setModo('activa')
        // Limpiar el formulario para una posible siguiente incidencia.
        setTipoSeleccionado(''); setOrigenSeleccionado(''); setDireccion(''); setDescripcion('')
        setVehiculosSeleccionados([]); setVoluntariosSeleccionados([])
      }
      else { alert('Error: ' + (data.error || JSON.stringify(data))) }
    } catch (e) { alert('Error de red: ' + String(e)) } finally { setGuardando(false) }
  }

  const abrirEdicionInc = () => {
    if (!incidenciaActiva) return
    setEditInc({
      tipoIncidencia: incidenciaActiva.tipoIncidencia,
      origenAviso: incidenciaActiva.origenAviso,
      direccion: incidenciaActiva.direccion || '',
      descripcion: incidenciaActiva.descripcion || '',
      vehiculosIds: incidenciaActiva.vehiculosIds || [],
      voluntariosIds: incidenciaActiva.voluntariosIds || [],
    })
    setEditandoInc(true)
  }

  const guardarCambiosInc = async () => {
    if (!incidenciaActiva) return
    setGuardandoEdicion(true)
    try {
      const res = await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'actualizar', id: incidenciaActiva.id, ...editInc }) })
      const data = await res.json()
      if (data.incidencia) { patchIncidencia(incidenciaActiva.id, data.incidencia); setEditandoInc(false) }
      else alert('Error: ' + (data.error || 'no se pudo guardar'))
    } catch (e) { alert('Error de red al guardar los cambios') } finally { setGuardandoEdicion(false) }
  }

  const registrarNovedad = async () => {
    if (!novedadTexto.trim()) return
    setGuardandoNov(true)
    try {
      await fetch('/api/cecopal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'novedad-turno', titulo: novedadTitulo, texto: novedadTexto }) })
      setNovedadTitulo(''); setNovedadTexto(''); await cargarDatos()
    } catch (e) { alert('Error al registrar la novedad') } finally { setGuardandoNov(false) }
  }

  const marcarNovedadLeida = async (n: any) => {
    const res = await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'novedad-leer', id: n.id }) })
    const d = await res.json()
    if (d.novedad) { setNovedadSel(d.novedad); cargarDatos() }
  }

  const guardarNovedadEdit = async () => {
    if (!novedadSel) return
    setGuardandoNov(true)
    try {
      const res = await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'novedad-editar', id: novedadSel.id, titulo: novedadEdit.titulo, descripcion: novedadEdit.descripcion }) })
      const d = await res.json()
      if (d.novedad) { setNovedadSel(d.novedad); setNovedadEditando(false); cargarDatos() }
    } catch (e) { alert('Error al guardar') } finally { setGuardandoNov(false) }
  }

  const eliminarNovedad = async (n: any) => {
    if (!confirm('¿Eliminar esta novedad? Quedará registro en la auditoría.')) return
    const res = await fetch(`/api/cecopal?id=${n.id}`, { method: 'DELETE' })
    if (res.ok) { setNovedadSel(null); cargarDatos() } else alert('No se pudo eliminar')
  }

  const resolverIncidencia = async () => {
    if (!incidenciaActiva) return
    setGuardando(true)
    try {
      await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'resolver', id: incidenciaActiva.id, horaDisponible: incidenciaActiva.horaDisponible || getHoraActual(), observaciones: incidenciaActiva.observaciones }) })
      const resto = incidenciasActivas.filter(i => i.id !== incidenciaActiva.id)
      setIncidenciasActivas(resto)
      setIncidenciaSelId(resto.length ? resto[0].id : null)
      setModo(resto.length ? 'activa' : 'turno')
      setEditandoInc(false)
      await cargarDatos()
    } catch (e) { console.error('Error resolviendo incidencia:', e) } finally { setGuardando(false) }
  }

  const generarPartePSI = async () => {
    if (!incidenciaActiva) return
    setGenerandoParte(true)
    try {
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      // Las novedades del turno son anotaciones informativas y NO forman parte
      // del parte de servicio: quedan solo en su registro consultable.
      const observacionesFinal = incidenciaActiva.observaciones || ''

      // Indicativos de personal y vehículos de la incidencia.
      const indicativoDe = (uid: string) => {
        const g = turno.find((x: any) => x.usuarioId === uid)
        return g?.usuario?.numeroVoluntario || g?.usuario?.nombre || ''
      }
      const indicativoVeh = (vid: string) => vehiculos.find((v: any) => v.id === vid)?.indicativo || ''
      const walkieDe = (uid: string) => turno.find((x: any) => x.usuarioId === uid)?.walkie || ''
      const idsPersonal: string[] = incidenciaActiva.voluntariosIds || []
      const idsVehiculos: string[] = incidenciaActiva.vehiculosIds || []
      // Personal con su walkie asignado al inicio del turno.
      const personal = idsPersonal.map((uid: string) => ({ indicativo: indicativoDe(uid), walkie: walkieDe(uid) })).filter(p => p.indicativo)
      const persIndicativos = personal.map(p => p.indicativo)
      const vehIndicativos = idsVehiculos.map(indicativoVeh).filter(Boolean)

      // Tabla izquierda (tabla1): vehículos en las 4 primeras filas y el personal
      // en la columna EQUIPO (filas 0-5). Se rellena la izquierda primero.
      const tabla1 = Array.from({ length: 8 }, (_, i) => ({
        vehiculo: i < 4 ? (vehIndicativos[i] || '') : '',
        equipo: personal[i]?.indicativo || '',
        walkie: personal[i]?.walkie || '',
      }))
      // Tabla derecha (tabla2): personal sobrante a partir de la fila 6.
      const tabla2 = Array.from({ length: 8 }, (_, i) => ({ equipo: personal[i + 6]?.indicativo || '', walkie: personal[i + 6]?.walkie || '' }))

      // equipoWalkies para la BD y el PDF (coherente con las tablas).
      const equipoWalkies = [
        ...tabla1.filter(r => r.vehiculo || r.equipo).map(r => (r.vehiculo ? { vehiculo: r.vehiculo, equipo: r.equipo, walkie: r.walkie } : { equipo: r.equipo, walkie: r.walkie })),
        ...tabla2.filter(r => r.equipo).map(r => ({ equipo: r.equipo, walkie: r.walkie })),
      ]
      const indicativosPersonal = persIndicativos

      // Responsable del turno (para cumplimenta / responsable de turno del parte).
      const resp = turno.find((g: any) => (g.rol === 'Responsable' || g.rol === 'Apoyo/Cecopal' || g.rol === 'Cecopal') && idsPersonal.includes(g.usuarioId))
        || turno.find((g: any) => idsPersonal.includes(g.usuarioId))
      const indicativoResp = resp?.usuario?.numeroVoluntario || resp?.usuario?.nombre || ''

      // Motivo: tipo + descripción, para que ambos queden reflejados.
      const tipoLabel = TIPOS_INCIDENCIA.find(t => t.value === incidenciaActiva.tipoIncidencia)?.label || incidenciaActiva.tipoIncidencia || ''
      const motivoFinal = [tipoLabel, incidenciaActiva.descripcion].filter(Boolean).join(' — ') || tipoLabel

      // Tipología del parte marcada segun el tipo de incidencia de CECOPAL. Solo
      // se marca cuando hay una correspondencia CLARA; los tipos sin tipología
      // específica (accidente, rescate, apoyo, otros) no marcan nada y se dejan
      // para selección manual (evita marcar "otros" por defecto).
      const MAP_TIP: Record<string, [string, string]> = {
        incendio: ['intervencion', 'incendios'],
        sanitaria: ['intervencion', 'svb'],
        inundacion: ['intervencion', 'inundaciones'],
        prevencion: ['prevencion', 'preventivo'],
      }
      const prevencion: any = { mantenimiento: false, practicas: false, suministros: false, preventivo: false, otros: false }
      const intervencion: any = { svb: false, incendios: false, inundaciones: false, otros_riesgos_meteo: false, activacion_pem_bor: false, otros: false }
      const otrosTip: any = { reunion_coordinacion: false, reunion_areas: false, limpieza: false, formacion: false, otros: false }
      const mp = MAP_TIP[incidenciaActiva.tipoIncidencia]
      if (mp) { const [g, k] = mp; if (g === 'prevencion') prevencion[k] = true; else if (g === 'intervencion') intervencion[k] = true; else otrosTip[k] = true }
      const tipologiasArr = [
        ...Object.entries(prevencion).filter(([, v]) => v).map(([k]) => `prevencion.${k}`),
        ...Object.entries(intervencion).filter(([, v]) => v).map(([k]) => `intervencion.${k}`),
        ...Object.entries(otrosTip).filter(([, v]) => v).map(([k]) => `otros.${k}`),
      ]
      const circulacion = tipologiasArr.some(t => t.startsWith('intervencion')) ? 'intervencion'
        : tipologiasArr.some(t => t.startsWith('prevencion')) ? 'prevencion'
        : tipologiasArr.some(t => t.startsWith('otros')) ? 'otros' : ''

      const tiempos = {
        llamada: incidenciaActiva.horaLlamada || '00:00', salida: incidenciaActiva.horaSalida || '00:00',
        llegada: incidenciaActiva.horaLlegada || '00:00', terminado: incidenciaActiva.horaTerminado || '00:00',
        disponible: incidenciaActiva.horaDisponible || '00:00',
      }

      // Cuerpo del parte (introducción / desarrollo / conclusión). El desarrollo
      // que se ha ido registrando durante la incidencia se vuelca aquí para que
      // no se pierda; luego puede ampliarse/mejorarse desde el formulario.
      const desarrolloTexto = (incidenciaActiva.desarrollo || '').trim()
      const desarrolloDetallado = desarrolloTexto
        ? `INTRODUCCIÓN:\n\nDESARROLLO:\n${desarrolloTexto}\n\nCONCLUSIÓN:\n`
        : ''

      // informacionExtra = estado COMPLETO del formulario del parte (el formulario
      // lo carga tal cual: tablas, tipologías, tiempos, heridos, etc.).
      const informacionExtra = {
        fecha: hoy, hora: getHoraActual(), lugar: incidenciaActiva.direccion || '', motivo: motivoFinal,
        alertante: incidenciaActiva.origenAviso || '', circulacion,
        tiempos, tabla1, tabla2, prevencion, intervencion, otros: otrosTip,
        otrosDescripcion: '', posiblesCausas: '',
        heridos: '', heridosNum: '', fallecidos: '', fallecidosNum: '',
        matriculasImplicados: ['', '', '', '', ''],
        observaciones: observacionesFinal,
        desarrolloDetallado,
        indicativosInforman: indicativosPersonal.join(', '),
        indicativoCumplimenta: indicativoResp, responsableTurno: indicativoResp,
        descripcionAccidente: '',
      }

      const payload = {
        fecha: hoy,
        lugar: incidenciaActiva.direccion || '',
        motivo: motivoFinal,
        alertante: incidenciaActiva.origenAviso || '',
        circulacion,
        horaLlamada: incidenciaActiva.horaLlamada || '',
        horaSalida: incidenciaActiva.horaSalida || '',
        horaLlegada: incidenciaActiva.horaLlegada || '',
        horaTerminado: incidenciaActiva.horaTerminado || '',
        horaDisponible: incidenciaActiva.horaDisponible || '',
        vehiculosIds: idsVehiculos,
        equipoWalkies,
        indicativosInforman: indicativosPersonal.join(', '),
        indicativoCumplimenta: indicativoResp,
        responsableTurno: indicativoResp,
        observaciones: observacionesFinal,
        desarrolloDetallado,
        tipologias: tipologiasArr,
        tipologiasOtrosTexto: {},
        fotosUrls: [],
        informacionExtra: JSON.stringify(informacionExtra),
      }
      // Si la incidencia ya tiene un parte vinculado, se ACTUALIZA ese mismo parte
      // (PUT) en vez de crear un borrador nuevo cada vez que se genera.
      const yaVinculado = incidenciaActiva.parteId
      const url = yaVinculado ? `/api/partes/psi/${incidenciaActiva.parteId}` : '/api/partes/psi'
      const method = yaVinculado ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { alert('Error: ' + (data.error || JSON.stringify(data.errores || data))); return }
      const parteId = data.parte?.id || data.id || incidenciaActiva.parteId
      if (parteId && !yaVinculado) {
        // Guardar el vínculo en la incidencia para futuras regeneraciones.
        patchIncidencia(incidenciaActiva.id, { parteId })
        fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'actualizar', id: incidenciaActiva.id, parteId }) }).catch(() => {})
      }
      if (parteId) { window.location.href = `/partes/psi?id=${parteId}` }
    } catch (e) { console.error('Error generando parte PSI:', e) } finally { setGenerandoParte(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-0">

      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border-b border-blue-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600/40 rounded-xl border border-blue-500/40"><Radio className="text-white" size={24} /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white text-xl font-bold tracking-wide">CECOPAL</h1>
                <span className="text-xs px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded-full border border-blue-500/40 font-medium">Protección Civil Bormujos</span>
              </div>
              <p className="text-blue-300 text-xs mt-0.5">Centro de Coordinación y Comunicaciones</p>
            </div>
          </div>
          <RelojDigital />
        </div>
      </div>

      <div className="bg-slate-800 border-b border-slate-700 px-6 py-2.5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-amber-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Resp.</span>
            <span className="text-white text-xs font-semibold">{responsableTurno ? responsableTurno.usuario.nombre : <span className="text-slate-500 font-normal">Sin asignar</span>}</span>
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <div className="flex items-center gap-2">
            <Users size={13} className="text-blue-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Personal</span>
            <div className="flex gap-1 flex-wrap">{turno.map(g => <span key={g.id} className="px-2 py-0.5 rounded bg-slate-700 text-white text-xs font-mono border border-slate-600">{g.usuario.numeroVoluntario || g.usuario.nombre}</span>)}</div>
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <div className="flex items-center gap-2">
            <Truck size={13} className="text-emerald-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Vehículos</span>
            <div className="flex gap-1">{vehiculos.map(v => <span key={v.id} className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 text-xs font-mono border border-emerald-700/40">{v.indicativo}</span>)}</div>
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <div className="relative">
            <button onClick={() => setAlertasOpen(v => !v)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-700 transition-colors">
              <Bell size={13} className={totalAlertas > 0 ? 'text-amber-400' : 'text-slate-500'} />
              {totalAlertas > 0 ? <span className="text-amber-300 text-xs font-semibold">{totalAlertas} alertas</span> : <span className="text-slate-500 text-xs">Sin alertas</span>}
            </button>
            {alertasOpen && (
              <div className="absolute left-0 top-8 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[2000] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Alertas Operativas</span>
                  <button onClick={() => setAlertasOpen(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                </div>
                <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                  {totalAlertas === 0
                    ? <div className="text-center py-4 text-emerald-400 flex items-center justify-center gap-2"><CheckCircle size={16} /><span className="text-sm">Todo operativo</span></div>
                    : <>{alertas.botiquines?.map((b: any) => <div key={b.id} className="flex items-center gap-3 p-2.5 bg-amber-900/20 border border-amber-700/30 rounded-lg"><span className="text-amber-400 text-xs">⚠</span><div><p className="text-white text-xs font-medium">{b.nombre}</p><p className="text-amber-400 text-xs">Botiquín — Revisión pendiente</p></div></div>)}{alertas.deas?.map((d: any) => <div key={d.id} className="flex items-center gap-3 p-2.5 bg-red-900/20 border border-red-700/30 rounded-lg"><Heart size={13} className="text-red-400 flex-shrink-0" /><div><p className="text-white text-xs font-medium">{d.codigo} — {d.ubicacion}</p><p className="text-red-400 text-xs">DEA</p></div></div>)}{alertas.vehiculos?.map((v: any) => <div key={v.id} className="flex items-center gap-3 p-2.5 bg-orange-900/20 border border-orange-700/30 rounded-lg"><Truck size={13} className="text-orange-400 flex-shrink-0" /><div><p className="text-white text-xs font-medium">{v.indicativo} — {v.matricula}</p></div></div>)}</>
                  }
                </div>
              </div>
            )}
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <a href="#directorio-cecopal" className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-purple-300">
            <BookUser size={13} className="text-purple-400" />
            <span className="text-xs font-medium">Directorio</span>
          </a>
          <div className="w-px h-4 bg-slate-600" />
          <button onClick={() => { setAdrOpen(true); setAdrQuery(''); setAdrResultados([]); setAdrSel(null) }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-orange-900/40 transition-colors text-slate-300 hover:text-orange-300 border border-transparent hover:border-orange-700/50">
            <FlaskConical size={13} className="text-orange-400" />
            <span className="text-xs font-medium">ADR / Merc. Peligrosas</span>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button onClick={cargarDatos} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"><RefreshCw size={14} /></button>
            <button onClick={() => setModo(modo === 'nueva' ? (incidenciasActivas.length ? 'activa' : 'turno') : 'nueva')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-sm transition-all ${modo === 'nueva' ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40'}`}><Siren size={15} />{modo === 'nueva' ? 'Cancelar' : 'Nueva Incidencia'}</button>
            {incidenciasActivas.length > 0 && modo !== 'nueva' && <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-500/40 rounded-lg"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-red-300 text-sm font-semibold">{incidenciasActivas.length === 1 ? `INCIDENCIA ACTIVA — ${incidenciaActiva?.numero}` : `${incidenciasActivas.length} INCIDENCIAS ACTIVAS`}</span></div>}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-1 flex flex-col gap-3">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-700 flex items-center gap-2"><Users size={13} className="text-blue-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Personal en Turno</h3></div>
              <div className="divide-y divide-slate-700/50">
                {turno.length === 0 ? <div className="px-3 py-4 text-center text-slate-500 text-xs">Sin guardias</div> : turno.map(g => (
                  <div key={g.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-white text-xs font-medium truncate">{g.usuario.nombre} {g.usuario.apellidos}</p><div className="flex items-center gap-1.5 mt-0.5">{g.usuario.numeroVoluntario && <span className="text-xs text-blue-400 font-mono">{g.usuario.numeroVoluntario}</span>}{g.rol && <span className="text-xs text-slate-500">{g.rol}</span>}</div></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={g.walkie || ''}
                        onChange={e => asignarWalkie(g.id, e.target.value)}
                        title="Walkie asignado"
                        className="bg-slate-700 border border-slate-600 text-white text-xs font-mono rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Walkie…</option>
                        {WALKIES_LIST.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      {g.usuario.telefono && <a href={`tel:${g.usuario.telefono}`} className="text-slate-500 hover:text-emerald-400 transition-colors"><Phone size={12} /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-700 flex items-center gap-2"><Cloud size={13} className="text-sky-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Meteorología</h3><span className="text-slate-500 text-xs ml-auto">Bormujos</span></div>
              {meteo ? (
                <div className="p-3">
                  <div className="flex items-center gap-3 mb-3"><span className="text-3xl">{getMeteoIcon(meteo.weather_code)}</span><div><p className="text-white text-xl font-bold">{Math.round(meteo.temperature_2m)}°C</p><p className="text-slate-400 text-xs">{getMeteoDesc(meteo.weather_code)}</p></div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2 py-1.5"><Droplets size={11} className="text-blue-400" /><span className="text-slate-300 text-xs">{meteo.relative_humidity_2m}%</span></div>
                    <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2 py-1.5"><Wind size={11} className="text-emerald-400" /><span className="text-slate-300 text-xs">{Math.round(meteo.wind_speed_10m)} km/h</span></div>
                  </div>
                </div>
              ) : <div className="p-4 text-center text-slate-500 text-xs">Cargando...</div>}
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col flex-1">
              <div className="px-3 py-2.5 border-b border-slate-700 flex items-center gap-2"><Edit size={13} className="text-slate-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Novedades del Turno</h3><span className="ml-auto text-xs text-slate-500">{novedadesHoy.length} registradas</span></div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-700/50">
                {novedadesHoy.length === 0
                  ? <div className="p-4 text-center text-slate-500 text-xs">Sin novedades registradas</div>
                  : novedadesHoy.map((n: any) => (
                    <button key={n.id} onClick={() => { setNovedadSel(n); setNovedadEditando(false) }} className="w-full text-left px-3 py-2 hover:bg-slate-700/40 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Sin leer" />}
                        <span className="text-blue-400 font-mono text-xs">{n.horaLlamada || '--:--'}</span>
                        <span className={`text-xs font-semibold truncate ${n.leida ? 'text-slate-400' : 'text-white'}`}>{n.titulo || (n.descripcion || '').slice(0, 40)}</span>
                        {n.leida && <CheckCircle size={11} className="text-emerald-400 flex-shrink-0 ml-auto" />}
                      </div>
                    </button>
                  ))
                }
              </div>
              <div className="p-3 border-t border-slate-700 flex-shrink-0 space-y-2">
                <input value={novedadTitulo} onChange={e => setNovedadTitulo(e.target.value)} placeholder="Título de la novedad" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                <textarea value={novedadTexto} onChange={e => setNovedadTexto(e.target.value)} placeholder="Detalle de la novedad..." rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={registrarNovedad} disabled={!novedadTexto.trim() || guardandoNov} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"><Send size={11} /> {guardandoNov ? 'Registrando…' : 'Registrar'}</button>
              </div>
            </div>
          </div>

          <div className="col-span-4">
            {modo === 'turno' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 h-full flex items-center justify-center min-h-64">
                <div className="text-center"><Shield size={48} className="text-slate-600 mx-auto mb-3" /><p className="text-slate-400 font-medium">Sistema operativo</p><p className="text-slate-600 text-sm mt-1">Sin incidencias activas</p><button onClick={() => setModo('nueva')} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm shadow-lg mx-auto transition-colors"><Siren size={15} /> Nueva Incidencia</button></div>
              </div>
            )}
            {modo === 'nueva' && (
              <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden">
                <div className="bg-red-900/40 px-5 py-3.5 border-b border-red-500/30 flex items-center gap-3"><Siren size={18} className="text-red-400" /><h2 className="text-white text-base font-bold">Nueva Activación</h2><span className="text-red-300 text-sm font-mono">{new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}</span></div>
                <div className="p-5 space-y-5">
                  <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipo de Incidencia *</label><div className="grid grid-cols-8 gap-2">{TIPOS_INCIDENCIA.map(t => { const Icon = t.icon; return (<button key={t.value} onClick={() => setTipoSeleccionado(t.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${tipoSeleccionado === t.value ? `${t.color} border-transparent text-white shadow-lg` : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'}`}><Icon size={20} /><span className="text-xs font-semibold text-center leading-tight">{t.label}</span></button>) })}</div></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Origen del Aviso *</label><div className="grid grid-cols-2 gap-2">{ORIGENES_AVISO.map(o => { const Icon = o.icon; return (<button key={o.value} onClick={() => setOrigenSeleccionado(o.value)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${origenSeleccionado === o.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'}`}><Icon size={13} />{o.label}</button>) })}</div></div>
                    <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Localización *</label><div className="relative"><MapPin size={13} className="absolute left-3 top-3 text-slate-400" /><input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Dirección o punto kilométrico..." className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" /></div><textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción de la incidencia..." rows={2} className="mt-2 w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehículos Asignados</label><div className="space-y-1.5">{vehiculos.map(v => (<label key={v.id} className="flex items-center gap-3 p-2.5 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:border-slate-500"><input type="checkbox" checked={vehiculosSeleccionados.includes(v.id)} onChange={e => setVehiculosSeleccionados(prev => e.target.checked ? [...prev, v.id] : prev.filter(id => id !== v.id))} className="accent-blue-500" /><div><p className="text-white text-sm font-medium">{v.indicativo}</p><p className="text-slate-400 text-xs">{v.matricula}</p></div></label>))}</div></div>
                    <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Personal Asignado</label><div className="space-y-1.5">{turno.map(g => (<label key={g.id} className="flex items-center gap-3 p-2.5 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:border-slate-500"><input type="checkbox" checked={voluntariosSeleccionados.includes(g.usuarioId)} onChange={e => setVoluntariosSeleccionados(prev => e.target.checked ? [...prev, g.usuarioId] : prev.filter(id => id !== g.usuarioId))} className="accent-blue-500" /><div><p className="text-white text-sm font-medium">{g.usuario.numeroVoluntario || g.usuario.nombre}</p><p className="text-slate-400 text-xs">{g.rol || ''}</p></div></label>))}</div></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-700"><button onClick={() => setModo('turno')} className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancelar</button><button onClick={crearIncidencia} disabled={!tipoSeleccionado || !origenSeleccionado || !direccion || guardando} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg font-semibold text-sm shadow-lg transition-colors"><Siren size={15} />{guardando ? 'Activando...' : 'Activar Incidencia'}</button></div>
                </div>
              </div>
            )}
            {modo === 'activa' && incidenciaActiva && (
              <div className="space-y-4">
                {/* Selector de incidencias activas (cuando hay más de una) */}
                {incidenciasActivas.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap bg-slate-800/60 border border-slate-700 rounded-xl p-2">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-medium px-1">Activas:</span>
                    {incidenciasActivas.map(inc => {
                      const ti = TIPOS_INCIDENCIA.find(t => t.value === inc.tipoIncidencia)
                      const Ic = ti?.icon || AlertTriangle
                      const sel = inc.id === incidenciaSelId
                      return (
                        <button key={inc.id} onClick={() => { setIncidenciaSelId(inc.id); setEditandoInc(false) }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${sel ? (ti?.color || 'bg-blue-600') + ' text-white border-white/30' : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:border-slate-500'}`}>
                          <Ic size={13} />
                          <span className="font-mono">{inc.numero?.split('-').pop()}</span>
                          <span className="truncate max-w-[120px]">{ti?.label || inc.tipoIncidencia}{inc.direccion ? ' · ' + inc.direccion : ''}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden">
                    <div className={`p-4 border-b border-slate-700 flex items-center gap-3 ${tipoActivo?.color || 'bg-slate-700'}`}>
                      <TipoIcon size={18} className="text-white" />
                      <div className="flex-1"><p className="text-white font-bold text-sm">{tipoActivo?.label || incidenciaActiva.tipoIncidencia}</p><p className="text-white/60 text-xs">{incidenciaActiva.numero}</p></div>
                      {!editandoInc && <button onClick={abrirEdicionInc} title="Editar datos de la incidencia" className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white"><Edit size={14} /></button>}
                    </div>
                    {!editandoInc ? (
                      <div className="p-4 space-y-3">
                        <div><p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Localización</p><p className="text-white text-sm flex items-start gap-1.5"><MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />{incidenciaActiva.direccion}</p></div>
                        {incidenciaActiva.descripcion && <div><p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Descripción</p><p className="text-slate-300 text-sm">{incidenciaActiva.descripcion}</p></div>}
                        <div><p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Origen</p><p className="text-white text-sm">{ORIGENES_AVISO.find(o => o.value === incidenciaActiva.origenAviso)?.label || incidenciaActiva.origenAviso}</p></div>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1.5">Tipo</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {TIPOS_INCIDENCIA.map(t => { const Ic = t.icon; return (
                              <button key={t.value} onClick={() => setEditInc((p: any) => ({ ...p, tipoIncidencia: t.value }))} title={t.label} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] ${editInc.tipoIncidencia === t.value ? t.color + ' text-white border-white/40' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'}`}><Ic size={14} />{t.label}</button>
                            )})}
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1.5">Origen del aviso</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ORIGENES_AVISO.map(o => (
                              <button key={o.value} onClick={() => setEditInc((p: any) => ({ ...p, origenAviso: o.value }))} className={`px-2.5 py-1 rounded-lg border text-xs ${editInc.origenAviso === o.value ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'}`}>{o.label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Localización</label>
                          <input value={editInc.direccion} onChange={e => setEditInc((p: any) => ({ ...p, direccion: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Descripción</label>
                          <textarea value={editInc.descripcion} onChange={e => setEditInc((p: any) => ({ ...p, descripcion: e.target.value }))} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1.5">Vehículos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {vehiculos.map((v: any) => { const on = (editInc.vehiculosIds || []).includes(v.id); return (
                              <button key={v.id} onClick={() => setEditInc((p: any) => ({ ...p, vehiculosIds: on ? p.vehiculosIds.filter((x: string) => x !== v.id) : [...(p.vehiculosIds || []), v.id] }))} className={`px-2.5 py-1 rounded-lg border text-xs font-mono ${on ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'}`}>{v.indicativo}</button>
                            )})}
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1.5">Personal</p>
                          <div className="flex flex-wrap gap-1.5">
                            {turno.map((g: any) => { const on = (editInc.voluntariosIds || []).includes(g.usuarioId); return (
                              <button key={g.id} onClick={() => setEditInc((p: any) => ({ ...p, voluntariosIds: on ? p.voluntariosIds.filter((x: string) => x !== g.usuarioId) : [...(p.voluntariosIds || []), g.usuarioId] }))} className={`px-2.5 py-1 rounded-lg border text-xs font-mono ${on ? 'bg-blue-900/50 border-blue-500 text-blue-200' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'}`}>{g.usuario.numeroVoluntario || g.usuario.nombre}</button>
                            )})}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditandoInc(false)} className="flex-1 px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600">Cancelar</button>
                          <button onClick={guardarCambiosInc} disabled={guardandoEdicion} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">{guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700"><p className="text-white text-xs font-semibold uppercase tracking-wider">Recursos Activados</p></div>
                    <div className="p-3 space-y-2">
                      {vehiculos.filter((v: any) => (incidenciaActiva.vehiculosIds || []).includes(v.id)).map((v: any) => (<div key={v.id} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg"><Truck size={12} className="text-emerald-400" /><span className="text-white text-sm font-medium">{v.indicativo}</span><span className="text-slate-400 text-xs">{v.matricula}</span></div>))}
                      {turno.filter((g: any) => (incidenciaActiva.voluntariosIds || []).includes(g.usuarioId)).map((g: any) => (<div key={g.id} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg"><Users size={12} className="text-blue-400" /><span className="text-white text-sm font-medium">{g.usuario.numeroVoluntario || g.usuario.nombre}</span><span className="text-slate-400 text-xs">{g.rol}</span></div>))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Clock size={14} className="text-amber-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Isocronas</h3></div>
                    <div className="p-4 space-y-3">{ISOCRONAS.map(iso => { const valor = incidenciaActiva[iso.campo]; return (<div key={iso.campo} className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><div className={`w-7 h-7 rounded-lg ${iso.color} flex items-center justify-center flex-shrink-0`}><Clock size={11} className="text-white" /></div><span className="text-slate-300 text-xs">{iso.label}</span></div>{valor ? <div className="flex items-center gap-1.5"><span className="text-white font-mono font-bold text-lg">{valor}</span><CheckCircle size={12} className="text-emerald-400" /></div> : <button onClick={() => activarIsocrona(iso.campo)} className={`flex items-center gap-1 px-2.5 py-1.5 ${iso.color} hover:opacity-90 text-white rounded-lg text-xs font-semibold transition-all`}><Clock size={10} /> Marcar</button>}</div>) })}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-2">
                    <button onClick={generarPartePSI} disabled={generandoParte} className="flex items-center gap-2 w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"><FileText size={15} />{generandoParte ? 'Creando parte...' : 'Generar Parte PSI'}</button>
                    <button onClick={resolverIncidencia} disabled={guardando} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"><CheckCircle size={15} />{guardando ? 'Cerrando...' : 'Resolver Incidencia'}</button>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col" style={{ maxHeight: '420px' }}>
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Activity size={14} className="text-purple-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Log de la Incidencia</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="flex gap-3"><div className="w-1 rounded-full bg-red-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">T0 Llamada</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaLlamada || '—'} · {incidenciaActiva.origenAviso}</p></div></div>
                    {incidenciaActiva.horaSalida && <div className="flex gap-3"><div className="w-1 rounded-full bg-blue-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">T1 Salida</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaSalida}</p></div></div>}
                    {incidenciaActiva.horaLlegada && <div className="flex gap-3"><div className="w-1 rounded-full bg-amber-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">T2 Llegada</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaLlegada}</p></div></div>}
                    {incidenciaActiva.horaTerminado && <div className="flex gap-3"><div className="w-1 rounded-full bg-emerald-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">T3 Finalizado</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaTerminado}</p></div></div>}
                    {incidenciaActiva.horaDisponible && <div className="flex gap-3"><div className="w-1 rounded-full bg-purple-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">T4 Disponible</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaDisponible}</p></div></div>}
                  </div>
                  <div className="p-3 border-t border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5"><FileText size={11} /> Desarrollo del servicio</label>
                      <button onClick={anadirHoraDesarrollo} className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded px-1.5 py-0.5 transition-colors"><Clock size={10} /> Hora</button>
                    </div>
                    <textarea placeholder="Se irá volcando al cuerpo del parte (introducción-desarrollo-conclusión)…" rows={4} value={incidenciaActiva.desarrollo || ''} onChange={e => patchIncidencia(incidenciaActiva.id, { desarrollo: e.target.value })} onBlur={e => guardarDesarrollo(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none" />
                  </div>
                  <div className="p-3 border-t border-slate-700"><textarea placeholder="Añadir observación..." rows={2} value={incidenciaActiva.observaciones || ''} onChange={e => patchIncidencia(incidenciaActiva.id, { observaciones: e.target.value })} onBlur={e => { fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'actualizar', id: incidenciaActiva.id, observaciones: e.target.value }) }).catch(() => {}) }} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" /></div>
                </div>
              </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden" style={{ height: '600px' }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ubicacionesGPS.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} /><span className="text-white text-xs font-semibold uppercase tracking-wider">Localización de Flota en Tiempo Real</span></div>
            <span className="text-slate-400 text-xs">{ubicacionesGPS.length} vehículo{ubicacionesGPS.length !== 1 ? 's' : ''} activo{ubicacionesGPS.length !== 1 ? 's' : ''}</span>
          </div>
          <MapContainer center={[37.3710, -6.0710]} zoom={14} style={{ height: 'calc(100% - 41px)', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {ubicacionesGPS.map((u: any) => (
              <CircleMarker key={u.id} center={[u.latitud, u.longitud]} radius={14} pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.85, weight: 2 }}>
                <Popup><div style={{ minWidth: 140, textAlign: 'center' }}><p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{u.vehiculo?.indicativo}</p><p style={{ fontSize: 12, color: '#666', margin: '0 0 2px' }}>{u.vehiculo?.modelo}</p>{u.velocidad !== null && <p style={{ fontSize: 12, color: '#16a34a', margin: '0 0 2px' }}>{u.velocidad} km/h</p>}<p style={{ fontSize: 11, color: '#999', margin: 0 }}>{new Date(u.createdAt).toLocaleTimeString('es-ES')}</p></div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* ── DIRECTORIO CECOPAL ── */}
        <div id="directorio-cecopal" className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden scroll-mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <BookUser size={15} className="text-purple-400" />
              <span className="text-white text-sm font-semibold uppercase tracking-wider">Directorio Operativo</span>
              <span className="text-slate-500 text-xs">({dirContactos.length} contactos)</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDirModal('categoria')} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">Categorías</button>
              <button onClick={() => {
                const amb = dirTab === 'accion_social' ? ['accion_social'] : dirTab === 'proveedores' ? ['proveedor'] : ['cecopal']
                setDirForm({ nombre: '', entidad: '', categoria: '', cargo: '', telefono: '', telefonoAlt: '', email: '', extension3cx: '', disponibilidad: '', notas: '', ambitos: amb }); setDirContactoSel(null); setDirModal('nuevo')
              }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"><Plus size={12} /> {dirTab === 'proveedores' ? 'Nuevo proveedor' : 'Nuevo contacto'}</button>
            </div>
          </div>
          {/* Pestañas por ámbito */}
          <div className="flex gap-1 px-3 pt-3">
            {([['todos','Todos'],['accion_social','Acción Social'],['cecopal','CECOPAL'],['proveedores','Proveedores']] as const).map(([id,label]) => (
              <button key={id} onClick={() => setDirTab(id)} className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${dirTab === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
            ))}
          </div>
          <div className="p-3 border-b border-slate-700 flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={dirBusqueda} onChange={e => { setDirBusqueda(e.target.value); cargarDirectorio(e.target.value, dirCategoria) }} placeholder="Buscar nombre, entidad, teléfono, extensión…" className="w-full pl-8 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500" />
            </div>
            <select value={dirCategoria} onChange={e => { setDirCategoria(e.target.value); cargarDirectorio(dirBusqueda, e.target.value) }} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 min-w-[160px]">
              <option value="">Todas las categorías</option>
              {dirCategorias.map((c: any) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Nombre / Entidad', 'Categoría', 'Ámbito', 'Teléfono', '3CX', 'Disponibilidad', 'Email', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {(() => {
                  const lista = dirContactos.filter((ct: any) => {
                    const ambs: string[] = ct.ambitos && ct.ambitos.length ? ct.ambitos : [ct.ambito]
                    if (dirTab === 'accion_social') return ambs.includes('accion_social')
                    if (dirTab === 'cecopal') return ambs.includes('cecopal')
                    if (dirTab === 'proveedores') return ambs.includes('proveedor')
                    return true
                  })
                  if (lista.length === 0) return (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Sin contactos en este ámbito.</td></tr>
                  )
                  return lista.map((ct: any) => {
                    const ambs: string[] = ct.ambitos && ct.ambitos.length ? ct.ambitos : [ct.ambito]
                    return (
                  <tr key={ct.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-2.5">
                      <p className="text-white font-semibold">{ct.nombre}</p>
                      {ct.entidad && <p className="text-slate-400">{ct.entidad}{ct.cargo ? ` · ${ct.cargo}` : ''}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">{ct.categoria}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {ambs.includes('accion_social') && <span className="px-1.5 py-0.5 rounded text-xs bg-rose-900/40 text-rose-300 border border-rose-700/30">Acción Social</span>}
                        {ambs.includes('cecopal') && <span className="px-1.5 py-0.5 rounded text-xs bg-sky-900/40 text-sky-300 border border-sky-700/30">CECOPAL</span>}
                        {ambs.includes('proveedor') && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30">Proveedor</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <a href={`tel:${ct.telefono}`} className="text-emerald-400 hover:text-emerald-300 font-mono transition-colors">{ct.telefono}</a>
                      {ct.telefonoAlt && <p className="text-blue-400 font-mono">{ct.telefonoAlt}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-purple-400 font-mono">{ct.extension3cx || '—'}</td>
                    <td className="px-4 py-2.5">
                      {ct.disponibilidad === '24h' && <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/30">24h</span>}
                      {ct.disponibilidad === 'horario_oficina' && <span className="px-2 py-0.5 rounded-full text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30">Oficina</span>}
                      {ct.disponibilidad === 'guardia' && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30">Guardia</span>}
                      {!ct.disponibilidad && <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{ct.email || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setDirForm({ nombre: ct.nombre, entidad: ct.entidad || '', categoria: ct.categoria, cargo: ct.cargo || '', telefono: ct.telefono, telefonoAlt: ct.telefonoAlt || '', email: ct.email || '', extension3cx: ct.extension3cx || '', disponibilidad: ct.disponibilidad || '', notas: ct.notas || '', ambitos: ambs.length ? ambs : ['cecopal'] }); setDirContactoSel(ct); setDirModal('editar') }} className="p-1.5 text-slate-400 hover:text-blue-400 rounded transition-colors" title="Editar"><Pencil size={12} /></button>
                        <button onClick={async () => { if (!confirm('¿Eliminar contacto?')) return; await fetch(`/api/directorio?id=${ct.id}`, { method: 'DELETE' }); cargarDirectorio(dirBusqueda, dirCategoria) }} className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors" title="Eliminar"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                  )})
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal nuevo / editar contacto */}
      {(dirModal === 'nuevo' || dirModal === 'editar') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold text-sm">{dirModal === 'editar' ? 'Editar contacto' : 'Nuevo contacto'}</h3>
              <button onClick={() => setDirModal(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs text-slate-400 mb-1">Nombre *</label><input value={dirForm.nombre} onChange={e => setDirForm(p => ({...p, nombre: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Entidad</label><input value={dirForm.entidad} onChange={e => setDirForm(p => ({...p, entidad: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Cargo</label><input value={dirForm.cargo} onChange={e => setDirForm(p => ({...p, cargo: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Teléfono *</label><input value={dirForm.telefono} onChange={e => setDirForm(p => ({...p, telefono: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Teléfono Alt.</label><input value={dirForm.telefonoAlt} onChange={e => setDirForm(p => ({...p, telefonoAlt: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Extensión 3CX</label><input value={dirForm.extension3cx} onChange={e => setDirForm(p => ({...p, extension3cx: e.target.value}))} placeholder="Ej: 101" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Email</label><input type="email" value={dirForm.email} onChange={e => setDirForm(p => ({...p, email: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Categoría</label>
                  <select value={dirForm.categoria} onChange={e => setDirForm(p => ({...p, categoria: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    <option value="">Seleccionar…</option>
                    {dirCategorias.map((c: any) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-slate-400 mb-1">Disponibilidad</label>
                  <select value={dirForm.disponibilidad} onChange={e => setDirForm(p => ({...p, disponibilidad: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    <option value="">Sin especificar</option>
                    <option value="24h">24 horas</option>
                    <option value="horario_oficina">Horario oficina</option>
                    <option value="guardia">Guardia</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1.5">Ámbito * (marca uno o varios; si marcas varios, aparece en cada uno)</label>
                  <div className="flex flex-wrap gap-2">
                    {([['accion_social','Acción Social','bg-rose-600 border-rose-500'],['cecopal','CECOPAL','bg-sky-600 border-sky-500'],['proveedor','Proveedor','bg-amber-600 border-amber-500']] as const).map(([id,label,cls]) => {
                      const on = dirForm.ambitos.includes(id)
                      return (
                        <button key={id} type="button" onClick={() => setDirForm(p => ({ ...p, ambitos: on ? p.ambitos.filter(a => a !== id) : [...p.ambitos, id] }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${on ? `${cls} text-white` : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'}`}>
                          {on ? '✓ ' : ''}{label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="col-span-2"><label className="block text-xs text-slate-400 mb-1">Notas</label><textarea value={dirForm.notas} onChange={e => setDirForm(p => ({...p, notas: e.target.value}))} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button onClick={() => setDirModal(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
                <button onClick={async () => {
                  if (!dirForm.nombre || !dirForm.telefono || dirForm.ambitos.length === 0) return
                  if (dirModal === 'editar' && dirContactoSel) {
                    await fetch('/api/directorio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dirForm, id: dirContactoSel.id }) })
                  } else {
                    await fetch('/api/directorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dirForm) })
                  }
                  setDirModal(null)
                  cargarDirectorio(dirBusqueda, dirCategoria)
                }} disabled={!dirForm.nombre || !dirForm.telefono || dirForm.ambitos.length === 0} className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestión de categorías */}
      {dirModal === 'categoria' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold text-sm">Categorías del directorio</h3>
              <button onClick={() => setDirModal(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input value={dirNuevaCat.nombre} onChange={e => setDirNuevaCat(p => ({...p, nombre: e.target.value}))} placeholder="Nueva categoría…" className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                <input type="color" value={dirNuevaCat.color} onChange={e => setDirNuevaCat(p => ({...p, color: e.target.value}))} className="w-10 h-9 rounded-lg border border-slate-600 bg-slate-700 cursor-pointer" />
                <button onClick={async () => {
                  if (!dirNuevaCat.nombre.trim()) return
                  const res = await fetch('/api/directorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'categoria', ...dirNuevaCat }) })
                  if (!res.ok) return
                  setDirNuevaCat({ nombre: '', color: '#3b82f6' })
                  cargarDirectorio(dirBusqueda, dirCategoria)
                }} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">+</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dirCategorias.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-white text-sm">{cat.nombre}</span>
                    </div>
                    <button onClick={async () => { if (!confirm('¿Eliminar categoría?')) return; await fetch(`/api/directorio?id=${cat.id}&tipo=categoria`, { method: 'DELETE' }); cargarDirectorio(dirBusqueda, dirCategoria) }} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                ))}
                {dirCategorias.length === 0 && <p className="text-slate-500 text-xs text-center py-3">Sin categorías</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ADR ── */}
      {adrOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/80 pt-10 px-4 pb-4">
          <div className="bg-slate-900 border border-orange-700/40 rounded-2xl w-full max-w-3xl flex flex-col max-h-[85vh] shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <FlaskConical size={18} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">ADR — Mercancías Peligrosas</h2>
                <p className="text-slate-400 text-xs">Busca por número ONU o nombre de sustancia</p>
              </div>
              <button onClick={() => { setAdrOpen(false); setAdrSel(null) }} className="ml-auto text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="px-5 py-3 border-b border-slate-700 flex-shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nº ONU (ej: 1203) o nombre (ej: gasolina, cloro...)"
                    value={adrQuery}
                    onChange={e => { setAdrQuery(e.target.value); buscarADR(e.target.value) }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                {adrQuery && <button onClick={() => { setAdrQuery(''); setAdrResultados([]); setAdrSel(null) }} className="px-3 py-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-600 rounded-lg text-xs transition-colors">Limpiar</button>}
              </div>
              {adrBuscando && <p className="text-slate-500 text-xs mt-2">Buscando...</p>}
              {!adrBuscando && adrQuery && adrResultados.length === 0 && !adrSel && (
                <p className="text-slate-500 text-xs mt-2">Sin resultados para &quot;{adrQuery}&quot;</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {!adrSel && adrResultados.length > 0 && (
                <div className="divide-y divide-slate-800">
                  {adrResultados.map(s => {
                    const cls = CLASES_ADR[s.clase] || CLASES_ADR['9']
                    return (
                      <button key={s.onu} onClick={() => setAdrSel(s)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-800 transition-colors text-left">
                        <span className="text-orange-400 font-mono font-bold text-lg w-12 flex-shrink-0">{s.onu}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{s.nombre}</p>
                          {s.descripcion && <p className="text-slate-400 text-xs truncate">{s.descripcion}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cls.bg, color: cls.color }}>Clase {s.clase}</span>
                          {s.kemler && <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded font-mono">{s.kemler}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {adrSel && (() => {
                const cls = CLASES_ADR[adrSel.clase] || CLASES_ADR['9']
                const etiqColors: Record<string, string> = {
                  '1':'#f59e0b','1.1':'#f59e0b','1.2':'#f59e0b','2.1':'#ef4444','2.2':'#3b82f6','2.3':'#7c3aed',
                  '3':'#f97316','4.1':'#dc2626','4.2':'#b91c1c','4.3':'#1d4ed8',
                  '5.1':'#d97706','5.2':'#c2410c','6.1':'#7c3aed','6.2':'#be185d',
                  '7':'#ca8a04','8':'#0891b2','9':'#374151',
                }
                return (
                  <div className="p-5 space-y-4">
                    <button onClick={() => setAdrSel(null)} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors">
                      <ChevronDown size={12} className="rotate-90" /> Volver
                    </button>
                    <div className="flex items-start gap-4 p-4 rounded-xl border" style={{ backgroundColor: cls.bg + '22', borderColor: cls.color + '55' }}>
                      <div className="text-center flex-shrink-0">
                        <div className="text-3xl font-black font-mono text-white">{adrSel.onu}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Nº ONU</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-lg leading-tight">{adrSel.nombre}</h3>
                        {adrSel.descripcion && <p className="text-slate-300 text-sm mt-1">{adrSel.descripcion}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: cls.bg, color: cls.color }}>Clase {adrSel.clase} — {cls.label}</span>
                          {adrSel.pg && <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">GE {adrSel.pg}</span>}
                          {adrSel.cpe && <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full font-mono">{adrSel.cpe}</span>}
                          {adrSel.tunel && <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">Túnel {adrSel.tunel}</span>}
                          {adrSel.erg && <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full border border-blue-700/40">ERG {adrSel.erg}</span>}
                        </div>
                      </div>
                      {adrSel.kemler && (
                        <div className="flex-shrink-0 text-center bg-orange-950/60 border border-orange-700/40 rounded-xl p-3">
                          <div className="text-2xl font-black font-mono text-orange-300">{adrSel.kemler}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Kemler</div>
                        </div>
                      )}
                    </div>
                    {adrSel.etiquetas && adrSel.etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {adrSel.etiquetas.map(e => (
                          <span key={e} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: (etiqColors[e] || '#374151') + 'cc' }}>
                            <AlertOctagon size={13} /> Etiqueta {e}
                          </span>
                        ))}
                      </div>
                    )}
                    {(adrSel.riesgos || adrSel.epi) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {adrSel.riesgos && adrSel.riesgos.length > 0 && (
                          <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-4">
                            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShieldAlert size={12} /> Riesgos</p>
                            <ul className="space-y-1">{adrSel.riesgos.map((r, i) => <li key={i} className="text-slate-300 text-sm flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span>{r}</li>)}</ul>
                          </div>
                        )}
                        {adrSel.epi && adrSel.epi.length > 0 && (
                          <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-4">
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Eye size={12} /> EPI</p>
                            <ul className="space-y-1">{adrSel.epi.map((e, i) => <li key={i} className="text-slate-300 text-sm flex items-start gap-2"><span className="text-blue-400 mt-0.5">▸</span>{e}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}
                    {adrSel.accion && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones de Emergencia</p>
                        {adrSel.accion.general && <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-4"><p className="text-xs font-bold text-amber-400 uppercase mb-1 flex items-center gap-1.5"><Zap size={11} /> General</p><p className="text-slate-200 text-sm">{adrSel.accion.general}</p></div>}
                        {adrSel.accion.incendio && <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-4"><p className="text-xs font-bold text-red-400 uppercase mb-1 flex items-center gap-1.5"><FlameIcon size={11} /> Incendio</p><p className="text-slate-200 text-sm">{adrSel.accion.incendio}</p></div>}
                        {adrSel.accion.fuga && <div className="bg-cyan-950/30 border border-cyan-700/30 rounded-xl p-4"><p className="text-xs font-bold text-cyan-400 uppercase mb-1 flex items-center gap-1.5"><Droplet size={11} /> Fuga / Derrame</p><p className="text-slate-200 text-sm">{adrSel.accion.fuga}</p></div>}
                        {adrSel.accion.personas && <div className="bg-purple-950/30 border border-purple-700/30 rounded-xl p-4"><p className="text-xs font-bold text-purple-400 uppercase mb-1 flex items-center gap-1.5"><Users size={11} /> Personas / Evacuación</p><p className="text-slate-200 text-sm">{adrSel.accion.personas}</p></div>}
                        {adrSel.accion.medioambiente && <div className="bg-green-950/30 border border-green-700/30 rounded-xl p-4"><p className="text-xs font-bold text-green-400 uppercase mb-1 flex items-center gap-1.5"><WindIcon size={11} /> Medio Ambiente</p><p className="text-slate-200 text-sm">{adrSel.accion.medioambiente}</p></div>}
                      </div>
                    )}
                    {!adrSel.riesgos && !adrSel.epi && !adrSel.accion && (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                        <Package size={32} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Datos básicos de clasificación disponibles.</p>
                        <p className="text-slate-500 text-xs mt-1">Consulta la guía ERG {adrSel.erg || 'correspondiente'} para acciones de emergencia detalladas.</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {!adrQuery && !adrSel && (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <FlaskConical size={48} className="text-orange-500/30 mb-4" />
                  <p className="text-slate-300 font-semibold">Base de datos ADR 2023</p>
                  <p className="text-slate-500 text-sm mt-1">+1.300 sustancias peligrosas · Clases 1–9</p>
                  <p className="text-slate-600 text-xs mt-3">Introduce el número ONU o el nombre de la sustancia</p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {[{onu:'1203',label:'Gasolina'},{onu:'1005',label:'Amoníaco'},{onu:'1017',label:'Cloro'},{onu:'1830',label:'Ác. Sulfúrico'},{onu:'1978',label:'Propano'},{onu:'1072',label:'Oxígeno'}].map(({onu,label}) => (
                      <button key={onu} onClick={() => { setAdrQuery(onu); buscarADR(onu) }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs rounded-lg transition-colors">
                        <span className="text-orange-400 font-mono">{onu}</span>
                        <span className="text-slate-400 ml-1.5">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP: DETALLE DE NOVEDAD (leer / editar / eliminar) */}
      {novedadSel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2100] p-4" onClick={() => { setNovedadSel(null); setNovedadEditando(false) }}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-700 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-mono text-sm">{novedadSel.horaLlamada || '--:--'}</span>
                  <span className="text-slate-500 text-xs">{novedadSel.createdAt ? new Date(novedadSel.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' }).replace(/\//g, '-') : ''}</span>
                  {novedadSel.leida
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-700/40"><CheckCircle size={10} />Leída</span>
                    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/40 text-amber-300 border border-amber-700/40">Sin leer</span>}
                </div>
                {!novedadEditando && <h3 className="text-white font-bold text-base mt-1 truncate">{novedadSel.titulo || 'Novedad'}</h3>}
              </div>
              <button onClick={() => { setNovedadSel(null); setNovedadEditando(false) }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X size={16} /></button>
            </div>

            <div className="p-5">
              {!novedadEditando ? (
                <>
                  <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{novedadSel.descripcion || '(sin detalle)'}</p>
                  {novedadSel.leida && (novedadSel.leidaPor || novedadSel.leidaEn) && (
                    <p className="text-slate-500 text-xs mt-4 pt-3 border-t border-slate-700">
                      Leída por <span className="text-slate-300 font-medium">{novedadSel.leidaPor || '—'}</span>
                      {novedadSel.leidaEn ? ' el ' + new Date(novedadSel.leidaEn).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }) : ''}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Título</label>
                    <input value={novedadEdit.titulo} onChange={e => setNovedadEdit(p => ({ ...p, titulo: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Detalle</label>
                    <textarea value={novedadEdit.descripcion} onChange={e => setNovedadEdit(p => ({ ...p, descripcion: e.target.value }))} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-between gap-2">
              {!novedadEditando ? (
                <>
                  {!novedadSel.leida
                    ? <button onClick={() => marcarNovedadLeida(novedadSel)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"><CheckCircle size={15} />Marcar como leída</button>
                    : <span className="text-xs text-slate-500">Novedad ya leída · puedes editarla o eliminarla</span>}
                  <div className="flex gap-2">
                    <button onClick={() => { setNovedadEdit({ titulo: novedadSel.titulo || '', descripcion: novedadSel.descripcion || '' }); setNovedadEditando(true) }} className="flex items-center gap-1.5 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm font-medium"><Edit size={14} />Editar</button>
                    {novedadSel.leida && <button onClick={() => eliminarNovedad(novedadSel)} className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg text-sm font-medium"><X size={14} />Eliminar</button>}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => setNovedadEditando(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium">Cancelar</button>
                  <button onClick={guardarNovedadEdit} disabled={guardandoNov} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">{guardandoNov ? 'Guardando…' : 'Guardar cambios'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
