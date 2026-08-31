'use client'

/**
 * Estadísticas de los partes de servicio.
 *
 * Sustituye a la versión anterior, que mostraba cifras inventadas y un ranking
 * con nombres que no correspondían a nadie. Aquí todo sale de la base de datos
 * a través de /api/partes/estadisticas.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Loader2, FileText, ClipboardCheck, HeartPulse, ChevronLeft,
    Radio, Truck, MapPin, Users,
} from 'lucide-react'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TIPOS: Record<string, { barra: string; suave: string; texto: string; icono: any; href: string }> = {
    PSI: { barra: 'bg-orange-500', suave: 'bg-orange-50 border-orange-200', texto: 'text-orange-600', icono: FileText, href: '/partes' },
    PRF: { barra: 'bg-indigo-500', suave: 'bg-indigo-50 border-indigo-200', texto: 'text-indigo-600', icono: ClipboardCheck, href: '/partes/prf' },
    PAS: { barra: 'bg-emerald-500', suave: 'bg-emerald-50 border-emerald-200', texto: 'text-emerald-600', icono: HeartPulse, href: '/partes/pas' },
}

const ESTADOS: Record<string, { label: string; barra: string }> = {
    borrador: { label: 'Borrador', barra: 'bg-gray-400' },
    pendiente_vb: { label: 'Pendiente de Vº Bº', barra: 'bg-yellow-500' },
    completo: { label: 'Completo', barra: 'bg-green-500' },
}
const RESULTADOS: Record<string, { label: string; clase: string }> = {
    apto: { label: 'Apto', clase: 'bg-green-100 text-green-800 border-green-300' },
    apto_condiciones: { label: 'Apto con condiciones', clase: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    no_apto: { label: 'No apto', clase: 'bg-red-100 text-red-800 border-red-300' },
}
const GRUPOS: Record<string, { label: string; barra: string }> = {
    intervencion: { label: 'Intervención', barra: 'bg-red-500' },
    prevencion: { label: 'Prevención', barra: 'bg-blue-500' },
    otros: { label: 'Otros', barra: 'bg-gray-400' },
}

/** Tarjeta blanca con título, el patrón del resto de la aplicación. */
function Panel({ titulo, subtitulo, icono: Icono, children, className = '' }: any) {
    return (
        <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-200 ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                {Icono && <Icono className="w-4 h-4 text-gray-400" />}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{titulo}</h2>
                    {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
                </div>
            </div>
            {children}
        </div>
    )
}

/** Fila con barra proporcional. `max` es el mayor valor de la serie. */
function Barra({ etiqueta, n, max, color = 'bg-orange-500', pos }: { etiqueta: string; n: number; max: number; color?: string; pos?: number }) {
    return (
        <div className="flex items-center gap-3">
            {pos !== undefined && <span className="w-5 text-xs font-bold text-gray-400 text-right">{pos}</span>}
            <span className="text-sm text-gray-700 flex-1 truncate" title={etiqueta}>{etiqueta}</span>
            <div className="w-28 sm:w-36 bg-gray-100 rounded-full h-2 overflow-hidden shrink-0">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? (n / max) * 100 : 0}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-800 w-8 text-right">{n}</span>
        </div>
    )
}

const Vacio = ({ texto }: { texto: string }) => <p className="text-sm text-gray-400">{texto}</p>

