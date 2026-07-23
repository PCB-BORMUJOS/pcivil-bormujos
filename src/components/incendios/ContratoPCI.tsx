'use client'

// Contrato PCI — seguimiento de las revisiones de protección contra incendios
// de los edificios municipales, sus defectos, presupuestos y acciones correctivas.
// Complementa el inventario de equipos ECI sin sustituirlo.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePermisos } from '@/lib/permisos'
import {
  Building2, RefreshCw, AlertTriangle, CheckCircle2, Clock, Euro, FileText,
  ChevronRight, ChevronDown, ArrowLeft, Repeat, Filter, TrendingUp, Wrench,
  ClipboardList, Receipt, Layers, ShieldAlert, Plus, X, Search, Info,
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────────────────────
export const PROVEEDOR_PCI = {
  razonSocial: 'Telson Sistemas de Seguridad, S.L.',
  nombreComercial: 'Hércules Seguridad',
  cif: 'B-91223875',
  reia: '41043680',
  dgs: '3134',
  domicilio: 'C/ Quevedo, 17 — 41701 Dos Hermanas (Sevilla)',
  telefono: '954 580 949',
  web: 'www.hercules-seguridad.com',
  ingeniero: 'Enrique Avilés Gómez — Ing. Téc. Industrial, col. 12472 COGITISE',
  tecnicoCampo: 'Santiago Carracedo Cortés',
  marco: 'RD 513/2017, de 22 de mayo (Reglamento de instalaciones de protección contra incendios) y normas UNE',
  cliente: 'Ayuntamiento de Bormujos — CIF P4101700E — código 11804',
}

const ESTADOS_PIPELINE = [
  { id: 'DETECTADO', label: 'Detectado', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'PRESUPUESTADO', label: 'Presupuestado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'APROBADO', label: 'Aprobado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'EN_EJECUCION', label: 'En ejecución', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'EJECUTADO', label: 'Ejecutado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'VERIFICADO', label: 'Verificado', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'FACTURADO', label: 'Facturado', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]
const PRIORIDADES: Record<string, { label: string; color: string; orden: number }> = {
  alta: { label: 'Alta', color: 'bg-red-50 text-red-700 border-red-200', orden: 0 },
  media: { label: 'Media', color: 'bg-amber-50 text-amber-700 border-amber-200', orden: 1 },
  baja: { label: 'Baja', color: 'bg-slate-100 text-slate-600 border-slate-200', orden: 2 },
}
const ESTADO_HALLAZGO: Record<string, { label: string; color: string }> = {
  OK: { label: 'Correcto', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DEFECTO: { label: 'Defecto', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  CADUCADO: { label: 'Caducado', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  NO_FUNCIONA: { label: 'No funciona', color: 'bg-red-50 text-red-700 border-red-200' },
  DESAPARECIDO: { label: 'Desaparecido', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
}
const SEMAFORO: Record<string, { punto: string; label: string }> = {
  rojo: { punto: 'bg-red-500', label: 'Requiere actuación' },
  ambar: { punto: 'bg-amber-500', label: 'Con defectos abiertos' },
  verde: { punto: 'bg-emerald-500', label: 'Al corriente' },
}

const fmtFecha = (d?: string | Date | null) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '—'
const fmtEur = (n?: number | null) => (n === null || n === undefined) ? '—' : n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

export default function ContratoPCI() {
  const { canEdit, isAdmin } = usePermisos()
  const [vista, setVista] = useState<'edificios' | 'pipeline' | 'recurrentes' | 'economico'>('edificios')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<any>(null)
  const [edificios, setEdificios] = useState<any[]>([])
  const [acciones, setAcciones] = useState<any[]>([])
  const [recurrentes, setRecurrentes] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [detalle, setDetalle] = useState<any>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [revisionAbierta, setRevisionAbierta] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('PCI')
  const [verProveedor, setVerProveedor] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [rk, re, ra, rr, rp] = await Promise.all([
        fetch('/api/incendios/pci?tipo=kpis'),
        fetch('/api/incendios/pci?tipo=edificios'),
        fetch('/api/incendios/pci?tipo=acciones'),
        fetch('/api/incendios/pci?tipo=recurrentes'),
        fetch('/api/incendios/pci?tipo=presupuestos'),
      ])
      const [dk, de, da, dr, dp] = await Promise.all([rk.json(), re.json(), ra.json(), rr.json(), rp.json()])
      setKpis(dk.kpis || null)
      setEdificios(de.edificios || [])
      setAcciones(da.acciones || [])
      setRecurrentes(dr.recurrentes || [])
      setPresupuestos(dp.presupuestos || [])
      setFacturas(dp.facturas || [])
    } catch { /* silenciado */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirEdificio = async (id: string) => {
    setCargandoDetalle(true)
    try {
      const r = await fetch(`/api/incendios/pci?tipo=edificio&edificioId=${id}`)
      const d = await r.json()
      setDetalle(d)
      setRevisionAbierta(d.revisiones?.length ? d.revisiones[d.revisiones.length - 1].id : null)
    } catch { /* silenciado */ } finally { setCargandoDetalle(false) }
  }

  const moverAccion = async (id: string, estado: string) => {
    const r = await fetch('/api/incendios/pci?tipo=accion', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    if (r.ok) { cargar(); if (detalle?.edificio?.id) abrirEdificio(detalle.edificio.id) }
    else alert('No se ha podido actualizar la acción')
  }

  const cambiarEstadoPresupuesto = async (id: string, estado: string) => {
    const r = await fetch('/api/incendios/pci?tipo=presupuesto', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    if (r.ok) cargar()
  }

  const conformarFactura = async (id: string, conformada: boolean) => {
    const r = await fetch('/api/incendios/pci?tipo=factura', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, conformada }),
    })
    if (r.ok) cargar()
  }

  const edificiosFiltrados = useMemo(() => edificios.filter(e =>
    !busqueda || `${e.nombre} ${e.alias || ''} ${e.codigoCliente || ''}`.toLowerCase().includes(busqueda.toLowerCase())
  ), [edificios, busqueda])

  const accionesFiltradas = useMemo(() =>
    acciones.filter(a => filtroCategoria === 'todas' || a.categoria === filtroCategoria),
    [acciones, filtroCategoria])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-red-500 animate-spin" /><p className="text-slate-500 font-medium">Cargando contrato PCI...</p></div>
    </div>
  )

  // ── Ficha de edificio ──────────────────────────────────────────────────────
  if (detalle?.edificio) {
    const { edificio, revisiones, presupuestos: pres, acciones: accs, facturas: facs } = detalle
    const descripcionesPrevias = new Set<string>()
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => setDetalle(null)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} /></button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800">{edificio.nombre}</h2>
                {edificio.codigoCliente && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-mono font-bold">{edificio.codigoCliente}</span>}
              </div>
              {edificio.alias && edificio.alias !== edificio.nombre && <p className="text-sm text-slate-500">{edificio.alias}</p>}
            </div>
          </div>
          {cargandoDetalle && <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />}
        </div>

        {/* Timeline de revisiones */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><ClipboardList size={16} />Evolución de las revisiones</h3>
          {revisiones.length === 0 ? (
            <div className="border border-slate-200 rounded-xl text-center py-10 text-slate-400 text-sm">Sin revisiones registradas para este edificio.</div>
          ) : (
            <div className="space-y-3">
              {revisiones.map((rev: any, idx: number) => {
                const abierta = revisionAbierta === rev.id
                const nuevos = rev.hallazgos.filter((h: any) => !descripcionesPrevias.has(h.descripcion))
                const repetidos = rev.hallazgos.filter((h: any) => descripcionesPrevias.has(h.descripcion))
                rev.hallazgos.forEach((h: any) => descripcionesPrevias.add(h.descripcion))
                return (
                  <div key={rev.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => setRevisionAbierta(abierta ? null : rev.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${rev.resultado === 'favorable' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-800">{rev.campana}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${rev.tipo === 'ANUAL' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{rev.tipo === 'ANUAL' ? 'Anual' : 'Trimestral'}</span>
                            <span className="text-xs text-slate-400">{fmtFecha(rev.fecha)}</span>
                            {rev.hallazgos.length === 0
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">Sin defectos</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">{rev.hallazgos.length} defecto(s)</span>}
                            {idx > 0 && repetidos.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-red-100 text-red-800 border-red-300">
                                <Repeat size={11} />{repetidos.length} sin subsanar
                              </span>
                            )}
                            {idx > 0 && nuevos.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">{nuevos.length} nuevo(s)</span>
                            )}
                          </div>
                          {rev.presupuestos?.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">Presupuesto {rev.presupuestos.map((p: any) => `${p.numero} — ${fmtEur(p.total)}`).join(' · ')}</p>
                          )}
                        </div>
                      </div>
                      {abierta ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                    </button>

                    {abierta && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        {rev.equiposResumen && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Equipos de la instalación</p>
                            <p className="text-sm text-slate-600">{rev.equiposResumen}</p>
                          </div>
                        )}
                        {rev.hallazgos.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hallazgos</p>
                            <div className="space-y-1.5">
                              {rev.hallazgos.map((h: any) => {
                                const eh = ESTADO_HALLAZGO[h.estado] || ESTADO_HALLAZGO.DEFECTO
                                return (
                                  <div key={h.id} className="flex items-start gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium border ${eh.color}`}>{eh.label}</span>
                                    <div className="min-w-0">
                                      <p className="text-sm text-slate-700">{h.descripcion}</p>
                                      <p className="text-xs text-slate-400">{h.elemento}{h.ubicacion ? ` · ${h.ubicacion}` : ''}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                          {rev.tecnico && <span>Técnico: <strong className="text-slate-700">{rev.tecnico}</strong></span>}
                          {rev.numeroTrabajo && <span>Nº trabajo: <strong className="text-slate-700">{rev.numeroTrabajo}</strong></span>}
                          {rev.documento && <span>Documento: <strong className="text-slate-700">{rev.documento}</strong></span>}
                        </div>
                        {rev.observaciones && <p className="text-xs text-slate-500 italic">{rev.observaciones}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones correctivas del edificio */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><Wrench size={16} />Acciones correctivas</h3>
          {accs.length === 0 ? (
            <div className="border border-slate-200 rounded-xl text-center py-8 text-slate-400 text-sm">Sin acciones abiertas.</div>
          ) : (
            <div className="space-y-2">
              {accs.map((a: any) => {
                const pr = PRIORIDADES[a.prioridad] || PRIORIDADES.media
                const es = ESTADOS_PIPELINE.find(e => e.id === a.estado) || ESTADOS_PIPELINE[0]
                return (
                  <div key={a.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${pr.color}`}>{pr.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${es.color}`}>{es.label}</span>
                          {a.recurrente && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-red-100 text-red-800 border-red-300"><Repeat size={11} />Recurrente ×{a.vecesDetectada}</span>}
                          {a.categoria === 'CCTV' && <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-cyan-50 text-cyan-700 border-cyan-200">CCTV</span>}
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{a.descripcion}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {a.presupuesto ? `Presupuesto ${a.presupuesto.numero} · ` : ''}
                          {a.primeraDeteccion ? `Detectado por primera vez el ${fmtFecha(a.primeraDeteccion)}` : ''}
                        </p>
                        {a.notas && <p className="text-xs text-slate-500 italic mt-1">{a.notas}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-slate-800">{fmtEur(a.importe)}</p>
                        {canEdit && (
                          <select
                            value={a.estado}
                            onChange={e => moverAccion(a.id, e.target.value)}
                            className="mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            {ESTADOS_PIPELINE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Presupuestos y facturas del edificio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><Euro size={16} />Presupuestos</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['Nº', 'Fecha', 'Concepto', 'Importe', 'Estado'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pres.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">Sin presupuestos</td></tr> : pres.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-slate-700">{p.numero}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmtFecha(p.fecha)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[220px]"><p className="truncate" title={p.concepto}>{p.concepto}</p></td>
                      <td className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">{fmtEur(p.total)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {canEdit ? (
                          <select value={p.estado} onChange={e => cambiarEstadoPresupuesto(p.id, e.target.value)} className="px-2 py-1 border border-slate-200 rounded-lg text-xs">
                            {['PRESENTADO', 'ACEPTADO', 'EJECUTADO', 'FACTURADO', 'RECHAZADO'].map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        ) : <span className="text-xs">{p.estado}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><Receipt size={16} />Facturas</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['Nº', 'Fecha', 'Concepto', 'Importe', 'Conformada'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {facs.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">Sin facturas</td></tr> : facs.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-slate-700">{f.numero}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmtFecha(f.fecha)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{f.concepto}</td>
                      <td className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">{fmtEur(f.importe)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button disabled={!canEdit} onClick={() => conformarFactura(f.id, !f.conformada)} className={`px-2 py-1 rounded-lg text-xs font-medium ${f.conformada ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} disabled:opacity-60`}>
                          {f.conformada ? 'Sí' : 'No'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista general ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Cabecera + proveedor */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Contrato PCI — Edificios Municipales</h2>
          <p className="text-sm text-slate-500">Revisiones reglamentarias, defectos, presupuestos correctivos y seguimiento de actuaciones.</p>
        </div>
        <button onClick={() => setVerProveedor(v => !v)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          <Info size={16} />Empresa mantenedora
        </button>
      </div>

      {verProveedor && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          {[
            ['Razón social', `${PROVEEDOR_PCI.razonSocial} (${PROVEEDOR_PCI.nombreComercial})`],
            ['CIF', PROVEEDOR_PCI.cif],
            ['REIA / DGS', `${PROVEEDOR_PCI.reia} / ${PROVEEDOR_PCI.dgs}`],
            ['Domicilio', PROVEEDOR_PCI.domicilio],
            ['Teléfono', PROVEEDOR_PCI.telefono],
            ['Web', PROVEEDOR_PCI.web],
            ['Ingeniero certificador', PROVEEDOR_PCI.ingeniero],
            ['Técnico de campo', PROVEEDOR_PCI.tecnicoCampo],
            ['Cliente', PROVEEDOR_PCI.cliente],
            ['Marco normativo', PROVEEDOR_PCI.marco],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2"><span className="text-slate-400 font-medium shrink-0">{k}:</span><span className="text-slate-700">{v}</span></div>
          ))}
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { l: 'Pendiente de aprobar (PCI)', v: fmtEur(kpis.importePendientePci), i: Euro, c: 'text-red-600 bg-red-50' },
            { l: 'Defectos abiertos', v: kpis.accionesAbiertas, i: AlertTriangle, c: 'text-amber-600 bg-amber-50' },
            { l: 'Recurrentes sin resolver', v: kpis.accionesRecurrentes, i: Repeat, c: 'text-orange-600 bg-orange-50' },
            { l: 'Edificios con central KO', v: kpis.edificiosCentralKO, i: ShieldAlert, c: 'text-purple-600 bg-purple-50' },
            { l: 'Facturas sin conformar', v: kpis.facturasPendientes, i: Receipt, c: 'text-blue-600 bg-blue-50' },
          ].map(k => (
            <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${k.c}`}><k.i className="w-5 h-5" /></div>
              <div className="min-w-0"><p className="text-xl font-bold text-slate-800 leading-tight truncate">{k.v}</p><p className="text-xs text-slate-500 mt-0.5">{k.l}</p></div>
            </div>
          ))}
        </div>
      )}
      {kpis?.importePendienteCctv > 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Layers size={13} />Además, {fmtEur(kpis.importePendienteCctv)} en actuaciones de videovigilancia (CCTV), contabilizadas aparte del cómputo PCI.
        </p>
      )}

      {/* Sub-navegación */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {[
          { id: 'edificios', label: 'Edificios', icon: Building2 },
          { id: 'pipeline', label: 'Pipeline de actuaciones', icon: Wrench },
          { id: 'recurrentes', label: 'Defectos recurrentes', icon: Repeat },
          { id: 'economico', label: 'Presupuestos y facturas', icon: Euro },
        ].map(t => (
          <button key={t.id} onClick={() => setVista(t.id as any)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${vista === t.id ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {/* EDIFICIOS */}
      {vista === 'edificios' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar edificio o código..." className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {edificiosFiltrados.map(e => {
              const s = SEMAFORO[e.semaforo] || SEMAFORO.verde
              return (
                <button key={e.id} onClick={() => abrirEdificio(e.id)} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${s.punto}`} title={s.label} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{e.nombre}</h4>
                        {e.alias && e.alias !== e.nombre && <p className="text-xs text-slate-400 truncate">{e.alias}</p>}
                      </div>
                    </div>
                    {e.codigoCliente && <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono font-bold">{e.codigoCliente}</span>}
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>Última revisión: <strong className="text-slate-700">{e.ultimaRevision ? `${e.ultimaRevision.campana} (${fmtFecha(e.ultimaRevision.fecha)})` : '—'}</strong></p>
                    <p>{e.totalRevisiones} revisión(es) registradas · {e.ultimaRevision?.defectos ?? 0} defecto(s) en la última</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {e.altas > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-red-50 text-red-700 border-red-200">{e.altas} alta</span>}
                      {e.recurrentes > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-orange-50 text-orange-700 border-orange-200"><Repeat size={10} />{e.recurrentes}</span>}
                      {e.accionesAbiertas === 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 size={10} />Al corriente</span>}
                    </div>
                    {e.importeAbierto > 0 && <span className="text-sm font-bold text-slate-700">{fmtEur(e.importeAbierto)}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* PIPELINE */}
      {vista === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
              <option value="PCI">Solo PCI</option>
              <option value="CCTV">Solo videovigilancia</option>
              <option value="todas">Todas</option>
            </select>
            <span className="text-sm text-slate-500">{accionesFiltradas.length} actuación(es)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
            {ESTADOS_PIPELINE.map(col => {
              const items = accionesFiltradas.filter(a => a.estado === col.id)
              const total = items.reduce((s, a) => s + (a.importe || 0), 0)
              return (
                <div key={col.id} className="bg-slate-50 rounded-xl p-3 min-h-[120px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{col.label}</p>
                    <span className="px-1.5 py-0.5 bg-white rounded text-[11px] font-bold text-slate-500">{items.length}</span>
                  </div>
                  {total > 0 && <p className="text-[11px] text-slate-400 mb-2">{fmtEur(total)}</p>}
                  <div className="space-y-2">
                    {items.map(a => {
                      const pr = PRIORIDADES[a.prioridad] || PRIORIDADES.media
                      return (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-2.5">
                          <div className="flex items-center gap-1 flex-wrap mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${pr.color}`}>{pr.label}</span>
                            {a.recurrente && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border bg-red-100 text-red-800 border-red-300"><Repeat size={9} />×{a.vecesDetectada}</span>}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 truncate">{a.edificio?.alias || a.edificio?.nombre}</p>
                          <p className="text-xs text-slate-700 leading-snug mt-0.5">{a.descripcion}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-slate-800">{fmtEur(a.importe)}</span>
                            {a.presupuesto && <span className="text-[10px] font-mono text-slate-400">{a.presupuesto.numero}</span>}
                          </div>
                          {canEdit && (
                            <select value={a.estado} onChange={e => moverAccion(a.id, e.target.value)} className="w-full mt-2 px-1.5 py-1 border border-slate-200 rounded text-[11px] focus:outline-none">
                              {ESTADOS_PIPELINE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* RECURRENTES */}
      {vista === 'recurrentes' && (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Defectos que reaparecen en dos o más campañas consecutivas: el correctivo se presupuestó pero <strong>no se ha ejecutado</strong>. Requieren decisión del Ayuntamiento.
            </p>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                {['Edificio', 'Elemento', 'Estado', 'Defecto', 'Campañas', 'Veces'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recurrentes.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No hay defectos recurrentes.</td></tr> : recurrentes.map((r: any, i: number) => {
                  const eh = ESTADO_HALLAZGO[r.estado] || ESTADO_HALLAZGO.DEFECTO
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700">{r.edificio?.alias || r.edificio?.nombre}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-600 whitespace-nowrap">{r.elemento}</td>
                      <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${eh.color}`}>{eh.label}</span></td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{r.descripcion}</td>
                      <td className="px-3 py-2.5 text-center text-[11px] text-slate-500 whitespace-nowrap">{r.campanas.join(' → ')}</td>
                      <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.veces >= 4 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>×{r.veces}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ECONÓMICO */}
      {vista === 'economico' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Presupuestos ({presupuestos.length})</h3>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['Nº', 'Fecha', 'Campaña', 'Edificio', 'Concepto', 'Tipo', 'Importe', 'Estado'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {presupuestos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-slate-700 whitespace-nowrap">{p.numero}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmtFecha(p.fecha)}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">{p.campana || '—'}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-700">{p.edificio?.alias || p.edificio?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[260px]"><p className="truncate" title={p.concepto}>{p.concepto}</p></td>
                      <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${p.categoria === 'CCTV' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{p.categoria}</span></td>
                      <td className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">{fmtEur(p.total)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {canEdit ? (
                          <select value={p.estado} onChange={e => cambiarEstadoPresupuesto(p.id, e.target.value)} className="px-2 py-1 border border-slate-200 rounded-lg text-xs">
                            {['PRESENTADO', 'ACEPTADO', 'EJECUTADO', 'FACTURADO', 'RECHAZADO'].map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        ) : <span className="text-xs">{p.estado}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Facturas ({facturas.length})</h3>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['Nº', 'Fecha', 'Edificio', 'Concepto', 'Importe', 'Conformada'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {facturas.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-slate-700 whitespace-nowrap">{f.numero}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmtFecha(f.fecha)}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-700">{f.edificio?.alias || f.edificio?.nombre || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{f.concepto}</td>
                      <td className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">{fmtEur(f.importe)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button disabled={!canEdit} onClick={() => conformarFactura(f.id, !f.conformada)} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${f.conformada ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} disabled:opacity-60`}>
                          {f.conformada ? 'Conformada' : 'Pendiente'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
