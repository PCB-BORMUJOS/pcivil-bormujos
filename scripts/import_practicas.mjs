#!/usr/bin/env node
/**
 * IMPORTACIÓN MASIVA DE FICHAS DE PRÁCTICAS
 * ==========================================
 * Uso:
 *   1. Coloca los PDFs en  scripts/practicas/
 *   2. Añade ANTHROPIC_API_KEY a .env.local
 *   3. node scripts/import_practicas.mjs
 *
 * El script:
 *   - Envía cada PDF a Claude (lee texto + imágenes nativas del PDF)
 *   - Extrae los 19 campos del modelo Practica
 *   - Convierte páginas a PNG con pdftoppm
 *   - Sube imágenes a Vercel Blob
 *   - Inserta el registro en la BD vía Prisma
 *   - Omite prácticas que ya existan (por numero)
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, extname, dirname } from 'path'
import { execSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { put } from '@vercel/blob'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// ── Validación de entorno ──────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const BLOB_TOKEN    = process.env.BLOB_READ_WRITE_TOKEN

if (!ANTHROPIC_KEY) {
  console.error('❌ Falta ANTHROPIC_API_KEY en .env.local')
  process.exit(1)
}
if (!BLOB_TOKEN) {
  console.error('❌ Falta BLOB_READ_WRITE_TOKEN en .env.local')
  process.exit(1)
}

const anthropic  = new Anthropic({ apiKey: ANTHROPIC_KEY })
const prisma     = new PrismaClient()
const PDFTOPPM   = '/opt/homebrew/bin/pdftoppm'
const CARPETA    = join(__dirname, 'practicas')
const TMP        = join(__dirname, '_tmp_imgs')

// ── Prompt de extracción ───────────────────────────────────────────────────
const PROMPT = `Analiza esta ficha de práctica de Protección Civil.
Devuelve ÚNICAMENTE un objeto JSON válido (sin texto antes ni después, sin bloques de código):

{
  "numero": "código único (ej: P-001, FSV-01)",
  "titulo": "título completo",
  "familia": "familia o área (extinción, rescate, SVB, transmisiones, etc.)",
  "subfamilia": "subfamilia si la hay, o null",
  "objetivo": "objetivo de la práctica",
  "descripcion": "descripción general",
  "desarrollo": "procedimiento paso a paso completo",
  "conclusiones": "conclusiones o criterios de evaluación, o null",
  "personalMinimo": 2,
  "materialNecesario": "lista de material necesario, o null",
  "riesgoPractica": "bajo",
  "riesgoIntervencion": "riesgo en intervención real, o null",
  "riesgoObservaciones": "observaciones de seguridad, o null",
  "duracionEstimada": 30,
  "nivel": "basico",
  "prerequisitos": "conocimientos previos necesarios, o null",
  "grupo": "grupo de voluntarios si se especifica, o null",
  "definicion": "definición técnica si aparece, o null",
  "lugarDesarrollo": "lugar donde se realiza, o null"
}

Reglas:
- riesgoPractica: solo "bajo", "medio" o "alto"
- nivel: solo "basico", "intermedio" o "avanzado"
- personalMinimo y duracionEstimada deben ser números enteros
- Extrae el texto exacto de la ficha sin resumir
- Si un campo no aparece usa null`

// ── Funciones auxiliares ───────────────────────────────────────────────────

async function extraerCampos(filePath) {
  const pdfBase64 = readFileSync(filePath).toString('base64')

  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        },
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  let texto = msg.content[0].text.trim()
  // Eliminar posibles bloques markdown
  texto = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(texto)
}

async function extraerYSubirImagenes(filePath, numero) {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })

  const safeId  = numero.replace(/[^a-zA-Z0-9_-]/g, '_')
  const prefijo = join(TMP, safeId)

  const res = spawnSync(PDFTOPPM, ['-r', '150', '-png', filePath, prefijo], { encoding: 'utf8' })
  if (res.status !== 0) {
    console.warn(`   ⚠ pdftoppm no pudo procesar el PDF — imágenes omitidas`)
    return []
  }

  const archivos = readdirSync(TMP)
    .filter(f => f.startsWith(safeId) && f.endsWith('.png'))
    .sort()

  const urls = []
  for (const archivo of archivos) {
    const ruta   = join(TMP, archivo)
    const buffer = readFileSync(ruta)
    const blob   = await put(`practicas/${safeId}/${archivo}`, buffer, {
      access:      'public',
      contentType: 'image/png',
      token:       BLOB_TOKEN,
    })
    urls.push(blob.url)
    unlinkSync(ruta)
  }

  return urls
}

function validar(datos) {
  const RIESGOS = ['bajo', 'medio', 'alto']
  const NIVELES = ['basico', 'intermedio', 'avanzado']
  return {
    numero:              String(datos.numero  || '').trim(),
    titulo:              String(datos.titulo  || '').trim(),
    familia:             String(datos.familia || '').trim().toLowerCase(),
    subfamilia:          datos.subfamilia          ? String(datos.subfamilia).trim()          : null,
    objetivo:            String(datos.objetivo || '').trim(),
    descripcion:         datos.descripcion         ? String(datos.descripcion).trim()         : null,
    desarrollo:          datos.desarrollo           ? String(datos.desarrollo).trim()          : null,
    conclusiones:        datos.conclusiones         ? String(datos.conclusiones).trim()        : null,
    personalMinimo:      Number.isInteger(Number(datos.personalMinimo)) ? Number(datos.personalMinimo) : 2,
    materialNecesario:   datos.materialNecesario    ? String(datos.materialNecesario).trim()   : null,
    riesgoPractica:      RIESGOS.includes(datos.riesgoPractica) ? datos.riesgoPractica : 'bajo',
    riesgoIntervencion:  datos.riesgoIntervencion   ? String(datos.riesgoIntervencion).trim()  : null,
    riesgoObservaciones: datos.riesgoObservaciones  ? String(datos.riesgoObservaciones).trim() : null,
    duracionEstimada:    Number.isInteger(Number(datos.duracionEstimada)) ? Number(datos.duracionEstimada) : 30,
    nivel:               NIVELES.includes(datos.nivel) ? datos.nivel : 'basico',
    prerequisitos:       datos.prerequisitos        ? String(datos.prerequisitos).trim()       : null,
    grupo:               datos.grupo                ? String(datos.grupo).trim()               : null,
    definicion:          datos.definicion           ? String(datos.definicion).trim()          : null,
    lugarDesarrollo:     datos.lugarDesarrollo      ? String(datos.lugarDesarrollo).trim()     : null,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(CARPETA)) {
    console.error(`❌ Carpeta no encontrada: scripts/practicas/`)
    console.error(`   Créala y coloca los PDFs dentro, luego vuelve a ejecutar.`)
    process.exit(1)
  }

  const pdfs = readdirSync(CARPETA)
    .filter(f => extname(f).toLowerCase() === '.pdf')
    .sort()

  if (pdfs.length === 0) {
    console.error('❌ No hay archivos PDF en scripts/practicas/')
    process.exit(1)
  }

  console.log(`\n${'═'.repeat(52)}`)
  console.log(`  IMPORTACIÓN DE FICHAS DE PRÁCTICAS`)
  console.log(`  ${pdfs.length} archivos PDF encontrados`)
  console.log(`${'═'.repeat(52)}\n`)

  const resultado = { ok: [], omitidos: [], errores: [] }

  for (let i = 0; i < pdfs.length; i++) {
    const pdf      = pdfs[i]
    const filePath = join(CARPETA, pdf)

    console.log(`[${String(i + 1).padStart(3)}/${pdfs.length}] ${pdf}`)

    try {
      // 1. Extracción con Claude
      process.stdout.write('   🤖 Extrayendo campos con IA...')
      const datosRaw = await extraerCampos(filePath)
      const datos    = validar(datosRaw)

      if (!datos.numero || !datos.titulo || !datos.familia || !datos.objetivo) {
        throw new Error(`Campos obligatorios vacíos: numero="${datos.numero}" titulo="${datos.titulo}"`)
      }
      process.stdout.write(` ✓  ${datos.numero} — ${datos.titulo}\n`)

      // 2. Comprobar duplicado
      const existe = await prisma.practica.findUnique({ where: { numero: datos.numero } })
      if (existe) {
        console.log(`   ⏭  Ya existe en BD, omitida`)
        resultado.omitidos.push(datos.numero)
        continue
      }

      // 3. Imágenes
      process.stdout.write(`   🖼  Extrayendo imágenes...`)
      const imagenes = await extraerYSubirImagenes(filePath, datos.numero)
      process.stdout.write(` ${imagenes.length} imagen(es) subidas a Blob\n`)

      // 4. Insertar en BD
      await prisma.practica.create({
        data: {
          ...datos,
          imagenes: imagenes.length > 0 ? imagenes : undefined,
          activa:   true,
        },
      })

      console.log(`   ✅ Importada correctamente\n`)
      resultado.ok.push(datos.numero)

    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`)
      resultado.errores.push({ archivo: pdf, error: err.message })
    }

    // Pausa para no saturar la API
    await new Promise(r => setTimeout(r, 800))
  }

  // Limpieza de carpeta temporal
  if (existsSync(TMP)) {
    try { execSync(`rm -rf "${TMP}"`) } catch {}
  }

  // Resumen final
  console.log(`\n${'═'.repeat(52)}`)
  console.log(`  RESULTADO FINAL`)
  console.log(`${'═'.repeat(52)}`)
  console.log(`  ✅ Importadas:  ${resultado.ok.length}`)
  console.log(`  ⏭  Omitidas:   ${resultado.omitidos.length}  (ya existían)`)
  console.log(`  ❌ Con error:   ${resultado.errores.length}`)

  if (resultado.errores.length > 0) {
    console.log('\n  Archivos con error:')
    resultado.errores.forEach(e => console.log(`  • ${e.archivo}: ${e.error}`))
  }

  console.log(`${'═'.repeat(52)}\n`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message)
  process.exit(1)
})
