// Informe de liquidación de dietas con el modelo corporativo del servicio
// (mismo formato que el informe de combustible): cabecera azul con los dos
// logotipos, pie azul del servicio, tabla de datos y firma centrada.

import {
  cargarImagen, drawHeaderCorporativo, drawFooterCorporativo,
  PAGE_W as W, PAGE_H as H,
} from '@/lib/pdf-corporativo'

const MARGEN = 14
const TOPE = H - 18 - 8
const ANCHO = W - MARGEN * 2

const AZUL: [number, number, number] = [0, 51, 102]

const txt = (s: any) => String(s ?? '')
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I')
  .replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[’‘]/g, "'")
  .replace(/€/g, 'EUR')

export interface ColumnaInforme { label: string; align?: 'left' | 'center' | 'right'; width: number }

export interface InformeDietasOpts {
  titulo: string
  periodoTexto: string          // "junio de 2026"
  intro?: string[]
  columnas: ColumnaInforme[]
  filas: string[][]
  totales?: string[]            // fila de totales (misma longitud que columnas)
  resumenImporte: string        // total grande del recuadro final
  resumenMeta: string           // texto bajo el total
  firmanteNombre: string
  firmanteCargo: string
  nombreArchivo: string
  acento?: [number, number, number]  // color de banda de tabla y recuadro
}

export async function generarInformeDietasPDF(o: InformeDietasOpts) {
  const acento = o.acento ?? AZUL
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  const tituloDoc = o.titulo

  const aytoLogo = await cargarImagen('/images/logo-ayuntamiento.png')
  const pcLogo = await cargarImagen('/images/logo-pc-blanco.png')

  const { jsPDF } = await import('jspdf')
  const doc = new (jsPDF as any)({ format: 'a4', unit: 'mm', compress: true })
  drawHeaderCorporativo(doc, { titulo: tituloDoc, aytoLogo, pcLogo })
  drawFooterCorporativo(doc)

  let y = 37
  const nuevaPagina = () => {
    doc.addPage()
    drawHeaderCorporativo(doc, { titulo: tituloDoc, aytoLogo, pcLogo })
    drawFooterCorporativo(doc)
    doc.setTextColor(0, 0, 0)
    y = 35
  }
  const asegurar = (alto: number) => { if (y + alto > TOPE) nuevaPagina() }

  // ── Título y periodo ────────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(txt(o.titulo), MARGEN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(85, 85, 85)
  doc.text(txt(`Periodo: ${o.periodoTexto}   ·   Generado el ${hoy.toLocaleDateString('es-ES')}`), MARGEN, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGEN, y, W - MARGEN, y)
  y += 7

  // ── Introducción opcional ───────────────────────────────────────────────────
  if (o.intro?.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    o.intro.forEach(p => {
      const lineas = doc.splitTextToSize(txt(p), ANCHO)
      asegurar(lineas.length * 5.5 + 3)
      doc.text(txt(p), MARGEN, y, { maxWidth: ANCHO, align: 'justify' })
      y += lineas.length * 5.5 + 3
    })
    y += 2
  }

  // ── Cabecera de la tabla ────────────────────────────────────────────────────
  const xInicio = (i: number) => MARGEN + o.columnas.slice(0, i).reduce((s, c) => s + c.width, 0)
  const posX = (i: number) => {
    const c = o.columnas[i]
    const x0 = xInicio(i)
    if (c.align === 'right') return x0 + c.width - 2
    if (c.align === 'center') return x0 + c.width / 2
    return x0 + 2
  }
  const alignOf = (i: number) => o.columnas[i].align ?? 'left'

  const cabeceraTabla = () => {
    asegurar(9)
    doc.setFillColor(...acento)
    doc.rect(MARGEN, y, ANCHO, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    o.columnas.forEach((c, i) => {
      doc.text(txt(c.label).toUpperCase(), posX(i), y + 5.3, { align: alignOf(i) })
    })
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  cabeceraTabla()

  // ── Filas ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  o.filas.forEach((fila, idx) => {
    asegurar(7)
    if (y + 7 > TOPE) { cabeceraTabla() }
    if (idx % 2 === 1) { doc.setFillColor(245, 245, 245); doc.rect(MARGEN, y, ANCHO, 7, 'F') }
    fila.forEach((val, i) => {
      const lineas = doc.splitTextToSize(txt(val), o.columnas[i].width - 3)
      doc.text(lineas[0] || '', posX(i), y + 4.8, { align: alignOf(i) })
    })
    y += 7
  })

  // ── Fila de totales ─────────────────────────────────────────────────────────
  if (o.totales?.length) {
    asegurar(8)
    doc.setFillColor(220, 220, 220)
    doc.rect(MARGEN, y, ANCHO, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    o.totales.forEach((val, i) => {
      if (!val) return
      doc.text(txt(val), posX(i), y + 5.3, { align: alignOf(i) })
    })
    y += 8
  }
  y += 8

  // ── Recuadro resumen ────────────────────────────────────────────────────────
  asegurar(20)
  doc.setFillColor(...acento)
  doc.rect(MARGEN, y, ANCHO, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(txt(o.resumenImporte), MARGEN + 4, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(txt(o.resumenMeta), MARGEN + 4, y + 14)
  doc.text('Proteccion Civil Bormujos', W - MARGEN - 4, y + 14, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  y += 26

  // ── Firma ───────────────────────────────────────────────────────────────────
  asegurar(30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  const cx = W / 2
  doc.text(txt(`En Bormujos a ${fechaHoy}`), cx, y, { align: 'center' })
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.text(txt(o.firmanteNombre), cx, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(txt(o.firmanteCargo), cx, y + 5, { align: 'center' })
  doc.text('Ayuntamiento de Bormujos', cx, y + 10, { align: 'center' })

  doc.save(o.nombreArchivo)
}
