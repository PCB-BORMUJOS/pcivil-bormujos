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
    ELECTRICA, EVACUACION, EFICACIA_ABC, EFICACIA_CO2, EJEMPLARES, INDICATIVO_JEFE,
    type ItemCheck, type ValorCheck, type PrfDatos,
} from '@/lib/prf-campos'
import { CASETAS_FERIA, buscarCaseta, datosDeCaseta, componerExpediente } from '@/lib/casetas-feria'

type Fotos = Record<string, string[]>

export type PrfHojaProps = {
    datos: PrfDatos
    numeroParte?: string
    fotos?: Fotos
    /** Sin editar, la hoja se comporta como documento (vista previa e impresión). */
    editable?: boolean
    /** Indicativos del servicio para los desplegables. */
    indicativos?: string[]
    onCampo?: (campo: keyof PrfDatos, valor: any) => void
    /** Aplica varios campos de golpe (al elegir una caseta del plan). */
    onCampos?: (cambios: Partial<PrfDatos>) => void
    onCheck?: (key: string, valor: ValorCheck) => void
    /** Abre el panel de firma para el campo indicado. */
    onFirmar?: (campo: string) => void
    /** Entrega la foto elegida ya lista para comprimir y subir. */
    onFoto?: (bloque: string, indice: number, archivo: File) => void
}

// ── Piezas comunes ───────────────────────────────────────────────────────────

