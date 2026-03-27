import { 
  Flame, Droplets, Bell, Radio, HandMetal, 
  TriangleAlert, Server, MonitorCheck, Package,
  Wind, ShieldAlert, Siren
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const TIPOS_EQUIPO_ECI: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  extintor:     { label: 'Extintor',          icon: Flame,         color: 'text-red-600' },
  bie:          { label: 'BIE',               icon: Droplets,      color: 'text-blue-600' },
  detector:     { label: 'Detector',          icon: Radio,         color: 'text-orange-500' },
  pulsador:     { label: 'Pulsador',          icon: ShieldAlert,   color: 'text-yellow-600' },
  alarma:       { label: 'Alarma / Sirena',   icon: Siren,         color: 'text-red-500' },
  señalizacion: { label: 'Señalización',      icon: TriangleAlert, color: 'text-green-600' },
  central:      { label: 'Central PCI',       icon: MonitorCheck,  color: 'text-slate-600' },
  otro:         { label: 'Otro',              icon: Package,       color: 'text-slate-400' },
  'equipo-eci': { label: 'Equipo ECI',        icon: Package,       color: 'text-slate-400' },
}

export function getIconoEquipoECI(tipo: string, subtipo?: string | null): LucideIcon {
  return TIPOS_EQUIPO_ECI[tipo]?.icon ?? Package
}

export function getColorEquipoECI(tipo: string): string {
  return TIPOS_EQUIPO_ECI[tipo]?.color ?? 'text-slate-400'
}

export function getLabelEquipoECI(tipo: string): string {
  return TIPOS_EQUIPO_ECI[tipo]?.label ?? tipo
}
