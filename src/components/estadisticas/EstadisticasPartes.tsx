'use client'

/**
 * Estadísticas de los partes de servicio.
 *
 * Se usa en cuatro sitios con el mismo código: dentro de PSI, de PRF y de PAS
 * —cada uno con lo suyo— y en la pestaña «Partes» del módulo de Estadísticas,
 * donde se ven los tres a la vez. Lo que cambia es la prop `tipos`.
 *
 * Cuando el padre pasa `anio`, manda el selector del padre; si no, el
 * componente enseña el suyo.
 */

import { useCallback, useEffect, useState } from 'react'
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
    Loader2, FileText, ClipboardCheck, HeartPulse, Radio,
    Users, AlertTriangle, Building2, Activity, Stethoscope,
} from 'lucide-react'
import {
    PALETTE, CHART_COLORS, MESES, fmtNum,
    KpiCard, Panel, Badge, ChartTooltip, DataTable, BarraRanking, SinDatos,
} from './ui'

export type TipoParte = 'PSI' | 'PRF' | 'PAS'

const COLOR_TIPO: Record<TipoParte, string> = {
    PSI: PALETTE.orange, PRF: PALETTE.indigo, PAS: PALETTE.teal,
}
const COLOR_GRUPO: Record<string, string> = {
    intervencion: PALETTE.red, prevencion: PALETTE.blue, otros: PALETTE.slate,
}
const LBL_GRUPO: Record<string, string> = {
    intervencion: 'Intervención', prevencion: 'Prevención', otros: 'Otros',
}
const LBL_ESTADO: Record<string, string> = {
    borrador: 'Borrador', pendiente_vb: 'Pendiente de Vº Bº', completo: 'Completo',
}
const VAR_ESTADO: Record<string, string> = {
    borrador: 'default', pendiente_vb: 'amber', completo: 'green',
}
const LBL_RESULTADO: Record<string, { label: string; variant: string; color: string }> = {
    apto: { label: 'Apto', variant: 'green', color: PALETTE.green },
    apto_condiciones: { label: 'Apto con condiciones', variant: 'amber', color: PALETTE.amber },
    no_apto: { label: 'No apto', variant: 'red', color: PALETTE.red },
}
const LBL_CIRCULACION: Record<string, string> = {
    prevencion: 'Prevención', intervencion: 'Intervención', otros: 'Otros',
}

/** Lista de barras ordenada, con un tope opcional de filas. */
function Ranking({ datos, color, numerado, tope, vacio }: {
    datos: { etiqueta?: string; indicativo?: string; n: number }[]
    color?: string; numerado?: boolean; tope?: number; vacio: string
}) {
    const filas = tope ? datos.slice(0, tope) : datos
    if (!filas.length) return <SinDatos texto={vacio} />
    const max = Math.max(...filas.map(d => d.n))
    return (
        <div className="space-y-2.5">
            {filas.map((d, i) => (
                <BarraRanking key={(d.etiqueta || d.indicativo || i) as string}
                              etiqueta={(d.etiqueta || d.indicativo) as string}
                              n={d.n} max={max} color={color} pos={numerado ? i + 1 : undefined} />
            ))}
        </div>
    )
}

