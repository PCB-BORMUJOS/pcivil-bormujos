import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const soloNoLeidas = searchParams.get('noLeidas') === 'true'
    const limite = parseInt(searchParams.get('limite') || '20')

    const where: any = { usuarioId: usuario.id }
    if (soloNoLeidas) {
      where.leida = false
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      include: {
        peticion: {
          select: { numero: true, nombreArticulo: true, estado: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limite
    })

    const noLeidas = await prisma.notificacion.count({
      where: { usuarioId: usuario.id, leida: false }
    })

    return NextResponse.json({ notificaciones, noLeidas })
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT - Marcar notificaciones como leídas
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { notificacionId, marcarTodas } = body

    if (marcarTodas) {
      await prisma.notificacion.updateMany({
        where: { usuarioId: usuario.id, leida: false },
        data: { leida: true }
      })
    } else if (notificacionId) {
      await prisma.notificacion.update({
        where: { id: notificacionId, usuarioId: usuario.id },
        data: { leida: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en PUT /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
