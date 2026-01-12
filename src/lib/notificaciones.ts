import { prisma } from '@/lib/db'

export async function crearNotificacion(
  usuarioId: string,
  tipo: string,
  titulo: string,
  mensaje: string,
  enlace?: string,
  peticionId?: string
) {
  return prisma.notificacion.create({
    data: { usuarioId, tipo, titulo, mensaje, enlace, peticionId }
  })
}

export async function notificarLogistica(
  tipo: string,
  titulo: string,
  mensaje: string,
  enlace?: string,
  peticionId?: string
) {
  const usuarios = await prisma.usuario.findMany({
    where: {
      activo: true,
      OR: [
        { rol: { nombre: { in: ['superadmin', 'admin'] } } }
      ]
    },
    select: { id: true }
  })

  const notificaciones = usuarios.map(u => ({
    usuarioId: u.id, tipo, titulo, mensaje, enlace, peticionId
  }))

  if (notificaciones.length > 0) {
    await prisma.notificacion.createMany({ data: notificaciones })
  }
}

export async function notificarCambioPeticion(
  peticion: { id: string; numero: string; nombreArticulo: string; solicitanteId: string },
  nuevoEstado: string,
  usuarioAccionId: string
) {
  const estadosTexto: Record<string, string> = {
    'pendiente': 'pendiente de aprobación',
    'aprobada': 'aprobada',
    'rechazada': 'rechazada',
    'en_compra': 'en proceso de compra',
    'recibida': 'recibida y el stock ha sido actualizado',
    'cancelada': 'cancelada'
  }

  const titulo = `Petición ${peticion.numero} ${estadosTexto[nuevoEstado] || nuevoEstado}`
  const mensaje = `Tu petición de "${peticion.nombreArticulo}" ha sido ${estadosTexto[nuevoEstado] || nuevoEstado}.`

  if (peticion.solicitanteId !== usuarioAccionId) {
    await crearNotificacion(
      peticion.solicitanteId,
      'peticion_estado',
      titulo,
      mensaje,
      '/logistica?tab=peticiones',
      peticion.id
    )
  }
}
