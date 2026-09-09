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
    select: { usuarioId: true, turnosPracticasRealizados: true, usuario: { select: { numeroVoluntario: true } } },
  })
  if (enPracticas.length === 0) return

  const partes = await prisma.partePSI.findMany({
    where: { archivado: false },
    select: {
      fecha: true, horaLlamada: true, equipoWalkies: true,
      indicativoCumplimenta: true, responsableTurno: true, indicativosInforman: true,
    },
  })

  // Precalcular, por parte, su clave día+turno y su conjunto de indicativos.
  const partesInfo = partes.map(p => ({
    clave: `${fechaMadrid(p.fecha)}|${turnoDeHora(p.horaLlamada) || 'noche'}`,
    inds: indicativosDeParte(p),
  }))

  for (const f of enPracticas) {
    const ind = (f.usuario?.numeroVoluntario || '').trim().toUpperCase()
    if (!ind) continue
    const turnos = new Set<string>()
    for (const pi of partesInfo) if (pi.inds.has(ind)) turnos.add(pi.clave)
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
