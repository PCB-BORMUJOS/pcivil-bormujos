import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true, servicio: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'recibidos' // recibidos, enviados, todos
    const soloNoLeidos = searchParams.get('noLeidos') === 'true'

    let where: any = {}

    if (tipo === 'recibidos') {
      where = {
        OR: [
          { destinatarioId: usuario.id },
          { destinatarioGrupo: 'todos' },
          { destinatarioGrupo: `area:${usuario.servicio?.nombre?.toLowerCase()}` },
          { destinatarioGrupo: `rol:${usuario.rol.nombre}` }
        ],
        archivado: false
      }
    } else if (tipo === 'enviados') {
      where = { remitenteId: usuario.id }
    }

    if (soloNoLeidos) {
      where.leido = false
    }

    const mensajes = await prisma.mensaje.findMany({
      where,
      include: {
        remitente: {
          select: { id: true, nombre: true, apellidos: true, avatar: true }
        },
        destinatario: {
          select: { id: true, nombre: true, apellidos: true }
        },
        respuestas: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Contar no leídos
    const noLeidos = await prisma.mensaje.count({
      where: {
        OR: [
          { destinatarioId: usuario.id },
          { destinatarioGrupo: 'todos' },
          { destinatarioGrupo: `area:${usuario.servicio?.nombre?.toLowerCase()}` },
          { destinatarioGrupo: `rol:${usuario.rol.nombre}` }
        ],
        leido: false,
        archivado: false
      }
    })

    return NextResponse.json({ mensajes, noLeidos })
  } catch (error) {
    console.error('Error en GET /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
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

    const body = await request.json()
    const { asunto, contenido, destinatarioId, destinatarioGrupo, tipo, prioridad, mensajePadreId } = body

    if (!asunto || !contenido) {
      return NextResponse.json({ error: 'Asunto y contenido son requeridos' }, { status: 400 })
    }

    if (!destinatarioId && !destinatarioGrupo) {
      return NextResponse.json({ error: 'Debe especificar un destinatario' }, { status: 400 })
    }

    // Verificar permisos para enviar a grupos
    const rolesAdmin = ['superadmin', 'admin']
    if (destinatarioGrupo && !rolesAdmin.includes(usuario.rol.nombre)) {
      // Solo coordinadores pueden enviar a su área
      if (usuario.rol.nombre === 'coordinador') {
        if (!destinatarioGrupo.startsWith('area:')) {
          return NextResponse.json({ error: 'Solo puedes enviar mensajes a tu área' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'No tienes permisos para enviar a grupos' }, { status: 403 })
      }
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        asunto,
        contenido,
        tipo: tipo || 'mensaje',
        prioridad: prioridad || 'normal',
        remitenteId: usuario.id,
        destinatarioId: destinatarioId || null,
        destinatarioGrupo: destinatarioGrupo || null,
        mensajePadreId: mensajePadreId || null
      },
      include: {
        remitente: { select: { nombre: true, apellidos: true } },
        destinatario: { select: { nombre: true, apellidos: true } }
      }
    })

    // Si es mensaje individual, crear notificación
    if (destinatarioId) {
      await prisma.notificacion.create({
        data: {
          tipo: 'mensaje',
          titulo: `Nuevo mensaje de ${usuario.nombre} ${usuario.apellidos}`,
          mensaje: asunto,
          enlace: '/mi-area?tab=notificaciones',
          usuarioId: destinatarioId
        }
      })
    }

    return NextResponse.json({ success: true, mensaje })
  } catch (error) {
    console.error('Error en POST /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
    const { mensajeId, accion } = body // accion: marcarLeido, archivar

    if (accion === 'marcarLeido') {
      await prisma.mensaje.update({
        where: { id: mensajeId },
        data: { leido: true }
      })
    } else if (accion === 'marcarTodosLeidos') {
      await prisma.mensaje.updateMany({
        where: {
          OR: [
            { destinatarioId: usuario.id },
            { destinatarioGrupo: 'todos' }
          ],
          leido: false
        },
        data: { leido: true }
      })
    } else if (accion === 'archivar') {
      await prisma.mensaje.update({
        where: { id: mensajeId },
        data: { archivado: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en PUT /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
