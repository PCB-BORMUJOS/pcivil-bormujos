import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/indicativos
 * Devuelve la lista de indicativos (números de voluntario) activos
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

    try {
        const usuarios = await prisma.usuario.findMany({
            where: {
                activo: true,
                numeroVoluntario: { not: null }
            },
            select: {
                numeroVoluntario: true,
            },
            orderBy: {
                numeroVoluntario: 'asc'
            }
        })

        const indicativos = usuarios
            .map(u => u.numeroVoluntario)
            .filter((ind): ind is string => ind !== null)

        // Si no hay indicativos en BD, devolver lista base
        if (indicativos.length === 0) {
            const basicos = [
                'J-44',
                ...Array.from({ length: 50 }, (_, i) => `B-${String(i + 1).padStart(2, '0')}`)
            ]
            return NextResponse.json({ indicativos: basicos })
        }

        return NextResponse.json({ indicativos })
    } catch (error) {
        console.error('Error obteniendo indicativos:', error)
        return NextResponse.json(
            { error: 'Error obteniendo indicativos' },
            { status: 500 }
        )
    }
}
