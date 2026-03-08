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
    const incluirDisponibilidades = searchParams.get('incluirDisponibilidades') === 'true'
    if (!semana) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }
    const inicioSemana = new Date(semana + 'T00:00:00.000Z')
    const finSemana = new Date(semana + 'T00:00:00.000Z')
    finSemana.setDate(finSemana.getDate() + 6)
    finSemana.setHours(23, 59, 59, 999)
    const guardias = await prisma.guardia.findMany({
      where: { fecha: { gte: inicioSemana, lte: finSemana } },
      include: {
        usuario: {
          select: {
            id: true, nombre: true, apellidos: true, numeroVoluntario: true,
            email: true, responsableTurno: true, carnetConducir: true, esOperativo: true,
          }
        }
      },
      orderBy: [{ fecha: 'asc' }, { turno: 'asc' }]
    })
    if (!incluirDisponibilidades) {
      return NextResponse.json({ guardias })
    }
    const semanaStart = new Date(semana + 'T00:00:00.000Z')
    const semanaEnd = new Date(semana + 'T23:59:59.999Z')
    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: { gte: semanaStart, lte: semanaEnd },
        noDisponible: false
      },
      include: {
        usuario: {
          select: {
            id: true, nombre: true, apellidos: true, numeroVoluntario: true,
            responsableTurno: true, carnetConducir: true, experiencia: true,
            nivelCompromiso: true, esOperativo: true,
          }
        }
      }
    })
    return NextResponse.json({ guardias, disponibilidades })
  } catch (error) {
    console.error('Error al obtener guardias:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
      return NextResponse.json({ error: 'No tienes permisos para crear guardias' }, { status: 403 })
    }
    const body = await request.json()
    const { fecha, turno, usuarioId, tipo, notas, servicioId, rol } = body
    if (!fecha || !turno || !usuarioId) {
      return NextResponse.json({ error: 'Fecha, turno y usuarioId son requeridos' }, { status: 400 })
    }
    const existente = await prisma.guardia.findFirst({
      where: { usuarioId, fecha: new Date(fecha + 'T12:00:00.000Z'), turno }
    })
    if (existente) {
      return NextResponse.json({ error: 'Ya existe una guardia para este usuario en esta fecha y turno' }, { status: 400 })
    }
    const usuarioAsignado = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    const guardia = await prisma.guardia.create({
      data: {
        fecha: new Date(fecha + 'T12:00:00.000Z'),
        turno, rol: rol || null,
        tipo: tipo || 'programada',
        notas: notas || '',
        usuarioId,
        servicioId: servicioId || usuarioAsignado?.servicioId || '',
        estado: 'programada'
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } }
      }
    })
    return NextResponse.json({ success: true, guardia })
  } catch (error) {
    console.error('Error al crear guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    const body = await request.json()
    const { id, tipo, notas, estado } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const guardia = await prisma.guardia.update({
      where: { id },
      data: {
        ...(tipo && { tipo }),
        ...(notas !== undefined && { notas }),
        ...(estado && { estado })
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } }
      }
    })
    return NextResponse.json({ success: true, guardia })
  } catch (error) {
    console.error('Error al actualizar guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await prisma.guardia.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
