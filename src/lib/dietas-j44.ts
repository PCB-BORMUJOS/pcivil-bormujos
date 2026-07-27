// Baremo de dietas exclusivo del Jefe de Servicio (indicativo J-44).
// Importes por franja horaria distintos del baremo general del voluntariado.
// Solo se aplican a J-44 y sus datos únicamente son visibles para el propio
// interesado con perfil de superadmin.

export const INDICATIVO_JEFE_SERVICIO = 'J-44'

// Tramos oficiales del Jefe de Servicio.
export const BAREMO_J44_TRAMOS = [
  { minHours: 4, amount: 36.50 },
  { minHours: 8, amount: 59.60 },
  { minHours: 12, amount: 79.50 },
]

/** Importe de dieta que corresponde a J-44 según las horas del día. */
export function importeDietaJ44(horasDia: number): number {
  const tramo = [...BAREMO_J44_TRAMOS]
    .sort((a, b) => b.minHours - a.minHours)
    .find(t => horasDia >= t.minHours)
  return tramo ? tramo.amount : 0
}

/** Normaliza el baremo J-44 desde la configuración, con respaldo a los tramos oficiales. */
export function tramosJ44Desde(valor: any): { minHours: number; amount: number }[] {
  const t = valor?.tramos
  if (Array.isArray(t) && t.length) {
    return t
      .map((x: any) => ({ minHours: Number(x.minHours ?? x.horasMin ?? 0), amount: Number(x.amount ?? x.importe ?? 0) }))
      .filter(x => x.amount > 0)
  }
  return BAREMO_J44_TRAMOS
}
