'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject, PointerEvent as ReactPointerEvent } from 'react'
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON as GeoJSONLayer, useMapEvents } from 'react-leaflet'
import { X, Printer } from 'lucide-react'
import { TILES_CALLEJERO, TIPOS_PLAN } from '@/lib/cartografia'
import type { Capa } from './MapaCartografia'

// ── Lámina imprimible de un plano (formato 4/5 mapa + 1/5 cajetín) ─────────────
// Compone una lámina profesional lista para imprimir/guardar como PDF a partir
// del encuadre y las capas que el usuario haya dejado en el visor. El mapa es
// ESTÁTICO (no interactivo): el encuadre ya se fijó en el visor.

type Props = {
    center: [number, number]
    zoom: number
    baseActiva: string
    baseCapa: Capa | undefined
    capasActivas: Capa[]
    opacidades: Record<string, number>
    geojsons: Record<string, any>
    contexto?: { nombre?: string; anexo?: string }
    planes?: Array<{ id: string; nombre: string; tipo: string }>
    onCerrar: () => void
}

// La hoja se define en mm (A3), así que la escala es FÍSICA e independiente del
// ppp de impresión (el ppp solo afecta a la nitidez del ráster, no a la escala).
// 1 px CSS = 1/96 pulgada = 0,26458 mm  →  3779,5276 px por metro de papel.
const PX_POR_METRO_PAPEL = 96 / 0.0254
// Denominador de escala real para el encuadre actual.
function escalaDe(lat: number, zoom: number): number {
    const mppx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
    return Math.round(mppx * PX_POR_METRO_PAPEL)
}
// Zoom (fraccional) necesario para representar una escala 1:N exacta sobre la hoja.
function zoomParaEscala(lat: number, N: number): number {
    const mppx = N / PX_POR_METRO_PAPEL
    return Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180)) / mppx)
}
// Escalas de plano habituales para los botones de encuadre.
const ESCALAS = [1000, 2000, 5000, 10000, 15000, 25000, 50000]
// Formatea 1:N con separador de miles.
const fmtEscala = (n: number) => n.toLocaleString('es-ES')

const VERDE = '#2f5233'  // verde institucional del cajetín

