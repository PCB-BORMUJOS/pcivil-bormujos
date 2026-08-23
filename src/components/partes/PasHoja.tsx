'use client'

/**
 * Hoja del Parte de Soporte Vital Básico, fiel al modelo oficial.
 *
 * Igual que en el PRF, es a la vez el formulario en pantalla y el origen del
 * PDF. Las coordenadas salen de medir el documento con pdfplumber: A4, margen
 * 6,4 mm, ancho útil 196,8, cabecera de 25,5 mm y pie de 24, y los bloques
 * clavados en la Y donde están en el papel.
 */

import './pas-hoja.css'
import {
    VIA_AEREA, CIRCULACION, RCP_SINO, NEUROLOGIA, INMOVILIZACION, TRASLADO,
    GLASGOW_OCULAR, GLASGOW_VERBAL, GLASGOW_MOTORA, LESIONES, QUEMADURAS,
    PAUTAS_TIEMPO, PUPILAS, totalGlasgow, totalQuemaduras,
    type PasDatos, type MarcaLesion, type ValorSiNo,
} from '@/lib/pas-campos'

export type PasHojaProps = {
    datos: PasDatos
    marcas?: MarcaLesion[]
    editable?: boolean
    /** Lesión seleccionada en la tabla; al tocar una figura se coloca esta. */
    lesionActiva?: number
    /** Indicativos del servicio, para los desplegables de equipo. */
    indicativos?: string[]
    onCampo?: (campo: keyof PasDatos, valor: any) => void
    onMarcas?: (marcas: MarcaLesion[]) => void
    onLesionActiva?: (n: number) => void
}

// ── Piezas comunes ───────────────────────────────────────────────────────────

const Bloque = ({ y, x, w, children }: { y: string; x?: string; w?: string; children: React.ReactNode }) => (
    <div className={`pas-en${x ? ' col' : ''}`}
         style={{ ['--y' as any]: y, ...(x ? { ['--x' as any]: x, ['--w' as any]: w } : {}) }}>
        {children}
    </div>
)

const Sec = ({ children }: { children: React.ReactNode }) => <div className="pas-sec">{children}</div>

function Campo({ etq, valor, onChange, editable, tipo = 'text', centrado }: {
    etq?: string; valor: string; onChange?: (v: string) => void
    editable?: boolean; tipo?: string; centrado?: boolean
}) {
    return (
        <div style={{ flex: 1, minWidth: 0 }}>
            {etq && <label className="pas-etq">{etq}</label>}
            <input type={tipo} className={`pas-campo${centrado ? ' pas-centrado' : ''}`}
                   value={valor || ''} readOnly={!editable && tipo === 'text'} disabled={!editable && tipo !== 'text'}
                   onChange={e => onChange?.(e.target.value)} />
        </div>
    )
}

function Casilla({ marcada, onClick, editable }: { marcada: boolean; onClick?: () => void; editable?: boolean }) {
    return (
        <button type="button" className="pas-casilla" data-marcada={marcada} aria-pressed={marcada}
                onClick={editable ? onClick : undefined} disabled={!editable} tabIndex={editable ? 0 : -1} />
    )
}

