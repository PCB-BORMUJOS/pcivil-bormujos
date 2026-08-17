'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
    ShieldCheck, Plus, Search, Loader2, MapPin, FileText, CalendarClock,
    Building2, PartyPopper, Landmark, Layers, AlertTriangle, CheckCircle2,
    Clock, Upload, Trash2, Globe, X, Info,
} from 'lucide-react'
import { usePermisos } from '@/lib/permisos'
import {
    TIPOS_PLAN, ESTADOS_VIGENCIA, estadoVigencia, textoPlazo, type TipoPlan,
} from '@/lib/cartografia'
import PlanFormulario, { type PlanEditable } from '@/components/planes/PlanFormulario'
import PlanDetalle, { type PlanCompleto } from '@/components/planes/PlanDetalle'
import type { Capa, PuntoPlan } from '@/components/planes/MapaCartografia'

const MapaCartografia = dynamic(() => import('@/components/planes/MapaCartografia'), {
    ssr: false,
    loading: () => (
        <div className="h-full flex items-center justify-center bg-slate-100 rounded-2xl">
            <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
    ),
})

type Pestana = TipoPlan | 'cartografia'

const PESTANAS: Array<{ id: Pestana; label: string; icono: any }> = [
    { id: 'ptel',        label: 'PTEL',              icono: Landmark },
    { id: 'edificio',    label: 'Edificios públicos', icono: Building2 },
    { id: 'evento',      label: 'Eventos',            icono: PartyPopper },
    { id: 'cartografia', label: 'Cartografía',        icono: Layers },
]

const COLOR_PUNTO: Record<string, string> = {
    vigente: '#10b981', proxima: '#f59e0b', caducado: '#ef4444', sin_fecha: '#94a3b8',
}

