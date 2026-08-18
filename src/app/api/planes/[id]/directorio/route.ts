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

/** POST /api/planes/[id]/directorio — añade un contacto al directorio del plan. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar el directorio' }, { status: 403 })
        }

        const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { id: true, nombre: true } })
        if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

        const body = await request.json()
        if (!body.nombre || String(body.nombre).trim() === '') {
            return NextResponse.json({ error: 'El nombre del contacto es obligatorio' }, { status: 400 })
        }
        // Un contacto sin ninguna forma de contactar no sirve de nada en una emergencia.
        if (!txt(body.telefono) && !txt(body.telefonoAlt) && !txt(body.email)) {
            return NextResponse.json({ error: 'Indica al menos un teléfono o un correo electrónico' }, { status: 400 })
        }

        const maxOrden = await prisma.planContacto.aggregate({ _max: { orden: true }, where: { planId: plan.id } })

        const contacto = await prisma.planContacto.create({
            data: {
                planId: plan.id,
                nombre: String(body.nombre).trim(),
                cargo: txt(body.cargo),
                entidad: txt(body.entidad),
                categoria: txt(body.categoria) || 'otros',
                telefono: txt(body.telefono),
                telefonoAlt: txt(body.telefonoAlt),
                email: txt(body.email),
                disponibilidad: txt(body.disponibilidad),
                notas: txt(body.notas),
                prioritario: Boolean(body.prioritario),
                orden: (maxOrden._max.orden ?? 0) + 1,
            },
        })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'CREATE', entidad: 'PlanContacto', entidadId: contacto.id,
            descripcion: `Contacto "${contacto.nombre}" añadido al directorio de ${plan.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, contacto })
    } catch (error) {
        console.error('Error POST directorio:', error)
        return NextResponse.json({ error: 'Error añadiendo el contacto' }, { status: 500 })
    }
}

/** PUT /api/planes/[id]/directorio?contactoId=... */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar el directorio' }, { status: 403 })
        }

        const contactoId = new URL(request.url).searchParams.get('contactoId')
        if (!contactoId) return NextResponse.json({ error: 'Falta el identificador del contacto' }, { status: 400 })

        const existente = await prisma.planContacto.findUnique({ where: { id: contactoId } })
        if (!existente || existente.planId !== params.id) {
            return NextResponse.json({ error: 'Contacto no encontrado en este plan' }, { status: 404 })
        }

        const body = await request.json()
        const data: Record<string, unknown> = {}
        if (body.nombre !== undefined) {
            if (String(body.nombre).trim() === '') {
                return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 })
            }
            data.nombre = String(body.nombre).trim()
        }
        for (const campo of ['cargo', 'entidad', 'telefono', 'telefonoAlt', 'email', 'disponibilidad', 'notas'] as const) {
            if (body[campo] !== undefined) data[campo] = txt(body[campo])
        }
        if (body.categoria !== undefined)   data.categoria = txt(body.categoria) || 'otros'
        if (body.prioritario !== undefined) data.prioritario = Boolean(body.prioritario)

        const contacto = await prisma.planContacto.update({ where: { id: contactoId }, data })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'UPDATE', entidad: 'PlanContacto', entidadId: contacto.id,
            descripcion: `Contacto "${contacto.nombre}" actualizado`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, contacto })
    } catch (error) {
        console.error('Error PUT directorio:', error)
        return NextResponse.json({ error: 'Error actualizando el contacto' }, { status: 500 })
    }
}

/** DELETE /api/planes/[id]/directorio?contactoId=... */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar el directorio' }, { status: 403 })
        }

        const contactoId = new URL(request.url).searchParams.get('contactoId')
        if (!contactoId) return NextResponse.json({ error: 'Falta el identificador del contacto' }, { status: 400 })

        const contacto = await prisma.planContacto.findUnique({ where: { id: contactoId } })
        if (!contacto || contacto.planId !== params.id) {
            return NextResponse.json({ error: 'Contacto no encontrado en este plan' }, { status: 404 })
        }

        await prisma.planContacto.delete({ where: { id: contactoId } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'PlanContacto', entidadId: contactoId,
            descripcion: `Contacto "${contacto.nombre}" eliminado del directorio`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE directorio:', error)
        return NextResponse.json({ error: 'Error eliminando el contacto' }, { status: 500 })
    }
}
