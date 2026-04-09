import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ─── ENAIRE APIs públicas sin autenticación ───────────────────────────────────
// 1. NOTAMs activos (ÍCARO): https://servais.enaire.es/insignias/rest/services/InfoARES/NOTAM_APP_V3/FeatureServer
// 2. Zonas UAS RD517/2024:   https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V1/FeatureServer
// 3. Espacio aéreo VIGOR:    https://servais.enaire.es/insignia/rest/services/INSIGNIA_SRV/Aero_SRV_VIGOR_V1/MapServer
// ─────────────────────────────────────────────────────────────────────────────

const NOTAM_BASE = 'https://servais.enaire.es/insignias/rest/services/InfoARES/NOTAM_APP_V3/FeatureServer'
const UAS_BASE   = 'https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V1/FeatureServer'
const VIGOR_BASE = 'https://servais.enaire.es/insignia/rest/services/INSIGNIA_SRV/Aero_SRV_VIGOR_V1/MapServer'

// BBox 30km alrededor de Bormujos en WGS84
const BBOX_DEFAULT = '-6.4319,37.0710,-5.7119,37.6710'

function bboxFromCoords(lat: number, lon: number, kmRadius: number = 25): string {
  const dLat = kmRadius / 111
  const dLon = kmRadius / (111 * Math.cos(lat * Math.PI / 180))
  return `${(lon - dLon).toFixed(4)},${(lat - dLat).toFixed(4)},${(lon + dLon).toFixed(4)},${(lat + dLat).toFixed(4)}`
}

function buildQuery(base: string, layer: number, extra: Record<string, string> = {}, bbox?: string): string {
  const p = new URLSearchParams({
    where: '1=1', outFields: '*',
    geometry: bbox || BBOX_DEFAULT, geometryType: 'esriGeometryEnvelope',
    inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
    outSR: '4326', f: 'json', resultRecordCount: '100',
    ...extra
  })
  return `${base}/${layer}/query?${p.toString()}`
}

function parseNum(v: any): number | null {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? null : n
}

