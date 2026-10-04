import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/**
 * Justificar o desjustificar una incidencia de disponibilidad.
 *
 * La incidencia no se borra ni se modifica: sigue constando que no se envió o
 * que se envió tarde. Lo que hace la justificación es dejar escrito el motivo y
 * quién lo autoriza, de modo que deje de contar como incumplimiento. Así el
 * registro sigue diciendo la verdad y a la vez no penaliza a quien tenía una
 * razón legítima.
 *
 * Solo Jefatura y coordinación: es un acto administrativo, no una preferencia.
 */

const ROLES = ['superadmin', 'coordinador', 'admin']

async function autorizar() {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: 'No autorizado', status: 401 as const, session: null }
    const rol = (session.user as any)?.rol?.toLowerCase() || ''
    if (!ROLES.includes(rol)) return { error: 'Sin permisos suficientes', status: 403 as const, session: null }
    return { error: null, status: 200 as const, session }
}

/** La semana llega como AAAA-MM-DD (el lunes del cuadrante). */
function lunesDe(semana: unknown): Date | null {
    if (typeof semana !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(semana)) return null
    const d = new Date(`${semana}T00:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
}

export async function POST(request: NextRequest) {
    const permiso = await autorizar()
    if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status })

    try {
        const { usuarioId, semana, motivo } = await request.json()
        const lunes = lunesDe(semana)
        if (!usuarioId || !lunes) {
            return NextResponse.json({ error: 'Falta el indicativo o la semana' }, { status: 400 })
        }
        const texto = String(motivo ?? '').trim()
        if (texto.length < 3) {
            return NextResponse.json({ error: 'Hay que indicar el motivo de la justificación' }, { status: 400 })
        }

        const afectado = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: { nombre: true, apellidos: true, numeroVoluntario: true },
        })
        if (!afectado) return NextResponse.json({ error: 'Indicativo no encontrado' }, { status: 404 })

        const { usuarioId: autorId, usuarioNombre } = getUsuarioAudit(permiso.session)

        const justificacion = await prisma.justificacionDisponibilidad.upsert({
            where: { usuarioId_semanaInicio: { usuarioId, semanaInicio: lunes } },
            create: {
                usuarioId, semanaInicio: lunes, motivo: texto,
                autorizadoPorId: autorId, autorizadoPorNombre: usuarioNombre,
            },
            update: { motivo: texto, autorizadoPorId: autorId, autorizadoPorNombre: usuarioNombre },
        })

        await registrarAudit({
            accion: 'CREATE',
            entidad: 'JustificacionDisponibilidad',
            entidadId: justificacion.id,
            descripcion: `Disponibilidad de ${afectado.numeroVoluntario || ''} ${afectado.nombre} ${afectado.apellidos} justificada para la semana del ${semana}: ${texto}`,
            datosNuevos: { usuarioId, semana, motivo: texto },
            usuarioId: autorId, usuarioNombre, modulo: 'Administracion',
        })

        return NextResponse.json({ success: true, justificacion })
    } catch (error) {
        console.error('Error justificando disponibilidad:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const permiso = await autorizar()
    if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status })

    try {
        const { searchParams } = new URL(request.url)
        const usuarioId = searchParams.get('usuarioId')
        const lunes = lunesDe(searchParams.get('semana'))
        if (!usuarioId || !lunes) {
            return NextResponse.json({ error: 'Falta el indicativo o la semana' }, { status: 400 })
        }

        const previa = await prisma.justificacionDisponibilidad.findUnique({
            where: { usuarioId_semanaInicio: { usuarioId, semanaInicio: lunes } },
            include: { usuario: { select: { nombre: true, apellidos: true, numeroVoluntario: true } } },
        })
        if (!previa) return NextResponse.json({ error: 'Esa incidencia no estaba justificada' }, { status: 404 })

        await prisma.justificacionDisponibilidad.delete({ where: { id: previa.id } })

        const { usuarioId: autorId, usuarioNombre } = getUsuarioAudit(permiso.session)
        await registrarAudit({
            accion: 'DELETE',
            entidad: 'JustificacionDisponibilidad',
            entidadId: previa.id,
            descripcion: `Retirada la justificación de disponibilidad de ${previa.usuario.numeroVoluntario || ''} ${previa.usuario.nombre} ${previa.usuario.apellidos} de la semana del ${searchParams.get('semana')}`,
            datosAnteriores: { motivo: previa.motivo, autorizadoPorNombre: previa.autorizadoPorNombre },
            usuarioId: autorId, usuarioNombre, modulo: 'Administracion',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error retirando justificación:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
