'use client'

// Auditoría técnica de las fichas de práctica por el agente especializado de
// cada familia. El agente evalúa y propone; el administrador decide qué se
// aplica, campo a campo.

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ClipboardCheck, RefreshCw, Play, ChevronDown, ChevronRight, CheckCircle2,
  XCircle, AlertTriangle, Filter, Square, CheckSquare, Gauge, FileText, Sparkles,
} from 'lucide-react'

interface PracticaItem {
  id: string; numero: string; titulo: string; familia: string
  nivel?: string; activa: boolean
  auditoria?: { id: string; puntuacion: number; estado: string; createdAt: string } | null
}

const CAMPOS: { key: string; label: string }[] = [
  { key: 'objetivo', label: 'Objetivo' },
  { key: 'definicion', label: 'Definición' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'desarrollo', label: 'Desarrollo' },
  { key: 'conclusiones', label: 'Conclusiones y evaluación' },
  { key: 'prerequisitos', label: 'Prerrequisitos' },
  { key: 'materialNecesario', label: 'Material necesario' },
  { key: 'lugarDesarrollo', label: 'Lugar de desarrollo' },
  { key: 'riesgoPractica', label: 'Riesgo de la práctica' },
  { key: 'riesgoIntervencion', label: 'Riesgo de la intervención' },
  { key: 'riesgoObservaciones', label: 'Observaciones de riesgo' },
  { key: 'nivel', label: 'Nivel' },
  { key: 'duracionEstimada', label: 'Duración (min)' },
  { key: 'personalMinimo', label: 'Personal mínimo' },
]

const GRAVEDAD: Record<string, string> = {
  critica: 'bg-red-100 text-red-800 border-red-300',
  alta: 'bg-orange-50 text-orange-700 border-orange-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  baja: 'bg-slate-100 text-slate-600 border-slate-200',
}
const colorNota = (n: number) => n >= 75 ? 'text-emerald-600' : n >= 50 ? 'text-amber-600' : 'text-red-600'
const fondoNota = (n: number) => n >= 75 ? 'bg-emerald-500' : n >= 50 ? 'bg-amber-500' : 'bg-red-500'

