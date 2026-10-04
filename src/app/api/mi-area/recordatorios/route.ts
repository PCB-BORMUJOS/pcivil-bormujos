import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ACCIONES_INCIDENCIA } from '@/lib/disponibilidad-avisos'

/**
 * Incidencias de disponibilidad de la persona que consulta: las semanas que no
 * envió y las que envió pasado el cierre del viernes. Alimentan el histórico de
 * «Mi Área».
 */
export async function GET(_request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    try {
        const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email } })
        if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

        const filas = await prisma.auditLog.findMany({
            where: {
                accion: { in: Object.values(ACCIONES_INCIDENCIA) },
                entidad: 'Disponibilidad',
                usuarioId: usuario.id,
            },
            orderBy: { createdAt: 'desc' },
            take: 60,
            select: { id: true, accion: true, descripcion: true, createdAt: true, datosNuevos: true },
        })

        // Las justificadas siguen figurando, pero no cuentan: cada uno debe ver
        // que su incidencia está resuelta y por qué motivo.
        const justificaciones = await prisma.justificacionDisponibilidad.findMany({
            where: { usuarioId: usuario.id },
            select: { semanaInicio: true, motivo: true, autorizadoPorNombre: true, createdAt: true },
        })
        const justifMap = new Map(justificaciones.map(j => [
            j.semanaInicio.toISOString().slice(0, 10),
            { motivo: j.motivo, autorizadoPor: j.autorizadoPorNombre, fecha: j.createdAt },
        ]))

        const recordatorios = filas.map(f => ({
            id: f.id,
            descripcion: f.descripcion,
            createdAt: f.createdAt,
            fueraDePlazo: f.accion === ACCIONES_INCIDENCIA.FUERA_DE_PLAZO,
            semana: (f.datosNuevos as any)?.semanaInicio ?? null,
            // Cuándo cerraba el plazo y a qué hora se envió realmente, los
            // mismos datos que ve la Jefatura en Estadísticas: cada uno debe
            // poder comprobar su propio registro.
            cierre: (f.datosNuevos as any)?.cierre ?? null,
            enviadaEl: (f.datosNuevos as any)?.enviadaEl ?? null,
            retraso: (f.datosNuevos as any)?.retraso ?? null,
            justificacion: justifMap.get((f.datosNuevos as any)?.semanaInicio) ?? null,
        }))

        const computan = recordatorios.filter(r => !r.justificacion)
        return NextResponse.json({
            recordatorios,
            total: recordatorios.length,
            sinEnviar: computan.filter(r => !r.fueraDePlazo).length,
            fueraDePlazo: computan.filter(r => r.fueraDePlazo).length,
            justificadas: recordatorios.length - computan.length,
        })
    } catch (error) {
        console.error('Error cargando incidencias de disponibilidad:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
