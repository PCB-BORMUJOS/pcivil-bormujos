'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle, Loader2, X, Image as ImageIcon } from 'lucide-react'
import { usePrvFsvForm } from '@/hooks/use-prv-fsv-form'
import { FSV_FIELDS, PAGE_HEIGHT } from '@/data/prv-fsv-fields'

// ─── Photo upload overlay ─────────────────────────────────────────────────────

function PhotoOverlay({
    label,
    value,
    onChange,
}: {
    label: string
    value: string | null
    onChange: (url: string | null) => void
}) {
    const [uploading, setUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const compressImage = (file: File): Promise<Blob> =>
        new Promise((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
                const maxPx = 1920
                const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
                canvas.toBlob(
                    blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
                    'image/jpeg', 0.82
                )
            }
            img.onerror = reject
            img.src = URL.createObjectURL(file)
        })

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return
        setUploading(true)
        try {
            const compressed = await compressImage(file)
            const fd = new FormData()
            fd.append('file', new File([compressed], file.name, { type: 'image/jpeg' }))
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) throw new Error('Upload failed')
            const { url } = await res.json()
            onChange(url)
        } catch (err) {
            console.error('Upload error:', err)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            />
            {value ? (
                <div className="relative w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt={label} className="w-full h-full object-cover" />
                    <button
                        onClick={() => onChange(null)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow-lg"
                    >
                        <X size={14} />
                    </button>
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded shadow-lg"
                    >
                        Cambiar
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-1 w-full h-full
                               bg-white/70 hover:bg-blue-50/80
                               border-2 border-dashed border-blue-400 transition-colors cursor-pointer"
                >
                    {uploading ? (
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                    ) : (
                        <>
                            <ImageIcon size={28} className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-700">{label}</span>
                            <span className="text-xs text-gray-500">Toca para añadir foto</span>
                        </>
                    )}
                </button>
            )}
        </div>
    )
}

// ─── PDF Page canvas ──────────────────────────────────────────────────────────

type PdfCanvasProps = {
    pdfDoc: any
    pageNum: number
    scale: number
    onReady: (width: number, height: number) => void
}

function PdfCanvas({ pdfDoc, pageNum, scale, onReady }: PdfCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return
        let cancelled = false

        async function render() {
            try {
                const page = await pdfDoc.getPage(pageNum)
                const viewport = page.getViewport({ scale })
                if (cancelled) return

                const canvas = canvasRef.current!
                canvas.width = viewport.width
                canvas.height = viewport.height
                await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
                if (!cancelled) onReady(viewport.width, viewport.height)
            } catch (err) {
                console.error(`Error rendering PDF page ${pageNum}:`, err)
            }
        }

        render()
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfDoc, pageNum, scale])

    return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

// ─── React field overlay ──────────────────────────────────────────────────────

type FieldOverlayProps = {
    pageNum: number
    scale: number
    pageWidth: number
    pageHeight: number
    camposFormulario: Record<string, string | boolean>
    onFieldChange: (name: string, value: string | boolean) => void
    photoSlots: Array<{ annotName: string; value: string | null; onChange: (u: string | null) => void }>
}

function FieldOverlay({
    pageNum, scale, pageWidth, pageHeight, camposFormulario, onFieldChange, photoSlots
}: FieldOverlayProps) {
    const pageFields = FSV_FIELDS.filter(f => f.page === pageNum)

    return (
        <div
            style={{
                position: 'absolute', top: 0, left: 0,
                width: `${pageWidth}px`, height: `${pageHeight}px`,
                pointerEvents: 'none',
            }}
        >
            {pageFields.map(field => {
                const [x1, y1, x2, y2] = field.rect
                const cssTop    = (PAGE_HEIGHT - y2) * scale
                const cssLeft   = x1 * scale
                const cssWidth  = (x2 - x1) * scale
                const cssHeight = (y2 - y1) * scale

                const style: React.CSSProperties = {
                    position: 'absolute',
                    top:    `${cssTop}px`,
                    left:   `${cssLeft}px`,
                    width:  `${cssWidth}px`,
                    height: `${cssHeight}px`,
                    pointerEvents: 'auto',
                }

                // Photo fields
                if (field.photo) {
                    const slot = photoSlots.find(s => s.annotName === field.name)
                    if (!slot) return null
                    return (
                        <div key={field.name} style={style}>
                            <PhotoOverlay label={field.name} value={slot.value} onChange={slot.onChange} />
                        </div>
                    )
                }

                // Checkbox (Btn)
                if (field.type === 'Btn') {
                    const checked = camposFormulario[field.name] === true
                    return (
                        <div key={field.name} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => onFieldChange(field.name, e.target.checked)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    margin: 0,
                                    cursor: 'pointer',
                                    accentColor: '#1d4ed8',
                                    opacity: 0.85,
                                }}
                            />
                        </div>
                    )
                }

                // Text input (Tx)
                if (field.type === 'Tx') {
                    const val = (camposFormulario[field.name] as string) ?? ''
                    const fontSize = Math.max(8, Math.min(cssHeight * 0.65, 14))
                    return (
                        <input
                            key={field.name}
                            type="text"
                            value={val}
                            onChange={e => onFieldChange(field.name, e.target.value)}
                            style={{
                                ...style,
                                fontSize: `${fontSize}px`,
                                padding: '0 4px',
                                background: 'rgba(255,255,255,0.85)',
                                border: '1px solid rgba(100,100,200,0.4)',
                                borderRadius: '2px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                            }}
                        />
                    )
                }

                // Select (Ch) — INDICATIVO INFORMA / RESPONSABLE TURNO
                if (field.type === 'Ch') {
                    const val = (camposFormulario[field.name] as string) ?? ''
                    const fontSize = Math.max(8, Math.min(cssHeight * 0.65, 12))
                    return (
                        <select
                            key={field.name}
                            value={val}
                            onChange={e => onFieldChange(field.name, e.target.value)}
                            style={{
                                ...style,
                                fontSize: `${fontSize}px`,
                                padding: '0 2px',
                                background: 'rgba(255,255,255,0.85)',
                                border: '1px solid rgba(100,100,200,0.4)',
                                borderRadius: '2px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                                appearance: 'none' as const,
                            }}
                        >
                            <option value=""></option>
                        </select>
                    )
                }

                return null
            })}
        </div>
    )
}