export default function PlanesPage() {
    const { isAdmin } = usePermisos()
    const [pestana, setPestana] = useState<Pestana>('ptel')
    const [planes, setPlanes] = useState<PlanCompleto[]>([])
    const [capas, setCapas] = useState<Capa[]>([])
    const [cargando, setCargando] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState<string>('todos')

    const [detalle, setDetalle] = useState<PlanCompleto | null>(null)
    const [formulario, setFormulario] = useState<PlanEditable | null>(null)
    const [modalCapa, setModalCapa] = useState(false)

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const [rp, rc] = await Promise.all([fetch('/api/planes'), fetch('/api/cartografia')])
            const dp = rp.ok ? await rp.json() : { planes: [] }
            const dc = rc.ok ? await rc.json() : { capas: [] }
            setPlanes(dp.planes || [])
            setCapas(dc.capas || [])
        } catch {
            setPlanes([]); setCapas([])
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => { cargar() }, [cargar])

    // ── Resumen de vigencia ──────────────────────────────────────────────────
    const resumen = useMemo(() => {
        const r = { total: planes.length, vigente: 0, proxima: 0, caducado: 0, sin_fecha: 0 }
        for (const p of planes) r[estadoVigencia(p.fechaRevision)]++
        return r
    }, [planes])

    const planesFiltrados = useMemo(() => {
        if (pestana === 'cartografia') return []
        const q = busqueda.trim().toLowerCase()
        return planes
            .filter(p => p.tipo === pestana)
            .filter(p => filtroEstado === 'todos' || estadoVigencia(p.fechaRevision) === filtroEstado)
            .filter(p => !q || [p.nombre, p.direccion, p.responsableNombre, p.referencia, p.descripcion]
                .some(v => v?.toLowerCase().includes(q)))
    }, [planes, pestana, busqueda, filtroEstado])

    const puntos: PuntoPlan[] = useMemo(() =>
        planes
            .filter(p => typeof p.latitud === 'number' && typeof p.longitud === 'number')
            .map(p => ({
                id: p.id, nombre: p.nombre, tipo: p.tipo, direccion: p.direccion,
                latitud: p.latitud as number, longitud: p.longitud as number,
                estado: estadoVigencia(p.fechaRevision),
                colorPunto: COLOR_PUNTO[estadoVigencia(p.fechaRevision)],
            })), [planes])

    const tras = (plan: PlanCompleto) => {
        setPlanes(prev => prev.some(p => p.id === plan.id)
            ? prev.map(p => (p.id === plan.id ? plan : p))
            : [...prev, plan])
        if (detalle?.id === plan.id) setDetalle(plan)
    }

    const borrarPlan = async (plan: PlanCompleto) => {
        if (!confirm(`¿Eliminar el plan "${plan.nombre}"?\n\nSe borran también sus ${plan.documentos.length} documento(s). No se puede deshacer.`)) return
        const res = await fetch(`/api/planes/${plan.id}`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'No se pudo eliminar'); return }
        setPlanes(prev => prev.filter(p => p.id !== plan.id))
        setDetalle(null)
    }

    return (
        <div className="space-y-5 pb-10">
            {/* ── Cabecera ── */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <ShieldCheck size={20} />
                        </span>
                        Planes de Emergencia
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Plan territorial, autoprotección de edificios públicos y dispositivos de eventos
                    </p>
                </div>
                {isAdmin && pestana !== 'cartografia' && (
                    <button
                        onClick={() => setFormulario({ tipo: pestana as TipoPlan, nombre: '' })}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start"
                    >
                        <Plus size={16} /> Nuevo {TIPOS_PLAN[pestana as TipoPlan].singular.toLowerCase()}
                    </button>
                )}
                {isAdmin && pestana === 'cartografia' && (
                    <button
                        onClick={() => setModalCapa(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start"
                    >
                        <Plus size={16} /> Añadir capa
                    </button>
                )}
            </header>

            {/* ── Resumen ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tarjeta icono={FileText}      color="blue"    valor={resumen.total}    etiqueta="Planes registrados" />
                <Tarjeta icono={CheckCircle2}  color="emerald" valor={resumen.vigente}  etiqueta="Vigentes" />
                <Tarjeta icono={Clock}         color="amber"   valor={resumen.proxima}  etiqueta="Revisión próxima"
                         nota={resumen.proxima > 0 ? 'en menos de 90 días' : undefined} />
                <Tarjeta icono={AlertTriangle} color="red"     valor={resumen.caducado} etiqueta="Caducados"
                         resaltar={resumen.caducado > 0} />
            </div>

            {/* ── Pestañas ── */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-1 overflow-x-auto" role="tablist">
                    {PESTANAS.map(p => {
                        const Ic = p.icono
                        const activa = pestana === p.id
                        const n = p.id === 'cartografia' ? capas.length : planes.filter(x => x.tipo === p.id).length
                        return (
                            <button
                                key={p.id} role="tab" aria-selected={activa}
                                onClick={() => setPestana(p.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${activa
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                            >
                                <Ic size={15} /> {p.label}
                                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${activa ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {n}
                                </span>
                            </button>
                        )
                    })}
                </nav>
            </div>

            {cargando ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={30} />
                    <p className="text-sm text-slate-400">Cargando planes y cartografía…</p>
                </div>
            ) : pestana === 'cartografia' ? (
                <PestanaCartografia
                    capas={capas} puntos={puntos} isAdmin={isAdmin}
                    alPulsarPunto={id => { const p = planes.find(x => x.id === id); if (p) setDetalle(p) }}
                    alBorrarCapa={async (capa) => {
                        if (!confirm(`¿Eliminar la capa "${capa.nombre}"?`)) return
                        const res = await fetch(`/api/cartografia?id=${capa.id}`, { method: 'DELETE' })
                        if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'No se pudo eliminar'); return }
                        setCapas(prev => prev.filter(c => c.id !== capa.id))
                    }}
                />
            ) : (
                <>
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre, dirección o responsable…"
                                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="vigente">Vigentes</option>
                            <option value="proxima">Revisión próxima</option>
                            <option value="caducado">Caducados</option>
                            <option value="sin_fecha">Sin fecha</option>
                        </select>
                    </div>

                    {planesFiltrados.length === 0 ? (
                        <VacioPlanes
                            tipo={pestana as TipoPlan} hayFiltro={Boolean(busqueda || filtroEstado !== 'todos')}
                            isAdmin={isAdmin}
                            alCrear={() => setFormulario({ tipo: pestana as TipoPlan, nombre: '' })}
                        />
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {planesFiltrados.map(p => (
                                <TarjetaPlan key={p.id} plan={p} alAbrir={() => setDetalle(p)} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Superposiciones ── */}
            {detalle && (
                <PlanDetalle
                    plan={detalle} puedeEditar={isAdmin}
                    alCerrar={() => setDetalle(null)}
                    alEditar={() => { setFormulario({ ...(detalle as any) }); setDetalle(null) }}
                    alCambiar={tras}
                    alBorrarPlan={() => borrarPlan(detalle)}
                />
            )}
            {formulario && (
                <PlanFormulario
                    inicial={formulario}
                    alCerrar={() => setFormulario(null)}
                    alGuardar={plan => { tras({ ...plan, documentos: plan.documentos || [] }); setFormulario(null) }}
                />
            )}
            {modalCapa && (
                <ModalNuevaCapa
                    alCerrar={() => setModalCapa(false)}
                    alCrear={capa => { setCapas(prev => [...prev, capa]); setModalCapa(false) }}
                />
            )}
        </div>
    )
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function Tarjeta({ icono: Ic, color, valor, etiqueta, nota, resaltar }: {
    icono: any; color: 'blue' | 'emerald' | 'amber' | 'red'; valor: number; etiqueta: string; nota?: string; resaltar?: boolean
}) {
    const tonos = {
        blue:    { fondo: 'bg-blue-50',    texto: 'text-blue-600',    borde: 'border-slate-200' },
        emerald: { fondo: 'bg-emerald-50', texto: 'text-emerald-600', borde: 'border-slate-200' },
        amber:   { fondo: 'bg-amber-50',   texto: 'text-amber-600',   borde: 'border-slate-200' },
        red:     { fondo: 'bg-red-50',     texto: 'text-red-600',     borde: resaltar ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200' },
    }[color]
    return (
        <div className={`bg-white rounded-xl border ${tonos.borde} p-4 flex items-center gap-3.5`}>
            <span className={`w-11 h-11 rounded-xl ${tonos.fondo} ${tonos.texto} flex items-center justify-center flex-shrink-0`}>
                <Ic size={19} />
            </span>
            <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-800 leading-none">{valor}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{etiqueta}</p>
                {nota && <p className="text-[10px] text-slate-400">{nota}</p>}
            </div>
        </div>
    )
}

function TarjetaPlan({ plan, alAbrir }: { plan: PlanCompleto; alAbrir: () => void }) {
    const estado = estadoVigencia(plan.fechaRevision)
    const info = ESTADOS_VIGENCIA[estado]
    return (
        <button
            onClick={alAbrir}
            className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group flex flex-col gap-3"
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                    {plan.nombre}
                </h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${info.clases}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${info.punto}`} />
                    {info.label}
                </span>
            </div>

            {plan.direccion && (
                <p className="flex items-start gap-1.5 text-xs text-slate-500 -mt-1">
                    <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{plan.direccion}</span>
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 mt-auto pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1">
                    <CalendarClock size={11} className={estado === 'caducado' ? 'text-red-500' : estado === 'proxima' ? 'text-amber-500' : 'text-slate-400'} />
                    {textoPlazo(plan.fechaRevision)}
                </span>
                <span className="inline-flex items-center gap-1">
                    <FileText size={11} className="text-slate-400" />
                    {plan.documentos.length} doc.
                </span>
                {plan.aforo ? <span className="inline-flex items-center gap-1"><Building2 size={11} className="text-slate-400" />{plan.aforo} pax</span> : null}
            </div>
        </button>
    )
}

function VacioPlanes({ tipo, hayFiltro, isAdmin, alCrear }: {
    tipo: TipoPlan; hayFiltro: boolean; isAdmin: boolean; alCrear: () => void
}) {
    return (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 px-6 text-center">
            <span className="inline-flex w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 items-center justify-center mb-4">
                <ShieldCheck size={26} />
            </span>
            <h3 className="text-base font-bold text-slate-700">
                {hayFiltro ? 'Ningún plan coincide con la búsqueda' : `Todavía no hay ningún ${TIPOS_PLAN[tipo].singular.toLowerCase()}`}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                {hayFiltro ? 'Prueba a cambiar el texto o el filtro de estado.' : TIPOS_PLAN[tipo].descripcion}
            </p>
            {!hayFiltro && isAdmin && (
                <button onClick={alCrear} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    <Plus size={15} /> Crear el primero
                </button>
            )}
        </div>
    )
}

function PestanaCartografia({ capas, puntos, isAdmin, alPulsarPunto, alBorrarCapa }: {
    capas: Capa[]; puntos: PuntoPlan[]; isAdmin: boolean
    alPulsarPunto: (id: string) => void
    alBorrarCapa: (capa: Capa) => void
}) {
    const propias = capas.filter(c => !c.esOficial)
    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                    La ortofoto, el mapa topográfico, el término municipal, el catastro y la hidrografía se traen
                    directamente de los servicios oficiales del <strong>Instituto Geográfico Nacional</strong>, la{' '}
                    <strong>Dirección General del Catastro</strong> y el <strong>Instituto de Cartografía de Andalucía</strong>.
                    No ocupan espacio y están siempre actualizados. Puedes añadir además tu propia cartografía
                    subiendo un shapefile, un KML o un GeoJSON.
                </p>
            </div>

            <div style={{ height: 'clamp(520px, 68vh, 900px)' }}>
                <MapaCartografia capas={capas} puntos={puntos} alPulsarPunto={alPulsarPunto} />
            </div>

            {isAdmin && propias.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Capas propias</h3>
                    <ul className="space-y-2">
                        {propias.map(c => (
                            <li key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ background: `${c.color}1a`, color: c.color }}>
                                    {c.tipo === 'wms' ? <Globe size={14} /> : <Layers size={14} />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p>
                                    <p className="text-[11px] text-slate-500">
                                        {c.tipo === 'wms' ? 'Servicio WMS externo' : `${c.numElementos ?? 0} elementos · ${c.nombreArchivo || 'fichero'}`}
                                    </p>
                                </div>
                                <button onClick={() => alBorrarCapa(c)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

/** Alta de capa: fichero propio (SHP/KML/GeoJSON) o servicio WMS externo. */
function ModalNuevaCapa({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (capa: Capa) => void }) {
    const [modo, setModo] = useState<'archivo' | 'wms'>('archivo')
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [color, setColor] = useState('#2563eb')
    const [wmsUrl, setWmsUrl] = useState('')
    const [wmsLayers, setWmsLayers] = useState('')
    const [wmsVersion, setWmsVersion] = useState('1.1.1')
    const [archivo, setArchivo] = useState<File | null>(null)
    const [procesando, setProcesando] = useState(false)
    const [paso, setPaso] = useState('')
    const [error, setError] = useState<string | null>(null)

    const campo = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500'
    const etiqueta = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5'

    const subirArchivo = async () => {
        if (!archivo) { setError('Elige un fichero'); return }
        if (!nombre.trim()) { setError('Ponle un nombre a la capa'); return }
        setProcesando(true); setError(null)
        try {
            const ext = archivo.name.toLowerCase().split('.').pop()
            let geojson: any

            if (ext === 'zip' || ext === 'shp') {
                setPaso('Leyendo el shapefile y convirtiendo coordenadas…')
                const shp = (await import('shpjs')).default
                geojson = await shp(await archivo.arrayBuffer())
                // Un .zip con varias capas devuelve un array: se fusionan en una sola.
                if (Array.isArray(geojson)) {
                    geojson = { type: 'FeatureCollection', features: geojson.flatMap((g: any) => g.features || []) }
                }
            } else if (ext === 'kml') {
                setPaso('Leyendo el KML…')
                const tj = await import('@tmcw/togeojson')
                const dom = new DOMParser().parseFromString(await archivo.text(), 'text/xml')
                geojson = tj.kml(dom as any)
            } else if (ext === 'geojson' || ext === 'json') {
                setPaso('Leyendo el GeoJSON…')
                geojson = JSON.parse(await archivo.text())
            } else {
                setError('Formato no reconocido. Admite .zip (shapefile), .kml o .geojson'); setProcesando(false); return
            }

            const n = geojson?.features?.length ?? 0
            if (!n) { setError('El fichero no contiene ninguna geometría dibujable'); setProcesando(false); return }

            setPaso(`Guardando ${n} elementos…`)
            const fd = new FormData()
            fd.append('nombre', nombre.trim())
            fd.append('descripcion', descripcion)
            fd.append('color', color)
            fd.append('nombreArchivo', archivo.name)
            fd.append('geojson', JSON.stringify(geojson))

            const res = await fetch('/api/cartografia', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo guardar la capa'); return }
            alCrear(data.capa)
        } catch (e: any) {
            setError(`No se pudo leer el fichero: ${e?.message || 'formato no válido'}`)
        } finally {
            setProcesando(false); setPaso('')
        }
    }

    const crearWms = async () => {
        if (!nombre.trim()) { setError('Ponle un nombre a la capa'); return }
        setProcesando(true); setError(null)
        try {
            const res = await fetch('/api/cartografia', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombre.trim(), descripcion, wmsUrl, wmsLayers, wmsVersion, categoria: 'tematica' }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo añadir la capa'); return }
            alCrear(data.capa)
        } catch {
            setError('Error de conexión')
        } finally {
            setProcesando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[1300] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Añadir capa al mapa</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Cartografía propia o un servicio externo</p>
                    </div>
                    <button onClick={alCerrar} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        {([['archivo', 'Subir fichero', Upload], ['wms', 'Servicio WMS', Globe]] as const).map(([id, txt, Ic]) => (
                            <button
                                key={id} onClick={() => { setModo(id as any); setError(null) }}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${modo === id
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >
                                <Ic size={15} /> {txt}
                            </button>
                        ))}
                    </div>

                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

                    <div>
                        <label className={etiqueta}>Nombre de la capa *</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Zonas inundables del arroyo" className={campo} />
                    </div>
                    <div>
                        <label className={etiqueta}>Descripción</label>
                        <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className={campo} />
                    </div>

                    {modo === 'archivo' ? (
                        <>
                            <div>
                                <label className={etiqueta}>Fichero cartográfico</label>
                                <input
                                    type="file" accept=".zip,.kml,.geojson,.json"
                                    onChange={e => { setArchivo(e.target.files?.[0] || null); setError(null) }}
                                    className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                                    Shapefile comprimido en <strong>.zip</strong> (con sus .shp, .dbf, .shx y .prj dentro),
                                    <strong> .kml</strong> o <strong>.geojson</strong>. Las coordenadas se convierten
                                    automáticamente al sistema del mapa.
                                </p>
                            </div>
                            <div>
                                <label className={etiqueta}>Color de dibujo</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={color} onChange={e => setColor(e.target.value)}
                                           className="w-12 h-9 rounded-lg border border-slate-300 cursor-pointer" />
                                    <span className="text-xs text-slate-500 font-mono">{color}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className={etiqueta}>Dirección del servicio *</label>
                                <input value={wmsUrl} onChange={e => setWmsUrl(e.target.value)}
                                       placeholder="https://servidor.es/wms" className={`${campo} font-mono text-xs`} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className={etiqueta}>Nombre de capa *</label>
                                    <input value={wmsLayers} onChange={e => setWmsLayers(e.target.value)}
                                           placeholder="zonas_inundables" className={`${campo} font-mono text-xs`} />
                                </div>
                                <div>
                                    <label className={etiqueta}>Versión</label>
                                    <select value={wmsVersion} onChange={e => setWmsVersion(e.target.value)} className={campo}>
                                        <option value="1.1.1">1.1.1</option>
                                        <option value="1.3.0">1.3.0</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Si no conoces el nombre exacto de la capa, ábre la dirección del servicio en el navegador
                                añadiendo <span className="font-mono">?service=WMS&amp;request=GetCapabilities</span> y
                                búscalo entre las etiquetas <span className="font-mono">&lt;Name&gt;</span>.
                            </p>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    {procesando && paso && <span className="text-xs text-slate-500 mr-auto">{paso}</span>}
                    <button onClick={alCerrar} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button
                        onClick={modo === 'archivo' ? subirArchivo : crearWms} disabled={procesando}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                        {procesando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        {procesando ? 'Procesando…' : 'Añadir capa'}
                    </button>
                </div>
            </div>
        </div>
    )
}
