import {
  Flame, Shield, Bell, AlertTriangle, Package, Navigation, Wind, DoorOpen
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const TIPOS_EQUIPO_ECI: string[] = [
  'extintor', 'extintor_co2', 'bie', 'detector', 'pulsador', 'alarma', 'señalizacion', 'salida_emergencia'
];

const ICONOS_MAP: Record<string, LucideIcon> = {
  extintor:          Flame,
  extintor_co2:      Wind,
  bie:               Shield,
  detector:          AlertTriangle,
  pulsador:          Bell,
  alarma:            Bell,
  señalizacion:      Navigation,
  salida_emergencia: DoorOpen,
};

const COLORES_MAP: Record<string, string> = {
  extintor:          'text-red-500',
  extintor_co2:      'text-slate-500',
  bie:               'text-blue-500',
  detector:          'text-yellow-500',
  pulsador:          'text-orange-500',
  alarma:            'text-purple-500',
  señalizacion:      'text-green-500',
  salida_emergencia: 'text-emerald-500',
};

export function getIconoEquipoECI(tipo: string, subtipo?: string | null): LucideIcon {
  return ICONOS_MAP[tipo] ?? Package;
}

export function getColorEquipoECI(tipo: string): string {
  return COLORES_MAP[tipo] ?? 'text-slate-400';
}
