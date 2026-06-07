'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { Loader2, Save, ChevronLeft, X } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { usePrvFsvForm } from '@/hooks/use-prv-fsv-form'
import SignatureCanvas from './SignatureCanvas'
import {
    CHECKLIST_PRINCIPAL,
    CHECKLIST_MATERIAL,
    FOTO_SLOTS_TAB3,
    FOTO_SLOTS_TAB4,
    NIVELES_DIESEL,
    NIVELES_OTROS,
    PrvFsvFormState,
    DanoDiagrama,
} from '@/types/prv-fsv'

// ─── Colores escala 1-5 ───────────────────────────────────────────────────────
const ESCALA_COLOR: Record<number, string> = {
    1: 'bg-green-500 text-white',
    2: 'bg-green-300 text-green-900',
    3: 'bg-yellow-400 text-yellow-900',
    4: 'bg-orange-500 text-white',
    5: 'bg-red-600 text-white',
}

const ESCALA_RING: Record<number, string> = {
    1: 'ring-green-500',
    2: 'ring-green-300',
    3: 'ring-yellow-400',
    4: 'ring-orange-500',
    5: 'ring-red-600',
}

// ─── Cache indicativos ────────────────────────────────────────────────────────
let _indicativosCache: string[] | null = null

// ─── Comprimir imagen antes de subir ─────────────────────────────────────────
function compressImage(file: File, maxPx = 1920, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
            const canvas = document.createElement('canvas')
            canvas.width  = Math.round(img.width  * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
                'image/jpeg',
                quality
            )
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
    })
}

