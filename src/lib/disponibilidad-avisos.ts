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

/**
 * Momento en que vence el plazo de una semana: el viernes anterior a las 10:00
 * UTC, que es cuando está programada la comprobación automática.
 */
export function fechaLimite(lunes: Date): Date {
    const viernes = new Date(lunes.getTime() - 3 * DIA_MS)
    viernes.setUTCHours(10, 0, 0, 0)
    return viernes
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

export interface AvisoGenerado {
    usuarioId: string
    indicativo: string
    nombre: string
    semana: string
}

/**
 * Registra los avisos que falten para las semanas indicadas.
 *
 * Es idempotente: antes de crear nada comprueba qué avisos existen ya, de modo
 * que relanzarlo —o que el cron se dispare dos veces— no duplica el historial
 * de nadie. La semana concreta se guarda en `datosNuevos` para poder cruzarla.
 *
 * `notificar` controla si además se avisa a la persona por campana y mensaje
 * interno. Al reconstruir semanas pasadas va en `false`: no tiene sentido
 * mandarle a nadie hoy un recordatorio de una semana de junio.
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

    // Qué disponibilidades hay ya enviadas, por semana
    const enviadas = await prisma.disponibilidad.findMany({ select: { usuarioId: true, semanaInicio: true } })
    const porSemana = new Map<string, Set<string>>()
    enviadas.forEach(d => {
        const clave = semanaNormalizada(d.semanaInicio)
        if (!porSemana.has(clave)) porSemana.set(clave, new Set())
        porSemana.get(clave)!.add(d.usuarioId)
    })

    // Y qué avisos existen ya, para no repetirlos
    const previos = await prisma.auditLog.findMany({
        where: { accion: 'RECORDATORIO', entidad: 'Disponibilidad' },
        select: { usuarioId: true, datosNuevos: true },
    })
    const yaAvisado = new Set(
        previos.map(a => `${a.usuarioId}|${(a.datosNuevos as any)?.semanaInicio ?? ''}`)
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
        const cuando = fechaLimite(lunes)
        const respondieron = porSemana.get(iso) ?? new Set<string>()

        for (const u of obligados) {
            // A quien se dio de alta después de vencer el plazo no se le puede
            // reprochar esa semana. Sin esto, las altas recientes aparecían como
            // las más incumplidoras por semanas anteriores a su ingreso.
            if (cuando < u.alta) continue
            if (respondieron.has(u.id)) continue
            if (yaAvisado.has(`${u.id}|${iso}`)) { yaExistian++; continue }

            const indicativo = u.numeroVoluntario || u.nombre
            const aviso: AvisoGenerado = { usuarioId: u.id, indicativo, nombre: `${u.nombre} ${u.apellidos}`, semana: iso }

            if (!simular) {
                await prisma.auditLog.create({
                    data: {
                        accion: 'RECORDATORIO',
                        entidad: 'Disponibilidad',
                        entidadId: u.id,
                        descripcion: `Recordatorio automático — ${indicativo} ${u.nombre} ${u.apellidos} no envió disponibilidad para la ${texto}`,
                        datosNuevos: { semanaInicio: iso, plazo: cuando.toISOString() },
                        usuarioId: u.id,
                        usuarioNombre: `${u.nombre} ${u.apellidos}`,
                        modulo: 'Sistema',
                        // La fecha del aviso es la del plazo que se incumplió, no la de
                        // hoy: así el histórico de Mi Área queda en orden cronológico.
                        createdAt: cuando,
                    },
                })

                if (notificar) {
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

            yaAvisado.add(`${u.id}|${iso}`)
            creados.push(aviso)
        }
    }

    return { creados, yaExistian }
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
