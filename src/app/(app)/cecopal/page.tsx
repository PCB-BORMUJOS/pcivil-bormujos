'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Radio, Phone, AlertTriangle, Flame, Heart, Car, Waves, HelpCircle,
  Clock, Users, Truck, Shield, CheckCircle, MapPin,
  RefreshCw, ChevronRight, Bell, FileText, Package, Activity,
  Siren, Edit, Send, Calendar, Zap, Plus, X
} from 'lucide-react'

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
  const [novedadTexto, setNovedadTexto] = useState('')
  const [tipoSeleccionado, setTipoSeleccionado] = useState('')
  const [origenSeleccionado, setOrigenSeleccionado] = useState('')
  const [direccion, setDireccion] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState<string[]>([])
  const [voluntariosSeleccionados, setVoluntariosSeleccionados] = useState<string[]>([])

  const cargarDatos = useCallback(async () => {
    try {
      const [rTurno, rVeh, rAlerta, rInc] = await Promise.all([
        fetch('/api/cecopal?tipo=turno-hoy').then(r => r.json()),
        fetch('/api/cecopal?tipo=vehiculos-disponibles').then(r => r.json()),
        fetch('/api/cecopal?tipo=alertas').then(r => r.json()),
        fetch('/api/cecopal?tipo=incidencia-activa').then(r => r.json()),
      ])
      setTurno(rTurno.guardias || [])
      setVehiculos(rVeh.vehiculos || [])
      setAlertas(rAlerta)
      if (rInc.incidencia) { setIncidenciaActiva(rInc.incidencia); setModo('activa') }
    } catch (e) { /* error silenciado */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

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
    } catch (e) { /* error silenciado */ } finally { setGuardando(false) }
  }

  const resolverIncidencia = async () => {
    if (!incidenciaActiva) return
    setGuardando(true)
    try {
      await fetch('/api/cecopal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'resolver', id: incidenciaActiva.id, horaDisponible: incidenciaActiva.horaDisponible || getHoraActual(), observaciones: incidenciaActiva.observaciones }) })
      setIncidenciaActiva(null); setModo('turno'); await cargarDatos()
    } catch (e) { /* error silenciado */ } finally { setGuardando(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-0">

      {/* HEADER */}
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

      {/* BARRA ESTADO TURNO */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-amber-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Resp.</span>
            <span className="text-white text-sm font-semibold">{responsableTurno ? `${responsableTurno.usuario.indicativo || ''} ${responsableTurno.usuario.nombre}` : <span className="text-slate-500 font-normal">Sin asignar</span>}</span>
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <div className="flex items-center gap-2">
            <Users size={13} className="text-blue-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Personal</span>
            <div className="flex gap-1.5 flex-wrap">
              {turno.length === 0 ? <span className="text-slate-500 text-sm">Sin guardias</span> : turno.map(g => <span key={g.id} className="px-2 py-0.5 rounded bg-slate-700 text-white text-xs font-mono border border-slate-600" title={`${g.usuario.nombre} ${g.usuario.apellidos} — ${g.rol || ''}`}>{g.usuario.indicativo || g.usuario.nombre}</span>)}
            </div>
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <div className="flex items-center gap-2">
            <Truck size={13} className="text-emerald-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Vehículos</span>
            <div className="flex gap-1.5">
              {vehiculos.length === 0 ? <span className="text-slate-500 text-sm">Ninguno</span> : vehiculos.map(v => <span key={v.id} className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 text-xs font-mono border border-emerald-700/40">{v.indicativo}</span>)}
            </div>
          </div>
          {totalAlertas > 0 && <><div className="w-px h-4 bg-slate-600" /><div className="flex items-center gap-1.5"><Bell size={13} className="text-amber-400" /><span className="text-amber-300 text-xs font-semibold">{totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}</span></div></>}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={cargarDatos} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors" title="Actualizar"><RefreshCw size={14} /></button>
            {modo !== 'activa' && <button onClick={() => setModo(modo === 'nueva' ? 'turno' : 'nueva')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${modo === 'nueva' ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40'}`}><Siren size={15} />{modo === 'nueva' ? 'Cancelar' : 'Nueva Incidencia'}</button>}
            {modo === 'activa' && <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-500/40 rounded-lg"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-red-300 text-sm font-semibold">INCIDENCIA ACTIVA — {incidenciaActiva?.numero}</span></div>}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="p-6">

        {/* MODO TURNO TRANQUILO */}
        {modo === 'turno' && (
          <div className="grid grid-cols-3 gap-5">
            {/* Personal */}
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Users size={14} className="text-blue-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Personal en Turno</h3></div>
                <div className="divide-y divide-slate-700/50">
                  {turno.length === 0 ? <div className="px-4 py-8 text-center text-slate-500 text-sm">Sin guardias para este turno</div> : turno.map(g => (
                    <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                      <div><p className="text-white text-sm font-medium">{g.usuario.nombre} {g.usuario.apellidos}</p><div className="flex items-center gap-2 mt-0.5">{g.usuario.indicativo && <span className="text-xs text-blue-400 font-mono">{g.usuario.indicativo}</span>}{g.rol && <span className="text-xs text-slate-500">{g.rol}</span>}</div></div>
                      {g.usuario.telefono && <a href={`tel:${g.usuario.telefono}`} className="text-slate-500 hover:text-emerald-400 transition-colors"><Phone size={13} /></a>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Truck size={14} className="text-emerald-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Flota Disponible</h3></div>
                <div className="divide-y divide-slate-700/50">
                  {vehiculos.length === 0 ? <div className="px-4 py-8 text-center text-slate-500 text-sm">Sin vehículos disponibles</div> : vehiculos.map(v => (
                    <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                      <div><p className="text-white text-sm font-semibold">{v.indicativo}</p><p className="text-slate-400 text-xs">{v.marca} {v.modelo} · {v.matricula}</p></div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alertas y accesos */}
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Bell size={14} className="text-amber-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Alertas Operativas</h3>{totalAlertas > 0 && <span className="ml-auto text-xs px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded-full border border-amber-700/40">{totalAlertas}</span>}</div>
                <div className="p-4 space-y-2">
                  {totalAlertas === 0 ? <div className="text-center py-8 text-emerald-400 flex flex-col items-center gap-2"><CheckCircle size={28} /><span className="text-sm font-medium">Todo operativo</span></div> : <>
                    {alertas.botiquines?.map((b: any) => <div key={b.id} className="flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg"><Package size={13} className="text-amber-400 flex-shrink-0" /><div className="min-w-0"><p className="text-white text-xs font-medium truncate">{b.nombre}</p><p className="text-amber-400 text-xs">Botiquín — Revisión pendiente</p></div></div>)}
                    {alertas.deas?.map((d: any) => <div key={d.id} className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-700/30 rounded-lg"><Heart size={13} className="text-red-400 flex-shrink-0" /><div className="min-w-0"><p className="text-white text-xs font-medium truncate">{d.codigo} — {d.ubicacion}</p><p className="text-red-400 text-xs">DEA — Caducidad próxima</p></div></div>)}
                    {alertas.vehiculos?.map((v: any) => <div key={v.id} className="flex items-center gap-3 p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg"><Truck size={13} className="text-orange-400 flex-shrink-0" /><div className="min-w-0"><p className="text-white text-xs font-medium">{v.indicativo} — {v.matricula}</p><p className="text-orange-400 text-xs">{v.fechaItv ? `ITV: ${new Date(v.fechaItv).toLocaleDateString('es-ES')}` : ''}{v.fechaSeguro ? ` · Seguro: ${new Date(v.fechaSeguro).toLocaleDateString('es-ES')}` : ''}</p></div></div>)}
                  </>}
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Zap size={14} className="text-purple-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Acceso Rápido</h3></div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {[{ label: 'Nuevo Parte PSI', href: '/partes', icon: FileText, color: 'text-blue-400' }, { label: 'Cuadrante', href: '/cuadrantes', icon: Calendar, color: 'text-amber-400' }, { label: 'Vehículos', href: '/vehiculos', icon: Truck, color: 'text-emerald-400' }, { label: 'Manuales', href: '/manuales', icon: FileText, color: 'text-purple-400' }].map(item => (
                    <a key={item.label} href={item.href} className="flex items-center gap-2 px-3 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600/50 group">
                      <item.icon size={13} className={item.color} />
                      <span className="text-slate-300 text-xs font-medium group-hover:text-white">{item.label}</span>
                      <ChevronRight size={11} className="ml-auto text-slate-600 group-hover:text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Novedades */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col" style={{maxHeight:'520px'}}>
              <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Edit size={14} className="text-slate-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Novedades del Turno</h3></div>
              <div className="flex-1 overflow-y-auto p-4"><p className="text-slate-500 text-xs text-center mt-8">Las novedades aparecerán aquí.</p></div>
              <div className="p-4 border-t border-slate-700">
                <textarea value={novedadTexto} onChange={e => setNovedadTexto(e.target.value)} placeholder="Registrar novedad del turno..." rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={async () => { if (!novedadTexto.trim()) return; await fetch('/api/cecopal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'novedad-turno', texto: novedadTexto }) }); setNovedadTexto('') }} disabled={!novedadTexto.trim()} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"><Send size={13} /> Registrar</button>
              </div>
            </div>
          </div>
        )}

        {/* MODO NUEVA INCIDENCIA */}
        {modo === 'nueva' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden">
              <div className="bg-red-900/40 px-6 py-4 border-b border-red-500/30 flex items-center gap-3">
                <Siren size={20} className="text-red-400" />
                <h2 className="text-white text-lg font-bold">Nueva Activación</h2>
                <span className="text-red-300 text-sm font-mono">{new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}</span>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tipo de Incidencia *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIPOS_INCIDENCIA.map(t => { const Icon = t.icon; return (<button key={t.value} onClick={() => setTipoSeleccionado(t.value)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${tipoSeleccionado === t.value ? `${t.color} border-transparent text-white shadow-lg` : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'}`}><Icon size={22} /><span className="text-xs font-semibold text-center leading-tight">{t.label}</span></button>) })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Origen del Aviso *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ORIGENES_AVISO.map(o => { const Icon = o.icon; return (<button key={o.value} onClick={() => setOrigenSeleccionado(o.value)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${origenSeleccionado === o.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'}`}><Icon size={13} />{o.label}</button>) })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Localización *</label>
                    <div className="relative"><MapPin size={13} className="absolute left-3 top-3 text-slate-400" /><input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Dirección o punto kilométrico..." className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" /></div>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción de la incidencia..." rows={2} className="mt-2 w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Vehículos Asignados</label>
                    <div className="space-y-2">
                      {vehiculos.map(v => (<label key={v.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:border-slate-500"><input type="checkbox" checked={vehiculosSeleccionados.includes(v.id)} onChange={e => setVehiculosSeleccionados(prev => e.target.checked ? [...prev, v.id] : prev.filter(id => id !== v.id))} className="accent-blue-500" /><div><p className="text-white text-sm font-medium">{v.indicativo}</p><p className="text-slate-400 text-xs">{v.matricula}</p></div></label>))}
                      {vehiculos.length === 0 && <p className="text-slate-500 text-sm">Sin vehículos disponibles</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Asignado</label>
                    <div className="space-y-2">
                      {turno.map(g => (<label key={g.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:border-slate-500"><input type="checkbox" checked={voluntariosSeleccionados.includes(g.usuarioId)} onChange={e => setVoluntariosSeleccionados(prev => e.target.checked ? [...prev, g.usuarioId] : prev.filter(id => id !== g.usuarioId))} className="accent-blue-500" /><div><p className="text-white text-sm font-medium">{g.usuario.indicativo || g.usuario.nombre}</p><p className="text-slate-400 text-xs">{g.rol || ''}</p></div></label>))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                  <button onClick={() => setModo('turno')} className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancelar</button>
                  <button onClick={crearIncidencia} disabled={!tipoSeleccionado || !origenSeleccionado || !direccion || guardando} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-lg transition-colors"><Siren size={15} />{guardando ? 'Activando...' : 'Activar Incidencia'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODO INCIDENCIA ACTIVA */}
        {modo === 'activa' && incidenciaActiva && (
          <div className="grid grid-cols-3 gap-5">
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden">
                <div className={`p-4 border-b border-slate-700 flex items-center gap-3 ${tipoActivo?.color || 'bg-slate-700'}`}>
                  <TipoIcon size={18} className="text-white" />
                  <div><p className="text-white font-bold text-sm">{tipoActivo?.label || incidenciaActiva.tipoIncidencia}</p><p className="text-white/60 text-xs">{incidenciaActiva.numero}</p></div>
                </div>
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
                  {turno.filter((g: any) => (incidenciaActiva.voluntariosIds || []).includes(g.usuarioId)).map((g: any) => (<div key={g.id} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg"><Users size={12} className="text-blue-400" /><span className="text-white text-sm font-medium">{g.usuario.indicativo || g.usuario.nombre}</span><span className="text-slate-400 text-xs">{g.rol}</span></div>))}
                  {(incidenciaActiva.vehiculosIds || []).length === 0 && (incidenciaActiva.voluntariosIds || []).length === 0 && <p className="text-slate-500 text-xs text-center py-2">Sin recursos asignados</p>}
                </div>
              </div>
            </div>

            {/* Isocronas */}
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Clock size={14} className="text-amber-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Isocronas de Intervención</h3></div>
                <div className="p-4 space-y-3">
                  {ISOCRONAS.map(iso => {
                    const valor = incidenciaActiva[iso.campo]
                    return (
                      <div key={iso.campo} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${iso.color} flex items-center justify-center flex-shrink-0`}><Clock size={13} className="text-white" /></div>
                          <span className="text-slate-300 text-sm">{iso.label}</span>
                        </div>
                        {valor
                          ? <div className="flex items-center gap-2"><span className="text-white font-mono font-bold text-xl">{valor}</span><CheckCircle size={14} className="text-emerald-400" /></div>
                          : <button onClick={() => activarIsocrona(iso.campo)} className={`flex items-center gap-1.5 px-3 py-2 ${iso.color} hover:opacity-90 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-lg`}><Clock size={11} /> Marcar</button>
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</p>
                  <a href="/partes" className="flex items-center gap-2 w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors"><FileText size={15} /> Generar Parte PSI</a>
                  <button onClick={resolverIncidencia} disabled={guardando} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"><CheckCircle size={15} />{guardando ? 'Cerrando...' : 'Resolver Incidencia'}</button>
                </div>
              </div>
            </div>

            {/* Log */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col" style={{maxHeight:'600px'}}>
              <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2"><Activity size={14} className="text-purple-400" /><h3 className="text-white text-xs font-semibold uppercase tracking-wider">Log de la Incidencia</h3></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="w-1 rounded-full bg-red-500 flex-shrink-0" />
                  <div><p className="text-white text-xs font-medium">Incidencia activada</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaLlamada || '—'} · Origen: {incidenciaActiva.origenAviso}</p></div>
                </div>
                {incidenciaActiva.horaSalida && <div className="flex gap-3"><div className="w-1 rounded-full bg-blue-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Salida del parque</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaSalida}</p></div></div>}
                {incidenciaActiva.horaLlegada && <div className="flex gap-3"><div className="w-1 rounded-full bg-amber-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Llegada a escena</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaLlegada}</p></div></div>}
                {incidenciaActiva.horaTerminado && <div className="flex gap-3"><div className="w-1 rounded-full bg-emerald-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Fin de intervención</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaTerminado}</p></div></div>}
                {incidenciaActiva.horaDisponible && <div className="flex gap-3"><div className="w-1 rounded-full bg-purple-500 flex-shrink-0" /><div><p className="text-white text-xs font-medium">Unidad disponible</p><p className="text-slate-500 text-xs">{incidenciaActiva.horaDisponible}</p></div></div>}
              </div>
              <div className="p-4 border-t border-slate-700">
                <textarea placeholder="Añadir observación al log..." rows={2} value={incidenciaActiva.observaciones || ''} onChange={e => setIncidenciaActiva((prev: any) => ({ ...prev, observaciones: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
