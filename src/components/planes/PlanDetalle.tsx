'use client'

import { useRef, useState } from 'react'
import {
    X, FileText, Download, Trash2, Upload, Loader2, Pencil, MapPin, Phone, Mail,
    CalendarClock, Building2, ShieldAlert, UserRound, FileArchive, ExternalLink,
} from 'lucide-react'
import { ESTADOS_VIGENCIA, TIPOS_DOCUMENTO, estadoVigencia, textoPlazo } from '@/lib/cartografia'

export type Documento = {
    id: string
    titulo: string
    tipo: string
    url: string
    nombreArchivo: string
    tamano: number
    createdAt: string
}

export type PlanCompleto = {
    id: string
    tipo: string
    nombre: string
    referencia: string | null
    descripcion: string | null
    direccion: string | null
    latitud: number | null
    longitud: number | null
    fechaAprobacion: string | null
    fechaRevision: string | null
    organoAprobacion: string | null
    responsableNombre: string | null
    responsableCargo: string | null
    responsableTelefono: string | null
    responsableEmail: string | null
    aforo: number | null
    ocupacion: string | null
    nivelRiesgo: string | null
    mediosPropios: string | null
    observaciones: string | null
    documentos: Documento[]
}

const NIVEL_CLASES: Record<string, string> = {
    bajo:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    medio: 'bg-amber-50 text-amber-700 border-amber-200',
    alto:  'bg-red-50 text-red-700 border-red-200',
}

function pesoLegible(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

function fechaLegible(v: string | null): string {
    if (!v) return '—'
    return new Date(v).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })
}

