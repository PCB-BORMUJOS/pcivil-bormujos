import type jsPDF from 'jspdf'
import { LOGO_BASE64 } from '@/lib/logo-data'

// Identidad gráfica compartida de los documentos oficiales (mismo estilo que el
// informe de personal y los partes de servicio).
export const BLUE: [number, number, number] = [40, 54, 102] // #283666
export const WHITE: [number, number, number] = [255, 255, 255]
export const PAGE_W = 210
export const PAGE_H = 297
export const MARGIN = 8
export const HEADER_H = 18
export const FOOTER_H = 18

export interface ImagenCargada { dataUrl: string; w: number; h: number }

// Carga una imagen (URL remota o ruta pública) como dataURL con sus dimensiones.
export async function cargarImagen(url: string): Promise<ImagenCargada | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.size) return null
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 0, h: 0 })
      img.src = dataUrl
    })
    if (!dims.w || !dims.h) return null
    return { dataUrl, w: dims.w, h: dims.h }
  } catch { return null }
}

// Cabecera azul: SOLO los dos logotipos — Ayuntamiento (izq.) y Protección Civil (der.).
export function drawHeaderCorporativo(doc: jsPDF, opts: { titulo?: string; subtitulo?: string; aytoLogo?: ImagenCargada | null; pcLogo?: ImagenCargada | null }) {
  const { aytoLogo, pcLogo } = opts
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')

  // Logo del Ayuntamiento (izquierda), centrado verticalmente.
  if (aytoLogo) {
    const h = 12
    const w = h * (aytoLogo.w / aytoLogo.h)
    try { doc.addImage(aytoLogo.dataUrl, 'PNG', MARGIN, (HEADER_H - h) / 2, w, h) } catch { /* noop */ }
  }

  // Logo de Protección Civil (derecha). Usa el proporcionado o el embebido.
  if (pcLogo) {
    const h = 12
    const w = h * (pcLogo.w / pcLogo.h)
    try { doc.addImage(pcLogo.dataUrl, 'PNG', PAGE_W - MARGIN - w, (HEADER_H - h) / 2, w, h) } catch { /* noop */ }
  } else {
    const logoW = 50
    const logoH = logoW * (333 / 1024)
    try { doc.addImage(LOGO_BASE64, 'PNG', PAGE_W - MARGIN - logoW, (HEADER_H - logoH) / 2, logoW, logoH) } catch { /* noop */ }
  }
}

// Pie azul: SOLO el texto central del servicio (sin logotipos).
export function drawFooterCorporativo(doc: jsPDF) {
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
}