// ─── Componente escala 1-5 ────────────────────────────────────────────────────
function EscalaValor({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(v => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-all ring-2 ring-offset-1
                        ${valor === v ? `${ESCALA_COLOR[v]} ${ESCALA_RING[v]} scale-110` : 'bg-gray-100 text-gray-400 ring-transparent hover:bg-gray-200'}`}
                >
                    {v}
                </button>
            ))}
        </div>
    )
}

// ─── Slot de foto ─────────────────────────────────────────────────────────────
function FotoSlot({
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

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return
        setUploading(true)
        try {
            const compressed = await compressImage(file)
            const reader = new FileReader()
            reader.onload = () => onChange(reader.result as string)
            reader.readAsDataURL(compressed)
        } catch (e) {
            console.error('Error comprimiendo imagen', e)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="bg-[#283666] text-white text-xs font-bold px-3 py-2 uppercase tracking-wide">
                {label}
            </div>
            {value ? (
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt={label} className="w-full h-48 object-cover" />
                    <button
                        type="button"
                        aria-label={`Eliminar ${label}`}
                        onClick={() => onChange(null)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center h-48 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-[#283666] animate-spin" />
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-[#283666]/10 flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 text-[#283666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <span className="text-xs text-gray-500">Toca para añadir foto</span>
                        </>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </label>
            )}
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function PrvFsvForm() {
    const {
        id, form, loading, saving, hasChanges, estadoParte,
        saveParte, setField, setChecklistPrincipal, setChecklistMaterial,
        addDano, removeDano,
    } = usePrvFsvForm()

    const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1)
    const [indicativosList, setIndicativosList] = useState<string[]>([])
    const svgRef = useRef<SVGSVGElement>(null)

    // ── Cargar indicativos con cache ──────────────────────────────────────────
    React.useEffect(() => {
        if (_indicativosCache) { setIndicativosList(_indicativosCache); return }
        fetch('/api/indicativos')
            .then(r => r.json())
            .then(data => {
                if (data.indicativos) {
                    const sorted = (data.indicativos as string[]).sort((a, b) => {
                        if (a === 'J-44') return -1
                        if (b === 'J-44') return 1
                        if (a.startsWith('S-') && !b.startsWith('S-')) return -1
                        if (!a.startsWith('S-') && b.startsWith('S-')) return 1
                        return a.localeCompare(b)
                    })
                    _indicativosCache = sorted
                    setIndicativosList(sorted)
                }
            })
            .catch(err => console.error('Error cargando indicativos', err))
    }, [])

    // ── Guardar con toast ─────────────────────────────────────────────────────
    const handleSave = async (finalizar = false) => {
        const result = await saveParte(finalizar)
        if (result) {
            toast.success(finalizar ? 'Parte completado' : 'Cambios guardados')
        } else {
            toast.error('Error al guardar')
        }
    }

    // ── Click en SVG para marcar daño ─────────────────────────────────────────
    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width  * 100)
        const y = ((e.clientY - rect.top)  / rect.height * 100)
        const descripcion = window.prompt('Descripción del daño (opcional):') ?? ''
        addDano({ x, y, descripcion })
    }

    // ── Navegación tabs con teclado ───────────────────────────────────────────
    const handleTabKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setActiveTab(prev => (prev === 4 ? 1 : (prev + 1) as 1 | 2 | 3 | 4))
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setActiveTab(prev => (prev === 1 ? 4 : (prev - 1) as 1 | 2 | 3 | 4))
        }
    }

    // ── Estado badge ──────────────────────────────────────────────────────────
    const estadoConfig: Record<string, { label: string; className: string }> = {
        borrador:     { label: 'Borrador',     className: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
        pendiente_vb: { label: 'Pendiente VB', className: 'bg-blue-100   text-blue-800   border border-blue-300'   },
        completo:     { label: 'Completo',     className: 'bg-green-100  text-green-800  border border-green-300'  },
    }
    const estadoInfo = estadoConfig[estadoParte] ?? estadoConfig.borrador

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#283666]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />

            {/* ── TOOLBAR ── */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
                    <Link
                        href="/partes"
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        aria-label="Volver a partes"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="h-4 w-px bg-gray-300" />
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#283666]">PRV-FSV</span>
                        <span className="text-sm text-gray-400">|</span>
                        <span className="text-sm font-semibold text-gray-600">
                            {id ? `Ref: ${form.numeroReferencia || '...'}` : 'Nuevo Parte'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoInfo.className}`}>
                            {estadoInfo.label}
                        </span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={saving || !hasChanges}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                                ${hasChanges
                                    ? 'bg-[#283666] text-white hover:bg-[#1e2a52] shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-default'}`}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Guardando...' : hasChanges ? 'Guardar' : 'Guardado'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-50 transition-colors"
                        >
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CABECERA ── */}
            <div className="max-w-5xl mx-auto mt-4 px-4">
                <div className="bg-[#283666] rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-12 border-2 border-white/40 flex items-center justify-center text-white font-black text-lg rounded">
                            PRV
                        </div>
                        <div className="text-white">
                            <div className="text-xs font-semibold tracking-widest opacity-80">PARTE DE</div>
                            <div className="text-lg font-black tracking-wide">REVISIÓN DE VEHÍCULO — FSV</div>
                        </div>
                    </div>
                    <div className="text-white text-right">
                        <div className="text-xs opacity-70">Protección Civil</div>
                        <div className="font-bold">Bormujos</div>
                    </div>
                </div>

                {/* Metadatos */}
                <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="fsv-fecha" className="text-xs font-bold text-gray-600 uppercase tracking-wide">Fecha</label>
                        <input
                            id="fsv-fecha"
                            type="date"
                            value={form.fecha}
                            onChange={e => setField('fecha', e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-[#283666]/30 focus:border-[#283666]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="fsv-hora" className="text-xs font-bold text-gray-600 uppercase tracking-wide">Hora</label>
                        <input
                            id="fsv-hora"
                            type="time"
                            value={form.hora}
                            onChange={e => setField('hora', e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-[#283666]/30 focus:border-[#283666]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="fsv-km" className="text-xs font-bold text-gray-600 uppercase tracking-wide">KM</label>
                        <input
                            id="fsv-km"
                            type="number"
                            value={form.km}
                            onChange={e => setField('km', e.target.value)}
                            placeholder="km actuales"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium w-32 focus:ring-2 focus:ring-[#283666]/30 focus:border-[#283666]"
                        />
                    </div>
                </div>

                {/* ── TABS ── */}
                <div
                    role="tablist"
                    aria-label="Secciones PRV-FSV"
                    className="mt-3 flex gap-1 bg-gray-100 rounded-xl p-1"
                    onKeyDown={handleTabKeyDown}
                >
                    {([
                        [1, 'Revisión principal'],
                        [2, 'Material extendido'],
                        [3, 'Vistas vehículo'],
                        [4, 'Detalles'],
                    ] as [number, string][]).map(([tab, label]) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            id={`fsv-tabid-${tab}`}
                            aria-selected={activeTab === tab}
                            aria-controls={`fsv-tab-${tab}`}
                            tabIndex={activeTab === tab ? 0 : -1}
                            onClick={() => setActiveTab(tab as 1 | 2 | 3 | 4)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all
                                ${activeTab === tab
                                    ? 'bg-white text-[#283666] shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════ */}
                {/* TAB 1 — REVISIÓN PRINCIPAL                        */}
                {/* ══════════════════════════════════════════════════ */}
                <div
                    role="tabpanel"
                    id="fsv-tab-1"
                    aria-labelledby="fsv-tabid-1"
                    style={{ display: activeTab === 1 ? 'block' : 'none' }}
                    className="mt-3 space-y-4"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* CHECK LIST */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-[#283666] text-white px-4 py-3">
                                <h3 className="font-bold text-sm uppercase tracking-wide">Check List</h3>
                                <p className="text-xs text-white/70 mt-0.5">1 = CORRECTO &nbsp;|&nbsp; 5 = REQUIERE ACTUACIÓN INMEDIATA</p>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {CHECKLIST_PRINCIPAL.map((item, i) => (
                                    <div key={item} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[#283666]/10 text-[#283666] text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="text-xs font-medium text-gray-700">{item}</span>
                                        </div>
                                        <EscalaValor
                                            valor={form.checklistPrincipal[i]?.valor ?? 1}
                                            onChange={v => setChecklistPrincipal(i, v)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DIAGRAMA DE DAÑOS */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-[#283666] text-white px-4 py-3">
                                <h3 className="font-bold text-sm uppercase tracking-wide">Diagrama de daños</h3>
                                <p className="text-xs text-white/70 mt-0.5">Pulsa sobre el vehículo para marcar daños</p>
                            </div>
                            <div className="relative p-4">
                                {/* SVG del vehículo con puntos clickables */}
                                <div className="relative cursor-crosshair border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                    <svg
                                        ref={svgRef}
                                        onClick={handleSvgClick}
                                        className="w-full h-auto block"
                                        viewBox="0 0 595 842"
                                        style={{ minHeight: 200 }}
                                    >
                                        <image href="/partes/fsv/fsv-pagina1.svg" width="595" height="842" />
                                        {form.danosDiagrama.map((d, i) => (
                                            <g key={i}>
                                                <circle cx={d.x * 5.95} cy={d.y * 8.42} r="8" fill="#ef4444" opacity="0.85" />
                                                <text x={d.x * 5.95 + 10} y={d.y * 8.42 + 4} fontSize="10" fill="#ef4444" fontWeight="bold">
                                                    {i + 1}
                                                </text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>

                                {/* Lista de daños marcados */}
                                {form.danosDiagrama.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {form.danosDiagrama.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5">
                                                <span className="text-xs text-red-700 font-medium">
                                                    <span className="font-bold">{i + 1}.</span> {d.descripcion || 'Sin descripción'}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label={`Eliminar daño ${i + 1}`}
                                                    onClick={() => removeDano(i)}
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NIVELES DE LÍQUIDOS */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-[#283666] text-white px-4 py-3">
                            <h3 className="font-bold text-sm uppercase tracking-wide">Revisión de niveles de líquidos</h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* DIESEL */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">Diesel</div>
                                <select
                                    value={form.nivelDiesel}
                                    onChange={e => setField('nivelDiesel', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#283666]/30"
                                >
                                    {NIVELES_DIESEL.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <label className="flex items-center gap-2 text-xs text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={form.tieneDiesel}
                                        onChange={e => setField('tieneDiesel', e.target.checked)}
                                        className="rounded border-gray-300 text-[#283666] focus:ring-[#283666]"
                                    />
                                    Combustible OK
                                </label>
                            </div>

                            {/* ACEITE */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">Aceite</div>
                                <select
                                    value={form.nivelAceite}
                                    onChange={e => setField('nivelAceite', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#283666]/30"
                                >
                                    {NIVELES_OTROS.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>

                            {/* AGUA */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">Agua</div>
                                <select
                                    value={form.nivelAgua}
                                    onChange={e => setField('nivelAgua', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#283666]/30"
                                >
                                    {NIVELES_OTROS.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>

                            {/* LIMPIAPARABRISAS */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">Limpiaparabrisas</div>
                                <select
                                    value={form.nivelLimpiaparabrisas}
                                    onChange={e => setField('nivelLimpiaparabrisas', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#283666]/30"
                                >
                                    {NIVELES_OTROS.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-[#283666] text-white px-4 py-3">
                            <h3 className="font-bold text-sm uppercase tracking-wide">Otras observaciones</h3>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={form.observaciones}
                                onChange={e => setField('observaciones', e.target.value)}
                                rows={4}
                                placeholder="Observaciones adicionales..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#283666]/30 focus:border-[#283666]"
                            />
                        </div>
                    </div>

                    {/* FIRMAS */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-[#283666] text-white px-4 py-3">
                            <h3 className="font-bold text-sm uppercase tracking-wide">Indicativos y firma</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Indicativos */}
                            <div className="space-y-3">
                                {(['indicativo1', 'indicativo2', 'indicativo3'] as const).map((field, i) => (
                                    <div key={field}>
                                        <label htmlFor={`fsv-ind-${i + 1}`} className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                                            Indicativo {i + 1}
                                        </label>
                                        <select
                                            id={`fsv-ind-${i + 1}`}
                                            value={(form as PrvFsvFormState)[field]}
                                            onChange={e => setField(field, e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#283666]/30"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {indicativosList.map(ind => (
                                                <option key={ind} value={ind}>{ind}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Firma jefe de servicio */}
                            <div className="md:col-span-2">
                                <SignatureCanvas
                                    label="VB Jefe de Servicio"
                                    initialSignature={form.firmaJefeServicio || undefined}
                                    onSave={val => setField('firmaJefeServicio', val || null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════ */}
                {/* TAB 2 — MATERIAL EXTENDIDO                        */}
                {/* ══════════════════════════════════════════════════ */}
                <div
                    role="tabpanel"
                    id="fsv-tab-2"
                    aria-labelledby="fsv-tabid-2"
                    style={{ display: activeTab === 2 ? 'block' : 'none' }}
                    className="mt-3 space-y-4"
                >
                    {/* Imagen de referencia */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/partes/fsv/fsv-pagina2.svg"
                            alt="Referencia material FSV página 2"
                            className="w-full h-auto rounded-lg border border-gray-100"
                        />
                    </div>

                    {/* Checklist por grupos */}
                    {CHECKLIST_MATERIAL.map((grupo, gi) => {
                        const offset = CHECKLIST_MATERIAL.slice(0, gi).reduce((s, g) => s + g.items.length, 0)
                        return (
                            <div key={grupo.grupo} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-[#283666]/90 text-white px-4 py-2.5">
                                    <h4 className="font-bold text-sm uppercase tracking-wide">{grupo.grupo}</h4>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {grupo.items.map((item, ii) => {
                                        const idx = offset + ii
                                        return (
                                            <div key={item} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                                <span className="text-xs font-medium text-gray-700 flex-1 mr-4">{item}</span>
                                                <EscalaValor
                                                    valor={form.checklistMaterial[idx]?.valor ?? 1}
                                                    onChange={v => setChecklistMaterial(idx, v)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ══════════════════════════════════════════════════ */}
                {/* TAB 3 — VISTAS DEL VEHÍCULO                       */}
                {/* ══════════════════════════════════════════════════ */}
                <div
                    role="tabpanel"
                    id="fsv-tab-3"
                    aria-labelledby="fsv-tabid-3"
                    style={{ display: activeTab === 3 ? 'block' : 'none' }}
                    className="mt-3 space-y-4"
                >
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/partes/fsv/fsv-pagina3.svg"
                            alt="Referencia vistas FSV"
                            className="w-full h-auto rounded-lg border border-gray-100"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {FOTO_SLOTS_TAB3.map(slot => (
                            <FotoSlot
                                key={slot.field}
                                label={slot.label}
                                value={(form as PrvFsvFormState)[slot.field] as string | null}
                                onChange={url => setField(slot.field, url)}
                            />
                        ))}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════ */}
                {/* TAB 4 — DETALLES                                  */}
                {/* ══════════════════════════════════════════════════ */}
                <div
                    role="tabpanel"
                    id="fsv-tab-4"
                    aria-labelledby="fsv-tabid-4"
                    style={{ display: activeTab === 4 ? 'block' : 'none' }}
                    className="mt-3 space-y-4"
                >
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/partes/fsv/fsv-pagina4.svg"
                            alt="Referencia detalles FSV"
                            className="w-full h-auto rounded-lg border border-gray-100"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {FOTO_SLOTS_TAB4.map(slot => (
                            <FotoSlot
                                key={slot.field}
                                label={slot.label}
                                value={(form as PrvFsvFormState)[slot.field] as string | null}
                                onChange={url => setField(slot.field, url)}
                            />
                        ))}
                    </div>
                </div>

                <div className="h-8" />
            </div>
        </div>
    )
}
