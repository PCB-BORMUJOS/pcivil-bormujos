import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

const NIVEL: Record<string, number> = {
  superadmin:        5,
  coordinador:       4,
  admin:             4,
  jefe_area:         3,
  responsable_turno: 2,
  voluntario:        1,
  visor:             0,
}

export function getNivelRol(rol: string): number {
  return NIVEL[rol] ?? 1
}

export type SesionConRol = {
  userId: string
  email: string
  nombre: string
  rol: string
  nivel: number
}

/**
 * Obtiene la sesión y la valida. Si no hay sesión autenticada devuelve null.
 */
export async function getSesion(): Promise<SesionConRol | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = session.user as any
  const rol = user.rol ?? 'voluntario'
  return {
    userId: user.id ?? '',
    email:  user.email ?? '',
    nombre: `${user.nombre ?? ''} ${user.apellidos ?? ''}`.trim() || user.name || '',
    rol,
    nivel: getNivelRol(rol),
  }
}

/**
 * Verifica que el usuario esté autenticado y tenga nivel >= minNivel.
 * Devuelve la sesión o un NextResponse de error (401/403).
 */
export async function requireNivel(
  minNivel: number
): Promise<SesionConRol | NextResponse> {
  const sesion = await getSesion()
  if (!sesion) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (sesion.nivel < minNivel) {
    return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
  }
  return sesion
}

/**
 * Verifica que el rol sea exactamente uno de los permitidos.
 */
export async function requireRoles(
  roles: string[]
): Promise<SesionConRol | NextResponse> {
  const sesion = await getSesion()
  if (!sesion) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!roles.includes(sesion.rol)) {
    return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
  }
  return sesion
}

/** Comprueba si el valor devuelto por requireNivel/requireRoles es un error */
export function isAuthError(val: SesionConRol | NextResponse): val is NextResponse {
  return val instanceof NextResponse
}

// Helpers semánticos
export const requireVoluntario   = () => requireNivel(1)
export const requireResponsable  = () => requireNivel(2)
export const requireJefeArea     = () => requireNivel(3)
export const requireCoordinador  = () => requireNivel(4)
export const requireSuperAdmin   = () => requireNivel(5)
