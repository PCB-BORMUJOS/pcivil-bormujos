/**
 * Avisos por disponibilidad no enviada.
 *
 * Cada viernes se comprueba quién no ha enviado su disponibilidad para la
 * semana siguiente. A quien falta se le deja constancia con una entrada de
 * trazabilidad `RECORDATORIO`, que es lo que alimenta el histórico de avisos de
 * «Mi Área» y la columna de reincidencia de Estadísticas → Personal.
 *
 * La lógica vive aquí y no dentro del cron porque también la necesita el
 * proceso que reconstruye los avisos de semanas ya pasadas: si estuviera
 * duplicada, los dos acabarían contando cosas distintas.
 */

import { prisma } from '@/lib/db'

/**
 * Quien no está obligado a enviar disponibilidad.
 *
 * B-12 y J1 ya quedan fuera por `esOperativo: false`, pero se listan igual para
 * que la regla se lea completa en un sitio. J-44 hace turnos pero no envía
 * disponibilidad porque es quien confecciona el cuadrante y se asigna a sí
 * mismo; J0 es un perfil institucional que no cubre turnos.
 */
export const EXENTOS_DISPONIBILIDAD = ['J-44', 'J0', 'J1', 'B-12']

const DIA_MS = 86400000

/** Medianoche UTC del día indicado, que es como se guarda `semanaInicio`. */
function aFechaUTC(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`)
}

/** AAAA-MM-DD de una fecha, leído en UTC. */
export function isoDe(fecha: Date): string {
    return fecha.toISOString().slice(0, 10)
}

/**
 * Lunes de la semana para la que toca pedir disponibilidad.
 *
 * Se calcula en hora de Madrid: un viernes a las 23:30 en España es todavía
 * viernes aunque en UTC ya sea sábado, y equivocarse ahí desplazaría la semana
 * objetivo entera.
 */
export function lunesSiguiente(ahora: Date = new Date()): Date {
    const hoyMadrid = ahora.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const hoy = aFechaUTC(hoyMadrid)
    const dia = hoy.getUTCDay() // 0 domingo … 6 sábado
    const dias = dia === 0 ? 1 : 8 - dia
    return new Date(hoy.getTime() + dias * DIA_MS)
}

/** Desfase de Madrid respecto a UTC, en minutos, para un instante dado. */
function desfaseMadrid(instante: Date): number {
    const utc = new Date(instante.toLocaleString('en-US', { timeZone: 'UTC' }))
    const madrid = new Date(instante.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
    return (madrid.getTime() - utc.getTime()) / 60000
}

/**
 * Momento en que vence el plazo de una semana: el final del viernes anterior.
 *
 * Enviar a lo largo del viernes vale; a partir de ahí la disponibilidad llega
 * fuera de plazo. Se calcula en hora de Madrid, no en UTC: en verano las 23:59
 * de España son las 21:59 UTC, y fijar la hora en UTC adelantaría el corte dos
 * horas, dejando fuera a quien envía el viernes por la noche.
 */
export function fechaLimite(lunes: Date): Date {
    const viernes = isoDe(new Date(lunes.getTime() - 3 * DIA_MS))
    const tentativo = new Date(`${viernes}T23:59:59.999Z`)
    return new Date(tentativo.getTime() - desfaseMadrid(tentativo) * 60000)
}

/** «semana del 14 al 20 de septiembre», tal y como se lee en los avisos. */
export function textoSemana(lunes: Date): string {
    const domingo = new Date(lunes.getTime() + 6 * DIA_MS)
    const f = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    return `semana del ${f(lunes)} al ${f(domingo)}`
}

/**
 * Lunes al que corresponde realmente una disponibilidad guardada.
 *
 * Hay tres registros grabados con fecha de domingo en lugar del lunes: se
 * rellenaron para la semana que empezaba al día siguiente. Sin corregirlo, a
 * esas personas se les apuntaría una falta que no cometieron.
 */
export function semanaNormalizada(semanaInicio: Date): string {
    return isoDe(semanaInicio.getUTCDay() === 0
        ? new Date(semanaInicio.getTime() + DIA_MS)
        : semanaInicio)
}

export interface ObligadoDisponibilidad {
    id: string
    nombre: string
    apellidos: string
    numeroVoluntario: string | null
    /** Fecha de alta: antes de ella no se le puede exigir nada. */
    alta: Date
}

/** Voluntarios activos y operativos a los que se les exige disponibilidad. */
export async function usuariosObligados(): Promise<ObligadoDisponibilidad[]> {
    const usuarios = await prisma.usuario.findMany({
        where: { activo: true, esOperativo: true },
        select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true, createdAt: true },
        orderBy: { numeroVoluntario: 'asc' },
    })
    return usuarios
        .filter(u => !EXENTOS_DISPONIBILIDAD.includes(u.numeroVoluntario || ''))
        .map(({ createdAt, ...u }) => ({ ...u, alta: createdAt }))
}

/** Las dos formas de incumplir: no enviarla, o enviarla pasado el viernes. */
export type TipoIncidencia = 'SIN_ENVIAR' | 'FUERA_DE_PLAZO'

/** Acción con la que queda grabada cada una en la trazabilidad. */
export const ACCIONES_INCIDENCIA: Record<TipoIncidencia, string> = {
    SIN_ENVIAR: 'RECORDATORIO',
    FUERA_DE_PLAZO: 'FUERA_DE_PLAZO',
}

export interface AvisoGenerado {
    usuarioId: string
    indicativo: string
    nombre: string
    semana: string
    tipo: TipoIncidencia
    /** Días de retraso sobre el cierre del viernes; solo en los envíos tardíos. */
    retrasoDias?: number
}

/**
 * Registra las incidencias de disponibilidad que falten para las semanas dadas.
 *
 * Distingue dos supuestos, porque no son lo mismo y el servicio los trata
 * distinto: quien no envió nada y quien envió pero después del cierre del
 * viernes. Ambos quedan en la trazabilidad y salen en «Mi Área».
 *
 * Es idempotente: antes de crear nada comprueba qué hay registrado, de modo que
 * relanzarlo —o que el cron se dispare dos veces— no duplica el historial de
 * nadie. La semana concreta va en `datosNuevos` para poder cruzarla.
 *
 * `notificar` controla si además se avisa por campana y mensaje interno, y solo
 * aplica a quien no ha enviado nada: al reconstruir semanas pasadas va en
 * `false`, porque no tiene sentido avisar hoy de una semana de junio.
 */
export async function registrarAvisosDisponibilidad(opciones: {
    semanas: Date[]
    notificar: boolean
    simular?: boolean
}): Promise<{ creados: AvisoGenerado[]; yaExistian: number }> {
    const { semanas, notificar, simular = false } = opciones
    if (semanas.length === 0) return { creados: [], yaExistian: 0 }

    const obligados = await usuariosObligados()
    const semanasIso = semanas.map(isoDe)

    // Cuándo envió cada cual la disponibilidad de cada semana
    const enviadas = await prisma.disponibilidad.findMany({
        select: { usuarioId: true, semanaInicio: true, createdAt: true },
    })
    const envio = new Map<string, Date>()
    enviadas.forEach(d => {
        const clave = `${d.usuarioId}|${semanaNormalizada(d.semanaInicio)}`
        // Si hubiera más de un registro para la misma semana vale el primero:
        // es el momento en que la persona cumplió.
        const previo = envio.get(clave)
        if (!previo || d.createdAt < previo) envio.set(clave, d.createdAt)
    })

    // Qué incidencias existen ya, para no repetirlas
    const previos = await prisma.auditLog.findMany({
        where: { accion: { in: Object.values(ACCIONES_INCIDENCIA) }, entidad: 'Disponibilidad' },
        select: { accion: true, usuarioId: true, datosNuevos: true },
    })
    const yaRegistrado = new Set(
        previos.map(a => `${a.accion}|${a.usuarioId}|${(a.datosNuevos as any)?.semanaInicio ?? ''}`)
    )

    const creados: AvisoGenerado[] = []
    let yaExistian = 0

    // El remitente de los mensajes internos, igual que en el resto del módulo
    const coordinador = notificar
        ? await prisma.usuario.findFirst({
            where: { activo: true, rol: { nombre: { in: ['coordinador', 'admin', 'superadmin'] } } },
            select: { id: true },
        })
        : null

    for (let i = 0; i < semanas.length; i++) {
        const lunes = semanas[i]
        const iso = semanasIso[i]
        const texto = textoSemana(lunes)
        const cierre = fechaLimite(lunes)

        for (const u of obligados) {
            // A quien se dio de alta después de vencer el plazo no se le puede
            // reprochar esa semana. Sin esto, las altas recientes aparecían como
            // las más incumplidoras por semanas anteriores a su ingreso.
            if (cierre < u.alta) continue

            const cuandoEnvio = envio.get(`${u.id}|${iso}`)
            if (cuandoEnvio && cuandoEnvio <= cierre) continue // en plazo, nada que anotar

            const tipo: TipoIncidencia = cuandoEnvio ? 'FUERA_DE_PLAZO' : 'SIN_ENVIAR'
            const accion = ACCIONES_INCIDENCIA[tipo]
            if (yaRegistrado.has(`${accion}|${u.id}|${iso}`)) { yaExistian++; continue }

            const indicativo = u.numeroVoluntario || u.nombre
            const nombre = `${u.nombre} ${u.apellidos}`
            const retrasoDias = cuandoEnvio
                ? Math.max(1, Math.ceil((cuandoEnvio.getTime() - cierre.getTime()) / DIA_MS))
                : undefined

            // La incidencia se fecha cuando ocurrió —el cierre del viernes, o el
            // momento del envío tardío— y no hoy, para que el histórico de Mi Área
            // quede en orden cronológico real.
            const cuando = cuandoEnvio ?? cierre
            const descripcion = cuandoEnvio
                ? `Disponibilidad fuera de plazo — ${indicativo} ${nombre} envió la de la ${texto} con ${retrasoDias} día(s) de retraso sobre el cierre del viernes`
                : `Disponibilidad no enviada — ${indicativo} ${nombre} no envió la de la ${texto}`

            if (!simular) {
                await prisma.auditLog.create({
                    data: {
                        accion,
                        entidad: 'Disponibilidad',
                        entidadId: u.id,
                        descripcion,
                        datosNuevos: {
                            semanaInicio: iso,
                            cierre: cierre.toISOString(),
                            ...(cuandoEnvio ? { enviadaEl: cuandoEnvio.toISOString(), retrasoDias } : {}),
                        },
                        usuarioId: u.id,
                        usuarioNombre: nombre,
                        modulo: 'Sistema',
                        createdAt: cuando,
                    },
                })

                // Solo se avisa a quien todavía no ha enviado nada: a quien ya
                // envió, aunque tarde, pedírselo otra vez no tendría sentido.
                if (notificar && tipo === 'SIN_ENVIAR') {
                    await prisma.notificacion.create({
                        data: {
                            usuarioId: u.id,
                            titulo: '⚠ Disponibilidad pendiente de envío',
                            mensaje: `No has enviado tu disponibilidad para la ${texto}. Accede al panel principal de la aplicación y usa el formulario «Enviar Disponibilidad» antes de que se confeccione el cuadrante.`,
                            tipo: 'alerta',
                            leida: false,
                        },
                    })
                    if (coordinador) {
                        await prisma.mensaje.create({
                            data: {
                                remitenteId: coordinador.id,
                                destinatarioId: u.id,
                                asunto: `Recordatorio: disponibilidad pendiente — ${texto}`,
                                contenido: `Hola ${u.nombre},\n\nEstamos preparando el cuadrante de la ${texto} y aún no hemos recibido tu disponibilidad.\n\nPor favor accede al panel principal de la aplicación y cumplimenta el formulario «Enviar Disponibilidad» cuanto antes para poder asignarte los turnos que quieres cubrir.\n\nGracias.\n\nCoordinación — Protección Civil Bormujos`,
                                leido: false,
                            },
                        })
                    }
                }
            }

            yaRegistrado.add(`${accion}|${u.id}|${iso}`)
            creados.push({ usuarioId: u.id, indicativo, nombre, semana: iso, tipo, retrasoDias })
        }
    }

    return { creados, yaExistian }
}

/**
 * Recuerda a quien todavía no ha enviado la disponibilidad de una semana.
 *
 * Esto se lanza *antes* de que cierre el plazo, así que no anota ninguna
 * incidencia: solo empuja, que es de lo que se trata. La incidencia, si acaba
 * habiéndola, la registra después `registrarAvisosDisponibilidad`.
 */
export async function avisarPendientes(lunes: Date): Promise<string[]> {
    const obligados = await usuariosObligados()
    const texto = textoSemana(lunes)
    const iso = isoDe(lunes)

    const enviadas = await prisma.disponibilidad.findMany({ select: { usuarioId: true, semanaInicio: true } })
    const yaEnviaron = new Set(
        enviadas.filter(d => semanaNormalizada(d.semanaInicio) === iso).map(d => d.usuarioId)
    )

    const coordinador = await prisma.usuario.findFirst({
        where: { activo: true, rol: { nombre: { in: ['coordinador', 'admin', 'superadmin'] } } },
        select: { id: true },
    })

    const avisados: string[] = []
    for (const u of obligados) {
        if (yaEnviaron.has(u.id)) continue

        await prisma.notificacion.create({
            data: {
                usuarioId: u.id,
                titulo: '⚠ Disponibilidad pendiente de envío',
                mensaje: `Aún no has enviado tu disponibilidad para la ${texto}. El plazo termina hoy viernes a las 23:59; a partir de ahí queda registrada como fuera de plazo.`,
                tipo: 'alerta',
                leida: false,
            },
        })
        if (coordinador) {
            await prisma.mensaje.create({
                data: {
                    remitenteId: coordinador.id,
                    destinatarioId: u.id,
                    asunto: `Recordatorio: disponibilidad pendiente — ${texto}`,
                    contenido: `Hola ${u.nombre},\n\nEstamos preparando el cuadrante de la ${texto} y aún no hemos recibido tu disponibilidad.\n\nEl plazo termina hoy viernes a las 23:59. Accede al panel principal de la aplicación y cumplimenta el formulario «Enviar Disponibilidad» antes de esa hora para poder asignarte los turnos que quieres cubrir.\n\nGracias.\n\nCoordinación — Protección Civil Bormujos`,
                    leido: false,
                },
            })
        }
        avisados.push(u.numeroVoluntario || u.nombre)
    }
    return avisados
}

/**
 * Todos los lunes cuyo plazo ya ha vencido, desde el primero con datos hasta
 * hoy. Sirve para reconstruir el histórico sin depender de qué semanas tienen
 * registros: una semana en la que no contestara nadie también cuenta.
 */
export async function semanasConPlazoVencido(ahora: Date = new Date()): Promise<Date[]> {
    const primera = await prisma.disponibilidad.findFirst({
        orderBy: { semanaInicio: 'asc' },
        select: { semanaInicio: true },
    })
    if (!primera) return []

    const inicio = aFechaUTC(semanaNormalizada(primera.semanaInicio))
    const semanas: Date[] = []
    for (let d = new Date(inicio); fechaLimite(d) <= ahora; d = new Date(d.getTime() + 7 * DIA_MS)) {
        semanas.push(new Date(d))
    }
    return semanas
}
