import { format, parseISO, isValid } from "date-fns"

/**
 * Devuelve la fecha de HOY en España como string YYYY-MM-DD.
 * Usar SIEMPRE esta función para comparaciones de "hoy" — nunca new Date() directo.
 */
export function getTodaySpain(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" })
}

/**
 * Devuelve el objeto Date de hoy ajustado a medianoche en España.
 * Útil para comparaciones de mes/año.
 */
export function getTodaySpainDate(): Date {
  const str = getTodaySpain() // YYYY-MM-DD
  return parseISO(str)
}

/**
 * Comprueba si un día (número 1-31), mes (0-indexed) y año dados son HOY en España.
 */
export function isToday(day: number, month: number, year: number): boolean {
  const today = getTodaySpain() // "2026-04-27"
  const [ty, tm, td] = today.split("-").map(Number)
  return td === day && tm - 1 === month && ty === year
}

/**
 * Devuelve { day, month (0-indexed), year } de hoy en España.
 */
export function getTodayParts(): { day: number; month: number; year: number } {
  const today = getTodaySpain()
  const [y, m, d] = today.split("-").map(Number)
  return { day: d, month: m - 1, year: y }
}
