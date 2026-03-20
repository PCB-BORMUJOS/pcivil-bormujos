import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    const hace8semanas = new Date()
    hace8semanas.setDate(hace8semanas.getDate() - 56)
    const en4semanas = new Date()
    en4semanas.setDate(en4semanas.getDate() + 28)
    const guardias = await prisma.guardia.findMany({
      where: {
        usuarioId: usuario.id,
        fecha: { gte: hace8semanas, lte: en4semanas }
      },
      orderBy: { fecha: 'desc' }
    })
    return NextResponse.json({ guardias })
  } catch (error) {
    console.error('Error cargando guardias mi-area:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
