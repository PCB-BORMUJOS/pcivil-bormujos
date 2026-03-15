import { prisma } from '@/lib/db'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 30 * 60 * 1000

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; minutosRestantes?: number }> {
  const now = new Date()
  const entry = await prisma.rateLimitEntry.findUnique({ where: { ip } })

  if (entry?.bloqueadoHasta && entry.bloqueadoHasta > now) {
    const minutosRestantes = Math.ceil((entry.bloqueadoHasta.getTime() - now.getTime()) / 60000)
    return { allowed: false, minutosRestantes }
  }

  if (!entry || now.getTime() - entry.primerIntento.getTime() > WINDOW_MS) {
    return { allowed: true }
  }

  if (entry.intentos >= MAX_ATTEMPTS) {
    await prisma.rateLimitEntry.update({
      where: { ip },
      data: { bloqueadoHasta: new Date(now.getTime() + BLOCK_MS) }
    })
    return { allowed: false, minutosRestantes: 30 }
  }

  return { allowed: true }
}

export async function registerFailedAttempt(ip: string): Promise<void> {
  const now = new Date()
  const entry = await prisma.rateLimitEntry.findUnique({ where: { ip } })

  if (!entry || now.getTime() - entry.primerIntento.getTime() > WINDOW_MS) {
    await prisma.rateLimitEntry.upsert({
      where: { ip },
      create: { ip, intentos: 1, primerIntento: now },
      update: { intentos: 1, primerIntento: now, bloqueadoHasta: null }
    })
  } else {
    await prisma.rateLimitEntry.update({
      where: { ip },
      data: { intentos: { increment: 1 } }
    })
  }
}

export async function resetAttempts(ip: string): Promise<void> {
  await prisma.rateLimitEntry.deleteMany({ where: { ip } })
}
