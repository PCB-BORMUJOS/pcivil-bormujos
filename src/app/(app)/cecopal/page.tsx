'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import {
  Radio, Phone, AlertTriangle, Flame, Heart, Car, Waves, HelpCircle,
  Clock, Users, Truck, Shield, CheckCircle, MapPin,
  RefreshCw, Bell, FileText, Activity, Cloud, Wind, Droplets,
  Siren, Edit, Send, X, BookOpen
} from 'lucide-react'

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
  { campo: 'horaLlamada', label: 'T0 Llamada / Activación', color: 'bg-slate-600' },
  { campo: 'horaSalida', label: 'T1 Salida del Parque', color: 'bg-blue-600' },
  { campo: 'horaLlegada', label: 'T2 Llegada a Escena', color: 'bg-amber-600' },
  { campo: 'horaTerminado', label: 'T3 Fin Intervención', color: 'bg-emerald-600' },
  { campo: 'horaDisponible', label: 'T4 Unidad Disponible', color: 'bg-purple-600' },
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
  const [incidenciaActiva, setIncidenciaActiva] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<'turno' | 'nueva' | 'activa'>('turno')
  const [guardando, setGuardando] = useState(false)
  const [generandoParte, setGenerandoParte] = useState(false)
  const [novedadTexto, setNovedadTexto] = useState('')
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
  const [directorioOpen, setDirectorioOpen] = useState(false)
  const [contactos, setContactos] = useState<any[]>([])
  const [busquedaDir, setBusquedaDir] = useState('')
  const [categoriaDir, setCategoriaDir] = useState('')
  const [showNuevoContacto, setShowNuevoContacto] = useState(false)
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', entidad: '', categoria: '', cargo: '', telefono: '', telefonoAlt: '', email: '', extension3cx: '', disponibilidad: '', notas: '' })
  const [contactoEditando, setContactoEditando] = useState<any>(null)
  const [categoriasDir, setCategoriasDir] = useState<any[]>([])
  const [showGestionCategorias, setShowGestionCategorias] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', color: '#6366f1' })

  const cargarDatos = useCallback(async () => {
    try {
      const [rTurno, rVeh, rAlerta, rInc, rNov] = await Promise.all([
        fetch('/api/cecopal?tipo=turno-hoy').then(r => r.json()),
        fetch('/api/cecopal?tipo=vehiculos-disponibles').then(r => r.json()),
        fetch('/api/cecopal?tipo=alertas').then(r => r.json()),
        fetch('/api/cecopal?tipo=incidencia-activa').then(r => r.json()),
        fetch('/api/cecopal?tipo=novedades-hoy').then(r => r.json()),
      ])
      setTurno(rTurno.guardias || [])
      setVehiculos(rVeh.vehiculos || [])
      setAlertas(rAlerta)
      if (rInc.incidencia) { setIncidenciaActiva(rInc.incidencia); setModo('activa') }
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

  const cargarContactos = async (busqueda = '', categoria = '') => {
    try {
      const params = new URLSearchParams()
      if (busqueda) params.set('busqueda', busqueda)
      if (categoria) params.set('categoria', categoria)
      const [resC, resCat] = await Promise.all([
        fetch('/api/directorio?' + params.toString()),
        fetch('/api/directorio?tipo=categorias')
      ])
      const dataC = await resC.json()
      const dataCat = await resCat.json()
      setContactos(dataC.contactos || [])
      setCategoriasDir(dataCat.categorias || [])
    } catch (e) { console.error('Error cargando directorio:', e) }
  }

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
  const responsableTurno = turno.find(g => g.rol === 'Responsable' || g.rol === 'Apoyo/Cecopal' || g.rol === 'Cecopal')
  const totalAlertas = (alertas.botiquines?.length || 0) + (alertas.deas?.length || 0) + (alertas.vehiculos?.length || 0)
  const tipoActivo = TIPOS_INCIDENCIA.find(t => t.value === incidenciaActiva?.tipoIncidencia)
  const TipoIcon = tipoActivo?.icon || AlertTriangle

  const activarIsocrona = async (campo: string) => {
    if (!incidenciaActiva || incidenciaActiva[campo]) return
    const valor = getHoraActual()
    setIncidenciaActiva((prev: any) => ({ ...prev, [campo]: valor }))
    await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'isocrona', id: incidenciaActiva.id, campo, valor }) })
  }

  const crearIncidencia = async () => {
    if (!tipoSeleccionado || !origenSeleccionado || !direccion) return
    setGuardando(true)
    try {
      const res = await fetch('/api/cecopal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'incidencia', tipoIncidencia: tipoSeleccionado, origenAviso: origenSeleccionado, direccion, descripcion, horaLlamada: getHoraActual(), vehiculosIds: vehiculosSeleccionados, voluntariosIds: voluntariosSeleccionados }) })
      const data = await res.json()
      if (data.incidencia) { setIncidenciaActiva(data.incidencia); setModo('activa') }
      else { alert('Error: ' + (data.error || JSON.stringify(data))) }
    } catch (e) { alert('Error de red: ' + String(e)) } finally { setGuardando(false) }
  }

  const resolverIncidencia = async () => {
    if (!incidenciaActiva) return
    setGuardando(true)
    try {
      await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'resolver', id: incidenciaActiva.id, horaDisponible: incidenciaActiva.horaDisponible || getHoraActual(), observaciones: incidenciaActiva.observaciones }) })
      setIncidenciaActiva(null); setModo('turno'); await cargarDatos()
    } catch (e) { console.error('Error resolviendo incidencia:', e) } finally { setGuardando(false) }
  }

  const generarPartePSI = async () => {
    if (!incidenciaActiva) return
    setGenerandoParte(true)
    try {
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      const obsNovedades = novedadesHoy.length > 0 ? 'NOVEDADES DEL TURNO:\n' + novedadesHoy.map((n: any) => `- ${n.horaLlamada || ''} ${n.descripcion}`).join('\n') : ''
      const observacionesFinal = [incidenciaActiva.observaciones, obsNovedades].filter(Boolean).join('\n\n')
      const payload = { fecha: hoy, lugar: incidenciaActiva.direccion || '', motivo: incidenciaActiva.descripcion || incidenciaActiva.tipoIncidencia || '', horaLlamada: incidenciaActiva.horaLlamada || '', horaSalida: incidenciaActiva.horaSalida || '', horaLlegada: incidenciaActiva.horaLlegada || '', horaTerminado: incidenciaActiva.horaTerminado || '', horaDisponible: incidenciaActiva.horaDisponible || '', vehiculosIds: incidenciaActiva.vehiculosIds || [], observaciones: observacionesFinal, tipologias: [], equipoWalkies: [], tipologiasOtrosTexto: {}, fotosUrls: [], informacionExtra: JSON.stringify({ lugar: incidenciaActiva.direccion || '', motivo: incidenciaActiva.descripcion || incidenciaActiva.tipoIncidencia || '', tiempos: { llamada: incidenciaActiva.horaLlamada || '00:00', salida: incidenciaActiva.horaSalida || '00:00', llegada: incidenciaActiva.horaLlegada || '00:00', terminado: incidenciaActiva.horaTerminado || '00:00', disponible: incidenciaActiva.horaDisponible || '00:00' } }) }
      const res = await fetch('/api/partes/psi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { alert('Error: ' + (data.error || JSON.stringify(data.errores || data))); return }
      if (data.parte?.id) { window.location.href = `/partes/psi?id=${data.parte.id}` }
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
          <div className="relative">
            <button onClick={() => { setDirectorioOpen(v => !v); if (!directorioOpen) cargarContactos() }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-700 transition-colors">
              <BookOpen size={13} className="text-purple-400" />
              <span className="text-slate-300 text-xs font-medium">Directorio</span>
            </button>
            {directorioOpen && (
              <div className="absolute left-0 top-8 w-[420px] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[2000] overflow-hidden flex flex-col" style={{ maxHeight: '560px' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Directorio Telefónico</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowGestionCategorias(true)} className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors">Categorías</button>
                    <button onClick={() => setShowNuevoContacto(true)} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">+ Nuevo</button>
                    <button onClick={() => setDirectorioOpen(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                  </div>
                </div>
                <div className="p-3 border-b border-slate-700 flex-shrink-0 space-y-2">
                  <input value={busquedaDir} onChange={e => { setBusquedaDir(e.target.value); cargarContactos(e.target.value, categoriaDir) }} placeholder="Buscar nombre, entidad, teléfono, extensión..." className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                  <select value={categoriaDir} onChange={e => { setCategoriaDir(e.target.value); cargarContactos(busquedaDir, e.target.value) }} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500">
                    <option value="">Todas las categorías</option>
                    {categoriasDir.map((cat: any) => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
                  </select>
                </div>
                <div className="overflow-y-auto flex-1">
                  {contactos.length === 0
                    ? <div className="p-6 text-center text-slate-500 text-xs">Sin contactos</div>
                    : contactos.map((ct: any) => (
                      <div key={ct.id} className="px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-white text-xs font-semibold truncate">{ct.nombre}</p>
                              <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded flex-shrink-0">{ct.categoria}</span>
                            </div>
                            {ct.entidad && <p className="text-slate-400 text-xs truncate">{ct.entidad}{ct.cargo ? ` · ${ct.cargo}` : ''}</p>}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <a href={`tel:${ct.telefono}`} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-mono transition-colors"><Phone size={10} />{ct.telefono}</a>
                              {ct.telefonoAlt && <a href={`tel:${ct.telefonoAlt}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-mono transition-colors"><Phone size={10} />{ct.telefonoAlt}</a>}
                              {ct.extension3cx && <span className="text-xs text-purple-400 font-mono">3CX: {ct.extension3cx}</span>}
                              {ct.email && <a href={`mailto:${ct.email}`} className="text-xs text-amber-400 hover:text-amber-300 transition-colors truncate">{ct.email}</a>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => { setContactoEditando(ct); setShowNuevoContacto(true) }} className="p-1 text-slate-400 hover:text-blue-400 transition-colors" title="Editar">✏️</button>
                            <button onClick={async () => { if (!confirm('¿Eliminar contacto?')) return; await fetch(`/api/directorio?id=${ct.id}`, { method: 'DELETE' }); cargarContactos(busquedaDir, categoriaDir) }} className="p-1 text-slate-400 hover:text-red-400 transition-colors" title="Eliminar">🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={cargarDatos} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"><RefreshCw size={14} /></button>
            {modo !== 'activa' && <button onClick={() => setModo(modo === 'nueva' ? 'turno' : 'nueva')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-sm transition-all ${modo === 'nueva' ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40'}`}><Siren size={15} />{modo === 'nueva' ? 'Cancelar' : 'Nueva Incidencia'}</button>}
            {modo === 'activa' && <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-500/40 rounded-lg"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-red-300 text-sm font-semibold">INCIDENCIA ACTIVA — {incidenciaActiva?.numero}</span></div>}
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
                  <div key={g.id} className="px-3 py-2.5 flex items-center justify-between">
                    <div><p className="text-white text-xs font-medium">{g.usuario.nombre} {g.usuario.apellidos}</p><div className="flex items-center gap-1.5 mt-0.5">{g.usuario.numeroVoluntario && <span className="text-xs text-blue-400 font-mono">{g.usuario.numeroVoluntario}</span>}{g.rol && <span className="text-xs text-slate-500">{g.rol}</span>}</div></div>
                    {g.usuario.telefono && <a href={`tel:${g.usuario.telefono}`} className="text-slate-500 hover:text-emerald-400 transition-colors"><Phone size={12} /></a>}
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
                    <div key={n.id} className="px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-blue-400 font-mono text-xs">{n.horaLlamada || '--:--'}</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{n.descripcion}</p>
                    </div>
                  ))
                }
              </div>
              <div className="p-3 border-t border-slate-700 flex-shrink-0">
                <textarea value={novedadTexto} onChange={e => setNovedadTexto(e.target.value)} placeholder="Registrar novedad..." rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={async () => { if (!novedadTexto.trim()) return; await fetch('/api/cecopal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'novedad-turno', texto: novedadTexto }) }); setNovedadTexto(''); cargarDatos() }} disabled={!novedadTexto.trim()} className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"><Send size={11} /> Registrar</button>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden">
                    <div className={`p-4 border-b border-slate-700 flex items-center gap-3 ${tipoActivo?.color || 'bg-slate-700'}`}><TipoIcon size={18} className="text-white" /><div><p className="text-white font-bold text-sm">{tipoActivo?.label || incidenciaActiva.tipoIncidencia}</p><p className="text-white/60 text-xs">{incidenciaActiva.numero}</p></div></div>
                    <div className="p-4 space-y-3">
                      <div><p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Localización</p><p className="text-white text-sm flex items-start gap-1.5"><MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />{incidenciaActiva.direccion}</p></div>
                      {incidenciaActiva.descripcion && <div><p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Descripción</p><p className="text-slate-300 text-sm">{incidenciaActiva.descripcion}</p></div>}
                      <div><p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Origen</p><p className="text-white text-sm">{incidenciaActiva.origenAviso}</p></div>
                    </div>
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
                    <div className="flex gap-3"><div className="w-1 rounded-full bg-red-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Incidencia activada</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaLlamada || '—'} · {incidenciaActiva.origenAviso}</p></div></div>
                    {incidenciaActiva.horaSalida && <div className="flex gap-3"><div className="w-1 rounded-full bg-blue-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Salida del parque</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaSalida}</p></div></div>}
                    {incidenciaActiva.horaLlegada && <div className="flex gap-3"><div className="w-1 rounded-full bg-amber-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Llegada a escena</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaLlegada}</p></div></div>}
                    {incidenciaActiva.horaTerminado && <div className="flex gap-3"><div className="w-1 rounded-full bg-emerald-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Fin de intervención</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaTerminado}</p></div></div>}
                    {incidenciaActiva.horaDisponible && <div className="flex gap-3"><div className="w-1 rounded-full bg-purple-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Unidad disponible</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaDisponible}</p></div></div>}
                  </div>
                  <div className="p-3 border-t border-slate-700"><textarea placeholder="Añadir observación..." rows={2} value={incidenciaActiva.observaciones || ''} onChange={e => setIncidenciaActiva((prev: any) => ({ ...prev, observaciones: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" /></div>
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
      </div>

      {showNuevoContacto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold text-sm">{contactoEditando ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
              <button onClick={() => { setShowNuevoContacto(false); setContactoEditando(null) }} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs text-slate-400 mb-1">Nombre *</label><input value={contactoEditando ? contactoEditando.nombre : nuevoContacto.nombre} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, nombre: e.target.value})) : setNuevoContacto(p => ({...p, nombre: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Entidad</label><input value={contactoEditando ? contactoEditando.entidad || '' : nuevoContacto.entidad} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, entidad: e.target.value})) : setNuevoContacto(p => ({...p, entidad: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Cargo</label><input value={contactoEditando ? contactoEditando.cargo || '' : nuevoContacto.cargo} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, cargo: e.target.value})) : setNuevoContacto(p => ({...p, cargo: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Teléfono *</label><input value={contactoEditando ? contactoEditando.telefono : nuevoContacto.telefono} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, telefono: e.target.value})) : setNuevoContacto(p => ({...p, telefono: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Teléfono Alt.</label><input value={contactoEditando ? contactoEditando.telefonoAlt || '' : nuevoContacto.telefonoAlt} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, telefonoAlt: e.target.value})) : setNuevoContacto(p => ({...p, telefonoAlt: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Extensión 3CX</label><input value={contactoEditando ? contactoEditando.extension3cx || '' : nuevoContacto.extension3cx} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, extension3cx: e.target.value})) : setNuevoContacto(p => ({...p, extension3cx: e.target.value}))} placeholder="Ej: 101" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div className="col-span-2"><label className="block text-xs text-slate-400 mb-1">Email</label><input type="email" value={contactoEditando ? contactoEditando.email || '' : nuevoContacto.email} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, email: e.target.value})) : setNuevoContacto(p => ({...p, email: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Categoría *</label>
                  <select value={contactoEditando ? contactoEditando.categoria : nuevoContacto.categoria} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, categoria: e.target.value})) : setNuevoContacto(p => ({...p, categoria: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Seleccionar...</option>
                    {categoriasDir.map((cat: any) => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-slate-400 mb-1">Disponibilidad</label>
                  <select value={contactoEditando ? contactoEditando.disponibilidad || '' : nuevoContacto.disponibilidad} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, disponibilidad: e.target.value})) : setNuevoContacto(p => ({...p, disponibilidad: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Sin especificar</option>
                    <option value="24h">24 horas</option>
                    <option value="horario_oficina">Horario oficina</option>
                    <option value="guardia">Guardia</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs text-slate-400 mb-1">Notas</label><textarea value={contactoEditando ? contactoEditando.notas || '' : nuevoContacto.notas} onChange={e => contactoEditando ? setContactoEditando((p: any) => ({...p, notas: e.target.value})) : setNuevoContacto(p => ({...p, notas: e.target.value}))} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button onClick={() => { setShowNuevoContacto(false); setContactoEditando(null) }} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
                <button onClick={async () => {
                  const datos = contactoEditando || nuevoContacto
                  if (!datos.nombre || !datos.telefono || !datos.categoria) return
                  if (contactoEditando) {
                    await fetch('/api/directorio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactoEditando) })
                  } else {
                    await fetch('/api/directorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoContacto) })
                  }
                  setShowNuevoContacto(false)
                  setContactoEditando(null)
                  setNuevoContacto({ nombre: '', entidad: '', categoria: '', cargo: '', telefono: '', telefonoAlt: '', email: '', extension3cx: '', disponibilidad: '', notas: '' })
                  cargarContactos(busquedaDir, categoriaDir)
                }} disabled={!(contactoEditando ? contactoEditando.nombre && contactoEditando.telefono && contactoEditando.categoria : nuevoContacto.nombre && nuevoContacto.telefono && nuevoContacto.categoria)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGestionCategorias && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold text-sm">Gestión de Categorías</h3>
              <button onClick={() => setShowGestionCategorias(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input value={nuevaCategoria.nombre} onChange={e => setNuevaCategoria(p => ({...p, nombre: e.target.value}))} placeholder="Nueva categoría..." className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <input type="color" value={nuevaCategoria.color} onChange={e => setNuevaCategoria(p => ({...p, color: e.target.value}))} className="w-10 h-9 rounded-lg border border-slate-600 bg-slate-700 cursor-pointer" />
                <button onClick={async () => {
                  if (!nuevaCategoria.nombre.trim()) return
                  await fetch('/api/directorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'categoria', ...nuevaCategoria }) })
                  setNuevaCategoria({ nombre: '', color: '#6366f1' })
                  cargarContactos(busquedaDir, categoriaDir)
                }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">+</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categoriasDir.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-white text-sm">{cat.nombre}</span>
                    </div>
                    <button onClick={async () => { if (!confirm('¿Eliminar categoría?')) return; await fetch(`/api/directorio?id=${cat.id}&tipo=categoria`, { method: 'DELETE' }); cargarContactos(busquedaDir, categoriaDir) }} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                ))}
                {categoriasDir.length === 0 && <p className="text-slate-500 text-xs text-center py-3">Sin categorías creadas</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
