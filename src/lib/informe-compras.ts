// Propuesta de gasto e informe técnico del expediente de compra.
// Mismo modelo corporativo que el resto de informes del servicio.

import {
  cargarImagen, drawHeaderCorporativo, drawFooterCorporativo,
  PAGE_W as W, PAGE_H as H,
} from '@/lib/pdf-corporativo'

const MARGEN = 14
const TOPE = H - 18 - 8

export interface LineaPropuesta {
  descripcion: string
  cantidad: number
  unidad?: string | null
  precioUnitario?: number | null
  importeTotal?: number | null
}
export interface OfertaPropuesta {
  proveedor: string
  cif?: string | null
  importe: number
  iva: number
  importeTotal: number
  adjudicada: boolean
}
export interface DatosPropuesta {
  numero: string
  ejercicio: number
  titulo: string
  objeto?: string | null
  justificacion?: string | null
  propuestaGasto?: string | null
  informeTecnico?: string | null
  tipoCompra?: string | null
  partida?: string | null
  importeEstimado?: number | null
  importeAdjudicado?: number | null
  numeroRC?: string | null
  plazoEntrega?: string | null
  solicitadoPor?: string | null
  destinatarioNombre: string
  destinatarioCargo: string
  copiaNombre: string
  copiaCargo: string
  firmanteNombre: string
  firmanteCargo: string
  lineas: LineaPropuesta[]
  ofertas: OfertaPropuesta[]
}

const txt = (s: any) => String(s ?? '')
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I')
  .replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[’‘]/g, "'")
  .replace(/€/g, 'EUR')

const eur = (n?: number | null) => (n === null || n === undefined)
  ? '-'
  : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'

export const TIPOS_COMPRA: Record<string, string> = {
  directa_menor500: 'Compra directa (importe inferior a 500 EUR)',
  menor3000: 'Contrato menor (se recaban tres ofertas)',
  mayor3000: 'Contrato menor de importe elevado (tres ofertas y expediente)',
}

