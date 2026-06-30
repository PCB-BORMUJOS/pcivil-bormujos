'use client'
import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Clock, Image } from 'lucide-react'

type Estado = 'espera' | 'extrayendo' | 'imagenes' | 'guardando' | 'ok' | 'omitida' | 'error'

interface ArchivoEnCola {
  id: string
  file: File
  estado: Estado
  fecha?: string
  lugar?: string
  paginas?: number
  imagenesSubidas?: number
  error?: string
}

interface Props {
  onClose: () => void
  onImportados: () => void
}

const ESTADOS: Record<Estado, { label: string; color: string }> = {
  espera:     { label: 'En espera',            color: 'text-slate-400' },
  extrayendo: { label: 'Extrayendo campos…',   color: 'text-blue-600' },
  imagenes:   { label: 'Capturando imágenes…', color: 'text-purple-600' },
  guardando:  { label: 'Guardando en BD…',     color: 'text-orange-600' },
  ok:         { label: 'Importado',            color: 'text-green-600' },
  omitida:    { label: 'Ya existía',           color: 'text-amber-600' },
  error:      { label: 'Error',               color: 'text-red-600' },
}

// Detecta la barra azul [40,54,102] del encabezado de firmas escaneando desde abajo.
// Devuelve la y en px donde empieza esa barra (o -1 si no encuentra).
function detectarBarraFirmas(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!
  const { width: w, height: h } = canvas
  const d = ctx.getImageData(0, 0, w, h).data
  const x0 = Math.floor(w * 0.05)
  const x1 = Math.floor(w * 0.95)
  const umbral = (x1 - x0) * 0.35

  for (let y = h - 60; y >= Math.floor(h * 0.55); y--) {
    let azules = 0
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4
      if (Math.abs(d[i] - 40) < 30 && Math.abs(d[i + 1] - 54) < 30 && Math.abs(d[i + 2] - 102) < 30) azules++
    }
    if (azules > umbral) return y
  }
  return -1
}

// Recorta las 3 firmas del canvas usando la y de la barra de cabecera.
// Layout PSI: MARGIN=8mm, sigColW=64.67mm (3 columnas), imagen empieza 20mm bajo body_start
// A4 a pdfjs 1.5x: 1mm ≈ 4.252px
function extraerFirmasDeCanvas(canvas: HTMLCanvasElement): {
  informante: string | null
  responsable: string | null
  jefe: string | null
} {
  const headerY = detectarBarraFirmas(canvas)
  if (headerY === -1) return { informante: null, responsable: null, jefe: null }

  const mm = (v: number) => Math.round(v * 4.252)
  const MARGIN  = mm(8)
  const colW    = mm(194 / 3)        // 64.67mm por columna
  const headerH = mm(6)              // 6mm cabecera azul
  const bodyStart = headerY + headerH
  const imgOffY  = mm(20)           // 20mm desde inicio de body hasta imagen
  const imgOffX  = mm(3)            // 3mm desde borde izquierdo de columna
  const imgW     = mm(194 / 3 - 6)  // ancho de imagen: colW - 6mm
  const imgH     = mm(15)           // alto de imagen: 15mm
  const imgY     = bodyStart + imgOffY
  const { width: w, height: h } = canvas
  const d        = canvas.getContext('2d')!.getImageData(0, 0, w, h).data

  const resultado: (string | null)[] = []
  for (let c = 0; c < 3; c++) {
    const imgX = MARGIN + c * colW + imgOffX

    if (imgY + imgH > h || imgX + imgW > w) { resultado.push(null); continue }

    // ¿Tiene contenido? (no todo blanco/gris claro)
    let noBlanco = 0
    for (let py = imgY; py < imgY + imgH; py++) {
      for (let px = imgX; px < imgX + imgW; px++) {
        const i = (py * w + px) * 4
        if (d[i] < 220 || d[i + 1] < 220 || d[i + 2] < 220) noBlanco++
      }
    }
    if (noBlanco < 80) { resultado.push(null); continue }

    const crop = document.createElement('canvas')
    crop.width  = imgW
    crop.height = imgH
    crop.getContext('2d')!.drawImage(canvas, imgX, imgY, imgW, imgH, 0, 0, imgW, imgH)
    resultado.push(crop.toDataURL('image/png'))
  }

  return { informante: resultado[0] ?? null, responsable: resultado[1] ?? null, jefe: resultado[2] ?? null }
}

