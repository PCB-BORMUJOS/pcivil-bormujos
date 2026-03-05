import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ voluntarios: [], vehiculos: [], servicios: [] })

  const [voluntarios, vehiculos, servicios] = await Promise.all([
    prisma.usuario.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { apellidos: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { numeroVoluntario: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, nombre: true, apellidos: true, email: true, numeroVoluntario: true, rol: { select: { nombre: true } } },
      take: 8,
    }),
    prisma.vehiculo.findMany({
      where: {
        OR: [
          { indicativo: { contains: q, mode: 'insensitive' } },
          { matricula: { contains: q, mode: 'insensitive' } },
          { marca: { contains: q, mode: 'insensitive' } },
          { modelo: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, indicativo: true, matricula: true, marca: true, modelo: true, tipo: true, estado: true },
      take: 5,
    }),
prisma.servicio.findMany({
      where: { nombre: { contains: q, mode: 'insensitive' } },
      select: { id: true, nombre: true },
      take: 5,
    }),
  ])

  return NextResponse.json({ voluntarios, vehiculos, servicios })
}
