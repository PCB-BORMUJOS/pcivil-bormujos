'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    MapContainer, TileLayer, WMSTileLayer, Polyline, Polygon, Marker, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import {
    X, Save, Trash2, Route, Hexagon, MapPin, Type, MousePointer2, Upload,
    Check, Undo2, Plus, ChevronDown, Layers,
} from 'lucide-react'
import { BORMUJOS, TILES_CALLEJERO } from '@/lib/cartografia'
import type { Capa } from './MapaCartografia'

// ── Tipos internos ──────────────────────────────────────────────────────────
type Tipo = 'ruta' | 'area' | 'marcador' | 'texto'
type Herramienta = 'sel' | 'ruta' | 'area' | 'marcador' | 'texto'
type LatLng = [number, number]

interface Elem {
    id: string
    tipo: Tipo
    coords: LatLng[]      // ruta/area: vértices; marcador/texto: [punto]
    color: string
    grosor: number
    relleno: boolean
    iconoUrl?: string
    iconoTam: number
    texto?: string
    tamTexto: number
}

interface IconoMapa {
    id: string; nombre: string; categoria: string; url: string; esPredefinido: boolean
}

interface Anotacion {
    id: string; nombre: string; descripcion: string | null; categoria: string
    geojson: any; planId: string | null; color: string
}

const nid = () => `e${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`

// ── Conversión GeoJSON ↔ elementos ──────────────────────────────────────────
function elemAFeature(e: Elem): any {
    const props: any = { tipo: e.tipo, color: e.color, grosor: e.grosor, relleno: e.relleno, iconoTam: e.iconoTam, tamTexto: e.tamTexto }
    if (e.iconoUrl) props.iconoUrl = e.iconoUrl
    if (e.texto) props.texto = e.texto
    if (e.tipo === 'ruta') {
        return { type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: e.coords.map(([la, ln]) => [ln, la]) } }
    }
    if (e.tipo === 'area') {
        const anillo = e.coords.map(([la, ln]) => [ln, la])
        if (anillo.length) anillo.push(anillo[0])
        return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [anillo] } }
    }
    const [la, ln] = e.coords[0]
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [ln, la] } }
}

function featureAElem(f: any): Elem | null {
    const p = f?.properties || {}
    const g = f?.geometry
    if (!g) return null
    const base = {
        id: nid(),
        color: p.color || '#dc2626',
        grosor: p.grosor ?? 4,
        relleno: p.relleno ?? true,
        iconoUrl: p.iconoUrl,
        iconoTam: p.iconoTam ?? 36,
        texto: p.texto,
        tamTexto: p.tamTexto ?? 14,
    }
    if (g.type === 'LineString') return { ...base, tipo: 'ruta', coords: g.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng) }
    if (g.type === 'Polygon') {
        const anillo = (g.coordinates?.[0] || []).map((c: number[]) => [c[1], c[0]] as LatLng)
        if (anillo.length > 1) anillo.pop() // quitar el cierre repetido
        return { ...base, tipo: 'area', coords: anillo }
    }
    if (g.type === 'Point') {
        const tipo: Tipo = p.tipo === 'texto' ? 'texto' : 'marcador'
        return { ...base, tipo, coords: [[g.coordinates[1], g.coordinates[0]]] }
    }
    return null
}

// ── Captura de clics del mapa ────────────────────────────────────────────────
function CapturaMapa({ onClick, onDblClick }: { onClick: (ll: LatLng) => void; onDblClick: () => void }) {
    useMapEvents({
        click: (e) => onClick([e.latlng.lat, e.latlng.lng]),
        dblclick: () => onDblClick(),
    })
    return null
}

