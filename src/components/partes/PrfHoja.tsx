'use client'

/**
 * Hoja del Parte de Revisión de Feria, fiel al modelo oficial.
 *
 * Es a la vez el formulario en pantalla y el origen del PDF: al imprimir se
 * ocultan los adornos de edición y queda el documento. De este modo lo que se
 * rellena y lo que se exporta son literalmente lo mismo y no pueden divergir.
 *
 * Las medidas no están puestas a ojo: salen de medir el PDF oficial con
 * pdfplumber (A4, margen 7,4 mm, ancho útil 195,1 mm, barras de 5 mm, bandas
 * de 21,7 y 19,6 mm) y la paleta y los cuerpos, de sus propios objetos.
 */

import './prf-hoja.css'
import {
    EXTINTOR_ABC_CHECKS, EXTINTOR_CO2_CHECKS, GAS_IZQ, GAS_DER, DOC_IZQ, DOC_DER,
    ELECTRICA, EVACUACION, type ItemCheck, type ValorCheck, type PrfDatos,
} from '@/lib/prf-campos'

type Fotos = Record<string, string[]>

export type PrfHojaProps = {
    datos: PrfDatos
    numeroParte?: string
    fotos?: Fotos
    /** Sin editar, la hoja se comporta como documento (vista previa e impresión). */
    editable?: boolean
    onCampo?: (campo: keyof PrfDatos, valor: any) => void
    onCheck?: (key: string, valor: ValorCheck) => void
}

// ── Piezas comunes ───────────────────────────────────────────────────────────

function Cabecera() {
    return (
        <header className="prf-cab">
            <span className="prf-cab-sigla">PRF</span>
            <span className="prf-cab-titulo">Parte de<br />Revisión Feria</span>
            <div className="prf-cab-marca">
                <div className="prf-iso" aria-hidden="true">
                    <i className="v" /><i className="n" /><i className="v" />
                    <i className="n" /><i className="n" /><i className="b" />
                </div>
                <div className="prf-cab-marca-txt">
                    <div className="l1">Protección Civil</div>
                    <div className="l2">Bormujos</div>
                </div>
            </div>
        </header>
    )
}

function Pie() {
    return (
        <footer className="prf-pie">
            <div className="prf-iso" aria-hidden="true" style={{ opacity: .95 }}>
                <i className="b" /><i className="v" /><i className="v" />
                <i className="v" /><i className="b" /><i className="v" />
            </div>
            <div className="prf-pie-centro">
                <div>Servicio de Protección Civil</div>
                <div>Ayuntamiento de Bormujos (Sevilla)</div>
                <div className="fina">Calle Maestro Francisco Rodríguez | Avda Universidad de Salamanca</div>
                <div className="fina">info.pcivil@bormujos.net | www.proteccioncivilbormujos.es</div>
            </div>
            <div className="prf-cab-marca">
                <div className="prf-iso" aria-hidden="true">
                    <i className="b" /><i className="v" /><i className="b" />
                    <i className="v" /><i className="b" /><i className="v" />
                </div>
                <div className="prf-cab-marca-txt">
                    <div className="l1">Protección Civil</div>
                    <div className="l2">Bormujos</div>
                </div>
            </div>
        </footer>
    )
}

function Seccion({ num, titulo, ref_, naranja }: { num: string; titulo: string; ref_?: string; naranja?: boolean }) {
    return (
        <div className={`prf-sec${naranja ? ' naranja' : ''}`}>
            <span className="num">{num}</span>
            <span className="tit">{titulo}</span>
            {ref_ && <span className="ref">{ref_}</span>}
        </div>
    )
}

function Campo({
    etq, valor, onChange, editable, ancho, color,
}: {
    etq: string; valor: string; onChange?: (v: string) => void
    editable?: boolean; ancho?: string; color?: 'azul' | 'naranja'
}) {
    return (
        <div style={ancho ? { width: ancho } : undefined}>
            <label className="prf-etq">{etq}</label>
            <input
                className={`prf-campo${color ? ' ' + color : ''}`}
                value={valor || ''} readOnly={!editable}
                onChange={e => onChange?.(e.target.value)}
            />
        </div>
    )
}