// ─── PDF Page (canvas + overlay) ─────────────────────────────────────────────

type PageProps = {
    pdfDoc: any
    pageNum: number
    scale: number
    camposFormulario: Record<string, string | boolean>
    onFieldChange: (name: string, value: string | boolean) => void
    photoSlots: Array<{ annotName: string; value: string | null; onChange: (u: string | null) => void }>
}

function PdfPage({ pdfDoc, pageNum, scale, camposFormulario, onFieldChange, photoSlots }: PageProps) {
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-block',
                lineHeight: '0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            }}
        >
            <PdfCanvas
                pdfDoc={pdfDoc}
                pageNum={pageNum}
                scale={scale}
                onReady={(w, h) => setDims({ w, h })}
            />
            {dims && (
                <FieldOverlay
                    pageNum={pageNum}
                    scale={scale}
                    pageWidth={dims.w}
                    pageHeight={dims.h}
                    camposFormulario={camposFormulario}
                    onFieldChange={onFieldChange}
                    photoSlots={photoSlots}
                />
            )}
        </div>
    )
}

// ─── Estado badge ──────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
    borrador:     { label: 'Borrador',     cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    pendiente_vb: { label: 'Pendiente VB', cls: 'bg-blue-100 text-blue-800 border border-blue-300' },
    completo:     { label: 'Completo',     cls: 'bg-green-100 text-green-800 border border-green-300' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PrvFsvForm() {
    const { form, loading, saving, draftRestored, estadoParte, saveParte, setField, setCampo, id } = usePrvFsvForm()

    const [pdfDoc, setPdfDoc]     = useState<any>(null)
    const [pdfError, setPdfError] = useState<string | null>(null)

    const SCALE = typeof window !== 'undefined' && window.innerWidth < 900 ? 1.0 : 1.5

    useEffect(() => {
        let cancelled = false
        async function loadPdf() {
            try {
                const pdfjsLib = await import('pdfjs-dist')
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                const doc = await pdfjsLib.getDocument('/partes/fsv/prv-fsv.pdf').promise
                if (!cancelled) setPdfDoc(doc)
            } catch (err) {
                console.error('Error cargando PDF PRV-FSV:', err)
                if (!cancelled) setPdfError('No se pudo cargar el formulario PDF.')
            }
        }
        loadPdf()
        return () => { cancelled = true }
    }, [])

    const handleFieldChange = useCallback((name: string, value: string | boolean) => {
        setCampo(name, value)
    }, [setCampo])

    const estadoInfo = ESTADO_CONFIG[estadoParte] ?? ESTADO_CONFIG.borrador

    const photoSlots = [
        { annotName: 'FRONTAL',           value: form.fotoFrontal,    onChange: (u: string | null) => setField('fotoFrontal', u) },
        { annotName: 'TRASERA',           value: form.fotoTrasera,    onChange: (u: string | null) => setField('fotoTrasera', u) },
        { annotName: 'LATERAL IZQUIERDO', value: form.fotoLateralIzq, onChange: (u: string | null) => setField('fotoLateralIzq', u) },
        { annotName: 'LATERAL DERECHO',   value: form.fotoLateralDer, onChange: (u: string | null) => setField('fotoLateralDer', u) },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando parte...</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-200">

            {/* Toolbar */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow">
                <div className="flex items-center gap-3 px-4 py-2 flex-wrap max-w-screen-xl mx-auto">
                    <Link href="/partes" className="text-gray-500 hover:text-gray-800 flex-none">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                            {form.numeroReferencia || 'Nuevo Parte PRV-FSV'}
                        </p>
                        {id && <p className="text-xs text-gray-400">ID: {id.slice(0, 8)}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-none ${estadoInfo.cls}`}>
                        {estadoInfo.label}
                    </span>
                    {draftRestored && (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-none">
                            Borrador restaurado
                        </span>
                    )}
                    <button
                        onClick={() => saveParte(false)}
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                                   text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex-none"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                    </button>
                    <button
                        onClick={() => saveParte(true)}
                        disabled={saving || estadoParte === 'completo'}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50
                                   text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex-none"
                    >
                        <CheckCircle size={14} />
                        Finalizar
                    </button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex justify-center py-6 px-2 overflow-x-auto">
                {pdfError ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center max-w-md">
                        <p className="font-semibold">{pdfError}</p>
                    </div>
                ) : !pdfDoc ? (
                    <div className="flex items-center gap-2 text-gray-500 py-20">
                        <Loader2 className="animate-spin w-6 h-6" />
                        <span>Cargando formulario PDF…</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-8">
                        {[1, 2, 3, 4].map(pageNum => (
                            <PdfPage
                                key={pageNum}
                                pdfDoc={pdfDoc}
                                pageNum={pageNum}
                                scale={SCALE}
                                camposFormulario={form.camposFormulario}
                                onFieldChange={handleFieldChange}
                                photoSlots={photoSlots}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
