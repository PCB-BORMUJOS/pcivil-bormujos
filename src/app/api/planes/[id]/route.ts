import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { puedeEditarModulo } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { del } from '@vercel/blob'

function puedeEditar(session: any): boolean {
    return puedeEditarModulo(session, 'planes')
}

function fechaONull(v: unknown): Date | null {
    if (!v || typeof v !== 'string' || v.trim() === '') return null
    const d = new Date(`${v.slice(0, 10)}T12:00:00+02:00`)
    return isNaN(d.getTime()) ? null : d
}
function numeroONull(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}
function textoONull(v: unknown): string | null {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t === '' ? null : t
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const plan = await prisma.plan.findUnique({
            where: { id: params.id },
            include: {
                documentos: { orderBy: { createdAt: 'desc' } },
                contactos:  { orderBy: [{ prioritario: 'desc' }, { orden: 'asc' }] },
                recursos:   { orderBy: { orden: 'asc' } },
            },
        })
        if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

        return NextResponse.json({ plan })
    } catch (error) {
        console.error('Error GET /api/planes/[id]:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden editar planes' }, { status: 403 })
        }

        const existente = await prisma.plan.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

        const body = await request.json()
        if (body.nombre !== undefined && String(body.nombre).trim() === '') {
            return NextResponse.json({ error: 'El nombre del plan no puede quedar vacío' }, { status: 400 })
        }

        // Solo se tocan los campos que llegan: así un formulario parcial no borra datos.
        const data: Record<string, unknown> = {}
        if (body.nombre !== undefined)           data.nombre = String(body.nombre).trim()
        if (body.descripcion !== undefined)      data.descripcion = textoONull(body.descripcion)
        if (body.referencia !== undefined)       data.referencia = textoONull(body.referencia)
        if (body.direccion !== undefined)        data.direccion = textoONull(body.direccion)
        if (body.latitud !== undefined)          data.latitud = numeroONull(body.latitud)
        if (body.longitud !== undefined)         data.longitud = numeroONull(body.longitud)
        if (body.fechaAprobacion !== undefined)  data.fechaAprobacion = fechaONull(body.fechaAprobacion)
        if (body.fechaRevision !== undefined)    data.fechaRevision = fechaONull(body.fechaRevision)
        if (body.organoAprobacion !== undefined) data.organoAprobacion = textoONull(body.organoAprobacion)
        if (body.responsableNombre !== undefined)   data.responsableNombre = textoONull(body.responsableNombre)
        if (body.responsableCargo !== undefined)    data.responsableCargo = textoONull(body.responsableCargo)
        if (body.responsableTelefono !== undefined) data.responsableTelefono = textoONull(body.responsableTelefono)
        if (body.responsableEmail !== undefined)    data.responsableEmail = textoONull(body.responsableEmail)
        if (body.aforo !== undefined)            data.aforo = numeroONull(body.aforo)
        if (body.ocupacion !== undefined)        data.ocupacion = textoONull(body.ocupacion)
        if (body.nivelRiesgo !== undefined)      data.nivelRiesgo = textoONull(body.nivelRiesgo)
        if (body.mediosPropios !== undefined)    data.mediosPropios = textoONull(body.mediosPropios)
        if (body.observaciones !== undefined)    data.observaciones = textoONull(body.observaciones)

        const plan = await prisma.plan.update({
            where: { id: params.id },
            data,
            include: {
                documentos: { orderBy: { createdAt: 'desc' } },
                contactos:  { orderBy: [{ prioritario: 'desc' }, { orden: 'asc' }] },
                recursos:   { orderBy: { orden: 'asc' } },
            },
        })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'UPDATE', entidad: 'Plan', entidadId: plan.id,
            descripcion: `Plan actualizado: ${plan.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, plan })
    } catch (error) {
        console.error('Error PUT /api/planes/[id]:', error)
        return NextResponse.json({ error: 'Error actualizando el plan' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden borrar planes' }, { status: 403 })
        }

        const plan = await prisma.plan.findUnique({
            where: { id: params.id },
            include: { documentos: true },
        })
        if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

        // Los ficheros del almacenamiento se borran antes: si quedaran huérfanos
        // ocuparían espacio para siempre sin que nadie los reclame.
        for (const doc of plan.documentos) {
            try { await del(doc.url) } catch (e) { console.error('No se pudo borrar el fichero', doc.url, e) }
        }
        // Los documentos caen solos por la relación en cascada.
        await prisma.plan.delete({ where: { id: params.id } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'Plan', entidadId: params.id,
            descripcion: `Plan eliminado: ${plan.nombre} (${plan.documentos.length} documento/s)`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE /api/planes/[id]:', error)
        return NextResponse.json({ error: 'Error eliminando el plan' }, { status: 500 })
    }
}
