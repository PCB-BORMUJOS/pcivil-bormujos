import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if (!['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(rol)) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')

    if (!semana) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }

    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: new Date(semana)
      },
      include: {
        usuario: {
          select: {
            id: true,
            numeroVoluntario: true,
            nombre: true,
            apellidos: true
          }
        }
      },
      orderBy: {
        usuario: { numeroVoluntario: 'asc' }
      }
    })

    return NextResponse.json({ disponibilidades })
  } catch (error) {
    console.error('Error al obtener disponibilidades:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if (!['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(rol)) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { disponibilidadId, noDisponible, turnosDeseados, notas } = body

    if (!disponibilidadId) {
      return NextResponse.json({ error: 'ID de disponibilidad requerido' }, { status: 400 })
    }

    const disponibilidad = await prisma.disponibilidad.update({
      where: { id: disponibilidadId },
      data: {
        noDisponible: noDisponible ?? false,
        turnosDeseados: turnosDeseados ?? 1,
        notas: notas ?? null
      },
      include: {
        usuario: {
          select: {
            id: true,
            numeroVoluntario: true,
            nombre: true,
            apellidos: true
          }
        }
      }
    })

    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({ accion: 'UPDATE', entidad: 'Disponibilidad', entidadId: disponibilidad.id, descripcion: 'Disponibilidad actualizada por admin', usuarioId, usuarioNombre, modulo: 'Administracion' })
    return NextResponse.json({ success: true, disponibilidad })
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}