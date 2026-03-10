import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const clave = searchParams.get('clave')
  try {
    if (clave) {
      const config = await prisma.configuracion.findUnique({ where: { clave } })
      return NextResponse.json({ config })
    }
    const configs = await prisma.configuracion.findMany()
    return NextResponse.json({ configs })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if (!['superadministrador', 'superadmin', 'admin'].includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { clave, valor, descripcion } = body
    const config = await prisma.configuracion.upsert({
      where: { clave },
      update: { valor, descripcion: descripcion || null },
      create: { clave, valor, descripcion: descripcion || null }
    })
    return NextResponse.json({ success: true, config })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
