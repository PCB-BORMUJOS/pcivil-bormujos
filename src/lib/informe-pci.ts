// Informe de mantenimientos correctivos de protección contra incendios.
// Mismo modelo corporativo que el informe de combustible: cabecera azul con
// los dos logotipos, pie azul del servicio, destinatario A/A y copia C/C a la
// derecha, referencia, asunto, cuerpo justificado, tabla y firma centrada.

import {
  cargarImagen, drawHeaderCorporativo, drawFooterCorporativo,
  PAGE_W as W, PAGE_H as H,
} from '@/lib/pdf-corporativo'

const MARGEN = 14
const TOPE_INFERIOR = H - 18 - 8 // pie corporativo + holgura

export interface ItemInforme {
  descripcion: string
  campanas?: string[]
  estado?: string
}

export interface ActuacionInforme {
  id: string
  edificioId?: string
  edificio: string
  codigoCliente?: string | null
  descripcion: string
  prioridad: string
  importe?: number | null
  presupuesto?: string | null
  recurrente: boolean
  vecesDetectada?: number
  items?: ItemInforme[]
}

export interface DatosInforme {
  destinatarioNombre: string
  destinatarioCargo: string
  copiaNombre: string
  copiaCargo: string
  firmanteNombre: string
  firmanteCargo: string
  asunto: string
  introduccion: string
  empresa: string
  actuaciones: ActuacionInforme[]
}

/** jsPDF con las fuentes estándar no admite acentos en todos los casos. */
const txt = (s: any) => String(s ?? '')
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I')
  .replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[’‘]/g, "'")
  .replace(/€/g, 'EUR')

const eur = (n?: number | null) =>
  (n === null || n === undefined)
    ? '-'
    : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ' ') + ' EUR'

/** Referencia del documento, con el mismo criterio que el resto de informes. */
export function referenciaInforme(fecha = new Date()): string {
  const d = fecha.getDate().toString().padStart(2, '0')
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const a = fecha.getFullYear().toString()
  return `${a}${m}${d}`
}

