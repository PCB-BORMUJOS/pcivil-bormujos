'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
    Layers, Eye, EyeOff, Crosshair, Maximize2, Minimize2, AlertTriangle,
    MapPin, ChevronDown, Image as ImageIcon, Mountain, Map as MapIcon, Waves,
} from 'lucide-react'
import { BORMUJOS, TILES_CALLEJERO } from '@/lib/cartografia'

// Leaflet siempre con carga dinámica y sin render en servidor (regla del proyecto).
const MapContainer  = dynamic(() => import('react-leaflet').then(m => m.MapContainer),  { ssr: false })
const TileLayer     = dynamic(() => import('react-leaflet').then(m => m.TileLayer),     { ssr: false })
const WMSTileLayer  = dynamic(() => import('react-leaflet').then(m => m.WMSTileLayer),  { ssr: false })
const GeoJSONLayer  = dynamic(() => import('react-leaflet').then(m => m.GeoJSON),       { ssr: false })
const CircleMarker  = dynamic(() => import('react-leaflet').then(m => m.CircleMarker),  { ssr: false })
const Popup         = dynamic(() => import('react-leaflet').then(m => m.Popup),         { ssr: false })
const ScaleControl  = dynamic(() => import('react-leaflet').then(m => m.ScaleControl),  { ssr: false })

export type Capa = {
    id: string
    nombre: string
    descripcion: string | null
    categoria: string
    tipo: string
    wmsUrl: string | null
    wmsLayers: string | null
    wmsVersion: string | null
    wmsFormat: string | null
    atribucion: string | null
    geojsonUrl: string | null
    nombreArchivo: string | null
    numElementos: number | null
    bbox: number[] | null
    color: string
    opacidad: number
    visiblePorDefecto: boolean
    esOficial: boolean
}

export type PuntoPlan = {
    id: string
    nombre: string
    tipo: string
    direccion: string | null
    latitud: number
    longitud: number
    estado: string
    colorPunto: string
}

/** Icono orientativo según el nombre de la capa, para que el panel se lea de un vistazo. */
function iconoCapa(nombre: string) {
    const n = nombre.toLowerCase()
    if (n.includes('ortofoto')) return ImageIcon
    if (n.includes('topográfico') || n.includes('topografico')) return Mountain
    if (n.includes('agua') || n.includes('hidro') || n.includes('inund')) return Waves
    return MapIcon
}