function parseFecha(v: any): string | null {
  if (!v) return null
  if (typeof v === 'number') return new Date(v).toISOString()
  if (typeof v === 'string' && /^\d{12,14}$/.test(v))
    return new Date(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(8,10)}:${v.slice(10,12)}:00Z`).toISOString()
  try { return new Date(v).toISOString() } catch { return null }
}

function getCoordsFromFeature(f: any): { lat: number|null, lon: number|null, radio: number|null } {
  const g = f.geometry
  if (!g) return { lat: null, lon: null, radio: null }
  if (g.x !== undefined) return { lat: g.y, lon: g.x, radio: null }
  if (g.rings?.[0]) {
    const r = g.rings[0]
    const lons = r.map((p: number[]) => p[0])
    const lats = r.map((p: number[]) => p[1])
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2
    const lon = (Math.min(...lons) + Math.max(...lons)) / 2
    const radio = Math.round(Math.max(
      (Math.max(...lons) - Math.min(...lons)) * 111 * Math.cos(lat * Math.PI / 180),
      (Math.max(...lats) - Math.min(...lats)) * 111
    ) / 2 * 10) / 10
    return { lat, lon, radio }
  }
  return { lat: null, lon: null, radio: null }
}

function parsearNotam(feature: any): any {
  const a = feature.attributes || {}
  const { lat, lon, radio } = getCoordsFromFeature(feature)
  const ref = a.notamId ||
    (a.notamSerie && a.notamNumber
      ? `${a.notamSerie}${a.notamNumber}/${String(a.notamYear || '').slice(-2)}`
      : `NOTAM-${String(a.OBJECTID || Math.random().toString(36).slice(2,8)).toUpperCase()}`)
  const textoCompleto = a.icaoFormatText || a.DESCRIPTION || a.itemE || ''
  return {
    referencia: ref,
    tipo: String(a.qcode || a.incidenceType || a.scope || a.itemA || 'AERÓDROMO').trim(),
    estado: 'activo',
    descripcion: String(a.itemE || a.DESCRIPTION || textoCompleto.slice(0,500) || 'Sin descripción').replace(/\s+/g,' ').trim(),
    descripcionHtml: textoCompleto,
    atributosRaw: JSON.stringify(a),
    fechaInicio: parseFecha(a.itemB || a.itemBIcaro || a.icaroCreationTime),
    fechaFin: parseFecha(a.itemC || a.itemCIcaro),
    alturaMin: parseNum(a.itemF || a.LOWER_VAL || a.LOWER_VAL_AGL),
    alturaMax: parseNum(a.itemG || a.UPPER_VAL),
    radio, latitud: lat, longitud: lon,
    fuente: 'ENAIRE', activo: true,
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tipo = new URL(request.url).searchParams.get('tipo') || 'notams'

  // ── 1. NOTAMs activos (por defecto) ──────────────────────────────────────
  if (tipo === 'notams') {
    const sp = new URL(request.url).searchParams
    const lat = sp.get('lat') ? parseFloat(sp.get('lat')!) : null
    const lon = sp.get('lon') ? parseFloat(sp.get('lon')!) : null
    const bbox = lat && lon ? bboxFromCoords(lat, lon, 25) : undefined
    const notamsParsed: any[] = []
    for (const capa of [0, 1]) {
      try {
        const res = await fetch(buildQuery(NOTAM_BASE, capa, {}, bbox), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000)
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.error) {
            console.log(`ENAIRE NOTAM capa ${capa}: ${(data.features||[]).length} features`)
            for (const f of (data.features || [])) notamsParsed.push(parsearNotam(f))
          }
        }
      } catch (e) { console.warn(`Error NOTAM capa ${capa}:`, e) }
    }
    return NextResponse.json({
      notams: notamsParsed,
      total: notamsParsed.length,
      fuente: notamsParsed.length > 0 ? 'ENAIRE-LIVE' : 'SIN-DATOS',
      consultadoEn: new Date().toISOString(),
      coordenadas: lat && lon ? { lat, lon, radioKm: 25, bbox: bbox || BBOX_DEFAULT } : null
    })
  }

  // ── 2. Zonas Geográficas UAS (RD 517/2024) ────────────────────────────────
  if (tipo === 'zonas-uas') {
    const capas = [
      { id: 0, tipo: 'aerodromo',      color: '#ef4444', label: 'Aeródromo/CTR' },
      { id: 1, tipo: 'medioambiente',  color: '#22c55e', label: 'Medioambiente' },
      { id: 2, tipo: 'urbano',         color: '#f97316', label: 'Urbano' },
    ]
    const zonas: any[] = []
    for (const capa of capas) {
      try {
        const res = await fetch(buildQuery(UAS_BASE, capa.id), { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const data = await res.json()
          for (const f of (data.features || [])) {
            const a = f.attributes || {}
            const coordenadas = f.geometry?.rings?.[0]?.map((p: number[]) => [p[1], p[0]]) || []
            zonas.push({
              id: `uas-${capa.tipo}-${a.OBJECTID || Math.random().toString(36).slice(2,8)}`,
              nombre: a.NOMBRE || a.NAME || a.designator || `Zona ${capa.label}`,
              tipo: capa.tipo,
              color: capa.color,
              descripcion: a.DESCRIPTION || capa.label,
              alturaMaxima: parseNum(a.UPPER_LIMIT || a.upper_limit),
              coordenadas,
              fuente: 'ENAIRE-UAS'
            })
          }
        }
      } catch (e) { console.warn(`Error UAS capa ${capa.tipo}:`, e) }
    }
    return NextResponse.json({ zonas, total: zonas.length, fuente: 'ENAIRE-UAS', consultadoEn: new Date().toISOString() })
  }

  // ── 3. Aeródromos y espacio aéreo (VIGOR) ────────────────────────────────
  if (tipo === 'aerodromes') {
    const aerodromes: any[] = []
    try {
      // Capa 3 = Aeródromos en VIGOR
      const res = await fetch(buildQuery(VIGOR_BASE, 3), { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data = await res.json()
        for (const f of (data.features || [])) {
          const a = f.attributes || {}
          const g = f.geometry
          if (!g) continue
          aerodromes.push({
            id: `ad-${a.OBJECTID || a.ICAO_CODE}`,
            nombre: a.NOMBRE || a.NAME || a.ICAO_CODE || 'Aeródromo',
            icao: a.ICAO_CODE || a.DESIGNATOR || '',
            tipo: a.TIPO || a.TYPE || 'aeropuerto',
            latitud: g.y ?? null,
            longitud: g.x ?? null,
            fuente: 'ENAIRE-VIGOR'
          })
        }
      }
    } catch (e) { console.warn('Error VIGOR aeródromos:', e) }
    return NextResponse.json({ aerodromes, total: aerodromes.length, fuente: 'ENAIRE-VIGOR', consultadoEn: new Date().toISOString() })
  }

  return NextResponse.json({ error: 'Tipo no válido. Usar: notams | zonas-uas | aerodromes' }, { status: 400 })
}
