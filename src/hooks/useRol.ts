'use client'
import { useSession } from 'next-auth/react'

export function useRol(areaModulo?: string) {
  const { data: session } = useSession()
  const rol = (session?.user as any)?.rol || ''
  const areaAsignada: string = ((session?.user as any)?.areaAsignada || '').toLowerCase()
  
  const isAdmin = ['superadmin', 'admin'].includes(rol)
  const isCoordinador = rol === 'coordinador'
  
  // canEdit: admin siempre, coordinador solo en su área
  const canEdit = isAdmin || (
    isCoordinador && (
      !areaModulo ||
      areaAsignada.includes(areaModulo.toLowerCase()) ||
      areaModulo.toLowerCase().includes(areaAsignada)
    )
  )
  
  const canApprove = isAdmin
  
  return { rol, isAdmin, isCoordinador, canEdit, canApprove, areaAsignada }
}