export async function generarInformePCI(datos: DatosInforme): Promise<{ referencia: string; total: number }> {
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  const referencia = referenciaInforme(hoy)
  const total = datos.actuaciones.reduce((s, a) => s + (a.importe || 0), 0)
  const tituloDoc = 'Informe de mantenimientos correctivos PCI'

  const aytoLogo = await cargarImagen('/images/logo-ayuntamiento.png')
  const pcLogo = await cargarImagen('/images/logo-pc-blanco.png')

  const { jsPDF } = await import('jspdf')
  const doc = new (jsPDF as any)({ format: 'a4', unit: 'mm', compress: true })

  drawHeaderCorporativo(doc, { titulo: tituloDoc, aytoLogo, pcLogo })
  drawFooterCorporativo(doc)

  let y = 37
  const rightX = W - MARGEN
  const anchoTexto = W - MARGEN * 2

  // Salto de página conservando cabecera y pie en todas las hojas.
  const nuevaPagina = () => {
    doc.addPage()
    drawHeaderCorporativo(doc, { titulo: tituloDoc, aytoLogo, pcLogo })
    drawFooterCorporativo(doc)
    doc.setTextColor(0, 0, 0)
    y = 35
  }
  const asegurar = (alto: number) => { if (y + alto > TOPE_INFERIOR) nuevaPagina() }

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)

  // ── Destinatario y copia, a la derecha ──────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.text(txt(`A/A: ${datos.destinatarioNombre}`), rightX, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(txt(datos.destinatarioCargo), rightX, y + 6, { align: 'right' })
  if (datos.copiaNombre?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.text(txt(`C/C: ${datos.copiaNombre}`), rightX, y + 14, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(txt(datos.copiaCargo), rightX, y + 20, { align: 'right' })
  }

  // ── Referencia y asunto ─────────────────────────────────────────────────────
  y = 76
  doc.setFont('helvetica', 'bold')
  doc.text(txt(`REF: ${referencia} Informe de mantenimientos correctivos PCI`), MARGEN, y)
  const lineasAsunto = doc.splitTextToSize(txt(`ASUNTO: ${datos.asunto}`), anchoTexto)
  doc.text(lineasAsunto, MARGEN, y + 8)
  y = y + 8 + lineasAsunto.length * 5.5 + 4

  doc.setDrawColor(200, 200, 200)
  doc.line(MARGEN, y, W - MARGEN, y)
  y += 8

  // ── Cuerpo ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const parrafo = (t: string) => {
    const limpio = txt(t)
    const lineas = doc.splitTextToSize(limpio, anchoTexto)
    asegurar(lineas.length * 6 + 4)
    doc.text(limpio, MARGEN, y, { maxWidth: anchoTexto, align: 'justify' })
    y += lineas.length * 6 + 4
  }

  parrafo(`Por medio del presente ${datos.firmanteNombre} en calidad de ${datos.firmanteCargo} del Ayuntamiento de Bormujos informa para que surta los efectos oportunos.`)
  datos.introduccion.split('\n').map(t => t.trim()).filter(Boolean).forEach(parrafo)
  parrafo(`De las revisiones reglamentarias de las instalaciones de proteccion contra incendios realizadas por la empresa mantenedora ${datos.empresa} se desprenden las anomalias que se relacionan a continuacion, cuya subsanacion se considera necesaria, junto al importe presupuestado por la empresa para cada una de ellas:`)

  // ── Tabla de actuaciones agrupada por edificio ──────────────────────────────
  const porEdificio: Record<string, ActuacionInforme[]> = {}
  datos.actuaciones.forEach(a => { (porEdificio[a.edificio] ||= []).push(a) })

  const COL_IMPORTE = 32
  const COL_PPTO = 26
  const anchoDesc = anchoTexto - COL_PPTO - COL_IMPORTE
  const xPpto = MARGEN + anchoDesc
  const xImporte = W - MARGEN

  const cabeceraTabla = () => {
    asegurar(10)
    doc.setFillColor(40, 54, 102)
    doc.rect(MARGEN, y, anchoTexto, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('ACTUACION', MARGEN + 2, y + 5.5)
    doc.text('PRESUPUESTO', xPpto + 2, y + 5.5)
    doc.text('IMPORTE', xImporte - 2, y + 5.5, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  y += 2
  cabeceraTabla()

  Object.entries(porEdificio).forEach(([edificio, lista]) => {
    const subtotal = lista.reduce((s, a) => s + (a.importe || 0), 0)
    const codigo = lista[0]?.codigoCliente

    // Franja del edificio
    asegurar(9)
    doc.setFillColor(232, 238, 245)
    doc.rect(MARGEN, y, anchoTexto, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(40, 54, 102)
    doc.text(txt(`${edificio}${codigo ? `  (codigo ${codigo})` : ''}`).toUpperCase(), MARGEN + 2, y + 4.8)
    doc.setTextColor(0, 0, 0)
    y += 7

    lista.forEach(a => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const lineasDesc = doc.splitTextToSize(txt(a.descripcion), anchoDesc - 4)
      const detalle: string[] = []
      if (a.recurrente) detalle.push(`Defecto recurrente: detectado en ${a.vecesDetectada || 2} revisiones consecutivas sin subsanar.`)
      ;(a.items || []).forEach(it => detalle.push(`- ${it.descripcion}${it.campanas?.length ? ` (${it.campanas.join(' / ')})` : ''}`))
      const lineasDetalle = detalle.length ? doc.splitTextToSize(txt(detalle.join('\n')), anchoDesc - 8) : []
      const alto = Math.max(lineasDesc.length * 4.6 + (lineasDetalle.length ? lineasDetalle.length * 3.8 + 1 : 0) + 3.5, 8)

      asegurar(alto + 2)
      doc.setDrawColor(224, 224, 224)
      doc.line(MARGEN, y + alto, W - MARGEN, y + alto)

      doc.text(lineasDesc, MARGEN + 2, y + 4.5)
      let yDet = y + 4.5 + lineasDesc.length * 4.6
      if (lineasDetalle.length) {
        doc.setFontSize(7.5)
        doc.setTextColor(110, 110, 110)
        doc.text(lineasDetalle, MARGEN + 6, yDet)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
      }
      doc.text(txt(a.presupuesto || '-'), xPpto + 2, y + 4.5)
      doc.setFont('helvetica', 'bold')
      doc.text(eur(a.importe), xImporte - 2, y + 4.5, { align: 'right' })
      y += alto
    })

    // Subtotal del edificio
    asegurar(9)
    doc.setFillColor(245, 245, 245)
    doc.rect(MARGEN, y, anchoTexto, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(txt(`Subtotal ${edificio}`), MARGEN + 2, y + 4.8)
    doc.text(eur(subtotal), xImporte - 2, y + 4.8, { align: 'right' })
    y += 7
  })

  // Total general
  asegurar(11)
  doc.setFillColor(40, 54, 102)
  doc.rect(MARGEN, y, anchoTexto, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL DE LAS ACTUACIONES AUTORIZADAS (IVA incluido)', MARGEN + 2, y + 6)
  doc.text(eur(total), xImporte - 2, y + 6, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  y += 15

  // ── Cierre ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const nCentros = Object.keys(porEdificio).length
  const nAct = datos.actuaciones.length
  parrafo(`El importe total asciende a ${eur(total)}, correspondiente a ${nAct} actuacion${nAct === 1 ? '' : 'es'} en ${nCentros} centro${nCentros === 1 ? '' : 's'} municipal${nCentros === 1 ? '' : 'es'}.`)
  if (datos.actuaciones.some(a => a.recurrente)) {
    parrafo('Las actuaciones senaladas como recurrentes corresponden a deficiencias detectadas en dos o mas revisiones consecutivas que, pese a haber sido presupuestadas en su momento, no han sido ejecutadas, por lo que la deficiencia persiste en la instalacion.')
  }
  parrafo('Se solicita autorizacion para que la empresa mantenedora proceda a la ejecucion de los trabajos relacionados a la mayor brevedad posible, dada su incidencia sobre la seguridad de las personas y de los edificios municipales.')

  asegurar(45)
  y += 4
  doc.text('Sin mas que anadir se firma el presente para que surta los efectos que proceda.', MARGEN, y)
  y += 12

  const cx = W / 2
  doc.text(txt(`En Bormujos a ${fechaHoy}`), cx, y, { align: 'center' })
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.text(txt(datos.firmanteNombre), cx, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(txt(datos.firmanteCargo), cx, y + 5, { align: 'center' })
  doc.text('Ayuntamiento de Bormujos', cx, y + 10, { align: 'center' })

  doc.save(`Informe-correctivos-PCI-${referencia}.pdf`)
  return { referencia, total }
}
