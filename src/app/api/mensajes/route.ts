import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true, fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true } } }
    })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'recibidos'

    if (tipo === 'hilo') {
      const mensajeId = searchParams.get('mensajeId')
      if (!mensajeId) return NextResponse.json({ error: 'mensajeId requerido' }, { status: 400 })
      let actual = await prisma.mensaje.findUnique({ where: { id: mensajeId } })
      let safety = 0
      while (actual?.mensajePadreId && safety < 10) {
        actual = await prisma.mensaje.findUnique({ where: { id: actual.mensajePadreId } })
        safety++
      }
      const rootId = actual?.id || mensajeId
      const hilo = await prisma.mensaje.findMany({
        where: { OR: [{ id: rootId }, { mensajePadreId: rootId }] },
        include: {
          remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
          destinatario: { select: { id: true, nombre: true, apellidos: true } }
        },
        orderBy: { createdAt: 'asc' }
      })
      return NextResponse.json({ hilo })
    }

    const areaUsuario = usuario.fichaVoluntario?.areaAsignada?.toLowerCase()
    const areaSecundaria = usuario.fichaVoluntario?.areaSecundaria?.toLowerCase()

    const condicionesArea: any[] = [
      { destinatarioGrupo: 'todos' },
      { destinatarioGrupo: 'rol:' + usuario.rol.nombre },
    ]
    if (areaUsuario) condicionesArea.push({ destinatarioGrupo: 'area:' + areaUsuario })
    if (areaSecundaria) condicionesArea.push({ destinatarioGrupo: 'area:' + areaSecundaria })

    let where: any = {}
    if (tipo === 'recibidos') {
      where = { OR: [{ destinatarioId: usuario.id }, ...condicionesArea], archivado: false, mensajePadreId: null }
    } else if (tipo === 'enviados') {
      where = { remitenteId: usuario.id, archivado: false, mensajePadreId: null }
    } else if (tipo === 'archivados') {
      where = { OR: [{ destinatarioId: usuario.id }, { remitenteId: usuario.id }], archivado: true, mensajePadreId: null }
    }

    const mensajes = await prisma.mensaje.findMany({
      where,
      include: {
        remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
        destinatario: { select: { id: true, nombre: true, apellidos: true } },
        respuestas: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const noLeidos = tipo === 'recibidos' ? await prisma.mensaje.count({
      where: { OR: [{ destinatarioId: usuario.id }, ...condicionesArea], leido: false, archivado: false }
    }) : 0

    return NextResponse.json({ mensajes, noLeidos, usuarioActualId: usuario.id })
  } catch (error) {
    console.error('Error GET /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const body = await request.json()
    const { asunto, contenido, destinatarioId, destinatarioGrupo, tipo, prioridad, mensajePadreId } = body

    if (!asunto || !contenido) return NextResponse.json({ error: 'Asunto y contenido requeridos' }, { status: 400 })
    if (!destinatarioId && !destinatarioGrupo) return NextResponse.json({ error: 'Especifica destinatario' }, { status: 400 })

    const esAdmin = ['superadmin', 'admin'].includes(usuario.rol.nombre)
    const esCoordinador = usuario.rol.nombre === 'coordinador'
    if (destinatarioGrupo && !esAdmin && !esCoordinador) {
      return NextResponse.json({ error: 'Sin permisos para enviar a grupos' }, { status: 403 })
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        asunto, contenido,
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

    if (destinatarioId) {
      await prisma.notificacion.create({
        data: {
          tipo: 'mensaje',
          titulo: 'Nuevo mensaje de ' + usuario.nombre + ' ' + usuario.apellidos,
          mensaje: asunto,
          enlace: '/mi-area?tab=notificaciones',
          usuarioId: destinatarioId
        }
      })
    }

    if (destinatarioGrupo) {
      let usuariosDestino: { id: string }[] = []
      if (destinatarioGrupo === 'todos') {
        usuariosDestino = await prisma.usuario.findMany({ where: { activo: true, NOT: { id: usuario.id } }, select: { id: true } })
      } else if (destinatarioGrupo.startsWith('rol:')) {
        const rolNombre = destinatarioGrupo.replace('rol:', '')
        usuariosDestino = await prisma.usuario.findMany({
          where: { activo: true, NOT: { id: usuario.id }, rol: { nombre: rolNombre } },
          select: { id: true }
        })
      } else if (destinatarioGrupo.startsWith('area:')) {
        const areaNombre = destinatarioGrupo.replace('area:', '')
        usuariosDestino = await prisma.usuario.findMany({
          where: {
            activo: true, NOT: { id: usuario.id },
            fichaVoluntario: {
              OR: [
                { areaAsignada: { equals: areaNombre, mode: 'insensitive' } },
                { areaSecundaria: { equals: areaNombre, mode: 'insensitive' } }
              ]
            }
          },
          select: { id: true }
        })
      }
      if (usuariosDestino.length > 0) {
        await prisma.notificacion.createMany({
          data: usuariosDestino.map(u => ({
            tipo: 'mensaje',
            titulo: 'Mensaje de ' + usuario.nombre + ' ' + usuario.apellidos,
            mensaje: asunto,
            enlace: '/mi-area?tab=notificaciones',
            usuarioId: u.id
          }))
        })
      }
    }

    return NextResponse.json({ success: true, mensaje })
  } catch (error) {
    console.error('Error POST /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const body = await request.json()
    const { mensajeId, accion } = body

    if (accion === 'marcarLeido') {
      await prisma.mensaje.update({ where: { id: mensajeId }, data: { leido: true, leidoEn: new Date() } })
    } else if (accion === 'archivar') {
      await prisma.mensaje.update({ where: { id: mensajeId }, data: { archivado: true } })
    } else if (accion === 'desarchivar') {
      await prisma.mensaje.update({ where: { id: mensajeId }, data: { archivado: false } })
    } else if (accion === 'marcarTodosLeidos') {
      await prisma.mensaje.updateMany({
        where: { OR: [{ destinatarioId: usuario.id }, { destinatarioGrupo: 'todos' }], leido: false },
        data: { leido: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error PUT /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
