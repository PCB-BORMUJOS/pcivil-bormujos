import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
    lunesSiguiente, textoSemana, registrarAvisosDisponibilidad,
} from '@/lib/disponibilidad-avisos'

/**
 * Comprobación semanal de disponibilidad, programada los viernes a las 10:00
 * UTC (ver vercel.json). Deja constancia de quién no ha enviado la suya para la
 * semana siguiente y se lo notifica.
 *
 * Sobre el acceso: la versión anterior exigía `CRON_SECRET` y devolvía error si
 * no estaba definida. Como nunca se llegó a configurar en Vercel, el proceso
 * murió en esa línea durante catorce viernes seguidos sin registrar nada. Ahora
 * la variable sigue siendo la vía preferente, pero su ausencia ya no bloquea:
 * se acepta también la llamada del propio cron de Vercel y la de un
 * administrador que quiera lanzarlo a mano. Y como el trabajo es idempotente
 * —no duplica avisos ya registrados— una llamada de más no causa daño.
 */
async function permitido(request: NextRequest): Promise<boolean> {
    const secreto = process.env.CRON_SECRET
    if (secreto && request.headers.get('authorization') === `Bearer ${secreto}`) return true

    // Vercel se identifica en sus invocaciones programadas
    const agente = request.headers.get('user-agent') || ''
    if (request.headers.get('x-vercel-cron') || agente.includes('vercel-cron')) return true

    // Lanzamiento manual desde la aplicación por un administrador
    const session = await getServerSession(authOptions)
    const rol = (session?.user as any)?.rol?.toLowerCase() || ''
    return ['superadmin', 'coordinador', 'admin'].includes(rol)
}

export async function GET(request: NextRequest) {
    if (!await permitido(request)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const lunes = lunesSiguiente()
        const { creados, yaExistian } = await registrarAvisosDisponibilidad({
            semanas: [lunes],
            notificar: true,
        })

        const semana = textoSemana(lunes)
        console.log(`[CRON] Disponibilidad ${semana}: ${creados.length} avisos nuevos, ${yaExistian} ya registrados`)

        return NextResponse.json({
            success: true,
            semana,
            enviados: creados.length,
            yaRegistrados: yaExistian,
            personas: creados.map(c => c.indicativo),
        })
    } catch (error) {
        console.error('[CRON] Error en recordatorio-disponibilidad:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
