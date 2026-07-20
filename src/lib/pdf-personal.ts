import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LOGO_BASE64 } from '@/lib/logo-data'
import { AYTO_LOGO_BASE64 } from '@/lib/footer-data'

// Colores e imagen corporativa idénticos a los partes de servicio (pdf-generator-v3)
const BLUE: [number, number, number] = [40, 54, 102] // #283666
const WHITE: [number, number, number] = [255, 255, 255]
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 8
const HEADER_H = 18
const FOOTER_H = 18

// Cabecera con el mismo estilo gráfico del parte (barra azul + logo) y título libre.
function drawHeader(doc: jsPDF, titulo: string) {
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('PROTECCIÓN CIVIL BORMUJOS', MARGIN + 2, 7)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo || 'Listado de personal', MARGIN + 2, 14)

  const logoW = 52
  const logoH = logoW * (333 / 1024)
  doc.addImage(LOGO_BASE64, 'PNG', PAGE_W - MARGIN - logoW, (HEADER_H - logoH) / 2, logoW, logoH)
}

// Pie EXACTO al de los partes de servicio.
function drawFooter(doc: jsPDF) {
  const footerY = PAGE_H - FOOTER_H
  doc.setFillColor(...BLUE)
  doc.rect(0, footerY, PAGE_W, FOOTER_H, 'F')

  doc.setTextColor(...WHITE)
  const centerX = PAGE_W / 2
  const textStartY = footerY + 4
  const lineHeight = 3.2

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICIO DE PROTECCIÓN CIVIL', centerX, textStartY, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Ayuntamiento de Bormujos (Sevilla)', centerX, textStartY + lineHeight, { align: 'center' })
  doc.text('C/ Maestro Francisco Rodríguez s/n | Avda. Universidad de Salamanca', centerX, textStartY + lineHeight * 2, { align: 'center' })
  doc.text('info.pcivil@bormujos.net | www.proteccioncivilbormujos.es', centerX, textStartY + lineHeight * 3, { align: 'center' })

  const pcLogoW = 38
  const pcLogoH = pcLogoW * (333 / 1024)
  try { doc.addImage(LOGO_BASE64, 'PNG', PAGE_W - MARGIN - pcLogoW, footerY + (FOOTER_H - pcLogoH) / 2, pcLogoW, pcLogoH) } catch { /* noop */ }

  if (AYTO_LOGO_BASE64) {
    const aytoH = 12
    const aytoW = 12 * (365 / 400)
    try { doc.addImage(AYTO_LOGO_BASE64, 'PNG', MARGIN, footerY + (FOOTER_H - aytoH) / 2, aytoW, aytoH) } catch { /* noop */ }
  }
}

export function generarPdfPersonal(opts: { titulo: string; headers: string[]; filas: string[][] }) {
  const { titulo, headers, filas } = opts
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  autoTable(doc, {
    head: [headers],
    body: filas,
    startY: HEADER_H + 6,
    margin: { top: HEADER_H + 4, bottom: FOOTER_H + 4, left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', lineColor: [220, 226, 235], lineWidth: 0.1 },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didDrawPage: () => {
      drawHeader(doc, titulo)
      drawFooter(doc)
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}`, MARGIN, HEADER_H + 3)
    },
  })

  const nombre = (titulo || 'listado-personal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`${nombre || 'listado-personal'}.pdf`)
}

// Orden interno del Servicio: J-44 primero, luego S**, luego B**, resto al final.
export function ordenIndicativo(numeroVoluntario: string | null | undefined): [number, number, string] {
  const s = (numeroVoluntario || '').toUpperCase().trim()
  const m = s.match(/^([A-Z]+)\D*(\d+)?/)
  const letra = m?.[1] || 'Z'
  const num = m?.[2] ? parseInt(m[2], 10) : 9999
  const prioridad = letra === 'J' ? 0 : letra === 'S' ? 1 : letra === 'B' ? 2 : 3
  return [prioridad, num, s]
}
