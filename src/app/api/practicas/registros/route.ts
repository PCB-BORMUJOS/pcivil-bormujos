import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const practicaId = searchParams.get('practicaId')
  const where: any = {}
  if (practicaId) where.practicaId = practicaId
  try {
    const registros = await prisma.registroPractica.findMany({
      where,
      include: {
        practica: { select: { titulo: true, numero: true, familia: true } },
        responsable: { select: { nombre: true, apellidos: true, numeroVoluntario: true } }
      },
      orderBy: { fecha: 'desc' },
      take: 50
    })
    return NextResponse.json({ registros })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const registro = await prisma.registroPractica.create({
      data: {
        practicaId: body.practicaId,
        megacodeId: body.megacodeId || null,
        turno: body.turno,
        duracionReal: body.duracionReal ? parseInt(body.duracionReal) : null,
        responsableId: body.responsableId,
        participantes: body.participantes || [],
        observaciones: body.observaciones || null,
        resultado: body.resultado || 'completado',
        firmaResponsable: body.firmaResponsable || null,
        firmaJefe: body.firmaJefe || null,
        firmadoResponsableNombre: body.firmadoResponsableNombre || null,
        firmadoJefeNombre: body.firmadoJefeNombre || null,
      }
    })
    return NextResponse.json({ registro })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
