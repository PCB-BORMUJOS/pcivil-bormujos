'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePermisos } from '@/lib/permisos'
import {
  Bot, RefreshCw, Sparkles, CheckCircle2, XCircle, Clock, AlertTriangle,
  ShieldAlert, ClipboardCheck, Play, ChevronDown, ChevronRight, Filter,
} from 'lucide-react'

interface Perfil {
  slug: string; nombre: string; puesto: string; area: string
  color: string; acento: string; competencias: string[]; revision: string[]
}
interface Propuesta {
  id: string; area: string; titulo: string; descripcion: string; justificacion?: string
  categoria: string; prioridad: string; modulo?: string; referencia?: string
  estado: string; respuestaAdmin?: string; resueltaEn?: string; createdAt: string
  revision?: { id: string; resumen: string; createdAt: string }
  resueltaPor?: { nombre: string; apellidos: string }
}

const PRIORIDAD: Record<string, { label: string; clase: string; orden: number }> = {
  critica: { label: 'Crítica', clase: 'bg-red-50 text-red-700 border-red-200', orden: 0 },
  alta: { label: 'Alta', clase: 'bg-orange-50 text-orange-700 border-orange-200', orden: 1 },
  media: { label: 'Media', clase: 'bg-amber-50 text-amber-700 border-amber-200', orden: 2 },
  baja: { label: 'Baja', clase: 'bg-slate-100 text-slate-600 border-slate-200', orden: 3 },
}
const ESTADO: Record<string, { label: string; clase: string }> = {
  pendiente: { label: 'Pendiente', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  aceptada: { label: 'Aceptada', clase: 'bg-blue-50 text-blue-700 border-blue-200' },
  aplicada: { label: 'Aplicada', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  descartada: { label: 'Descartada', clase: 'bg-slate-100 text-slate-500 border-slate-200' },
}
const CATEGORIA: Record<string, string> = {
  dato_incompleto: 'Dato incompleto', incoherencia: 'Incoherencia', caducidad: 'Caducidad',
  seguridad: 'Seguridad', procedimiento: 'Procedimiento', mejora: 'Mejora',
}
const fmtFecha = (d?: string) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '—'

export default function AgentesPage() {
  const { isAdmin } = usePermisos()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [revisando, setRevisando] = useState<string | null>(null)
  const [filtroArea, setFiltroArea] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState('pendiente')
  const [expandida, setExpandida] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [rp, rq] = await Promise.all([
        fetch('/api/agentes?tipo=perfiles'),
        fetch('/api/agentes?tipo=propuestas'),
      ])
      const dp = await rp.json()
      const dq = await rq.json()
      setPerfiles(dp.perfiles || [])
      setDisponible(dp.disponible !== false)
      setPropuestas(dq.propuestas || [])
    } catch { /* silenciado */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const lanzarRevision = async (slug: string) => {
    setRevisando(slug)
    setAviso(null)
    try {
      const r = await fetch('/api/agentes?tipo=revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: slug }),
      })
      const d = await r.json()
      if (r.ok) {
        const n = d.revision?.propuestas?.length || 0
        setAviso(`Revisión completada: ${n} propuesta(s). Se ha avisado a los administradores por mensaje interno.`)
        setFiltroArea(slug)
        setFiltroEstado('pendiente')
        cargar()
      } else {
        setAviso(d.error || 'No ha sido posible completar la revisión.')
      }
    } catch {
      setAviso('Error de conexión al lanzar la revisión.')
    } finally { setRevisando(null) }
  }

  const resolver = async (id: string, estado: string) => {
    const r = await fetch('/api/agentes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    if (r.ok) cargar()
  }

  const visibles = useMemo(() => propuestas
    .filter(p => filtroArea === 'todas' || p.area === filtroArea)
    .filter(p => filtroEstado === 'todas' || p.estado === filtroEstado)
    .sort((a, b) => (PRIORIDAD[a.prioridad]?.orden ?? 9) - (PRIORIDAD[b.prioridad]?.orden ?? 9)),
    [propuestas, filtroArea, filtroEstado])

  const pendientes = propuestas.filter(p => p.estado === 'pendiente')
  const porArea = (slug: string) => propuestas.filter(p => p.area === slug && p.estado === 'pendiente').length

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
      <ShieldAlert className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">Este panel está reservado a coordinación y jefatura del servicio.</p>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /><p className="text-slate-500 font-medium">Cargando agentes...</p></div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0"><Bot className="w-7 h-7 text-blue-600" /></div>
        <div>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-wide">INTELIGENCIA ARTIFICIAL</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Agentes por Área</h1>
          <p className="text-sm text-slate-500 mt-1">Cada área cuenta con un agente especializado que asiste a la coordinación y revisa los datos del área para proponer mejoras.</p>
        </div>
      </div>

      {!disponible && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Los agentes no están configurados en este entorno: falta la clave de acceso al modelo. El chat y las revisiones no funcionarán hasta que se configure.</p>
        </div>
      )}
      {aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-800">{aviso}</p>
          <button onClick={() => setAviso(null)} className="text-blue-400 hover:text-blue-600"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: 'Agentes activos', v: perfiles.length, i: Bot, c: 'text-blue-600 bg-blue-50' },
          { l: 'Propuestas pendientes', v: pendientes.length, i: Clock, c: 'text-amber-600 bg-amber-50' },
          { l: 'Prioridad alta o crítica', v: pendientes.filter(p => ['alta', 'critica'].includes(p.prioridad)).length, i: AlertTriangle, c: 'text-red-600 bg-red-50' },
          { l: 'Aplicadas', v: propuestas.filter(p => p.estado === 'aplicada').length, i: CheckCircle2, c: 'text-emerald-600 bg-emerald-50' },
        ].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${k.c}`}><k.i className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-slate-800 leading-none">{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
          </div>
        ))}
      </div>

      {/* PLANTILLA DE AGENTES */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Plantilla de agentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {perfiles.map(p => {
            const n = porArea(p.slug)
            return (
              <div key={p.slug} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                <div className={`bg-gradient-to-r ${p.color} text-white p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold leading-tight">{p.nombre}</h3>
                      <p className="text-xs text-white/80 mt-0.5">{p.puesto}</p>
                    </div>
                    {n > 0 && <span className="shrink-0 px-2 py-0.5 bg-white/25 rounded-full text-xs font-bold">{n}</span>}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vigila</p>
                    <ul className="space-y-1">
                      {p.revision.slice(0, 3).map(r => (
                        <li key={r} className="text-xs text-slate-600 flex gap-1.5"><span className="text-slate-300">•</span>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => lanzarRevision(p.slug)}
                    disabled={!!revisando || !disponible}
                    className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-medium disabled:opacity-40"
                  >
                    {revisando === p.slug
                      ? (<><RefreshCw className="w-4 h-4 animate-spin" />Revisando el área...</>)
                      : (<><Play className="w-4 h-4" />Revisar área</>)}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROPUESTAS */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Propuestas de los agentes</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="todas">Todas las áreas</option>
              {perfiles.map(p => <option key={p.slug} value={p.slug}>{p.area}</option>)}
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="todas">Todos los estados</option>
              {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {visibles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 text-slate-400">
            <ClipboardCheck className="w-9 h-9 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay propuestas con estos filtros.</p>
            <p className="text-xs mt-1">Lanza una revisión de área para que el agente analice sus datos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibles.map(p => {
              const pr = PRIORIDAD[p.prioridad] || PRIORIDAD.media
              const es = ESTADO[p.estado] || ESTADO.pendiente
              const perfil = perfiles.find(x => x.slug === p.area)
              const abierta = expandida === p.id
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandida(abierta ? null : p.id)} className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${pr.clase}`}>{pr.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${es.clase}`}>{es.label}</span>
                        <span className="text-xs text-slate-400">{perfil?.area || p.area}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{CATEGORIA[p.categoria] || p.categoria}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{p.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{p.descripcion}</p>
                    </div>
                    {abierta ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
                  </button>

                  {abierta && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Propuesta</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.descripcion}</p>
                      </div>
                      {p.justificacion && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">En qué se basa</p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.justificacion}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                        {p.modulo && <span>Módulo: <strong className="text-slate-700">{p.modulo}</strong></span>}
                        {p.referencia && <span>Referencia: <strong className="text-slate-700">{p.referencia}</strong></span>}
                        <span>Generada el {fmtFecha(p.createdAt)}</span>
                        {p.resueltaPor && <span>Resuelta por {p.resueltaPor.nombre} {p.resueltaPor.apellidos} el {fmtFecha(p.resueltaEn)}</span>}
                      </div>
                      {p.revision?.resumen && (
                        <div className="bg-white border border-slate-200 rounded-xl p-3">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resumen de la revisión</p>
                          <p className="text-xs text-slate-600">{p.revision.resumen}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {p.estado !== 'aceptada' && <button onClick={() => resolver(p.id, 'aceptada')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"><CheckCircle2 className="w-4 h-4" />Aceptar</button>}
                        {p.estado !== 'aplicada' && <button onClick={() => resolver(p.id, 'aplicada')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"><ClipboardCheck className="w-4 h-4" />Marcar aplicada</button>}
                        {p.estado !== 'descartada' && <button onClick={() => resolver(p.id, 'descartada')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"><XCircle className="w-4 h-4" />Descartar</button>}
                        {p.estado !== 'pendiente' && <button onClick={() => resolver(p.id, 'pendiente')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg"><Clock className="w-4 h-4" />Volver a pendiente</button>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Los agentes solo leen datos y proponen. Ningún cambio se aplica sin la aprobación del administrador, y toda resolución queda registrada en auditoría.
      </p>
    </div>
  )
}
