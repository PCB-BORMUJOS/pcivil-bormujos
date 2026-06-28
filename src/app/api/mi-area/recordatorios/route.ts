import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const recordatorios = await prisma.auditLog.findMany({
      where: { accion: 'RECORDATORIO', entidad: 'Disponibilidad', usuarioId: usuario.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, descripcion: true, createdAt: true }
    })

    return NextResponse.json({ recordatorios, total: recordatorios.length })
  } catch (error) {
    console.error('Error cargando recordatorios:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
