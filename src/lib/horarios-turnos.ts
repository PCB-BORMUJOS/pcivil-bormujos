/**
 * A qué hora entra y sale cada turno.
 *
 * Los tramos no son siempre los mismos: en semanas de servicio especial, como
 * la Feria, cambian y además el turno de noche termina a una hora distinta
 * según el día. Tenerlos escritos aquí, con su periodo de vigencia, evita el
 * problema que dio el CECOPAL de madrugada: suponer un horario fijo y acabar
 * mostrando indicativos que no estaban de servicio.
 *
 * Las horas se expresan en minutos desde medianoche, hora de Madrid. El turno
 * de noche cruza la medianoche, así que su fin puede pasar de 1440.
 */

export type TramoTurno = { turno: string; desde: number; hasta: number }

const hm = (h: number, m = 0) => h * 60 + m

/** Horario de una semana normal. */
const HABITUAL: TramoTurno[] = [
    { turno: 'mañana', desde: hm(7), hasta: hm(15) },
    { turno: 'tarde', desde: hm(15), hasta: hm(23) },
    { turno: 'noche', desde: hm(23), hasta: hm(24 + 7) },
]

/**
 * Feria de Bormujos 2026, del 26 al 30 de agosto.
 *
 * Mañana de 10:00 a 15:00, tarde de 15:00 a 20:30 y noche desde las 20:30
 * hasta la madrugada. La hora de cierre de la noche depende del día en que
 * empieza: miércoles y jueves a las 03:30, viernes y sábado a las 04:30 y
 * domingo a las 03:00, que es cuando se da por concluido el dispositivo.
 */
const FERIA_2026 = {
    desde: '2026-08-26',
    hasta: '2026-08-30',
    tramos: (diaSemana: number): TramoTurno[] => {
        // 0 domingo · 3 miércoles · 4 jueves · 5 viernes · 6 sábado
        const finNoche =
            diaSemana === 5 || diaSemana === 6 ? hm(24 + 4, 30) // viernes y sábado
                : diaSemana === 0 ? hm(24 + 3)                  // domingo
                    : hm(24 + 3, 30)                            // miércoles y jueves
        return [
            { turno: 'mañana', desde: hm(10), hasta: hm(15) },
            { turno: 'tarde', desde: hm(15), hasta: hm(20, 30) },
            { turno: 'noche', desde: hm(20, 30), hasta: finNoche },
        ]
    },
}

/** Día en formato AAAA-MM-DD, hora de Madrid, con el desplazamiento indicado. */
function diaMadrid(ahora: Date, desplazamiento = 0): string {
    return new Date(ahora.getTime() + desplazamiento * 86400000)
        .toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
}

/** Tramos vigentes el día indicado. */
function tramosDe(dia: string): TramoTurno[] {
    if (dia >= FERIA_2026.desde && dia <= FERIA_2026.hasta) {
        // getDay() sobre una fecha a mediodía evita saltos por zona horaria.
        return FERIA_2026.tramos(new Date(`${dia}T12:00:00`).getDay())
    }
    return HABITUAL
}

/**
 * Qué turno está de servicio ahora y a qué día pertenece su guardia.
 *
 * El día importa tanto como el turno: una noche que sigue de servicio a las
 * 02:00 empezó la tarde anterior, así que su guardia está grabada con la fecha
 * del día anterior. Se comprueba primero si sigue corriendo la noche que
 * empezó ayer, y solo después los tramos de hoy.
 */
export function turnoDeServicio(ahora: Date = new Date()): { turno: string; fecha: string } {
    const partes = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(ahora)
    const hora = Number(partes.find(p => p.type === 'hour')?.value ?? 0) % 24
    const minuto = Number(partes.find(p => p.type === 'minute')?.value ?? 0)
    const minutos = hora * 60 + minuto

    const hoy = diaMadrid(ahora)
    const ayer = diaMadrid(ahora, -1)

    // ¿Sigue de servicio la noche que empezó ayer?
    const nocheAyer = tramosDe(ayer).find(t => t.turno === 'noche')
    if (nocheAyer && nocheAyer.hasta > 1440 && minutos < nocheAyer.hasta - 1440) {
        return { turno: 'noche', fecha: ayer }
    }

    for (const t of tramosDe(hoy)) {
        const fin = Math.min(t.hasta, 1440)
        if (minutos >= t.desde && minutos < fin) return { turno: t.turno, fecha: hoy }
    }

    // Fuera de todo tramo (por ejemplo, entre el fin de la noche y la entrada de
    // la mañana): se devuelve la mañana de hoy, que es el turno que va a entrar.
    return { turno: 'mañana', fecha: hoy }
}