// Extrae las fotos de los 3 campos de imagen del formulario PSI (página 3).
// Los campos son Widget/Btn llamados "Imagen 1", "Imagen 2", "Imagen 3".
// Se obtienen los rects dinámicamente de las anotaciones y se recorta cada zona
// del canvas de la página 3 — cada recorte es una imagen independiente, no una captura de página.
async function extraerFotosFormulario(file: File): Promise<{ blobs: Blob[]; canvas1: HTMLCanvasElement | null }> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let canvas1: HTMLCanvasElement | null = null
  const blobs: Blob[] = []

  // Página 1 → render para extraer firmas (lógica existente sin cambios)
  if (pdf.numPages >= 1) {
    const pag1 = await pdf.getPage(1)
    const vp1  = pag1.getViewport({ scale: 1.5 })
    const c1   = document.createElement('canvas')
    c1.width = vp1.width; c1.height = vp1.height
    await pag1.render({ canvasContext: c1.getContext('2d')!, viewport: vp1 }).promise
    canvas1 = c1
  }

  // Página 3 → recortar los 3 campos de imagen
  if (pdf.numPages >= 3) {
    const SCALE = 2.5
    const pag3   = await pdf.getPage(3)
    const anns   = await pag3.getAnnotations()

    // Encontrar las anotaciones de tipo imagen ordenadas de arriba a abajo
    const campos = anns
      .filter(a =>
        a.subtype === 'Widget' &&
        a.fieldType === 'Btn' &&
        typeof a.fieldName === 'string' &&
        /imagen/i.test(a.fieldName)
      )
      .sort((a, b) => b.rect[1] - a.rect[1]) // mayor Y en PDF = más arriba en la página

    if (campos.length === 0) return { blobs, canvas1 }

    // Render de la página 3 en alta resolución para recortar
    const vp3     = pag3.getViewport({ scale: SCALE })
    const canvas3 = document.createElement('canvas')
    canvas3.width = vp3.width; canvas3.height = vp3.height
    await pag3.render({ canvasContext: canvas3.getContext('2d')!, viewport: vp3 }).promise
    const ctx3 = canvas3.getContext('2d')!
    const ph   = vp3.height // alto total del canvas (PDF Y=0 es abajo; canvas Y=0 es arriba)

    for (const campo of campos) {
      const [x1, y1, x2, y2] = campo.rect   // PDF: (izq, abajo, der, arriba)
      const cx = Math.round(x1 * SCALE)
      const cy = Math.round(ph - y2 * SCALE) // invertir eje Y
      const cw = Math.round((x2 - x1) * SCALE)
      const ch = Math.round((y2 - y1) * SCALE)

      if (cw <= 0 || ch <= 0 || cx < 0 || cy < 0) continue

      // Verificar que el campo no está vacío (< 1 % de píxeles con contenido → omitir)
      const pix = ctx3.getImageData(cx, cy, cw, ch)
      let noBlanco = 0
      for (let k = 0; k < pix.data.length; k += 4) {
        if (pix.data[k] < 240 || pix.data[k + 1] < 240 || pix.data[k + 2] < 240) noBlanco++
      }
      if (noBlanco < cw * ch * 0.01) continue // campo vacío

      const crop = document.createElement('canvas')
      crop.width = cw; crop.height = ch
      crop.getContext('2d')!.drawImage(canvas3, cx, cy, cw, ch, 0, 0, cw, ch)
      const blob = await new Promise<Blob>(resolve =>
        crop.toBlob(b => resolve(b!), 'image/jpeg', 0.92)
      )
      blobs.push(blob)
    }
  }

  return { blobs, canvas1 }
}

