'use client'

import { useState } from 'react'
import { Sparkles, X, Loader2, Check, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { usePermisos } from '@/lib/permisos'

interface PracticaRef { id: string; numero: string; titulo: string }
interface Escenario {
  titulo: string; nivelDificultad?: string; escenario?: string; objetivos?: string
  recursos?: string; leccionesAprendidas?: string; practicas: PracticaRef[]; justificacion?: string
}

// getTodaySpain inline: fecha local España en formato YYYY-MM-DD
function hoyEspana() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
}

export default function AsistenteIAMegacode({ onGuardado }: { onGuardado: () => void }) {
  const { isAdmin } = usePermisos()
  const [abierto, setAbierto] = useState(false)
  const [cantidad, setCantidad] = useState(2)
  const [nivel, setNivel] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [turno, setTurno] = useState('mañana')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [escenarios, setEscenarios] = useState<Escenario[]>([])
  const [expandido, setExpandido] = useState<number | null>(0)
  const [guardados, setGuardados] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState<number | null>(null)

  if (!isAdmin) return null

  const generar = async () => {
    setCargando(true); setError(''); setEscenarios([]); setGuardados(new Set())
    try {
      const res = await fetch('/api/megacode/ia/generar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad, nivel, instrucciones }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar')
      setEscenarios(data.escenarios || [])
      setExpandido(0)
    } catch (e: any) { setError(e.message) } finally { setCargando(false) }
  }

  const guardar = async (i: number) => {
    setGuardando(i)
    try {
      const e = escenarios[i]
      const res = await fetch('/api/megacode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'auto', titulo: e.titulo, fecha: hoyEspana(), turno,
          generadoAuto: true, escenario: e.escenario, objetivos: e.objetivos,
          recursos: e.recursos, leccionesAprendidas: e.leccionesAprendidas,
          nivelDificultad: e.nivelDificultad,
          practicas: e.practicas.map((p, orden) => ({ practicaId: p.id, orden: orden + 1 })),
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al guardar') }
      setGuardados(prev => new Set(prev).add(i))
      onGuardado()
    } catch (e: any) { setError(e.message) } finally { setGuardando(null) }
  }

  return (
    <>
      <button onClick={() => setAbierto(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-black text-sm shadow-lg hover:scale-105 transition-transform"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
        <Sparkles size={16} /> Asistente IA
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={20} />
                <div>
                  <h3 className="font-black">Generar megacodes con IA</h3>
                  <p className="text-xs text-white/80">Escenarios de simulacro que encadenan prácticas del catálogo</p>
                </div>
              </div>
              <button onClick={() => setAbierto(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Escenarios</label>
                  <input type="number" min={1} max={4} value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dificultad</label>
                  <select value={nivel} onChange={e => setNivel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Cualquiera</option>
                    <option value="bajo">Baja</option>
                    <option value="medio">Media</option>
                    <option value="alto">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Turno</label>
                  <select value={turno} onChange={e => setTurno(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={generar} disabled={cargando}
                    className="w-full py-2 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                    {cargando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {cargando ? '…' : 'Generar'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Indicaciones (opcional)</label>
                <textarea value={instrucciones} onChange={e => setInstrucciones(e.target.value)} rows={2}
                  placeholder="Ej: simulacro de incendio en vivienda con rescate y primeros auxilios"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
              {cargando && <div className="text-center text-slate-400 text-sm py-6"><Loader2 size={22} className="animate-spin mx-auto mb-2" />El experto está componiendo los escenarios…</div>}

              {escenarios.map((e, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => setExpandido(expandido === i ? null : i)}>
                    <div className="flex items-center gap-2 min-w-0">
                      {e.nivelDificultad && <span className="text-xs font-black text-purple-600 uppercase">{e.nivelDificultad}</span>}
                      <span className="font-bold text-slate-800 truncate">{e.titulo}</span>
                      <span className="text-xs text-slate-400">· {e.practicas.length} prácticas</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {guardados.has(i)
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><Check size={14} /> Guardado</span>
                        : <button onClick={ev => { ev.stopPropagation(); guardar(i) }} disabled={guardando === i || e.practicas.length === 0}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                            {guardando === i ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
                          </button>}
                      {expandido === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandido === i && (
                    <div className="p-4 space-y-2 text-sm">
                      {e.justificacion && <p className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-800 text-xs"><b>Por qué:</b> {e.justificacion}</p>}
                      <Campo t="Escenario" v={e.escenario} />
                      <Campo t="Objetivos" v={e.objetivos} />
                      <Campo t="Recursos" v={e.recursos} />
                      <Campo t="Lecciones esperadas" v={e.leccionesAprendidas} />
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wide">Secuencia de prácticas</p>
                        {e.practicas.length === 0
                          ? <p className="text-red-500 text-xs">La IA no referenció prácticas válidas del catálogo.</p>
                          : <ol className="list-decimal list-inside text-slate-700">{e.practicas.map(p => <li key={p.id}>[{p.numero}] {p.titulo}</li>)}</ol>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Campo({ t, v }: { t: string; v?: string }) {
  if (!v) return null
  return (
    <div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-wide">{t}</p>
      <p className="text-slate-700 whitespace-pre-line">{v}</p>
    </div>
  )
}