export default function MapaCartografia({
    capas,
    puntos,
    alPulsarPunto,
    altura = '100%',
}: {
    capas: Capa[]
    puntos: PuntoPlan[]
    alPulsarPunto?: (id: string) => void
    altura?: string
}) {
    const capasBase = useMemo(() => capas.filter(c => c.categoria === 'base'), [capas])
    const capasTema = useMemo(() => capas.filter(c => c.categoria !== 'base'), [capas])

    // 'callejero' es el fondo por defecto y no vive en base de datos: son teselas.
    const [baseActiva, setBaseActiva] = useState<string>('callejero')
    const [activas, setActivas] = useState<Set<string>>(
        () => new Set(capas.filter(c => c.categoria !== 'base' && c.visiblePorDefecto).map(c => c.id)),
    )
    const [opacidades, setOpacidades] = useState<Record<string, number>>(
        () => Object.fromEntries(capas.map(c => [c.id, c.opacidad])),
    )
    const [geojsons, setGeojsons] = useState<Record<string, any>>({})
    const [fallidas, setFallidas] = useState<Set<string>>(new Set())
    const [panelAbierto, setPanelAbierto] = useState(true)
    const [pantallaCompleta, setPantallaCompleta] = useState(false)
    const [mostrarPuntos, setMostrarPuntos] = useState(true)
    const mapRef = useRef<any>(null)

    // Sincronizar cuando llegan las capas del servidor
    useEffect(() => {
        setOpacidades(prev => {
            const next = { ...prev }
            for (const c of capas) if (next[c.id] === undefined) next[c.id] = c.opacidad
            return next
        })
        setActivas(prev => {
            if (prev.size > 0) return prev
            return new Set(capas.filter(c => c.categoria !== 'base' && c.visiblePorDefecto).map(c => c.id))
        })
    }, [capas])

    // Descargar la geometría de las capas de fichero solo cuando se encienden
    useEffect(() => {
        for (const c of capasTema) {
            if (c.tipo !== 'archivo' || !c.geojsonUrl) continue
            if (!activas.has(c.id) || geojsons[c.id] || fallidas.has(c.id)) continue
            fetch(c.geojsonUrl)
                .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
                .then(g => setGeojsons(prev => ({ ...prev, [c.id]: g })))
                .catch(() => setFallidas(prev => new Set(prev).add(c.id)))
        }
    }, [activas, capasTema, geojsons, fallidas])

    const alternar = (id: string) =>
        setActivas(prev => {
            const s = new Set(prev)
            s.has(id) ? s.delete(id) : s.add(id)
            return s
        })

    const centrar = () => mapRef.current?.setView(BORMUJOS.centro, BORMUJOS.zoom)

    const encuadrarCapa = (c: Capa) => {
        if (!c.bbox || !mapRef.current) return
        const [minLon, minLat, maxLon, maxLat] = c.bbox
        mapRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30] })
    }

    const baseSeleccionada = capasBase.find(c => c.id === baseActiva)
    const nActivas = activas.size

    return (
        <div
            className={pantallaCompleta
                ? 'fixed inset-0 z-[1200] bg-slate-900'
                : 'relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100'}
            style={pantallaCompleta ? undefined : { height: altura }}
        >
            <MapContainer
                center={BORMUJOS.centro}
                zoom={BORMUJOS.zoom}
                minZoom={BORMUJOS.zoomMin}
                maxZoom={BORMUJOS.zoomMax}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
                ref={mapRef as any}
            >
                {/* ── Fondo ── */}
                {baseActiva === 'callejero' && (
                    <TileLayer url={TILES_CALLEJERO.url} attribution={TILES_CALLEJERO.atribucion} maxZoom={19} />
                )}
                {baseSeleccionada?.wmsUrl && (
                    <WMSTileLayer
                        key={baseSeleccionada.id}
                        url={baseSeleccionada.wmsUrl}
                        params={{
                            layers: baseSeleccionada.wmsLayers || '',
                            format: (baseSeleccionada.wmsFormat || 'image/png') as any,
                            transparent: false,
                            version: (baseSeleccionada.wmsVersion || '1.1.1') as any,
                        }}
                        attribution={baseSeleccionada.atribucion || ''}
                        eventHandlers={{ tileerror: () => setFallidas(p => new Set(p).add(baseSeleccionada.id)) }}
                    />
                )}

                {/* ── Capas temáticas encendidas ── */}
                {capasTema.filter(c => activas.has(c.id)).map(c => {
                    if (c.tipo === 'wms' && c.wmsUrl) {
                        return (
                            <WMSTileLayer
                                key={c.id}
                                url={c.wmsUrl}
                                opacity={opacidades[c.id] ?? c.opacidad}
                                params={{
                                    layers: c.wmsLayers || '',
                                    format: (c.wmsFormat || 'image/png') as any,
                                    transparent: true,
                                    version: (c.wmsVersion || '1.1.1') as any,
                                }}
                                attribution={c.atribucion || ''}
                                eventHandlers={{ tileerror: () => setFallidas(p => new Set(p).add(c.id)) }}
                            />
                        )
                    }
                    const geo = geojsons[c.id]
                    if (!geo) return null
                    return (
                        <GeoJSONLayer
                            key={c.id}
                            data={geo}
                            style={() => ({
                                color: c.color,
                                weight: 2,
                                opacity: opacidades[c.id] ?? c.opacidad,
                                fillColor: c.color,
                                fillOpacity: (opacidades[c.id] ?? c.opacidad) * 0.28,
                            })}
                            onEachFeature={(feature: any, layer: any) => {
                                const props = feature?.properties || {}
                                const filas = Object.entries(props).slice(0, 8)
                                    .filter(([, v]) => v !== null && v !== '')
                                    .map(([k, v]) => `<div style="display:flex;gap:8px"><b style="color:#64748b;font-weight:600">${k}</b><span>${String(v)}</span></div>`)
                                    .join('')
                                layer.bindPopup(
                                    `<div style="font-size:12px;max-width:260px">
                                        <div style="font-weight:700;margin-bottom:6px;color:${c.color}">${c.nombre}</div>
                                        ${filas || '<span style="color:#94a3b8">Sin datos asociados</span>'}
                                     </div>`,
                                )
                            }}
                        />
                    )
                })}

                {/* ── Emplazamientos de los planes ── */}
                {mostrarPuntos && puntos.map(p => (
                    <CircleMarker
                        key={p.id}
                        center={[p.latitud, p.longitud]}
                        radius={9}
                        pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: p.colorPunto, fillOpacity: 0.95 }}
                        eventHandlers={{ click: () => alPulsarPunto?.(p.id) }}
                    >
                        <Popup>
                            <div style={{ minWidth: 170 }}>
                                <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>{p.nombre}</p>
                                {p.direccion && <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>{p.direccion}</p>}
                                <button
                                    onClick={() => alPulsarPunto?.(p.id)}
                                    style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                                >
                                    Ver ficha del plan →
                                </button>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                <ScaleControl position="bottomleft" imperial={false} />
            </MapContainer>

            {/* ── Botonera flotante ── */}
            <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
                <button
                    onClick={() => setPanelAbierto(v => !v)}
                    title="Capas del mapa"
                    className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center transition-colors ${panelAbierto
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white/95 backdrop-blur text-slate-700 border-slate-200 hover:bg-white'}`}
                >
                    <Layers size={17} />
                </button>
                <button
                    onClick={centrar}
                    title="Centrar en Bormujos"
                    className="w-10 h-10 rounded-xl shadow-lg border border-slate-200 bg-white/95 backdrop-blur text-slate-700 hover:bg-white flex items-center justify-center"
                >
                    <Crosshair size={17} />
                </button>
                <button
                    onClick={() => setPantallaCompleta(v => !v)}
                    title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    className="w-10 h-10 rounded-xl shadow-lg border border-slate-200 bg-white/95 backdrop-blur text-slate-700 hover:bg-white flex items-center justify-center"
                >
                    {pantallaCompleta ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
            </div>

            {/* ── Panel de capas ── */}
            {panelAbierto && (
                <div className="absolute top-3 right-16 z-[500] w-[19rem] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl bg-white/97 backdrop-blur shadow-2xl border border-slate-200">
                    <div className="sticky top-0 bg-white/97 backdrop-blur px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers size={15} className="text-blue-600" />
                            <h3 className="text-sm font-bold text-slate-800">Capas del mapa</h3>
                        </div>
                        {nActivas > 0 && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                {nActivas} activa{nActivas !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Fondo */}
                    <div className="p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fondo del mapa</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            <BotonBase
                                activo={baseActiva === 'callejero'}
                                onClick={() => setBaseActiva('callejero')}
                                icono={MapIcon}
                                etiqueta="Callejero"
                            />
                            {capasBase.map(c => (
                                <BotonBase
                                    key={c.id}
                                    activo={baseActiva === c.id}
                                    onClick={() => setBaseActiva(c.id)}
                                    icono={iconoCapa(c.nombre)}
                                    etiqueta={c.nombre.replace(/\s*\(.*\)/, '')}
                                    fallida={fallidas.has(c.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Temáticas */}
                    <div className="px-3 pb-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capas superpuestas</p>
                        <div className="space-y-1">
                            {capasTema.length === 0 && (
                                <p className="text-xs text-slate-400 py-2">No hay capas temáticas todavía.</p>
                            )}
                            {capasTema.map(c => {
                                const on = activas.has(c.id)
                                const Icono = iconoCapa(c.nombre)
                                const falla = fallidas.has(c.id)
                                return (
                                    <div key={c.id} className={`rounded-xl border transition-colors ${on ? 'border-blue-200 bg-blue-50/60' : 'border-transparent hover:bg-slate-50'}`}>
                                        <button
                                            onClick={() => alternar(c.id)}
                                            className="w-full flex items-start gap-2.5 p-2.5 text-left"
                                        >
                                            <span className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <Icono size={14} />
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="flex items-center gap-1.5">
                                                    <span className={`text-xs font-semibold truncate ${on ? 'text-blue-900' : 'text-slate-700'}`}>{c.nombre}</span>
                                                    {c.tipo === 'archivo' && (
                                                        <span className="text-[9px] font-bold text-violet-700 bg-violet-100 rounded px-1 flex-shrink-0">PROPIA</span>
                                                    )}
                                                </span>
                                                {c.descripcion && (
                                                    <span className="block text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{c.descripcion}</span>
                                                )}
                                                {falla && (
                                                    <span className="flex items-center gap-1 text-[10px] text-red-600 mt-1">
                                                        <AlertTriangle size={10} /> El servicio no responde
                                                    </span>
                                                )}
                                            </span>
                                            <span className={`mt-1 flex-shrink-0 ${on ? 'text-blue-600' : 'text-slate-300'}`}>
                                                {on ? <Eye size={15} /> : <EyeOff size={15} />}
                                            </span>
                                        </button>
                                        {on && (
                                            <div className="px-2.5 pb-2.5 flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500 w-14 flex-shrink-0">Opacidad</span>
                                                <input
                                                    type="range" min={0.1} max={1} step={0.05}
                                                    value={opacidades[c.id] ?? c.opacidad}
                                                    onChange={e => setOpacidades(p => ({ ...p, [c.id]: Number(e.target.value) }))}
                                                    className="flex-1 accent-blue-600 h-1"
                                                />
                                                {c.bbox && (
                                                    <button
                                                        onClick={() => encuadrarCapa(c)}
                                                        title="Encuadrar el mapa en esta capa"
                                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                    >
                                                        Encuadrar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Emplazamientos */}
                    {puntos.length > 0 && (
                        <div className="px-3 pb-3 border-t border-slate-100 pt-3">
                            <button
                                onClick={() => setMostrarPuntos(v => !v)}
                                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${mostrarPuntos ? 'border-emerald-200 bg-emerald-50/60' : 'border-transparent hover:bg-slate-50'}`}
                            >
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${mostrarPuntos ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <MapPin size={14} />
                                </span>
                                <span className="flex-1 text-left">
                                    <span className={`block text-xs font-semibold ${mostrarPuntos ? 'text-emerald-900' : 'text-slate-700'}`}>
                                        Emplazamientos
                                    </span>
                                    <span className="block text-[10px] text-slate-500">{puntos.length} plan{puntos.length !== 1 ? 'es' : ''} localizado{puntos.length !== 1 ? 's' : ''}</span>
                                </span>
                                <span className={mostrarPuntos ? 'text-emerald-600' : 'text-slate-300'}>
                                    {mostrarPuntos ? <Eye size={15} /> : <EyeOff size={15} />}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function BotonBase({
    activo, onClick, icono: Icono, etiqueta, fallida,
}: { activo: boolean; onClick: () => void; icono: any; etiqueta: string; fallida?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-[10px] font-semibold transition-all ${activo
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
        >
            <Icono size={15} />
            <span className="text-center leading-tight">{etiqueta}</span>
            {fallida && <AlertTriangle size={10} className="absolute top-1 right-1 text-red-500" />}
        </button>
    )
}
