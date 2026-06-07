'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle, Loader2, X, Image as ImageIcon } from 'lucide-react'
import { usePrvFsvForm } from '@/hooks/use-prv-fsv-form'

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

// ─── PDF Page ─────────────────────────────────────────────────────────────────

const PHOTO_ANNOT_NAMES = new Set(['FRONTAL', 'TRASERA', 'LATERAL IZQUIERDO', 'LATERAL DERECHO'])

type PhotoSlot = {
    annotName: string
    value: string | null
    onChange: (url: string | null) => void
}

type PageProps = {
    pdfDoc: any
    pageNum: number
    scale: number
    annotStorageRef: React.MutableRefObject<any>
    onFieldChange: (fieldName: string, value: string | boolean) => void
    photoSlots?: PhotoSlot[]
    camposFormulario: Record<string, string | boolean>
}

function PdfPage({ pdfDoc, pageNum, scale, annotStorageRef, onFieldChange, photoSlots, camposFormulario }: PageProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [photoOverlays, setPhotoOverlays] = useState<Array<{ name: string; style: React.CSSProperties }>>([])

    useEffect(() => {
        if (!pdfDoc || !containerRef.current) return
        let cancelled = false

        async function render() {
            try {
                const pdfjsLib = await import('pdfjs-dist')
                const page = await pdfDoc.getPage(pageNum)
                const viewport = page.getViewport({ scale })
                if (cancelled) return

                const container = containerRef.current!
                container.innerHTML = ''
                container.style.position = 'relative'
                container.style.width = `${viewport.width}px`
                container.style.height = `${viewport.height}px`
                container.style.overflow = 'hidden'

                // Canvas
                const canvas = document.createElement('canvas')
                canvas.width = viewport.width
                canvas.height = viewport.height
                Object.assign(canvas.style, { position: 'absolute', top: '0', left: '0' })
                container.appendChild(canvas)
                await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
                if (cancelled) return

                // Annotations
                const allAnnots: any[] = await page.getAnnotations({ intent: 'display' })
                const regularAnnots = allAnnots.filter(a => !PHOTO_ANNOT_NAMES.has(a.fieldName))
                const photoAnnots   = allAnnots.filter(a => PHOTO_ANNOT_NAMES.has(a.fieldName))

                // Compute photo overlay styles from annotation rects (PDF coords → CSS pixels)
                const overlays = photoAnnots.map(a => {
                    const [x1, y1, x2, y2] = a.rect as number[]
                    return {
                        name: a.fieldName as string,
                        style: {
                            position: 'absolute' as const,
                            left:   `${x1 * scale}px`,
                            bottom: `${y1 * scale}px`,
                            width:  `${(x2 - x1) * scale}px`,
                            height: `${(y2 - y1) * scale}px`,
                        },
                    }
                })
                setPhotoOverlays(overlays)

                // Annotation layer for regular fields
                const annotDiv = document.createElement('div')
                annotDiv.className = 'annotationLayer'
                Object.assign(annotDiv.style, {
                    position: 'absolute', top: '0', left: '0',
                    width: `${viewport.width}px`, height: `${viewport.height}px`,
                })
                container.appendChild(annotDiv)

                // pdfjs-dist 3.x: constructor takes {div,page,viewport,...}, render() takes full params
                const AnnotationLayerCls = pdfjsLib.AnnotationLayer as any
                const annotLayer = new AnnotationLayerCls({
                    div: annotDiv,
                    accessibilityManager: null,
                    annotationCanvasMap: null,
                    l10n: null,
                    page,
                    viewport,
                })
                const minimalLinkService = {
                    addLinkAttributes() {},
                    getDestinationHash: () => '#',
                    getAnchorUrl: () => '#',
                    setHash() {},
                    executeNamedAction() {},
                    executeSetOCGState() {},
                    cachePageRef() {},
                    isPageVisible: () => true,
                    isPageCached: () => false,
                    pagesCount: 4,
                    page: pageNum,
                    rotation: 0,
                }
                await annotLayer.render({
                    viewport,
                    div: annotDiv,
                    annotations: regularAnnots,
                    page,
                    linkService: minimalLinkService,
                    downloadManager: null,
                    annotationStorage: annotStorageRef.current,
                    imageResourcesPath: '',
                    renderForms: true,
                    enableScripting: false,
                    hasJSActions: false,
                    fieldObjects: null,
                    annotationCanvasMap: null,
                })

                if (cancelled) return

                // Restore saved field values into DOM elements
                for (const annot of regularAnnots) {
                    const savedVal = camposFormulario[annot.fieldName]
                    if (savedVal === undefined) continue
                    const section = annotDiv.querySelector(`[data-annotation-id="${annot.id}"]`)
                    if (!section) continue
                    const input = section.querySelector('input, select, textarea') as HTMLInputElement | null
                    if (!input) continue
                    if (input.type === 'checkbox') {
                        input.checked = savedVal as boolean
                    } else {
                        input.value = savedVal as string
                    }
                }

                // Event delegation: capture field changes
                const handleChange = (e: Event) => {
                    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                    if (!target || !('value' in target)) return
                    // Walk up to find the annotation wrapper with data-annotation-id
                    let el: Element | null = target
                    let annotId = ''
                    while (el && el !== annotDiv) {
                        annotId = el.getAttribute('data-annotation-id') || ''
                        if (annotId) break
                        el = el.parentElement
                    }
                    // Find field name from annotation list
                    const annot = regularAnnots.find(a => a.id === annotId)
                    const fieldName = annot?.fieldName || target.getAttribute('name') || ''
                    if (!fieldName) return
                    const value = target.type === 'checkbox'
                        ? (target as HTMLInputElement).checked
                        : target.value
                    onFieldChange(fieldName, value as string | boolean)
                }
                annotDiv.addEventListener('change', handleChange)
                annotDiv.addEventListener('input', handleChange)

            } catch (err) {
                console.error(`Error rendering PRV-FSV page ${pageNum}:`, err)
            }
        }

        render()
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfDoc, pageNum, scale])

    return (
        <div style={{ position: 'relative', display: 'inline-block', lineHeight: '0', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            <div ref={containerRef} />
            {/* Photo overlays — positioned in PDF coordinate space (bottom-left origin) */}
            {photoOverlays.map(ov => {
                const slot = photoSlots?.find(s => s.annotName === ov.name)
                if (!slot) return null
                return (
                    <div key={ov.name} style={ov.style}>
                        <PhotoOverlay label={ov.name} value={slot.value} onChange={slot.onChange} />
                    </div>
                )
            })}
        </div>
    )
}

// ─── Estado badge ──────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
    borrador:     { label: 'Borrador',     cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    pendiente_vb: { label: 'Pendiente VB', cls: 'bg-blue-100 text-blue-800 border border-blue-300' },
    completo:     { label: 'Completo',     cls: 'bg-green-100 text-green-800 border border-green-300' },
}

// ─── CSS injection ─────────────────────────────────────────────────────────────

function usePdfViewerCss() {
    useEffect(() => {
        if (document.querySelector('link[data-prv-fsv-css]')) return
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/prv-fsv-annot.css'
        link.setAttribute('data-prv-fsv-css', '1')
        document.head.appendChild(link)
    }, [])
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PrvFsvForm() {
    const { id, form, loading, saving, draftRestored, estadoParte, saveParte, setField, setCampo } = usePrvFsvForm()
    usePdfViewerCss()

    const [pdfDoc, setPdfDoc]     = useState<any>(null)
    const [pdfError, setPdfError] = useState<string | null>(null)
    const annotStorageRef         = useRef<any>(null)

    const SCALE = typeof window !== 'undefined' && window.innerWidth < 900 ? 1.0 : 1.5

    // ── Load PDF ──────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false
        async function loadPdf() {
            try {
                const pdfjsLib = await import('pdfjs-dist')
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                const doc = await pdfjsLib.getDocument('/partes/fsv/prv-fsv.pdf').promise
                if (cancelled) return
                annotStorageRef.current = doc.annotationStorage
                setPdfDoc(doc)
            } catch (err) {
                console.error('Error cargando PDF PRV-FSV:', err)
                setPdfError('No se pudo cargar el formulario PDF.')
            }
        }
        loadPdf()
        return () => { cancelled = true }
    }, [])

    const handleFieldChange = useCallback((fieldName: string, value: string | boolean) => {
        setCampo(fieldName, value)
    }, [setCampo])

    const estadoInfo = ESTADO_CONFIG[estadoParte] ?? ESTADO_CONFIG.borrador

    const photoSlots: PhotoSlot[] = [
        { annotName: 'FRONTAL',           value: form.fotoFrontal,    onChange: (u) => setField('fotoFrontal', u) },
        { annotName: 'TRASERA',           value: form.fotoTrasera,    onChange: (u) => setField('fotoTrasera', u) },
        { annotName: 'LATERAL IZQUIERDO', value: form.fotoLateralIzq, onChange: (u) => setField('fotoLateralIzq', u) },
        { annotName: 'LATERAL DERECHO',   value: form.fotoLateralDer, onChange: (u) => setField('fotoLateralDer', u) },
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
                                annotStorageRef={annotStorageRef}
                                onFieldChange={handleFieldChange}
                                photoSlots={photoSlots}
                                camposFormulario={form.camposFormulario}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
