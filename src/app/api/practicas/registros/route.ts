import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const practicaId = searchParams.get('practicaId')
  const usuarioId = searchParams.get('usuarioId')
  const where: any = {}
  if (practicaId) where.practicaId = practicaId
  if (usuarioId) where.participantes = { path: '$', array_contains: usuarioId }
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
        resultado: body.firmaJefe ? 'completado' : 'pendiente_jefe',
        firmaResponsable: body.firmaResponsable || null,
        firmaJefe: body.firmaJefe || null,
        firmadoResponsableNombre: body.firmadoResponsableNombre || null,
        firmadoJefeNombre: body.firmadoJefeNombre || null,
      }
    })
    // Notificar a jefes de servicio si falta firma
    if (!body.firmaJefe) {
      const jefes = await prisma.usuario.findMany({
        where: {
          activo: true,
          rol: { nombre: { in: ['superadmin', 'superadministrador', 'admin', 'coordinador'] } }
        },
        select: { id: true }
      })
      if (jefes.length > 0) {
        await prisma.notificacion.createMany({
          data: jefes.map(j => ({
            usuarioId: j.id,
            titulo: 'Práctica pendiente de firma',
            mensaje: `La práctica ${body.practicaId} realizada en el turno ${body.turno} está pendiente de tu firma como jefe de servicio.`,
            tipo: 'info',
            leida: false,
          }))
        })
      }
    }
    return NextResponse.json({ registro })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, firmaJefe, firmadoJefeNombre } = body
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconocida'
    const jefeSession = await getServerSession(authOptions)
    const jefeUserId = (jefeSession?.user as any)?.id || null
    const registro = await prisma.registroPractica.update({
      where: { id },
      data: {
        firmaJefe,
        firmadoJefeNombre,
        firmaJefeTimestamp: new Date(),
        firmaJefeIp: ip,
        firmaJefeUserId: jefeUserId,
        resultado: 'completado'
      },
      include: {
        practica: { select: { titulo: true, numero: true } }
      }
    })
    return NextResponse.json({ registro })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