export default function EstadisticasPartes({ tipos, anio: anioProp }: {
    tipos: TipoParte[]
    anio?: number
}) {
    const [datos, setDatos] = useState<any>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [anioLocal, setAnioLocal] = useState(new Date().getFullYear())
    const anio = anioProp ?? anioLocal
    const clave = tipos.join(',')

    const cargar = useCallback(async () => {
        setCargando(true); setError(null)
        try {
            const r = await fetch(`/api/partes/estadisticas?year=${anio}&tipos=${clave}`)
            if (!r.ok) throw new Error('No se han podido cargar las estadísticas')
            setDatos(await r.json())
        } catch (e: any) {
            setDatos(null); setError(e.message)
        } finally { setCargando(false) }
    }, [anio, clave])
    useEffect(() => { cargar() }, [cargar])

    if (cargando) {
        return (
            <div className="flex flex-col justify-center items-center py-24">
                <Loader2 className="animate-spin w-8 h-8 text-indigo-500 mb-2" />
                <span className="text-sm text-slate-400">Cargando estadísticas...</span>
            </div>
        )
    }
    if (!datos) {
        return (
            <Panel>
                <p className="text-sm text-slate-500">{error || 'Sin datos.'}</p>
                <button onClick={cargar} className="mt-3 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Reintentar
                </button>
            </Panel>
        )
    }

    const { psi, prf, pas } = datos
    const varios = tipos.length > 1
    const mesesConDatos = datos.porMes.filter((m: any) => m.total > 0)
    const serieMeses = datos.porMes.map((m: any) => ({
        mes: MESES[m.mes], PSI: m.psi, PRF: m.prf, PAS: m.pas,
    }))
    const anios = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i)

    return (
        <div className="space-y-6">
            {/* El selector propio solo aparece si nadie manda el año desde fuera */}
            {anioProp === undefined && (
                <div className="flex justify-end">
                    <select value={anioLocal} onChange={e => setAnioLocal(Number(e.target.value))}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                        {anios.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            )}

            {/* ══════════ CABECERA DE CIFRAS ══════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label={varios ? 'Total de partes' : `Partes ${tipos[0]}`}
                         value={fmtNum(datos.total)} sub={`Año ${datos.anio}`}
                         icon={FileText} color="indigo" />
                {varios && datos.porTipo.map((t: any) => (
                    <KpiCard key={t.tipo} label={t.tipo} value={fmtNum(t.n)} sub={t.etiqueta}
                             icon={t.tipo === 'PSI' ? FileText : t.tipo === 'PRF' ? ClipboardCheck : HeartPulse}
                             color={t.tipo === 'PSI' ? 'orange' : t.tipo === 'PRF' ? 'indigo' : 'teal'} />
                ))}
                {!varios && psi && (<>
                    <KpiCard label="Intervenciones" value={fmtNum(psi.circulacion.find((c: any) => c[0] === 'intervencion')?.[1] || 0)}
                             sub="Resto, preventivos" icon={Activity} color="red" />
                    <KpiCard label="Partes con heridos" value={fmtNum(psi.heridos.partes)}
                             sub={`${fmtNum(psi.heridos.total)} personas registradas`} icon={AlertTriangle} color="amber" />
                    <KpiCard label="Indicativos distintos" value={fmtNum(psi.indicativos.length)}
                             sub="Han intervenido en algún parte" icon={Radio} color="teal" />
                </>)}
                {!varios && prf && (<>
                    <KpiCard label="Casetas revisadas" value={`${fmtNum(prf.casetasRevisadas)} / ${fmtNum(prf.casetasPlan)}`}
                             sub="Del plan de autoprotección" icon={Building2} color="blue" />
                    <KpiCard label="Aforo revisado" value={fmtNum(prf.aforoTotal)}
                             sub={`${fmtNum(prf.modulosTotal)} módulos`} icon={Users} color="teal" />
                    <KpiCard label="Con requerimientos" value={fmtNum(prf.conRequerimientos)}
                             sub="Revisiones que exigen subsanar" icon={AlertTriangle} color="amber" />
                </>)}
                {!varios && pas && (<>
                    <KpiCard label="Personas atendidas" value={fmtNum(pas.pacientes.conSexo || pas.n)}
                             sub={pas.pacientes.edadMedia ? `Edad media ${pas.pacientes.edadMedia} años` : undefined}
                             icon={Users} color="teal" />
                    <KpiCard label="Con constantes tomadas" value={fmtNum(pas.valoracion.conConstantes)}
                             sub={`${fmtNum(pas.valoracion.conGlasgow)} con Glasgow puntuado`} icon={Stethoscope} color="blue" />
                    <KpiCard label="Con lesiones marcadas" value={fmtNum(pas.partesConLesiones)}
                             sub="Señaladas sobre la silueta" icon={AlertTriangle} color="amber" />
                </>)}
            </div>

            {/* ══════════ EVOLUCIÓN MENSUAL ══════════ */}
            <Panel title={`Partes por mes — ${datos.anio}`}>
                {mesesConDatos.length === 0 ? <SinDatos texto={`Sin partes registrados en ${datos.anio}.`} /> : (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={serieMeses}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                            {tipos.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
                            {tipos.map(t => (
                                <Bar key={t} dataKey={t} stackId="p" fill={COLOR_TIPO[t]}
                                     radius={t === tipos[tipos.length - 1] ? [6, 6, 0, 0] : undefined} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Panel>

            {/* ══════════ ESTADO Y, SI PROCEDE, RANKING CONJUNTO ══════════ */}
            <div className={`grid grid-cols-1 ${varios ? 'lg:grid-cols-2' : ''} gap-6`}>
                <Panel title="Estado de los partes">
                    <div className="space-y-4">
                        {datos.porEstado.map(([estado, n]: [string, number]) => (
                            <div key={estado}>
                                <div className="flex justify-between items-center text-sm mb-1.5">
                                    <Badge label={LBL_ESTADO[estado] || estado} variant={VAR_ESTADO[estado] || 'default'} />
                                    <span className="font-bold text-slate-800">{fmtNum(n)}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500"
                                         style={{
                                             width: `${datos.total ? (n / datos.total) * 100 : 0}%`,
                                             backgroundColor: estado === 'completo' ? PALETTE.green : estado === 'pendiente_vb' ? PALETTE.amber : PALETTE.slate,
                                         }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
                {varios && (
                    <Panel title="Indicativos que más intervienen">
                        <Ranking datos={datos.indicativos || []} numerado vacio="Sin equipos registrados" />
                    </Panel>
                )}
            </div>

            {/* ══════════════════════════ PSI ══════════════════════════ */}
            {psi && (
                <>
                    {varios && <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pt-2">Partes PSI · servicio e intervención</h3>}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Panel title="Tipología de los servicios">
                            {psi.tipologias.length === 0 ? <SinDatos texto="Ningún parte tiene tipología marcada" /> : (
                                <>
                                    <div className="space-y-2.5">
                                        {psi.tipologias.map((t: any) => (
                                            <BarraRanking key={t.clave} etiqueta={t.etiqueta} n={t.n}
                                                          max={Math.max(...psi.tipologias.map((x: any) => x.n))}
                                                          color={COLOR_GRUPO[t.grupo] || PALETTE.slate} />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-slate-50">
                                        {Object.entries(LBL_GRUPO).map(([k, label]) => (
                                            <span key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_GRUPO[k] }} /> {label}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Panel>

                        <Panel title="Equipos que intervienen">
                            <Ranking datos={psi.indicativos} numerado tope={12} vacio="Sin equipos registrados" />
                        </Panel>

                        <Panel title="Vehículos movilizados">
                            {psi.vehiculos.length === 0 ? <SinDatos texto="Ningún vehículo registrado" /> : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={psi.vehiculos} dataKey="n" nameKey="indicativo"
                                             cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                                             label={(e: any) => `${e.indicativo} (${e.n})`} labelLine={false}>
                                            {psi.vehiculos.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Panel>

                        <Panel title="Prevención frente a intervención">
                            {psi.circulacion.length === 0 ? <SinDatos texto="Sin clasificar" /> : (
                                <Ranking datos={psi.circulacion.map(([k, n]: [string, number]) => ({ etiqueta: LBL_CIRCULACION[k] || k, n }))}
                                         color={PALETTE.purple} vacio="Sin clasificar" />
                            )}
                        </Panel>

                        <Panel title="Lugares más frecuentes">
                            <Ranking datos={psi.lugares.map(([l, n]: [string, number]) => ({ etiqueta: l, n }))}
                                     color={PALETTE.teal} vacio="Sin lugares registrados" />
                        </Panel>

                        <Panel title="Motivos más repetidos">
                            <Ranking datos={psi.motivos.map(([m, n]: [string, number]) => ({ etiqueta: m, n }))}
                                     color={PALETTE.cyan} vacio="Sin motivos registrados" />
                        </Panel>
                    </div>
                </>
            )}

            {/* ══════════════════════════ PRF ══════════════════════════ */}
            {prf && (
                <>
                    {varios && <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pt-2">Partes PRF · revisión de feria</h3>}
                    {varios && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="Casetas revisadas" value={`${fmtNum(prf.casetasRevisadas)} / ${fmtNum(prf.casetasPlan)}`}
                                     sub="Del plan de autoprotección" icon={Building2} color="blue" />
                            <KpiCard label="Aforo revisado" value={fmtNum(prf.aforoTotal)} sub={`${fmtNum(prf.modulosTotal)} módulos`}
                                     icon={Users} color="teal" />
                            <KpiCard label="Con requerimientos" value={fmtNum(prf.conRequerimientos)}
                                     sub="Revisiones que exigen subsanar" icon={AlertTriangle} color="amber" />
                            <KpiCard label="Incumplimientos" value={fmtNum(prf.incumplimientos.reduce((s: number, i: any) => s + i.n, 0))}
                                     sub="Puntos marcados como «no»" icon={ClipboardCheck} color="red" />
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Panel title="Resultado de las revisiones">
                            {prf.resultados.length === 0 ? <SinDatos texto="Ninguna revisión con resultado" /> : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={prf.resultados.map(([k, n]: [string, number]) => ({ nombre: LBL_RESULTADO[k]?.label || k, n, k }))}
                                             dataKey="n" nameKey="nombre" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                                             label={(e: any) => `${e.n}`} labelLine={false}>
                                            {prf.resultados.map(([k]: [string], i: number) =>
                                                <Cell key={i} fill={LBL_RESULTADO[k]?.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Panel>

                        <Panel title="Revisiones por calle del recinto">
                            <Ranking datos={prf.porCalle.map(([c, n]: [string, number]) => ({ etiqueta: c, n }))}
                                     color={PALETTE.indigo} vacio="Sin casetas identificadas" />
                        </Panel>

                        <Panel title="Incumplimientos detectados" className="lg:col-span-2">
                            <Ranking datos={prf.incumplimientos} color={PALETTE.red}
                                     vacio="Ningún punto de la lista se marcó como «no»" />
                        </Panel>

                        <Panel title="Eficacia de los extintores instalados">
                            {prf.eficaciaAbc.length === 0 && prf.eficaciaCo2.length === 0
                                ? <SinDatos texto="Sin extintores registrados" /> : (
                                    <div className="space-y-5">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Polvo ABC</p>
                                            <Ranking datos={prf.eficaciaAbc.map(([e, n]: [string, number]) => ({ etiqueta: e, n }))}
                                                     color={PALETTE.orange} vacio="Sin datos" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">CO₂</p>
                                            <Ranking datos={prf.eficaciaCo2.map(([e, n]: [string, number]) => ({ etiqueta: e, n }))}
                                                     color={PALETTE.slate} vacio="Sin datos" />
                                        </div>
                                    </div>
                                )}
                        </Panel>

                        <Panel title="Equipos que revisan">
                            <Ranking datos={prf.indicativos} numerado vacio="Sin equipos registrados" />
                        </Panel>

                        <Panel title="Requerimientos anotados" className="lg:col-span-2">
                            <DataTable
                                heads={['Caseta', 'Requerimiento']}
                                rows={prf.requerimientos.map((r: any) => [
                                    r.caseta || '—',
                                    <span key="t" className="text-left block text-slate-600">{r.texto}</span>,
                                ])}
                                empty="Ninguna revisión anotó requerimientos"
                            />
                        </Panel>
                    </div>
                </>
            )}

            {/* ══════════════════════════ PAS ══════════════════════════ */}
            {pas && (
                <>
                    {varios && <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pt-2">Partes PAS · soporte vital básico</h3>}
                    {varios && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="Personas atendidas" value={fmtNum(pas.pacientes.conSexo || pas.n)}
                                     sub={pas.pacientes.edadMedia ? `Edad media ${pas.pacientes.edadMedia} años` : undefined}
                                     icon={Users} color="teal" />
                            <KpiCard label="Hombres" value={fmtNum(pas.pacientes.hombres)} icon={Users} color="blue" />
                            <KpiCard label="Mujeres" value={fmtNum(pas.pacientes.mujeres)} icon={Users} color="purple" />
                            <KpiCard label="Con constantes tomadas" value={fmtNum(pas.valoracion.conConstantes)}
                                     sub={`${fmtNum(pas.valoracion.conGlasgow)} con Glasgow puntuado`} icon={Stethoscope} color="amber" />
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Panel title="Personas atendidas por edad">
                            {pas.pacientes.conEdad === 0 ? <SinDatos texto="Sin edades registradas" /> : (
                                <>
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="text-center py-2.5 rounded-xl bg-blue-50 ring-1 ring-blue-100">
                                            <p className="text-2xl font-black text-blue-700">{fmtNum(pas.pacientes.hombres)}</p>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Hombres</p>
                                        </div>
                                        <div className="text-center py-2.5 rounded-xl bg-purple-50 ring-1 ring-purple-100">
                                            <p className="text-2xl font-black text-purple-700">{fmtNum(pas.pacientes.mujeres)}</p>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Mujeres</p>
                                        </div>
                                        <div className="text-center py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100">
                                            <p className="text-2xl font-black text-slate-700">{pas.pacientes.edadMedia ?? '—'}</p>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Edad media</p>
                                        </div>
                                    </div>
                                    <Ranking datos={pas.pacientes.franjas.map((f: any) => ({ etiqueta: `${f.etiqueta} años`, n: f.n }))}
                                             color={PALETTE.teal} vacio="Sin edades registradas" />
                                </>
                            )}
                        </Panel>

                        <Panel title="Motivos de la asistencia">
                            <Ranking datos={pas.motivos.map(([m, n]: [string, number]) => ({ etiqueta: m, n }))}
                                     color={PALETTE.cyan} vacio="Sin motivos registrados" />
                        </Panel>

                        <Panel title="Hallazgos neurológicos">
                            <Ranking datos={pas.hallazgosNeurologia} color={PALETTE.purple}
                                     vacio="Sin hallazgos registrados" />
                        </Panel>

                        <Panel title="Hallazgos de circulación">
                            <Ranking datos={pas.hallazgosCirculacion} color={PALETTE.red}
                                     vacio="Sin hallazgos registrados" />
                        </Panel>

                        <Panel title="Lesiones señaladas sobre la silueta">
                            <Ranking datos={pas.lesiones} color={PALETTE.amber}
                                     vacio="Ningún parte marcó lesiones" />
                        </Panel>

                        <Panel title="Técnicas empleadas">
                            {[...pas.viaAerea, ...pas.inmovilizacion, ...pas.traslado].length === 0
                                ? <SinDatos texto="Sin técnicas marcadas" /> : (
                                    <div className="space-y-5">
                                        {([
                                            ['Vía aérea', pas.viaAerea, PALETTE.blue],
                                            ['Inmovilización', pas.inmovilizacion, PALETTE.indigo],
                                            ['Posición de traslado', pas.traslado, PALETTE.green],
                                        ] as [string, any[], string][]).filter(([, d]) => d.length > 0).map(([titulo, d, color]) => (
                                            <div key={titulo}>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{titulo}</p>
                                                <Ranking datos={d} color={color} vacio="Sin datos" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </Panel>

                        <Panel title="Equipos que asisten">
                            <Ranking datos={pas.indicativos} numerado vacio="Sin equipos registrados" />
                        </Panel>

                        <Panel title="Lugares de la asistencia">
                            <Ranking datos={pas.lugares.map(([l, n]: [string, number]) => ({ etiqueta: l, n }))}
                                     color={PALETTE.teal} vacio="Sin lugares registrados" />
                        </Panel>
                    </div>
                </>
            )}

            <p className="text-xs text-slate-400 text-center pt-2">
                Datos leídos de la base de datos al abrir la pantalla. No incluye partes archivados.
            </p>
        </div>
    )
}
