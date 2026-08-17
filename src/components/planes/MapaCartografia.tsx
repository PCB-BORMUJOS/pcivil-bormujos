'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Layers, Eye, EyeOff, Crosshair, Maximize2, Minimize2, AlertTriangle,
    MapPin, ChevronDown, Image as ImageIcon, Mountain, Map as MapIcon, Waves, Printer,
} from 'lucide-react'
import { BORMUJOS, TILES_CALLEJERO, ORDEN_GRUPOS } from '@/lib/cartografia'
import LaminaPlano from './LaminaPlano'

// OJO: el CSS de Leaflet NO se importa aquí, sino en la página que monta este
// componente. Comprobado en el build: importado en este fichero su CSS acaba en
// un chunk aparte (porque la página carga el componente con dynamic) y no entra
// en el paquete de la ruta, con lo que el mapa se queda gris y sin interacción.
//
// Importación estática a propósito. La regla del proyecto (Leaflet nunca en el
// servidor) se cumple un nivel más arriba: la página carga este componente con
// dynamic({ ssr: false }). Hacerlo además aquí, componente a componente, rompía
// el ref del mapa —next/dynamic no propaga refs—, y con mapRef siempre en null
// invalidateSize, el centrado y el encuadre no hacían nada.
import {
    MapContainer,
    TileLayer,
    WMSTileLayer,
    GeoJSON as GeoJSONLayer,
    CircleMarker,
    Popup,
    ScaleControl,
} from 'react-leaflet'

