import { prisma } from '@/lib/db'
import { registrarAudit } from '@/lib/audit'

const AREA_LOGISTICA = 'LOGISTICA'

/**
 * Al dar de baja a un voluntario, devuelve automáticamente todo su vestuario
 * asignado al almacén (libera el stock) y avisa a los indicativos de Logística
 * con la relación del material que vuelve a estar disponible.
 */
export async function devolverVestuarioPorBaja(
  usuarioBajaId: string,
  audit: { usuarioId: string; usuarioNombre: string }
): Promise<{ devueltas: number; detalle: string }> {
  const pendientes = await prisma.asignacionVestuario.findMany({
    where: { usuarioId: usuarioBajaId, estado: { notIn: ['DEVUELTO', 'devuelto'] } },
  })
  if (pendientes.length === 0) return { devueltas: 0, detalle: '' }

  const persona = await prisma.usuario.findUnique({
    where: { id: usuarioBajaId },
    select: { nombre: true, apellidos: true, numeroVoluntario: true },
  })

  // Marcar como devuelto y liberar el stock (disponible = stockActual - stockAsignado)
  for (const asig of pendientes) {
    await prisma.asignacionVestuario.update({
      where: { id: asig.id },
      data: { estado: 'DEVUELTO', fechaBaja: new Date() },
    })
    const art = await prisma.articulo.findFirst({ where: { nombre: asig.tipoPrenda } })
    if (art) {
      await prisma.articulo.update({
        where: { id: art.id },
        data: { stockAsignado: { decrement: asig.cantidad } },
      })
    }
  }

  const detalle = pendientes
    .map(a => `${a.cantidad}× ${a.tipoPrenda}${a.talla ? ` (talla ${a.talla})` : ''}`)
    .join(', ')
  const indicativo = persona?.numeroVoluntario || 'Sin indicativo'
  const nombre = `${persona?.nombre ?? ''} ${persona?.apellidos ?? ''}`.trim()

  // Avisar a los indicativos del área de Logística (principal o secundaria).
  const activos = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true } } },
  })
  const logistica = activos.filter(u => {
    const f = u.fichaVoluntario as { areaAsignada?: string | null; areaSecundaria?: string | null } | null
    return f?.areaAsignada === AREA_LOGISTICA || f?.areaSecundaria === AREA_LOGISTICA
  })

  if (logistica.length > 0) {
    await prisma.notificacion.createMany({
      data: logistica.map(u => ({
        usuarioId: u.id,
        tipo: 'info',
        titulo: `Baja de ${indicativo} — vestuario devuelto al almacén`,
        mensaje: `El indicativo ${indicativo}${nombre ? ` (${nombre})` : ''} ha sido dado de baja. El siguiente material ha pasado al inventario del almacén de vestuario como disponible: ${detalle}.`,
        leida: false,
      })),
    })
  }

  await registrarAudit({
    accion: 'UNASSIGN',
    entidad: 'Vestuario',
    entidadId: usuarioBajaId,
    descripcion: `Baja de ${indicativo}: ${pendientes.length} prenda(s) devueltas al almacén (${detalle})`,
    usuarioId: audit.usuarioId,
    usuarioNombre: audit.usuarioNombre,
    modulo: 'Logística',
  })

  return { devueltas: pendientes.length, detalle }
}
