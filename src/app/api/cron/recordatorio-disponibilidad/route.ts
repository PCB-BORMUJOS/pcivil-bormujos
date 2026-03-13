import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addDays, startOfWeek, endOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET(request: NextRequest) {
  // Verificar que la llamada viene de Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Calcular semana actual (lunes de esta semana)
    const ahora = new Date()
    const lunesSemana = startOfWeek(ahora, { weekStartsOn: 1 })
    const lunesSiguiente = addDays(lunesSemana, 7)

    // Semana para la que se pide disponibilidad (la próxima semana)
    const semanaObjetivo = lunesSiguiente
    const semanaFin = addDays(semanaObjetivo, 6)

    const semanaTexto = `semana del ${format(semanaObjetivo, "d 'de' MMMM", { locale: es })} al ${format(semanaFin, "d 'de' MMMM", { locale: es })}`

    // Todos los voluntarios activos y operativos
    const todosActivos = await prisma.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true }
    })

    // Los que ya han respondido para la semana objetivo (con o sin disponibilidad)
    const semanaStart = new Date(format(semanaObjetivo, 'yyyy-MM-dd') + 'T00:00:00.000Z')
    const semanaEnd = new Date(format(semanaObjetivo, 'yyyy-MM-dd') + 'T23:59:59.999Z')

    const yaRespondieron = await prisma.disponibilidad.findMany({
      where: { semanaInicio: { gte: semanaStart, lte: semanaEnd } },
      select: { usuarioId: true }
    })
    const idsRespondieron = new Set(yaRespondieron.map(d => d.usuarioId))

    // Los que NO han respondido nada
    const sinRespuesta = todosActivos.filter(u => !idsRespondieron.has(u.id))

    if (sinRespuesta.length === 0) {
      return NextResponse.json({ success: true, mensaje: 'Todos han respondido', enviados: 0 })
    }

    // Enviar notificación in-app + mensaje interno a cada uno
    await Promise.all(sinRespuesta.map(async (u) => {
      // Notificación in-app (campana)
      await prisma.notificacion.create({
        data: {
          usuarioId: u.id,
          titulo: '⚠️ Disponibilidad no enviada',
          mensaje: `No has enviado tu disponibilidad para la ${semanaTexto}. Accede a Mi Área y envíala lo antes posible para que podamos organizar los cuadrantes.`,
          tipo: 'alerta',
          leida: false,
        }
      })

      // Mensaje interno
      await prisma.mensaje.create({
        data: {
          remitenteId: u.id, // sistema — se usará el propio usuario como remitente
          destinatarioId: u.id,
          asunto: `Recordatorio: disponibilidad pendiente — ${semanaTexto}`,
          contenido: `Hola ${u.nombre},\n\nHas superado el plazo del viernes por la mañana para enviar tu disponibilidad para la ${semanaTexto}.\n\nPor favor accede a Mi Área → Disponibilidad y envíala a la mayor brevedad posible para que el coordinador pueda configurar los cuadrantes.\n\nGracias.\n\nProtección Civil Bormujos`,
          leido: false,
        }
      })
    }))

    console.log(`[CRON] Recordatorio disponibilidad enviado a ${sinRespuesta.length} personas para ${semanaTexto}`)

    return NextResponse.json({
      success: true,
      enviados: sinRespuesta.length,
      semana: semanaTexto,
      personas: sinRespuesta.map(u => u.numeroVoluntario || u.nombre)
    })

  } catch (error) {
    console.error('[CRON] Error en recordatorio-disponibilidad:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
