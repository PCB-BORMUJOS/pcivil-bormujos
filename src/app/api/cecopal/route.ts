import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getHoraActual(): string {
  return new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })
}

function getHoraTurno(): string {
  const h = parseInt(new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit' }))
  if (h >= 7 && h < 15) return 'manana'
  if (h >= 15 && h < 23) return 'tarde'
  return 'noche'
}

async function generarNumero(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.incidenciaCecopal.count({ where: { numero: { startsWith: `CEC-${year}` } } })
  return `CEC-${year}-${String(count + 1).padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  try {
    if (tipo === 'turno-hoy') {
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      const turno = getHoraTurno()
      const guardias = await prisma.guardia.findMany({
        where: {
          fecha: { gte: new Date(hoy), lt: new Date(new Date(hoy).getTime() + 86400000) },
          turno,
          estado: { not: 'cancelada' }
        },
        include: { usuario: { select: { id: true, nombre: true, apellidos: true, indicativo: true, telefono: true } } },
        orderBy: { rol: 'asc' }
      })
      return NextResponse.json({ guardias, turno, fecha: hoy })
    }
    if (tipo === 'vehiculos-disponibles') {
      const vehiculos = await prisma.vehiculo.findMany({
        where: { estado: 'disponible' },
        select: { id: true, indicativo: true, matricula: true, marca: true, modelo: true, tipo: true, estado: true }
      })
      return NextResponse.json({ vehiculos })
    }
    if (tipo === 'incidencia-activa') {
      const incidencia = await prisma.incidenciaCecopal.findFirst({
        where: { estado: 'activa' },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'historial') {
      const incidencias = await prisma.incidenciaCecopal.findMany({
        where: { estado: { not: 'activa' } },
        include: { operador: { select: { nombre: true, apellidos: true, indicativo: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
      return NextResponse.json({ incidencias })
    }
    if (tipo === 'alertas') {
      const hoy = new Date()
      const en30dias = new Date(hoy.getTime() + 30 * 86400000)
      const [botiquines, deas, vehiculos] = await Promise.all([
        prisma.botiquin.findMany({
          where: { OR: [{ proximaRevision: { lte: hoy } }, { estado: { not: 'operativo' } }] },
          select: { id: true, nombre: true, estado: true, proximaRevision: true }
        }),
        prisma.dEA.findMany({
          where: { OR: [{ caducidadBateria: { lte: en30dias } }, { caducidadParches: { lte: en30dias } }, { caducidadPilas: { lte: en30dias } }, { estado: { not: 'operativo' } }] },
          select: { id: true, codigo: true, ubicacion: true, estado: true, caducidadBateria: true, caducidadParches: true, caducidadPilas: true }
        }),
        prisma.vehiculo.findMany({
          where: { OR: [{ fechaItv: { lte: en30dias } }, { fechaSeguro: { lte: en30dias } }] },
          select: { id: true, indicativo: true, matricula: true, fechaItv: true, fechaSeguro: true }
        })
      ])
      return NextResponse.json({ botiquines, deas, vehiculos })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error GET /api/cecopal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { tipo } = body
    if (tipo === 'incidencia') {
      const numero = await generarNumero()
      const incidencia = await prisma.incidenciaCecopal.create({
        data: {
          numero,
          estado: 'activa',
          tipoIncidencia: body.tipoIncidencia,
          origenAviso: body.origenAviso,
          direccion: body.direccion,
          descripcion: body.descripcion || null,
          horaLlamada: body.horaLlamada || getHoraActual(),
          vehiculosIds: body.vehiculosIds || [],
          voluntariosIds: body.voluntariosIds || [],
          operadorId: (session.user as any).id
        }
      })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'novedad-turno') {
      const numero = await generarNumero()
      const novedad = await prisma.incidenciaCecopal.create({
        data: {
          numero,
          estado: 'novedad',
          tipoIncidencia: 'novedad',
          origenAviso: 'interno',
          direccion: '-',
          descripcion: body.texto,
          horaLlamada: getHoraActual(),
          operadorId: (session.user as any).id
        }
      })
      return NextResponse.json({ novedad })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error POST /api/cecopal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, tipo } = body
    if (tipo === 'isocrona') {
      const incidencia = await prisma.incidenciaCecopal.update({
        where: { id },
        data: { [body.campo]: body.valor }
      })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'resolver') {
      const incidencia = await prisma.incidenciaCecopal.update({
        where: { id },
        data: {
          estado: 'resuelta',
          horaDisponible: body.horaDisponible || getHoraActual(),
          observaciones: body.observaciones || null,
          parteId: body.parteId || null
        }
      })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'actualizar') {
      const incidencia = await prisma.incidenciaCecopal.update({
        where: { id },
        data: {
          descripcion: body.descripcion,
          observaciones: body.observaciones,
          vehiculosIds: body.vehiculosIds,
          voluntariosIds: body.voluntariosIds,
          horaSalida: body.horaSalida,
          horaLlegada: body.horaLlegada,
          horaTerminado: body.horaTerminado,
          horaDisponible: body.horaDisponible,
        }
      })
      return NextResponse.json({ incidencia })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error PUT /api/cecopal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
