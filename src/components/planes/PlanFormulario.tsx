'use client'

import { useState } from 'react'
import { X, Save, Loader2, MapPin, CalendarClock, UserRound, Building2, Info } from 'lucide-react'
import { TIPOS_PLAN, NIVELES_RIESGO, type TipoPlan } from '@/lib/cartografia'

export type PlanEditable = {
    id?: string
    tipo: TipoPlan
    nombre: string
    referencia?: string | null
    descripcion?: string | null
    direccion?: string | null
    latitud?: number | null
    longitud?: number | null
    fechaAprobacion?: string | null
    fechaRevision?: string | null
    organoAprobacion?: string | null
    responsableNombre?: string | null
    responsableCargo?: string | null
    responsableTelefono?: string | null
    responsableEmail?: string | null
    aforo?: number | null
    ocupacion?: string | null
    nivelRiesgo?: string | null
    mediosPropios?: string | null
    observaciones?: string | null
}

const etiqueta = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5'
const campo = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-shadow'

/** Convierte una fecha ISO del servidor a lo que espera <input type="date">. */
function paraInput(v: string | null | undefined): string {
    if (!v) return ''
    return String(v).slice(0, 10)
}

export default function PlanFormulario({
    inicial, alGuardar, alCerrar,
}: {
    inicial: PlanEditable
    alGuardar: (plan: any) => void
    alCerrar: () => void
}) {
    const [f, setF] = useState<PlanEditable>({
        ...inicial,
        fechaAprobacion: paraInput(inicial.fechaAprobacion),
        fechaRevision: paraInput(inicial.fechaRevision),
    })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = <K extends keyof PlanEditable>(k: K, v: PlanEditable[K]) => setF(p => ({ ...p, [k]: v }))
    const esEdificio = f.tipo === 'edificio'
    const esEvento = f.tipo === 'evento'
    const editando = Boolean(inicial.id)

    const guardar = async () => {
        if (!f.nombre?.trim()) { setError('El nombre del plan es obligatorio'); return }
        setGuardando(true); setError(null)
        try {
            const res = await fetch(editando ? `/api/planes/${inicial.id}` : '/api/planes', {
                method: editando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(f),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo guardar el plan'); return }
            alGuardar(data.plan)
        } catch {
            setError('Error de conexión al guardar')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[1300] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
                {/* Cabecera */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {editando ? 'Editar plan' : `Nuevo ${TIPOS_PLAN[f.tipo].singular.toLowerCase()}`}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{TIPOS_PLAN[f.tipo].descripcion}</p>
                    </div>
                    <button onClick={alCerrar} className="text-slate-400 hover:text-slate-700 p-1 -mr-1"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
                    )}

                    {/* Identificación */}
                    <section>
                        <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                            <Info size={13} className="text-blue-600" /> Identificación
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className={etiqueta}>Nombre del plan *</label>
                                <input
                                    value={f.nombre || ''} onChange={e => set('nombre', e.target.value)}
                                    placeholder={esEdificio ? 'CEIP Nuestra Señora de la Encarnación' : esEvento ? 'Plan de la Feria de Bormujos' : 'Plan Territorial de Emergencias de Bormujos'}
                                    className={campo} autoFocus
                                />
                            </div>
                            <div>
                                <label className={etiqueta}>Referencia</label>
                                <input value={f.referencia || ''} onChange={e => set('referencia', e.target.value)} placeholder="Expediente" className={campo} />
                            </div>
                            <div className="col-span-3">
                                <label className={etiqueta}>Descripción</label>
                                <textarea
                                    value={f.descripcion || ''} onChange={e => set('descripcion', e.target.value)}
                                    rows={2} placeholder="Alcance y contenido del plan"
                                    className={`${campo} resize-y`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Emplazamiento */}
                    {(esEdificio || esEvento) && (
                        <section>
                            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                                <MapPin size={13} className="text-emerald-600" /> Emplazamiento
                            </h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-2">
                                    <label className={etiqueta}>Dirección</label>
                                    <input value={f.direccion || ''} onChange={e => set('direccion', e.target.value)} placeholder="Calle, número" className={campo} />
                                </div>
                                <div>
                                    <label className={etiqueta}>Latitud</label>
                                    <input
                                        type="number" step="any" value={f.latitud ?? ''}
                                        onChange={e => set('latitud', e.target.value === '' ? null : Number(e.target.value))}
                                        placeholder="37.3710" className={campo}
                                    />
                                </div>
                                <div>
                                    <label className={etiqueta}>Longitud</label>
                                    <input
                                        type="number" step="any" value={f.longitud ?? ''}
                                        onChange={e => set('longitud', e.target.value === '' ? null : Number(e.target.value))}
                                        placeholder="-6.0719" className={campo}
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">
                                Con las coordenadas puestas, el plan aparece señalado en el mapa de cartografía.
                            </p>
                        </section>
                    )}

                    {/* Vigencia */}
                    <section>
                        <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                            <CalendarClock size={13} className="text-amber-600" /> Vigencia
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={etiqueta}>Fecha de aprobación</label>
                                <input type="date" value={f.fechaAprobacion || ''} onChange={e => set('fechaAprobacion', e.target.value)} className={campo} />
                            </div>
                            <div>
                                <label className={etiqueta}>Próxima revisión</label>
                                <input type="date" value={f.fechaRevision || ''} onChange={e => set('fechaRevision', e.target.value)} className={campo} />
                            </div>
                            <div>
                                <label className={etiqueta}>Órgano que aprueba</label>
                                <input value={f.organoAprobacion || ''} onChange={e => set('organoAprobacion', e.target.value)} placeholder="Pleno municipal" className={campo} />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                            La fecha de próxima revisión es la que dispara el aviso de caducidad, con 90 días de antelación.
                        </p>
                    </section>

                    {/* Responsable */}
                    <section>
                        <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                            <UserRound size={13} className="text-violet-600" /> Responsable del plan
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-2">
                                <label className={etiqueta}>Nombre</label>
                                <input value={f.responsableNombre || ''} onChange={e => set('responsableNombre', e.target.value)} className={campo} />
                            </div>
                            <div className="col-span-2">
                                <label className={etiqueta}>Cargo</label>
                                <input value={f.responsableCargo || ''} onChange={e => set('responsableCargo', e.target.value)} placeholder="Director del plan" className={campo} />
                            </div>
                            <div className="col-span-2">
                                <label className={etiqueta}>Teléfono</label>
                                <input value={f.responsableTelefono || ''} onChange={e => set('responsableTelefono', e.target.value)} className={campo} />
                            </div>
                            <div className="col-span-2">
                                <label className={etiqueta}>Correo electrónico</label>
                                <input type="email" value={f.responsableEmail || ''} onChange={e => set('responsableEmail', e.target.value)} className={campo} />
                            </div>
                        </div>
                    </section>

                    {/* Autoprotección */}
                    {(esEdificio || esEvento) && (
                        <section>
                            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                                <Building2 size={13} className="text-orange-600" /> Datos de autoprotección
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={etiqueta}>Aforo</label>
                                    <input
                                        type="number" min={0} value={f.aforo ?? ''}
                                        onChange={e => set('aforo', e.target.value === '' ? null : Number(e.target.value))}
                                        placeholder="Personas" className={campo}
                                    />
                                </div>
                                <div>
                                    <label className={etiqueta}>{esEvento ? 'Tipo de evento' : 'Uso del edificio'}</label>
                                    <input
                                        value={f.ocupacion || ''} onChange={e => set('ocupacion', e.target.value)}
                                        placeholder={esEvento ? 'Feria, romería…' : 'Docente, deportivo…'} className={campo}
                                    />
                                </div>
                                <div>
                                    <label className={etiqueta}>Nivel de riesgo</label>
                                    <select value={f.nivelRiesgo || ''} onChange={e => set('nivelRiesgo', e.target.value || null)} className={campo}>
                                        <option value="">Sin determinar</option>
                                        {NIVELES_RIESGO.map(n => (
                                            <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className={etiqueta}>Medios propios</label>
                                    <textarea
                                        value={f.mediosPropios || ''} onChange={e => set('mediosPropios', e.target.value)}
                                        rows={2} placeholder="Extintores, BIE, salidas de emergencia, equipo de primera intervención…"
                                        className={`${campo} resize-y`}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    <section>
                        <label className={etiqueta}>Observaciones</label>
                        <textarea value={f.observaciones || ''} onChange={e => set('observaciones', e.target.value)} rows={2} className={`${campo} resize-y`} />
                    </section>
                </div>

                {/* Pie */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button onClick={alCerrar} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={guardar} disabled={guardando}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear plan'}
                    </button>
                </div>
            </div>
        </div>
    )
}
