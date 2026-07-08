import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rolJwt = (session.user as any)?.rol ?? 'voluntario'

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true } } }
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

    const condicionesGrupo: any[] = [
      { destinatarioGrupo: 'todos' },
      { destinatarioGrupo: 'rol:' + rolJwt },
    ]
    if (areaUsuario) condicionesGrupo.push({ destinatarioGrupo: 'area:' + areaUsuario })
    if (areaSecundaria) condicionesGrupo.push({ destinatarioGrupo: 'area:' + areaSecundaria })

    let mensajes: any[] = []

    if (tipo === 'recibidos') {
      // Lanzar las tres consultas en paralelo para reducir latencia total
      const [estadosUsuario, individuales, grupales] = await Promise.all([
        prisma.mensajeEstado.findMany({ where: { usuarioId: usuario.id } }),
        prisma.mensaje.findMany({
          where: { destinatarioId: usuario.id, archivado: false, mensajePadreId: null },
          include: {
            remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
            destinatario: { select: { id: true, nombre: true, apellidos: true } },
            respuestas: { select: { id: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        }),
        prisma.mensaje.findMany({
          where: { OR: condicionesGrupo, mensajePadreId: null },
          include: {
            remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
            destinatario: { select: { id: true, nombre: true, apellidos: true } },
            respuestas: { select: { id: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        }),
      ])
      const estadoMap = new Map(estadosUsuario.map(e => [e.mensajeId, e]))

      // Filtrar grupales archivados POR ESTE USUARIO y fusionar estado personal
      const grupalesFiltrados = grupales
        .filter(m => {
          const estado = estadoMap.get(m.id)
          return !estado?.archivado
        })
        .map(m => {
          const estado = estadoMap.get(m.id)
          return { ...m, leido: estado?.leido ?? false, leidoEn: estado?.leidoEn ?? null }
        })

      mensajes = [
        ...individuales,
        ...grupalesFiltrados.filter(m => !individuales.some(i => i.id === m.id))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Contar no leídos: individuales sin leer + grupales sin estado leído
      const noLeidosIndividuales = individuales.filter(m => !m.leido).length
      const noLeidosGrupales = grupalesFiltrados.filter(m => !m.leido).length
      const noLeidos = noLeidosIndividuales + noLeidosGrupales

      return NextResponse.json({ mensajes, noLeidos, usuarioActualId: usuario.id })

    } else if (tipo === 'enviados') {
      mensajes = await prisma.mensaje.findMany({
        where: { remitenteId: usuario.id, archivado: false, mensajePadreId: null },
        include: {
          remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
          destinatario: { select: { id: true, nombre: true, apellidos: true } },
          respuestas: { select: { id: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    } else if (tipo === 'archivados') {
      const [individualesArchivados, estadosUsuarioArch] = await Promise.all([
        prisma.mensaje.findMany({
          where: {
            OR: [{ destinatarioId: usuario.id }, { remitenteId: usuario.id }],
            archivado: true,
            mensajePadreId: null
          },
          include: {
            remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
            destinatario: { select: { id: true, nombre: true, apellidos: true } },
            respuestas: { select: { id: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prisma.mensajeEstado.findMany({ where: { usuarioId: usuario.id, archivado: true } }),
      ])

      // Grupales archivados por este usuario
      const idsArchivadosGrupales = estadosUsuarioArch
        .filter(e => e.archivado)
        .map(e => e.mensajeId)

      const grupalesArchivados = idsArchivadosGrupales.length > 0
        ? await prisma.mensaje.findMany({
            where: { id: { in: idsArchivadosGrupales }, mensajePadreId: null },
            include: {
              remitente: { select: { id: true, nombre: true, apellidos: true, avatar: true } },
              destinatario: { select: { id: true, nombre: true, apellidos: true } },
              respuestas: { select: { id: true } }
            },
            orderBy: { createdAt: 'desc' }
          })
        : []

      mensajes = [...individualesArchivados, ...grupalesArchivados]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return NextResponse.json({ mensajes, noLeidos: 0, usuarioActualId: usuario.id })
  } catch (error) {
    console.error('Error GET /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rolJwt = (session.user as any)?.rol ?? 'voluntario'

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true, apellidos: true }
    })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const body = await request.json()
    const { asunto, contenido, destinatarioId, destinatarioGrupo, tipo, prioridad, mensajePadreId } = body

    if (!asunto || !contenido) return NextResponse.json({ error: 'Asunto y contenido requeridos' }, { status: 400 })
    if (!destinatarioId && !destinatarioGrupo) return NextResponse.json({ error: 'Especifica destinatario' }, { status: 400 })

    const _nivMsg = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[rolJwt] ?? 1
    if (destinatarioGrupo && _nivMsg < 3) {
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
          enlace: '/mi-area?tab=notificaciones&subtab=recibidos&mensajeId=' + mensaje.id,
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
            enlace: '/mi-area?tab=notificaciones&subtab=recibidos&mensajeId=' + mensaje.id,
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
    const rolJwt = (session.user as any)?.rol ?? 'voluntario'

    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const body = await request.json()
    const { mensajeId, accion } = body

    if (accion === 'marcarTodosLeidos') {
      await prisma.mensaje.updateMany({
        where: { destinatarioId: usuario.id, leido: false },
        data: { leido: true }
      })
      const usuarioConFicha = await prisma.usuario.findUnique({
        where: { id: usuario.id },
        select: { fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true } } }
      })
      const areaAsig = usuarioConFicha?.fichaVoluntario?.areaAsignada?.toLowerCase()
      const areaSec = usuarioConFicha?.fichaVoluntario?.areaSecundaria?.toLowerCase()
      const condicionesGrup: any[] = [
        { destinatarioGrupo: 'todos' },
        { destinatarioGrupo: 'rol:' + rolJwt },
      ]
      if (areaAsig) condicionesGrup.push({ destinatarioGrupo: 'area:' + areaAsig })
      if (areaSec) condicionesGrup.push({ destinatarioGrupo: 'area:' + areaSec })
      const grupales = await prisma.mensaje.findMany({
        where: { OR: condicionesGrup },
        select: { id: true }
      })
      if (grupales.length > 0) {
        await Promise.all(grupales.map(m =>
          prisma.mensajeEstado.upsert({
            where: { mensajeId_usuarioId: { mensajeId: m.id, usuarioId: usuario.id } },
            create: { mensajeId: m.id, usuarioId: usuario.id, leido: true, leidoEn: new Date() },
            update: { leido: true, leidoEn: new Date() }
          })
        ))
      }
      return NextResponse.json({ success: true })
    }

    // Verificar si el mensaje es grupal
    const mensaje = await prisma.mensaje.findUnique({ where: { id: mensajeId } })
    if (!mensaje) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })

    const esGrupal = !!mensaje.destinatarioGrupo

    if (accion === 'marcarLeido') {
      if (esGrupal) {
        // Estado personal por usuario — no afecta a otros
        await prisma.mensajeEstado.upsert({
          where: { mensajeId_usuarioId: { mensajeId, usuarioId: usuario.id } },
          create: { mensajeId, usuarioId: usuario.id, leido: true, leidoEn: new Date() },
          update: { leido: true, leidoEn: new Date() }
        })
      } else {
        // Individual: verificar que el usuario es el destinatario
        if (mensaje.destinatarioId === usuario.id) {
          await prisma.mensaje.update({ where: { id: mensajeId }, data: { leido: true, leidoEn: new Date() } })
        }
      }
    } else if (accion === 'archivar') {
      if (esGrupal) {
        await prisma.mensajeEstado.upsert({
          where: { mensajeId_usuarioId: { mensajeId, usuarioId: usuario.id } },
          create: { mensajeId, usuarioId: usuario.id, archivado: true },
          update: { archivado: true }
        })
      } else {
        if (mensaje.destinatarioId === usuario.id || mensaje.remitenteId === usuario.id) {
          await prisma.mensaje.update({ where: { id: mensajeId }, data: { archivado: true } })
        }
      }
    } else if (accion === 'desarchivar') {
      if (esGrupal) {
        await prisma.mensajeEstado.upsert({
          where: { mensajeId_usuarioId: { mensajeId, usuarioId: usuario.id } },
          create: { mensajeId, usuarioId: usuario.id, archivado: false },
          update: { archivado: false }
        })
      } else {
        if (mensaje.destinatarioId === usuario.id || mensaje.remitenteId === usuario.id) {
          await prisma.mensaje.update({ where: { id: mensajeId }, data: { archivado: false } })
        }
      }
    } else if (accion === 'marcarTodosLeidos') {
      // Individuales sin leer
      await prisma.mensaje.updateMany({
        where: { destinatarioId: usuario.id, leido: false },
        data: { leido: true }
      })
      // Grupales: obtener los mensajes grupales visibles y hacer upsert de estado
      const grupales = await prisma.mensaje.findMany({
        where: {
          OR: [
            { destinatarioGrupo: 'todos' },
            { destinatarioGrupo: 'rol:' + rolJwt }
          ]
        },
        select: { id: true }
      })
      if (grupales.length > 0) {
        await Promise.all(grupales.map(m =>
          prisma.mensajeEstado.upsert({
            where: { mensajeId_usuarioId: { mensajeId: m.id, usuarioId: usuario.id } },
            create: { mensajeId: m.id, usuarioId: usuario.id, leido: true, leidoEn: new Date() },
            update: { leido: true, leidoEn: new Date() }
          })
        ))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error PUT /api/mensajes:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
