import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { registrarAudit } from '@/lib/audit'
import { PERFILES, PERFIL_POR_SLUG, promptChat, promptRevision } from '@/lib/agentes/perfiles'
import { construirContexto } from '@/lib/agentes/contexto'
import { autorizar, crearCliente, jsonRespuesta, textoRespuesta, normalizarPropuesta, MODELO_AGENTE } from '@/lib/agentes/core'

export const maxDuration = 120

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await autorizar()
  if (!auth.usuario) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  try {
    if (tipo === 'perfiles') {
      return NextResponse.json({
        perfiles: PERFILES.map(p => ({
          slug: p.slug, nombre: p.nombre, puesto: p.puesto, area: p.area,
          color: p.color, acento: p.acento, competencias: p.competencias, revision: p.revision,
        })),
        disponible: !!process.env.ANTHROPIC_API_KEY,
      })
    }

    if (tipo === 'conversacion') {
      const area = searchParams.get('area') || 'general'
      const conversacion = await prisma.conversacionAgente.findFirst({
        where: { area, usuarioId: auth.usuario.id },
        orderBy: { updatedAt: 'desc' },
        include: { mensajes: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json({ conversacion })
    }

    if (tipo === 'propuestas') {
      if (auth.nivel < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
      const area = searchParams.get('area')
      const estado = searchParams.get('estado')
      const propuestas = await prisma.propuestaAgente.findMany({
        where: { ...(area && area !== 'todas' ? { area } : {}), ...(estado && estado !== 'todas' ? { estado } : {}) },
        include: {
          revision: { select: { id: true, resumen: true, createdAt: true } },
          resueltaPor: { select: { nombre: true, apellidos: true } },
        },
        orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
        take: 300,
      })
      return NextResponse.json({ propuestas })
    }

    if (tipo === 'revisiones') {
      if (auth.nivel < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
      const revisiones = await prisma.revisionAgente.findMany({
        include: {
          usuario: { select: { nombre: true, apellidos: true } },
          _count: { select: { propuestas: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return NextResponse.json({ revisiones })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en GET agentes:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  // Chat con el agente del área: disponible para cualquier usuario autenticado.
  if (tipo === 'chat') {
    const auth = await autorizar()
    if (!auth.usuario) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const cliente = crearCliente()
    if (!cliente) return NextResponse.json({ error: 'El asistente no está configurado en este entorno' }, { status: 503 })

    try {
      const { area = 'general', mensaje, conversacionId } = await request.json()
      if (!mensaje || typeof mensaje !== 'string') {
        return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
      }
      const perfil = PERFIL_POR_SLUG[area] || PERFIL_POR_SLUG.general

      // Conversación (nueva o existente, siempre del propio usuario).
      let conversacion = conversacionId
        ? await prisma.conversacionAgente.findFirst({
            where: { id: conversacionId, usuarioId: auth.usuario.id },
            include: { mensajes: { orderBy: { createdAt: 'asc' }, take: 40 } },
          })
        : null
      if (!conversacion) {
        conversacion = await prisma.conversacionAgente.create({
          data: { area: perfil.slug, titulo: mensaje.slice(0, 80), usuarioId: auth.usuario.id },
          include: { mensajes: true },
        })
      }

      const historial = (conversacion.mensajes || []).map(m => ({
        role: m.rol === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.contenido,
      }))

      const contexto = await construirContexto(perfil.slug)
      const quien = `${auth.usuario.nombre} ${auth.usuario.apellidos}${auth.usuario.fichaVoluntario?.indicativo2 ? ' (' + auth.usuario.fichaVoluntario.indicativo2 + ')' : ''}`

      const respuesta = await cliente.messages.create({
        model: MODELO_AGENTE,
        max_tokens: 2000,
        system: promptChat(perfil, contexto) + `\n\nHablas con: ${quien}.`,
        messages: [...historial, { role: 'user', content: mensaje }],
      })
      const texto = textoRespuesta(respuesta)

      await prisma.mensajeAgente.createMany({
        data: [
          { conversacionId: conversacion.id, rol: 'user', contenido: mensaje },
          { conversacionId: conversacion.id, rol: 'assistant', contenido: texto },
        ],
      })
      await prisma.conversacionAgente.update({ where: { id: conversacion.id }, data: { updatedAt: new Date() } })

      return NextResponse.json({ respuesta: texto, conversacionId: conversacion.id })
    } catch (error: any) {
      console.error('Error en chat de agente:', error)
      return NextResponse.json({ error: 'El asistente no ha podido responder. Inténtalo de nuevo.' }, { status: 500 })
    }
  }

  // Revisión del área: genera propuestas y avisa al administrador.
  if (tipo === 'revision') {
    const auth = await autorizar(3)
    if (!auth.usuario) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const cliente = crearCliente()
    if (!cliente) return NextResponse.json({ error: 'El asistente no está configurado en este entorno' }, { status: 503 })

    try {
      const { area = 'general' } = await request.json()
      const perfil = PERFIL_POR_SLUG[area] || PERFIL_POR_SLUG.general
      const contexto = await construirContexto(perfil.slug)

      const respuesta = await cliente.messages.create({
        model: MODELO_AGENTE,
        max_tokens: 4000,
        system: promptRevision(perfil, contexto),
        messages: [{ role: 'user', content: `Revisa el área de ${perfil.area} y entrega tus propuestas en el JSON indicado.` }],
      })

      const datos = jsonRespuesta<{ resumen: string; propuestas: any[] }>(respuesta)
      if (!datos) return NextResponse.json({ error: 'El agente no ha devuelto un informe legible' }, { status: 502 })

      const propuestas = Array.isArray(datos.propuestas) ? datos.propuestas.slice(0, 8).map(normalizarPropuesta).filter(p => p.titulo) : []

      const revision = await prisma.revisionAgente.create({
        data: {
          area: perfil.slug,
          resumen: String(datos.resumen || '').slice(0, 4000),
          usuarioId: auth.usuario.id,
          propuestas: { create: propuestas.map(p => ({ ...p, area: perfil.slug })) },
        },
        include: { propuestas: true },
      })

      // Aviso al administrador por el módulo de Mensajes.
      const admins = await prisma.usuario.findMany({
        where: { activo: true, rol: { nombre: { in: ['superadmin', 'coordinador', 'admin'] } } },
        select: { id: true },
      })
      if (admins.length) {
        const criticas = propuestas.filter(p => p.prioridad === 'critica' || p.prioridad === 'alta').length
        const cuerpo = [
          `${perfil.nombre} (${perfil.puesto}) ha revisado el área de ${perfil.area}.`,
          '',
          datos.resumen || '',
          '',
          propuestas.length
            ? `Propuestas generadas: ${propuestas.length}${criticas ? ` (${criticas} de prioridad alta o crítica)` : ''}.`
            : 'No se han detectado incidencias que requieran actuación.',
          '',
          ...propuestas.map((p, i) => `${i + 1}. [${p.prioridad.toUpperCase()}] ${p.titulo}\n   ${p.descripcion}`),
          '',
          'Revisa y aprueba las propuestas en el panel de Agentes IA.',
        ].join('\n')

        await prisma.mensaje.createMany({
          data: admins.map(a => ({
            asunto: `Revisión del área de ${perfil.area} — ${propuestas.length} propuesta(s)`,
            contenido: cuerpo,
            tipo: 'agente',
            prioridad: propuestas.some(p => p.prioridad === 'critica') ? 'urgente' : 'normal',
            remitenteId: auth.usuario.id,
            destinatarioId: a.id,
          })),
        })
        await prisma.notificacion.createMany({
          data: admins.map(a => ({
            tipo: 'agente',
            titulo: `${perfil.nombre}: revisión de ${perfil.area}`,
            mensaje: `${propuestas.length} propuesta(s) pendientes de revisión`,
            enlace: '/agentes?area=' + perfil.slug,
            usuarioId: a.id,
          })),
        }).catch(() => null)
      }

      await registrarAudit({
        accion: 'CREATE',
        entidad: 'RevisionAgente',
        entidadId: revision.id,
        descripcion: `${perfil.nombre} revisó el área de ${perfil.area}: ${propuestas.length} propuesta(s)`,
        usuarioId: auth.usuario.id,
        usuarioNombre: `${auth.usuario.nombre} ${auth.usuario.apellidos}`,
        modulo: 'Agentes IA',
      })

      return NextResponse.json({ revision })
    } catch (error: any) {
      console.error('Error en revisión de agente:', error)
      return NextResponse.json({ error: 'No ha sido posible completar la revisión' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
}

// ── PUT: resolución de propuestas por el administrador ───────────────────────
export async function PUT(request: NextRequest) {
  const auth = await autorizar(3)
  if (!auth.usuario) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { id, estado, respuestaAdmin } = await request.json()
    if (!id || !['pendiente', 'aceptada', 'aplicada', 'descartada'].includes(estado)) {
      return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
    }

    const anterior = await prisma.propuestaAgente.findUnique({ where: { id } })
    if (!anterior) return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })

    const propuesta = await prisma.propuestaAgente.update({
      where: { id },
      data: {
        estado,
        respuestaAdmin: respuestaAdmin ?? undefined,
        resueltaPorId: estado === 'pendiente' ? null : auth.usuario.id,
        resueltaEn: estado === 'pendiente' ? null : new Date(),
      },
      include: { resueltaPor: { select: { nombre: true, apellidos: true } } },
    })

    await registrarAudit({
      accion: 'UPDATE',
      entidad: 'PropuestaAgente',
      entidadId: propuesta.id,
      descripcion: `Propuesta "${propuesta.titulo}" (${propuesta.area}): ${anterior.estado} → ${estado}`,
      usuarioId: auth.usuario.id,
      usuarioNombre: `${auth.usuario.nombre} ${auth.usuario.apellidos}`,
      modulo: 'Agentes IA',
      datosAnteriores: anterior,
      datosNuevos: propuesta,
    })

    return NextResponse.json({ propuesta })
  } catch (error) {
    console.error('Error actualizando propuesta:', error)
    return NextResponse.json({ error: 'Error al actualizar la propuesta' }, { status: 500 })
  }
}
