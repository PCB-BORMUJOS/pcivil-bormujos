import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

/**
 * Función helper para registrar acciones en el log de auditoría
 * Se puede usar en cualquier lugar del backend
 */
export async function logAudit(
    req: NextRequest,
    accion: string,
    entidad: string,
    options?: {
        entidadId?: string
        datosAnteriores?: any
        datosNuevos?: any
        descripcion?: string
        modulo?: string
    }
) {
    try {
        const session = await getServerSession()

        // Obtener información del usuario
        let usuarioId: string | null = null
        let usuarioEmail: string | null = null
        let usuarioNombre: string | null = null

        if (session?.user?.email) {
            const usuario = await prisma.usuario.findUnique({
                where: { email: session.user.email },
            })
            if (usuario) {
                usuarioId = usuario.id
                usuarioEmail = usuario.email
                usuarioNombre = `${usuario.nombre} ${usuario.apellidos}`.trim()
            } else {
                usuarioEmail = session.user.email
            }
        }

        // Extraer IP y User-Agent
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
            req.headers.get('x-real-ip') ||
            'unknown'
        const userAgent = req.headers.get('user-agent') || 'unknown'

        await prisma.auditLog.create({
            data: {
                accion,
                entidad,
                entidadId: options?.entidadId || null,
                datosAnteriores: options?.datosAnteriores || undefined,
                datosNuevos: options?.datosNuevos || undefined,
                usuarioId,
                usuarioEmail,
                usuarioNombre,
                ip,
                userAgent,
                descripcion: options?.descripcion || null,
                modulo: options?.modulo || null,
            },
        })
    } catch (error) {
        console.error('Error al crear log de auditoría:', error)
        // No lanzar error para no afectar la operación principal
    }
}

export default logAudit