export default function EstadisticasPartesPage() {
    const [datos, setDatos] = useState<any>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [anio, setAnio] = useState(new Date().getFullYear())

    const cargar = useCallback(async () => {
        setCargando(true); setError(null)
        try {
            const r = await fetch(`/api/partes/estadisticas?year=${anio}`)
            if (!r.ok) throw new Error('No se han podido cargar las estadísticas')
            setDatos(await r.json())
        } catch (e: any) {
            setDatos(null); setError(e.message)
        } finally { setCargando(false) }
    }, [anio])
    useEffect(() => { cargar() }, [cargar])

    if (cargando) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Loader2 className="animate-spin w-8 h-8 text-orange-500 mb-2" />
                <span className="text-sm text-gray-400">Cargando estadísticas...</span>
            </div>
        )
    }
    if (!datos) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <p className="text-sm text-gray-500">{error || 'Sin datos.'}</p>
                <button onClick={cargar} className="mt-3 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    Reintentar
                </button>
            </div>
        )
    }

    const maxMes = Math.max(1, ...datos.porMes.map((m: any) => m.total))
    const anios = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i)
    const maxTip = Math.max(1, ...datos.tipologias.map((t: any) => t.n))
    const maxInd = Math.max(1, ...datos.indicativos.map((i: any) => i.n))
    const maxVeh = Math.max(1, ...datos.vehiculosMovilizados.map((v: any) => v.n))
    const maxLug = Math.max(1, ...datos.lugares.map(([, n]: [string, number]) => n))
    const maxFranja = Math.max(1, ...datos.pacientes.franjas.map((f: any) => f.n))
    const tecnicas: any[] = [...datos.trasladoPAS, ...datos.inmovilizacionPAS]
    const maxTec = Math.max(1, ...tecnicas.map(t => t.n))

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/partes" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700" title="Volver a partes">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Estadísticas de partes</h1>
                        <p className="text-gray-500 mt-1">{datos.total} partes registrados en {datos.anio}</p>
                    </div>
                </div>
                <select
                    value={anio} onChange={e => setAnio(Number(e.target.value))}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white outline-none"
                >
                    {anios.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {/* TOTALES POR TIPO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de partes</p>
                    <p className="text-4xl font-bold text-gray-800 mt-1">{datos.total}</p>
                    <p className="text-xs text-gray-400 mt-1">en {datos.anio}</p>
                </div>
                {datos.porTipo.map((t: any) => {
                    const cfg = TIPOS[t.tipo]
                    const Icono = cfg.icono
                    const pct = datos.total ? Math.round((t.n / datos.total) * 100) : 0
                    return (
                        <Link key={t.tipo} href={cfg.href}
                              className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${cfg.suave}`}>
                            <div className="flex items-center justify-between">
                                <p className={`text-xs font-bold uppercase tracking-wide ${cfg.texto}`}>{t.tipo}</p>
                                <Icono size={18} className={cfg.texto} />
                            </div>
                            <p className="text-4xl font-bold text-gray-800 mt-1">{t.n}</p>
                            <p className="text-xs text-gray-500 mt-1">{t.etiqueta} · {pct}%</p>
                        </Link>
                    )
                })}
            </div>

            {/* EVOLUCIÓN MENSUAL */}
            <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Partes por mes</h2>
                <div className="flex items-end gap-1.5 sm:gap-2 h-48">
                    {datos.porMes.map((m: any) => (
                        <div key={m.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                            <span className="text-xs font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity h-4">
                                {m.total || ''}
                            </span>
                            {/* Columna apilada: se ve el total y de qué se compone */}
                            <div className="w-full flex flex-col justify-end rounded-t overflow-hidden"
                                 style={{ height: `${(m.total / maxMes) * 100}%` }}>
                                {(['pas', 'prf', 'psi'] as const).map(k => m[k] > 0 && (
                                    <div key={k} title={`${k.toUpperCase()}: ${m[k]}`}
                                         className={TIPOS[k.toUpperCase()].barra}
                                         style={{ height: `${(m[k] / m.total) * 100}%` }} />
                                ))}
                            </div>
                            <span className="text-[10px] text-gray-400">{MESES[m.mes]}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
                    {datos.porTipo.map((t: any) => (
                        <span key={t.tipo} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`w-3 h-3 rounded-sm ${TIPOS[t.tipo].barra}`} /> {t.tipo}
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* TIPOLOGÍA DE LOS SERVICIOS (PSI) */}
                <Panel titulo="Tipología de los servicios" subtitulo="Marcada en los partes PSI" icono={FileText}>
                    {datos.tipologias.length === 0 ? <Vacio texto={`Sin tipologías marcadas en ${datos.anio}.`} /> : (
                        <div className="space-y-2.5">
                            {datos.tipologias.map((t: any) => (
                                <Barra key={t.clave} etiqueta={t.etiqueta} n={t.n} max={maxTip}
                                       color={GRUPOS[t.grupo]?.barra || 'bg-gray-400'} />
                            ))}
                            <div className="flex gap-4 pt-3 mt-1 border-t border-gray-100">
                                {Object.entries(GRUPOS).map(([k, g]) => (
                                    <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <span className={`w-3 h-3 rounded-sm ${g.barra}`} /> {g.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </Panel>

                {/* INDICATIVOS QUE INTERVIENEN */}
                <Panel titulo="Indicativos que intervienen" subtitulo="Equipo que consta en los partes PSI y PAS" icono={Radio}>
                    {datos.indicativos.length === 0 ? <Vacio texto={`Sin equipos registrados en ${datos.anio}.`} /> : (
                        <div className="space-y-2.5">
                            {datos.indicativos.map((i: any, n: number) => (
                                <Barra key={i.indicativo} etiqueta={i.indicativo} n={i.n} max={maxInd} pos={n + 1} />
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* ESTADO */}
                <Panel titulo="Estado de los partes">
                    <div className="space-y-3">
                        {datos.porEstado.map(([estado, n]: [string, number]) => (
                            <div key={estado}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700">{ESTADOS[estado]?.label || estado}</span>
                                    <span className="font-semibold text-gray-800">{n}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${ESTADOS[estado]?.barra || 'bg-gray-400'}`}
                                         style={{ width: `${datos.total ? (n / datos.total) * 100 : 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* VEHÍCULOS */}
                <Panel titulo="Vehículos movilizados" subtitulo="Salidas registradas en partes PSI" icono={Truck}>
                    {datos.vehiculosMovilizados.length === 0 ? <Vacio texto="Ningún vehículo registrado." /> : (
                        <div className="space-y-2.5">
                            {datos.vehiculosMovilizados.map((v: any) => (
                                <Barra key={v.indicativo} etiqueta={v.indicativo} n={v.n} max={maxVeh} color="bg-slate-500" />
                            ))}
                        </div>
                    )}
                </Panel>

                {/* LUGARES */}
                <Panel titulo="Lugares más frecuentes" subtitulo="PSI y PAS" icono={MapPin}>
                    {datos.lugares.length === 0 ? <Vacio texto="Sin lugares registrados." /> : (
                        <div className="space-y-2.5">
                            {datos.lugares.map(([lugar, n]: [string, number]) => (
                                <Barra key={lugar} etiqueta={lugar} n={n} max={maxLug} color="bg-teal-500" />
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            {/* REVISIONES DE FERIA */}
            <Panel titulo="Revisiones de feria" subtitulo={`${datos.casetasRevisadas} casetas distintas revisadas`}
                   icono={ClipboardCheck} className="mb-6">
                {datos.resultadosPRF.length === 0 ? <Vacio texto={`Ninguna revisión con resultado en ${datos.anio}.`} /> : (
                    <div className="flex flex-wrap gap-2">
                        {datos.resultadosPRF.map(([r, n]: [string, number]) => (
                            <span key={r} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${RESULTADOS[r]?.clase || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                                {RESULTADOS[r]?.label || r} · {n}
                            </span>
                        ))}
                    </div>
                )}
            </Panel>

            {/* SOPORTE VITAL BÁSICO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Panel titulo="Personas atendidas" subtitulo="Filiación recogida en los partes PAS" icono={Users}>
                    {datos.pacientes.conSexo === 0 && !datos.pacientes.edadMedia ? (
                        <Vacio texto={`Sin filiación registrada en ${datos.anio}.`} />
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="text-center py-2 rounded-lg bg-sky-50 border border-sky-100">
                                    <p className="text-2xl font-bold text-sky-700">{datos.pacientes.hombres}</p>
                                    <p className="text-xs text-gray-500">Hombres</p>
                                </div>
                                <div className="text-center py-2 rounded-lg bg-pink-50 border border-pink-100">
                                    <p className="text-2xl font-bold text-pink-700">{datos.pacientes.mujeres}</p>
                                    <p className="text-xs text-gray-500">Mujeres</p>
                                </div>
                                <div className="text-center py-2 rounded-lg bg-gray-50 border border-gray-200">
                                    <p className="text-2xl font-bold text-gray-700">{datos.pacientes.edadMedia ?? '—'}</p>
                                    <p className="text-xs text-gray-500">Edad media</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                {datos.pacientes.franjas.map((f: any) => (
                                    <Barra key={f.etiqueta} etiqueta={`${f.etiqueta} años`} n={f.n} max={maxFranja} color="bg-emerald-500" />
                                ))}
                            </div>
                        </>
                    )}
                </Panel>

                <Panel titulo="Técnicas empleadas" subtitulo="Traslado e inmovilización en los partes PAS" icono={HeartPulse}>
                    {tecnicas.length === 0 ? <Vacio texto={`Sin técnicas marcadas en ${datos.anio}.`} /> : (
                        <div className="space-y-2.5">
                            {tecnicas.map((t: any) => (
                                <Barra key={t.etiqueta} etiqueta={t.etiqueta} n={t.n} max={maxTec} color="bg-violet-500" />
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            {/* El número de heridos solo se registra en los partes PSI de accidente */}
            {datos.heridos.partes > 0 && (
                <p className="text-xs text-gray-500 mt-6 text-center">
                    {datos.heridos.partes} partes PSI con heridos ({datos.heridos.total} personas registradas)
                    {datos.heridos.fallecidos > 0 && ` · ${datos.heridos.fallecidos} fallecidos`}
                </p>
            )}
            <p className="text-xs text-gray-400 mt-2 text-center">
                Datos leídos de la base de datos al abrir la página. No incluye partes archivados.
            </p>
        </div>
    )
}
