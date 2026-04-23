'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Zap, RefreshCw, Users, Clock, ChevronDown, Plus,
  CheckCircle2, Circle, X, BookOpen, AlertTriangle,
  FileText, Edit, Trash2, Target, Shield, Settings
} from 'lucide-react'

const FAMILIAS: Record<string, { label: string; color: string }> = {
  socorrismo: { label: 'Socorrismo', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  incendios: { label: 'Incendios', color: 'bg-red-100 text-red-700 border-red-200' },
  rescate: { label: 'Rescate', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  transmisiones: { label: 'Transmisiones', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  drones: { label: 'Drones', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  pma: { label: 'PMA', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  vehiculos: { label: 'Vehículos', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}
const NIVELES: Record<string, string> = {
  basico: 'bg-green-100 text-green-700',
  intermedio: 'bg-amber-100 text-amber-700',
  avanzado: 'bg-red-100 text-red-700',
}
const estadoColor: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  en_curso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}
const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  auto: { label: 'Automático', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200' },
  manual: { label: 'Manual', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
  incidente: { label: 'Incidente Real', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' },
}

interface Voluntario { id: string; nombre: string; apellidos: string; numeroVoluntario: string }
interface PracticaDisponible { id: string; numero: string; titulo: string; familia: string; duracionEstimada: number; nivel: string }
interface PracticaSugerida {
  orden: number; practicaId: string; numero: string; titulo: string
  familia: string; duracionEstimada: number; nivel: string
  vecesRealizadas: number; vecesConEsteEquipo: number
}
interface Megacode {
  id: string; numero: string; titulo?: string; tipo: string
  fecha: string; turno: string; estado: string; generadoAuto: boolean
  observaciones?: string; escenario?: string; objetivos?: string
  recursos?: string; leccionesAprendidas?: string; nivelDificultad?: string
  incidenteOrigen?: string; fechaIncidente?: string; duracionTotal?: number
  practicas: Array<{
    id: string; practicaId: string; orden: number; completada: boolean
    tiempoReal?: number; observaciones?: string
    practica: { titulo: string; numero: string; familia: string; duracionEstimada: number }
  }>
  participaciones: Array<{
    id: string; usuarioId: string; resultado: string
    usuario: { nombre: string; apellidos: string; numeroVoluntario: string }
  }>
}

const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 transition-colors bg-white"
const lbl = "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2"

export default function MegacodePage() {
  const { data: session } = useSession()
  const [megacodes, setMegacodes] = useState<Megacode[]>([])
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [practicasDisponibles, setPracticasDisponibles] = useState<PracticaDisponible[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [showGenerador, setShowGenerador] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [sugeridas, setSugeridas] = useState<PracticaSugerida[]>([])
  const [tiempoTotal, setTiempoTotal] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [configGen, setConfigGen] = useState({
    fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }),
    turno: 'manana', tiempo: 90, participantes: [] as string[]
  })
  // Estado formulario manual
  const [formManual, setFormManual] = useState({
    numero: '', titulo: '', tipo: 'incidente', fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }),
    turno: 'manana', nivelDificultad: 'intermedio', incidenteOrigen: '',
    fechaIncidente: '', escenario: '', objetivos: '', recursos: '',
    leccionesAprendidas: '', observaciones: '', participantes: [] as string[],
    practicasSeleccionadas: [] as { practicaId: string; orden: number }[]
  })

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [resMeg, resVol, resPrac] = await Promise.all([
        fetch('/api/megacode?tipo=lista'),
        fetch('/api/admin/personal?roles=true'),
        fetch('/api/megacode?tipo=practicas')
      ])
      const [dataMeg, dataVol, dataPrac] = await Promise.all([resMeg.json(), resVol.json(), resPrac.json()])
      setMegacodes(dataMeg.megacodes || [])
      setVoluntarios(dataVol.voluntarios || [])
      setPracticasDisponibles(dataPrac.practicas || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargarDatos() }, [])

  const generarSugerencia = async () => {
    setGenerando(true); setSugeridas([])
    try {
      const params = new URLSearchParams({
        tipo: 'generar', turno: configGen.turno, fecha: configGen.fecha,
        tiempo: String(configGen.tiempo), participantes: configGen.participantes.join(',')
      })
      const res = await fetch('/api/megacode?' + params)
      const data = await res.json()
      setSugeridas(data.practicas || [])
      setTiempoTotal(data.tiempoTotal || 0)
    } catch (e) { console.error(e) }
    finally { setGenerando(false) }
  }

  const guardarMegacodeAuto = async () => {
    if (sugeridas.length === 0) return
    setSaving(true)
    const res = await fetch('/api/megacode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: configGen.fecha, turno: configGen.turno, generadoAuto: true, tipo: 'auto',
        practicas: sugeridas.map(p => ({ practicaId: p.practicaId, orden: p.orden })),
        participantes: configGen.participantes
      })
    })
    setSaving(false)
    if (res.ok) { setShowGenerador(false); setSugeridas([]); cargarDatos() }
  }

  const guardarMegacodeManual = async () => {
    if (formManual.practicasSeleccionadas.length === 0) { alert('Selecciona al menos una práctica'); return }
    setSaving(true)
    const res = await fetch('/api/megacode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formManual,
        generadoAuto: false,
        practicas: formManual.practicasSeleccionadas,
        participantes: formManual.participantes
      })
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { alert(data.error); return }
    setShowManual(false)
    setFormManual({ numero: '', titulo: '', tipo: 'incidente', fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }), turno: 'manana', nivelDificultad: 'intermedio', incidenteOrigen: '', fechaIncidente: '', escenario: '', objetivos: '', recursos: '', leccionesAprendidas: '', observaciones: '', participantes: [], practicasSeleccionadas: [] })
    cargarDatos()
  }

  const togglePractica = async (megacodeId: string, practicaId: string, completada: boolean) => {
    await fetch('/api/megacode', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: megacodeId, practicaId, completada: !completada })
    })
    setMegacodes(prev => prev.map(m => m.id !== megacodeId ? m : {
      ...m, practicas: m.practicas.map(p => p.practicaId === practicaId ? { ...p, completada: !completada } : p)
    }))
  }

  const togglePracticaManual = (practicaId: string) => {
    setFormManual(prev => {
      const existe = prev.practicasSeleccionadas.find(p => p.practicaId === practicaId)
      if (existe) {
        const nuevas = prev.practicasSeleccionadas.filter(p => p.practicaId !== practicaId).map((p, i) => ({ ...p, orden: i + 1 }))
        return { ...prev, practicasSeleccionadas: nuevas }
      } else {
        return { ...prev, practicasSeleccionadas: [...prev.practicasSeleccionadas, { practicaId, orden: prev.practicasSeleccionadas.length + 1 }] }
      }
    })
  }

  const isAdmin = ['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(((session?.user as any)?.rol || '').toLowerCase())
  const megacodesFiltrados = filtroTipo === 'all' ? megacodes : megacodes.filter(m => m.tipo === filtroTipo)

  return (
    <div className="min-h-screen" style={{background: '#f8fafc'}}>
      {/* HEADER */}
      <div style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)'}}>
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl" style={{background: 'linear-gradient(135deg, #7c3aed, #6d28d9)'}}>
                <Zap size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Megacode</h1>
                <p className="text-purple-300 text-sm mt-0.5">Sesiones de prácticas operativas · Generación automática e incidentes reales</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={cargarDatos} className="p-3 rounded-xl border border-purple-700/50 hover:bg-purple-800/30 transition-colors">
                <RefreshCw size={16} className="text-purple-300" />
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setShowManual(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-500/50 hover:bg-purple-800/30 text-purple-200 hover:text-white text-sm font-semibold transition-colors">
                    <Plus size={15} /> Nuevo Megacode
                  </button>
                  <button onClick={() => { setShowGenerador(true); setSugeridas([]) }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg"
                    style={{background: 'linear-gradient(135deg, #7c3aed, #6d28d9)'}}>
                    <Zap size={16} /> Generar Auto
                  </button>
                </>
              )}
            </div>
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total', value: megacodes.length, color: '#a78bfa' },
              { label: 'Completados', value: megacodes.filter(m => m.estado === 'completado').length, color: '#22c55e' },
              { label: 'Pendientes', value: megacodes.filter(m => m.estado === 'pendiente').length, color: '#f59e0b' },
              { label: 'En curso', value: megacodes.filter(m => m.estado === 'en_curso').length, color: '#3b82f6' },
              { label: 'Incidentes', value: megacodes.filter(m => m.tipo === 'incidente').length, color: '#f97316' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-4 border" style={{background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)'}}>
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">{k.label}</p>
                <p className="text-3xl font-black mt-1" style={{color: k.color}}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {[{id:'all',label:'Todos'},{id:'auto',label:'Automático'},{id:'incidente',label:'Incidente Real'},{id:'manual',label:'Manual'}].map(f => (
                <button key={f.id} onClick={() => setFiltroTipo(f.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroTipo === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-slate-400 font-medium ml-auto">{megacodesFiltrados.length} megacode{megacodesFiltrados.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw size={32} className="animate-spin text-purple-400" />
          </div>
        ) : megacodesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200">
            <Zap size={48} className="text-slate-200 mb-4" />
            <p className="text-lg font-bold text-slate-500">No hay megacodes</p>
            {isAdmin && <button onClick={() => setShowManual(true)} className="mt-3 text-purple-600 text-sm font-medium hover:underline">+ Crear el primero</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {megacodesFiltrados.map(m => {
              const isOpen = expandido === m.id
              const completadas = m.practicas.filter(p => p.completada).length
              const total = m.practicas.length
              const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
              const tiempoMegacode = m.practicas.reduce((a, p) => a + (p.practica?.duracionEstimada || 0), 0)
              const tipoInfo = TIPO_CONFIG[m.tipo] || TIPO_CONFIG.manual
              return (
                <div key={m.id} className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${isOpen ? 'border-purple-300 shadow-lg' : 'border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md'}`}>
                  <button onClick={() => setExpandido(isOpen ? null : m.id)} className="w-full text-left px-6 py-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Estado dot */}
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${
                        m.estado === 'completado' ? 'bg-green-500' : m.estado === 'en_curso' ? 'bg-blue-500' : m.estado === 'pendiente' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm font-black text-slate-500">{m.numero}</span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tipoInfo.bg} ${tipoInfo.color}`}>{tipoInfo.label}</span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${estadoColor[m.estado] || 'bg-slate-100 text-slate-600'}`}>{m.estado.replace('_', ' ')}</span>
                        </div>
                        {m.titulo && <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{m.titulo}</h3>}
                        {m.incidenteOrigen && <p className="text-sm text-orange-600 font-medium mb-1">📍 {m.incidenteOrigen}</p>}
                        <p className="text-sm text-slate-600">
                          {new Date(m.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {m.turno === 'manana' ? 'Mañana' : m.turno === 'tarde' ? 'Tarde' : 'Noche'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-slate-400" />{total} prácticas</span>
                          <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{tiempoMegacode} min</span>
                          <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" />{m.participaciones.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-400">Progreso</span>
                              <span className="font-bold text-slate-600">{pct}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{width: pct + '%', background: pct === 100 ? '#22c55e' : '#7c3aed'}} />
                            </div>
                          </div>
                          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-slate-100">
                      {/* Info incidente */}
                      {(m.escenario || m.objetivos || m.recursos || m.leccionesAprendidas) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
                          {m.escenario && (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                              <p className="text-xs font-black text-orange-700 uppercase tracking-widest mb-2">Escenario del incidente</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{m.escenario}</p>
                            </div>
                          )}
                          {m.objetivos && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                              <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">Objetivos</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{m.objetivos}</p>
                            </div>
                          )}
                          {m.recursos && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                              <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">Recursos necesarios</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{m.recursos}</p>
                            </div>
                          )}
                          {m.leccionesAprendidas && (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                              <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-2">Lecciones aprendidas</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{m.leccionesAprendidas}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-6 space-y-5">
                        {/* Participantes */}
                        {m.participaciones.length > 0 && (
                          <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Participantes ({m.participaciones.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {m.participaciones.map(p => (
                                <span key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-700">
                                  <span className="font-mono text-xs text-slate-400">{p.usuario.numeroVoluntario}</span>
                                  {p.usuario.nombre} {p.usuario.apellidos}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prácticas */}
                        <div>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Prácticas del megacode</p>
                          <div className="space-y-2">
                            {m.practicas.sort((a, b) => a.orden - b.orden).map(p => (
                              <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${p.completada ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                <button onClick={() => togglePractica(m.id, p.practicaId, p.completada)}
                                  className={`flex-shrink-0 ${p.completada ? 'text-green-500' : 'text-slate-300 hover:text-purple-400'}`}>
                                  {p.completada ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                </button>
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                                  style={{background: p.completada ? '#dcfce7' : '#f3f4f6', color: p.completada ? '#16a34a' : '#6b7280'}}>
                                  {p.orden}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs text-slate-400">{p.practica?.numero}</span>
                                    <span className={`text-base font-bold ${p.completada ? 'line-through text-slate-400' : 'text-slate-900'}`}>{p.practica?.titulo}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${FAMILIAS[p.practica?.familia]?.color || 'bg-gray-100 text-gray-700'}`}>
                                      {FAMILIAS[p.practica?.familia]?.label || p.practica?.familia}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={11} />{p.practica?.duracionEstimada} min</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Observaciones */}
                        {m.observaciones && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Observaciones</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{m.observaciones}</p>
                          </div>
                        )}

                        {/* Cambiar estado */}
                        {isAdmin && (
                          <div className="flex gap-2 pt-4 border-t-2 border-slate-100">
                            {['pendiente', 'en_curso', 'completado', 'cancelado'].map(est => (
                              <button key={est} onClick={async () => {
                                await fetch('/api/megacode', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, estado: est }) })
                                setMegacodes(prev => prev.map(mg => mg.id === m.id ? { ...mg, estado: est } : mg))
                              }} className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${m.estado === est ? estadoColor[est] + ' border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                {est.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ MODAL GENERADOR AUTOMÁTICO ══════════════════════════════════════ */}
      {showGenerador && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{background: 'linear-gradient(135deg, #1e1b4b, #2e1065)'}}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center"><Zap size={18} className="text-white" /></div>
                <div><h3 className="font-black text-white">Generador Automático</h3><p className="text-xs text-purple-300">El algoritmo selecciona prácticas balanceadas</p></div>
              </div>
              <button onClick={() => setShowGenerador(false)}><X size={20} className="text-purple-300 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div><label className={lbl}>Fecha</label><input type="date" value={configGen.fecha} onChange={e => setConfigGen({...configGen, fecha: e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Turno</label><select value={configGen.turno} onChange={e => setConfigGen({...configGen, turno: e.target.value})} className={inp}><option value="manana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></div>
                <div><label className={lbl}>Tiempo (min)</label><input type="number" value={configGen.tiempo} min={30} max={180} onChange={e => setConfigGen({...configGen, tiempo: parseInt(e.target.value)})} className={inp} /></div>
              </div>
              <div>
                <label className={lbl}>Participantes del turno</label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {voluntarios.map(v => (
                    <label key={v.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${configGen.participantes.includes(v.id) ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={configGen.participantes.includes(v.id)} onChange={e => setConfigGen(prev => ({...prev, participantes: e.target.checked ? [...prev.participantes, v.id] : prev.participantes.filter(id => id !== v.id)}))} className="w-4 h-4 accent-purple-600" />
                      <span className="font-mono text-xs text-slate-400 w-14">{v.numeroVoluntario}</span>
                      <span className="text-sm text-slate-700 font-medium">{v.nombre} {v.apellidos}</span>
                    </label>
                  ))}
                </div>
                {configGen.participantes.length > 0 && <p className="text-xs text-purple-600 font-bold mt-1">{configGen.participantes.length} participante/s</p>}
              </div>
              <button onClick={generarSugerencia} disabled={generando} className="w-full py-3 text-white font-black rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors" style={{background: 'linear-gradient(135deg, #7c3aed, #6d28d9)'}}>
                <Zap size={16} />{generando ? 'Generando...' : 'Generar sugerencia automática'}
              </button>
              {sugeridas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-800">{sugeridas.length} prácticas sugeridas</p>
                    <span className="text-sm text-slate-500 flex items-center gap-1 font-medium"><Clock size={14} />{tiempoTotal} min total</span>
                  </div>
                  <div className="space-y-2">
                    {sugeridas.map(p => (
                      <div key={p.practicaId} className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0">{p.orden}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-400">{p.numero}</span>
                            <span className="text-sm font-bold text-slate-800">{p.titulo}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${FAMILIAS[p.familia]?.color || ''}`}>{FAMILIAS[p.familia]?.label || p.familia}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                            <span><Clock size={10} className="inline mr-0.5" />{p.duracionEstimada} min</span>
                            <span>{p.vecesConEsteEquipo === 0 ? '⭐ Nunca con este equipo' : p.vecesConEsteEquipo + 'x con este equipo'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <button onClick={generarSugerencia} className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} />Regenerar</button>
                    <button onClick={guardarMegacodeAuto} disabled={saving} className="px-6 py-2.5 text-white text-sm font-black rounded-xl disabled:opacity-50 transition-colors" style={{background: 'linear-gradient(135deg, #22c55e, #16a34a)'}}>
                      {saving ? 'Guardando...' : '✓ Confirmar y guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL NUEVO MEGACODE MANUAL ══════════════════════════════════════ */}
      {showManual && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{background: 'linear-gradient(135deg, #1e1b4b, #2e1065)'}}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center"><AlertTriangle size={18} className="text-white" /></div>
                <div><h3 className="font-black text-white">Nuevo Megacode</h3><p className="text-xs text-purple-300">Manual o basado en incidente real</p></div>
              </div>
              <button onClick={() => setShowManual(false)}><X size={20} className="text-purple-300 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-6">

              {/* Identificación */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Número (vacío = automático)</label><input value={formManual.numero} onChange={e => setFormManual({...formManual, numero: e.target.value})} placeholder="Ej: MCI-2025-0001" className={`${inp} font-mono font-bold`} /></div>
                  <div><label className={lbl}>Tipo</label>
                    <select value={formManual.tipo} onChange={e => setFormManual({...formManual, tipo: e.target.value})} className={inp}>
                      <option value="incidente">Incidente Real</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div className="col-span-2"><label className={lbl}>Título *</label><input value={formManual.titulo} onChange={e => setFormManual({...formManual, titulo: e.target.value})} placeholder="Ej: Atropello múltiple en la N-630, KM 45" className={inp} /></div>
                  <div><label className={lbl}>Fecha de realización</label><input type="date" value={formManual.fecha} onChange={e => setFormManual({...formManual, fecha: e.target.value})} className={inp} /></div>
                  <div><label className={lbl}>Turno</label><select value={formManual.turno} onChange={e => setFormManual({...formManual, turno: e.target.value})} className={inp}><option value="manana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></div>
                  <div><label className={lbl}>Nivel de dificultad</label><select value={formManual.nivelDificultad} onChange={e => setFormManual({...formManual, nivelDificultad: e.target.value})} className={inp}><option value="basico">Básico</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select></div>
                  {formManual.tipo === 'incidente' && <>
                    <div><label className={lbl}>Fecha del incidente original</label><input type="date" value={formManual.fechaIncidente} onChange={e => setFormManual({...formManual, fechaIncidente: e.target.value})} className={inp} /></div>
                    <div className="col-span-2"><label className={lbl}>Incidente de origen</label><input value={formManual.incidenteOrigen} onChange={e => setFormManual({...formManual, incidenteOrigen: e.target.value})} placeholder="Ej: Accidente de tráfico múltiple, Calle Alameda 15" className={inp} /></div>
                  </>}
                </div>
              </div>

              {/* Contenido operativo */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Contenido operativo</p>
                <div className="space-y-4">
                  <div><label className={lbl}>Escenario del incidente / Descripción</label><textarea value={formManual.escenario} onChange={e => setFormManual({...formManual, escenario: e.target.value})} rows={3} placeholder="Describe el escenario del incidente, las condiciones y el contexto operativo..." className={inp} /></div>
                  <div><label className={lbl}>Objetivos de aprendizaje</label><textarea value={formManual.objetivos} onChange={e => setFormManual({...formManual, objetivos: e.target.value})} rows={2} placeholder="¿Qué competencias se trabajan con este megacode?" className={inp} /></div>
                  <div><label className={lbl}>Recursos necesarios</label><textarea value={formManual.recursos} onChange={e => setFormManual({...formManual, recursos: e.target.value})} rows={2} placeholder="Material, vehículos, personal mínimo, equipamiento especial..." className={inp} /></div>
                  <div><label className={lbl}>Lecciones aprendidas del incidente</label><textarea value={formManual.leccionesAprendidas} onChange={e => setFormManual({...formManual, leccionesAprendidas: e.target.value})} rows={3} placeholder="Puntos clave, errores detectados, mejoras implementadas..." className={inp} /></div>
                  <div><label className={lbl}>Observaciones adicionales</label><textarea value={formManual.observaciones} onChange={e => setFormManual({...formManual, observaciones: e.target.value})} rows={2} placeholder="Notas adicionales..." className={inp} /></div>
                </div>
              </div>

              {/* Prácticas */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Prácticas del megacode</p>
                  {formManual.practicasSeleccionadas.length > 0 && (
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
                      {formManual.practicasSeleccionadas.length} seleccionadas · {practicasDisponibles.filter(p => formManual.practicasSeleccionadas.find(s => s.practicaId === p.id)).reduce((a, p) => a + p.duracionEstimada, 0)} min
                    </span>
                  )}
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  {practicasDisponibles.map(p => {
                    const sel = formManual.practicasSeleccionadas.find(s => s.practicaId === p.id)
                    return (
                      <label key={p.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${sel ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={!!sel} onChange={() => togglePracticaManual(p.id)} className="w-4 h-4 accent-purple-600" />
                        {sel && <span className="w-6 h-6 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{sel.orden}</span>}
                        <span className="font-mono text-xs text-slate-400 w-16">{p.numero}</span>
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{p.titulo}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${FAMILIAS[p.familia]?.color || ''}`}>{FAMILIAS[p.familia]?.label || p.familia}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0"><Clock size={10} className="inline mr-0.5" />{p.duracionEstimada}m</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Participantes */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Participantes</p>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {voluntarios.map(v => (
                    <label key={v.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${formManual.participantes.includes(v.id) ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={formManual.participantes.includes(v.id)} onChange={e => setFormManual(prev => ({...prev, participantes: e.target.checked ? [...prev.participantes, v.id] : prev.participantes.filter(id => id !== v.id)}))} className="w-4 h-4 accent-purple-600" />
                      <span className="font-mono text-xs text-slate-400 w-14">{v.numeroVoluntario}</span>
                      <span className="text-sm font-medium text-slate-700">{v.nombre} {v.apellidos}</span>
                      {formManual.participantes.includes(v.id) && <CheckCircle2 size={15} className="text-purple-500 ml-auto" />}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-100">
                <button onClick={() => setShowManual(false)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={guardarMegacodeManual} disabled={saving || !formManual.titulo}
                  className="px-8 py-2.5 text-white text-sm font-black rounded-xl disabled:opacity-50 shadow-lg transition-all hover:scale-105"
                  style={{background: 'linear-gradient(135deg, #7c3aed, #6d28d9)'}}>
                  {saving ? 'Guardando...' : 'Crear megacode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
