import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { safeJsonParse } from '@/lib/utils'

// GET: Obtener historial de disponibilidades del usuario actual
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email }
        })

        if (!usuario) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // Obtener últimas 20 disponibilidades
        const disponibilidades = await prisma.disponibilidad.findMany({
            where: {
                usuarioId: usuario.id
            },
            orderBy: {
                semanaInicio: 'desc'
            },
            take: 20
        })

        // Parsear detalles JSON si es necesario
        const disponibilidadesFormateadas = disponibilidades.map(d => ({
            ...d,
            detalles: safeJsonParse(d.detalles, {})
        }))

        return NextResponse.json({ disponibilidades: disponibilidadesFormateadas })
    } catch (error) {
        console.error('Error al obtener disponibilidades:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
