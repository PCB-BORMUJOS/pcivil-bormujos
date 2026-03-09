import { useSession } from 'next-auth/react'

export type NivelRol = 'superadmin' | 'admin' | 'coordinador' | 'voluntario'

const NIVEL: Record<NivelRol, number> = {
  superadmin: 4,
  admin: 3,
  coordinador: 2,
  voluntario: 1,
}

// Permisos disponibles para grants individuales
export const PERMISOS_DISPONIBLES = [
  { key: 'inventario.crear',   label: 'Crear artículos en inventario' },
  { key: 'inventario.editar',  label: 'Editar artículos en inventario' },
  { key: 'inventario.eliminar',label: 'Eliminar artículos' },
  { key: 'peticion.crear',     label: 'Crear peticiones de material' },
  { key: 'peticion.aprobar',   label: 'Aprobar peticiones' },
  { key: 'vehiculos.editar',   label: 'Editar vehículos' },
  { key: 'partes.crear',       label: 'Crear partes de servicio' },
  { key: 'partes.editar',      label: 'Editar partes de servicio' },
] as const

export type PermisoKey = typeof PERMISOS_DISPONIBLES[number]['key']

export function usePermisos() {
  const { data: session } = useSession()
  const rol = ((session?.user as any)?.rol ?? 'voluntario') as NivelRol
  const nivel = NIVEL[rol] ?? 1
  const permisosRol: string[] = (session?.user as any)?.permisos ?? []
  const permisosExtra: string[] = (session?.user as any)?.permisosExtra ?? []
  const todosPermisos = Array.from(new Set([...permisosRol, ...permisosExtra]))

  const tienePermiso = (permiso: string): boolean => {
    if (nivel >= 4) return true // superadmin todo
    return todosPermisos.includes(permiso)
  }

  return {
    rol,
    nivel,
    isSuperAdmin: nivel >= 4,
    isAdmin:      nivel >= 3,
    isCoord:      nivel >= 2,
    isVoluntario: nivel >= 1,
    // Acciones — rol base O permiso individual
    canCreate:  nivel >= 2 || tienePermiso('inventario.crear'),
    canEdit:    nivel >= 2 || tienePermiso('inventario.editar'),
    canDelete:  nivel >= 3 || tienePermiso('inventario.eliminar'),
    canApprove: nivel >= 2 || tienePermiso('peticion.aprobar'),
    canCreatePeticion: nivel >= 1 || tienePermiso('peticion.crear'), // todos pueden pedir
    canManageUsers: nivel >= 3,
    canViewPresupuesto: nivel >= 3,
    canViewAudit: nivel >= 3,
    tienePermiso,
    todosPermisos,
  }
}
