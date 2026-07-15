'use client'

import { useState } from 'react'
import { Sparkles, X, Loader2, ThumbsUp, AlertTriangle, ShieldAlert, Wrench } from 'lucide-react'

interface Revision {
  valoracion: string
  resumen: string
  fortalezas?: string[]
  carencias?: string[]
  riesgosOmitidos?: string[]
  mejoras?: { campo: string; sugerencia: string }[]
}

const COLOR_VAL: Record<string, string> = {
  excelente: 'bg-green-100 text-green-700 border-green-200',
  buena: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  mejorable: 'bg-amber-100 text-amber-700 border-amber-200',
  deficiente: 'bg-red-100 text-red-700 border-red-200',
}

export default function RevisarIAButton({ practicaId }: { practicaId: string }) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [rev, setRev] = useState<Revision | null>(null)
  const [titulo, setTitulo] = useState('')

  const revisar = async () => {
    setAbierto(true); setCargando(true); setError(''); setRev(null)
    try {
      const res = await fetch('/api/practicas/ia/revisar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practicaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al revisar')
      setRev(data.revision); setTitulo(data.practica?.titulo || '')
    } catch (e: any) { setError(e.message) } finally { setCargando(false) }
  }

  return (
    <>
      <button onClick={e => { e.stopPropagation(); revisar() }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100">
        <Sparkles size={13} /> Revisar con IA
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={20} />
                <div className="min-w-0">
                  <h3 className="font-black truncate">Revisión del experto</h3>
                  <p className="text-xs text-white/80 truncate">{titulo}</p>
                </div>
              </div>
              <button onClick={() => setAbierto(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {cargando && <div className="text-center text-slate-400 text-sm py-8"><Loader2 size={22} className="animate-spin mx-auto mb-2" />Analizando la práctica…</div>}
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
              {rev && (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${COLOR_VAL[rev.valoracion] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{rev.valoracion}</span>
                    <p className="text-sm text-slate-700">{rev.resumen}</p>
                  </div>
                  <Bloque icon={<ThumbsUp size={15} className="text-green-600" />} titulo="Fortalezas" items={rev.fortalezas} color="green" />
                  <Bloque icon={<AlertTriangle size={15} className="text-amber-600" />} titulo="Carencias" items={rev.carencias} color="amber" />
                  <Bloque icon={<ShieldAlert size={15} className="text-red-600" />} titulo="Riesgos no contemplados" items={rev.riesgosOmitidos} color="red" />
                  {rev.mejoras && rev.mejoras.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase mb-2"><Wrench size={15} className="text-indigo-600" /> Mejoras sugeridas</p>
                      <div className="space-y-2">
                        {rev.mejoras.map((m, i) => (
                          <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm">
                            <span className="text-xs font-black text-indigo-500 uppercase mr-2">{m.campo}</span>
                            <span className="text-slate-700">{m.sugerencia}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Bloque({ icon, titulo, items, color }: { icon: React.ReactNode; titulo: string; items?: string[]; color: string }) {
  if (!items || items.length === 0) return null
  const bg: Record<string, string> = { green: 'bg-green-50 border-green-200', amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200' }
  return (
    <div className={`rounded-lg border px-4 py-3 ${bg[color]}`}>
      <p className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase mb-2">{icon} {titulo}</p>
      <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}
