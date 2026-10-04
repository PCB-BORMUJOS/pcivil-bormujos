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
 * Momento en que vence el plazo de una semana: el viernes anterior a las 12:00,
 * hora española.
 *
 * Se calcula en hora de Madrid y no en UTC: en verano las 12:00 de España son
 * las 10:00 UTC y en invierno las 11:00, así que fijar la hora en UTC movería
 * el corte una hora al cambio de estación.
 */
export function fechaLimite(lunes: Date): Date {
    const viernes = isoDe(new Date(lunes.getTime() - 3 * DIA_MS))
    const tentativo = new Date(`${viernes}T12:00:00.000Z`)
    return new Date(tentativo.getTime() - desfaseMadrid(tentativo) * 60000)
}

/**
 * Servicios especiales que eximen del plazo.
 *
 * Si el viernes en que vencía el plazo cayó en mitad de uno de estos
 * dispositivos, a quien estuvo de servicio no se le reprocha la demora: estaba
 * trabajando. A quien no participó se le cuenta igual que cualquier otra
 * semana. El caso que lo motiva es la Feria de 2026: el plazo de la semana
 * siguiente vencía el viernes 28 en plena Feria, y medio servicio envió su
 * disponibilidad el domingo, al terminar el dispositivo.
 */
export const SERVICIOS_ESPECIALES = [
    { nombre: 'Feria de Bormujos 2026', desde: '2026-08-26', hasta: '2026-08-30' },
]

/** El servicio especial que estaba en marcha en ese momento, si lo hubo. */
function servicioEspecialEnCurso(instante: Date) {
    const dia = instante.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    return SERVICIOS_ESPECIALES.find(s => dia >= s.desde && dia <= s.hasta)
}

