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

        const recordatorios = filas.map(f => ({
            id: f.id,
            descripcion: f.descripcion,
            createdAt: f.createdAt,
            fueraDePlazo: f.accion === ACCIONES_INCIDENCIA.FUERA_DE_PLAZO,
            semana: (f.datosNuevos as any)?.semanaInicio ?? null,
            retraso: (f.datosNuevos as any)?.retraso ?? null,
        }))

        return NextResponse.json({
            recordatorios,
            total: recordatorios.length,
            sinEnviar: recordatorios.filter(r => !r.fueraDePlazo).length,
            fueraDePlazo: recordatorios.filter(r => r.fueraDePlazo).length,
        })
    } catch (error) {
        console.error('Error cargando incidencias de disponibilidad:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
