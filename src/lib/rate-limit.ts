// Rate limiter en memoria - máx 5 intentos fallidos por IP en 15 minutos
interface Attempt { count: number; firstAttempt: number; blockedUntil?: number }
const attempts = new Map<string, Attempt>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000  // 15 minutos
const BLOCK_MS = 30 * 60 * 1000   // 30 minutos de bloqueo

export function checkRateLimit(ip: string): { allowed: boolean; minutosRestantes?: number } {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const minutosRestantes = Math.ceil((entry.blockedUntil - now) / 60000)
    return { allowed: false, minutosRestantes }
  }

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS
    attempts.set(ip, entry)
    return { allowed: false, minutosRestantes: 30 }
  }

  return { allowed: true }
}

export function registerFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now })
  } else {
    entry.count++
    attempts.set(ip, entry)
  }
}

export function resetAttempts(ip: string): void {
  attempts.delete(ip)
}
