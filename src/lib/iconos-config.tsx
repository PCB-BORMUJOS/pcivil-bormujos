// ============================================================================
// CONFIGURACIÓN CENTRALIZADA DE ICONOS - PROTECCIÓN CIVIL BORMUJOS
// ============================================================================

import React from 'react'
import { Package } from 'lucide-react'
import { PiFireExtinguisherLight } from 'react-icons/pi'
import { FaFireExtinguisher } from 'react-icons/fa'
import { GiWalkieTalkie } from 'react-icons/gi'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import StraightenIcon from '@mui/icons-material/Straighten'
import { Truck } from 'lucide-react'

// ─── Pictogramas ISO para equipos ECI ────────────────────────────────────────

const BIEIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/bie-icon.png" alt="BIE" style={{ width: size, height: size }} className={className} />
)

const EmergenciaIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/emergencia-icon.svg" alt="Señalización" style={{ width: size, height: size }} className={className} />
)

// Detector de humo — pictograma ISO 7240 (círculo con ondas)
const DetectorIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="14" r="4" stroke="#c0392b" strokeWidth="1.8"/>
    <circle cx="12" cy="14" r="1.5" fill="#c0392b"/>
    <path d="M6.5 8.5 A7.5 7.5 0 0 1 17.5 8.5" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M4 6 A10.5 10.5 0 0 1 20 6" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
  </svg>
)

// Pulsador de alarma — pictograma ISO (mano + botón)
const PulsadorIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="3" stroke="#c0392b" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="4" fill="#c0392b"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
)

// Alarma/Sirena — campana de alarma
const AlarmIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="12" y1="2" x2="12" y2="4" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// Extintor CO2
const ExtintorCO2Icon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <FaFireExtinguisher size={size} className={className} style={{ color: '#c0392b' }} />
)

// Extintor ABC/polvo
const ExtintorABCIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <PiFireExtinguisherLight size={size} className={className} style={{ color: '#c0392b' }} />
)

// DEA
const DEAIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/dea-icon.svg" alt="DEA" style={{ width: size, height: size }} className={className} />
)

const RepetidorIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/repetidor-icon.svg" alt="Repetidor" style={{ width: size, height: size }} className={className} />
)

// ============================================================================
// MAPEOS
// ============================================================================

// Central PCI
const CentralIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="6" width="20" height="13" rx="2" stroke="#64748b" strokeWidth="1.8"/>
    <circle cx="7" cy="12" r="1.5" fill="#64748b"/>
    <circle cx="12" cy="12" r="1.5" fill="#64748b"/>
    <circle cx="17" cy="12" r="1.5" fill="#64748b"/>
    <line x1="6" y1="6" x2="6" y2="4" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="18" y1="6" x2="18" y2="4" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const TIPOS_EQUIPO_ECI: Record<string, any> = {
  extintor:    ExtintorABCIcon,
  bie:         BIEIcon,
  detector:    DetectorIcon,
  pulsador:    PulsadorIcon,
  alarma:      AlarmIcon,
  señalizacion: EmergenciaIcon,
  central:      CentralIcon,
  otro:         Package,
  'equipo-eci': Package,
}

export const getIconoEquipoECI = (tipo: string, subtipo?: string | null): any => {
  if (tipo === 'extintor') {
    if (subtipo?.toLowerCase().includes('co2')) return ExtintorCO2Icon
    return ExtintorABCIcon
  }
  return TIPOS_EQUIPO_ECI[tipo] || Package
}

export const getColorEquipoECI = (_tipo: string): string => ''

export const getLabelEquipoECI = (tipo: string): string => {
  const labels: Record<string, string> = {
    extintor: 'Extintor', bie: 'BIE', detector: 'Detector',
    pulsador: 'Pulsador', alarma: 'Alarma/Sirena', señalizacion: 'Señalización',
    central: 'Central PCI', otro: 'Otro', 'equipo-eci': 'Equipo ECI',
  }
  return labels[tipo] ?? tipo
}

export const TIPOS_EQUIPO_RADIO: Record<string, any> = {
  portatil:  GiWalkieTalkie,
  movil:     GiWalkieTalkie,
  base:      RepetidorIcon,
  repetidor: RepetidorIcon,
}

export const TIPOS_VEHICULOS: Record<string, any> = {
  furgoneta: LocalShippingIcon,
  turismo:   DirectionsCarIcon,
  pickup:    LocalShippingIcon,
  remolque:  StraightenIcon,
}

export const ICONOS_INCENDIOS = TIPOS_EQUIPO_ECI
export const ICONOS_SOCORRISMO = { dea: DEAIcon }
export const ICONOS_TRANSMISIONES = TIPOS_EQUIPO_RADIO
export const ICONOS_VEHICULOS = TIPOS_VEHICULOS
export const ICONOS_GENERAL = { inventario: Package }

interface IconProps {
  tipo: string
  categoria: 'incendios' | 'socorrismo' | 'transmisiones' | 'vehiculos'
  size?: number
  className?: string
}

export const RenderIcon = ({ tipo, categoria, size = 24, className = '' }: IconProps) => {
  let IconComponent: any
  switch (categoria) {
    case 'incendios':    IconComponent = TIPOS_EQUIPO_ECI[tipo]; break
    case 'transmisiones': IconComponent = TIPOS_EQUIPO_RADIO[tipo]; break
    case 'vehiculos':    IconComponent = TIPOS_VEHICULOS[tipo]; break
    default:              IconComponent = Package
  }
  if (!IconComponent) IconComponent = Package
  return <IconComponent size={size} className={className} />
}

export default {
  incendios: ICONOS_INCENDIOS,
  socorrismo: ICONOS_SOCORRISMO,
  transmisiones: ICONOS_TRANSMISIONES,
  vehiculos: ICONOS_VEHICULOS,
  general: ICONOS_GENERAL,
  renderIcon: RenderIcon,
}