export type Capa = {
    id: string
    nombre: string
    descripcion: string | null
    categoria: string
    grupo: string
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
    contexto,
    planes,
}: {
    capas: Capa[]
    puntos: PuntoPlan[]
    alPulsarPunto?: (id: string) => void
    altura?: string
    contexto?: { nombre?: string; anexo?: string }
    planes?: Array<{ id: string; nombre: string; tipo: string }>
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
    const [cargandoTeselas, setCargandoTeselas] = useState(0)
    const mapRef = useRef<any>(null)
    const contenedorRef = useRef<HTMLDivElement>(null)

    // Leaflet solo mide su contenedor al montarse. Si después cambia de tamaño
    // —al abrir el panel, entrar en pantalla completa o al mostrarse la pestaña—
    // se queda con la medida antigua y aparecen franjas grises con las teselas
    // descolocadas. Un ResizeObserver lo mantiene sincronizado.
    useEffect(() => {
        const cont = contenedorRef.current
        if (!cont) return
        const ro = new ResizeObserver(() => {
            requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: false }))
        })
        ro.observe(cont)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        const t = setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 220)
        return () => clearTimeout(t)
    }, [pantallaCompleta, panelAbierto])

    /**
     * Ajustes comunes de las capas WMS. Teselas de 512 en vez de 256: se piden
     * cuatro veces menos imágenes, se ven muchas menos costuras y los servidores
     * de la Junta y el IGN responden mejor. Además, no se recargan mientras se
     * arrastra o se hace zoom, que es lo que hacía la navegación incómoda.
     */
    const opcionesTesela = {
        tileSize: 512,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        detectRetina: false,
    } as const

    /**
     * Los servidores oficiales pierden teselas de vez en cuando, y Leaflet no
     * reintenta: deja un cuadro gris en el mapa. Aquí se reintenta cada tesela
     * fallida hasta dos veces antes de rendirse.
     *
     * Y la capa solo se marca como caída tras varios fallos seguidos: con un
     * único tropiezo se avisaba de "servicio no disponible" sin motivo.
     */
    const fallosPorCapa = useRef<Record<string, number>>({})
    const UMBRAL_CAPA_CAIDA = 6

    const manejadoresCarga = (id: string) => ({
        loading: () => setCargandoTeselas(n => n + 1),
        load: () => setCargandoTeselas(n => Math.max(0, n - 1)),
        tileerror: (e: any) => {
            setCargandoTeselas(n => Math.max(0, n - 1))

            const tesela = e?.tile as (HTMLImageElement & { _intentos?: number }) | undefined
            if (tesela) {
                tesela._intentos = (tesela._intentos ?? 0) + 1
                if (tesela._intentos <= 2) {
                    const src = tesela.src
                    // El parámetro extra fuerza a saltarse la caché del navegador.
                    setTimeout(() => {
                        tesela.src = `${src}${src.includes('?') ? '&' : '?'}_r=${tesela._intentos}`
                    }, 400 * tesela._intentos)
                    return
                }
            }

            fallosPorCapa.current[id] = (fallosPorCapa.current[id] ?? 0) + 1
            if (fallosPorCapa.current[id] >= UMBRAL_CAPA_CAIDA) {
                setFallidas(p => new Set(p).add(id))
            }
        },
    })

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

    // Datos capturados para la lámina imprimible (encuadre + capas activas).
    const [lamina, setLamina] = useState<any>(null)
    const abrirLamina = async () => {
        const m = mapRef.current
        if (!m) return
        const c = m.getCenter(), z = m.getZoom()
        // El mapa de situación del cajetín necesita el límite municipal.
        if (!geojsons['__termino']) {
            try {
                const g = await fetch('/cartografia/termino-bormujos.geojson').then(r => r.json())
                setGeojsons(prev => ({ ...prev, __termino: g }))
            } catch { /* el cajetín funciona igual sin el mini-mapa */ }
        }
        setLamina({
            center: [c.lat, c.lng] as [number, number],
            zoom: z,
            baseActiva,
            baseCapa: capasBase.find(x => x.id === baseActiva),
            capasActivas: capasTema.filter(x => activas.has(x.id)),
        })
    }

    const encuadrarCapa = (c: Capa) => {
        if (!c.bbox || !mapRef.current) return
        const [minLon, minLat, maxLon, maxLat] = c.bbox
        mapRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30] })
    }

    const baseSeleccionada = capasBase.find(c => c.id === baseActiva)
    const nActivas = activas.size

    // Capas temáticas repartidas por sección, en el orden del catálogo.
    const gruposOrdenados = useMemo(() => {
        const mapa = new Map<string, Capa[]>()
        for (const c of capasTema) {
            const g = c.grupo || 'Otras'
            if (!mapa.has(g)) mapa.set(g, [])
            mapa.get(g)!.push(c)
        }
        const posicion = (g: string) => {
            const i = ORDEN_GRUPOS.indexOf(g)
            return i === -1 ? ORDEN_GRUPOS.length : i
        }
        return Array.from(mapa.entries()).sort((a, b) => posicion(a[0]) - posicion(b[0]))
    }, [capasTema])

    // Al entrar solo se despliegan las secciones que ya traen algo encendido;
    // el resto quedan plegadas para que el panel se lea de una ojeada.
    const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set())
    const gruposIniciados = useRef(false)
    useEffect(() => {
        if (gruposIniciados.current || gruposOrdenados.length === 0) return
        gruposIniciados.current = true
        const conAlgo = gruposOrdenados
            .filter(([, lista]) => lista.some(c => c.visiblePorDefecto))
            .map(([g]) => g)
        setGruposAbiertos(new Set(conAlgo.length ? conAlgo : [gruposOrdenados[0][0]]))
    }, [gruposOrdenados])

    return (
        <div
            className={pantallaCompleta
                ? 'fixed inset-0 z-[1200] bg-slate-900 flex gap-0 lg:gap-3 lg:p-3'
                : 'flex gap-3'}
            style={pantallaCompleta ? undefined : { height: altura }}
        >
            {/* Halo blanco alrededor de las capas vectoriales: hace que su color
                resalte sobre cualquier fondo (ortofoto, topográfico, callejero). */}
            <style>{`.leaflet-overlay-pane .capa-contraste{filter:drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff);}`}</style>
        {/* El mapa y el panel van UNO AL LADO DEL OTRO en pantallas grandes: si el
            panel flotase encima taparía justo la zona que se quiere mirar. */}
        <div
            ref={contenedorRef}
            className="relative flex-1 min-w-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100"
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
                        {...opcionesTesela}
                        eventHandlers={manejadoresCarga(baseSeleccionada.id)}
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
                                {...opcionesTesela}
                                eventHandlers={manejadoresCarga(c.id)}
                            />
                        )
                    }
                    const geo = geojsons[c.id]
                    if (!geo) return null
                    return (
                        <GeoJSONLayer
                            key={c.id}
                            data={geo}
                            style={(feature: any) => {
                                const op = opacidades[c.id] ?? c.opacidad
                                // Las líneas (límites, curvas) más gruesas y sin relleno;
                                // los polígonos con relleno tenue. El halo blanco (CSS) hace
                                // que el color resalte sobre ortofoto, topográfico o callejero.
                                const esLinea = String(feature?.geometry?.type || '').includes('LineString')
                                return {
                                    color: c.color,
                                    weight: esLinea ? 3.5 : 2.5,
                                    opacity: op,
                                    fillColor: c.color,
                                    fillOpacity: esLinea ? 0 : op * 0.25,
                                    className: 'capa-contraste',
                                }
                            }}
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
                <button
                    onClick={abrirLamina}
                    title="Crear plano para imprimir (PDF)"
                    className="w-10 h-10 rounded-xl shadow-lg border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-500 flex items-center justify-center"
                >
                    <Printer size={17} />
                </button>
            </div>

            {/* Aviso de carga: los servidores oficiales tardan, y sin esto parece
                que el mapa se ha quedado colgado. */}
            {cargandoTeselas > 0 && (
                <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-full px-3 py-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <span className="text-[11px] font-semibold text-slate-600">Cargando cartografía…</span>
                </div>
            )}
        </div>

            {/* ── Panel de capas, acoplado al lado del mapa ── */}
            {panelAbierto && (
                <div className="overflow-y-auto rounded-2xl bg-white shadow-sm border border-slate-200 flex-shrink-0 w-[19rem]
                    max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[1210] max-lg:w-[85vw] max-lg:max-w-sm max-lg:rounded-none max-lg:shadow-2xl">
                    <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
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

                    {/* Temáticas, agrupadas por sección plegable */}
                    <div className="px-3 pb-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capas superpuestas</p>
                        {capasTema.length === 0 && (
                            <p className="text-xs text-slate-400 py-2">No hay capas temáticas todavía.</p>
                        )}
                        {gruposOrdenados.map(([grupo, lista]) => {
                            const abierto = gruposAbiertos.has(grupo)
                            const encendidas = lista.filter(c => activas.has(c.id)).length
                            return (
                              <div key={grupo} className="mb-1.5">
                                <button
                                    onClick={() => setGruposAbiertos(prev => {
                                        const s = new Set(prev); s.has(grupo) ? s.delete(grupo) : s.add(grupo); return s
                                    })}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronDown size={13} className={`text-slate-400 transition-transform ${abierto ? '' : '-rotate-90'}`} />
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex-1 text-left">{grupo}</span>
                                    {encendidas > 0 && (
                                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 rounded-full px-1.5">{encendidas}</span>
                                    )}
                                    <span className="text-[10px] text-slate-400">{lista.length}</span>
                                </button>
                                {abierto && (
                                <div className="space-y-1 pl-1">
                            {lista.map(c => {
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
                                )}
                              </div>
                            )
                        })}
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

            {lamina && (
                <LaminaPlano
                    center={lamina.center}
                    zoom={lamina.zoom}
                    baseActiva={lamina.baseActiva}
                    baseCapa={lamina.baseCapa}
                    capasActivas={lamina.capasActivas}
                    opacidades={opacidades}
                    geojsons={geojsons}
                    contexto={contexto}
                    planes={planes}
                    onCerrar={() => setLamina(null)}
                />
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
