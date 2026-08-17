import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { put, del } from '@vercel/blob'
import { TODAS_LAS_CAPAS_OFICIALES } from '@/lib/cartografia'

function puedeEditar(session: any): boolean {
    return getNivel((session?.user as any)?.rol ?? '') >= 4
}

/**
 * Siembra el catálogo oficial la primera vez. Es idempotente: solo crea las
 * capas cuyo nombre aún no existe, así que llamarlo mil veces no duplica nada.
 * El callejero se excluye porque no es WMS: son teselas y va fijo en el visor.
 */
async function sembrarOficiales() {
    const existentes = new Set((await prisma.capaCartografica.findMany({ select: { nombre: true } })).map(c => c.nombre))
    const aCrear = TODAS_LAS_CAPAS_OFICIALES.filter(c => c.wmsUrl && !existentes.has(c.nombre))
    if (aCrear.length === 0) return 0

    await prisma.capaCartografica.createMany({
        data: aCrear.map(c => ({
            nombre: c.nombre,
            descripcion: c.descripcion,
            categoria: c.categoria,
            tipo: 'wms',
            wmsUrl: c.wmsUrl,
            wmsLayers: c.wmsLayers,
            wmsVersion: c.wmsVersion,
            wmsFormat: c.wmsFormat,
            atribucion: c.atribucion,
            opacidad: c.opacidad,
            visiblePorDefecto: c.visiblePorDefecto,
            orden: c.orden,
            esOficial: true,
        })),
    })
    return aCrear.length
}

