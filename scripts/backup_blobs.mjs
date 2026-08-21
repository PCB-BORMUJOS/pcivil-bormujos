import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Descarga los ficheros que la aplicación NO guarda en la base de datos, sino en
// Vercel Blob (fotos de partes, manuales, fotos de hidrantes...). En la BD solo
// queda la URL, así que sin esto una restauración deja enlaces rotos.
//
// Funciona como espejo incremental: lo ya descargado no se vuelve a bajar, de
// modo que la copia diaria solo trae lo nuevo.
//
// Uso:  node scripts/backup_blobs.mjs <directorio-espejo>

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

const dir = process.argv[2] || 'backups/blob-mirror'
mkdirSync(dir, { recursive: true })

const prisma = new PrismaClient()
const limpia = s => String(s).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80)

// Campos del esquema que guardan URLs de ficheros externos. Añadir aquí si en el
// futuro aparecen más: el resto del script se adapta solo.
async function recopilar() {
  const items = []
  const push = (origen, ref, url) => {
    if (!url || typeof url !== 'string') return
    if (!/^https?:\/\//.test(url)) return   // base64 y rutas relativas no son ficheros externos
    items.push({ origen, ref: String(ref || 'sin-ref'), url })
  }
  const seguro = async (fn) => { try { return await fn() } catch { return [] } }

  for (const p of await seguro(() => prisma.partePSI.findMany({ select: { numeroParte: true, fotosUrls: true, pdfUrl: true } }))) {
    if (Array.isArray(p.fotosUrls)) p.fotosUrls.forEach((u, i) => push('partePSI', `${p.numeroParte}-foto${i + 1}`, u))
    push('partePSI', `${p.numeroParte}-pdf`, p.pdfUrl)
  }
  for (const h of await seguro(() => prisma.hidrante.findMany({ select: { id: true, codigo: true, fotoUbicacion: true, fotoDetalle: true } }))) {
    push('hidrante', `${h.codigo || h.id}-ubicacion`, h.fotoUbicacion)
    push('hidrante', `${h.codigo || h.id}-detalle`, h.fotoDetalle)
  }
  for (const m of await seguro(() => prisma.manual.findMany({ select: { id: true, titulo: true, url: true } }))) {
    push('manual', m.titulo || m.id, m.url)
  }
  for (const v of await seguro(() => prisma.vehiculo.findMany({ select: { indicativo: true, fotoFrontal: true, fotoTrasera: true, fotoLateralIzq: true, fotoLateralDer: true } }))) {
    push('vehiculo', `${v.indicativo}-frontal`, v.fotoFrontal)
    push('vehiculo', `${v.indicativo}-trasera`, v.fotoTrasera)
    push('vehiculo', `${v.indicativo}-lateral-izq`, v.fotoLateralIzq)
    push('vehiculo', `${v.indicativo}-lateral-der`, v.fotoLateralDer)
  }
  for (const p of await seguro(() => prisma.peticionMaterial.findMany({ select: { id: true, urlRc: true, urlAlbaran: true, albaranes: true } }))) {
    push('peticion', `${p.id}-rc`, p.urlRc)
    push('peticion', `${p.id}-albaran`, p.urlAlbaran)
    if (Array.isArray(p.albaranes)) p.albaranes.forEach((a, i) => push('peticion', `${p.id}-albaran${i + 1}`, a?.url))
  }
  // Documentos adjuntos a los planes (PTEL, PA y PAE)
  for (const d of await seguro(() => prisma.planDocumento.findMany({ select: { id: true, titulo: true, url: true } }))) {
    push('plan-doc', d.titulo || d.id, d.url)
  }
  // Partes PRF: fotosUrls es un objeto con varias listas (reportaje, zonaNoble,
  // zonaCocina, extintorAbc, extintorCo2...), así que se recorren todas.
  for (const r of await seguro(() => prisma.partePRF.findMany({ select: { id: true, numeroParte: true, fotosUrls: true, pdfUrl: true } }))) {
    const ref = r.numeroParte || r.id
    const grupos = (r.fotosUrls && typeof r.fotosUrls === 'object' && !Array.isArray(r.fotosUrls)) ? r.fotosUrls : {}
    for (const [bloque, lista] of Object.entries(grupos)) {
      if (Array.isArray(lista)) lista.forEach((u, i) => push('partePRF', `${ref}-${bloque}${i + 1}`, u))
    }
    push('partePRF', `${ref}-pdf`, r.pdfUrl)
  }
  // Iconos de mapa subidos por el servicio. Los predefinidos viven en /public y
  // ya viajan dentro del paquete de código, así que solo cuentan los de Blob.
  for (const ic of await seguro(() => prisma.iconoMapa.findMany({ select: { id: true, nombre: true, url: true } }))) {
    push('icono-mapa', ic.nombre || ic.id, ic.url)
  }
  // Capas cartográficas propias, guardadas como GeoJSON en Blob.
  for (const c of await seguro(() => prisma.capaCartografica.findMany({ select: { id: true, nombre: true, geojsonUrl: true } }))) {
    push('capa', c.nombre || c.id, c.geojsonUrl)
  }
  return items
}

const items = await recopilar()

// Índice previo: permite saltarse lo ya descargado.
const indicePath = join(dir, '_INDICE.csv')
const yaDescargado = new Map()   // url -> nombre de fichero
if (existsSync(indicePath)) {
  for (const linea of readFileSync(indicePath, 'utf8').split('\n').slice(1)) {
    const campos = linea.match(/"((?:[^"]|"")*)"/g)
    if (!campos || campos.length < 5) continue
    const val = i => campos[i].slice(1, -1).replace(/""/g, '"')
    const fichero = val(2), url = val(4)
    if (!fichero.startsWith('FALLO') && existsSync(join(dir, fichero))) yaDescargado.set(url, fichero)
  }
}

