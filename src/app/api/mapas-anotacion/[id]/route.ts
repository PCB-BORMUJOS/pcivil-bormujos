import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { puedeEditarModulo } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

function puedeEditar(session: any): boolean {
    return puedeEditarModulo(session, 'planes')
}

function geojsonValido(g: any): boolean {
    return g && typeof g === 'object' && g.type === 'FeatureCollection' && Array.isArray(g.features)
}

/** GET /api/mapas-anotacion/[id] — una capa concreta. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const anotacion = await prisma.mapaAnotacion.findUnique({ where: { id: params.id } })
        if (!anotacion) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
        return NextResponse.json({ anotacion })
    } catch (error) {
        console.error('Error GET /api/mapas-anotacion/[id]:', error)
        return NextResponse.json({ error: 'Error obteniendo la anotación' }, { status: 500 })
    }
}

/** PUT /api/mapas-anotacion/[id] — actualiza nombre, geometría, estilo... */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar anotaciones' }, { status: 403 })
        }

        const existente = await prisma.mapaAnotacion.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

        const body = await request.json()
        const data: any = {}
        if (typeof body.nombre === 'string' && body.nombre.trim()) data.nombre = body.nombre.trim()
        if (body.descripcion !== undefined) data.descripcion = body.descripcion ? String(body.descripcion).trim() : null
        if (typeof body.categoria === 'string') data.categoria = body.categoria
        if (geojsonValido(body.geojson)) data.geojson = body.geojson
        if (body.planId !== undefined) data.planId = body.planId ? String(body.planId) : null
        if (typeof body.color === 'string') data.color = body.color
        if (typeof body.visiblePorDefecto === 'boolean') data.visiblePorDefecto = body.visiblePorDefecto
        if (typeof body.orden === 'number') data.orden = body.orden

        const anotacion = await prisma.mapaAnotacion.update({ where: { id: params.id }, data })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'UPDATE', entidad: 'MapaAnotacion', entidadId: anotacion.id,
            descripcion: `Capa de anotación actualizada: ${anotacion.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, anotacion })
    } catch (error) {
        console.error('Error PUT /api/mapas-anotacion/[id]:', error)
        return NextResponse.json({ error: 'Error actualizando la anotación' }, { status: 500 })
    }
}

/** DELETE /api/mapas-anotacion/[id] — borrado lógico. */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden borrar anotaciones' }, { status: 403 })
        }

        const existente = await prisma.mapaAnotacion.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

        await prisma.mapaAnotacion.delete({ where: { id: params.id } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'MapaAnotacion', entidadId: params.id,
            descripcion: `Capa de anotación borrada: ${existente.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE /api/mapas-anotacion/[id]:', error)
        return NextResponse.json({ error: 'Error borrando la anotación' }, { status: 500 })
    }
}