/**
 * GET /api/cartografia — capas disponibles para el visor.
 * Abierto a cualquier usuario autenticado: la cartografía es de consulta.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const sembradas = await sembrarOficiales()
        const capas = await prisma.capaCartografica.findMany({
            where: { activa: true },
            orderBy: [{ categoria: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
        })

        return NextResponse.json({ capas, sembradas })
    } catch (error) {
        console.error('Error GET /api/cartografia:', error)
        return NextResponse.json({ error: 'Error obteniendo la cartografía' }, { status: 500 })
    }
}

/**
 * POST /api/cartografia
 * Dos modos según el content-type:
 *   · JSON            → alta de una capa WMS externa
 *   · multipart/form  → subida de un fichero (SHP en .zip, KML o GeoJSON), que
 *                       llega ya convertido a GeoJSON desde el navegador.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden añadir capas' }, { status: 403 })
        }

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        const contentType = request.headers.get('content-type') || ''

        // ── Capa de fichero: el navegador ya convirtió a GeoJSON ──────────────
        if (contentType.includes('multipart/form-data')) {
            const form = await request.formData()
            const nombre = String(form.get('nombre') || '').trim()
            const geojsonTexto = String(form.get('geojson') || '')
            const nombreArchivo = String(form.get('nombreArchivo') || 'capa')
            const color = String(form.get('color') || '#2563eb')

            if (!nombre) return NextResponse.json({ error: 'Ponle un nombre a la capa' }, { status: 400 })
            if (!geojsonTexto) return NextResponse.json({ error: 'No se ha recibido la geometría' }, { status: 400 })

            let geo: any
            try { geo = JSON.parse(geojsonTexto) } catch {
                return NextResponse.json({ error: 'La geometría recibida no es un GeoJSON válido' }, { status: 400 })
            }
            const features = Array.isArray(geo?.features) ? geo.features : []
            if (features.length === 0) {
                return NextResponse.json({ error: 'El fichero no contiene ninguna geometría dibujable' }, { status: 400 })
            }

            const bbox = calcularBbox(features)
            const blob = await put(
                `cartografia/${Date.now()}-${nombre.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 60)}.geojson`,
                geojsonTexto,
                { access: 'public', contentType: 'application/geo+json' },
            )

            const maxOrden = await prisma.capaCartografica.aggregate({ _max: { orden: true }, where: { categoria: 'tematica' } })

            const capa = await prisma.capaCartografica.create({
                data: {
                    nombre, descripcion: String(form.get('descripcion') || '') || null,
                    categoria: 'tematica', tipo: 'archivo',
                    geojsonUrl: blob.url, blobKey: blob.pathname,
                    nombreArchivo, numElementos: features.length,
                    // Prisma no acepta null directo en un Json opcional
                    bbox: bbox ?? undefined,
                    color, visiblePorDefecto: false,
                    orden: (maxOrden._max.orden ?? 0) + 1,
                    creadoPorId: usuarioId ?? null,
                },
            })

            await registrarAudit({
                accion: 'CREATE', entidad: 'CapaCartografica', entidadId: capa.id,
                descripcion: `Capa cartográfica "${nombre}" subida (${features.length} elementos)`,
                usuarioId, usuarioNombre, modulo: 'Planes',
            })

            return NextResponse.json({ success: true, capa })
        }

        // ── Capa WMS externa ──────────────────────────────────────────────────
        const body = await request.json()
        const nombre = String(body.nombre || '').trim()
        const wmsUrl = String(body.wmsUrl || '').trim()
        const wmsLayers = String(body.wmsLayers || '').trim()

        if (!nombre)    return NextResponse.json({ error: 'Ponle un nombre a la capa' }, { status: 400 })
        if (!wmsUrl)    return NextResponse.json({ error: 'Falta la dirección del servicio WMS' }, { status: 400 })
        if (!wmsLayers) return NextResponse.json({ error: 'Falta el nombre de la capa dentro del servicio' }, { status: 400 })
        if (!/^https?:\/\//i.test(wmsUrl)) {
            return NextResponse.json({ error: 'La dirección del servicio debe empezar por http:// o https://' }, { status: 400 })
        }

        const maxOrden = await prisma.capaCartografica.aggregate({
            _max: { orden: true }, where: { categoria: body.categoria === 'base' ? 'base' : 'tematica' },
        })

        const capa = await prisma.capaCartografica.create({
            data: {
                nombre,
                descripcion: String(body.descripcion || '') || null,
                categoria: body.categoria === 'base' ? 'base' : 'tematica',
                tipo: 'wms',
                wmsUrl, wmsLayers,
                wmsVersion: body.wmsVersion === '1.3.0' ? '1.3.0' : '1.1.1',
                wmsFormat: String(body.wmsFormat || 'image/png'),
                atribucion: String(body.atribucion || '') || null,
                opacidad: typeof body.opacidad === 'number' ? body.opacidad : 0.8,
                visiblePorDefecto: false,
                orden: (maxOrden._max.orden ?? 0) + 1,
                creadoPorId: usuarioId ?? null,
            },
        })

        await registrarAudit({
            accion: 'CREATE', entidad: 'CapaCartografica', entidadId: capa.id,
            descripcion: `Capa WMS "${nombre}" añadida`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, capa })
    } catch (error) {
        console.error('Error POST /api/cartografia:', error)
        return NextResponse.json({ error: 'Error añadiendo la capa' }, { status: 500 })
    }
}

/**
 * DELETE /api/cartografia?id=...
 * Las capas oficiales precargadas no se borran: se pueden ocultar, pero
 * conviene que sigan estando para no perder los servicios verificados.
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden borrar capas' }, { status: 403 })
        }

        const id = new URL(request.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Falta el identificador de la capa' }, { status: 400 })

        const capa = await prisma.capaCartografica.findUnique({ where: { id } })
        if (!capa) return NextResponse.json({ error: 'Capa no encontrada' }, { status: 404 })
        if (capa.esOficial) {
            return NextResponse.json({ error: 'Las capas oficiales no se pueden borrar; puedes desactivarlas' }, { status: 400 })
        }

        if (capa.geojsonUrl) {
            try { await del(capa.geojsonUrl) } catch (e) { console.error('No se pudo borrar la geometría:', e) }
        }
        await prisma.capaCartografica.delete({ where: { id } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'CapaCartografica', entidadId: id,
            descripcion: `Capa cartográfica "${capa.nombre}" eliminada`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE /api/cartografia:', error)
        return NextResponse.json({ error: 'Error eliminando la capa' }, { status: 500 })
    }
}

/** Encuadre [minLon, minLat, maxLon, maxLat] para poder centrar el mapa en la capa. */
function calcularBbox(features: any[]): number[] | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const visitar = (coords: any) => {
        if (typeof coords[0] === 'number') {
            const [x, y] = coords
            if (Number.isFinite(x) && Number.isFinite(y)) {
                if (x < minX) minX = x; if (x > maxX) maxX = x
                if (y < minY) minY = y; if (y > maxY) maxY = y
            }
            return
        }
        for (const c of coords) visitar(c)
    }
    for (const f of features) {
        const g = f?.geometry
        if (!g?.coordinates) continue
        visitar(g.coordinates)
    }
    return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null
}
