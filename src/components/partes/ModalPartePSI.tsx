'use client'
import { useState, useEffect } from 'react'
import { X, Save, FileText, Image as ImageIcon, ChevronRight, AlertTriangle } from 'lucide-react'
import SignatureCanvas from './SignatureCanvas'
import { TIPOLOGIAS_PSI, CIRCULACION_OPTIONS, WALKIES_BASE } from '@/constants/partesPSI'

import { validarPartePSI } from '@/lib/psi-validation'
import { format } from 'date-fns'

// Note: obtenerListaWalkies is async and uses prisma, so it must be server side or called via API. 
// We will mock/fetch it in useEffect.

interface ModalPartePSIProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: any) => Promise<void>
    parteEditar?: any
}

export default function ModalPartePSI({
    isOpen,
    onClose,
    onSave,
    parteEditar
}: ModalPartePSIProps) {
    const [pagina, setPagina] = useState(1)
    const [loading, setLoading] = useState(false)
    const [guardando, setGuardando] = useState(false)

    // Data auxiliar
    const [indicativosTurno, setIndicativosTurno] = useState<string[]>([])
    const [walkies, setWalkies] = useState<string[]>(['W-01']) // Default fallback
    const [vehiculos, setVehiculos] = useState<any[]>([])

    const [formData, setFormData] = useState<any>({
        lugar: '',
        motivo: '',
        alertante: '',
        horaLlamada: '',
        horaSalida: '',
        horaLlegada: '',
        horaTerminado: '',
        horaDisponible: '',
        vehiculosIds: [],
        equipoWalkies: [{ equipo: '', walkie: '' }],
        circulacion: 'intervencion',
        matriculasImplicados: '',
        policiaLocal: '',
        guardiaCivil: '',
        tipologias: [],
        tipologiasOtrosTexto: {},
        posiblesCausas: '',
        tieneHeridos: false,
        numeroHeridos: null,
        tieneFallecidos: false,
        numeroFallecidos: null,
        indicativosInforman: '',
        descripcionAccidente: '',
        observaciones: '',
        indicativoCumplimenta: '',
        firmaIndicativoCumplimenta: '',
        responsableTurno: '',
        firmaResponsableTurno: '',
        firmaJefeServicio: '',
        tipoFirmaJefe: null,
        desarrolloDetallado: '',
        fotos: [] // Array of strings (base64 or url)
    })

    useEffect(() => {
        if (isOpen) {
            // Cargar datos auxiliares
            fetch('/api/vehiculos').then(res => res.json()).then(data => {
                if (data.vehiculos) setVehiculos(data.vehiculos)
            }).catch(err => console.error(err))

            // Fetch indicativos from API
            fetch('/api/indicativos').then(res => res.json()).then(data => {
                if (data.indicativos) setIndicativosTurno(data.indicativos)
            }).catch(err => {
                console.error(err)
                // Fallback to hardcoded list
                setIndicativosTurno(['J-44', 'B-01', 'B-13', 'B-15', 'B-20'])
            })

            // Set walkies from constant
            setWalkies(WALKIES_BASE as unknown as string[])

            if (parteEditar) {
                setFormData(parteEditar)
            } else {
                // Auto-fill time
                const now = new Date()
                const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                setFormData((prev: any) => ({ ...prev, horaLlamada: time }))

                // Recover draft
                const draft = localStorage.getItem('borrador_parte_psi')
                if (draft) {
                    if (confirm('Se encontró un borrador guardado. ¿Desea recuperarlo?')) {
                        setFormData(JSON.parse(draft))
                    }
                }
            }
        }
    }, [isOpen, parteEditar])

    // Autosave
    useEffect(() => {
        if (!isOpen || parteEditar) return
        const interval = setInterval(() => {
            localStorage.setItem('borrador_parte_psi', JSON.stringify(formData))
        }, 30000)
        return () => clearInterval(interval)
    }, [formData, isOpen, parteEditar])

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }))
    }

    const handleCheckboxChange = (group: string, id: string, checked: boolean) => {
        // Tipologias is a single array of strings (IDs)
        setFormData((prev: any) => {
            const current = prev.tipologias || []
            if (checked) {
                return { ...prev, tipologias: [...current, id] }
            } else {
                return { ...prev, tipologias: current.filter((t: string) => t !== id) }
            }
        })
    }

    const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            // Compress logic would go here
            const reader = new FileReader()
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setFormData((prev: any) => ({
                        ...prev,
                        fotos: [...(prev.fotos || []), ev.target!.result]
                    }))
                }
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async () => {
        // Validar
        // We can't use the server-side validation function easily here without importing it.
        // Basic validation:
        if (!formData.lugar) {
            alert('Falta el Lugar')
            return
        }

        // Check J-44 signature
        if (!formData.firmaJefeServicio) {
            if (!confirm('⚠️ AVISO: El parte se guardará sin el VB del Jefe de Servicio.\n¿Desea continuar?')) {
                return
            }
        }

        setGuardando(true)
        try {
            await onSave(formData)
            localStorage.removeItem('borrador_parte_psi')
            onClose()
        } catch (e) {
            console.error(e)
            alert('Error al guardar')
        } finally {
            setGuardando(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl">
                {/* HEADER */}
                <div className="bg-slate-800 p-6 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            PSI - PARTE DE SERVICIO E INTERVENCIÓN
                        </h2>
                        <p className="text-slate-300 text-sm mt-1">PROTECCIÓN CIVIL BORMUJOS</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-300 transition-colors"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* TABS */}
                <div className="bg-slate-100 p-3 flex gap-2 border-b overflow-x-auto">
                    {[1, 2, 3].map(p => (
                        <button
                            key={p}
                            onClick={() => setPagina(p)}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${pagina === p
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Página {p}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-8">
                    {pagina === 1 && (
                        <div className="space-y-6">
                            {/* SECCION 1: IDENTIFICACION (Solo lectura o auto) */}

                            {/* SECCION 2: PAUTAS TIEMPO */}
                            <Section title="Pautas de Tiempo">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <Input label="Hora Llamada" type="time" value={formData.horaLlamada} onChange={v => handleChange('horaLlamada', v)} />
                                    <Input label="Hora Salida" type="time" value={formData.horaSalida} onChange={v => handleChange('horaSalida', v)} />
                                    <Input label="Hora Llegada" type="time" value={formData.horaLlegada} onChange={v => handleChange('horaLlegada', v)} />
                                    <Input label="Hora Terminado" type="time" value={formData.horaTerminado} onChange={v => handleChange('horaTerminado', v)} />
                                    <Input label="Hora Disponible" type="time" value={formData.horaDisponible} onChange={v => handleChange('horaDisponible', v)} />
                                </div>
                            </Section>

                            {/* SECCION 3: DATOS SERVICIO */}
                            <Section title="Datos del Servicio">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input label="Lugar *" value={formData.lugar} onChange={v => handleChange('lugar', v)} className="md:col-span-1" />
                                    <Input label="Motivo" value={formData.motivo} onChange={v => handleChange('motivo', v)} />
                                    <Input label="Alertante" value={formData.alertante} onChange={v => handleChange('alertante', v)} />
                                </div>
                            </Section>

                            {/* SECCION 4: VEHICULOS */}
                            <Section title="Vehículos">
                                {/* Multi-select logic is complex, simplify for now */}
                                <div className="flex flex-wrap gap-4">
                                    {vehiculos.map((v: any) => (
                                        <label key={v.id} className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={formData.vehiculosIds?.includes(v.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        vehiculosIds: checked
                                                            ? [...(prev.vehiculosIds || []), v.id]
                                                            : (prev.vehiculosIds || []).filter((id: string) => id !== v.id)
                                                    }))
                                                }}
                                            />
                                            <span className="text-sm font-medium">{v.indicativo || v.matricula}</span>
                                        </label>
                                    ))}
                                    {vehiculos.length === 0 && <p className="text-sm text-gray-500">Cargando vehículos...</p>}
                                </div>
                            </Section>

                            {/* SECCION 5: EQUIPO Y WALKIES */}
                            <Section title="Equipo y Walkies">
                                {formData.equipoWalkies.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-end">
                                        <Select
                                            label="Equipo/Voluntario"
                                            value={item.equipo}
                                            onChange={v => {
                                                const newArr = [...formData.equipoWalkies]
                                                newArr[idx].equipo = v
                                                handleChange('equipoWalkies', newArr)
                                            }}
                                            options={indicativosTurno}
                                        />
                                        <Select
                                            label="Walkie"
                                            value={item.walkie}
                                            onChange={v => {
                                                const newArr = [...formData.equipoWalkies]
                                                newArr[idx].walkie = v
                                                handleChange('equipoWalkies', newArr)
                                            }}
                                            options={walkies}
                                        />
                                        <button
                                            onClick={() => {
                                                const newArr = formData.equipoWalkies.filter((_: any, i: number) => i !== idx)
                                                handleChange('equipoWalkies', newArr)
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => handleChange('equipoWalkies', [...formData.equipoWalkies, { equipo: '', walkie: '' }])}
                                    className="text-sm text-blue-600 hover:underline mt-1"
                                >
                                    + Añadir fila
                                </button>
                            </Section>

                            {/* SECCION 6: CIRCULACION */}
                            <Section title="Circulación">
                                <div className="flex gap-6">
                                    {CIRCULACION_OPTIONS.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="circulacion"
                                                value={opt.value}
                                                checked={formData.circulacion === opt.value}
                                                onChange={e => handleChange('circulacion', e.target.value)}
                                                className="w-4 h-4 text-orange-500"
                                            />
                                            <span className="text-sm font-medium">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </Section>

                            {/* SECCION 7: MATRICULAS VEHICULOS IMPLICADOS */}
                            <Section title="Matrículas Vehículos Implicados (Accidente de Tráfico)">
                                <Input
                                    label="Matrículas (separadas por comas)"
                                    value={formData.matriculasImplicados}
                                    onChange={v => handleChange('matriculasImplicados', v)}
                                    placeholder="Ej: 1234ABC, 5678DEF"
                                />
                            </Section>

                            {/* SECCION 8: AUTORIDADES QUE INTERVIENEN */}
                            <Section title="Autoridad que Interviene">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Policía Local de..."
                                        value={formData.policiaLocal}
                                        onChange={v => handleChange('policiaLocal', v)}
                                        placeholder="Nombre del municipio"
                                    />
                                    <Input
                                        label="Guardia Civil de..."
                                        value={formData.guardiaCivil}
                                        onChange={v => handleChange('guardiaCivil', v)}
                                        placeholder="Nombre del puesto"
                                    />
                                </div>
                            </Section>

                            {/* SECCION 9: POSIBLES CAUSAS */}
                            <Section title="Posibles Causas">
                                <textarea
                                    className="w-full border rounded-lg p-3 h-20 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                    placeholder="Descripción de las posibles causas del incidente..."
                                    value={formData.posiblesCausas}
                                    onChange={e => handleChange('posiblesCausas', e.target.value)}
                                />
                            </Section>

                            {/* SECCION 10: ACCIDENTES DE TRAFICO - HERIDOS/FALLECIDOS */}
                            <Section title="En Accidentes de Tráfico">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Heridos */}
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <h4 className="font-semibold text-sm mb-3">Heridos</h4>
                                        <div className="flex gap-4 mb-3">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={formData.tieneHeridos === true}
                                                    onChange={() => handleChange('tieneHeridos', true)}
                                                />
                                                <span className="text-sm">Sí</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={formData.tieneHeridos === false}
                                                    onChange={() => handleChange('tieneHeridos', false)}
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                        </div>
                                        {formData.tieneHeridos && (
                                            <Input
                                                label="Número de heridos"
                                                type="number"
                                                value={formData.numeroHeridos || ''}
                                                onChange={v => handleChange('numeroHeridos', parseInt(v) || null)}
                                            />
                                        )}
                                    </div>

                                    {/* Fallecidos */}
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <h4 className="font-semibold text-sm mb-3">Fallecidos</h4>
                                        <div className="flex gap-4 mb-3">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={formData.tieneFallecidos === true}
                                                    onChange={() => handleChange('tieneFallecidos', true)}
                                                />
                                                <span className="text-sm">Sí</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={formData.tieneFallecidos === false}
                                                    onChange={() => handleChange('tieneFallecidos', false)}
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                        </div>
                                        {formData.tieneFallecidos && (
                                            <Input
                                                label="Número de fallecidos"
                                                type="number"
                                                value={formData.numeroFallecidos || ''}
                                                onChange={v => handleChange('numeroFallecidos', parseInt(v) || null)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </Section>

                            {/* TIPOLOGIAS - Simplified rendering */}
                            <Section title="Tipología de Servicio">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[TIPOLOGIAS_PSI.grupo1, TIPOLOGIAS_PSI.grupo2, TIPOLOGIAS_PSI.grupo3].map((grupo, gIdx) => (
                                        <div key={gIdx} className="space-y-2">
                                            <h4 className="font-semibold text-sm text-gray-600 border-b pb-1 mb-2">Grupo {gIdx + 1}</h4>
                                            {grupo.map(t => (
                                                <div key={t.id}>
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.tipologias?.includes(t.id)}
                                                            onChange={e => handleCheckboxChange(`grupo${gIdx + 1}`, t.id, e.target.checked)}
                                                        />
                                                        <span className="text-sm">{t.numero}. {t.label}</span>
                                                    </label>
                                                    {/* Text input for 'otros' if needed */}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            {/* OBSERVACIONES */}
                            <Section title="Observaciones">
                                <textarea
                                    className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Resumen destacado del servicio..."
                                    value={formData.observaciones}
                                    onChange={e => handleChange('observaciones', e.target.value)}
                                />
                            </Section>

                            {/* FIRMAS */}
                            <Section title="Firmas">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Indicativo que Cumplimenta */}
                                    <div>
                                        <Select
                                            label="Indicativo que Cumplimenta *"
                                            options={indicativosTurno}
                                            value={formData.indicativoCumplimenta}
                                            onChange={v => handleChange('indicativoCumplimenta', v)}
                                        />
                                        <div className="mt-4">
                                            <SignatureCanvas
                                                label="Firma"
                                                initialSignature={formData.firmaIndicativoCumplimenta}
                                                onSave={data => handleChange('firmaIndicativoCumplimenta', data)}
                                            />
                                        </div>
                                    </div>

                                    {/* Responsable del Turno */}
                                    <div>
                                        <Select
                                            label="Responsable del Turno *"
                                            options={indicativosTurno}
                                            value={formData.responsableTurno}
                                            onChange={v => handleChange('responsableTurno', v)}
                                        />
                                        <div className="mt-4">
                                            <SignatureCanvas
                                                label="Firma"
                                                initialSignature={formData.firmaResponsableTurno}
                                                onSave={data => handleChange('firmaResponsableTurno', data)}
                                            />
                                        </div>
                                    </div>

                                    {/* VB Jefe de Servicio */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">VB Jefe de Servicio</label>
                                        <p className="text-xs text-gray-500 mb-4">Usualmente J-44</p>
                                        <SignatureCanvas
                                            label="Firma VB"
                                            initialSignature={formData.firmaJefeServicio}
                                            onSave={data => handleChange('firmaJefeServicio', data)}
                                        />
                                    </div>
                                </div>
                            </Section>
                        </div>
                    )}

                    {pagina === 2 && (
                        <div className="h-full flex flex-col">
                            <h3 className="text-lg font-bold mb-4">Desarrollo Detallado del Servicio</h3>
                            <textarea
                                className="flex-1 w-full border rounded-lg p-4 focus:ring-2 focus:ring-orange-500 outline-none resize-none font-mono text-sm leading-relaxed"
                                placeholder="Escriba aquí el desarrollo completo del servicio..."
                                value={formData.desarrolloDetallado}
                                onChange={e => handleChange('desarrolloDetallado', e.target.value)}
                            />
                        </div>
                    )}

                    {pagina === 3 && (
                        <div>
                            <h3 className="text-lg font-bold mb-4">Fotografías (Máx 3)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[0, 1, 2].map(idx => (
                                    <div key={idx} className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group">
                                        {formData.fotos && formData.fotos[idx] ? (
                                            <>
                                                <img src={formData.fotos[idx]} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => {
                                                        const newFotos = [...formData.fotos]
                                                        newFotos.splice(idx, 1)
                                                        handleChange('fotos', newFotos)
                                                    }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center text-gray-500 hover:text-orange-500">
                                                <ImageIcon size={32} />
                                                <span className="text-sm mt-2">Subir Foto</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="bg-slate-100 p-4 flex justify-between items-center border-t rounded-b-xl">
                    <button className="text-gray-500 hover:text-red-500 text-sm">Borrar Borrador</button>
                    <div className="flex gap-4">
                        {pagina > 1 && (
                            <button onClick={() => setPagina(p => p - 1)} className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50">
                                Anterior
                            </button>
                        )}
                        {pagina < 3 ? (
                            <button onClick={() => setPagina(p => p + 1)} className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
                                Siguiente <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={guardando} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50">
                                {guardando ? 'Guardando...' : 'GUARDAR PARTE'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-1">{title}</h3>
            {children}
        </div>
    )
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label: string
    onChange?: (value: string) => void
}

function Input({ label, onChange, ...props }: InputProps) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                {...props}
                onChange={e => onChange?.(e.target.value)}
            />
        </div>
    )
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label: string
    options: string[]
    onChange: (value: string) => void
}

function Select({ label, options, onChange, ...props }: SelectProps) {
    return (
        <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none bg-white"
                {...props}
                onChange={e => onChange(e.target.value)}
            >
                <option value="">Seleccionar...</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    )
}
