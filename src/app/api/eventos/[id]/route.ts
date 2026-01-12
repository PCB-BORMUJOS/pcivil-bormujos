import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const evento = await prisma.evento.findUnique({
      where: { id: params.id },
      include: {
        creador: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } },
        participantes: {
          include: { usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } } }
        }
      }
    })
    
    if (!evento) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    return NextResponse.json({ evento })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email }, include: { rol: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    
    const rolesPermitidos = ['superadmin', 'admin', 'coordinador']
    if (!rolesPermitidos.includes(usuario.rol.nombre)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    
    const body = await request.json()
    const evento = await prisma.evento.update({
      where: { id: params.id },
      data: {
        titulo: body.titulo, descripcion: body.descripcion, tipo: body.tipo,
        fecha: body.fecha ? new Date(body.fecha) : undefined,
        horaInicio: body.horaInicio, horaFin: body.horaFin, todoElDia: body.todoElDia,
        ubicacion: body.ubicacion, direccion: body.direccion, estado: body.estado,
        visible: body.visible, voluntariosMin: body.voluntariosMin,
        voluntariosMax: body.voluntariosMax, color: body.color
      }
    })
    
    return NextResponse.json({ success: true, evento })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email }, include: { rol: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    
    if (!['superadmin', 'admin'].includes(usuario.rol.nombre)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    
    await prisma.evento.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true, message: 'Evento eliminado' })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}