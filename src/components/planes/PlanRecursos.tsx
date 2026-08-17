'use client'

import { useMemo, useState } from 'react'
import {
    Plus, Trash2, Pencil, X, Loader2, Save, MapPin, Phone, Boxes,
    Users, Truck, Package, Building2,
} from 'lucide-react'
import { TIPOS_RECURSO, CLASES_RECURSO } from '@/lib/cartografia'

export type Recurso = {
    id: string
    tipo: string
    denominacion: string
    titular: string | null
    ubicacion: string | null
    cantidad: number | null
    unidad: string | null
    contacto: string | null
    telefono: string | null
    disponibilidad: string | null
    observaciones: string | null
}

const ICONOS: Record<string, any> = {
    humano: Users, vehiculo: Truck, material: Package, instalacion: Building2, otro: Boxes,
}

const campo = 'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
const etiqueta = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1'

export default function PlanRecursos({
    planId, recursos, puedeEditar, alCambiar,
}: {
    planId: string
    recursos: Recurso[]
    puedeEditar: boolean
    alCambiar: (recursos: Recurso[]) => void
}) {
    const [editando, setEditando] = useState<Partial<Recurso> | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const porTipo = useMemo(() =>
        TIPOS_RECURSO
            .map(t => ({ ...t, lista: recursos.filter(r => r.tipo === t.valor) }))
            .filter(t => t.lista.length > 0), [recursos])

    const guardar = async () => {
        if (!editando?.denominacion?.trim()) { setError('La denominación es obligatoria'); return }
        setGuardando(true); setError(null)
        try {
            const esNuevo = !editando.id
            const url = esNuevo
                ? `/api/planes/${planId}/recursos`
                : `/api/planes/${planId}/recursos?recursoId=${editando.id}`
            const res = await fetch(url, {
                method: esNuevo ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editando),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo guardar'); return }
            alCambiar(esNuevo
                ? [...recursos, data.recurso]
                : recursos.map(r => (r.id === data.recurso.id ? data.recurso : r)))
            setEditando(null)
        } catch {
            setError('Error de conexión')
        } finally {
            setGuardando(false)
        }
    }

    const borrar = async (r: Recurso) => {
        if (!confirm(`¿Eliminar "${r.denominacion}" del catálogo de medios?`)) return
        const res = await fetch(`/api/planes/${planId}/recursos?recursoId=${r.id}`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'No se pudo eliminar'); return }
        alCambiar(recursos.filter(x => x.id !== r.id))
    }

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

            {recursos.length === 0 && !editando && (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 py-10 px-6 text-center">
                    <span className="inline-flex w-12 h-12 rounded-xl bg-slate-100 text-slate-400 items-center justify-center mb-3">
                        <Boxes size={22} />
                    </span>
                    <h4 className="text-sm font-bold text-slate-700">Catálogo vacío</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Aquí se inventaría con qué se cuenta para este plan: personal, vehículos, material
                        e instalaciones, con su titular, ubicación y disponibilidad.
                    </p>
                </div>
            )}

            {porTipo.map(t => {
                const Icono = ICONOS[t.valor] || Boxes
                const total = t.lista.reduce((s, r) => s + (r.cantidad ?? 0), 0)
                return (
                    <section key={t.valor}>
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Icono size={12} /> {t.label}
                            <span className="text-slate-400 font-semibold normal-case">
                                ({t.lista.length}{total > 0 ? ` · ${total} uds.` : ''})
                            </span>
                        </h4>
                        <ul className="space-y-2">
                            {t.lista.map(r => (
                                <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-slate-800">{r.denominacion}</p>
                                                {r.cantidad !== null && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${CLASES_RECURSO[r.tipo] || CLASES_RECURSO.otro}`}>
                                                        {r.cantidad}{r.unidad ? ` ${r.unidad}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            {r.titular && <p className="text-xs text-slate-500 mt-0.5">Titular: {r.titular}</p>}
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                                                {r.ubicacion && <span className="inline-flex items-center gap-1"><MapPin size={10} /> {r.ubicacion}</span>}
                                                {r.disponibilidad && <span>· {r.disponibilidad}</span>}
                                            </div>
                                            {(r.contacto || r.telefono) && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {r.telefono && (
                                                        <a href={`tel:${r.telefono}`}
                                                           className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1">
                                                            <Phone size={11} /> {r.contacto ? `${r.contacto} · ` : ''}{r.telefono}
                                                        </a>
                                                    )}
                                                    {!r.telefono && r.contacto && (
                                                        <span className="text-xs text-slate-500">Contacto: {r.contacto}</span>
                                                    )}
                                                </div>
                                            )}
                                            {r.observaciones && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{r.observaciones}</p>}
                                        </div>
                                        {puedeEditar && (
                                            <div className="flex gap-0.5 flex-shrink-0">
                                                <button onClick={() => { setEditando(r); setError(null) }} title="Editar"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => borrar(r)} title="Eliminar"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )
            })}

            {puedeEditar && !editando && (
                <button
                    onClick={() => { setEditando({ tipo: 'material' }); setError(null) }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                >
                    <Plus size={15} /> Añadir medio al catálogo
                </button>
            )}

            {editando && (
                <div className="bg-white rounded-xl border-2 border-emerald-300 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">{editando.id ? 'Editar medio' : 'Nuevo medio'}</h4>
                        <button onClick={() => { setEditando(null); setError(null) }} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                            <label className={etiqueta}>Denominación *</label>
                            <input value={editando.denominacion || ''} onChange={e => setEditando(p => ({ ...p!, denominacion: e.target.value }))}
                                   placeholder="Vehículo de intervención rápida" className={campo} autoFocus />
                        </div>
                        <div>
                            <label className={etiqueta}>Tipo</label>
                            <select value={editando.tipo || 'material'} onChange={e => setEditando(p => ({ ...p!, tipo: e.target.value }))} className={campo}>
                                {TIPOS_RECURSO.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Titular</label>
                            <input value={editando.titular || ''} onChange={e => setEditando(p => ({ ...p!, titular: e.target.value }))}
                                   placeholder="Protección Civil, Ayuntamiento…" className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Cantidad</label>
                            <input type="number" min={0} value={editando.cantidad ?? ''}
                                   onChange={e => setEditando(p => ({ ...p!, cantidad: e.target.value === '' ? null : Number(e.target.value) }))}
                                   className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Unidad</label>
                            <input value={editando.unidad || ''} onChange={e => setEditando(p => ({ ...p!, unidad: e.target.value }))}
                                   placeholder="uds., personas" className={campo} />
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Ubicación</label>
                            <input value={editando.ubicacion || ''} onChange={e => setEditando(p => ({ ...p!, ubicacion: e.target.value }))} className={campo} />
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Disponibilidad</label>
                            <input value={editando.disponibilidad || ''} onChange={e => setEditando(p => ({ ...p!, disponibilidad: e.target.value }))}
                                   placeholder="Permanente, bajo aviso…" className={campo} />
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Persona de contacto</label>
                            <input value={editando.contacto || ''} onChange={e => setEditando(p => ({ ...p!, contacto: e.target.value }))} className={campo} />
                        </div>
                        <div className="col-span-2">
                            <label className={etiqueta}>Teléfono</label>
                            <input value={editando.telefono || ''} onChange={e => setEditando(p => ({ ...p!, telefono: e.target.value }))} className={campo} />
                        </div>
                        <div className="col-span-4">
                            <label className={etiqueta}>Observaciones</label>
                            <input value={editando.observaciones || ''} onChange={e => setEditando(p => ({ ...p!, observaciones: e.target.value }))} className={campo} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => { setEditando(null); setError(null) }} className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button onClick={guardar} disabled={guardando}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
