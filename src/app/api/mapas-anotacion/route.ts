import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { puedeEditarModulo } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/** Consultar: cualquier usuario. Crear/editar/borrar: coordinador o superior. */
function puedeEditar(session: any): boolean {
    return puedeEditarModulo(session, 'planes')
}

function fcVacia() {
    return { type: 'FeatureCollection', features: [] }
}

/** Valida que sea un FeatureCollection GeoJSON con array de features. */
function geojsonValido(g: any): boolean {
    return g && typeof g === 'object' && g.type === 'FeatureCollection' && Array.isArray(g.features)
}

/**
 * GET /api/mapas-anotacion?planId=xxx
 * Lista de capas de anotación (dibujos). Filtro opcional por plan.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const planId = searchParams.get('planId')

        const where: any = { activo: true }
        if (planId) where.planId = planId

        const anotaciones = await prisma.mapaAnotacion.findMany({
            where,
            orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
        })

        return NextResponse.json({ anotaciones })
    } catch (error) {
        console.error('Error GET /api/mapas-anotacion:', error)
        return NextResponse.json({ error: 'Error obteniendo las anotaciones' }, { status: 500 })
    }
}

/**
 * POST /api/mapas-anotacion — crea una capa de anotación.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden crear anotaciones' }, { status: 403 })
        }

        const body = await request.json()
        const nombre = String(body.nombre || '').trim()
        if (!nombre) return NextResponse.json({ error: 'Ponle un nombre a la capa de anotación' }, { status: 400 })

        const geojson = geojsonValido(body.geojson) ? body.geojson : fcVacia()
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        const maxOrden = await prisma.mapaAnotacion.aggregate({ _max: { orden: true } })

        const anotacion = await prisma.mapaAnotacion.create({
            data: {
                nombre,
                descripcion: body.descripcion ? String(body.descripcion).trim() : null,
                categoria: String(body.categoria || 'otro'),
                geojson,
                planId: body.planId ? String(body.planId) : null,
                color: String(body.color || '#dc2626'),
                visiblePorDefecto: !!body.visiblePorDefecto,
                orden: (maxOrden._max.orden ?? 0) + 1,
                creadoPorId: usuarioId ?? null,
                creadoPorNombre: usuarioNombre ?? null,
            },
        })

        await registrarAudit({
            accion: 'CREATE', entidad: 'MapaAnotacion', entidadId: anotacion.id,
            descripcion: `Capa de anotación creada: ${nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, anotacion })
    } catch (error) {
        console.error('Error POST /api/mapas-anotacion:', error)
        return NextResponse.json({ error: 'Error creando la anotación' }, { status: 500 })
    }
}