export default function AuditoriaPracticas() {
  const [practicas, setPracticas] = useState<PracticaItem[]>([])
  const [familias, setFamilias] = useState<string[]>([])
  const [familia, setFamilia] = useState('incendios')
  const [loading, setLoading] = useState(true)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null)
  const [detalle, setDetalle] = useState<any>(null)
  const [camposAceptados, setCamposAceptados] = useState<Set<string>>(new Set())
  const [aplicando, setAplicando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/agentes?tipo=practicas-auditables')
      const d = await r.json()
      setPracticas(d.practicas || [])
      setFamilias(d.familias || [])
    } catch { /* silenciado */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const visibles = useMemo(
    () => practicas.filter(p => familia === 'todas' || p.familia === familia),
    [practicas, familia])

  const auditar = async (ids: string[]) => {
    setProgreso({ hechas: 0, total: ids.length })
    setAviso(null)
    let fallos = 0
    for (let i = 0; i < ids.length; i++) {
      setEnCurso(ids[i])
      try {
        const r = await fetch('/api/agentes?tipo=auditar-practica', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ practicaId: ids[i] }),
        })
        if (!r.ok) fallos++
      } catch { fallos++ }
      setProgreso({ hechas: i + 1, total: ids.length })
    }
    setEnCurso(null)
    setProgreso(null)
    setSeleccion(new Set())
    await cargar()
    setAviso(fallos ? `Auditoría terminada con ${fallos} error(es) de ${ids.length}.` : `Auditoría completada: ${ids.length} ficha(s).`)
  }

  const abrirDetalle = async (auditoriaId: string) => {
    setDetalle(null)
    try {
      const r = await fetch(`/api/agentes?tipo=auditoria&id=${auditoriaId}`)
      const d = await r.json()
      setDetalle(d.auditoria)
      setCamposAceptados(new Set(CAMPOS.map(c => c.key).filter(k => {
        const v = d.auditoria?.propuesta?.[k]
        return v !== undefined && v !== null && v !== ''
      })))
    } catch { /* silenciado */ }
  }

  const resolver = async (accion: 'aplicar' | 'descartar') => {
    if (!detalle) return
    setAplicando(true)
    try {
      const r = await fetch('/api/agentes?tipo=auditoria', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detalle.id, accion, campos: Array.from(camposAceptados) }),
      })
      const d = await r.json()
      if (r.ok) {
        setAviso(accion === 'aplicar'
          ? `Ficha ${detalle.numero} actualizada con ${camposAceptados.size} campo(s).`
          : `Auditoría de ${detalle.numero} descartada.`)
        setDetalle(null)
        await cargar()
      } else setAviso(d.error || 'No ha sido posible completar la operación.')
    } catch { setAviso('Error de conexión.') } finally { setAplicando(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Auditoría de prácticas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Cada ficha la audita el agente especializado de su familia. El agente propone; tú decides qué se aplica.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={familia} onChange={e => { setFamilia(e.target.value); setSeleccion(new Set()) }} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="todas">Todas las familias</option>
            {familias.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button
            onClick={() => auditar(Array.from(seleccion))}
            disabled={!seleccion.size || !!progreso}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-medium disabled:opacity-40"
          >
            {progreso
              ? (<><RefreshCw className="w-4 h-4 animate-spin" />{progreso.hechas}/{progreso.total}</>)
              : (<><Play className="w-4 h-4" />Auditar {seleccion.size || ''}</>)}
          </button>
        </div>
      </div>

      {aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-800">{aviso}</p>
          <button onClick={() => setAviso(null)} className="text-blue-400 hover:text-blue-600"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Listado de fichas */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => setSeleccion(prev => prev.size === visibles.length ? new Set() : new Set(visibles.map(p => p.id)))}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            {seleccion.size === visibles.length && visibles.length > 0
              ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
            Seleccionar todas ({visibles.length})
          </button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
          {visibles.map(p => {
            const marcada = seleccion.has(p.id)
            const a = p.auditoria
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${marcada ? 'bg-blue-50/60' : 'hover:bg-slate-50'} ${enCurso === p.id ? 'bg-amber-50' : ''}`}>
                <input
                  type="checkbox" checked={marcada}
                  onChange={() => setSeleccion(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-500">{p.numero}</span>
                    <span className="text-sm font-medium text-slate-800">{p.titulo}</span>
                    {!p.activa && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">inactiva</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.familia}{p.nivel ? ` · ${p.nivel}` : ''}</p>
                </div>
                {enCurso === p.id && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
                {a ? (
                  <button onClick={() => abrirDetalle(a.id)} className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-lg font-bold leading-none ${colorNota(a.puntuacion)}`}>{a.puntuacion}</p>
                      <p className="text-[10px] text-slate-400">
                        {a.estado === 'aplicada' ? 'aplicada' : a.estado === 'descartada' ? 'descartada' : 'ver informe'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ) : <span className="text-xs text-slate-300 shrink-0">sin auditar</span>}
              </div>
            )
          })}
          {visibles.length === 0 && <p className="text-center py-10 text-sm text-slate-400">No hay prácticas en esta familia.</p>}
        </div>
      </div>

      {/* Detalle de la auditoría */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200] p-4" onClick={() => !aplicando && setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-800 p-5 text-white flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <p className="text-xs text-slate-300 font-mono">{detalle.numero} · auditada por el agente de {detalle.agente}</p>
                <h3 className="text-lg font-bold leading-tight">{detalle.titulo}</h3>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className={`text-3xl font-bold leading-none ${colorNota(detalle.puntuacion)}`}>{detalle.puntuacion}</p>
                  <p className="text-[10px] text-slate-300">sobre 100</p>
                </div>
                <button onClick={() => setDetalle(null)} className="p-1.5 hover:bg-white/20 rounded-lg"><XCircle className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <p className="text-sm text-slate-700">{detalle.resumen}</p>

              {/* Dimensiones */}
              {Array.isArray(detalle.dimensiones) && detalle.dimensiones.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Gauge size={13} />Evaluación por dimensiones</p>
                  <div className="space-y-2">
                    {detalle.dimensiones.map((d: any, i: number) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">{d.nombre}</span>
                          <span className={`font-bold ${colorNota(d.puntuacion)}`}>{d.puntuacion}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${fondoNota(d.puntuacion)}`} style={{ width: `${Math.max(0, Math.min(100, d.puntuacion))}%` }} />
                        </div>
                        {d.comentario && <p className="text-xs text-slate-500 mt-1">{d.comentario}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Carencias */}
              {Array.isArray(detalle.carencias) && detalle.carencias.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle size={13} />Carencias detectadas</p>
                  <div className="space-y-1.5">
                    {detalle.carencias.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${GRAVEDAD[c.gravedad] || GRAVEDAD.media}`}>{(c.gravedad || 'media').toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-600">{c.campo}</p>
                          <p className="text-sm text-slate-700">{c.descripcion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Propuesta campo a campo */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles size={13} />Ficha propuesta — marca lo que quieras aplicar</p>
                <div className="space-y-2">
                  {CAMPOS.map(c => {
                    const nuevo = detalle.propuesta?.[c.key]
                    if (nuevo === undefined || nuevo === null || nuevo === '') return null
                    const actual = detalle.practica?.[c.key]
                    const marcado = camposAceptados.has(c.key)
                    const cambia = String(actual ?? '').trim() !== String(nuevo).trim()
                    return (
                      <div key={c.key} className={`border rounded-xl overflow-hidden ${marcado ? 'border-blue-300' : 'border-slate-200'}`}>
                        <label className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${marcado ? 'bg-blue-50' : 'bg-slate-50'}`}>
                          <input
                            type="checkbox" checked={marcado}
                            onChange={() => setCamposAceptados(prev => { const s = new Set(prev); s.has(c.key) ? s.delete(c.key) : s.add(c.key); return s })}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-700">{c.label}</span>
                          {!cambia && <span className="text-[10px] text-slate-400">(sin cambios)</span>}
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                          <div className="p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actual</p>
                            <p className="text-xs text-slate-500 whitespace-pre-wrap">{String(actual || '—').slice(0, 1200)}</p>
                          </div>
                          <div className="p-3 bg-emerald-50/30">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Propuesta</p>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap">{String(nuevo).slice(0, 3000)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-slate-500">{camposAceptados.size} campo(s) marcados para aplicar</p>
              <div className="flex gap-2">
                <button onClick={() => resolver('descartar')} disabled={aplicando} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50">Descartar</button>
                <button
                  onClick={() => resolver('aplicar')}
                  disabled={aplicando || !camposAceptados.size}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
                >
                  {aplicando ? (<><RefreshCw className="w-4 h-4 animate-spin" />Aplicando...</>) : (<><CheckCircle2 className="w-4 h-4" />Aplicar a la ficha</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
