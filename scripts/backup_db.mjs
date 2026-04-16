import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'fs'

const prisma = new PrismaClient()

async function backup() {
  console.log('Iniciando backup...')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dir = `backups/backup-${timestamp}`
  mkdirSync(dir, { recursive: true })

  const modelos = [
    'usuario', 'rol', 'servicio', 'configuracion',
    'edificio', 'equipoECI', 'hidrante', 'planoMarcador',
    'dEA', 'botiquin', 'botiquinItem', 'revisionBotiquin',
    'vehiculo', 'documentoVehiculo', 'mantenimientoVehiculo',
    'equipoRadio', 'categoriaInventario', 'familiaArticulo', 'articulo',
    'peticionMaterial', 'historialPeticion', 'movimientoStock',
    'drone', 'bateriaDrone', 'pilotoDrone', 'vuelo',
    'curso', 'convocatoria', 'inscripcion', 'certificacion',
    'guardia', 'disponibilidad', 'dieta', 'fichaVoluntario',
    'evento', 'manual', 'partePSI', 'auditLog',
    'asignacionVestuario', 'notificacion', 'mensaje'
  ]

  let total = 0
  const resumen = {}

  for (const modelo of modelos) {
    try {
      const datos = await prisma[modelo].findMany()
      writeFileSync(`${dir}/${modelo}.json`, JSON.stringify(datos, null, 2))
      resumen[modelo] = datos.length
      total += datos.length
      if (datos.length > 0) console.log(`  ✅ ${modelo}: ${datos.length} registros`)
    } catch (e) {
      resumen[modelo] = `ERROR: ${e.message}`
    }
  }

  writeFileSync(`${dir}/_resumen.json`, JSON.stringify({ timestamp, total, resumen }, null, 2))
  console.log(`\nBackup completado en: ${dir}`)
  console.log(`Total registros: ${total}`)
  await prisma.$disconnect()
}

backup().catch(e => { console.error(e); process.exit(1) })