/** Quién estuvo de servicio durante un dispositivo especial. */
async function participantesEn(servicio: { desde: string; hasta: string }): Promise<Set<string>> {
    const guardias = await prisma.guardia.findMany({
        where: {
            fecha: { gte: aFechaUTC(servicio.desde), lte: new Date(`${servicio.hasta}T23:59:59.999Z`) },
        },
        select: { usuarioId: true },
    })
    return new Set(guardias.map(g => g.usuarioId))
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
    /** Retraso sobre el cierre del viernes; solo en los envíos tardíos. */
    retrasoHoras?: number
    /** El mismo retraso ya redactado: «3 h», «2 días». */
    retraso?: string
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
}): Promise<{ creados: AvisoGenerado[]; corregidos: AvisoGenerado[]; yaExistian: number }> {
    const { semanas, notificar, simular = false } = opciones
    if (semanas.length === 0) return { creados: [], corregidos: [], yaExistian: 0 }

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

    // Qué incidencias existen ya. La clave es persona + semana, SIN el tipo: de
    // una semana solo puede haber una incidencia. Si la registrada no coincide
    // con lo que de verdad pasó, se corrige en lugar de añadir otra.
    //
    // Esto ocurre de hecho todas las semanas: la comprobación se lanza el
    // viernes por la tarde y anota «sin enviar» a quien aún no ha mandado nada,
    // pero algunos envían esa misma noche o el fin de semana. Sin corregirlo, se
    // quedaban marcados como si no hubieran enviado nunca.
    const previos = await prisma.auditLog.findMany({
        where: { accion: { in: Object.values(ACCIONES_INCIDENCIA) }, entidad: 'Disponibilidad' },
        select: { id: true, accion: true, usuarioId: true, datosNuevos: true },
    })
    const yaRegistrado = new Map<string, { id: string; accion: string }>()
    previos.forEach(a => {
        yaRegistrado.set(`${a.usuarioId}|${(a.datosNuevos as any)?.semanaInicio ?? ''}`, { id: a.id, accion: a.accion })
    })

    const creados: AvisoGenerado[] = []
    const corregidos: AvisoGenerado[] = []
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

        // Si el plazo venció durante un dispositivo especial, quien estuvo de
        // servicio queda exento esa semana.
        const especial = servicioEspecialEnCurso(cierre)
        const exentos = especial ? await participantesEn(especial) : new Set<string>()

        for (const u of obligados) {
            if (exentos.has(u.id)) continue
            // A quien se dio de alta después de vencer el plazo no se le puede
            // reprochar esa semana. Sin esto, las altas recientes aparecían como
            // las más incumplidoras por semanas anteriores a su ingreso.
            if (cierre < u.alta) continue

            const cuandoEnvio = envio.get(`${u.id}|${iso}`)
            if (cuandoEnvio && cuandoEnvio <= cierre) continue // en plazo, nada que anotar

            const tipo: TipoIncidencia = cuandoEnvio ? 'FUERA_DE_PLAZO' : 'SIN_ENVIAR'
            const accion = ACCIONES_INCIDENCIA[tipo]
            const previo = yaRegistrado.get(`${u.id}|${iso}`)
            if (previo && previo.accion === accion) { yaExistian++; continue }

            const indicativo = u.numeroVoluntario || u.nombre
            const nombre = `${u.nombre} ${u.apellidos}`
            // El retraso se mide en horas: la mayoría envía el mismo viernes por la
            // tarde, y redondear eso a «1 día» exagera lo ocurrido.
            const retrasoHoras = cuandoEnvio
                ? Math.max(1, Math.round((cuandoEnvio.getTime() - cierre.getTime()) / 3600000))
                : undefined
            const retraso = retrasoHoras === undefined ? undefined
                : retrasoHoras < 24 ? `${retrasoHoras} h`
                    : `${Math.round(retrasoHoras / 24)} día${Math.round(retrasoHoras / 24) === 1 ? '' : 's'}`

            // La incidencia se fecha cuando ocurrió —el cierre del viernes, o el
            // momento del envío tardío— y no hoy, para que el histórico de Mi Área
            // quede en orden cronológico real.
            const cuando = cuandoEnvio ?? cierre
            const descripcion = cuandoEnvio
                ? `Disponibilidad fuera de plazo — ${indicativo} ${nombre} envió la de la ${texto} con ${retraso} de retraso sobre el cierre del viernes a las 12:00`
                : `Disponibilidad no enviada — ${indicativo} ${nombre} no envió la de la ${texto}`

            const datos = {
                accion,
                entidad: 'Disponibilidad',
                entidadId: u.id,
                descripcion,
                datosNuevos: {
                    semanaInicio: iso,
                    cierre: cierre.toISOString(),
                    ...(cuandoEnvio ? { enviadaEl: cuandoEnvio.toISOString(), retrasoHoras, retraso } : {}),
                },
                usuarioId: u.id,
                usuarioNombre: nombre,
                modulo: 'Sistema',
                createdAt: cuando,
            }

            if (!simular) {
                if (previo) await prisma.auditLog.update({ where: { id: previo.id }, data: datos })
                else await prisma.auditLog.create({ data: datos })

                // Solo se avisa a quien todavía no ha enviado nada: a quien ya
                // envió, aunque tarde, pedírselo otra vez no tendría sentido.
                // Y nunca al corregir: el aviso ya se mandó en su momento.
                if (notificar && !previo && tipo === 'SIN_ENVIAR') {
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

            const aviso: AvisoGenerado = { usuarioId: u.id, indicativo, nombre, semana: iso, tipo, retrasoHoras, retraso }
            if (previo) corregidos.push(aviso); else creados.push(aviso)
            yaRegistrado.set(`${u.id}|${iso}`, { id: previo?.id ?? '', accion })
        }
    }

    return { creados, corregidos, yaExistian }
}

/**
 * Recuerda a quien todavía no ha enviado la disponibilidad de una semana.
 *
 * Esto se lanza el jueves, un día antes de que cierre el plazo, así que no anota ninguna
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
                mensaje: `Aún no has enviado tu disponibilidad para la ${texto}. El plazo termina mañana viernes a las 12:00; a partir de esa hora queda registrada como fuera de plazo.`,
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
                    contenido: `Hola ${u.nombre},\n\nEstamos preparando el cuadrante de la ${texto} y aún no hemos recibido tu disponibilidad.\n\nEl plazo termina mañana viernes a las 12:00. Accede al panel principal de la aplicación y cumplimenta el formulario «Enviar Disponibilidad» antes de esa hora para poder asignarte los turnos que quieres cubrir.\n\nGracias.\n\nCoordinación — Protección Civil Bormujos`,
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