const manifiesto = [['origen', 'referencia', 'fichero_local', 'bytes', 'url']]
let nuevos = 0, reutilizados = 0, fallos = 0, bytes = 0

for (const [i, it] of items.entries()) {
  const previo = yaDescargado.get(it.url)
  if (previo) {
    manifiesto.push([it.origen, it.ref, previo, statSync(join(dir, previo)).size, it.url])
    reutilizados++
    continue
  }
  const ext = (it.url.match(/\.([A-Za-z0-9]{2,5})(?:\?|$)/) || [, 'bin'])[1]
  const nombre = `${String(i + 1).padStart(4, '0')}_${it.origen}_${limpia(it.ref)}.${ext}`
  try {
    const r = await fetch(it.url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length === 0) throw new Error('fichero vacío')
    writeFileSync(join(dir, nombre), buf)
    manifiesto.push([it.origen, it.ref, nombre, buf.length, it.url])
    nuevos++; bytes += buf.length
  } catch (e) {
    manifiesto.push([it.origen, it.ref, `FALLO: ${e.message}`, 0, it.url])
    fallos++
    console.log(`  FALLO ${it.origen} ${it.ref}: ${e.message}`)
  }
}

writeFileSync(indicePath, manifiesto.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'))

// Huérfanos: ficheros del espejo que ya no referencia ninguna fila. No se borran
// (puede ser justo lo que haya que recuperar), solo se avisa.
const referenciados = new Set(manifiesto.slice(1).map(f => f[2]))
const huerfanos = readdirSync(dir).filter(f => f !== '_INDICE.csv' && !referenciados.has(f))

console.log(`  Ficheros externos: ${items.length} referenciados · ${nuevos} nuevos · ${reutilizados} ya en el espejo · ${fallos} fallidos`)
if (nuevos) console.log(`  Descargados ${(bytes / 1048576).toFixed(1)} MB`)
if (huerfanos.length) console.log(`  ${huerfanos.length} fichero(s) en el espejo ya sin referencia en la BD (se conservan)`)
if (fallos) process.exitCode = 1

await prisma.$disconnect()
