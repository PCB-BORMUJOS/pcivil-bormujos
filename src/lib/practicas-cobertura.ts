import { prisma } from '@/lib/db'

export interface PracticaCatalogo {
  id: string
  numero: string
  titulo: string
  familia: string
  nivel: string
}

// Una práctica cuenta como realizada por una persona si aparece en algún
// registro (como responsable o participante) que no sea meramente parcial.
const RESULTADOS_VALIDOS = ['completado', 'pendiente_jefe']

// Catálogo de prácticas activas.
export async function catalogoPracticas(): Promise<PracticaCatalogo[]> {
  return prisma.practica.findMany({
    where: { activa: true },
    select: { id: true, numero: true, titulo: true, familia: true, nivel: true },
    orderBy: [{ familia: 'asc' }, { numero: 'asc' }],
  })
}

// Devuelve, para cada usuarioId solicitado, el conjunto de IDs de práctica que
// ha realizado. Si usuarioIds es null, no filtra (mapa vacío que se rellena con
// quien aparezca). Recorre los registros y reparte por responsable + participantes.
export async function practicasRealizadasPorUsuario(usuarioIds: string[]): Promise<Map<string, Set<string>>> {
  const mapa = new Map<string, Set<string>>()
  usuarioIds.forEach(id => mapa.set(id, new Set()))
  if (usuarioIds.length === 0) return mapa

  const registros = await prisma.registroPractica.findMany({
    where: {
      resultado: { in: RESULTADOS_VALIDOS },
      OR: [
        { responsableId: { in: usuarioIds } },
        ...usuarioIds.map(uid => ({ participantes: { array_contains: uid } })),
      ],
    },
    select: { practicaId: true, responsableId: true, participantes: true },
  })

  for (const r of registros) {
    const implicados = new Set<string>()
    if (r.responsableId) implicados.add(r.responsableId)
    if (Array.isArray(r.participantes)) {
      for (const p of r.participantes as unknown[]) {
        if (typeof p === 'string') implicados.add(p)
      }
    }
    for (const uid of usuarioIds) {
      if (implicados.has(uid)) mapa.get(uid)!.add(r.practicaId)
    }
  }
  return mapa
}

// Carencias de un usuario: prácticas del catálogo que aún no ha realizado.
export async function carenciasUsuario(usuarioId: string): Promise<{ realizadas: string[]; pendientes: PracticaCatalogo[] }> {
  const [catalogo, mapa] = await Promise.all([
    catalogoPracticas(),
    practicasRealizadasPorUsuario([usuarioId]),
  ])
  const hechas = mapa.get(usuarioId) ?? new Set<string>()
  return {
    realizadas: Array.from(hechas),
    pendientes: catalogo.filter(p => !hechas.has(p.id)),
  }
}