export default function LaminaPlano({
    center, zoom, baseActiva, baseCapa, capasActivas, opacidades, geojsons, contexto, planes, onCerrar,
}: Props) {
    const hoy = new Date()
    const mmAaaa = `${String(hoy.getMonth() + 1).padStart(2, '0')} / ${hoy.getFullYear()}`

    // Fuentes: atribuciones de las capas activas + base, limpias y sin repetir.
    const fuentes = useMemo(() => {
        const set = new Set<string>()
        const limpia = (s?: string | null) => (s || '').replace(/^©\s*/, '').trim()
        if (baseCapa?.atribucion) set.add(limpia(baseCapa.atribucion))
        else if (baseActiva === 'callejero') set.add('OpenStreetMap')
        for (const c of capasActivas) if (c.atribucion) set.add(limpia(c.atribucion))
        return Array.from(set)
    }, [baseCapa, baseActiva, capasActivas])

    // Proyección: fija y profesional (la cartografía oficial andaluza).
    const PROYECCION = 'ETRS89 / UTM 30N (EPSG:25830)'

    // Cajetín editable (el usuario ajusta lo específico de cada plano).
    const [tituloPlan, setTituloPlan] = useState(contexto?.nombre || 'PLAN DE EMERGENCIA')
    const [anexo, setAnexo] = useState(contexto?.anexo || 'Anexo · Planos')
    const [tituloPlano, setTituloPlano] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [numero, setNumero] = useState('00')
    const [total, setTotal] = useState('00')
    const [fecha, setFecha] = useState(mmAaaa)
    // Escala REAL del encuadre actual (se recalcula al mover el mapa).
    const [escalaNum, setEscalaNum] = useState(() => escalaDe(center[0], zoom))
    const [editando, setEditando] = useState(true)
    // Factor de tamaño de la tipografía del cajetín (elegible en el editor).
    const [factorFuente, setFactorFuente] = useState(1)
    const fs = (n: number) => Math.round(n * factorFuente * 10) / 10

    const mapRef = useRef<any>(null)
    const insetRef = useRef<any>(null)
    const mapAreaRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const t = setTimeout(() => { mapRef.current?.invalidateSize(false); insetRef.current?.invalidateSize(false) }, 250)
        return () => clearTimeout(t)
    }, [])

    // Encuadra el mapa a una escala 1:N exacta (zoom fraccional).
    const fijarEscala = (N: number) => {
        const m = mapRef.current
        if (!m) return
        m.setZoom(zoomParaEscala(m.getCenter().lat, N))
    }

    // Render de las capas (idéntico al visor) para el mapa de la lámina.
    const renderCapas = () => capasActivas.map(c => {
        if (c.tipo === 'wms' && c.wmsUrl) {
            return <WMSTileLayer key={c.id} url={c.wmsUrl} opacity={opacidades[c.id] ?? c.opacidad}
                params={{ layers: c.wmsLayers || '', format: (c.wmsFormat || 'image/png') as any, transparent: true, version: (c.wmsVersion || '1.1.1') as any }}
                tileSize={512} detectRetina />
        }
        const geo = geojsons[c.id]
        if (!geo) return null
        return <GeoJSONLayer key={c.id} data={geo} style={(f: any) => {
            const op = opacidades[c.id] ?? c.opacidad
            const esLinea = String(f?.geometry?.type || '').includes('LineString')
            return { color: c.color, weight: esLinea ? 3.5 : 2.5, opacity: op, fillColor: c.color, fillOpacity: esLinea ? 0 : op * 0.25, className: 'capa-contraste' }
        }} />
    })

    // Lámina fija A3 apaisado (420×297 mm). 4/5 mapa · 1/5 cajetín.
    const dim = { w: 420, h: 297 }

    return (
        <div className="fixed inset-0 z-[1400] bg-slate-800/95 flex flex-col">
            {/* Estilos de impresión: al imprimir solo se ve la lámina, a tamaño de página. */}
            <style>{`
                .lamina-hoja { width: ${dim.w}mm; height: ${dim.h}mm; background:#fff; padding:7mm; box-sizing:border-box; }
                .lamina-marco { width:100%; height:100%; display:flex; gap:4mm; padding:3mm; border:1px solid #94a3b8; overflow:hidden; box-sizing:border-box; }
                .lamina-contraste { filter: drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff); }
                @media print {
                    @page { size: A3 landscape; margin: 0; }
                    body { background:#fff !important; }
                    body * { visibility: hidden !important; }
                    .lamina-print, .lamina-print * { visibility: visible !important; }
                    .lamina-print { position: fixed; inset: 0; margin:0; padding:0; background:#fff; }
                    .lamina-noprint { display: none !important; }
                    .lamina-hoja { box-shadow:none !important; }
                    .leaflet-control-container { display:none !important; }
                }
            `}</style>

            {/* Barra superior (no se imprime) */}
            <div className="lamina-noprint flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-2 text-sm font-semibold"><Printer size={16} /> Crear plano para imprimir · A3 apaisado</div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setEditando(v => !v)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600">{editando ? 'Ocultar edición' : 'Editar cajetín'}</button>
                    <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500"><Printer size={14} /> Imprimir / Guardar PDF</button>
                    <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>
            </div>

            {/* Zona de trabajo: preview de la lámina + panel de edición */}
            <div className="flex-1 min-h-0 flex overflow-auto">
                {/* Panel de edición (no imprime) */}
                {editando && (
                    <div className="lamina-noprint w-72 shrink-0 bg-slate-100 border-r border-slate-300 p-4 space-y-3 overflow-y-auto text-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase">Datos del plano</p>
                        {planes && planes.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Rellenar cabecera desde un plan</label>
                                <select onChange={e => {
                                    const p = planes.find(x => x.id === e.target.value)
                                    if (!p) return
                                    setTituloPlan(p.nombre.toUpperCase())
                                    const sig = (TIPOS_PLAN as any)[p.tipo]?.sigla || ''
                                    setAnexo(`${sig ? sig + ' · ' : ''}Anexo de planos`)
                                }} defaultValue="" className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white">
                                    <option value="">— Elegir plan —</option>
                                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                        )}
                        <Campo label="Plan (cabecera)" v={tituloPlan} set={setTituloPlan} />
                        <Campo label="Anexo / subtítulo" v={anexo} set={setAnexo} />
                        <Campo label="Título del plano" v={tituloPlano} set={setTituloPlano} placeholder="Ej: Localización y encuadre territorial" />
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Descripción</label>
                            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} className="w-full border border-slate-300 rounded-lg p-2 text-xs" placeholder="Qué representa el plano y su finalidad dentro del plan." />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Campo label="Nº plano" v={numero} set={setNumero} />
                            <Campo label="De (total)" v={total} set={setTotal} />
                        </div>
                        <Campo label="Fecha" v={fecha} set={setFecha} />
                        {/* Escala: se fija con un botón (encuadre exacto) o sale del zoom libre */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Escala del plano</label>
                            <div className="text-sm font-bold text-slate-800 mb-1.5">1 : {fmtEscala(escalaNum)}</div>
                            <div className="flex flex-wrap gap-1">
                                {ESCALAS.map(N => (
                                    <button key={N} onClick={() => fijarEscala(N)}
                                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${Math.abs(escalaNum - N) / N < 0.02 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400'}`}>
                                        1:{fmtEscala(N)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Pulsa una escala para encuadrar exacto, o mueve el mapa libremente.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Tamaño de la tipografía del cajetín</label>
                            <div className="flex items-center gap-2">
                                <input type="range" min={0.8} max={1.5} step={0.05} value={factorFuente} onChange={e => setFactorFuente(parseFloat(e.target.value))} className="flex-1" />
                                <span className="text-xs font-bold text-slate-700 w-10 text-right">{Math.round(factorFuente * 100)}%</span>
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-500"><b>Proyección:</b> {PROYECCION}</div>
                        <p className="text-[11px] text-slate-400 leading-snug">La leyenda, las fuentes y la barra de escala se generan solas a partir de las capas activas.</p>
                    </div>
                )}

                {/* La lámina se muestra a TAMAÑO REAL: lo que se ve es exactamente lo
                    que se imprime. El mapa es interactivo → encuadras aquí mismo. */}
                <div className="flex-1 min-w-0 flex items-start justify-center p-6 overflow-auto">
                    <div className="lamina-print">
                        <div className="lamina-hoja shadow-2xl">
                          <div className="lamina-marco">
                            {/* ── 4/5: MAPA ── */}
                            <div ref={mapAreaRef} style={{ flex: '1 1 0', minWidth: 0, height: '100%', position: 'relative', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                                <MapContainer center={center} zoom={zoom} ref={mapRef as any}
                                    scrollWheelZoom attributionControl={false} zoomSnap={0} zoomDelta={0.25} maxZoom={22}
                                    style={{ height: '100%', width: '100%' }}>
                                    {baseActiva === 'callejero' && <TileLayer url={TILES_CALLEJERO.url} maxZoom={19} detectRetina />}
                                    {baseCapa?.wmsUrl && <WMSTileLayer url={baseCapa.wmsUrl} params={{ layers: baseCapa.wmsLayers || '', format: (baseCapa.wmsFormat || 'image/png') as any, transparent: false, version: (baseCapa.wmsVersion || '1.1.1') as any }} tileSize={512} detectRetina />}
                                    {renderCapas()}
                                    <SyncEscala onCambio={(lat, z) => setEscalaNum(escalaDe(lat, z))} />
                                </MapContainer>
                                {/* Rosa de los vientos: apunta siempre al norte; se puede
                                    arrastrar y redimensionar. Por defecto, abajo a la izquierda. */}
                                <RosaVientos contenedorRef={mapAreaRef} />
                            </div>

                            {/* ── 1/5: CAJETÍN ── */}
                            <div style={{ width: '20%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#0f172a', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                                {/* Cabecera (doble de altura) */}
                                <div style={{ background: VERDE, color: '#fff', padding: '18px 16px', minHeight: 78, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ fontSize: fs(19), fontWeight: 800, lineHeight: 1.12, letterSpacing: '0.01em' }}>{tituloPlan}</div>
                                    <div style={{ fontSize: fs(12), opacity: 0.92, marginTop: 4 }}>{anexo}</div>
                                </div>

                                {/* Mapa de situación (doble de tamaño) */}
                                <div style={{ height: 240, borderBottom: '1px solid #cbd5e1', position: 'relative' }}>
                                    <MapContainer center={center} zoom={9} ref={insetRef as any}
                                        dragging={false} scrollWheelZoom={false} doubleClickZoom={false} zoomControl={false} attributionControl={false} keyboard={false} touchZoom={false}
                                        style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url={TILES_CALLEJERO.url} maxZoom={19} />
                                        {geojsons['__termino'] && <GeoJSONLayer data={geojsons['__termino']} style={() => ({ color: '#dc2626', weight: 2.5, fillOpacity: 0.12, fillColor: '#dc2626' })} />}
                                    </MapContainer>
                                    <div style={{ position: 'absolute', bottom: 3, left: 5, fontSize: fs(9), color: '#334155', background: 'rgba(255,255,255,.8)', padding: '1px 5px', borderRadius: 3 }}>Situación en la comarca</div>
                                </div>

                                <div style={{ padding: '12px 14px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {/* Leyenda */}
                                    <div>
                                        <div style={{ fontSize: fs(14), fontWeight: 800, color: VERDE, marginBottom: 6 }}>Leyenda</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {baseActiva === 'callejero'
                                                ? <FilaLeyenda color="#e5e7eb" nombre="Callejero (OpenStreetMap)" caja sz={fs(11)} />
                                                : baseCapa ? <FilaLeyenda color="#e5e7eb" nombre={baseCapa.nombre} caja sz={fs(11)} /> : null}
                                            {capasActivas.map(c => <FilaLeyenda key={c.id} color={c.color || '#2563eb'} nombre={c.nombre} caja={c.tipo !== 'archivo'} sz={fs(11)} />)}
                                            {capasActivas.length === 0 && <span style={{ fontSize: fs(10), color: '#94a3b8' }}>Sin capas temáticas activas</span>}
                                        </div>
                                    </div>

                                    {/* Título del plano y descripción */}
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                                        <div style={{ fontSize: fs(11), fontWeight: 700, color: VERDE, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Título del plano</div>
                                        <div style={{ fontSize: fs(15), fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: 3 }}>{tituloPlano || '—'}</div>
                                        <div style={{ fontSize: fs(11), fontWeight: 700, color: VERDE, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 8 }}>Descripción</div>
                                        <div style={{ fontSize: fs(11), color: '#334155', lineHeight: 1.4, marginTop: 3, minHeight: fs(64), textAlign: 'justify', textJustify: 'inter-word' as any }}>{descripcion || '—'}</div>
                                    </div>

                                    {/* Datos técnicos (maquetados) */}
                                    <div style={{ marginTop: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                        <FilaDato label="N.º de plano" valor={`${numero} / ${total}`} sz={fs(11)} />
                                        <FilaDato label="Fecha" valor={fecha} sz={fs(11)} alt />
                                        <FilaDato label="Escala" valor={`1 : ${fmtEscala(escalaNum)}`} sz={fs(11)} />
                                        <div style={{ background: '#f8fafc', padding: '6px 8px', borderTop: '1px solid #f1f5f9' }}>
                                            <BarraEscala escala={escalaNum} />
                                        </div>
                                        <FilaDato label="Proyección" valor={PROYECCION} sz={fs(10)} alt />
                                        <FilaDato label="Fuentes" valor={fuentes.join(', ') || '—'} sz={fs(10)} />
                                    </div>

                                    {/* Logotipo del servicio, centrado y con aire */}
                                    <div style={{ padding: '10px 18px 6px', textAlign: 'center' }}>
                                        <img src="/logo-pcb-vertical.svg" alt="Protección Civil Bormujos"
                                            style={{ width: '66%', maxWidth: '66%', height: 'auto', margin: '0 auto', display: 'block' }} />
                                    </div>

                                    {/* Pie institucional + firma */}
                                    <div style={{ borderTop: `2px solid ${VERDE}`, paddingTop: 8, textAlign: 'center' }}>
                                        <div style={{ fontSize: fs(11.5), fontWeight: 800, color: VERDE, lineHeight: 1.2 }}>Servicio de Protección Civil y Emergencias</div>
                                        <div style={{ fontSize: fs(10.5), color: '#64748b' }}>Ayuntamiento de Bormujos</div>
                                        <div style={{ marginTop: 6, fontSize: fs(9.5), color: '#334155', lineHeight: 1.3 }}>
                                            <span style={{ color: '#64748b' }}>Elaborado por:</span> <b>Emilio Simón Gómez</b><br />
                                            Jefe del Servicio de Protección Civil y Emergencias
                                        </div>
                                    </div>
                                </div>
                            </div>
                          </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Rosa de los vientos sobre el mapa: apunta SIEMPRE al norte (el norte del mapa
// es arriba). Se puede arrastrar para moverla y redimensionar con el tirador de
// la esquina. Por defecto se coloca abajo a la izquierda. El tirador no se imprime.
function RosaVientos({ contenedorRef }: { contenedorRef: RefObject<HTMLDivElement> }) {
    const [size, setSize] = useState(78)
    const [pos, setPos] = useState<{ left: number; top: number | null }>({ left: 14, top: null })
    const arrastre = useRef<{ mode: 'mover' | 'redim'; px: number; py: number; left: number; top: number; size: number } | null>(null)

    const mover = useCallback((e: PointerEvent) => {
        const st = arrastre.current
        if (!st) return
        const cont = contenedorRef.current
        const w = cont?.clientWidth ?? 800, h = cont?.clientHeight ?? 600
        const dx = e.clientX - st.px, dy = e.clientY - st.py
        if (st.mode === 'redim') {
            setSize(Math.max(44, Math.min(240, st.size + dx)))
        } else {
            setPos({
                left: Math.max(0, Math.min(w - st.size, st.left + dx)),
                top: Math.max(0, Math.min(h - st.size, st.top + dy)),
            })
        }
    }, [contenedorRef])
    const soltar = useCallback(() => {
        arrastre.current = null
        window.removeEventListener('pointermove', mover)
        window.removeEventListener('pointerup', soltar)
    }, [mover])
    useEffect(() => () => soltar(), [soltar])

    const onDown = (mode: 'mover' | 'redim') => (e: ReactPointerEvent) => {
        e.stopPropagation(); e.preventDefault()
        const cont = contenedorRef.current
        const h = cont?.clientHeight ?? 600
        const top = pos.top ?? (h - size - 14)   // convertir "abajo" a coordenada top
        arrastre.current = { mode, px: e.clientX, py: e.clientY, left: pos.left, top, size }
        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
    }

    const s = size
    return (
        <div onPointerDown={onDown('mover')}
            style={{ position: 'absolute', left: pos.left, ...(pos.top != null ? { top: pos.top } : { bottom: 14 }), width: s, height: s, cursor: 'move', zIndex: 500, touchAction: 'none' }}>
            <img src="/rosa-de-los-vientos.svg" alt="Norte" width={s} height={s}
                style={{ display: 'block', width: s, height: s, pointerEvents: 'none', userSelect: 'none' }} draggable={false} />
            {/* Tirador de redimensión (no se imprime) */}
            <div className="lamina-noprint" onPointerDown={onDown('redim')}
                style={{ position: 'absolute', right: -5, bottom: -5, width: 15, height: 15, background: '#0f172a', border: '2px solid #fff', borderRadius: 4, cursor: 'nwse-resize', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }}
                title="Arrastra para redimensionar" />
        </div>
    )
}

// Actualiza la escala del cajetín al reencuadrar el mapa (así siempre es exacta).
function SyncEscala({ onCambio }: { onCambio: (lat: number, z: number) => void }) {
    const map = useMapEvents({
        zoomend: () => onCambio(map.getCenter().lat, map.getZoom()),
        moveend: () => onCambio(map.getCenter().lat, map.getZoom()),
    })
    return null
}

function Campo({ label, v, set, placeholder }: { label: string; v: string; set: (s: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            <input value={v} onChange={e => set(e.target.value)} placeholder={placeholder} className="w-full border border-slate-300 rounded-lg p-1.5 text-xs" />
        </div>
    )
}

function FilaLeyenda({ color, nombre, caja, sz = 9 }: { color: string; nombre: string; caja?: boolean; sz?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {caja
                ? <span style={{ width: sz * 1.7, height: sz * 1.15, background: color, border: '1px solid #94a3b8', borderRadius: 2, flexShrink: 0 }} />
                : <span style={{ width: sz * 1.9, height: 0, borderTop: `${Math.max(3, sz * 0.32)}px solid ${color}`, flexShrink: 0 }} />}
            <span style={{ fontSize: sz, color: '#334155', lineHeight: 1.2 }}>{nombre}</span>
        </div>
    )
}

// Fila etiqueta/valor del bloque técnico del cajetín (maquetación de tabla).
function FilaDato({ label, valor, sz, alt }: { label: string; valor: string; sz: number; alt?: boolean }) {
    return (
        <div style={{ display: 'flex', gap: 8, padding: '5px 8px', background: alt ? '#f8fafc' : '#fff', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: sz, color: '#64748b', fontWeight: 600, flex: '0 0 38%' }}>{label}</span>
            <span style={{ fontSize: sz, color: '#0f172a', fontWeight: 700, flex: 1, wordBreak: 'break-word', lineHeight: 1.25 }}>{valor}</span>
        </div>
    )
}

// Barra de escala gráfica: dibuja un segmento con su equivalencia en metros.
function BarraEscala({ escala }: { escala: number }) {
    // A 96 ppp, 40 mm de barra. Ground = escala * 0,040 m.
    const anchoMm = 40
    const metros = Math.round((escala * anchoMm) / 1000)
    const etiqueta = metros >= 1000 ? `${(metros / 1000).toFixed(metros % 1000 === 0 ? 0 : 1)} km` : `${metros} m`
    return (
        <div style={{ marginTop: 2 }}>
            <div style={{ display: 'flex', width: `${anchoMm}mm`, height: 6, border: '1px solid #334155' }}>
                <div style={{ flex: 1, background: '#334155' }} /><div style={{ flex: 1, background: '#fff' }} />
                <div style={{ flex: 1, background: '#334155' }} /><div style={{ flex: 1, background: '#fff' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#475569', width: `${anchoMm}mm` }}>
                <span>0</span><span>{etiqueta}</span>
            </div>
        </div>
    )
}
