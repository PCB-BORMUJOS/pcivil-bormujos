import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function getUsuario() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return prisma.usuario.findUnique({ where: { email: session.user.email } })
}

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuario()
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const soloNoLeidas = searchParams.get('noLeidas') === 'true'
    const limite = parseInt(searchParams.get('limite') || '20')

    const where: any = { usuarioId: usuario.id }
    if (soloNoLeidas) where.leida = false

    const [notificaciones, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        include: { peticion: { select: { numero: true, nombreArticulo: true, estado: true } } },
        orderBy: { createdAt: 'desc' },
        take: limite,
      }),
      prisma.notificacion.count({ where: { usuarioId: usuario.id, leida: false } }),
    ])

    return NextResponse.json({ notificaciones, noLeidas })
  } catch (error) {
    console.error('Error GET /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT - Marcar como leídas (individual o todas)
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuario()
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { notificacionId, marcarTodas } = await request.json()

    if (marcarTodas) {
      await prisma.notificacion.updateMany({
        where: { usuarioId: usuario.id, leida: false },
        data: { leida: true },
      })
    } else if (notificacionId) {
      await prisma.notificacion.update({
        where: { id: notificacionId, usuarioId: usuario.id },
        data: { leida: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error PUT /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE - Borrar todas las notificaciones leídas del usuario
export async function DELETE() {
  try {
    const usuario = await getUsuario()
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { count } = await prisma.notificacion.deleteMany({
      where: { usuarioId: usuario.id, leida: true },
    })

    return NextResponse.json({ success: true, eliminadas: count })
  } catch (error) {
    console.error('Error DELETE /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
