import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { puedeEditarModulo } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

function puedeEditar(session: any): boolean {
    return puedeEditarModulo(session, 'planes')
}

function txt(v: unknown): string | null {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t === '' ? null : t
}
function num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? Math.trunc(n) : null
}

const TIPOS = ['humano', 'vehiculo', 'material', 'instalacion', 'otro']

/** POST /api/planes/[id]/recursos — añade un medio al catálogo del plan. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar el catálogo' }, { status: 403 })
        }

        const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { id: true, nombre: true } })
        if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

        const body = await request.json()
        if (!body.denominacion || String(body.denominacion).trim() === '') {
            return NextResponse.json({ error: 'La denominación del medio es obligatoria' }, { status: 400 })
        }
        const tipo = TIPOS.includes(body.tipo) ? body.tipo : 'material'

        const maxOrden = await prisma.planRecurso.aggregate({ _max: { orden: true }, where: { planId: plan.id } })

        const recurso = await prisma.planRecurso.create({
            data: {
                planId: plan.id,
                tipo,
                denominacion: String(body.denominacion).trim(),
                titular: txt(body.titular),
                ubicacion: txt(body.ubicacion),
                cantidad: num(body.cantidad),
                unidad: txt(body.unidad),
                contacto: txt(body.contacto),
                telefono: txt(body.telefono),
                disponibilidad: txt(body.disponibilidad),
                observaciones: txt(body.observaciones),
                orden: (maxOrden._max.orden ?? 0) + 1,
            },
        })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'CREATE', entidad: 'PlanRecurso', entidadId: recurso.id,
            descripcion: `Medio "${recurso.denominacion}" añadido al catálogo de ${plan.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, recurso })
    } catch (error) {
        console.error('Error POST recursos:', error)
        return NextResponse.json({ error: 'Error añadiendo el medio' }, { status: 500 })
    }
}

/** PUT /api/planes/[id]/recursos?recursoId=... */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar el catálogo' }, { status: 403 })
        }

        const recursoId = new URL(request.url).searchParams.get('recursoId')
        if (!recursoId) return NextResponse.json({ error: 'Falta el identificador del medio' }, { status: 400 })

        const existente = await prisma.planRecurso.findUnique({ where: { id: recursoId } })
        if (!existente || existente.planId !== params.id) {
            return NextResponse.json({ error: 'Medio no encontrado en este plan' }, { status: 404 })
        }

        const body = await request.json()
        const data: Record<string, unknown> = {}
        if (body.denominacion !== undefined) {
            if (String(body.denominacion).trim() === '') {
                return NextResponse.json({ error: 'La denominación no puede quedar vacía' }, { status: 400 })
            }
            data.denominacion = String(body.denominacion).trim()
        }
        if (body.tipo !== undefined && TIPOS.includes(body.tipo)) data.tipo = body.tipo
        for (const campo of ['titular', 'ubicacion', 'unidad', 'contacto', 'telefono', 'disponibilidad', 'observaciones'] as const) {
            if (body[campo] !== undefined) data[campo] = txt(body[campo])
        }
        if (body.cantidad !== undefined) data.cantidad = num(body.cantidad)

        const recurso = await prisma.planRecurso.update({ where: { id: recursoId }, data })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'UPDATE', entidad: 'PlanRecurso', entidadId: recurso.id,
            descripcion: `Medio "${recurso.denominacion}" actualizado`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, recurso })
    } catch (error) {
        console.error('Error PUT recursos:', error)
        return NextResponse.json({ error: 'Error actualizando el medio' }, { status: 500 })
    }
}

/** DELETE /api/planes/[id]/recursos?recursoId=... */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar el catálogo' }, { status: 403 })
        }

        const recursoId = new URL(request.url).searchParams.get('recursoId')
        if (!recursoId) return NextResponse.json({ error: 'Falta el identificador del medio' }, { status: 400 })

        const recurso = await prisma.planRecurso.findUnique({ where: { id: recursoId } })
        if (!recurso || recurso.planId !== params.id) {
            return NextResponse.json({ error: 'Medio no encontrado en este plan' }, { status: 404 })
        }

        await prisma.planRecurso.delete({ where: { id: recursoId } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'PlanRecurso', entidadId: recursoId,
            descripcion: `Medio "${recurso.denominacion}" eliminado del catálogo`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE recursos:', error)
        return NextResponse.json({ error: 'Error eliminando el medio' }, { status: 500 })
    }
}
