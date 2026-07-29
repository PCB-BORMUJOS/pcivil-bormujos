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

// ── Liquidación específica del Jefe de Servicio (J-44) ────────────────────────
export interface FilaOrdinariaJ44 { fecha: string; turno: string; horas: number; importe: number; total: number }
export interface FilaExtraJ44 { fecha: string; motivo: string; horas: number; importe: number; total: number }
export interface LiquidacionJ44Opts {
  periodoTexto: string
  rangoTexto: string            // "01-06-2026 al 30-06-2026"
  nombre: string
  ordinarios: FilaOrdinariaJ44[]
  extras: FilaExtraJ44[]
  totalOrdinarios: number
  totalExtras: number
  totalGeneral: number
  firmanteNombre: string
  firmanteCargo: string
  nombreArchivo: string
}

const AZUL_CORP: [number, number, number] = [40, 54, 102] // #283666

export async function generarLiquidacionJ44PDF(o: LiquidacionJ44Opts) {
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  const tituloDoc = 'Liquidacion Jefe de Servicio'

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
  const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'

  // ── Título descriptivo ──────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  const tituloTexto = 'Liquidacion de las dietas correspondientes al Jefe del Servicio de Proteccion Civil del Ayuntamiento de Bormujos'
  const tituloLineas = doc.splitTextToSize(txt(tituloTexto), ANCHO)
  doc.text(tituloLineas, MARGEN, y)
  y += tituloLineas.length * 6 + 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(85, 85, 85)
  doc.text(txt(`${o.nombre} - indicativo J-44`), MARGEN, y)
  y += 5
  doc.text(txt(`Periodo: ${o.periodoTexto}  (del ${o.rangoTexto})   ·   Generado el ${hoy.toLocaleDateString('es-ES')}`), MARGEN, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGEN, y, W - MARGEN, y)
  y += 8

  // ── Utilidad de tabla ───────────────────────────────────────────────────────
  interface Col { label: string; align?: 'left' | 'center' | 'right'; width: number }
  const dibujarTabla = (rotulo: string, cols: Col[], filas: string[][], totales: string[]) => {
    const xIni = (i: number) => MARGEN + cols.slice(0, i).reduce((s, c) => s + c.width, 0)
    const px = (i: number) => {
      const c = cols[i]; const x0 = xIni(i)
      return c.align === 'right' ? x0 + c.width - 2 : c.align === 'center' ? x0 + c.width / 2 : x0 + 2
    }
    const al = (i: number) => cols[i].align ?? 'left'

    asegurar(14)
    // Rótulo de sección
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AZUL_CORP)
    doc.text(txt(rotulo), MARGEN, y)
    y += 3

    const cabecera = () => {
      asegurar(9)
      doc.setFillColor(...AZUL_CORP)
      doc.rect(MARGEN, y, ANCHO, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      cols.forEach((c, i) => doc.text(txt(c.label).toUpperCase(), px(i), y + 5.3, { align: al(i) }))
      doc.setTextColor(0, 0, 0)
      y += 8
    }
    cabecera()

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (filas.length === 0) {
      doc.setFillColor(248, 248, 248); doc.rect(MARGEN, y, ANCHO, 7, 'F')
      doc.setTextColor(120, 120, 120)
      doc.text('Sin registros', MARGEN + ANCHO / 2, y + 4.8, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      y += 7
    }
    filas.forEach((fila, idx) => {
      if (y + 7 > TOPE) { nuevaPagina(); cabecera(); doc.setFont('helvetica', 'normal'); doc.setFontSize(9) }
      if (idx % 2 === 1) { doc.setFillColor(244, 246, 250); doc.rect(MARGEN, y, ANCHO, 7, 'F') }
      fila.forEach((val, i) => {
        const linea = doc.splitTextToSize(txt(val), cols[i].width - 3)[0] || ''
        doc.text(linea, px(i), y + 4.8, { align: al(i) })
      })
      y += 7
    })

    // Subtotal
    asegurar(8)
    doc.setFillColor(224, 230, 240)
    doc.rect(MARGEN, y, ANCHO, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    totales.forEach((val, i) => { if (val) doc.text(txt(val), px(i), y + 5.3, { align: al(i) }) })
    y += 8 + 6
  }

  // ── Sección 1: turnos ordinarios ────────────────────────────────────────────
  dibujarTabla(
    'Turnos ordinarios entre semana (mas de 4 horas)',
    [
      { label: 'Fecha', align: 'left', width: 34 },
      { label: 'Turno', align: 'left', width: 44 },
      { label: 'Horas', align: 'center', width: 28 },
      { label: 'Importe dieta', align: 'right', width: 38 },
      { label: 'Total', align: 'right', width: 38 },
    ],
    o.ordinarios.map(d => [
      d.fecha,
      d.turno.charAt(0).toUpperCase() + d.turno.slice(1),
      `${d.horas} h`,
      eur(d.importe),
      eur(d.total),
    ]),
    ['Subtotal ordinarios', '', String(o.ordinarios.length) + ' turnos', '', eur(o.totalOrdinarios)],
  )

  // ── Sección 2: servicios extraordinarios ────────────────────────────────────
  dibujarTabla(
    'Servicios extraordinarios (fin de semana y jornadas de mas de 8h / 12h)',
    [
      { label: 'Fecha', align: 'left', width: 26 },
      { label: 'Motivo', align: 'left', width: 66 },
      { label: 'Horas', align: 'center', width: 22 },
      { label: 'Importe dieta', align: 'right', width: 34 },
      { label: 'Total', align: 'right', width: 34 },
    ],
    o.extras.map(d => [
      d.fecha,
      d.motivo || '-',
      `${d.horas} h`,
      eur(d.importe),
      eur(d.total),
    ]),
    ['Subtotal extraordinarios', '', String(o.extras.length) + ' serv.', '', eur(o.totalExtras)],
  )

  // ── Total general ───────────────────────────────────────────────────────────
  asegurar(20)
  doc.setFillColor(...AZUL_CORP)
  doc.rect(MARGEN, y, ANCHO, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(eur(o.totalGeneral), MARGEN + 4, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(txt(`Total de la liquidacion · ${o.ordinarios.length} ordinario(s) + ${o.extras.length} extraordinario(s)`), MARGEN + 4, y + 14)
  doc.text('Jefe de Servicio J-44', W - MARGEN - 4, y + 14, { align: 'right' })
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
