import type jsPDF from 'jspdf'
import { LOGO_BASE64 } from '@/lib/logo-data'

// Identidad gráfica compartida de los documentos oficiales (mismo estilo que el
// informe de personal y los partes de servicio).
export const BLUE: [number, number, number] = [40, 54, 102] // #283666
export const WHITE: [number, number, number] = [255, 255, 255]
export const PAGE_W = 210
export const PAGE_H = 297
export const MARGIN = 8
export const HEADER_H = 25
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

// Carga una imagen y la reescala/recomprime para el PDF. Las fotos de móvil
// llegan a 3000-4000 px, muy por encima de lo que se imprime: a ~1800 px el
// lado mayor, un ticket ocupa unos 80 mm en papel → más de 500 ppp, el doble de
// lo necesario para imprenta (300 ppp). Reduce mucho el peso sin pérdida
// visible. Solo para fotos: los logotipos deben seguir en PNG (transparencia).
export async function cargarImagenOptimizada(url: string, maxLado = 1800, calidad = 0.9): Promise<ImagenCargada | null> {
  const base = await cargarImagen(url)
  if (!base) return null
  const escala = Math.min(1, maxLado / Math.max(base.w, base.h))
  // Ya está en JPEG y dentro de tamaño: no hay nada que ganar.
  if (escala >= 1 && base.dataUrl.startsWith('data:image/jpeg')) return base
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = base.dataUrl })
    const w = Math.max(1, Math.round(base.w * escala))
    const h = Math.max(1, Math.round(base.h * escala))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return base
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return { dataUrl: canvas.toDataURL('image/jpeg', calidad), w, h }
  } catch { return base }
}

// Cabecera azul: SOLO los dos logotipos — Ayuntamiento (izq.) y Protección Civil (der.).
export function drawHeaderCorporativo(doc: jsPDF, opts: { titulo?: string; subtitulo?: string; aytoLogo?: ImagenCargada | null; pcLogo?: ImagenCargada | null }) {
  const { aytoLogo, pcLogo } = opts
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')

  const LOGO_H = 13
  // El logo del Ayuntamiento es más estrecho de proporción (≈4,25 frente a
  // ≈5,05), así que a igual altura se ve más pequeño: se compensa dándole algo
  // más de altura para equilibrarlos ópticamente.
  const AYTO_H = 15.5

  // Logo del Ayuntamiento (izquierda), centrado verticalmente.
  if (aytoLogo) {
    const w = AYTO_H * (aytoLogo.w / aytoLogo.h)
    try { doc.addImage(aytoLogo.dataUrl, 'PNG', MARGIN, (HEADER_H - AYTO_H) / 2, w, AYTO_H) } catch { /* noop */ }
  }

  // Logo de Protección Civil (derecha). Usa el proporcionado o el embebido.
  if (pcLogo) {
    const w = LOGO_H * (pcLogo.w / pcLogo.h)
    try { doc.addImage(pcLogo.dataUrl, 'PNG', PAGE_W - MARGIN - w, (HEADER_H - LOGO_H) / 2, w, LOGO_H) } catch { /* noop */ }
  } else {
    const w = LOGO_H * (1024 / 333)
    try { doc.addImage(LOGO_BASE64, 'PNG', PAGE_W - MARGIN - w, (HEADER_H - LOGO_H) / 2, w, LOGO_H) } catch { /* noop */ }
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
