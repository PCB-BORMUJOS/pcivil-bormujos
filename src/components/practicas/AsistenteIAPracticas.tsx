'use client'

import { useState } from 'react'
import { Sparkles, X, Loader2, Check, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { usePermisos } from '@/lib/permisos'

interface FamiliaOpt { id: string; label: string }

interface Propuesta {
  titulo: string; subfamilia?: string; nivel: string; objetivo: string
  descripcion?: string; desarrollo?: string; materialNecesario?: string
  personalMinimo?: number; duracionEstimada?: number; riesgoPractica?: string
  riesgoIntervencion?: string; riesgoObservaciones?: string; prerequisitos?: string
  lugarDesarrollo?: string; conclusiones?: string; justificacion?: string
}

export default function AsistenteIAPracticas({ familias, onGuardado }: { familias: FamiliaOpt[]; onGuardado: () => void }) {
  const { isAdmin } = usePermisos()
  const [abierto, setAbierto] = useState(false)
  const [familia, setFamilia] = useState(familias[0]?.id || '')
  const [cantidad, setCantidad] = useState(3)
  const [instrucciones, setInstrucciones] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [expandida, setExpandida] = useState<number | null>(0)
  const [guardadas, setGuardadas] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState<number | null>(null)

  if (!isAdmin) return null

  const generar = async () => {
    setCargando(true); setError(''); setPropuestas([]); setGuardadas(new Set())
    try {
      const res = await fetch('/api/practicas/ia/generar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familia, cantidad, instrucciones }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar')
      setPropuestas(data.propuestas || [])
      setExpandida(0)
    } catch (e: any) { setError(e.message) } finally { setCargando(false) }
  }

  const guardar = async (i: number) => {
    setGuardando(i)
    try {
      const p = propuestas[i]
      const res = await fetch('/api/practicas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, familia }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al guardar') }
      setGuardadas(prev => new Set(prev).add(i))
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
                  <h3 className="font-black">Generar prácticas con IA</h3>
                  <p className="text-xs text-white/80">Experto en formación de emergencias — propone prácticas que complementan el catálogo</p>
                </div>
              </div>
              <button onClick={() => setAbierto(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Familia</label>
                  <select value={familia} onChange={e => setFamilia(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {familias.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nº de propuestas</label>
                  <input type="number" min={1} max={6} value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end">
                  <button onClick={generar} disabled={cargando || !familia}
                    className="w-full py-2 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                    {cargando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {cargando ? 'Generando…' : 'Generar'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Indicaciones (opcional)</label>
                <textarea value={instrucciones} onChange={e => setInstrucciones(e.target.value)} rows={2}
                  placeholder="Ej: céntrate en recogida de mangueras en simple, doble y palmera"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
              {cargando && <div className="text-center text-slate-400 text-sm py-6"><Loader2 size={22} className="animate-spin mx-auto mb-2" />El experto está analizando el catálogo y detectando huecos…</div>}

              {propuestas.map((p, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => setExpandida(expandida === i ? null : i)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-purple-600 uppercase">{p.nivel}</span>
                      <span className="font-bold text-slate-800 truncate">{p.titulo}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {guardadas.has(i)
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><Check size={14} /> Guardada</span>
                        : <button onClick={e => { e.stopPropagation(); guardar(i) }} disabled={guardando === i}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                            {guardando === i ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
                          </button>}
                      {expandida === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandida === i && (
                    <div className="p-4 space-y-2 text-sm">
                      {p.justificacion && <p className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-800 text-xs"><b>Por qué complementa:</b> {p.justificacion}</p>}
                      <Campo t="Objetivo" v={p.objetivo} />
                      <Campo t="Descripción" v={p.descripcion} />
                      <Campo t="Desarrollo" v={p.desarrollo} />
                      <Campo t="Material necesario" v={p.materialNecesario} lista />
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span><b>Personal mín.:</b> {p.personalMinimo ?? '-'}</span>
                        <span><b>Duración:</b> {p.duracionEstimada ?? '-'} min</span>
                        <span><b>Riesgo:</b> {p.riesgoPractica ?? '-'}</span>
                        <span><b>Lugar:</b> {p.lugarDesarrollo || '-'}</span>
                      </div>
                      <Campo t="Riesgos de intervención" v={p.riesgoIntervencion} />
                      <Campo t="Medidas preventivas" v={p.riesgoObservaciones} />
                      <Campo t="Prerequisitos" v={p.prerequisitos} />
                      <Campo t="Conclusiones" v={p.conclusiones} />
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

function Campo({ t, v, lista }: { t: string; v?: string; lista?: boolean }) {
  if (!v) return null
  const items = lista ? v.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) : null
  return (
    <div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-wide">{t}</p>
      {items
        ? <ul className="list-disc list-inside text-slate-700">{items.map((it, k) => <li key={k}>{it}</li>)}</ul>
        : <p className="text-slate-700 whitespace-pre-line">{v}</p>}
    </div>
  )
}
