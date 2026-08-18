'use client'

import { Polyline, Polygon, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'

// Renderiza una capa de anotación (FeatureCollection) sobre un MapContainer de
// react-leaflet: rutas, áreas, marcadores con icono y textos. Se usa tanto en el
// visor de cartografía como en la lámina imprimible, para que se vean igual.

type LatLng = [number, number]

function iconoMarcador(url: string, tam: number) {
    return L.divIcon({
        className: '',
        html: `<div style="width:${tam}px;height:${tam}px"><img src="${url}" style="width:100%;height:100%" draggable="false"/></div>`,
        iconSize: [tam, tam],
        iconAnchor: [tam / 2, tam / 2],
    })
}
function iconoTexto(texto: string, tam: number, color: string) {
    const t = (texto || '').replace(/</g, '&lt;')
    return L.divIcon({
        className: '',
        html: `<div style="font-size:${tam}px;font-weight:700;color:${color};white-space:nowrap;
                 text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;
                 transform:translate(-50%,-50%);padding:1px 2px">${t}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    })
}

export default function AnotacionCapa({ geojson, opacidad = 1 }: { geojson: any; opacidad?: number }) {
    const feats: any[] = Array.isArray(geojson?.features) ? geojson.features : []
    return (
        <>
            {feats.map((f, i) => {
                const p = f?.properties || {}
                const g = f?.geometry
                if (!g) return null
                const color = p.color || '#dc2626'
                const grosor = p.grosor ?? 4
                const nombre = (p.nombre || '').trim()
                const tip = nombre ? <Tooltip sticky>{nombre}</Tooltip> : null
                if (g.type === 'LineString') {
                    const pos = (g.coordinates || []).map((c: number[]) => [c[1], c[0]] as LatLng)
                    return <Polyline key={i} positions={pos} pathOptions={{ color, weight: grosor, opacity: opacidad }}>{tip}</Polyline>
                }
                if (g.type === 'Polygon') {
                    const pos = (g.coordinates?.[0] || []).map((c: number[]) => [c[1], c[0]] as LatLng)
                    return <Polygon key={i} positions={pos} pathOptions={{ color, weight: grosor, opacity: opacidad, fillColor: color, fillOpacity: (p.relleno === false ? 0 : 0.25) * opacidad }}>{tip}</Polygon>
                }
                if (g.type === 'Point') {
                    const ll: LatLng = [g.coordinates[1], g.coordinates[0]]
                    if (p.tipo === 'texto') {
                        return <Marker key={i} position={ll} interactive={false} icon={iconoTexto(p.texto || '', p.tamTexto ?? 16, color)} />
                    }
                    if (p.iconoUrl) {
                        return <Marker key={i} position={ll} icon={iconoMarcador(p.iconoUrl, p.iconoTam ?? 36)}>{tip}</Marker>
                    }
                }
                return null
            })}
        </>
    )
}