export async function generarPropuestaGasto(d: DatosPropuesta): Promise<{ referencia: string }> {
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  const referencia = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`
  const tituloDoc = 'Propuesta de gasto'

  const aytoLogo = await cargarImagen('/images/logo-ayuntamiento.png')
  const pcLogo = await cargarImagen('/images/logo-pc-blanco.png')

  const { jsPDF } = await import('jspdf')
  const doc = new (jsPDF as any)({ format: 'a4', unit: 'mm', compress: true })
  drawHeaderCorporativo(doc, { titulo: tituloDoc, aytoLogo, pcLogo })
  drawFooterCorporativo(doc)

  let y = 37
  const rightX = W - MARGEN
  const ancho = W - MARGEN * 2

  const nuevaPagina = () => {
    doc.addPage()
    drawHeaderCorporativo(doc, { titulo: tituloDoc, aytoLogo, pcLogo })
    drawFooterCorporativo(doc)
    doc.setTextColor(0, 0, 0)
    y = 35
  }
  const asegurar = (alto: number) => { if (y + alto > TOPE) nuevaPagina() }
  const parrafo = (t: string, size = 11) => {
    if (!t) return
    doc.setFontSize(size)
    doc.setFont('helvetica', 'normal')
    const limpio = txt(t)
    const lineas = doc.splitTextToSize(limpio, ancho)
    asegurar(lineas.length * 5.5 + 4)
    doc.text(limpio, MARGEN, y, { maxWidth: ancho, align: 'justify' })
    y += lineas.length * 5.5 + 4
  }
  const titulo = (t: string) => {
    asegurar(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(40, 54, 102)
    doc.text(txt(t).toUpperCase(), MARGEN, y)
    doc.setDrawColor(40, 54, 102)
    doc.line(MARGEN, y + 1.5, W - MARGEN, y + 1.5)
    doc.setTextColor(0, 0, 0)
    y += 7
  }

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)

  // Destinatario
  doc.setFont('helvetica', 'bold')
  doc.text(txt(`A/A: ${d.destinatarioNombre}`), rightX, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(txt(d.destinatarioCargo), rightX, y + 6, { align: 'right' })
  if (d.copiaNombre?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.text(txt(`C/C: ${d.copiaNombre}`), rightX, y + 14, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(txt(d.copiaCargo), rightX, y + 20, { align: 'right' })
  }

  y = 76
  doc.setFont('helvetica', 'bold')
  doc.text(txt(`REF: ${referencia} Expediente de compra ${d.numero}`), MARGEN, y)
  const asunto = doc.splitTextToSize(txt(`ASUNTO: Propuesta de gasto - ${d.titulo}`), ancho)
  doc.text(asunto, MARGEN, y + 8)
  y = y + 8 + asunto.length * 5.5 + 4
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGEN, y, W - MARGEN, y)
  y += 8

  parrafo(`Por medio del presente ${d.firmanteNombre} en calidad de ${d.firmanteCargo} del Ayuntamiento de Bormujos formula la siguiente propuesta de gasto para que surta los efectos oportunos.`)

  // Datos del expediente
  titulo('Datos del expediente')
  const filas: [string, string][] = [
    ['Numero de expediente', `${d.numero} (ejercicio ${d.ejercicio})`],
    ['Objeto', d.objeto || d.titulo],
    ['Modalidad', TIPOS_COMPRA[d.tipoCompra || ''] || d.tipoCompra || '-'],
    ['Partida presupuestaria', d.partida || 'Pendiente de asignar'],
    ['Importe estimado', eur(d.importeEstimado)],
    ...(d.importeAdjudicado ? [['Importe adjudicado', eur(d.importeAdjudicado)] as [string, string]] : []),
    ['Retencion de credito', d.numeroRC ? `RC ${d.numeroRC}` : 'Pendiente'],
    ['Plazo de entrega', d.plazoEntrega || 'No especificado'],
    ['Solicitado por', d.solicitadoPor || '-'],
  ]
  doc.setFontSize(9.5)
  filas.forEach(([k, v]) => {
    asegurar(6)
    doc.setFont('helvetica', 'bold')
    doc.text(txt(k) + ':', MARGEN, y)
    doc.setFont('helvetica', 'normal')
    const lineas = doc.splitTextToSize(txt(v), ancho - 52)
    doc.text(lineas, MARGEN + 52, y)
    y += Math.max(lineas.length * 5, 5.5)
  })
  y += 4

  if (d.justificacion) { titulo('Justificacion de la necesidad'); parrafo(d.justificacion, 10) }
  if (d.propuestaGasto) { titulo('Propuesta'); parrafo(d.propuestaGasto, 10) }
  if (d.informeTecnico) { titulo('Informe tecnico'); parrafo(d.informeTecnico, 10) }

  // Detalle
  if (d.lineas.length) {
    titulo('Detalle del suministro')
    const cDesc = ancho - 22 - 30 - 30
    asegurar(10)
    doc.setFillColor(40, 54, 102)
    doc.rect(MARGEN, y, ancho, 7.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('DESCRIPCION', MARGEN + 2, y + 5)
    doc.text('CANT.', MARGEN + cDesc + 2, y + 5)
    doc.text('PRECIO UD.', MARGEN + cDesc + 22, y + 5)
    doc.text('IMPORTE', W - MARGEN - 2, y + 5, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    y += 7.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    d.lineas.forEach(l => {
      const lineas = doc.splitTextToSize(txt(l.descripcion), cDesc - 4)
      const alto = Math.max(lineas.length * 4.6 + 3, 7)
      asegurar(alto)
      doc.setDrawColor(224, 224, 224)
      doc.line(MARGEN, y + alto, W - MARGEN, y + alto)
      doc.text(lineas, MARGEN + 2, y + 4.5)
      doc.text(`${l.cantidad} ${txt(l.unidad || '')}`, MARGEN + cDesc + 2, y + 4.5)
      doc.text(eur(l.precioUnitario), MARGEN + cDesc + 22, y + 4.5)
      doc.text(eur(l.importeTotal), W - MARGEN - 2, y + 4.5, { align: 'right' })
      y += alto
    })
    y += 4
  }

  // Ofertas
  if (d.ofertas.length) {
    titulo('Ofertas recabadas')
    asegurar(10)
    doc.setFillColor(40, 54, 102)
    doc.rect(MARGEN, y, ancho, 7.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('PROVEEDOR', MARGEN + 2, y + 5)
    doc.text('BASE', W - MARGEN - 62, y + 5, { align: 'right' })
    doc.text('IVA', W - MARGEN - 40, y + 5, { align: 'right' })
    doc.text('TOTAL', W - MARGEN - 2, y + 5, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    y += 7.5
    doc.setFontSize(9)
    d.ofertas.forEach(o => {
      asegurar(8)
      if (o.adjudicada) { doc.setFillColor(232, 240, 232); doc.rect(MARGEN, y, ancho, 7, 'F') }
      doc.setFont('helvetica', o.adjudicada ? 'bold' : 'normal')
      doc.text(txt(`${o.proveedor}${o.cif ? ` (${o.cif})` : ''}${o.adjudicada ? '  [ADJUDICATARIO]' : ''}`), MARGEN + 2, y + 4.8)
      doc.text(eur(o.importe), W - MARGEN - 62, y + 4.8, { align: 'right' })
      doc.text(`${o.iva}%`, W - MARGEN - 40, y + 4.8, { align: 'right' })
      doc.text(eur(o.importeTotal), W - MARGEN - 2, y + 4.8, { align: 'right' })
      y += 7
    })
    y += 4

    const ganadora = d.ofertas.find(o => o.adjudicada)
    const economica = d.ofertas.slice().sort((a, b) => a.importeTotal - b.importeTotal)[0]
    if (ganadora) {
      parrafo(ganadora === economica
        ? `Se propone la adjudicacion a ${ganadora.proveedor} por importe de ${eur(ganadora.importeTotal)}, IVA incluido, por ser la oferta economicamente mas ventajosa.`
        : `Se propone la adjudicacion a ${ganadora.proveedor} por importe de ${eur(ganadora.importeTotal)}, IVA incluido.`, 10)
    }
  }

  // Firma
  asegurar(45)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Sin mas que anadir se firma la presente propuesta para que surta los efectos que proceda.', MARGEN, y)
  y += 12
  const cx = W / 2
  doc.text(txt(`En Bormujos a ${fechaHoy}`), cx, y, { align: 'center' })
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.text(txt(d.firmanteNombre), cx, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(txt(d.firmanteCargo), cx, y + 5, { align: 'center' })
  doc.text('Ayuntamiento de Bormujos', cx, y + 10, { align: 'center' })

  doc.save(`Propuesta-gasto-${d.numero.replace('/', '-')}.pdf`)
  return { referencia }
}