export default function PlanDetalle({
    plan, puedeEditar, alCerrar, alEditar, alCambiar, alBorrarPlan,
}: {
    plan: PlanCompleto
    puedeEditar: boolean
    alCerrar: () => void
    alEditar: () => void
    alCambiar: (plan: PlanCompleto) => void
    alBorrarPlan: () => void
}) {
    const [subiendo, setSubiendo] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [tipoDoc, setTipoDoc] = useState('plan')
    const inputRef = useRef<HTMLInputElement>(null)

    const estado = estadoVigencia(plan.fechaRevision)
    const info = ESTADOS_VIGENCIA[estado]

    const subir = async (archivo: File) => {
        setSubiendo(true); setError(null)
        try {
            const fd = new FormData()
            fd.append('archivo', archivo)
            fd.append('titulo', archivo.name.replace(/\.[^.]+$/, ''))
            fd.append('tipo', tipoDoc)
            const res = await fetch(`/api/planes/${plan.id}/documentos`, { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo subir el documento'); return }
            alCambiar({ ...plan, documentos: [data.documento, ...plan.documentos] })
        } catch {
            setError('Error de conexión al subir')
        } finally {
            setSubiendo(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const borrarDoc = async (doc: Documento) => {
        if (!confirm(`¿Eliminar el documento "${doc.titulo}"?\n\nSe borra también el archivo y no se puede deshacer.`)) return
        const res = await fetch(`/api/planes/${plan.id}/documentos?docId=${doc.id}`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'No se pudo eliminar'); return }
        alCambiar({ ...plan, documentos: plan.documentos.filter(d => d.id !== doc.id) })
    }

    return (
        <div className="fixed inset-0 z-[1250] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={alCerrar} />

            <aside className="relative w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col animate-[slideIn_.2s_ease-out]">
                <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>

                {/* Cabecera */}
                <header className="bg-white border-b border-slate-200 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.clases}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${info.punto}`} />
                                    {info.label}
                                </span>
                                {plan.referencia && (
                                    <span className="text-[11px] font-mono text-slate-400">{plan.referencia}</span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">{plan.nombre}</h2>
                            {plan.direccion && (
                                <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1.5">
                                    <MapPin size={13} className="flex-shrink-0" /> {plan.direccion}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {puedeEditar && (
                                <button onClick={alEditar} title="Editar plan" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                                    <Pencil size={16} />
                                </button>
                            )}
                            <button onClick={alCerrar} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

                    {plan.descripcion && (
                        <p className="text-sm text-slate-600 leading-relaxed bg-white rounded-xl border border-slate-200 p-4">
                            {plan.descripcion}
                        </p>
                    )}

                    {/* Vigencia */}
                    <Bloque icono={CalendarClock} color="text-amber-600" titulo="Vigencia">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <Dato etiqueta="Aprobado el" valor={fechaLegible(plan.fechaAprobacion)} />
                            <Dato etiqueta="Próxima revisión" valor={fechaLegible(plan.fechaRevision)} />
                            <Dato etiqueta="Órgano" valor={plan.organoAprobacion || '—'} />
                            <Dato etiqueta="Plazo" valor={textoPlazo(plan.fechaRevision)}
                                  clases={estado === 'caducado' ? 'text-red-600 font-semibold' : estado === 'proxima' ? 'text-amber-600 font-semibold' : ''} />
                        </div>
                    </Bloque>

                    {/* Responsable */}
                    {(plan.responsableNombre || plan.responsableTelefono || plan.responsableEmail) && (
                        <Bloque icono={UserRound} color="text-violet-600" titulo="Responsable del plan">
                            <div className="space-y-2.5">
                                {plan.responsableNombre && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{plan.responsableNombre}</p>
                                        {plan.responsableCargo && <p className="text-xs text-slate-500">{plan.responsableCargo}</p>}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {plan.responsableTelefono && (
                                        <a href={`tel:${plan.responsableTelefono}`}
                                           className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors">
                                            <Phone size={12} /> {plan.responsableTelefono}
                                        </a>
                                    )}
                                    {plan.responsableEmail && (
                                        <a href={`mailto:${plan.responsableEmail}`}
                                           className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors">
                                            <Mail size={12} /> {plan.responsableEmail}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </Bloque>
                    )}

                    {/* Autoprotección */}
                    {(plan.aforo || plan.ocupacion || plan.nivelRiesgo || plan.mediosPropios) && (
                        <Bloque icono={Building2} color="text-orange-600" titulo="Datos de autoprotección">
                            <div className="grid grid-cols-3 gap-4 mb-3">
                                <Dato etiqueta="Aforo" valor={plan.aforo ? `${plan.aforo} personas` : '—'} />
                                <Dato etiqueta="Uso" valor={plan.ocupacion || '—'} />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Riesgo</p>
                                    {plan.nivelRiesgo ? (
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${NIVEL_CLASES[plan.nivelRiesgo] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            <ShieldAlert size={11} /> {plan.nivelRiesgo.charAt(0).toUpperCase() + plan.nivelRiesgo.slice(1)}
                                        </span>
                                    ) : <p className="text-sm text-slate-700">—</p>}
                                </div>
                            </div>
                            {plan.mediosPropios && (
                                <div className="pt-3 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Medios propios</p>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{plan.mediosPropios}</p>
                                </div>
                            )}
                        </Bloque>
                    )}

                    {/* Documentos */}
                    <Bloque icono={FileArchive} color="text-blue-600" titulo={`Documentos (${plan.documentos.length})`}>
                        {plan.documentos.length === 0 ? (
                            <p className="text-sm text-slate-400 py-2">Todavía no hay ningún documento adjunto.</p>
                        ) : (
                            <ul className="space-y-2">
                                {plan.documentos.map(doc => (
                                    <li key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-colors group">
                                        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                            <FileText size={15} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{doc.titulo}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {TIPOS_DOCUMENTO.find(t => t.valor === doc.tipo)?.label || doc.tipo} · {pesoLegible(doc.tamano)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Abrir"
                                               className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                                                <ExternalLink size={14} />
                                            </a>
                                            <a href={doc.url} download={doc.nombreArchivo} title="Descargar"
                                               className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                                                <Download size={14} />
                                            </a>
                                            {puedeEditar && (
                                                <button onClick={() => borrarDoc(doc)} title="Eliminar"
                                                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {puedeEditar && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}
                                        className="text-xs border border-slate-300 rounded-lg px-2 py-2 focus:outline-none focus:border-blue-500">
                                    {TIPOS_DOCUMENTO.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                                </select>
                                <input
                                    ref={inputRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp"
                                    onChange={e => { const a = e.target.files?.[0]; if (a) subir(a) }}
                                    className="hidden" id={`subir-${plan.id}`}
                                />
                                <label
                                    htmlFor={`subir-${plan.id}`}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-dashed cursor-pointer transition-colors ${subiendo
                                        ? 'border-slate-200 text-slate-400'
                                        : 'border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50'}`}
                                >
                                    {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    {subiendo ? 'Subiendo…' : 'Añadir documento (PDF o imagen, máx. 25 MB)'}
                                </label>
                            </div>
                        )}
                    </Bloque>

                    {plan.observaciones && (
                        <Bloque icono={FileText} color="text-slate-500" titulo="Observaciones">
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{plan.observaciones}</p>
                        </Bloque>
                    )}

                    {puedeEditar && (
                        <button
                            onClick={alBorrarPlan}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={14} /> Eliminar este plan y sus documentos
                        </button>
                    )}
                </div>
            </aside>
        </div>
    )
}

function Bloque({ icono: Icono, color, titulo, children }: { icono: any; color: string; titulo: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                <Icono size={13} className={color} /> {titulo}
            </h3>
            {children}
        </section>
    )
}

function Dato({ etiqueta, valor, clases = '' }: { etiqueta: string; valor: string; clases?: string }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{etiqueta}</p>
            <p className={`text-sm text-slate-700 ${clases}`}>{valor}</p>
        </div>
    )
}
