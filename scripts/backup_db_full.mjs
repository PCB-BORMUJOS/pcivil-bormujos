import { PrismaClient, Prisma } from '@prisma/client'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'

// Exporta TODA la base de datos a JSON, un fichero por modelo. La lista de
// modelos se obtiene del propio esquema Prisma (DMMF), así que NADA queda fuera
// aunque se añadan modelos nuevos en el futuro.

// launchd arranca sin el entorno del shell: cargamos DATABASE_URL de .env/.env.local.
function loadEnv() {
  if (process.env.DATABASE_URL) return
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/)
      if (m) { process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, ''); return }
    }
  }
}
loadEnv()

const dir = process.argv[2] || `backups/db-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
mkdirSync(dir, { recursive: true })

const prisma = new PrismaClient()
const replacer = (_k, v) => (typeof v === 'bigint' ? v.toString() : v)

// Nombre del delegate en el cliente = modelo con la primera letra en minúscula.
const modelos = Prisma.dmmf.datamodel.models.map(m => m.name[0].toLowerCase() + m.name.slice(1))

let total = 0
const resumen = {}
for (const modelo of modelos) {
  try {
    const datos = await prisma[modelo].findMany()
    writeFileSync(`${dir}/${modelo}.json`, JSON.stringify(datos, replacer, 2))
    resumen[modelo] = datos.length
    total += datos.length
  } catch (e) {
    resumen[modelo] = `ERROR: ${e.message}`
  }
}

writeFileSync(`${dir}/_resumen.json`, JSON.stringify({
  timestamp: new Date().toISOString(), modelos: modelos.length, totalRegistros: total, resumen,
}, replacer, 2))

console.log(`  BD exportada: ${modelos.length} modelos, ${total} registros -> ${dir}`)
await prisma.$disconnect()
