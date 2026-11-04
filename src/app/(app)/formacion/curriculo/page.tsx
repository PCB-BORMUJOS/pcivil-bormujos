'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
    BookOpen, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Save, X,
    GraduationCap, Clock, Layers, FileText, Video, Link2, Image as ImageIcon,
    FileCheck, AlertTriangle, CheckCircle2, Loader2, Sparkles,
} from 'lucide-react'

// ====================== Tipos ======================
interface Curso { id: string; codigo: string; nombre: string; modalidad?: string; duracionHoras?: number; nivelFormacion?: string; tipo?: string }
interface Recurso { id: string; tipo: string; titulo: string; url: string; orden: number }
interface Leccion { id: string; titulo: string; tipo: string; contenidoHtml?: string | null; duracionMin?: number | null; obligatoria: boolean; orden: number; recursos: Recurso[] }
interface Bloque { id: string; codigo?: string | null; titulo: string; objetivos?: string | null; descripcion?: string | null; horas: number; horasPracticas: number; orden: number; lecciones: Leccion[]; _count?: { examenes: number; actividades: number; accionesPractica: number } }
interface Resumen { totalBloques: number; totalLecciones: number; totalHoras: number; totalPracticas: number; cumpleBasico: boolean }

const TIPOS_RECURSO = [
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'video', label: 'Vídeo', icon: Video },
    { value: 'embed', label: 'Embed (YouTube/Vimeo)', icon: Video },
    { value: 'imagen', label: 'Imagen', icon: ImageIcon },
    { value: 'enlace', label: 'Enlace', icon: Link2 },
]