function Cabecera() {
    return (
        <header className="prf-cab">
            <span className="prf-cab-sigla">PRF</span>
            <span className="prf-cab-titulo">Parte de<br />Revisión Feria</span>
            {/* Logotipo real del servicio. object-fit: contain para que no se
                deforme nunca, sea cual sea el alto de la banda. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-pc-blanco.png" alt="Protección Civil Bormujos" className="prf-cab-logo" />
        </header>
    )
}

function Pie() {
    return (
        <footer className="prf-pie">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-ayuntamiento.png" alt="Ayuntamiento de Bormujos" className="prf-pie-logo izq" />
            <div className="prf-pie-centro">
                <div>Servicio de Protección Civil</div>
                <div>Ayuntamiento de Bormujos (Sevilla)</div>
                <div className="fina">Calle Maestro Francisco Rodríguez | Avda Universidad de Salamanca</div>
                <div className="fina">info.pcivil@bormujos.net | www.proteccioncivilbormujos.es</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-pc-blanco.png" alt="Protección Civil Bormujos" className="prf-pie-logo der" />
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

/** Campo de fecha u hora: abre el selector nativo y va centrado en la celda. */
function CampoFechaHora({
    etq, valor, onChange, editable, tipo = 'date', color,
}: {
    etq: string; valor: string; onChange?: (v: string) => void
    editable?: boolean; tipo?: 'date' | 'time' | 'datetime-local'; color?: 'azul' | 'naranja'
}) {
    return (
        <div>
            <label className="prf-etq">{etq}</label>
            <input
                type={tipo} className={`prf-campo prf-centrado${color ? ' ' + color : ''}`}
                value={valor || ''} readOnly={!editable} disabled={!editable}
                onChange={e => onChange?.(e.target.value)}
            />
        </div>
    )
}

/** Desplegable con la lista de indicativos del servicio. */
function SelectorIndicativo({
    etq, valor, opciones, onChange, editable,
}: { etq: string; valor: string; opciones: string[]; onChange?: (v: string) => void; editable?: boolean }) {
    return (
        <div>
            <label className="prf-etq">{etq}</label>
            <select className="prf-campo prf-centrado naranja" value={valor || ''}
                    disabled={!editable} onChange={e => onChange?.(e.target.value)}>
                <option value="">—</option>
                {opciones.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
        </div>
    )
}

/**
 * Ranura de foto. En iPad y móvil, pulsar abre la hoja del sistema con
 * "Hacer foto" y "Fototeca"; en ordenador, el explorador de archivos.
 * La compresión se hace en el componente padre, al recibir el fichero.
 */
function RanuraFoto({
    etiqueta, url, proporcion, editable, onElegir,
}: {
    etiqueta: string; url?: string; proporcion: string
    editable?: boolean; onElegir?: (f: File) => void
}) {
    const id = `foto-${etiqueta.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
    if (url) {
        return (
            <label htmlFor={editable ? id : undefined} style={{ display: 'block', cursor: editable ? 'pointer' : 'default' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={etiqueta} style={{ aspectRatio: proporcion, width: '100%', objectFit: 'cover', border: '.25mm solid var(--borde)' }} />
                {editable && <input id={id} type="file" accept="image/*" capture="environment" hidden
                                    onChange={e => { const f = e.target.files?.[0]; if (f) onElegir?.(f); e.target.value = '' }} />}
            </label>
        )
    }
    return (
        <label htmlFor={editable ? id : undefined} className="prf-zona-foto"
               style={{ aspectRatio: proporcion, cursor: editable ? 'pointer' : 'default' }}>
            <span>{etiqueta}</span>
            {editable && <span className="prf-no-imprimir" style={{ fontSize: '6.5pt' }}>Hacer foto o elegir de la galería</span>}
            {editable && <input id={id} type="file" accept="image/*" capture="environment" hidden
                                onChange={e => { const f = e.target.files?.[0]; if (f) onElegir?.(f); e.target.value = '' }} />}
        </label>
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
type Extra = { tipo: 'date' | 'number'; valor: string; campo: string }

function Checks({
    items, checks, onCheck, editable, extras, onCampo,
}: {
    items: ItemCheck[]; checks: Record<string, ValorCheck>
    onCheck?: (k: string, v: ValorCheck) => void; editable?: boolean
    /** Algunos ítems llevan un dato propio (fecha, número) además del Sí/No/N.A. */
    extras?: Record<string, Extra>
    onCampo?: (campo: keyof PrfDatos, valor: any) => void
}) {
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
                        <td className={extras?.[it.key] ? 'con-dato' : undefined}>
                            <span className="etq">{it.label}</span>
                            {extras?.[it.key] && (
                                <span className="hueco">
                                    <input
                                        type={extras[it.key].tipo}
                                        /* Sin borde y vacío, un campo numérico no se ve;
                                           el marcador indica que ahí se escribe. */
                                        placeholder={extras[it.key].tipo === 'number' ? 'nº' : undefined}
                                        className="prf-centrado prf-extra"
                                        value={extras[it.key].valor || ''} disabled={!editable}
                                        onChange={e => onCampo?.(extras[it.key].campo as keyof PrfDatos, e.target.value)}
                                    />
                                </span>
                            )}
                        </td>
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

export default function PrfHoja({ datos, numeroParte, fotos = {}, editable = false, indicativos = [], onCampo, onCampos, onCheck, onFirmar, onFoto }: PrfHojaProps) {
    const d = datos
    const set = (k: keyof PrfDatos) => (v: string) => onCampo?.(k, v)
    const ch = d.checks || {}
    // El expediente no se teclea: sale del nº de parte y del ID de la caseta.
    const expediente = componerExpediente(numeroParte, d.numeroCaseta) || d.expediente || ''

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
                                   value={expediente} readOnly title="Se compone solo con el nº de parte y la caseta" />
                        </div>
                    </div>
                    <div className="prf-regla-naranja prf-en" style={{ ['--y' as any]: '31.2mm' }} />

                    {/* Cinco huecos iguales que suman justo el ancho útil: 5×36,7 + 4×3,2 = 195,1 mm.
                        "Indicativo que informa" y "Equipo" eran lo mismo, así que
                        pasan a ser dos indicativos elegidos de la lista del servicio. */}
                    <div className="prf-fila prf-en" style={{ ['--y' as any]: '33.6mm', marginTop: 0, gridTemplateColumns: 'repeat(5, 36.7mm)' }}>
                        <CampoFechaHora etq="Fecha" valor={d.fecha} onChange={set('fecha')} editable={editable} tipo="date" color="naranja" />
                        <CampoFechaHora etq="Hora de inicio" valor={d.horaInicio} onChange={set('horaInicio')} editable={editable} tipo="time" color="naranja" />
                        <CampoFechaHora etq="Hora de fin" valor={d.horaFin} onChange={set('horaFin')} editable={editable} tipo="time" color="naranja" />
                        <SelectorIndicativo etq="Indicativos que informan" valor={d.indicativos?.[0] || ''} opciones={indicativos} editable={editable}
                            onChange={v => onCampo?.('indicativos', [v, d.indicativos?.[1] || ''])} />
                        <SelectorIndicativo etq="Indicativos que informan" valor={d.indicativos?.[1] || ''} opciones={indicativos} editable={editable}
                            onChange={v => onCampo?.('indicativos', [d.indicativos?.[0] || '', v])} />
                    </div>

                    <div className="prf-fila prf-en" style={{ ['--y' as any]: '44.6mm', marginTop: 0, gridTemplateColumns: '47mm 52.4mm 95.7mm', alignItems: 'end' }}>
                        <Campo etq="Policía Local · TIP nº 1" valor={d.policiaTip1} onChange={set('policiaTip1')} editable={editable} color="azul" />
                        <Campo etq="Policía Local · TIP nº 2" valor={d.policiaTip2} onChange={set('policiaTip2')} editable={editable} color="azul" />
                        <div>
                            <label className="prf-etq">Ejemplar del acta</label>
                            <div style={{ display: 'flex', gap: '3.5mm', height: '5.2mm', alignItems: 'center' }}>
                                {/* Puede extenderse en varios ejemplares a la vez */}
                                {EJEMPLARES.map(({ valor, label }) => {
                                    const sel = (d.ejemplares || []).includes(valor)
                                    return (
                                        <span className="prf-opcion" key={valor}>
                                            <Casilla marcada={sel} editable={editable}
                                                     onClick={() => onCampo?.('ejemplares', sel
                                                         ? (d.ejemplares || []).filter(x => x !== valor)
                                                         : [...(d.ejemplares || []), valor])} />
                                            {label}
                                        </span>
                                    )
                                })}
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
                                {/* Al elegir una caseta del plan se rellenan solos el nº, la
                                    calle, la localidad y el aforo autorizado (el operativo del
                                    PAE). Todo sigue siendo editable a mano. */}
                                <div>
                                    <label className="prf-etq">Nombre de la caseta</label>
                                    <input
                                        className="prf-campo" list="prf-casetas"
                                        value={d.nombreCaseta || ''} readOnly={!editable}
                                        onChange={e => {
                                            const v = e.target.value
                                            const c = buscarCaseta(v)
                                            if (c) onCampos?.(datosDeCaseta(c))
                                            else set('nombreCaseta')(v)
                                        }}
                                    />
                                    <datalist id="prf-casetas">
                                        {CASETAS_FERIA.map(c => (
                                            <option key={c.id} value={c.nombre}>{`${c.id} · ${c.calle}`}</option>
                                        ))}
                                    </datalist>
                                </div>
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
                                    <CampoFechaHora etq="Vigencia hasta" valor={d.polizaVigencia} onChange={set('polizaVigencia')} editable={editable} tipo="date" />
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
                                        {/* Eficacia: etiqueta a la izquierda y desplegable con los
                                            valores normalizados, en vez de texto libre */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginTop: '1.2mm' }}>
                                            <span style={{ flex: 1, fontSize: '8.2pt' }}>Eficacia</span>
                                            <select className="prf-campo prf-centrado" style={{ width: '38mm', height: '4.4mm' }}
                                                    value={c.efv || ''} disabled={!editable}
                                                    onChange={e => onCampo?.(c.ke as keyof PrfDatos, e.target.value)}>
                                                <option value="">—</option>
                                                {(i === 0 ? EFICACIA_ABC : EFICACIA_CO2).map(o => (
                                                    <option key={o.valor} value={o.valor}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Fecha de la última revisión */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginTop: '1.2mm' }}>
                                            <span style={{ flex: 1, fontSize: '8.2pt' }}>Revisión en vigor · última</span>
                                            <input type="date" className="prf-campo prf-centrado" style={{ width: '38mm', height: '4.4mm' }}
                                                   value={c.rev || ''} disabled={!editable}
                                                   onChange={e => onCampo?.(c.kr as keyof PrfDatos, e.target.value)} />
                                        </div>
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
                                <Checks items={GAS_IZQ} checks={ch} onCheck={onCheck} editable={editable}
                                        extras={{
                                            gas_certificado: { tipo: 'date', valor: d.gasCertificadoFecha, campo: 'gasCertificadoFecha' },
                                            gas_manguera:    { tipo: 'date', valor: d.gasMangueraCaducidad, campo: 'gasMangueraCaducidad' },
                                            gas_botellas:    { tipo: 'number', valor: d.gasBotellasNum, campo: 'gasBotellasNum' },
                                        }} onCampo={onCampo} />
                                <Checks items={GAS_DER} checks={ch} onCheck={onCheck} editable={editable} />
                            </div>
                        </div>
                    </div>

                    {/* 06 */}
                    {/* El modelo sitúa la 06 en 249,3 mm, pero allí sus filas de gas no
                        llevaban fecha ni nº de botellas. Al incorporarlos, la 05 crece y la
                        06 baja medio milímetro; sigue holgada respecto al pie. */}
                    <div className="prf-en" style={{ ['--y' as any]: '249.8mm' }}>
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
                                   value={expediente} readOnly />
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
                                <CampoFechaHora etq="Plazo límite" valor={d.plazoLimite} onChange={set('plazoLimite')} editable={editable} tipo="date" />
                                <CampoFechaHora etq="Reinspección prevista" valor={d.reinspeccion} onChange={set('reinspeccion')} editable={editable} tipo="datetime-local" />
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
                            {/* Los indicativos salen de lo elegido arriba; el Vº Bº es
                                siempre J-44. El hueco sobre la línea azul es donde se firma. */}
                            {([
                                { tit: 'Indicativo que informa 1', sub: d.indicativos?.[0] || 'Indicativo y firma', campo: 'firmaInforma1' },
                                { tit: 'Indicativo que informa 2', sub: d.indicativos?.[1] || 'Indicativo y firma', campo: 'firmaInforma2' },
                                { tit: 'Vº Bº Jefe de Servicio', sub: INDICATIVO_JEFE, campo: 'firmaJefe' },
                                { tit: 'Tomador o representante', sub: 'Firma de recepción, no implica conformidad', campo: 'firmaTomador' },
                            ] as const).map(f => {
                                const firma = (d as any)[f.campo] as string
                                return (
                                    <div key={f.campo}>
                                        <div
                                            className={`prf-firma-hueco${editable ? ' editable' : ''}`}
                                            onClick={() => editable && onFirmar?.(f.campo)}
                                            role={editable ? 'button' : undefined}
                                            title={editable ? 'Pulsa para firmar' : undefined}
                                        >
                                            {firma
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                ? <img src={firma} alt={`Firma ${f.tit}`} className="prf-firma-img" />
                                                : editable && <span className="prf-firma-pista prf-no-imprimir">Pulsa para firmar</span>}
                                        </div>
                                        <div className="prf-firma-linea" />
                                        <div className="prf-firma-tit">{f.tit}</div>
                                        <div className="prf-firma-sub">{f.sub}</div>
                                    </div>
                                )
                            })}
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
                            <input className="prf-campo" style={{ width: '34mm', height: '4.4mm' }} value={expediente} readOnly />
                            <span className="prf-etq" style={{ marginBottom: 0 }}>Caseta</span>
                            <input className="prf-campo" style={{ width: '34mm', height: '4.4mm' }} value={d.nombreCaseta || ''} readOnly />
                        </div>
                    </div>
                    <div className="prf-regla-naranja prf-en" style={{ ['--y' as any]: '31.2mm' }} />

                    {/* Reparto de la página: a ancho completo, una foto 4:3 mide 72,3 mm
                        de alto y los dos bloques de zona se comían la fila de extintores.
                        Se reduce todo un 7 % por igual, manteniendo el 4:3 exacto: las
                        apaisadas quedan en 89,7 x 67,3 mm y las verticales en 59,1 x 78,8,
                        con lo que la última acaba en 274,1 mm y el pie empieza en 277,6. */}
                    {([
                        { titulo: 'Zona noble', clave: 'zonaNoble', y: '34.5mm' },
                        { titulo: 'Zona cocina', clave: 'zonaCocina', y: '111.4mm' },
                    ] as const).map(b => (
                        <div key={b.clave} className="prf-en" style={{ ['--y' as any]: b.y }}>
                            <div className="prf-sec" style={{ justifyContent: 'center' }}>
                                <span className="tit">{b.titulo}</span>
                            </div>
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(2, 89.7mm)',
                                gap: '2.4mm', marginTop: '2mm', justifyContent: 'center',
                            }}>
                                {[0, 1].map(i => (
                                    <RanuraFoto key={i} etiqueta={`${b.titulo} · Foto ${i + 1}`} url={fotos[b.clave]?.[i]}
                                                proporcion="4 / 3" editable={editable}
                                                onElegir={f => onFoto?.(b.clave, i, f)} />
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="prf-en" style={{
                        ['--y' as any]: '188.3mm', display: 'grid',
                        gridTemplateColumns: '120.6mm 59.1mm', gap: '0 2.4mm', justifyContent: 'center',
                    }}>
                        {([
                            { titulo: 'Extintores de polvo ABC', clave: 'extintorAbc', n: 2 },
                            { titulo: 'Extintores de CO2', clave: 'extintorCo2', n: 1 },
                        ] as const).map(b => (
                            <div key={b.clave}>
                                <div className="prf-sec" style={{ justifyContent: 'center' }}>
                                    <span className="tit">{b.titulo}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${b.n}, 59.1mm)`, gap: '2.4mm', marginTop: '2mm' }}>
                                    {Array.from({ length: b.n }, (_, i) => (
                                        <RanuraFoto key={i} etiqueta={`${b.titulo.replace('Extintores de ', 'Extintor ')} · Foto ${i + 1}`}
                                                    url={fotos[b.clave]?.[i]} proporcion="3 / 4" editable={editable}
                                                    onElegir={f => onFoto?.(b.clave, i, f)} />
                                    ))}
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
