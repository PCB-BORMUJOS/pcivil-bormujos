/**
 * Script de corrección de datos históricos.
 * Corrige:
 *   1. turnosPracticasRealizados: recuenta guardias reales de cada persona en prácticas.
 *   2. Dietas con multi-turno: recalcula importeDia/totalDieta para días con >1 turno por voluntario.
 *
 * Uso: npx tsx prisma/fix-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Baremo por defecto (mismo que el sistema)
const BAREMO_DEFAULT = [
  { minHours: 4, amount: 29.45 },
  { minHours: 8, amount: 49.15 },
  { minHours: 12, amount: 72.37 },
]
const PRECIO_KM_DEFAULT = 0.19

function calcularBaremo(horasTotales: number, baremo: typeof BAREMO_DEFAULT): number {
  const tramo = [...baremo].reverse().find(t => horasTotales >= t.minHours)
  return tramo?.amount ?? 0
}

async function corregirContadoresPracticas() {
  console.log('\n=== CORRECCIÓN DE CONTADORES DE PRÁCTICAS ===')

  const personas = await prisma.fichaVoluntario.findMany({
    where: { turnosPracticasRealizados: { gt: 0 } },
    include: { usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } } }
  })

  let corregidos = 0
  for (const ficha of personas) {
    // Contar guardias reales del voluntario (solo las programadas, no extraordinarias)
    const totalGuardias = await prisma.guardia.count({
      where: { usuarioId: ficha.usuarioId }
    })

    // El contador correcto es el mínimo entre las guardias reales y 15
    // (si ya completó prácticas y enPracticas=false, el contador puede ser 15 o más)
    const contadorCorrecto = ficha.enPracticas
      ? Math.min(totalGuardias, 14) // aún en prácticas: máx 14 (el 15 cierra prácticas)
      : ficha.turnosPracticasRealizados // ya completadas: dejar como está

    if (ficha.enPracticas && ficha.turnosPracticasRealizados !== contadorCorrecto) {
      await prisma.fichaVoluntario.update({
        where: { usuarioId: ficha.usuarioId },
        data: { turnosPracticasRealizados: contadorCorrecto }
      })
      console.log(
        `  ✓ ${ficha.usuario.numeroVoluntario} ${ficha.usuario.nombre} ${ficha.usuario.apellidos}: ` +
        `${ficha.turnosPracticasRealizados} → ${contadorCorrecto} turnos`
      )
      corregidos++
    }
  }

  console.log(`  Total corregidos: ${corregidos}`)
}

async function corregirDietasMultiTurno() {
  console.log('\n=== CORRECCIÓN DE DIETAS MULTI-TURNO ===')

  // Obtener configuración real de baremo y km
  const [configBaremo, configKm] = await Promise.all([
    prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } }),
    prisma.configuracion.findUnique({ where: { clave: 'precio_km' } }),
  ])
  function parseConf(val: any, fallback: any): any {
    if (!val) return fallback
    if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
    return val
  }
  const baremo: typeof BAREMO_DEFAULT = parseConf(configBaremo?.valor, BAREMO_DEFAULT)
  const precioKm: number = parseConf(configKm?.valor, {})?.precio ?? PRECIO_KM_DEFAULT

  // Encontrar todos los días con más de 1 registro de dieta por voluntario
  const diasMultiturno = await prisma.$queryRaw<{ usuarioId: string; fecha: Date }[]>`
    SELECT "usuario_id" AS "usuarioId", "fecha"
    FROM "dietas"
    GROUP BY "usuario_id", "fecha"
    HAVING COUNT(*) > 1
  `

  console.log(`  Días con multi-turno encontrados: ${diasMultiturno.length}`)

  let corregidos = 0
  for (const { usuarioId, fecha } of diasMultiturno) {
    const inicioDia = new Date(fecha)
    inicioDia.setUTCHours(0, 0, 0, 0)
    const finDia = new Date(fecha)
    finDia.setUTCHours(23, 59, 59, 999)

    const dietasDia = await prisma.dieta.findMany({
      where: { usuarioId, fecha: { gte: inicioDia, lte: finDia } },
      orderBy: { createdAt: 'asc' }
    })

    if (dietasDia.length < 2) continue

    // Calcular total de horas del día
    const horasTotales = dietasDia.reduce((sum, d) => sum + Number(d.horasTrabajadas), 0)
    const importeDia = calcularBaremo(horasTotales, baremo)

    // Obtener km del voluntario (contar una sola vez)
    const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId } })
    const kmIda = Number(ficha?.kmDesplazamiento ?? 0)
    const kilometros = kmIda * 2
    const subtotalKm = Math.round(kilometros * precioKm * 100) / 100

    // Verificar si ya está correcto (evitar actualizaciones innecesarias)
    const ultimaDieta = dietasDia[dietasDia.length - 1]
    const yaEsCorrecto =
      Number(ultimaDieta.importeDia) === importeDia &&
      dietasDia.slice(0, -1).every(d => Number(d.importeDia) === 0)

    if (yaEsCorrecto) continue

    // Poner a 0 todas las dietas anteriores excepto la última
    for (let i = 0; i < dietasDia.length - 1; i++) {
      const d = dietasDia[i]
      const tieneKm = Number(d.kilometros) > 0
      await prisma.dieta.update({
        where: { id: d.id },
        data: {
          importeDia: 0,
          subtotalDietas: 0,
          // Si esta entrada tenía km, conservarlos
          kilometros: tieneKm ? d.kilometros : 0,
          subtotalKm: tieneKm ? d.subtotalKm : 0,
          totalDieta: tieneKm ? d.subtotalKm : 0,
        }
      })
    }

    // La última dieta lleva el importe completo
    // Si alguna anterior tenía km, moverlos a esta
    const anteriorConKm = dietasDia.slice(0, -1).find(d => Number(d.kilometros) > 0)
    const kmEnUltima = anteriorConKm ? 0 : kilometros
    const subtotalKmUltima = anteriorConKm ? 0 : subtotalKm
    const totalUltima = Math.round((importeDia + subtotalKmUltima) * 100) / 100

    const desglose = dietasDia.map(d => `${d.turno}:${d.horasTrabajadas}h`).join(' + ')
    await prisma.dieta.update({
      where: { id: ultimaDieta.id },
      data: {
        importeDia,
        subtotalDietas: importeDia,
        kilometros: kmEnUltima,
        subtotalKm: subtotalKmUltima,
        totalDieta: totalUltima,
        notas: `CORREGIDO: ${horasTotales}h día (${desglose}) - baremo ${importeDia}€`
      }
    })

    const usuarioInfo = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { numeroVoluntario: true, nombre: true, apellidos: true }
    })
    console.log(
      `  ✓ ${usuarioInfo?.numeroVoluntario} ${usuarioInfo?.nombre} — ` +
      `${fecha.toISOString().slice(0, 10)}: ${horasTotales}h → ${importeDia}€ baremo`
    )
    corregidos++
  }

  console.log(`  Total días corregidos: ${corregidos}`)
}

async function main() {
  console.log('Iniciando corrección de datos históricos...')
  try {
    await corregirContadoresPracticas()
    await corregirDietasMultiTurno()
    console.log('\n✅ Corrección completada.')
  } catch (e) {
    console.error('Error durante la corrección:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
