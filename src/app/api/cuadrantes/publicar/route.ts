import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const esAdmin = ['superadmin', 'admin', 'coordinador'].includes((session.user as any).rol)
    if (!esAdmin) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { semana, publicado } = await request.json()
    if (!semana) return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })

    const registro = await prisma.semanaPublicada.upsert({
      where: { semana },
      update: { publicado: Boolean(publicado) },
      create: { semana, publicado: Boolean(publicado) },
    })
    return NextResponse.json({ semana: registro.semana, publicado: registro.publicado })
  } catch (error) {
    console.error('Error publicando semana:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
