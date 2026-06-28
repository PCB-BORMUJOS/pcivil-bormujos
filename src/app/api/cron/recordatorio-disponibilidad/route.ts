import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const ahora = new Date()

    // Calcular el lunes de la semana siguiente (semana para la que se pide disponibilidad)
    const diaSemana = ahora.getDay() // 5 = viernes
    const diasHastaLunes = diaSemana === 0 ? 1 : 8 - diaSemana
    const lunesSiguiente = new Date(ahora)
    lunesSiguiente.setDate(ahora.getDate() + diasHastaLunes)
    lunesSiguiente.setHours(0, 0, 0, 0)

    const domingSiguiente = new Date(lunesSiguiente)
    domingSiguiente.setDate(lunesSiguiente.getDate() + 6)

    const semanaStr = lunesSiguiente.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
    const domingoStr = domingSiguiente.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
    const semanaTexto = `semana del ${semanaStr} al ${domingoStr}`

    // Solo voluntarios activos y OPERATIVOS (excluye B-12 y personal administrativo)
    const todosOperativos = await prisma.usuario.findMany({
      where: { activo: true, esOperativo: true },
      select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true }
    })

    // Quiénes ya han respondido para la semana objetivo
    const semanaStart = new Date(lunesSiguiente.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) + 'T00:00:00.000Z')
    const semanaEnd = new Date(lunesSiguiente.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) + 'T23:59:59.999Z')

    const yaRespondieron = await prisma.disponibilidad.findMany({
      where: { semanaInicio: { gte: semanaStart, lte: semanaEnd } },
      select: { usuarioId: true }
    })
    const idsRespondieron = new Set(yaRespondieron.map(d => d.usuarioId))

    const sinRespuesta = todosOperativos.filter(u => !idsRespondieron.has(u.id))

    if (sinRespuesta.length === 0) {
      return NextResponse.json({ success: true, mensaje: 'Todos los voluntarios operativos han respondido', enviados: 0 })
    }

    // Coordinador como remitente de mensajes internos
    const coordinador = await prisma.usuario.findFirst({
      where: { activo: true, rol: { nombre: { in: ['coordinador', 'admin', 'superadmin'] } } },
      select: { id: true }
    })

    const resultados: string[] = []
    for (const u of sinRespuesta) {
      try {
        // Notificación in-app (campana)
        await prisma.notificacion.create({
          data: {
            usuarioId: u.id,
            titulo: '⚠ Disponibilidad pendiente de envío',
            mensaje: `No has enviado tu disponibilidad para la ${semanaTexto}. Accede a Mi Área → Disponibilidad y envíala antes de que se confeccione el cuadrante.`,
            tipo: 'alerta',
            leida: false,
          }
        })

        // Mensaje interno desde el coordinador
        if (coordinador) {
          await prisma.mensaje.create({
            data: {
              remitenteId: coordinador.id,
              destinatarioId: u.id,
              asunto: `Recordatorio: disponibilidad pendiente — ${semanaTexto}`,
              contenido: `Hola ${u.nombre},\n\nEstamos preparando el cuadrante de la ${semanaTexto} y aún no hemos recibido tu disponibilidad.\n\nPor favor accede a Mi Área → Disponibilidad y envíala cuanto antes para poder asignarte los turnos que quieres cubrir.\n\nGracias.\n\nCoordinación — Protección Civil Bormujos`,
              leido: false,
            }
          })
        }

        // AuditLog para estadísticas de reincidencia por indicativo
        await prisma.auditLog.create({
          data: {
            accion: 'RECORDATORIO',
            entidad: 'Disponibilidad',
            entidadId: u.id,
            descripcion: `Recordatorio automático — ${u.numeroVoluntario || u.nombre} ${u.apellidos} no envió disponibilidad para la ${semanaTexto}`,
            usuarioId: u.id,
            usuarioNombre: `${u.nombre} ${u.apellidos}`,
            modulo: 'Sistema',
          }
        })

        resultados.push(u.numeroVoluntario || u.nombre)
      } catch (err) {
        console.error(`[CRON] Error procesando ${u.numeroVoluntario}:`, err)
      }
    }

    console.log(`[CRON] Recordatorio disponibilidad: ${resultados.length} enviados para ${semanaTexto}`)

    return NextResponse.json({
      success: true,
      enviados: resultados.length,
      semana: semanaTexto,
      personas: resultados
    })

  } catch (error) {
    console.error('[CRON] Error en recordatorio-disponibilidad:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
