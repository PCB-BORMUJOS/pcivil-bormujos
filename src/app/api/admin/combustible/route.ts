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
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')

    let where: Record<string, unknown> = {}
    if (mes) {
      where = { mesAnio: mes }
    } else if (anio) {
      where = { mesAnio: { startsWith: anio } }
    }

    const tickets = await prisma.ticketCombustible.findMany({
      where,
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error al obtener tickets:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      fecha, hora, estacion, numeroTarjeta, destino, concepto,
      litros, precioLitro, importeSinDto, descuento, importeFinal,
      vehiculoDestino, ticketUrl, ticketNombre, notas
    } = body

    if (!fecha || !destino || !concepto || !litros || !importeFinal) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const fechaObj = new Date(fecha)
    const mesAnio = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`

    const ticket = await prisma.ticketCombustible.create({
      data: {
        fecha: fechaObj,
        hora,
        estacion,
        numeroTarjeta: numeroTarjeta || '9724990031420621',
        destino,
        concepto,
        litros: Number(litros),
        precioLitro: Number(precioLitro),
        importeSinDto: Number(importeSinDto) || Number(importeFinal),
        descuento: Number(descuento) || 0,
        importeFinal: Number(importeFinal),
        vehiculoDestino,
        ticketUrl,
        ticketNombre,
        mesAnio,
        registradoPor: session.user.email,
        notas
      }
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Error al crear ticket:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }
  try {
    const body = await request.json()
    const { id, fecha, hora, estacion, numeroTarjeta, destino, concepto, litros, precioLitro, importeSinDto, descuento, importeFinal, vehiculoDestino, ticketUrl, ticketNombre, notas } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const fechaObj = new Date(fecha)
    const mesAnio = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`
    const ticket = await prisma.ticketCombustible.update({
      where: { id },
      data: {
        fecha: fechaObj, hora, estacion, numeroTarjeta: numeroTarjeta || '9724990031420621',
        destino, concepto, litros: Number(litros), precioLitro: Number(precioLitro),
        importeSinDto: Number(importeSinDto) || Number(importeFinal),
        descuento: Number(descuento) || 0, importeFinal: Number(importeFinal),
        vehiculoDestino, ticketUrl, ticketNombre, mesAnio, notas
      }
    })
    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({ accion: 'UPDATE', entidad: 'TicketCombustible', entidadId: id, descripcion: `Ticket editado: ${destino} ${importeFinal}€`, usuarioId, usuarioNombre, modulo: 'Administración' })
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Error al editar ticket:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await prisma.ticketCombustible.delete({ where: { id } })
    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({ accion: 'DELETE', entidad: 'TicketCombustible', entidadId: id, descripcion: 'Ticket de combustible eliminado', usuarioId, usuarioNombre, modulo: 'Administración' })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar ticket:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}