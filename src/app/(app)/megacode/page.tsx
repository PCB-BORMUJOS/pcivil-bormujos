'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Zap, RefreshCw, Users, Clock, ChevronDown,
  CheckCircle2, Circle, X, BookOpen
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

interface Voluntario { id: string; nombre: string; apellidos: string; numeroVoluntario: string }
interface PracticaSugerida {
  orden: number; practicaId: string; numero: string; titulo: string
  familia: string; duracionEstimada: number; nivel: string
  vecesRealizadas: number; vecesConEsteEquipo: number
}
interface Megacode {
  id: string; numero: string; fecha: string; turno: string
  estado: string; generadoAuto: boolean; observaciones?: string
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

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400"
const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5"
const estadoColor: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  en_curso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function MegacodePage() {
  const { data: session } = useSession()
  const [megacodes, setMegacodes] = useState<Megacode[]>([])
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [showGenerador, setShowGenerador] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [sugeridas, setSugeridas] = useState<PracticaSugerida[]>([])
  const [tiempoTotal, setTiempoTotal] = useState(0)
  const [configGen, setConfigGen] = useState({
    fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }),
    turno: 'manana', tiempo: 90, participantes: [] as string[]
  })

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [resMeg, resVol] = await Promise.all([
        fetch('/api/megacode?tipo=lista'),
        fetch('/api/admin/personal?roles=true')
      ])
      const [dataMeg, dataVol] = await Promise.all([resMeg.json(), resVol.json()])
      setMegacodes(dataMeg.megacodes || [])
      setVoluntarios(dataVol.voluntarios || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargarDatos() }, [])

  const generarSugerencia = async () => {
    setGenerando(true)
    setSugeridas([])
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

  const guardarMegacode = async () => {
    if (sugeridas.length === 0) return
    setSaving(true)
    const res = await fetch('/api/megacode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: configGen.fecha, turno: configGen.turno, generadoAuto: true,
        practicas: sugeridas.map(p => ({ practicaId: p.practicaId, orden: p.orden })),
        participantes: configGen.participantes
      })
    })
    setSaving(false)
    if (res.ok) { setShowGenerador(false); setSugeridas([]); cargarDatos() }
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

  const isAdmin = ['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(
    ((session?.user as any)?.rol || '').toLowerCase()
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-purple-600" size={24} />Megacode
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Sesiones de prácticas por turno — generación automática</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarDatos} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
          {isAdmin && (
            <button onClick={() => { setShowGenerador(true); setSugeridas([]) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">
              <Zap size={16} />Generar Megacode
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: megacodes.length, color: 'from-purple-500 to-purple-600' },
          { label: 'Completados', value: megacodes.filter(m => m.estado === 'completado').length, color: 'from-green-500 to-green-600' },
          { label: 'Pendientes', value: megacodes.filter(m => m.estado === 'pendiente').length, color: 'from-amber-500 to-amber-600' },
          { label: 'En curso', value: megacodes.filter(m => m.estado === 'en_curso').length, color: 'from-blue-500 to-blue-600' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
            <p className="text-xs opacity-80">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : megacodes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <Zap size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No hay megacodes creados</p>
          {isAdmin && (
            <button onClick={() => setShowGenerador(true)} className="mt-3 text-purple-600 text-sm font-medium hover:underline">
              + Generar el primer megacode
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {megacodes.map(m => {
            const isOpen = expandido === m.id
            const completadas = m.practicas.filter(p => p.completada).length
            const total = m.practicas.length
            const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
            const tiempoMegacode = m.practicas.reduce((a, p) => a + (p.practica?.duracionEstimada || 0), 0)
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandido(isOpen ? null : m.id)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        m.estado === 'completado' ? 'bg-green-500' : m.estado === 'en_curso' ? 'bg-blue-500' : m.estado === 'pendiente' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <span className="font-mono text-xs font-bold text-slate-400 shrink-0">{m.numero}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {new Date(m.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoColor[m.estado] || 'bg-slate-100 text-slate-600'}`}>
                            {m.estado.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500">{m.turno === 'manana' ? 'Mañana' : m.turno === 'tarde' ? 'Tarde' : 'Noche'}</span>
                          {m.generadoAuto && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Auto</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1"><BookOpen size={10} />{total} prácticas</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} />{tiempoMegacode} min</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1"><Users size={10} />{m.participaciones.length} participantes</span>
                          <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} />{completadas}/{total}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-20">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-400">Progreso</span>
                          <span className="font-bold text-slate-600">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: pct + '%' }} />
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/50">
                    {m.participaciones.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Participantes</p>
                        <div className="flex flex-wrap gap-2">
                          {m.participaciones.map(p => (
                            <span key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700">
                              <span className="font-mono text-[10px] text-slate-400">{p.usuario.numeroVoluntario}</span>
                              {p.usuario.nombre} {p.usuario.apellidos}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Prácticas del megacode</p>
                      <div className="space-y-2">
                        {m.practicas.sort((a, b) => a.orden - b.orden).map(p => (
                          <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${p.completada ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100'}`}>
                            <button onClick={() => togglePractica(m.id, p.practicaId, p.completada)}
                              className={`shrink-0 ${p.completada ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`}>
                              {p.completada ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">{p.orden}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] text-slate-400">{p.practica?.numero}</span>
                                <span className={`text-sm font-semibold ${p.completada ? 'line-through text-slate-400' : 'text-slate-800'}`}>{p.practica?.titulo}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${FAMILIAS[p.practica?.familia]?.color || 'bg-gray-100 text-gray-700'}`}>
                                  {FAMILIAS[p.practica?.familia]?.label || p.practica?.familia}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={9} />{p.practica?.duracionEstimada} min</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        {['pendiente', 'en_curso', 'completado'].map(est => (
                          <button key={est} onClick={async () => {
                            await fetch('/api/megacode', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, estado: est }) })
                            setMegacodes(prev => prev.map(mg => mg.id === m.id ? { ...mg, estado: est } : mg))
                          }} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${m.estado === est ? estadoColor[est] + ' border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                            {est.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showGenerador && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Zap size={18} className="text-purple-600" />Generar Megacode</h3>
                <p className="text-xs text-slate-500">El algoritmo selecciona 3-4 prácticas balanceadas para el turno</p>
              </div>
              <button onClick={() => setShowGenerador(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fecha</label>
                  <input type="date" value={configGen.fecha} onChange={e => setConfigGen({ ...configGen, fecha: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Turno</label>
                  <select value={configGen.turno} onChange={e => setConfigGen({ ...configGen, turno: e.target.value })} className={inputCls}>
                    <option value="manana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Tiempo disponible (minutos)</label>
                  <input type="number" value={configGen.tiempo} min={30} max={180}
                    onChange={e => setConfigGen({ ...configGen, tiempo: parseInt(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Participantes del turno</label>
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {voluntarios.map(v => (
                    <label key={v.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${configGen.participantes.includes(v.id) ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={configGen.participantes.includes(v.id)}
                        onChange={e => setConfigGen(prev => ({
                          ...prev,
                          participantes: e.target.checked ? [...prev.participantes, v.id] : prev.participantes.filter(id => id !== v.id)
                        }))} className="w-4 h-4 accent-purple-600" />
                      <span className="font-mono text-xs text-slate-400 w-12">{v.numeroVoluntario}</span>
                      <span className="text-sm text-slate-700">{v.nombre} {v.apellidos}</span>
                    </label>
                  ))}
                </div>
                {configGen.participantes.length > 0 && (
                  <p className="text-[10px] text-purple-600 font-bold mt-1">{configGen.participantes.length} persona/s seleccionada/s</p>
                )}
              </div>
              <button onClick={generarSugerencia} disabled={generando}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Zap size={16} />{generando ? 'Generando...' : 'Generar sugerencia automática'}
              </button>
              {sugeridas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">{sugeridas.length} prácticas sugeridas</p>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} />{tiempoTotal} min total</span>
                  </div>
                  {sugeridas.map(p => (
                    <div key={p.practicaId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">{p.orden}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-400">{p.numero}</span>
                          <span className="text-sm font-semibold text-slate-800 truncate">{p.titulo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${FAMILIAS[p.familia]?.color || ''}`}>{FAMILIAS[p.familia]?.label || p.familia}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                          <span><Clock size={9} className="inline mr-0.5" />{p.duracionEstimada} min</span>
                          <span>{p.vecesConEsteEquipo === 0 ? 'Nunca con este equipo' : p.vecesConEsteEquipo + 'x con este equipo'}</span>
                          <span className={`px-1.5 py-0.5 rounded-full font-bold ${NIVELES[p.nivel] || ''}`}>{p.nivel}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <button onClick={generarSugerencia} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                      <RefreshCw size={14} />Regenerar
                    </button>
                    <button onClick={guardarMegacode} disabled={saving}
                      className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Confirmar y guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
