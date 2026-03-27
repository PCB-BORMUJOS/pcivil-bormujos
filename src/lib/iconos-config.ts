import {
  Flame, Shield, Bell, AlertTriangle, Package, Navigation
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const TIPOS_EQUIPO_ECI: string[] = [
  'extintor', 'bie', 'detector', 'pulsador', 'alarma', 'señalizacion'
];

const ICONOS_MAP: Record<string, LucideIcon> = {
  extintor:     Flame,
  bie:          Shield,
  detector:     AlertTriangle,
  pulsador:     Bell,
  alarma:       Bell,
  señalizacion: Navigation,
};

const COLORES_MAP: Record<string, string> = {
  extintor:     'text-red-500',
  bie:          'text-blue-500',
  detector:     'text-yellow-500',
  pulsador:     'text-orange-500',
  alarma:       'text-purple-500',
  señalizacion: 'text-green-500',
};

export function getIconoEquipoECI(tipo: string, subtipo?: string | null): LucideIcon {
  return ICONOS_MAP[tipo] ?? Package;
}

export function getColorEquipoECI(tipo: string): string {
  return COLORES_MAP[tipo] ?? 'text-slate-400';
}
