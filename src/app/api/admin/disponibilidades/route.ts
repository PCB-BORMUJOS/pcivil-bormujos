import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')

    if (!semana) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }

    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: new Date(semana)
      },
      include: {
        usuario: {
          select: {
            id: true,
            numeroVoluntario: true,
            nombre: true,
            apellidos: true
          }
        }
      },
      orderBy: {
        usuario: { numeroVoluntario: 'asc' }
      }
    })

    return NextResponse.json({ disponibilidades })
  } catch (error) {
    console.error('Error al obtener disponibilidades:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}