/** Lista de ítems con una sola casilla por fila (vía aérea, inmovilización…). */
function ListaSimple({ items, checks, onCambio, editable }: {
    items: { key: string; label: string }[]
    checks: Record<string, boolean>
    onCambio?: (key: string, v: boolean) => void
    editable?: boolean
}) {
    return (
        <table className="pas-lista">
            <tbody>
                {items.map(it => (
                    <tr key={it.key}>
                        <td>{it.label}</td>
                        <td className="marca">
                            <Casilla marcada={!!checks[it.key]} editable={editable}
                                     onClick={() => onCambio?.(it.key, !checks[it.key])} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

/** Lista con dos columnas de casillas: la 1ª y la 2ª valoración. */
function ListaDoble({ items, dobles, onCambio, editable }: {
    items: { key: string; label: string }[]
    dobles: Record<string, ValorSiNo>
    onCambio?: (key: string, v: ValorSiNo) => void
    editable?: boolean
}) {
    return (
        <table className="pas-lista">
            <tbody>
                {items.map(it => (
                    <tr key={it.key}>
                        <td>{it.label}</td>
                        {['_1', '_2'].map(suf => (
                            <td className="marca" key={suf}>
                                <Casilla marcada={dobles[it.key + suf] === 'si'} editable={editable}
                                         onClick={() => onCambio?.(it.key + suf, dobles[it.key + suf] === 'si' ? '' : 'si')} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// ── Hoja ─────────────────────────────────────────────────────────────────────

export default function PasHoja({
    datos: d, marcas = [], editable = false, lesionActiva = 1, indicativos = [],
    onCampo, onMarcas, onLesionActiva,
}: PasHojaProps) {
    const set = (k: keyof PasDatos) => (v: any) => onCampo?.(k, v)
    const checks = d.checks || {}
    const dobles = d.dobles || {}
    const sino = d.sino || {}

    const marcarCheck = (key: string, v: boolean) => onCampo?.('checks', { ...checks, [key]: v })
    const marcarDoble = (key: string, v: ValorSiNo) => onCampo?.('dobles', { ...dobles, [key]: v })
    const marcarSiNo = (key: string, v: ValorSiNo) => onCampo?.('sino', { ...sino, [key]: v })

    /** Coloca la lesión activa en el punto tocado de la figura. */
    const tocarFigura = (figura: number) => (e: React.MouseEvent<HTMLDivElement>) => {
        if (!editable) return
        const r = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - r.left) / r.width) * 100
        const y = ((e.clientY - r.top) / r.height) * 100
        onMarcas?.([...marcas, { figura, x, y, codigo: lesionActiva }])
    }
    const quitarMarca = (i: number) => (e: React.MouseEvent) => {
        e.stopPropagation()
        if (editable) onMarcas?.(marcas.filter((_, j) => j !== i))
    }

    const figura = (n: number, src: string) => (
        <div className={`pas-figura ${n === 0 ? 'frontal' : 'lateral'}${editable ? ' editable' : ''}`}
             onClick={tocarFigura(n)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={n === 0 ? 'Figura frontal y dorsal' : 'Figura frontal y dorsal'} />
            {marcas.map((m, i) => m.figura === n && (
                <span key={i} className={`pas-marca${editable ? ' quitar' : ''}`}
                      style={{ left: `${m.x}%`, top: `${m.y}%` }}
                      onClick={quitarMarca(i)} title={editable ? 'Pulsa para quitar' : undefined}>
                    {m.codigo}
                </span>
            ))}
        </div>
    )

    return (
        <div className="pas pas-lienzo">
            <section className="pas-hoja">
                <header className="pas-cab">
                    <span className="pas-cab-sigla">PAS</span>
                    <span className="pas-cab-titulo">Parte de<br />Soporte Vital Básico</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-pc-blanco.png" alt="Protección Civil Bormujos" className="pas-cab-logo" />
                </header>

                <div className="pas-cuerpo">
                    {/* ── Cabecera de datos y pautas de tiempo ── */}
                    <Bloque y="28.5mm" x="0mm" w="122mm">
                        <div style={{ display: 'flex', gap: '2mm' }}>
                            <Campo etq="Fecha" valor={d.fecha} onChange={set('fecha')} editable={editable} tipo="date" centrado />
                            <Campo etq="Hora" valor={d.hora} onChange={set('hora')} editable={editable} tipo="time" centrado />
                            <Campo etq="Nº informe" valor={d.numeroInforme} onChange={set('numeroInforme')} editable={editable} />
                        </div>
                        <div className="pas-fila" style={{ marginTop: '1.4mm' }}>
                            <label className="pas-etq" style={{ width: '15mm' }}>Lugar</label>
                            <input className="pas-campo campo" value={d.lugar} readOnly={!editable}
                                   onChange={e => set('lugar')(e.target.value)} />
                        </div>
                        <div className="pas-fila" style={{ marginTop: '1.1mm' }}>
                            <label className="pas-etq" style={{ width: '15mm' }}>Motivo</label>
                            <input className="pas-campo campo" value={d.motivo} readOnly={!editable}
                                   onChange={e => set('motivo')(e.target.value)} />
                        </div>
                        <div className="pas-fila" style={{ marginTop: '1.1mm' }}>
                            <label className="pas-etq" style={{ width: '15mm' }}>Alertante</label>
                            <input className="pas-campo campo" value={d.alertante} readOnly={!editable}
                                   onChange={e => set('alertante')(e.target.value)} />
                        </div>
                    </Bloque>

                    <Bloque y="28.5mm" x="124.5mm" w="72.3mm">
                        <div style={{ display: 'grid', gridTemplateColumns: '21mm 21mm 1fr', gap: '0 1.4mm' }}>
                            <div>
                                <Sec>Vehículos</Sec>
                                {d.vehiculos.map((v, i) => (
                                    <select key={i} className="pas-campo pas-centrado" style={{ marginTop: '.35mm', height: '3.3mm' }}
                                            value={v} disabled={!editable}
                                            onChange={e => { const n = [...d.vehiculos]; n[i] = e.target.value; onCampo?.('vehiculos', n) }}>
                                        <option value="">—</option>
                                        {['UMJ', 'VIR', 'FSV', 'PMA'].map(x => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                ))}
                            </div>
                            <div>
                                <Sec>Equipo</Sec>
                                {d.equipo.map((v, i) => (
                                    <select key={i} className="pas-campo pas-centrado" style={{ marginTop: '.35mm', height: '3.3mm' }}
                                            value={v} disabled={!editable}
                                            onChange={e => { const n = [...d.equipo]; n[i] = e.target.value; onCampo?.('equipo', n) }}>
                                        <option value="">—</option>
                                        {indicativos.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                                    </select>
                                ))}
                            </div>
                            <div>
                                <Sec>Pautas de tiempo</Sec>
                                {PAUTAS_TIEMPO.map(p => (
                                    <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '1mm', marginTop: '.35mm' }}>
                                        <span style={{ flex: '0 0 12mm', fontSize: '5.4pt', textAlign: 'right', textTransform: 'uppercase' }}>{p.label}</span>
                                        <input type="time" className="pas-campo pas-centrado" style={{ flex: 1, minWidth: 0, height: '3.1mm', fontSize: '6pt' }}
                                               value={(d as any)[p.key] || ''} disabled={!editable}
                                               onChange={e => onCampo?.(p.key as keyof PasDatos, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Bloque>

                    {/* ── Filiación del paciente ── */}
                    <Bloque y="50mm">
                        <div style={{ display: 'flex', gap: '2mm' }}>
                            <Campo etq="Nombre" valor={d.nombre} onChange={set('nombre')} editable={editable} />
                            <Campo etq="Apellidos" valor={d.apellidos} onChange={set('apellidos')} editable={editable} />
                            <div style={{ width: '18mm' }}>
                                <Campo etq="Edad" valor={d.edad} onChange={set('edad')} editable={editable} centrado />
                            </div>
                            {/* Sexo se alinea con Edad —etiqueta arriba, contenido abajo— y
                                aprovecha el hueco de la derecha para separar y centrar H y M. */}
                            <div style={{ width: '30mm' }}>
                                <label className="pas-etq" style={{ textAlign: 'center' }}>Sexo</label>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5mm',
                                              height: '3.4mm', alignItems: 'center' }}>
                                    {(['H', 'M'] as const).map(s => (
                                        <span className="pas-opcion" key={s} style={{ fontSize: '7.1pt', gap: '1.4mm' }}>
                                            <Casilla marcada={d.sexo === s} editable={editable}
                                                     onClick={() => onCampo?.('sexo', d.sexo === s ? '' : s)} />
                                            <b>{s}</b>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2mm', marginTop: '1.6mm' }}>
                            <Campo etq="Domicilio" valor={d.domicilio} onChange={set('domicilio')} editable={editable} />
                            {([['Nº', 'numero'], ['Bq', 'bloque'], ['Piso', 'piso'], ['Puerta', 'puerta'], ['Letra', 'letra'], ['CP', 'cp']] as const).map(([et, k]) => (
                                <div key={k} style={{ width: '13mm' }}>
                                    <Campo etq={et} valor={(d as any)[k]} onChange={v => onCampo?.(k as keyof PasDatos, v)} editable={editable} centrado />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '2mm', marginTop: '1.6mm' }}>
                            <Campo etq="Localidad" valor={d.localidad} onChange={set('localidad')} editable={editable} />
                            <Campo etq="Provincia" valor={d.provincia} onChange={set('provincia')} editable={editable} />
                            <Campo etq="DNI / NIE" valor={d.dniNie} onChange={set('dniNie')} editable={editable} />
                            <Campo etq="Teléfono" valor={d.telefono} onChange={set('telefono')} editable={editable} />
                        </div>
                    </Bloque>

                    {/* ── Constantes: dos tandas ── */}
                    <Bloque y="74mm" x="0mm" w="178mm">
                        <table className="pas-lista" style={{ border: '.25mm solid var(--regla)' }}>
                            <thead>
                                <tr style={{ background: 'var(--campo)' }}>
                                    {['', 'Hora', 'FR', 'FC', 'TA', 'Resp.', 'O₂ L/min', 'FiO₂', 'Sat.', 'Gluc.', 'GCS', 'Pupila I', 'Pupila D', 'React.'].map(h => (
                                        <th key={h} style={{ fontSize: '6pt', padding: '.8mm .4mm', textTransform: 'uppercase', color: 'var(--etiqueta)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[0, 1].map(i => {
                                    const c = d.constantes[i]
                                    const act = (campo: string, v: any) => {
                                        const n = d.constantes.map((x, j) => j === i ? { ...x, [campo]: v } : x)
                                        onCampo?.('constantes', n)
                                    }
                                    const total = totalGlasgow(c.glasgowO, c.glasgowV, c.glasgowM)
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 700, textAlign: 'center', width: '7mm' }}>{i + 1}ª</td>
                                            <td><input type="time" className="pas-campo pas-centrado" style={{ height: '5.4mm', fontSize: '6.7pt' }} value={c.hora} disabled={!editable} onChange={e => act('hora', e.target.value)} /></td>
                                            {(['fr', 'fc', 'ta'] as const).map(k => (
                                                <td key={k}><input className="pas-campo pas-centrado" style={{ height: '5.4mm', fontSize: '7.1pt' }} value={c[k]} readOnly={!editable} onChange={e => act(k, e.target.value)} /></td>
                                            ))}
                                            <td>
                                                <select className="pas-campo pas-centrado" style={{ height: '5.4mm', fontSize: '6.7pt' }} value={c.respiracion} disabled={!editable} onChange={e => act('respiracion', e.target.value)}>
                                                    <option value="">—</option>
                                                    <option value="norm">Norm</option>
                                                    <option value="ansi">Ansi</option>
                                                    <option value="asin">Asin</option>
                                                </select>
                                            </td>
                                            {(['oxiLmin', 'oxiFio2', 'saturacion', 'glucosa'] as const).map(k => (
                                                <td key={k}><input className="pas-campo pas-centrado" style={{ height: '5.4mm', fontSize: '7.1pt' }} value={c[k]} readOnly={!editable} onChange={e => act(k, e.target.value)} /></td>
                                            ))}
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{total ?? '—'}</td>
                                            {/* El modelo valora cada ojo por separado */}
                                            {(['pupilaI', 'pupilaD'] as const).map(ojo => (
                                                <td key={ojo}>
                                                    <select className="pas-campo pas-centrado" style={{ height: '5.4mm', fontSize: '6.7pt' }}
                                                            value={(c as any)[ojo]} disabled={!editable} onChange={e => act(ojo, e.target.value)}>
                                                        <option value="">—</option>
                                                        {PUPILAS.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                                                    </select>
                                                </td>
                                            ))}
                                            <td>
                                                <select className="pas-campo pas-centrado" style={{ height: '5.4mm', fontSize: '6.7pt' }}
                                                        value={c.reactivas} disabled={!editable} onChange={e => act('reactivas', e.target.value)}>
                                                    <option value="">—</option>
                                                    <option value="si">Sí</option>
                                                    <option value="no">No</option>
                                                </select>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </Bloque>

                    <Bloque y="74mm" x="179.5mm" w="17.3mm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {/* Se limita por el alto: hay 23 mm hasta el bloque de traslado,
                            y a ancho completo la leyenda medía 33 y se metía dentro. */}
                        <img src="/images/pas-pupilas.png" alt="Ejemplos de pupila"
                             style={{ height: '22mm', width: 'auto', maxWidth: '100%', display: 'block', marginLeft: 'auto' }} />
                    </Bloque>

                    {/* ── Los seis bloques de exploración, en la misma fila del modelo ── */}
                    <Bloque y="98.5mm" x="0mm" w="30mm">
                        <Sec>Vía aérea</Sec>
                        <div className="pas-caja"><ListaSimple items={VIA_AEREA} checks={checks} onCambio={marcarCheck} editable={editable} /></div>
                    </Bloque>

                    <Bloque y="98.5mm" x="31.5mm" w="45mm">
                        <Sec>Circulación · 1ª 2ª</Sec>
                        <div className="pas-caja">
                            {CIRCULACION.map(g => (
                                <div key={g.grupo}>
                                    <div style={{ fontSize: '5pt', fontWeight: 700, color: 'var(--etiqueta)', textTransform: 'uppercase', lineHeight: 1.1 }}>{g.grupo}</div>
                                    <ListaDoble items={g.items} dobles={dobles} onCambio={marcarDoble} editable={editable} />
                                </div>
                            ))}
                        </div>
                    </Bloque>

                    <Bloque y="98.5mm" x="78mm" w="37mm">
                        <Sec>RCP</Sec>
                        <div className="pas-caja">
                            {RCP_SINO.map(it => (
                                <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: '1mm', fontSize: '6.3pt', marginBottom: '.4mm' }}>
                                    <span style={{ flex: 1 }}>{it.label}</span>
                                    {(['si', 'no'] as const).map(v => (
                                        <span className="pas-opcion" key={v}>
                                            <Casilla marcada={sino[it.key] === v} editable={editable}
                                                     onClick={() => marcarSiNo(it.key, sino[it.key] === v ? '' : v)} />
                                            {v === 'si' ? 'Sí' : 'No'}
                                        </span>
                                    ))}
                                </div>
                            ))}
                            {([['Nº de descargas', 'rcpDescargas'], ['Tiempo RCP SVB min.', 'rcpTiempoSvb'],
                               ['Hora recuperación / pulso', 'rcpHoraRecuperacion'], ['Hora inicio RCP SVA', 'rcpHoraInicioSva']] as const).map(([et, k]) => (
                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '1mm', marginTop: '.5mm' }}>
                                    <span style={{ flex: 1, fontSize: '6.3pt' }}>{et}</span>
                                    <input className="pas-campo pas-centrado" style={{ width: '13mm', height: '3.6mm' }}
                                           value={(d as any)[k] || ''} readOnly={!editable}
                                           onChange={e => onCampo?.(k as keyof PasDatos, e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </Bloque>

                    <Bloque y="98.5mm" x="116.5mm" w="42mm">
                        <Sec>Neurología · 1ª 2ª</Sec>
                        <div className="pas-caja"><ListaDoble items={NEUROLOGIA} dobles={dobles} onCambio={marcarDoble} editable={editable} /></div>
                    </Bloque>

                    <Bloque y="98.5mm" x="159.5mm" w="18mm">
                        <Sec>Inmovil.</Sec>
                        <div className="pas-caja"><ListaSimple items={INMOVILIZACION} checks={checks} onCambio={marcarCheck} editable={editable} /></div>
                    </Bloque>

                    <Bloque y="98.5mm" x="178.5mm" w="18.3mm">
                        <Sec>Traslado</Sec>
                        <div className="pas-caja"><ListaSimple items={TRASLADO} checks={checks} onCambio={marcarCheck} editable={editable} /></div>
                    </Bloque>

                    {/* ── Glasgow y figuras anatómicas ── */}
                    <Bloque y="133.4mm" x="0mm" w="88.9mm">
                        <Sec>Escala de coma de Glasgow</Sec>
                        <div className="pas-caja" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1.4mm' }}>
                            {([['Ocular', GLASGOW_OCULAR, 'glasgowO'], ['Verbal', GLASGOW_VERBAL, 'glasgowV'], ['Motora', GLASGOW_MOTORA, 'glasgowM']] as const).map(([tit, escala, campo]) => (
                                <div key={tit}>
                                    <div style={{ fontSize: '6pt', fontWeight: 700, color: 'var(--etiqueta)', textTransform: 'uppercase' }}>{tit}</div>
                                    {escala.map(o => {
                                        const sel = d.constantes[0][campo] === o.p
                                        return (
                                            <div key={o.p} style={{ display: 'flex', alignItems: 'center', gap: '1mm', fontSize: '6pt' }}>
                                                <Casilla marcada={sel} editable={editable}
                                                         onClick={() => onCampo?.('constantes', d.constantes.map((c, j) => j === 0 ? { ...c, [campo]: sel ? 0 : o.p } : c))} />
                                                <b>{o.p}</b> {o.label}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center',
                                          justifyContent: 'flex-end', gap: '1.4mm', marginTop: '.6mm' }}>
                                <span style={{ fontSize: '5.6pt', fontWeight: 700, textTransform: 'uppercase', color: 'var(--etiqueta)' }}>Total</span>
                                <span style={{ fontSize: '7.1pt', fontWeight: 800, color: 'var(--azul)' }}>
                                    {totalGlasgow(d.constantes[0].glasgowO, d.constantes[0].glasgowV, d.constantes[0].glasgowM) ?? '—'} / 15
                                </span>
                            </div>
                        </div>
                    </Bloque>

                    <Bloque y="133.4mm" x="91mm" w="105.8mm">
                        <div className="pas-figuras">
                            {figura(0, '/images/pas-figuras-frontal.png')}
                            {figura(1, '/images/pas-figuras-lateral.png')}
                        </div>
                    </Bloque>

                    {/* ── Quemaduras y tabla de lesiones ── */}
                    <Bloque y="165.5mm" x="0mm" w="42mm">
                        <Sec>Tabla de quemaduras %</Sec>
                        <div className="pas-caja">
                            <table className="pas-lista">
                                <thead>
                                    <tr>
                                        <th style={{ fontSize: '5.6pt', textAlign: 'left' }}>Zona</th>
                                        <th style={{ fontSize: '5.6pt' }}>Niños</th>
                                        <th style={{ fontSize: '5.6pt' }}>Adultos</th>
                                        <th style={{ fontSize: '5.6pt' }}>✓</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {QUEMADURAS.map(q => (
                                        <tr key={q.zona}>
                                            <td>{q.zona}</td>
                                            <td className="marca">{q.ninios}</td>
                                            <td className="marca">{q.adultos}</td>
                                            <td className="marca">
                                                <Casilla marcada={d.quemadurasZonas.includes(q.zona)} editable={editable}
                                                         onClick={() => onCampo?.('quemadurasZonas',
                                                             d.quemadurasZonas.includes(q.zona)
                                                                 ? d.quemadurasZonas.filter(z => z !== q.zona)
                                                                 : [...d.quemadurasZonas, q.zona])} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.4mm', marginTop: '.5mm' }}>
                                <select className="pas-campo pas-centrado" style={{ width: '17mm', height: '3.2mm', fontSize: '5.6pt' }}
                                        value={d.quemadurasEdad} disabled={!editable}
                                        onChange={e => onCampo?.('quemadurasEdad', e.target.value)}>
                                    <option value="adultos">Adultos</option>
                                    <option value="ninios">Niños</option>
                                </select>
                                <span style={{ fontSize: '5.6pt', fontWeight: 700, textTransform: 'uppercase', color: 'var(--etiqueta)', marginLeft: 'auto' }}>Total</span>
                                <span style={{ fontSize: '8pt', fontWeight: 800, color: 'var(--azul)' }}>
                                    {totalQuemaduras(d.quemadurasZonas, d.quemadurasEdad)} %
                                </span>
                            </div>
                        </div>
                    </Bloque>

                    <Bloque y="165.5mm" x="43.5mm" w="45mm">
                        <Sec>Lesiones</Sec>
                        <div className="pas-caja">
                            {/* Al elegir una lesión y tocar la figura, el número queda dibujado
                                sobre el cuerpo, como se hace en el papel. */}
                            {LESIONES.map(l => (
                                <div key={l.n}
                                     onClick={() => editable && onLesionActiva?.(l.n)}
                                     style={{
                                         display: 'flex', gap: '1.4mm', fontSize: '6.3pt', alignItems: 'center',
                                         cursor: editable ? 'pointer' : 'default',
                                         background: editable && lesionActiva === l.n ? '#FFE4E1' : undefined,
                                         fontWeight: editable && lesionActiva === l.n ? 700 : 400,
                                     }}>
                                    <span style={{ width: '4mm', textAlign: 'right', fontWeight: 700 }}>{l.n}</span>
                                    {l.label}
                                </div>
                            ))}
                        </div>
                    </Bloque>

                    {/* ── Textos libres ── */}
                    <Bloque y="213.1mm" x="0mm" w="97.5mm">
                        <Sec>Antecedentes / alergias</Sec>
                        <textarea className="pas-campo" style={{ height: '7.4mm' }} value={d.antecedentes}
                                  readOnly={!editable} onChange={e => set('antecedentes')(e.target.value)} />
                    </Bloque>
                    <Bloque y="213.1mm" x="99.3mm" w="97.5mm">
                        <Sec>Demandas del paciente</Sec>
                        <textarea className="pas-campo" style={{ height: '7.4mm' }} value={d.demandas}
                                  readOnly={!editable} onChange={e => set('demandas')(e.target.value)} />
                    </Bloque>

                    <Bloque y="225.8mm">
                        <Sec>Observaciones de la intervención</Sec>
                        <textarea className="pas-campo" style={{ height: '8mm' }} value={d.observaciones}
                                  readOnly={!editable} onChange={e => set('observaciones')(e.target.value)} />
                    </Bloque>

                    {/* ── Accidentes de tráfico ── */}
                    <Bloque y="238.8mm">
                        <Sec>Accidentes de tráfico</Sec>
                        <div className="pas-caja">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
                                <span style={{ fontSize: '5.2pt', whiteSpace: 'nowrap', flex: '0 0 auto' }}>Matrícula vehículos implicados</span>
                                {d.matriculas.map((m, i) => (
                                    <input key={i} className="pas-campo pas-centrado" style={{ height: '4.2mm' }}
                                           value={m} readOnly={!editable}
                                           onChange={e => { const n = [...d.matriculas]; n[i] = e.target.value; onCampo?.('matriculas', n) }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginTop: '1.4mm' }}>
                                <span style={{ fontSize: '5.2pt', whiteSpace: 'nowrap', flex: '0 0 auto' }}>Agentes de la autoridad que intervienen</span>
                                <span style={{ fontSize: '5.2pt', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Policía Local de</span>
                                <input className="pas-campo" style={{ height: '4.2mm' }} value={d.policiaLocalDe}
                                       readOnly={!editable} onChange={e => set('policiaLocalDe')(e.target.value)} />
                                <span style={{ fontSize: '5.2pt', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Guardia Civil de</span>
                                <input className="pas-campo" style={{ height: '4.2mm' }} value={d.guardiaCivilDe}
                                       readOnly={!editable} onChange={e => set('guardiaCivilDe')(e.target.value)} />
                            </div>
                        </div>
                    </Bloque>

                    {/* ── Renuncia, indicativos y Vº Bº ── */}
                    <Bloque y="254.4mm" x="0mm" w="107.9mm">
                        <Sec>Renuncia del paciente</Sec>
                        <div className="pas-caja" style={{ fontSize: '5.2pt', lineHeight: 1.25 }}>
                            <div style={{ display: 'flex', gap: '1.4mm' }}>
                                <Casilla marcada={d.renunciaSinTraslado} editable={editable}
                                         onClick={() => onCampo?.('renunciaSinTraslado', !d.renunciaSinTraslado)} />
                                <span><b>Asistencia sin traslado.</b> Usted ha sido atendido e informado por este equipo de SVB
                                    y no desea ser trasladado a un centro sanitario en este momento.
                                    <b> En caso de empeoramiento llame al 112</b></span>
                            </div>
                            <div style={{ display: 'flex', gap: '1.4mm', marginTop: '.6mm', alignItems: 'center' }}>
                                <Casilla marcada={d.renunciaSinAsistencia} editable={editable}
                                         onClick={() => onCampo?.('renunciaSinAsistencia', !d.renunciaSinAsistencia)} />
                                <span style={{ width: '24mm' }}><b>No desea asistencia.</b></span>
                                <div style={{ flex: 1 }}>
                                    {([['testigo1', 'Testigo · nombre y DNI'], ['testigo2', 'Testigo · nombre y DNI']] as const).map(([k, et]) => (
                                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '1mm', marginBottom: '.4mm' }}>
                                            <span style={{ fontSize: '5pt', width: '24mm', textTransform: 'uppercase' }}>{et}</span>
                                            <input className="pas-campo" style={{ height: '3.1mm' }} value={(d as any)[k]}
                                                   readOnly={!editable} onChange={e => onCampo?.(k as keyof PasDatos, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Bloque>

                    <Bloque y="254.4mm" x="109.5mm" w="43mm">
                        <Sec>Indicativos que intervienen</Sec>
                        <div className="pas-caja">
                            {/* Cuatro huecos, en dos filas de dos. Ofrecen primero los
                                indicativos ya puestos en «Equipo», que son los que han
                                intervenido, y despues el resto del servicio. */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6mm' }}>
                                {d.indicativosIntervienen.map((v, i) => {
                                    const delEquipo = d.equipo.filter(Boolean)
                                    const resto = indicativos.filter(x => !delEquipo.includes(x))
                                    return (
                                        <select key={i} className="pas-campo pas-centrado" style={{ height: '3.4mm' }}
                                                value={v} disabled={!editable}
                                                onChange={e => { const n = [...d.indicativosIntervienen]; n[i] = e.target.value; onCampo?.('indicativosIntervienen', n) }}>
                                            <option value="">—</option>
                                            {delEquipo.map(x => <option key={'e' + x} value={x}>{x}</option>)}
                                            {resto.map(x => <option key={x} value={x}>{x}</option>)}
                                        </select>
                                    )
                                })}
                            </div>
                        </div>
                    </Bloque>

                    {/* Firman los dos indicativos que intervienen y el Jefe de Servicio */}
                    <Bloque y="254.4mm" x="154mm" w="42.8mm">
                        <Sec>Firmas</Sec>
                        <div className="pas-caja" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.8mm' }}>
                            {([['firmaInd1', d.indicativosIntervienen[0] || 'Indicativo 1'],
                               ['firmaInd2', d.indicativosIntervienen[1] || 'Indicativo 2'],
                               ['firmaJefe', 'Vº Bº ' + (d.indicativosIntervienen.includes('J-44') ? 'J-44' : 'Jefe')]] as const).map(([campo, pie]) => (
                                <div key={campo}>
                                    <div style={{ height: '9mm', border: '.25mm solid var(--regla)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(d as any)[campo]
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            ? <img src={(d as any)[campo]} alt={`Firma ${pie}`} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                            : null}
                                    </div>
                                    <div style={{ fontSize: '5pt', textAlign: 'center', color: 'var(--etiqueta)',
                                                  textTransform: 'uppercase', marginTop: '.3mm' }}>{pie}</div>
                                </div>
                            ))}
                        </div>
                    </Bloque>
                </div>

                <footer className="pas-pie">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-ayuntamiento.png" alt="Ayuntamiento de Bormujos" className="pas-pie-logo" />
                    <div className="pas-pie-centro">
                        <div>Servicio de Protección Civil</div>
                        <div>Ayuntamiento de Bormujos (Sevilla)</div>
                        <div>Calle Maestro Francisco Rodríguez | Avda Universidad de Salamanca</div>
                        <div>info.pcivil@bormujos.net | www.proteccioncivilbormujos.es</div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-pc-blanco.png" alt="Protección Civil Bormujos" className="pas-pie-logo der" />
                </footer>
            </section>
        </div>
    )
}
