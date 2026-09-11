import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
    lunesSiguiente, textoSemana, avisarPendientes, registrarAvisosDisponibilidad,
} from '@/lib/disponibilidad-avisos'

/**
 * Control semanal de la disponibilidad.
 *
 * El plazo para enviarla termina el viernes a las 23:59, así que el proceso
 * tiene dos momentos distintos y no se pueden juntar:
 *
 *   · viernes por la mañana → «aviso»: se recuerda a quien aún no la ha
 *     mandado, cuando todavía está a tiempo. No anota nada.
 *   · sábado por la mañana → «registro»: cerrado ya el plazo, se anota a quien
 *     no envió y a quien envió tarde.
 *
 * Sin el parámetro `modo` se deduce del día de la semana, de forma que los dos
 * disparos programados en vercel.json hacen lo que toca sin más configuración.
 *
 * Sobre el acceso: la versión anterior exigía `CRON_SECRET` y devolvía error si
 * no estaba definida. Como nunca se configuró en Vercel, el proceso murió en
 * esa línea durante catorce viernes seguidos sin registrar nada. Ahora la
 * variable sigue siendo la vía preferente, pero su ausencia ya no bloquea: se
 * acepta también la llamada del propio cron de Vercel y la de un administrador
 * que quiera lanzarlo a mano. El trabajo es idempotente, así que una llamada de
 * más no causa daño.
 */
async function permitido(request: NextRequest): Promise<boolean> {
    const secreto = process.env.CRON_SECRET
    if (secreto && request.headers.get('authorization') === `Bearer ${secreto}`) return true

    const agente = request.headers.get('user-agent') || ''
    if (request.headers.get('x-vercel-cron') || agente.includes('vercel-cron')) return true

    const session = await getServerSession(authOptions)
    const rol = (session?.user as any)?.rol?.toLowerCase() || ''
    return ['superadmin', 'coordinador', 'admin'].includes(rol)
}

export async function GET(request: NextRequest) {
    if (!await permitido(request)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const diaMadrid = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Madrid', weekday: 'long' })
        const modo = searchParams.get('modo') || (diaMadrid === 'Friday' ? 'aviso' : 'registro')

        if (modo === 'aviso') {
            // El plazo todavía está abierto: se empuja, no se anota
            const lunes = lunesSiguiente()
            const avisados = await avisarPendientes(lunes)
            console.log(`[CRON] Aviso disponibilidad ${textoSemana(lunes)}: ${avisados.length} pendientes`)
            return NextResponse.json({ success: true, modo, semana: textoSemana(lunes), avisados: avisados.length, personas: avisados })
        }

        // Plazo cerrado: se registra lo ocurrido con la semana que empieza el lunes
        const lunes = lunesSiguiente()
        const { creados, yaExistian } = await registrarAvisosDisponibilidad({
            semanas: [lunes], notificar: true,
        })
        const sinEnviar = creados.filter(c => c.tipo === 'SIN_ENVIAR')
        const tarde = creados.filter(c => c.tipo === 'FUERA_DE_PLAZO')
        console.log(`[CRON] Registro disponibilidad ${textoSemana(lunes)}: ${sinEnviar.length} sin enviar, ${tarde.length} fuera de plazo, ${yaExistian} ya constaban`)

        return NextResponse.json({
            success: true,
            modo,
            semana: textoSemana(lunes),
            sinEnviar: sinEnviar.map(c => c.indicativo),
            fueraDePlazo: tarde.map(c => `${c.indicativo} (+${c.retrasoDias}d)`),
            yaRegistrados: yaExistian,
        })
    } catch (error) {
        console.error('[CRON] Error en recordatorio-disponibilidad:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
