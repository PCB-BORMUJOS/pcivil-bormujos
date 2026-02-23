import { prisma } from '@/lib/db'

export async function registrarAudit({
  accion,
  entidad,
  entidadId,
  descripcion,
  usuarioId,
  usuarioNombre,
  modulo,
  datosAnteriores,
  datosNuevos,
  ip,
}: {
  accion: string
  entidad: string
  entidadId?: string
  descripcion: string
  usuarioId: string
  usuarioNombre: string
  modulo: string
  datosAnteriores?: any
  datosNuevos?: any
  ip?: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        accion,
        entidad,
        entidadId: entidadId || null,
        descripcion,
        usuarioId,
        usuarioNombre,
        modulo,
        datosAnteriores: datosAnteriores ? JSON.stringify(datosAnteriores) : undefined,
        datosNuevos: datosNuevos ? JSON.stringify(datosNuevos) : undefined,
        ip: ip || null,
        userAgent: null,
      }
    })
  } catch (e) {
    console.error('Error registrando auditoría:', e)
  }
}

export function getUsuarioAudit(session: any) {
  return {
    usuarioId: session?.user?.id || 'desconocido',
    usuarioNombre: session?.user
      ? `${session.user.nombre || ''} ${session.user.apellidos || ''}`.trim() || session.user.email
      : 'desconocido',
  }
}
