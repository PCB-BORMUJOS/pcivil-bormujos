'use client'

// Compresión de archivos EN EL NAVEGADOR antes de subirlos (funciona en Vercel,
// sin herramientas de servidor). Las imágenes se reescalan y recodifican a JPEG;
// los PDF se rasterizan página a página y se reconstruyen mucho más ligeros.
// Si el resultado no fuese más pequeño, se conserva el archivo original.

import { jsPDF } from 'jspdf'

const MAX_IMG_LADO = 1800   // px máximos del lado mayor de una imagen
const JPEG_Q = 0.72         // calidad JPEG (buen equilibrio nitidez/tamaño)
const PDF_ANCHO_OBJ = 1654  // px objetivo de ancho al rasterizar PDF (~200 dpi A4)

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasABlob(canvas: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob nulo'))), 'image/jpeg', q)
  )
}

async function comprimirImagen(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await cargarImagen(url)
    const escala = Math.min(1, MAX_IMG_LADO / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * escala))
    const h = Math.max(1, Math.round(img.height * escala))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h) // fondo blanco (evita negro en PNG con alfa)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await canvasABlob(canvas, JPEG_Q)
    const out = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
    return out.size < file.size ? out : file
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function comprimirPdf(file: File): Promise<File> {
  const pdfjsLib: any = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let doc: jsPDF | null = null

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const escala = Math.min(2, PDF_ANCHO_OBJ / base.width)
    const vp = page.getViewport({ scale: escala })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(vp.width)
    canvas.height = Math.round(vp.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport: vp }).promise
    const jpeg = canvas.toDataURL('image/jpeg', JPEG_Q)

    const orient = canvas.width > canvas.height ? 'l' : 'p'
    if (!doc) doc = new jsPDF({ orientation: orient, unit: 'px', format: [canvas.width, canvas.height] })
    else doc.addPage([canvas.width, canvas.height], orient)
    doc.addImage(jpeg, 'JPEG', 0, 0, canvas.width, canvas.height)
  }

  if (!doc) return file
  const blob = doc.output('blob')
  const out = new File([blob], file.name.replace(/\.pdf$/i, '') + '.pdf', { type: 'application/pdf' })
  return out.size < file.size ? out : file
}

// Punto de entrada: comprime imágenes y PDF; ante cualquier fallo devuelve el original.
export async function comprimirArchivo(file: File): Promise<File> {
  try {
    if (file.type.startsWith('image/')) return await comprimirImagen(file)
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return await comprimirPdf(file)
  } catch (e) {
    console.warn('No se pudo comprimir, se sube el original:', e)
  }
  return file
}