function Casilla({
    marcada, onClick, editable, naranja,
}: { marcada: boolean; onClick?: () => void; editable?: boolean; naranja?: boolean }) {
    return (
        <button
            type="button" className={`prf-casilla${naranja ? ' naranja' : ''}`}
            data-marcada={marcada} aria-pressed={marcada}
            onClick={editable ? onClick : undefined} disabled={!editable} tabIndex={editable ? 0 : -1}
        />
    )
}

/** Tabla de ítems con las tres columnas SÍ / NO / N.A. del modelo. */
function Checks({
    items, checks, onCheck, editable,
}: { items: ItemCheck[]; checks: Record<string, ValorCheck>; onCheck?: (k: string, v: ValorCheck) => void; editable?: boolean }) {
    return (
        <table className="prf-checks">
            <thead>
                <tr>
                    <th style={{ width: 'auto' }} />
                    <th>Sí</th><th>No</th><th>N.A.</th>
                </tr>
            </thead>
            <tbody>
                {items.map(it => (
                    <tr key={it.key}>
                        <td>{it.label}</td>
                        {(['si', 'no', 'na'] as ValorCheck[]).map(v => (
                            <td className="marca" key={v}>
                                <Casilla
                                    marcada={checks[it.key] === v} editable={editable}
                                    onClick={() => onCheck?.(it.key, checks[it.key] === v ? '' : v)}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// ── Hoja ─────────────────────────────────────────────────────────────────────

export default function PrfHoja({ datos, numeroParte, fotos = {}, editable = false, onCampo, onCheck }: PrfHojaProps) {
    const d = datos
    const set = (k: keyof PrfDatos) => (v: string) => onCampo?.(k, v)
    const ch = d.checks || {}

    return (
        <div className="prf prf-lienzo">
            {/* ══ PÁGINA 1 ══ */}
            <section className="prf-hoja">
                <Cabecera />
                <div className="prf-cuerpo" style={{ top: 0, height: '297mm' }}>
                    <div className="prf-rotulo prf-en" style={{ ['--y' as any]: '26.6mm' }}>
                        <h2>Acta de inspección de seguridad y prevención de incendios en caseta de feria</h2>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: '2mm', minWidth: '58mm' }}>
                            <span className="prf-etq" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Expediente nº</span>
                            <input className="prf-campo" style={{ height: '4.4mm' }}
                                   value={d.expediente || numeroParte || ''} readOnly={!editable}
                                   onChange={e => set('expediente')(e.target.value)} />
                        </div>
                    </div>
                    <div className="prf-regla-naranja prf-en" style={{ ['--y' as any]: '31.2mm' }} />

                    <div className="prf-fila prf-en" style={{ ['--y' as any]: '33.6mm', marginTop: 0, gridTemplateColumns: '37.2mm 37.2mm 37.2mm 30.4mm 47mm' }}>
                        <Campo etq="Fecha" valor={d.fecha} onChange={set('fecha')} editable={editable} color="naranja" />
                        <Campo etq="Hora de inicio" valor={d.horaInicio} onChange={set('horaInicio')} editable={editable} color="naranja" />
                        <Campo etq="Hora de fin" valor={d.horaFin} onChange={set('horaFin')} editable={editable} color="naranja" />
                        <Campo etq="Indicativo que informa" valor={d.indicativoInforma} onChange={set('indicativoInforma')} editable={editable} color="naranja" />
                        <Campo etq="Equipo" valor={d.equipo} onChange={set('equipo')} editable={editable} color="naranja" />
                    </div>

                    <div className="prf-fila prf-en" style={{ ['--y' as any]: '44.6mm', marginTop: 0, gridTemplateColumns: '47mm 52.4mm 95.7mm', alignItems: 'end' }}>
                        <Campo etq="Policía Local · TIP nº 1" valor={d.policiaTip1} onChange={set('policiaTip1')} editable={editable} color="azul" />
                        <Campo etq="Policía Local · TIP nº 2" valor={d.policiaTip2} onChange={set('policiaTip2')} editable={editable} color="azul" />
                        <div>
                            <label className="prf-etq">Ejemplar del acta</label>
                            <div style={{ display: 'flex', gap: '3.5mm', height: '5.2mm', alignItems: 'center' }}>
                                {([['titular', 'Titular'], ['servicio', 'Servicio'], ['policia_local', 'Policía Local']] as const).map(([v, t]) => (
                                    <span className="prf-opcion" key={v}>
                                        <Casilla marcada={d.ejemplar === v} editable={editable}
                                                 onClick={() => onCampo?.('ejemplar', d.ejemplar === v ? '' : v)} />
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className="prf-nota prf-en" style={{ ['--y' as any]: '55.6mm' }}>
                        Acta levantada por personal del Servicio de Protección Civil del Ayuntamiento de Bormujos en el
                        ejercicio de las funciones de comprobación previa a la apertura de casetas de feria. Se verifican
                        las condiciones exigibles conforme al <b>RD 2816/1982</b> (Policía de Espectáculos Públicos), el{' '}
                        <b>RD 513/2017</b> (instalaciones de protección contra incendios), el <b>RD 919/2006</b> (gases
                        combustibles), el <b>RD 842/2002</b> (REBT) y la <b>Ley 13/1999</b> de Espectáculos Públicos y
                        Actividades Recreativas de Andalucía, así como la Ordenanza municipal de Feria.{' '}
                        <b>Marque SÍ únicamente cuando el requisito se cumple</b>; N.A. cuando no resulte de aplicación.
                    </p>

                    {/* 01 */}
                    <div className="prf-en" style={{ ['--y' as any]: '74.8mm' }}>
                        <Seccion num="01" titulo="Datos de la caseta" />
                        <div className="prf-caja">
                            <div className="prf-fila" style={{ gridTemplateColumns: '86mm 38mm 1fr', marginTop: 0 }}>
                                <Campo etq="Nombre de la caseta" valor={d.nombreCaseta} onChange={set('nombreCaseta')} editable={editable} />
                                <Campo etq="Nº de caseta" valor={d.numeroCaseta} onChange={set('numeroCaseta')} editable={editable} />
                                <div>
                                    <label className="prf-etq">Superficie en módulos</label>
                                    <div style={{ display: 'flex', gap: '2.4mm', alignItems: 'center', height: '5.2mm' }}>
                                        {(['1', '2', '3'] as const).map(v => (
                                            <span className="prf-opcion" key={v}>
                                                <Casilla marcada={d.modulos === v} editable={editable}
                                                         onClick={() => onCampo?.('modulos', d.modulos === v ? '' : v)} />
                                                {v}
                                            </span>
                                        ))}
                                        <span className="prf-opcion">
                                            <Casilla marcada={d.modulos === 'otros'} editable={editable}
                                                     onClick={() => onCampo?.('modulos', d.modulos === 'otros' ? '' : 'otros')} />
                                            Otros
                                        </span>
                                        <input className="prf-campo" style={{ flex: 1, height: '4.4mm' }}
                                               value={d.modulosOtros || ''} readOnly={!editable}
                                               onChange={e => set('modulosOtros')(e.target.value)} />
                                        <span style={{ fontSize: '6.5pt', color: 'var(--etiqueta)' }}>m²</span>
                                    </div>
                                </div>
                            </div>
                            <div className="prf-fila" style={{ gridTemplateColumns: '86mm 68mm 1fr' }}>
                                <Campo etq="Calle o sector del real" valor={d.calleSector} onChange={set('calleSector')} editable={editable} />
                                <Campo etq="Localidad" valor={d.localidad} onChange={set('localidad')} editable={editable} />
                                <Campo etq="Aforo autorizado" valor={d.aforo} onChange={set('aforo')} editable={editable} />
                            </div>
                        </div>
                    </div>

                    {/* 02 + 03 — anchos reales: 119,2 y 73,5 mm */}
                    <div className="prf-en" style={{ ['--y' as any]: '106mm', display: 'grid', gridTemplateColumns: '119.2mm 73.5mm', gap: '0 2.4mm' }}>
                        <div>
                            <Seccion num="02" titulo="Datos del tomador o responsable" />
                            <div className="prf-caja">
                                <div className="prf-fila" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                                    <Campo etq="Nombre y apellidos" valor={d.tomadorNombre} onChange={set('tomadorNombre')} editable={editable} />
                                    <Campo etq="DNI o NIE" valor={d.tomadorDni} onChange={set('tomadorDni')} editable={editable} />
                                    <Campo etq="Domicilio" valor={d.tomadorDomicilio} onChange={set('tomadorDomicilio')} editable={editable} />
                                    <Campo etq="Localidad" valor={d.tomadorLocalidad} onChange={set('tomadorLocalidad')} editable={editable} />
                                    <Campo etq="Teléfonos" valor={d.tomadorTelefonos} onChange={set('tomadorTelefonos')} editable={editable} />
                                    <Campo etq="Email" valor={d.tomadorEmail} onChange={set('tomadorEmail')} editable={editable} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <Seccion num="03" titulo="Póliza de seguro" />
                            <div className="prf-caja">
                                <div className="prf-fila" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                                    <Campo etq="Compañía" valor={d.polizaCompania} onChange={set('polizaCompania')} editable={editable} />
                                    <Campo etq="Nº de póliza" valor={d.polizaNumero} onChange={set('polizaNumero')} editable={editable} />
                                    <Campo etq="Vigencia hasta" valor={d.polizaVigencia} onChange={set('polizaVigencia')} editable={editable} />
                                    <div>
                                        <label className="prf-etq">Recibo en vigor</label>
                                        <div style={{ display: 'flex', gap: '4mm', height: '5.2mm', alignItems: 'center' }}>
                                            {([['si', 'Sí'], ['no', 'No']] as const).map(([v, t]) => (
                                                <span className="prf-opcion" key={v}>
                                                    <Casilla marcada={d.polizaRecibo === v} editable={editable}
                                                             onClick={() => onCampo?.('polizaRecibo', d.polizaRecibo === v ? '' : v)} />
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 04 */}
                    <div className="prf-en" style={{ ['--y' as any]: '147.3mm' }}>
                        <Seccion num="04" titulo="Protección contra incendios · Extintores" ref_="RD 513/2017" />
                        <div className="prf-caja">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4mm' }}>
                                {[
                                    { t: 'Extintor de polvo ABC', z: 'Zona noble', ef: 'Eficacia mínima 21A–113B',
                                      num: d.abcNumero, pre: d.abcPrecinto, efv: d.abcEficacia, rev: d.abcRevision,
                                      kn: 'abcNumero', kp: 'abcPrecinto', ke: 'abcEficacia', kr: 'abcRevision',
                                      items: EXTINTOR_ABC_CHECKS },
                                    { t: <>Extintor de CO<sub>2</sub></>, z: 'Zona cocina', ef: 'Eficacia mínima 34B',
                                      num: d.co2Numero, pre: d.co2Precinto, efv: d.co2Eficacia, rev: d.co2Revision,
                                      kn: 'co2Numero', kp: 'co2Precinto', ke: 'co2Eficacia', kr: 'co2Revision',
                                      items: EXTINTOR_CO2_CHECKS },
                                ].map((c, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', paddingBottom: '.8mm' }}>
                                            <span className="prf-firma-tit">{c.t}</span>
                                            <span className="prf-etq" style={{ marginLeft: 'auto', marginBottom: 0 }}>{c.z}</span>
                                        </div>
                                        <div className="prf-regla-naranja" style={{ height: '.3mm' }} />
                                        {[
                                            ['Nº de extintor', c.num, c.kn],
                                        ].map(([et, val, key], j) => (
                                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginTop: '1.4mm' }}>
                                                <span style={{ flex: 1, fontSize: '8.2pt' }}>{et as string}</span>
                                                <input className="prf-campo" style={{ width: '38mm', height: '4.4mm' }}
                                                       value={(val as string) || ''} readOnly={!editable}
                                                       onChange={e => onCampo?.(key as keyof PrfDatos, e.target.value)} />
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginTop: '1.2mm' }}>
                                            <span style={{ flex: 1, fontSize: '8.2pt' }}>Precinto</span>
                                            {([['si', 'Sí'], ['no', 'No']] as const).map(([v, t]) => (
                                                <span className="prf-opcion" key={v}>
                                                    <Casilla marcada={c.pre === v} editable={editable}
                                                             onClick={() => onCampo?.(c.kp as keyof PrfDatos, c.pre === v ? '' : v)} />
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                        {[
                                            [c.ef, c.efv, c.ke],
                                            ['Revisión en vigor · fecha', c.rev, c.kr],
                                        ].map(([et, val, key], j) => (
                                            <div key={`b${j}`} style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginTop: '1.2mm' }}>
                                                <span style={{ flex: 1, fontSize: '8.2pt' }}>{et as string}</span>
                                                <input className="prf-campo" style={{ width: '38mm', height: '4.4mm' }}
                                                       value={(val as string) || ''} readOnly={!editable}
                                                       onChange={e => onCampo?.(key as keyof PrfDatos, e.target.value)} />
                                            </div>
                                        ))}
                                        <div style={{ marginTop: '1.4mm' }}>
                                            <Checks items={c.items} checks={ch} onCheck={onCheck} editable={editable} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Precinto de verificación: bloque que faltaba por completo */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2.2mm', marginTop: '2mm' }}>
                                <span className="prf-firma-tit" style={{ width: '40mm', lineHeight: 1.15, fontSize: '6.7pt' }}>
                                    Precinto de verificación<br />de Protección Civil
                                </span>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <input key={i} className="prf-campo" style={{ width: '19.5mm', height: '4.4mm' }}
                                           value={d.precintoVerificacion?.[i] || ''} readOnly={!editable}
                                           onChange={e => {
                                               const v = [...(d.precintoVerificacion || ['', '', '', '', ''])]
                                               v[i] = e.target.value
                                               onCampo?.('precintoVerificacion', v)
                                           }} />
                                ))}
                                <span style={{ fontSize: '6.5pt', color: 'var(--etiqueta)', whiteSpace: 'nowrap' }}>
                                    Su rotura invalida la verificación.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 05 */}
                    <div className="prf-en" style={{ ['--y' as any]: '212.5mm' }}>
                        <Seccion num="05" titulo="Instalación de gas y zona de cocina" ref_="RD 919/2006 · ITC-ICG" />
                        <div className="prf-caja">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4mm' }}>
                                <Checks items={GAS_IZQ} checks={ch} onCheck={onCheck} editable={editable} />
                                <Checks items={GAS_DER} checks={ch} onCheck={onCheck} editable={editable} />
                            </div>
                        </div>
                    </div>

                    {/* 06 */}
                    <div className="prf-en" style={{ ['--y' as any]: '249.3mm' }}>
                        <Seccion num="06" titulo="Documentación aportada por el titular" ref_="Original o copia cotejada" />
                        <div className="prf-caja">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4mm' }}>
                                <Checks items={DOC_IZQ} checks={ch} onCheck={onCheck} editable={editable} />
                                <Checks items={DOC_DER} checks={ch} onCheck={onCheck} editable={editable} />
                            </div>
                        </div>
                    </div>
                </div>
                <Pie />
            </section>

            {/* ══ PÁGINA 2 ══ */}
            <section className="prf-hoja">
                <Cabecera />
                <div className="prf-cuerpo" style={{ top: 0, height: '297mm' }}>
                    <div className="prf-rotulo prf-en" style={{ ['--y' as any]: '26.6mm' }}>
                        <h2>Instalación eléctrica, evacuación, resultado y firmas</h2>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: '2mm' }}>
                            <span className="prf-etq" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Expediente nº</span>
                            <input className="prf-campo" style={{ width: '34mm', height: '4.4mm' }}
                                   value={d.expediente || numeroParte || ''} readOnly />
                            <span className="prf-etq" style={{ marginBottom: 0 }}>Caseta</span>
                            <input className="prf-campo" style={{ width: '34mm', height: '4.4mm' }}
                                   value={d.nombreCaseta || ''} readOnly />
                        </div>
                    </div>
                    <div className="prf-regla-naranja prf-en" style={{ ['--y' as any]: '31.2mm' }} />

                    {/* 07 + 08 — anchos reales: 96,2 y 96,5 mm */}
                    <div className="prf-en" style={{ ['--y' as any]: '33.6mm', display: 'grid', gridTemplateColumns: '96.2mm 96.5mm', gap: '0 2.4mm' }}>
                        <div>
                            <Seccion num="07" titulo="Instalación eléctrica" ref_="REBT" />
                            <div className="prf-caja"><Checks items={ELECTRICA} checks={ch} onCheck={onCheck} editable={editable} /></div>
                        </div>
                        <div>
                            <Seccion num="08" titulo="Evacuación y estructura" />
                            <div className="prf-caja"><Checks items={EVACUACION} checks={ch} onCheck={onCheck} editable={editable} /></div>
                        </div>
                    </div>

                    {/* 09 */}
                    <div className="prf-en" style={{ ['--y' as any]: '89.4mm' }}>
                        <Seccion num="09" titulo="Observaciones" />
                        <div className="prf-caja">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4mm' }}>
                                {([['Zona noble', d.obsZonaNoble, 'obsZonaNoble'], ['Zona cocina', d.obsZonaCocina, 'obsZonaCocina']] as const).map(([et, val, key]) => (
                                    <div key={key}>
                                        <label className="prf-etq">{et}</label>
                                        <textarea className="prf-campo" style={{ height: '17mm', padding: '1.2mm', resize: 'none', lineHeight: 1.35 }}
                                                  value={val || ''} readOnly={!editable}
                                                  onChange={e => onCampo?.(key as keyof PrfDatos, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 10 — barra naranja en el modelo */}
                    <div className="prf-en" style={{ ['--y' as any]: '123.7mm' }}>
                        <Seccion num="10" titulo="Resultado de la revisión y requerimientos" naranja />
                        <div className="prf-caja">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 3mm' }}>
                                {([['apto', 'APTO'], ['apto_condiciones', 'APTO CON CONDICIONES'], ['no_apto', 'NO APTO']] as const).map(([v, t]) => {
                                    const sel = d.resultado === v
                                    const esNoApto = v === 'no_apto'
                                    return (
                                        <button
                                            key={v} type="button" disabled={!editable}
                                            onClick={() => editable && onCampo?.('resultado', sel ? '' : v)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '2.6mm',
                                                border: `.3mm solid ${esNoApto ? 'var(--naranja)' : 'var(--borde)'}`,
                                                background: esNoApto ? '#FFF7F2' : '#fff',
                                                padding: '2mm 2.4mm', cursor: editable ? 'pointer' : 'default',
                                            }}
                                        >
                                            <Casilla marcada={sel} editable={editable} naranja={esNoApto} />
                                            <span className="prf-firma-tit" style={{ color: esNoApto ? 'var(--naranja)' : 'var(--azul)', letterSpacing: '1pt' }}>{t}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="prf-fila" style={{ gridTemplateColumns: '110mm 38mm 1fr' }}>
                                <div>
                                    <label className="prf-etq">Requerimientos de subsanación</label>
                                    <textarea className="prf-campo" style={{ height: '14mm', padding: '1.2mm', resize: 'none', lineHeight: 1.5 }}
                                              value={d.requerimientos || ''} readOnly={!editable}
                                              onChange={e => set('requerimientos')(e.target.value)} />
                                </div>
                                <Campo etq="Plazo límite" valor={d.plazoLimite} onChange={set('plazoLimite')} editable={editable} />
                                <Campo etq="Reinspección prevista" valor={d.reinspeccion} onChange={set('reinspeccion')} editable={editable} />
                            </div>

                            <p className="prf-aviso" style={{ marginTop: '2.6mm' }}>
                                <span className="cab">ADVERTENCIA.</span> La calificación de <b>NO APTO</b>, o el incumplimiento
                                de los requerimientos en el plazo señalado, será objeto de traslado a la Policía Local y al
                                órgano municipal competente, que podrá acordar la <b>suspensión de la actividad, el precinto
                                de la instalación o la clausura de la caseta</b>, conforme a la Ley 13/1999 de Espectáculos
                                Públicos y Actividades Recreativas de Andalucía y a la Ordenanza municipal aplicable, sin
                                perjuicio de la responsabilidad administrativa, civil o penal que pudiera derivarse. El
                                presente parte tiene naturaleza de acta de comprobación técnica y no sustituye a las
                                autorizaciones municipales exigibles.
                            </p>
                        </div>
                    </div>

                    {/* Firmas: 4 columnas de 46,4 mm */}
                    <div className="prf-en" style={{ ['--y' as any]: '213mm' }}>
                        <div className="prf-firmas">
                            {[
                                ['Indicativo que informa 1', 'Indicativo y firma'],
                                ['Indicativo que informa 2', 'Indicativo y firma'],
                                ['Vº Bº Jefe de Servicio', 'Nombre y firma'],
                                ['Tomador o representante', 'Firma de recepción, no implica conformidad'],
                            ].map(([t, s]) => (
                                <div key={t}>
                                    <div className="prf-firma-hueco" />
                                    <div className="prf-firma-linea" />
                                    <div className="prf-firma-tit">{t}</div>
                                    <div className="prf-firma-sub">{s}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="prf-legal prf-en" style={{ ['--y' as any]: '252mm' }}>
                        <b>Protección de datos.</b> Responsable: Ayuntamiento de Bormujos (Sevilla) — Servicio de Protección
                        Civil. Finalidad: gestión y control de las condiciones de seguridad de las casetas de feria. Base
                        jurídica: cumplimiento de una obligación legal y ejercicio de poderes públicos, art. 6.1 c) y e)
                        RGPD. Destinatarios: Policía Local y órganos municipales competentes; no se prevén otras cesiones
                        salvo obligación legal. Conservación: el plazo legalmente exigible. Derechos de acceso,
                        rectificación, supresión, limitación, portabilidad y oposición ante info.pcivil@bormujos.net.
                        Reglamento (UE) 2016/679 y Ley Orgánica 3/2018 (LOPDGDD).
                    </p>
                </div>
                <Pie />
            </section>

            {/* ══ PÁGINA 3 · Anexo gráfico ══ */}
            <section className="prf-hoja">
                <Cabecera />
                <div className="prf-cuerpo" style={{ top: 0, height: '297mm' }}>
                    <div className="prf-rotulo prf-en" style={{ ['--y' as any]: '26.6mm' }}>
                        <h2>Anexo · Material gráfico</h2>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: '2mm' }}>
                            <span className="prf-etq" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Expediente nº</span>
                            <input className="prf-campo" style={{ width: '34mm', height: '4.4mm' }} value={d.expediente || numeroParte || ''} readOnly />
                            <span className="prf-etq" style={{ marginBottom: 0 }}>Caseta</span>
                            <input className="prf-campo" style={{ width: '34mm', height: '4.4mm' }} value={d.nombreCaseta || ''} readOnly />
                        </div>
                    </div>
                    <div className="prf-regla-naranja prf-en" style={{ ['--y' as any]: '31.2mm' }} />

                    <div className="prf-en" style={{ ['--y' as any]: '34.5mm' }}>
                    {([
                        { titulo: 'Zona noble', clave: 'zonaNoble', n: 2, alto: '52mm' },
                        { titulo: 'Zona cocina', clave: 'zonaCocina', n: 2, alto: '52mm' },
                    ] as const).map(b => (
                        <div key={b.clave} style={{ marginTop: '2.6mm' }}>
                            <div className="prf-sec" style={{ justifyContent: 'center' }}>
                                <span className="tit">{b.titulo}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.4mm', marginTop: '2mm' }}>
                                {Array.from({ length: b.n }, (_, i) => {
                                    const url = fotos[b.clave]?.[i]
                                    return url
                                        ? <img key={i} src={url} alt={`${b.titulo} ${i + 1}`}
                                               style={{ height: b.alto, width: '100%', objectFit: 'cover', border: '.25mm solid var(--borde)' }} />
                                        : <div key={i} className="prf-zona-foto" style={{ height: b.alto }}>{b.titulo} · Foto {i + 1}</div>
                                })}
                            </div>
                        </div>
                    ))}
                    </div>

                    <div className="prf-en" style={{ ['--y' as any]: '186mm', display: 'grid', gridTemplateColumns: '129.2mm 63.5mm', gap: '0 2.4mm' }}>
                        {([
                            { titulo: 'Extintores de polvo ABC', clave: 'extintorAbc', n: 2 },
                            { titulo: 'Extintores de CO2', clave: 'extintorCo2', n: 1 },
                        ] as const).map(b => (
                            <div key={b.clave}>
                                <div className="prf-sec" style={{ justifyContent: 'center' }}>
                                    <span className="tit">{b.titulo}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: b.n === 2 ? '1fr 1fr' : '1fr', gap: '2.4mm', marginTop: '2mm' }}>
                                    {Array.from({ length: b.n }, (_, i) => {
                                        const url = fotos[b.clave]?.[i]
                                        return url
                                            ? <img key={i} src={url} alt={`${b.titulo} ${i + 1}`}
                                                   style={{ height: '38mm', width: '100%', objectFit: 'cover', border: '.25mm solid var(--borde)' }} />
                                            : <div key={i} className="prf-zona-foto" style={{ height: '38mm', fontSize: '7.5pt' }}>
                                                {b.titulo.replace('Extintores de ', 'Extintor ')} · Foto {i + 1}
                                              </div>
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <Pie />
            </section>
        </div>
    )
}
