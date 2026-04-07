import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')

    if (!semana) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }

    const disponibilidad = await prisma.disponibilidad.findFirst({
      where: {
        usuarioId: usuario.id,
        semanaInicio: new Date(semana)
      }
    })

    if (disponibilidad) {
      // El campo detalles ya es JSON, no necesita parse
      return NextResponse.json({ 
        disponibilidad: {
          ...disponibilidad,
          detalles: typeof disponibilidad.detalles === 'string' 
            ? JSON.parse(disponibilidad.detalles) 
            : disponibilidad.detalles
        }
      })
      const { usuarioId: uId2, usuarioNombre: uNombre2 } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'Disponibilidad', entidadId: disponibilidad.id, descripcion: `${uNombre2} registró su disponibilidad para la semana ${semanaInicio}`, usuarioId: uId2, usuarioNombre: uNombre2, modulo: 'Dashboard' })
    }

    return NextResponse.json({ disponibilidad: null })
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { semanaInicio, noDisponible, detalles, turnosDeseados, puedeDobleturno, notas } = body

    if (!semanaInicio) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }

    // Buscar si ya existe una disponibilidad para esta semana
    const existente = await prisma.disponibilidad.findFirst({
      where: {
        usuarioId: usuario.id,
        semanaInicio: new Date(semanaInicio)
      }
    })

    const data = {
      semanaInicio: new Date(semanaInicio),
      noDisponible: noDisponible || false,
      detalles: detalles || {},
      turnosDeseados: turnosDeseados || 1,
      puedeDobleturno: puedeDobleturno || false,
      notas: notas || '',
      usuarioId: usuario.id,
      estado: 'pendiente'
    }

    let disponibilidad

    if (existente) {
      // Actualizar
      disponibilidad = await prisma.disponibilidad.update({
        where: { id: existente.id },
        data: {
          noDisponible: data.noDisponible,
          detalles: data.detalles,
          turnosDeseados: data.turnosDeseados,
          puedeDobleturno: data.puedeDobleturno,
          notas: data.notas,
          estado: data.estado
        }
      })
      const { usuarioId: uId, usuarioNombre: uNombre } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'UPDATE', entidad: 'Disponibilidad', entidadId: disponibilidad.id, descripcion: `${uNombre} actualizó su disponibilidad para la semana ${semanaInicio}`, usuarioId: uId, usuarioNombre: uNombre, modulo: 'Dashboard' })
    } else {
      // Crear nueva
      disponibilidad = await prisma.disponibilidad.create({
        data
      })
      const { usuarioId: uId2, usuarioNombre: uNombre2 } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'Disponibilidad', entidadId: disponibilidad.id, descripcion: `${uNombre2} registró su disponibilidad para la semana ${semanaInicio}`, usuarioId: uId2, usuarioNombre: uNombre2, modulo: 'Dashboard' })
    }

    return NextResponse.json({ success: true, disponibilidad })
  } catch (error) {
    console.error('Error al guardar disponibilidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}