// ── Iconos Leaflet ───────────────────────────────────────────────────────────
function iconoMarcador(url: string, tam: number, seleccionado: boolean) {
    return L.divIcon({
        className: '',
        html: `<div style="width:${tam}px;height:${tam}px;${seleccionado ? 'filter:drop-shadow(0 0 3px #2563eb);' : ''}">
                 <img src="${url}" style="width:100%;height:100%" draggable="false"/>
               </div>`,
        iconSize: [tam, tam],
        iconAnchor: [tam / 2, tam / 2],
    })
}
function iconoTexto(texto: string, tam: number, color: string, seleccionado: boolean) {
    const t = (texto || 'Texto').replace(/</g, '&lt;')
    return L.divIcon({
        className: '',
        html: `<div style="font-size:${tam}px;font-weight:700;color:${color};white-space:nowrap;
                 text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;
                 ${seleccionado ? 'outline:2px dashed #2563eb;outline-offset:2px;' : ''}
                 padding:1px 2px;transform:translate(-50%,-50%)">${t}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    })
}
function iconoVertice() {
    return L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;background:#fff;border:2px solid #2563eb;border-radius:50%;box-shadow:0 1px 2px rgba(0,0,0,.4)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
    })
}

const COLORES = ['#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#000000', '#ffffff']

export default function EditorAnotaciones({
    planes, capasBase, onCerrar, onGuardado,
}: {
    planes?: Array<{ id: string; nombre: string; tipo: string }>
    capasBase?: Capa[]
    onCerrar: () => void
    onGuardado?: () => void
}) {
    const mapRef = useRef<any>(null)

    // Metadatos de la capa
    const [anotacionId, setAnotacionId] = useState<string | null>(null)
    const [nombre, setNombre] = useState('')
    const [categoria, setCategoria] = useState('otro')
    const [descripcion, setDescripcion] = useState('')
    const [planId, setPlanId] = useState<string>('')

    // Contenido
    const [elems, setElems] = useState<Elem[]>([])
    const [tool, setTool] = useState<Herramienta>('sel')
    const [draft, setDraft] = useState<LatLng[]>([])
    const [selId, setSelId] = useState<string | null>(null)

    // Estilo de dibujo actual
    const [color, setColor] = useState('#dc2626')
    const [grosor, setGrosor] = useState(4)

    // Librería de iconos
    const [iconos, setIconos] = useState<IconoMapa[]>([])
    const [iconoSel, setIconoSel] = useState<string>('')
    const [subiendoIcono, setSubiendoIcono] = useState(false)
    const fileIcono = useRef<HTMLInputElement>(null)

    // Lista de capas existentes (para reabrir)
    const [lista, setLista] = useState<Anotacion[]>([])
    const [listaAbierta, setListaAbierta] = useState(false)

    const [guardando, setGuardando] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)

    // Carga inicial: iconos + lista de anotaciones
    useEffect(() => {
        fetch('/api/iconos-mapa').then(r => r.json()).then(d => {
            const ics: IconoMapa[] = d.iconos || []
            setIconos(ics)
            if (ics[0]) setIconoSel(ics[0].url)
        }).catch(() => {})
        fetch('/api/mapas-anotacion').then(r => r.json()).then(d => setLista(d.anotaciones || [])).catch(() => {})
    }, [])

    const elemSel = useMemo(() => elems.find(e => e.id === selId) || null, [elems, selId])

    // ── Acciones de mapa ──────────────────────────────────────────────────────
    const alClicMapa = (ll: LatLng) => {
        if (tool === 'ruta' || tool === 'area') { setDraft(d => [...d, ll]); return }
        if (tool === 'marcador') {
            if (!iconoSel) { setAviso('Elige o sube un icono primero'); return }
            const e: Elem = { id: nid(), tipo: 'marcador', coords: [ll], color, grosor, relleno: true, iconoUrl: iconoSel, iconoTam: 36, tamTexto: 14 }
            setElems(p => [...p, e]); setSelId(e.id); setTool('sel'); return
        }
        if (tool === 'texto') {
            const t = window.prompt('Texto de la etiqueta:')
            if (!t) return
            const e: Elem = { id: nid(), tipo: 'texto', coords: [ll], color, grosor, relleno: true, iconoTam: 36, texto: t, tamTexto: 16 }
            setElems(p => [...p, e]); setSelId(e.id); setTool('sel'); return
        }
        // herramienta 'sel': clic en vacío deselecciona
        setSelId(null)
    }

    const finalizarDraft = () => {
        if (tool === 'ruta' && draft.length >= 2) {
            const e: Elem = { id: nid(), tipo: 'ruta', coords: draft, color, grosor, relleno: false, iconoTam: 36, tamTexto: 14 }
            setElems(p => [...p, e]); setSelId(e.id)
        } else if (tool === 'area' && draft.length >= 3) {
            const e: Elem = { id: nid(), tipo: 'area', coords: draft, color, grosor, relleno: true, iconoTam: 36, tamTexto: 14 }
            setElems(p => [...p, e]); setSelId(e.id)
        }
        setDraft([]); setTool('sel')
    }

    const deshacerVertice = () => setDraft(d => d.slice(0, -1))

    const actualizar = (id: string, cambios: Partial<Elem>) =>
        setElems(p => p.map(e => e.id === id ? { ...e, ...cambios } : e))

    const moverVertice = (id: string, idx: number, ll: LatLng) =>
        setElems(p => p.map(e => {
            if (e.id !== id) return e
            const coords = e.coords.slice(); coords[idx] = ll; return { ...e, coords }
        }))

    const borrarSel = () => { if (selId) { setElems(p => p.filter(e => e.id !== selId)); setSelId(null) } }

    // Teclado: Enter finaliza dibujo; Esc cancela/deselecciona; Supr borra selección
    useEffect(() => {
        const h = (ev: KeyboardEvent) => {
            if (ev.key === 'Enter' && (tool === 'ruta' || tool === 'area')) finalizarDraft()
            else if (ev.key === 'Escape') { setDraft([]); setTool('sel'); setSelId(null) }
            else if ((ev.key === 'Delete' || ev.key === 'Backspace') && selId && !(ev.target as HTMLElement)?.matches?.('input,textarea')) borrarSel()
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [tool, draft, selId]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Iconos ─────────────────────────────────────────────────────────────────
    const subirIcono = async (file: File) => {
        setSubiendoIcono(true); setAviso(null)
        try {
            const fd = new FormData()
            fd.append('archivo', file)
            fd.append('nombre', file.name.replace(/\.[^.]+$/, ''))
            fd.append('categoria', 'Propios')
            const r = await fetch('/api/iconos-mapa', { method: 'POST', body: fd })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Error subiendo el icono')
            setIconos(p => [...p, d.icono]); setIconoSel(d.icono.url)
        } catch (e: any) { setAviso(e.message) }
        finally { setSubiendoIcono(false) }
    }

    // ── Cargar / guardar ────────────────────────────────────────────────────────
    const cargarAnotacion = (a: Anotacion) => {
        setAnotacionId(a.id); setNombre(a.nombre); setCategoria(a.categoria)
        setDescripcion(a.descripcion || ''); setPlanId(a.planId || ''); setColor(a.color || '#dc2626')
        const feats = Array.isArray(a.geojson?.features) ? a.geojson.features : []
        setElems(feats.map(featureAElem).filter(Boolean) as Elem[])
        setSelId(null); setDraft([]); setListaAbierta(false)
        // Encuadrar
        setTimeout(() => {
            const todos = (a.geojson?.features || []).flatMap((f: any) => {
                const c = f?.geometry?.coordinates
                if (f?.geometry?.type === 'Point') return [[c[1], c[0]]]
                if (f?.geometry?.type === 'LineString') return c.map((p: number[]) => [p[1], p[0]])
                if (f?.geometry?.type === 'Polygon') return c[0].map((p: number[]) => [p[1], p[0]])
                return []
            })
            if (todos.length && mapRef.current) mapRef.current.fitBounds(todos, { padding: [40, 40] })
        }, 200)
    }

    const nuevaCapa = () => {
        setAnotacionId(null); setNombre(''); setCategoria('otro'); setDescripcion('')
        setPlanId(''); setElems([]); setSelId(null); setDraft([]); setListaAbierta(false)
    }

    const guardar = async () => {
        if (!nombre.trim()) { setAviso('Ponle un nombre a la capa'); return }
        setGuardando(true); setAviso(null)
        try {
            const geojson = { type: 'FeatureCollection', features: elems.map(elemAFeature) }
            const payload = { nombre: nombre.trim(), categoria, descripcion, planId: planId || null, color, geojson }
            const url = anotacionId ? `/api/mapas-anotacion/${anotacionId}` : '/api/mapas-anotacion'
            const method = anotacionId ? 'PUT' : 'POST'
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Error guardando')
            setAnotacionId(d.anotacion.id)
            setLista(p => {
                const otros = p.filter(x => x.id !== d.anotacion.id)
                return [...otros, d.anotacion]
            })
            setAviso('✓ Guardado correctamente')
            onGuardado?.()
        } catch (e: any) { setAviso(e.message) }
        finally { setGuardando(false) }
    }

    const base = capasBase?.[0] // no usamos fondo WMS por defecto; callejero de base
    const HERRAMIENTAS: Array<{ id: Herramienta; icono: any; txt: string }> = [
        { id: 'sel', icono: MousePointer2, txt: 'Seleccionar / mover' },
        { id: 'ruta', icono: Route, txt: 'Dibujar ruta' },
        { id: 'area', icono: Hexagon, txt: 'Dibujar área' },
        { id: 'marcador', icono: MapPin, txt: 'Colocar icono' },
        { id: 'texto', icono: Type, txt: 'Añadir texto' },
    ]

    return (
        <div className="fixed inset-0 z-[1400] bg-slate-900 flex flex-col">
            {/* Barra superior */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 text-white shrink-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Route size={16} className="text-emerald-400" /> Editor de rutas e iconos
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setListaAbierta(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700">
                        <Layers size={14} /> Mis capas
                    </button>
                    <button onClick={nuevaCapa} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700">
                        <Plus size={14} /> Nueva
                    </button>
                    <button onClick={guardar} disabled={guardando} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">
                        <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Panel lateral izquierdo */}
                <div className="w-72 shrink-0 bg-slate-100 border-r border-slate-300 overflow-y-auto flex flex-col">
                    {/* Datos de la capa */}
                    <div className="p-3 space-y-2 border-b border-slate-200">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Capa de anotación</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Feria — recorrido de la cabalgata"
                            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-emerald-500 outline-none" />
                        <div className="flex gap-2">
                            <select value={categoria} onChange={e => setCategoria(e.target.value)}
                                className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white">
                                <option value="feria">Feria</option>
                                <option value="mercancias_peligrosas">Mercancías peligrosas</option>
                                <option value="evacuacion">Evacuación</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <select value={planId} onChange={e => setPlanId(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white">
                            <option value="">Sin vincular a un plan</option>
                            {planes?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" rows={2}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-emerald-500 outline-none resize-none" />
                    </div>

                    {/* Herramientas */}
                    <div className="p-3 border-b border-slate-200">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Herramientas</label>
                        <div className="grid grid-cols-5 gap-1">
                            {HERRAMIENTAS.map(h => (
                                <button key={h.id} title={h.txt} onClick={() => { setTool(h.id); setDraft([]) }}
                                    className={`aspect-square rounded-lg flex items-center justify-center border transition-colors ${tool === h.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                                    <h.icono size={16} />
                                </button>
                            ))}
                        </div>
                        {(tool === 'ruta' || tool === 'area') && (
                            <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                                Haz clic en el mapa para ir marcando puntos.
                                <div className="flex gap-1.5 mt-1.5">
                                    <button onClick={finalizarDraft} disabled={draft.length < (tool === 'area' ? 3 : 2)}
                                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold disabled:opacity-40">
                                        <Check size={12} /> Finalizar
                                    </button>
                                    <button onClick={deshacerVertice} disabled={!draft.length}
                                        className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 text-[11px] disabled:opacity-40">
                                        <Undo2 size={12} /> Deshacer
                                    </button>
                                    <span className="ml-auto text-[11px] text-emerald-700 self-center">{draft.length} pts</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Color y grosor de dibujo */}
                    <div className="p-3 border-b border-slate-200">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Color</label>
                        <div className="flex flex-wrap gap-1.5">
                            {COLORES.map(c => (
                                <button key={c} onClick={() => { setColor(c); if (elemSel) actualizar(elemSel.id, { color: c }) }}
                                    className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-800 scale-110' : 'border-white'} shadow`}
                                    style={{ background: c }} />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] text-slate-500 w-12">Grosor</span>
                            <input type="range" min={2} max={10} step={1} value={elemSel ? elemSel.grosor : grosor}
                                onChange={e => { const g = Number(e.target.value); setGrosor(g); if (elemSel) actualizar(elemSel.id, { grosor: g }) }}
                                className="flex-1 accent-emerald-600" />
                        </div>
                    </div>

                    {/* Librería de iconos */}
                    <div className="p-3 flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Iconos</label>
                            <button onClick={() => fileIcono.current?.click()} disabled={subiendoIcono}
                                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900">
                                <Upload size={12} /> {subiendoIcono ? 'Subiendo…' : 'Subir'}
                            </button>
                            <input ref={fileIcono} type="file" accept="image/*" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) subirIcono(f); e.target.value = '' }} />
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {iconos.map(ic => (
                                <button key={ic.id} title={ic.nombre}
                                    onClick={() => { setIconoSel(ic.url); if (elemSel?.tipo === 'marcador') actualizar(elemSel.id, { iconoUrl: ic.url }); if (tool === 'sel') setTool('marcador') }}
                                    className={`aspect-square rounded-lg border p-1 bg-white ${iconoSel === ic.url ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <img src={ic.url} alt={ic.nombre} className="w-full h-full object-contain" />
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Elige un icono y usa la herramienta “Colocar icono”. Puedes subir los tuyos (PNG/SVG).</p>
                    </div>
                </div>

                {/* Mapa */}
                <div className="flex-1 relative min-w-0">
                    <MapContainer center={BORMUJOS.centro} zoom={BORMUJOS.zoom} minZoom={BORMUJOS.zoomMin} maxZoom={BORMUJOS.zoomMax}
                        scrollWheelZoom doubleClickZoom={false} style={{ height: '100%', width: '100%' }} ref={mapRef as any}>
                        <TileLayer url={TILES_CALLEJERO.url} attribution={TILES_CALLEJERO.atribucion} maxZoom={19} />
                        {base?.wmsUrl && (
                            <WMSTileLayer url={base.wmsUrl} params={{ layers: base.wmsLayers || '', format: 'image/png' as any, transparent: false, version: (base.wmsVersion || '1.1.1') as any }} />
                        )}

                        <CapturaMapa onClick={alClicMapa} onDblClick={finalizarDraft} />

                        {/* Elementos guardados */}
                        {elems.map(e => {
                            const sel = e.id === selId
                            if (e.tipo === 'ruta') {
                                return <Polyline key={e.id} positions={e.coords} pathOptions={{ color: e.color, weight: e.grosor, opacity: 0.95, dashArray: sel ? '6 6' : undefined }}
                                    eventHandlers={{ click: () => { if (tool === 'sel') setSelId(e.id) } }} />
                            }
                            if (e.tipo === 'area') {
                                return <Polygon key={e.id} positions={e.coords} pathOptions={{ color: e.color, weight: e.grosor, opacity: 0.95, fillColor: e.color, fillOpacity: 0.25, dashArray: sel ? '6 6' : undefined }}
                                    eventHandlers={{ click: () => { if (tool === 'sel') setSelId(e.id) } }} />
                            }
                            if (e.tipo === 'marcador' && e.iconoUrl) {
                                return <Marker key={e.id} position={e.coords[0]} draggable={sel} icon={iconoMarcador(e.iconoUrl, e.iconoTam, sel)}
                                    eventHandlers={{ click: () => { if (tool === 'sel') setSelId(e.id) }, dragend: (ev: any) => { const ll = ev.target.getLatLng(); actualizar(e.id, { coords: [[ll.lat, ll.lng]] }) } }} />
                            }
                            if (e.tipo === 'texto') {
                                return <Marker key={e.id} position={e.coords[0]} draggable={sel} icon={iconoTexto(e.texto || '', e.tamTexto, e.color, sel)}
                                    eventHandlers={{ click: () => { if (tool === 'sel') setSelId(e.id) }, dragend: (ev: any) => { const ll = ev.target.getLatLng(); actualizar(e.id, { coords: [[ll.lat, ll.lng]] }) } }} />
                            }
                            return null
                        })}

                        {/* Vértices editables del elemento seleccionado (rutas/áreas) */}
                        {elemSel && (elemSel.tipo === 'ruta' || elemSel.tipo === 'area') && elemSel.coords.map((c, i) => (
                            <Marker key={`${elemSel.id}-v${i}`} position={c} draggable icon={iconoVertice()}
                                eventHandlers={{ drag: (ev: any) => { const ll = ev.target.getLatLng(); moverVertice(elemSel.id, i, [ll.lat, ll.lng]) } }} />
                        ))}

                        {/* Boceto en curso */}
                        {draft.length > 0 && (tool === 'ruta'
                            ? <Polyline positions={draft} pathOptions={{ color, weight: grosor, dashArray: '4 6', opacity: 0.8 }} />
                            : <Polygon positions={draft} pathOptions={{ color, weight: grosor, dashArray: '4 6', opacity: 0.8, fillOpacity: 0.15 }} />
                        )}
                        {draft.map((c, i) => (
                            <Marker key={`d${i}`} position={c} icon={iconoVertice()} interactive={false} />
                        ))}
                    </MapContainer>

                    {/* Cuadro de elemento seleccionado */}
                    {elemSel && (
                        <div className="absolute top-3 right-3 z-[500] bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-700 capitalize">{elemSel.tipo}</span>
                                <button onClick={borrarSel} className="text-red-600 hover:text-red-800"><Trash2 size={15} /></button>
                            </div>
                            {elemSel.tipo === 'texto' && (
                                <input value={elemSel.texto || ''} onChange={e => actualizar(elemSel.id, { texto: e.target.value })}
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 mb-2" placeholder="Texto" />
                            )}
                            {(elemSel.tipo === 'marcador' || elemSel.tipo === 'texto') && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-500 w-12">Tamaño</span>
                                    <input type="range" min={elemSel.tipo === 'texto' ? 10 : 20} max={elemSel.tipo === 'texto' ? 40 : 64} step={2}
                                        value={elemSel.tipo === 'texto' ? elemSel.tamTexto : elemSel.iconoTam}
                                        onChange={e => actualizar(elemSel.id, elemSel.tipo === 'texto' ? { tamTexto: Number(e.target.value) } : { iconoTam: Number(e.target.value) })}
                                        className="flex-1 accent-emerald-600" />
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-2">Arrástralo para moverlo. En rutas/áreas, arrastra los puntos blancos.</p>
                        </div>
                    )}

                    {aviso && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[600] bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
                            {aviso}
                        </div>
                    )}

                    {/* Lista de capas existentes */}
                    {listaAbierta && (
                        <div className="absolute inset-0 z-[700] bg-black/30 flex items-start justify-center pt-16" onClick={() => setListaAbierta(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-96 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Mis capas de anotación</h3>
                                    <button onClick={() => setListaAbierta(false)}><X size={16} className="text-slate-400" /></button>
                                </div>
                                <div className="p-2">
                                    {lista.length === 0 && <p className="text-xs text-slate-400 p-3">Aún no hay ninguna capa guardada.</p>}
                                    {lista.map(a => (
                                        <button key={a.id} onClick={() => cargarAnotacion(a)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 ${a.id === anotacionId ? 'bg-emerald-50' : ''}`}>
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-semibold text-slate-700 truncate">{a.nombre}</span>
                                                <span className="block text-[10px] text-slate-400">{a.categoria} · {(a.geojson?.features?.length ?? 0)} elementos</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
