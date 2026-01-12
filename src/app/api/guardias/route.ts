import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    
    let whereClause: any = {}
    
    if (mes) {
      const [year, month] = mes.split('-').map(Number)
      const inicioMes = new Date(year, month - 1, 1)
      const finMes = new Date(year, month, 0)
      whereClause.fecha = { gte: inicioMes, lte: finMes }
    }
    
    const guardias = await prisma.guardia.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true }
        }
      },
      orderBy: [{ fecha: 'asc' }, { turno: 'asc' }]
    })
    
    return NextResponse.json({ guardias })
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
    
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    
    const rolesPermitidos = ['superadmin', 'admin', 'coordinador']
    if (!rolesPermitidos.includes(usuario.rol.nombre)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    
    const body = await request.json()
    const { fecha, turno, tipo, usuarioId, notas } = body
    
    if (!fecha || !turno || !usuarioId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }
    
    const guardia = await prisma.guardia.create({
      data: {
        fecha: new Date(fecha),
        turno,
        tipo: tipo || 'ordinaria',
        notas,
        usuarioId,
        servicioId: usuario.servicioId
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true }
        }
      }
    })
    
    return NextResponse.json({ success: true, guardia })
  } catch (error) {
    console.error('Error al crear guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}