export default function ModalImportarPSI({ onClose, onImportados }: Props) {
  const [cola, setCola]             = useState<ArchivoEnCola[]>([])
  const [ejecutando, setEjecutando] = useState(false)
  const [arrastrar, setArrastrar]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const contadores = {
    ok:       cola.filter(a => a.estado === 'ok').length,
    omitidas: cola.filter(a => a.estado === 'omitida').length,
    errores:  cola.filter(a => a.estado === 'error').length,
    total:    cola.length,
  }
  const terminado = ejecutando && cola.length > 0 && cola.every(a =>
    ['ok', 'omitida', 'error'].includes(a.estado)
  )

  const actualizarArchivo = (id: string, cambios: Partial<ArchivoEnCola>) =>
    setCola(prev => prev.map(a => a.id === id ? { ...a, ...cambios } : a))

  const agregarArchivos = useCallback((files: FileList | null) => {
    if (!files) return
    const nuevos: ArchivoEnCola[] = Array.from(files)
      .filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
      .filter(f => !cola.some(a => a.file.name === f.name))
      .map(f => ({ id: crypto.randomUUID(), file: f, estado: 'espera' as Estado }))
    setCola(prev => [...prev, ...nuevos])
  }, [cola])

  const procesarArchivo = async (archivo: ArchivoEnCola) => {
    // ── 1. Extraer campos con Claude ──────────────────────────────────────
    actualizarArchivo(archivo.id, { estado: 'extrayendo' })
    const fd1 = new FormData()
    fd1.append('pdf', archivo.file)
    const r1 = await fetch('/api/partes/psi/importar/extraer', { method: 'POST', body: fd1 })
    const d1 = await r1.json()
    if (!r1.ok || !d1.ok) {
      actualizarArchivo(archivo.id, { estado: 'error', error: d1.error || 'Error extrayendo campos' })
      return
    }
    const datos = d1.datos
    actualizarArchivo(archivo.id, { fecha: datos.fecha || undefined, lugar: datos.lugar || undefined })

    // ── 2. Renderizar páginas + extraer firmas ────────────────────────────
    actualizarArchivo(archivo.id, { estado: 'imagenes' })
    let imagenesUrls: string[] = []
    let firmas = { informante: null as string | null, responsable: null as string | null, jefe: null as string | null }

    try {
      const { blobs, canvas1 } = await extraerFotosFormulario(archivo.file)
      actualizarArchivo(archivo.id, { paginas: blobs.length })

      if (canvas1) firmas = extraerFirmasDeCanvas(canvas1)

      const numeroParte = datos.numeroParte || archivo.file.name.replace('.pdf', '')
      for (let i = 0; i < blobs.length; i++) {
        const fd2 = new FormData()
        fd2.append('imagen', blobs[i], `foto-${i + 1}.jpg`)
        fd2.append('numeroParte', numeroParte)
        fd2.append('pagina', String(i + 1))
        try {
          const r2 = await fetch('/api/partes/psi/importar/imagen', { method: 'POST', body: fd2 })
          const d2 = await r2.json().catch(() => ({}))
          if (r2.ok && d2.url) {
            imagenesUrls.push(d2.url)
          } else {
            console.error(`[PSI foto] ${i + 1} → HTTP ${r2.status}:`, d2.error || d2)
          }
        } catch (e: any) {
          console.error(`[PSI foto] ${i + 1} red error:`, e?.message)
        }
      }
    } catch (err: any) {
      console.error('[PSI import] Error extrayendo fotos:', err?.message || err)
      imagenesUrls = []
    }

    actualizarArchivo(archivo.id, { imagenesSubidas: imagenesUrls.length })

    // ── 3. Guardar en BD ─────────────────────────────────────────────────
    actualizarArchivo(archivo.id, { estado: 'guardando' })
    const r3 = await fetch('/api/partes/psi/importar/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos, imagenes: imagenesUrls, firmas }),
    })
    const d3 = await r3.json()

    if (!r3.ok) {
      actualizarArchivo(archivo.id, { estado: 'error', error: d3.error || 'Error guardando' })
    } else if (d3.omitida) {
      actualizarArchivo(archivo.id, { estado: 'omitida', error: d3.mensaje })
    } else {
      actualizarArchivo(archivo.id, { estado: 'ok' })
    }
  }

  const iniciarImportacion = async () => {
    const pendientes = cola.filter(a => a.estado === 'espera')
    if (!pendientes.length) return
    setEjecutando(true)
    for (const archivo of pendientes) {
      try { await procesarArchivo(archivo) }
      catch (err: any) { actualizarArchivo(archivo.id, { estado: 'error', error: err.message }) }
      await new Promise(r => setTimeout(r, 300))
    }
    onImportados()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setArrastrar(false)
    agregarArchivos(e.dataTransfer.files)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <Upload size={17} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Importar partes PSI desde PDF</h2>
              <p className="text-xs text-slate-400">Claude extrae campos y firmas · pdfjs captura imágenes</p>
            </div>
          </div>
          <button onClick={onClose} disabled={ejecutando && !terminado}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Zona de arrastre */}
        {!ejecutando && (
          <div className="px-6 pt-5">
            <div
              onDragOver={e => { e.preventDefault(); setArrastrar(true) }}
              onDragLeave={() => setArrastrar(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                arrastrar ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
              }`}>
              <FileText size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                Arrastra los PDFs aquí o <span className="text-orange-500">haz clic para seleccionar</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Puedes seleccionar múltiples partes PSI a la vez</p>
              <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
                onChange={e => agregarArchivos(e.target.files)} />
            </div>
          </div>
        )}

        {/* Lista de archivos */}
        {cola.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
            {cola.map(a => {
              const cfg = ESTADOS[a.estado]
              const activo = ['extrayendo', 'imagenes', 'guardando'].includes(a.estado)
              return (
                <div key={a.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                  a.estado === 'ok'      ? 'bg-green-50 border-green-100' :
                  a.estado === 'omitida' ? 'bg-amber-50 border-amber-100' :
                  a.estado === 'error'   ? 'bg-red-50 border-red-100'     :
                  activo                 ? 'bg-blue-50 border-blue-100'   :
                  'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex-shrink-0">
                    {a.estado === 'ok'       && <CheckCircle2 size={18} className="text-green-500" />}
                    {a.estado === 'error'    && <AlertCircle  size={18} className="text-red-500" />}
                    {a.estado === 'omitida'  && <Clock        size={18} className="text-amber-500" />}
                    {a.estado === 'imagenes' && <Image        size={18} className="text-purple-500" />}
                    {activo && a.estado !== 'imagenes'
                      && <Loader2 size={18} className={`animate-spin ${a.estado === 'guardando' ? 'text-orange-500' : 'text-blue-500'}`} />}
                    {a.estado === 'espera'   && <FileText     size={18} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {a.fecha && <span className="font-mono text-orange-600 mr-1.5">{a.fecha}</span>}
                      {a.lugar || a.file.name}
                    </p>
                    <p className={`text-xs font-semibold ${cfg.color}`}>
                      {cfg.label}
                      {a.estado === 'imagenes' && a.paginas ? ` (${a.paginas} pág.)` : ''}
                      {a.estado === 'ok' && a.paginas != null && a.imagenesSubidas != null
                        ? ` · ${a.imagenesSubidas}/${a.paginas} imágenes${a.imagenesSubidas < a.paginas ? ' ⚠️' : ''}` : ''}
                      {a.estado === 'error'    && a.error   ? ` — ${a.error}` : ''}
                      {a.estado === 'omitida'  && a.error   ? ` — ${a.error}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-slate-300 flex-shrink-0">
                    {(a.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Pie */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {cola.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span><span className="font-bold text-slate-700">{cola.length}</span> archivos</span>
              {contadores.ok > 0       && <span className="text-green-600 font-semibold">✓ {contadores.ok} importados</span>}
              {contadores.omitidas > 0  && <span className="text-amber-600 font-semibold">⏭ {contadores.omitidas} omitidos</span>}
              {contadores.errores > 0   && <span className="text-red-600 font-semibold">✗ {contadores.errores} errores</span>}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            {terminado ? (
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors">
                Listo — Cerrar
              </button>
            ) : (
              <>
                <button onClick={onClose} disabled={ejecutando && !terminado}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={iniciarImportacion}
                  disabled={cola.filter(a => a.estado === 'espera').length === 0 || ejecutando}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                  {ejecutando
                    ? <><Loader2 size={14} className="animate-spin" /> Importando…</>
                    : <><Upload size={14} /> Iniciar importación</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