export default function CurriculoPage() {
    const [cursos, setCursos] = useState<Curso[]>([])
    const [cursoId, setCursoId] = useState<string>('')
    const [curso, setCurso] = useState<Curso | null>(null)
    const [bloques, setBloques] = useState<Bloque[]>([])
    const [resumen, setResumen] = useState<Resumen | null>(null)
    const [loading, setLoading] = useState(false)
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})

    // Estado de modales
    const [modal, setModal] = useState<null | {
        tipo: 'bloque' | 'leccion' | 'recurso'
        modo: 'crear' | 'editar'
        parentId?: string   // cursoId para bloque, bloqueId para lección, leccionId para recurso
        data?: any
    }>(null)

    // ====================== Carga de datos ======================
    const cargarCursos = useCallback(async () => {
        try {
            const res = await fetch('/api/formacion?tipo=cursos')
            if (!res.ok) throw new Error()
            const data = await res.json()
            setCursos(data.cursos || [])
        } catch {
            toast.error('No se pudieron cargar los cursos')
        }
    }, [])

    const cargarCurriculo = useCallback(async (id: string) => {
        if (!id) return
        setLoading(true)
        try {
            const res = await fetch(`/api/formacion/curriculo?cursoId=${id}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error')
            setCurso(data.curso)
            setBloques(data.bloques || [])
            setResumen(data.resumen || null)
        } catch (e: any) {
            toast.error(e.message || 'Error al cargar el currículo')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { cargarCursos() }, [cargarCursos])
    useEffect(() => { if (cursoId) cargarCurriculo(cursoId) }, [cursoId, cargarCurriculo])

    const toggle = (id: string) => setExpandidos((p) => ({ ...p, [id]: !p[id] }))

    // ====================== Plantilla ESPA ======================
    const aplicarPlantillaEspa = async (forzar = false) => {
        if (!cursoId) return
        try {
            const res = await fetch('/api/formacion/curriculo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'plantilla-espa', cursoId, forzar }),
            })
            const data = await res.json()
            if (res.status === 409 && data.requiereConfirmacion) {
                if (confirm('Este curso ya tiene bloques. ¿Añadir igualmente los 6 bloques de la plantilla ESPA?')) {
                    return aplicarPlantillaEspa(true)
                }
                return
            }
            if (!res.ok) throw new Error(data.error || 'Error')
            toast.success(`Plantilla ESPA aplicada: ${data.creados} bloques`)
            cargarCurriculo(cursoId)
        } catch (e: any) {
            toast.error(e.message || 'No se pudo aplicar la plantilla')
        }
    }

    // ====================== Guardar (crear/editar) ======================
    const guardar = async (payload: any, modo: 'crear' | 'editar') => {
        try {
            const res = await fetch('/api/formacion/curriculo', {
                method: modo === 'crear' ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error')
            toast.success(modo === 'crear' ? 'Creado' : 'Guardado')
            setModal(null)
            cargarCurriculo(cursoId)
        } catch (e: any) {
            toast.error(e.message || 'Error al guardar')
        }
    }

    const eliminar = async (tipo: 'bloque' | 'leccion' | 'recurso', id: string, nombre: string) => {
        if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
        try {
            const res = await fetch(`/api/formacion/curriculo?tipo=${tipo}&id=${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error')
            toast.success('Eliminado')
            cargarCurriculo(cursoId)
        } catch (e: any) {
            toast.error(e.message || 'Error al eliminar')
        }
    }

    // ====================== Render ======================
    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-green-100 text-green-700">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Currículo de formación</h1>
                        <p className="text-sm text-gray-500">Define los bloques temáticos, lecciones y recursos de cada curso</p>
                    </div>
                </div>
            </div>

            {/* Selector de curso */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Curso</label>
                <select
                    value={cursoId}
                    onChange={(e) => setCursoId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                    <option value="">— Selecciona un curso —</option>
                    {cursos.map((c) => (
                        <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-16 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando currículo…
                </div>
            )}

            {!loading && cursoId && curso && (
                <>
                    {/* Resumen + validación ESPA */}
                    {resumen && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <StatCard icon={Layers} label="Bloques" value={resumen.totalBloques} />
                            <StatCard icon={BookOpen} label="Lecciones" value={resumen.totalLecciones} />
                            <StatCard icon={Clock} label="Horas totales" value={`${resumen.totalHoras} h`} />
                            <StatCard icon={FileCheck} label="Horas prácticas" value={`${resumen.totalPracticas} h`} />
                        </div>
                    )}

                    {resumen && (
                        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 mb-6 text-sm ${resumen.cumpleBasico ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                            {resumen.cumpleBasico ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                            <span>
                                {resumen.cumpleBasico
                                    ? 'Cumple los mínimos ESPA del curso básico (≥ 45 h totales y ≥ 13 h prácticas).'
                                    : `No cumple aún los mínimos ESPA del curso básico: se exigen ≥ 45 h totales (ahora ${resumen.totalHoras} h) y ≥ 13 h prácticas (ahora ${resumen.totalPracticas} h).`}
                            </span>
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setModal({ tipo: 'bloque', modo: 'crear', parentId: cursoId })}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                        >
                            <Plus className="w-4 h-4" /> Añadir bloque
                        </button>
                        {bloques.length === 0 && (
                            <button
                                onClick={() => aplicarPlantillaEspa(false)}
                                className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium px-4 py-2 rounded-lg border border-emerald-200"
                            >
                                <Sparkles className="w-4 h-4" /> Plantilla ESPA (curso básico)
                            </button>
                        )}
                    </div>

                    {/* Lista de bloques */}
                    {bloques.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                            <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Este curso aún no tiene bloques temáticos.</p>
                            <p className="text-sm">Añade uno o usa la plantilla ESPA del curso básico.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bloques.map((b) => (
                                <div key={b.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    {/* Cabecera del bloque */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                                        <button onClick={() => toggle(b.id)} className="text-gray-500 hover:text-gray-700">
                                            {expandidos[b.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {b.codigo && <span className="text-xs font-mono bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{b.codigo}</span>}
                                                <span className="font-semibold text-gray-900 truncate">{b.titulo}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {b.horas} h ({b.horasPracticas} h prácticas) · {b.lecciones.length} lecciones
                                            </div>
                                        </div>
                                        <button onClick={() => setModal({ tipo: 'bloque', modo: 'editar', data: b })} className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => eliminar('bloque', b.id, b.titulo)} className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4" /></button>
                                    </div>

                                    {/* Contenido del bloque */}
                                    {expandidos[b.id] && (
                                        <div className="px-4 py-3 space-y-2">
                                            {b.objetivos && <p className="text-sm text-gray-600 italic">{b.objetivos}</p>}

                                            {b.lecciones.length === 0 && <p className="text-sm text-gray-400">Sin lecciones todavía.</p>}

                                            {b.lecciones.map((l) => (
                                                <div key={l.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/60">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-green-600 shrink-0" />
                                                        <span className="font-medium text-gray-800 flex-1 truncate">{l.titulo}</span>
                                                        <span className="text-xs text-gray-400">{l.tipo}{l.duracionMin ? ` · ${l.duracionMin} min` : ''}</span>
                                                        <button onClick={() => setModal({ tipo: 'leccion', modo: 'editar', data: l })} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => eliminar('leccion', l.id, l.titulo)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>

                                                    {/* Recursos */}
                                                    {l.recursos.length > 0 && (
                                                        <ul className="mt-2 ml-6 space-y-1">
                                                            {l.recursos.map((r) => (
                                                                <li key={r.id} className="flex items-center gap-2 text-sm text-gray-600">
                                                                    <Link2 className="w-3.5 h-3.5 text-gray-400" />
                                                                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{r.titulo}</a>
                                                                    <span className="text-xs text-gray-400">({r.tipo})</span>
                                                                    <button onClick={() => eliminar('recurso', r.id, r.titulo)} className="p-0.5 text-gray-300 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}

                                                    <button
                                                        onClick={() => setModal({ tipo: 'recurso', modo: 'crear', parentId: l.id })}
                                                        className="mt-2 ml-6 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Añadir recurso
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => setModal({ tipo: 'leccion', modo: 'crear', parentId: b.id })}
                                                className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800 font-medium mt-1"
                                            >
                                                <Plus className="w-4 h-4" /> Añadir lección
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {modal && (
                <ModalEditor
                    modal={modal}
                    onClose={() => setModal(null)}
                    onSave={guardar}
                />
            )}
        </div>
    )
}

// ====================== Componentes auxiliares ======================
function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600"><Icon className="w-5 h-5" /></div>
            <div>
                <div className="text-lg font-bold text-gray-900 leading-none">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
            </div>
        </div>
    )
}

function ModalEditor({ modal, onClose, onSave }: {
    modal: { tipo: 'bloque' | 'leccion' | 'recurso'; modo: 'crear' | 'editar'; parentId?: string; data?: any }
    onClose: () => void
    onSave: (payload: any, modo: 'crear' | 'editar') => void
}) {
    const d = modal.data || {}
    const [form, setForm] = useState<any>({
        titulo: d.titulo || '',
        codigo: d.codigo || '',
        objetivos: d.objetivos || '',
        descripcion: d.descripcion || '',
        horas: d.horas ?? '',
        horasPracticas: d.horasPracticas ?? '',
        tipoLeccion: d.tipo || 'contenido',
        contenidoHtml: d.contenidoHtml || '',
        duracionMin: d.duracionMin ?? '',
        obligatoria: d.obligatoria ?? true,
        tipoRecurso: d.tipo || 'enlace',
        url: d.url || '',
    })
    const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

    const submit = () => {
        if (!form.titulo.trim()) { toast.error('El título es obligatorio'); return }
        let payload: any = { tipo: modal.tipo }
        if (modal.modo === 'editar') payload.id = modal.data.id

        if (modal.tipo === 'bloque') {
            if (modal.modo === 'crear') payload.cursoId = modal.parentId
            payload = { ...payload, titulo: form.titulo, codigo: form.codigo, objetivos: form.objetivos, descripcion: form.descripcion, horas: form.horas, horasPracticas: form.horasPracticas }
        } else if (modal.tipo === 'leccion') {
            if (modal.modo === 'crear') payload.bloqueId = modal.parentId
            payload = { ...payload, titulo: form.titulo, tipoLeccion: form.tipoLeccion, contenidoHtml: form.contenidoHtml, duracionMin: form.duracionMin, obligatoria: form.obligatoria }
        } else {
            if (modal.modo === 'crear') payload.leccionId = modal.parentId
            if (!form.url.trim()) { toast.error('La URL del recurso es obligatoria'); return }
            payload = { ...payload, titulo: form.titulo, tipoRecurso: form.tipoRecurso, url: form.url }
        }
        onSave(payload, modal.modo)
    }

    const titulos = { bloque: 'bloque temático', leccion: 'lección', recurso: 'recurso' }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                        {modal.modo === 'crear' ? 'Nuevo' : 'Editar'} {titulos[modal.tipo]}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <Field label="Título">
                        <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className={inputCls} autoFocus />
                    </Field>

                    {modal.tipo === 'bloque' && (
                        <>
                            <Field label="Código (opcional)">
                                <input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="B1, B2…" className={inputCls} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Horas totales">
                                    <input type="number" min="0" step="0.5" value={form.horas} onChange={(e) => set('horas', e.target.value)} className={inputCls} />
                                </Field>
                                <Field label="Horas prácticas">
                                    <input type="number" min="0" step="0.5" value={form.horasPracticas} onChange={(e) => set('horasPracticas', e.target.value)} className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Objetivos (opcional)">
                                <textarea value={form.objetivos} onChange={(e) => set('objetivos', e.target.value)} rows={2} className={inputCls} />
                            </Field>
                        </>
                    )}

                    {modal.tipo === 'leccion' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Tipo">
                                    <select value={form.tipoLeccion} onChange={(e) => set('tipoLeccion', e.target.value)} className={inputCls}>
                                        <option value="contenido">Contenido</option>
                                        <option value="video">Vídeo</option>
                                        <option value="documento">Documento</option>
                                        <option value="mixto">Mixto</option>
                                    </select>
                                </Field>
                                <Field label="Duración (min)">
                                    <input type="number" min="0" value={form.duracionMin} onChange={(e) => set('duracionMin', e.target.value)} className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Contenido (HTML)">
                                <textarea value={form.contenidoHtml} onChange={(e) => set('contenidoHtml', e.target.value)} rows={6} placeholder="Texto del contenido didáctico (admite HTML)…" className={`${inputCls} font-mono text-xs`} />
                            </Field>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={form.obligatoria} onChange={(e) => set('obligatoria', e.target.checked)} className="rounded" />
                                Lección obligatoria
                            </label>
                        </>
                    )}

                    {modal.tipo === 'recurso' && (
                        <>
                            <Field label="Tipo de recurso">
                                <select value={form.tipoRecurso} onChange={(e) => set('tipoRecurso', e.target.value)} className={inputCls}>
                                    {TIPOS_RECURSO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </Field>
                            <Field label="URL">
                                <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" className={inputCls} />
                            </Field>
                            <p className="text-xs text-gray-400">En esta fase los recursos se añaden por URL o embed. La subida de archivos a almacenamiento llega en la siguiente fase.</p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button onClick={submit} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500'

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    )
}
