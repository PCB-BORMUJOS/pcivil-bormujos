import { useSession } from 'next-auth/react'

export type NivelRol =
  | 'superadmin'
  | 'coordinador'
  | 'jefe_area'
  | 'responsable_turno'
  | 'voluntario'
  | 'visor'
  | 'admin' // legacy — se mantiene durante migración

const NIVEL: Record<string, number> = {
  superadmin:        5,
  coordinador:       4,
  admin:             4, // legacy alias de coordinador
  jefe_area:         3,
  responsable_turno: 2,
  voluntario:        1,
  visor:             0,
}

export const ROLES_LABEL: Record<string, string> = {
  superadmin:        'Jefe del Servicio',
  coordinador:       'Coordinador',
  admin:             'Coordinador',
  jefe_area:         'Jefe de Área',
  responsable_turno: 'Responsable de Turno',
  voluntario:        'Voluntario',
  visor:             'Visor',
}

export const PERMISOS_DISPONIBLES = [
  { key: 'inventario.crear',    label: 'Crear artículos en inventario' },
  { key: 'inventario.editar',   label: 'Editar artículos en inventario' },
  { key: 'inventario.eliminar', label: 'Eliminar artículos' },
  { key: 'peticion.crear',      label: 'Crear peticiones de material' },
  { key: 'peticion.aprobar',    label: 'Aprobar peticiones' },
  { key: 'vehiculos.editar',    label: 'Editar vehículos' },
  { key: 'partes.crear',        label: 'Crear partes de servicio' },
  { key: 'partes.editar',       label: 'Editar partes de servicio' },
  { key: 'viogen.ver',          label: 'Ver datos VIOGEN (confidencial)' },
] as const

export type PermisoKey = typeof PERMISOS_DISPONIBLES[number]['key']

export function getNivel(rol: string): number {
  return NIVEL[rol] ?? 1
}

export function usePermisos() {
  const { data: session } = useSession()
  const rol = ((session?.user as any)?.rol ?? 'voluntario') as string
  const nivel = getNivel(rol)
  const permisosRol: string[] = (session?.user as any)?.permisos ?? []
  const permisosExtra: string[] = (session?.user as any)?.permisosExtra ?? []
  const todosPermisos = Array.from(new Set([...permisosRol, ...permisosExtra]))

  const tienePermiso = (permiso: string): boolean => {
    if (nivel >= 5) return true // superadmin todo
    return todosPermisos.includes(permiso)
  }

  return {
    rol,
    nivel,
    isSuperAdmin:    nivel >= 5,
    isCoordinador:   nivel >= 4,
    isAdmin:         nivel >= 4, // alias legacy
    isJefeArea:      nivel >= 3,
    isResponsable:   nivel >= 2,
    isVoluntario:    nivel >= 1,
    isVisor:         nivel === 0,
    // Acciones
    canCreate:           nivel >= 3 || tienePermiso('inventario.crear'),
    canEdit:             nivel >= 3 || tienePermiso('inventario.editar'),
    canDelete:           nivel >= 4 || tienePermiso('inventario.eliminar'),
    canApprove:          nivel >= 3 || tienePermiso('peticion.aprobar'),
    canCreatePeticion:   nivel >= 1,
    canManageUsers:      nivel >= 4,
    canViewPresupuesto:  nivel >= 4,
    canViewAudit:        nivel >= 4,
    canVerViogen:        nivel >= 4 || tienePermiso('viogen.ver'),
    canViewEstadisticas: nivel >= 4,
    canEditVehiculos:    nivel >= 3 || tienePermiso('vehiculos.editar'),
    tienePermiso,
    todosPermisos,
  }
}
