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


/**
 * Compara el registro que había con los datos que se van a escribir y devuelve
 * solo lo que cambia, campo por campo.
 *
 * Se guarda el detalle porque hasta ahora la trazabilidad solo decía «parte
 * actualizado»: sabíamos quién y cuándo, pero no qué. Con varias personas
 * editando el mismo parte —ha llegado a haber cuatro en una hora— eso hacía
 * imposible saber quién había cambiado qué, ni recuperar un dato pisado.
 *
 * Solo compara las claves presentes en `nuevos`, de modo que los campos que la
 * petición no toca no aparecen como cambios.
 */
export function compararCambios(
    anteriores: Record<string, any> | null | undefined,
    nuevos: Record<string, any> | null | undefined,
): { antes: Record<string, any>; despues: Record<string, any>; campos: string[] } {
    const antes: Record<string, any> = {}
    const despues: Record<string, any> = {}
    if (!nuevos) return { antes, despues, campos: [] }

    const igual = (a: any, b: any) => {
        if (a === b) return true
        if (a == null && b == null) return true
        try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
    }

    for (const clave of Object.keys(nuevos)) {
        // updatedAt cambia siempre y no aporta nada al historial.
        if (clave === 'updatedAt') continue
        const previo = anteriores ? (anteriores as any)[clave] : undefined
        if (igual(previo, nuevos[clave])) continue
        antes[clave] = previo ?? null
        despues[clave] = nuevos[clave]
    }
    return { antes, despues, campos: Object.keys(despues) }
}
