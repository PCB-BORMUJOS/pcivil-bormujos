import { useSession } from 'next-auth/react'

export type NivelRol = 'superadmin' | 'admin' | 'coordinador' | 'voluntario'

const NIVEL: Record<NivelRol, number> = {
  superadmin: 4,
  admin: 3,
  coordinador: 2,
  voluntario: 1,
}

export function usePermisos() {
  const { data: session } = useSession()
  const rol = ((session?.user as any)?.rol ?? 'voluntario') as NivelRol
  const nivel = NIVEL[rol] ?? 1

  return {
    rol,
    // Identidad
    isSuperAdmin: nivel >= 4,
    isAdmin:      nivel >= 3,  // admin + superadmin
    isCoord:      nivel >= 2,  // coordinador + admin + superadmin
    isVoluntario: nivel >= 1,
    // Acciones
    canCreate: nivel >= 2,     // coordinador en adelante puede crear
    canEdit:   nivel >= 2,
    canDelete: nivel >= 3,     // solo admin/superadmin elimina
    canApprove: nivel >= 2,    // aprobar peticiones
    canManageUsers: nivel >= 3,
    canViewPresupuesto: nivel >= 3,
    canViewAudit: nivel >= 3,
    // Helper
    tienePermiso: (permiso: string) => {
      const permisos: string[] = (session?.user as any)?.permisos ?? []
      return nivel >= 4 || permisos.includes(permiso)
    }
  }
}
