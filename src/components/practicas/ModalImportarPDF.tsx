'use client'
import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Clock, Image } from 'lucide-react'

type Estado = 'espera' | 'extrayendo' | 'imagenes' | 'guardando' | 'ok' | 'omitida' | 'error'

interface ArchivoEnCola {
  id: string
  file: File
  estado: Estado
  numero?: string
  titulo?: string
  paginas?: number
  error?: string
}

interface Props {
  onClose: () => void
  onImportadas: () => void
}

const ESTADOS: Record<Estado, { label: string; color: string }> = {
  espera:     { label: 'En espera',            color: 'text-slate-400' },
  extrayendo: { label: 'Extrayendo campos…',   color: 'text-blue-600' },
  imagenes:   { label: 'Capturando imágenes…', color: 'text-purple-600' },
  guardando:  { label: 'Guardando en BD…',     color: 'text-orange-600' },
  ok:         { label: 'Importada',            color: 'text-green-600' },
  omitida:    { label: 'Ya existía',           color: 'text-amber-600' },
  error:      { label: 'Error',               color: 'text-red-600' },
}

async function renderizarPaginasPDF(file: File): Promise<Blob[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const blobs: Blob[] = []

  for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width  = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob>(resolve =>
      canvas.toBlob(b => resolve(b!), 'image/png', 0.85)
    )
    blobs.push(blob)
  }

  return blobs
}

export default function ModalImportarPDF({ onClose, onImportadas }: Props) {
  const [cola, setCola]           = useState<ArchivoEnCola[]>([])
  const [ejecutando, setEjecutando] = useState(false)
  const [arrastrar, setArrastrar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const contadores = {
    ok:      cola.filter(a => a.estado === 'ok').length,
    omitidas:cola.filter(a => a.estado === 'omitida').length,
    errores: cola.filter(a => a.estado === 'error').length,
    total:   cola.length,
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
    const r1 = await fetch('/api/practicas/importar/extraer', { method: 'POST', body: fd1 })
    const d1 = await r1.json()
    if (!r1.ok || !d1.ok) {
      actualizarArchivo(archivo.id, { estado: 'error', error: d1.error || 'Error extrayendo campos' })
      return
    }
    const datos = d1.datos
    actualizarArchivo(archivo.id, { numero: datos.numero, titulo: datos.titulo })

    // ── 2. Renderizar y subir imágenes (cliente → Blob vía API) ──────────
    actualizarArchivo(archivo.id, { estado: 'imagenes' })
    let imagenesUrls: string[] = []
    try {
      const paginasBlob = await renderizarPaginasPDF(archivo.file)
      actualizarArchivo(archivo.id, { paginas: paginasBlob.length })
      for (let i = 0; i < paginasBlob.length; i++) {
        const fd2 = new FormData()
        fd2.append('imagen', paginasBlob[i], `pagina-${i + 1}.png`)
        fd2.append('numero', datos.numero || archivo.file.name)
        fd2.append('pagina', String(i + 1))
        const r2 = await fetch('/api/practicas/importar/imagen', { method: 'POST', body: fd2 })
        const d2 = await r2.json()
        if (r2.ok && d2.url) imagenesUrls.push(d2.url)
      }
    } catch {
      // Las imágenes son opcionales — continuamos sin ellas
      imagenesUrls = []
    }

    // ── 3. Guardar en BD ─────────────────────────────────────────────────
    actualizarArchivo(archivo.id, { estado: 'guardando' })
    const r3 = await fetch('/api/practicas/importar/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos, imagenes: imagenesUrls }),
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
    onImportadas()
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
              <h2 className="text-base font-black text-slate-800">Importar fichas desde PDF</h2>
              <p className="text-xs text-slate-400">Claude extrae los campos · pdfjs captura las imágenes</p>
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
              <p className="text-xs text-slate-400 mt-1">Puedes seleccionar múltiples archivos a la vez</p>
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
              const activo = ['extrayendo','imagenes','guardando'].includes(a.estado)
              return (
                <div key={a.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                  a.estado === 'ok'      ? 'bg-green-50 border-green-100' :
                  a.estado === 'omitida' ? 'bg-amber-50 border-amber-100' :
                  a.estado === 'error'   ? 'bg-red-50 border-red-100'     :
                  activo                 ? 'bg-blue-50 border-blue-100'   :
                  'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex-shrink-0">
                    {a.estado === 'ok'      && <CheckCircle2 size={18} className="text-green-500" />}
                    {a.estado === 'error'   && <AlertCircle  size={18} className="text-red-500" />}
                    {a.estado === 'omitida' && <Clock        size={18} className="text-amber-500" />}
                    {a.estado === 'imagenes'&& <Image        size={18} className="text-purple-500" />}
                    {activo && a.estado !== 'imagenes'
                      && <Loader2 size={18} className={`animate-spin ${a.estado === 'guardando' ? 'text-orange-500' : 'text-blue-500'}`} />}
                    {a.estado === 'espera'  && <FileText     size={18} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {a.numero ? <span className="font-mono text-orange-600 mr-1.5">{a.numero}</span> : null}
                      {a.titulo || a.file.name}
                    </p>
                    <p className={`text-xs font-semibold ${cfg.color}`}>
                      {cfg.label}
                      {a.estado === 'imagenes' && a.paginas ? ` (${a.paginas} pág.)` : ''}
                      {a.estado === 'error' && a.error ? ` — ${a.error}` : ''}
                      {a.estado === 'omitida' && a.error ? ` — ${a.error}` : ''}
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
              {contadores.ok > 0      && <span className="text-green-600 font-semibold">✓ {contadores.ok} importadas</span>}
              {contadores.omitidas > 0 && <span className="text-amber-600 font-semibold">⏭ {contadores.omitidas} omitidas</span>}
              {contadores.errores > 0  && <span className="text-red-600 font-semibold">✗ {contadores.errores} errores</span>}
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
