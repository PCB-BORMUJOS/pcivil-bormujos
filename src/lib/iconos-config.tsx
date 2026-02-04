// ============================================================================
// CONFIGURACIÓN CENTRALIZADA DE ICONOS - PROTECCIÓN CIVIL BORMUJOS
// ============================================================================
// Este archivo contiene TODOS los iconos del sistema mapeados de forma centralizada
// para mantener consistencia visual en toda la aplicación.

import React from 'react'

// Lucide Icons (ya instalado)
import { 
  Package, 
  ShoppingCart, 
  RefreshCw, 
  Truck,
  Car
} from 'lucide-react'

// React Icons
import { PiFireExtinguisherLight } from 'react-icons/pi'
import { FaFireExtinguisher, FaMedkit } from 'react-icons/fa'
import { GiWalkieTalkie } from 'react-icons/gi'

// Material UI Icons
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import StraightenIcon from '@mui/icons-material/Straighten'
import DetectorSmokeIcon from '@mui/icons-material/Sensors' // Aproximado, puede que necesites otro
import NestProtectIcon from '@mui/icons-material/Shield' // Aproximado
import FireHydrantIcon from '@mui/icons-material/LocalFireDepartment' // Aproximado
import SirenIcon from '@mui/icons-material/NotificationsActive' // Aproximado

// Componentes personalizados para SVG e imágenes
const BIEIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/bie-icon.png" alt="BIE" style={{ width: size, height: size }} className={className} />
)

const RepetidorIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/repetidor-icon.svg" alt="Repetidor" style={{ width: size, height: size }} className={className} />
)

const EmergenciaIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/emergencia-icon.svg" alt="Emergencia" style={{ width: size, height: size }} className={className} />
)

const DEAIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img src="/images/dea-icon.svg" alt="DEA" style={{ width: size, height: size }} className={className} />
)

const PulsadorIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
    nest_protect
  </span>
)

const DetectorIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
    detector
  </span>
)

// ============================================================================
// ICONOS POR ÁREA
// ============================================================================

export const ICONOS_INCENDIOS = {
  extintor_polvo: PiFireExtinguisherLight,
  extintor_co2: FaFireExtinguisher,
  bie: BIEIcon,
  detector_humo: DetectorIcon,
  detector_alarma: DetectorIcon, // Mismo que humo por ahora
  pulsador: PulsadorIcon,
  hidrante: FireHydrantIcon,
  sirena: SirenIcon,
  señalizacion: EmergenciaIcon,
}

export const ICONOS_SOCORRISMO = {
  dea: DEAIcon,
  botiquin: FaMedkit,
}

export const ICONOS_TRANSMISIONES = {
  walkie: GiWalkieTalkie,
  emisora_portatil: GiWalkieTalkie,
  repetidor: RepetidorIcon,
}

export const ICONOS_VEHICULOS = {
  furgoneta: LocalShippingIcon,
  turismo: DirectionsCarIcon,
  pickup: LocalShippingIcon,
  remolque: StraightenIcon,
  generico: Truck,
}

export const ICONOS_GENERAL = {
  inventario: Package,
  peticiones: ShoppingCart,
  movimientos: RefreshCw,
}

// ============================================================================
// MAPEO DE TIPOS DE EQUIPO ECI (INCENDIOS)
// ============================================================================

// Función para obtener el icono según tipo y subtipo
export const getIconoEquipoECI = (tipo: string, subtipo?: string | null): any => {
  if (tipo === 'extintor') {
    // Diferenciar extintores por subtipo
    if (subtipo?.toLowerCase().includes('co2')) {
      return FaFireExtinguisher; // Extintor CO2 (sólido)
    }
    return PiFireExtinguisherLight; // Extintor ABC (outline)
  }
  
  // Resto de equipos
  const iconMap: Record<string, any> = {
    bie: BIEIcon,
    detector: DetectorIcon,
    pulsador: PulsadorIcon,
    alarma: SirenIcon,
    señalizacion: EmergenciaIcon,
  };
  
  return iconMap[tipo] || Package;
};

// Mantener compatibilidad con código antiguo
export const TIPOS_EQUIPO_ECI: Record<string, any> = {
  extintor: PiFireExtinguisherLight,
  bie: BIEIcon,
  detector: DetectorIcon,
  pulsador: PulsadorIcon,
  alarma: SirenIcon,
  señalizacion: EmergenciaIcon,
};

// ============================================================================
// MAPEO DE TIPOS DE EQUIPO RADIO (TRANSMISIONES)
// ============================================================================

export const TIPOS_EQUIPO_RADIO: Record<string, any> = {
  portatil: GiWalkieTalkie,
  movil: GiWalkieTalkie,
  base: RepetidorIcon,
  repetidor: RepetidorIcon,
}

// ============================================================================
// MAPEO DE TIPOS DE VEHÍCULOS
// ============================================================================

export const TIPOS_VEHICULOS: Record<string, any> = {
  furgoneta: LocalShippingIcon,
  turismo: DirectionsCarIcon,
  pickup: LocalShippingIcon,
  remolque: StraightenIcon,
}

// ============================================================================
// FUNCIÓN HELPER PARA RENDERIZAR ICONOS
// ============================================================================

interface IconProps {
  tipo: string
  categoria: 'incendios' | 'socorrismo' | 'transmisiones' | 'vehiculos'
  size?: number
  className?: string
}

export const RenderIcon = ({ tipo, categoria, size = 24, className = '' }: IconProps) => {
  let IconComponent

  switch (categoria) {
    case 'incendios':
      IconComponent = TIPOS_EQUIPO_ECI[tipo]
      break
    case 'transmisiones':
      IconComponent = TIPOS_EQUIPO_RADIO[tipo]
      break
    case 'vehiculos':
      IconComponent = TIPOS_VEHICULOS[tipo]
      break
    default:
      IconComponent = Package
  }

  if (!IconComponent) IconComponent = Package

  // Si es componente de imagen personalizado
  if (IconComponent === BIEIcon || IconComponent === RepetidorIcon || IconComponent === EmergenciaIcon || IconComponent === DEAIcon || IconComponent === PulsadorIcon || IconComponent === DetectorIcon) {
    return <IconComponent size={size} className={className} />
  }

  // Si es icono de MUI
  if (IconComponent.toString().includes('MuiSvgIcon')) {
    return <IconComponent sx={{ fontSize: size }} className={className} />
  }

  // Si es icono de React Icons o Lucide
  return <IconComponent size={size} className={className} />
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  incendios: ICONOS_INCENDIOS,
  socorrismo: ICONOS_SOCORRISMO,
  transmisiones: ICONOS_TRANSMISIONES,
  vehiculos: ICONOS_VEHICULOS,
  general: ICONOS_GENERAL,
  renderIcon: RenderIcon,
}
