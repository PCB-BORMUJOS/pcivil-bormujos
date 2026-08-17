'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON as GeoJSONLayer, useMapEvents } from 'react-leaflet'
import { X, Printer } from 'lucide-react'
import { TILES_CALLEJERO } from '@/lib/cartografia'
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
    onCerrar: () => void
}

// Denominador de escala aproximado para impresión a 96 ppp (1 px CSS = 0,2646 mm).
function escalaAprox(lat: number, zoom: number): number {
    const mppx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
    const metrosPorMetroPapel = mppx / 0.0002645833
    return Math.round(metrosPorMetroPapel)
}
// Redondea a una escala "de plano" habitual.
function escalaBonita(n: number): number {
    const escalas = [500, 1000, 2000, 2500, 5000, 10000, 15000, 20000, 25000, 50000, 100000, 200000]
    let best = escalas[0]
    for (const e of escalas) if (Math.abs(e - n) < Math.abs(best - n)) best = e
    return best
}

const VERDE = '#2f5233'  // verde institucional del cajetín

export default function LaminaPlano({
    center, zoom, baseActiva, baseCapa, capasActivas, opacidades, geojsons, contexto, onCerrar,
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

    // Cajetín editable (el usuario ajusta lo específico de cada plano).
    const [tituloPlan, setTituloPlan] = useState(contexto?.nombre || 'PLAN DE EMERGENCIA')
    const [anexo, setAnexo] = useState(contexto?.anexo || 'Anexo · Planos')
    const [tituloPlano, setTituloPlano] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [numero, setNumero] = useState('00')
    const [total, setTotal] = useState('00')
    const [fecha, setFecha] = useState(mmAaaa)
    const [escalaTxt, setEscalaTxt] = useState(String(escalaBonita(escalaAprox(center[0], zoom))))
    const [proyeccion, setProyeccion] = useState('ETRS89 / UTM 30N (EPSG:25830)')
    const [pagina, setPagina] = useState<'A3' | 'A4'>('A3')
    const [editando, setEditando] = useState(true)

    const mapRef = useRef<any>(null)
    const insetRef = useRef<any>(null)
    useEffect(() => {
        const t = setTimeout(() => { mapRef.current?.invalidateSize(false); insetRef.current?.invalidateSize(false) }, 250)
        return () => clearTimeout(t)
    }, [pagina])

    // Render de las capas (idéntico al visor) para el mapa de la lámina.
    const renderCapas = () => capasActivas.map(c => {
        if (c.tipo === 'wms' && c.wmsUrl) {
            return <WMSTileLayer key={c.id} url={c.wmsUrl} opacity={opacidades[c.id] ?? c.opacidad}
                params={{ layers: c.wmsLayers || '', format: (c.wmsFormat || 'image/png') as any, transparent: true, version: (c.wmsVersion || '1.1.1') as any }}
                tileSize={512} detectRetina={false} />
        }
        const geo = geojsons[c.id]
        if (!geo) return null
        return <GeoJSONLayer key={c.id} data={geo} style={(f: any) => {
            const op = opacidades[c.id] ?? c.opacidad
            const esLinea = String(f?.geometry?.type || '').includes('LineString')
            return { color: c.color, weight: esLinea ? 3.5 : 2.5, opacity: op, fillColor: c.color, fillOpacity: esLinea ? 0 : op * 0.25, className: 'capa-contraste' }
        }} />
    })

    // Dimensiones de la lámina en mm (apaisado). 4/5 mapa · 1/5 cajetín.
    const dim = pagina === 'A3' ? { w: 420, h: 297 } : { w: 297, h: 210 }

    return (
        <div className="fixed inset-0 z-[1400] bg-slate-800/95 flex flex-col">
            {/* Estilos de impresión: al imprimir solo se ve la lámina, a tamaño de página. */}
            <style>{`
                .lamina-hoja { width: ${dim.w}mm; height: ${dim.h}mm; background:#fff; display:flex; }
                .lamina-contraste { filter: drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff); }
                @media print {
                    @page { size: ${pagina} landscape; margin: 0; }
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
                <div className="flex items-center gap-2 text-sm font-semibold"><Printer size={16} /> Crear plano para imprimir</div>
                <div className="flex items-center gap-2">
                    <select value={pagina} onChange={e => setPagina(e.target.value as any)} className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs">
                        <option value="A3">A3 apaisado</option>
                        <option value="A4">A4 apaisado</option>
                    </select>
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
                        <div className="grid grid-cols-2 gap-2">
                            <Campo label="Fecha" v={fecha} set={setFecha} />
                            <Campo label="Escala 1:" v={escalaTxt} set={setEscalaTxt} />
                        </div>
                        <Campo label="Proyección" v={proyeccion} set={setProyeccion} />
                        <p className="text-[11px] text-slate-400 leading-snug">La leyenda, las fuentes y la barra de escala se generan solas a partir de las capas activas.</p>
                    </div>
                )}

                {/* La lámina se muestra a TAMAÑO REAL: lo que se ve es exactamente lo
                    que se imprime. El mapa es interactivo → encuadras aquí mismo. */}
                <div className="flex-1 min-w-0 flex items-start justify-center p-6 overflow-auto">
                    <div className="lamina-print">
                        <div className="lamina-hoja shadow-2xl">
                            {/* ── 4/5: MAPA ── */}
                            <div style={{ width: '80%', height: '100%', position: 'relative' }}>
                                <MapContainer center={center} zoom={zoom} ref={mapRef as any}
                                    scrollWheelZoom attributionControl={false}
                                    style={{ height: '100%', width: '100%' }}>
                                    {baseActiva === 'callejero' && <TileLayer url={TILES_CALLEJERO.url} maxZoom={19} />}
                                    {baseCapa?.wmsUrl && <WMSTileLayer url={baseCapa.wmsUrl} params={{ layers: baseCapa.wmsLayers || '', format: (baseCapa.wmsFormat || 'image/png') as any, transparent: false, version: (baseCapa.wmsVersion || '1.1.1') as any }} tileSize={512} detectRetina={false} />}
                                    {renderCapas()}
                                    <SyncEscala onCambio={(lat, z) => setEscalaTxt(String(escalaBonita(escalaAprox(lat, z))))} />
                                </MapContainer>
                                {/* Rosa de los vientos */}
                                <svg width="46" height="46" viewBox="0 0 46 46" style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.82)', borderRadius: 8, padding: 3 }}>
                                    <polygon points="23,5 28,23 23,20 18,23" fill="#1f2937" />
                                    <polygon points="23,41 18,23 23,26 28,23" fill="#9ca3af" />
                                    <text x="23" y="14" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1f2937">N</text>
                                </svg>
                            </div>

                            {/* ── 1/5: CAJETÍN ── */}
                            <div style={{ width: '20%', height: '100%', borderLeft: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
                                {/* Cabecera */}
                                <div style={{ background: VERDE, color: '#fff', padding: '10px 12px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.15 }}>{tituloPlan}</div>
                                    <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>{anexo}</div>
                                </div>

                                {/* Mapa de situación */}
                                <div style={{ height: 120, borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                                    <MapContainer center={center} zoom={9} ref={insetRef as any}
                                        dragging={false} scrollWheelZoom={false} doubleClickZoom={false} zoomControl={false} attributionControl={false} keyboard={false} touchZoom={false}
                                        style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url={TILES_CALLEJERO.url} maxZoom={19} />
                                        {geojsons['__termino'] && <GeoJSONLayer data={geojsons['__termino']} style={() => ({ color: '#dc2626', weight: 2, fillOpacity: 0.12, fillColor: '#dc2626' })} />}
                                    </MapContainer>
                                    <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 8, color: '#475569', background: 'rgba(255,255,255,.7)', padding: '0 3px', borderRadius: 3 }}>Situación en la comarca</div>
                                </div>

                                <div style={{ padding: '10px 12px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Leyenda */}
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>Leyenda</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {baseActiva === 'callejero'
                                                ? <FilaLeyenda color="#e5e7eb" nombre="Callejero (OpenStreetMap)" caja />
                                                : baseCapa ? <FilaLeyenda color="#e5e7eb" nombre={baseCapa.nombre} caja /> : null}
                                            {capasActivas.map(c => <FilaLeyenda key={c.id} color={c.color || '#2563eb'} nombre={c.nombre} caja={c.tipo !== 'archivo'} />)}
                                            {capasActivas.length === 0 && <span style={{ fontSize: 9, color: '#94a3b8' }}>Sin capas temáticas activas</span>}
                                        </div>
                                    </div>

                                    {/* Título del plano y descripción */}
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: VERDE, textTransform: 'uppercase' }}>Título del plano</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, marginTop: 1 }}>{tituloPlano || '—'}</div>
                                        {descripcion && <div style={{ fontSize: 8.5, color: '#475569', lineHeight: 1.3, marginTop: 4, textAlign: 'justify' }}>{descripcion}</div>}
                                    </div>

                                    {/* Datos técnicos */}
                                    <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: 6, fontSize: 9, color: '#334155', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <div><b>N.º de plano:</b> {numero} / {total} &nbsp;·&nbsp; <b>Fecha:</b> {fecha}</div>
                                        <div><b>Escala:</b> 1:{escalaTxt}</div>
                                        {/* Barra de escala gráfica (según la escala indicada) */}
                                        <BarraEscala escala={parseFloat(escalaTxt) || escalaAprox(center[0], zoom)} />
                                        <div><b>Proyección:</b> {proyeccion}</div>
                                        <div style={{ marginTop: 2 }}><b>Fuente:</b> {fuentes.join(', ') || '—'}</div>
                                    </div>

                                    {/* Pie institucional */}
                                    <div style={{ borderTop: `2px solid ${VERDE}`, marginTop: 6, paddingTop: 6, textAlign: 'center' }}>
                                        <div style={{ fontSize: 9, fontWeight: 800, color: VERDE, lineHeight: 1.2 }}>Servicio de Protección Civil y Emergencias</div>
                                        <div style={{ fontSize: 8.5, color: '#64748b' }}>Ayuntamiento de Bormujos</div>
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

function FilaLeyenda({ color, nombre, caja }: { color: string; nombre: string; caja?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {caja
                ? <span style={{ width: 14, height: 10, background: color, border: '1px solid #94a3b8', borderRadius: 2, flexShrink: 0 }} />
                : <span style={{ width: 16, height: 0, borderTop: `3px solid ${color}`, flexShrink: 0 }} />}
            <span style={{ fontSize: 9, color: '#334155', lineHeight: 1.15 }}>{nombre}</span>
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
