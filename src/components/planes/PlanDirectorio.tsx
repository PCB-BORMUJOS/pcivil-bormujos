'use client'

import { useMemo, useState } from 'react'
import {
    Plus, Phone, Mail, Trash2, Pencil, Star, X, Loader2, Save, Clock, BookUser,
} from 'lucide-react'
import { CATEGORIAS_CONTACTO, CLASES_CATEGORIA } from '@/lib/cartografia'

export type Contacto = {
    id: string
    nombre: string
    cargo: string | null
    entidad: string | null
    categoria: string
    telefono: string | null
    telefonoAlt: string | null
    email: string | null
    disponibilidad: string | null
    notas: string | null
    prioritario: boolean
}

const campo = 'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
const etiqueta = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1'

export default function PlanDirectorio({
    planId, contactos, puedeEditar, alCambiar,
}: {
    planId: string
    contactos: Contacto[]
    puedeEditar: boolean
    alCambiar: (contactos: Contacto[]) => void
}) {
    const [editando, setEditando] = useState<Partial<Contacto> | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const porCategoria = useMemo(() => {
        return CATEGORIAS_CONTACTO
            .map(c => ({ ...c, lista: contactos.filter(x => x.categoria === c.valor) }))
            .filter(c => c.lista.length > 0)
    }, [contactos])

    const guardar = async () => {
        if (!editando?.nombre?.trim()) { setError('El nombre es obligatorio'); return }
        if (!editando.telefono?.trim() && !editando.telefonoAlt?.trim() && !editando.email?.trim()) {
            setError('Indica al menos un teléfono o un correo'); return
        }
        setGuardando(true); setError(null)
        try {
            const esNuevo = !editando.id
            const url = esNuevo
                ? `/api/planes/${planId}/directorio`
                : `/api/planes/${planId}/directorio?contactoId=${editando.id}`
            const res = await fetch(url, {
                method: esNuevo ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editando),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo guardar'); return }
            alCambiar(esNuevo
                ? [...contactos, data.contacto]
                : contactos.map(c => (c.id === data.contacto.id ? data.contacto : c)))
            setEditando(null)
        } catch {
            setError('Error de conexión')
        } finally {
            setGuardando(false)
        }
    }

    const borrar = async (c: Contacto) => {
        if (!confirm(`¿Eliminar a "${c.nombre}" del directorio?`)) return
        const res = await fetch(`/api/planes/${planId}/directorio?contactoId=${c.id}`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'No se pudo eliminar'); return }
        alCambiar(contactos.filter(x => x.id !== c.id))
    }

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

            {contactos.length === 0 && !editando && (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 py-10 px-6 text-center">
                    <span className="inline-flex w-12 h-12 rounded-xl bg-slate-100 text-slate-400 items-center justify-center mb-3">
                        <BookUser size={22} />
                    </span>
                    <h4 className="text-sm font-bold text-slate-700">Directorio vacío</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Aquí van los teléfonos a los que hay que llamar al activar el plan: dirección, servicios
                        operativos, sanitarios y suministros.
                    </p>
                </div>
            )}

            {porCategoria.map(cat => (
                <section key={cat.valor}>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">{cat.label}</h4>
                    <ul className="space-y-2">
                        {cat.lista.map(c => (
                            <li key={c.id} className={`rounded-xl border p-3 bg-white ${c.prioritario ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                            {c.prioritario && <Star size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                                            {c.nombre}
                                        </p>
                                        {(c.cargo || c.entidad) && (
                                            <p className="text-xs text-slate-500">
                                                {[c.cargo, c.entidad].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                        {c.disponibilidad && (
                                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} /> {c.disponibilidad}
                                            </p>
                                        )}
                                    </div>
                                    {puedeEditar && (
                                        <div className="flex gap-0.5 flex-shrink-0">
                                            <button onClick={() => { setEditando(c); setError(null) }} title="Editar"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => borrar(c)} title="Eliminar"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {[c.telefono, c.telefonoAlt].filter(Boolean).map((t, i) => (
                                        <a key={i} href={`tel:${t}`}
                                           className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors">
                                            <Phone size={11} /> {t}
                                        </a>
                                    ))}
                                    {c.email && (
                                        <a href={`mailto:${c.email}`}
                                           className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1 transition-colors">
                                            <Mail size={11} /> {c.email}
                                        </a>
                                    )}
                                </div>
                                {c.notas && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{c.notas}</p>}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {puedeEditar && !editando && (
                <button
                    onClick={() => { setEditando({ categoria: 'operativos', prioritario: false }); setError(null) }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                    <Plus size={15} /> Añadir contacto al directorio
                </button>
            )}

            {editando && (
                <div className="bg-white rounded-xl border-2 border-blue-300 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">{editando.id ? 'Editar contacto' : 'Nuevo contacto'}</h4>
                        <button onClick={() => { setEditando(null); setError(null) }} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className={etiqueta}>Nombre *</label>
                            <input value={editando.nombre || ''} onChange={e => setEditando(p => ({ ...p!, nombre: e.target.value }))} className={campo} autoFocus />
                        </div>
                        <div>
                            <label className={etiqueta}>Cargo</label>
                            <input value={editando.cargo || ''} onChange={e => setEditando(p => ({ ...p!, cargo: e.target.value }))} className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Entidad</label>
                            <input value={editando.entidad || ''} onChange={e => setEditando(p => ({ ...p!, entidad: e.target.value }))} placeholder="Policía Local, 112…" className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Teléfono</label>
                            <input value={editando.telefono || ''} onChange={e => setEditando(p => ({ ...p!, telefono: e.target.value }))} className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Teléfono alternativo</label>
                            <input value={editando.telefonoAlt || ''} onChange={e => setEditando(p => ({ ...p!, telefonoAlt: e.target.value }))} className={campo} />
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Correo electrónico</label>
                            <input type="email" value={editando.email || ''} onChange={e => setEditando(p => ({ ...p!, email: e.target.value }))} className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Categoría</label>
                            <select value={editando.categoria || 'otros'} onChange={e => setEditando(p => ({ ...p!, categoria: e.target.value }))} className={campo}>
                                {CATEGORIAS_CONTACTO.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={etiqueta}>Disponibilidad</label>
                            <input value={editando.disponibilidad || ''} onChange={e => setEditando(p => ({ ...p!, disponibilidad: e.target.value }))} placeholder="24 h, L-V 8:00-15:00…" className={campo} />
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Notas</label>
                            <input value={editando.notas || ''} onChange={e => setEditando(p => ({ ...p!, notas: e.target.value }))} className={campo} />
                        </div>
                        <label className="col-span-2 flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={Boolean(editando.prioritario)}
                                   onChange={e => setEditando(p => ({ ...p!, prioritario: e.target.checked }))}
                                   className="accent-amber-500 w-4 h-4" />
                            <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                <Star size={12} className="text-amber-500" /> Aviso inmediato al activar el plan
                            </span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => { setEditando(null); setError(null) }} className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button onClick={guardar} disabled={guardando}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
