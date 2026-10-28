import { prisma } from '@/lib/db'

// Turnos obligatorios de prácticas antes de pasar a voluntario activo.
export const TURNOS_OBLIGATORIOS = 15

/** Turno (mañana/tarde/noche) a partir de la hora de llamada "HH:mm". */
export function turnoDeHora(hora?: string | null): 'mañana' | 'tarde' | 'noche' | null {
  if (!hora) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hora.trim())
  if (!m) return null
  const min = Number(m[1]) * 60 + Number(m[2])
  if (min >= 7 * 60 && min < 15 * 60) return 'mañana'
  if (min >= 15 * 60 && min < 23 * 60) return 'tarde'
  return 'noche'
}

/** Indicativos que figuran en un parte PSI (equipo + firmantes + informantes). */
export function indicativosDeParte(parte: any): Set<string> {
  const set = new Set<string>()
  const add = (v?: string | null) => { const s = (v || '').trim().toUpperCase(); if (s) set.add(s) }
  const eq = Array.isArray(parte?.equipoWalkies) ? parte.equipoWalkies : []
  for (const r of eq) add(r?.equipo)
  add(parte?.indicativoCumplimenta)
  add(parte?.responsableTurno)
  // indicativosInforman puede traer varios separados por coma/espacio/barra.
  String(parte?.indicativosInforman || '').split(/[,;/\s]+/).forEach(add)
  return set
}

const fechaMadrid = (d: Date) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })

/**
 * Recalcula los turnos de prácticas de TODOS los voluntarios en prácticas a partir
 * de los partes de servicio PSI: un turno cuenta si el voluntario figura en al
 * menos un parte de ese día y turno (se cuenta una sola vez por día+turno aunque
 * haya varios partes). Al alcanzar los turnos obligatorios, pasa a voluntario.
 */
export async function recalcularPracticasEnPartes(): Promise<void> {
  const enPracticas = await prisma.fichaVoluntario.findMany({
    where: { enPracticas: true },
    select: {
      usuarioId: true, turnosPracticasRealizados: true,
      // Desde cuándo cuentan las prácticas de ESTE voluntario con su indicativo
      // actual. Imprescindible para los indicativos REUTILIZADOS: sin este suelo,
      // un número que antes tuvo otra persona heredaría sus turnos de partes
      // antiguos. Si no hay fecha de inicio, se usa el alta.
      fechaInicioPracticas: true, fechaAlta: true,
      usuario: { select: { numeroVoluntario: true } },
    },
  })
  if (enPracticas.length === 0) return

  // El cómputo de prácticas = turnos del CUADRANTE realmente realizados (guardias
  // con fecha <= hoy). Debe coincidir EXACTAMENTE con guardias y estadísticas, por
  // eso se cuenta sobre la misma fuente (la tabla de guardias) y no sobre los
  // partes PSI (que incluían apariciones sin turno real y falsos "noche").
  const usuarioIds = enPracticas.map(f => f.usuarioId)
  const guardias = await prisma.guardia.findMany({
    where: { usuarioId: { in: usuarioIds } },
    select: { usuarioId: true, fecha: true, turno: true },
  })
  const hoyStr = fechaMadrid(new Date())
  const porUsuario = new Map<string, Array<{ fechaStr: string; turno: string }>>()
  for (const g of guardias) {
    const arr = porUsuario.get(g.usuarioId) ?? []
    arr.push({ fechaStr: fechaMadrid(g.fecha), turno: g.turno })
    porUsuario.set(g.usuarioId, arr)
  }

  for (const f of enPracticas) {
    // Suelo de fecha: solo cuentan los turnos desde que esta persona usa el
    // indicativo (fechaInicioPracticas; si no, su alta). Así un número reutilizado
    // no hereda los turnos del voluntario anterior.
    const desde = f.fechaInicioPracticas ?? f.fechaAlta
    const desdeStr = desde ? fechaMadrid(desde) : null
    const turnos = new Set<string>()
    for (const g of porUsuario.get(f.usuarioId) ?? []) {
      if (g.fechaStr > hoyStr) continue             // turnos futuros aún no cuentan
      if (desdeStr && g.fechaStr < desdeStr) continue
      turnos.add(`${g.fechaStr}|${g.turno}`)
    }
    const nuevo = turnos.size
    if (nuevo === (f.turnosPracticasRealizados ?? 0)) continue

    await prisma.fichaVoluntario.update({ where: { usuarioId: f.usuarioId }, data: { turnosPracticasRealizados: nuevo } })

    if (nuevo >= TURNOS_OBLIGATORIOS) {
      await prisma.fichaVoluntario.update({ where: { usuarioId: f.usuarioId }, data: { enPracticas: false } })
      await prisma.notificacion.create({
        data: {
          usuarioId: f.usuarioId,
          titulo: '¡Prácticas completadas!',
          mensaje: `Has completado los ${TURNOS_OBLIGATORIOS} turnos de prácticas obligatorios. Ya eres voluntario activo.`,
          tipo: 'sistema', leida: false,
        },
      }).catch(() => { /* la notificación es secundaria */ })
    }
  }
}
