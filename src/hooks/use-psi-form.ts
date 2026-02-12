import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PsiFormState, INITIAL_PSI_STATE, TimeKey } from '@/types/psi'

// Simple type for images (no longer using ImagenParte model)
type ImagenParte = {
    id: string
    url: string
    descripcion?: string
}

export function usePsiForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialId = searchParams?.get('id')

    const [id, setId] = useState<string | null>(initialId || null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<PsiFormState>(INITIAL_PSI_STATE)
    const [imagenes, setImagenes] = useState<ImagenParte[]>([])
    const [hasChanges, setHasChanges] = useState(false)

    // Cargar datos al montar si hay ID
    useEffect(() => {
        if (initialId) {
            loadParte(initialId)
        }
    }, [initialId])

    const loadParte = async (parteId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/partes/psi/${parteId}`)
            if (res.ok) {
                const parte = await res.json()
                setId(parte.id)
                setImagenes(parte.imagenes || [])

                if (parte.informacionExtra) {
                    const extra = typeof parte.informacionExtra === 'string'
                        ? JSON.parse(parte.informacionExtra)
                        : parte.informacionExtra

                    setForm({
                        ...INITIAL_PSI_STATE,
                        ...extra,
                        id: parte.id,
                        numero: parte.numero,
                        fecha: parte.fecha ? new Date(parte.fecha).toISOString().split('T')[0] : '',
                        hora: extra.hora || '',
                        lugar: parte.lugar || '',
                        motivo: parte.motivo || '',
                        alertante: parte.alertante || '',
                        observaciones: parte.observaciones || '',
                    })
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const saveParte = useCallback(async (finalizar = false) => {
        if (!hasChanges && !finalizar) return

        setSaving(true)
        try {
            // Collect simple true values from typologies
            const tipologias = [
                ...Object.entries(form.prevencion).filter(([_, v]) => v).map(([k]) => `prevencion.${k}`),
                ...Object.entries(form.intervencion).filter(([_, v]) => v).map(([k]) => `intervencion.${k}`),
                ...Object.entries(form.otros).filter(([_, v]) => v).map(([k]) => `otros.${k}`)
            ]

            const payload = {
                // Fechas y horas
                fecha: form.fecha ? new Date(form.fecha) : new Date(),
                horaLlamada: form.tiempos.llamada,
                horaSalida: form.tiempos.salida,
                horaLlegada: form.tiempos.llegada,
                horaTerminado: form.tiempos.terminado,
                horaDisponible: form.tiempos.disponible,

                // Datos principales
                lugar: form.lugar,
                motivo: form.motivo,
                alertante: form.alertante,
                circulacion: form.circulacion,

                // Tráfico
                matriculasImplicados: form.matriculasImplicados.join(', '), // Store as string separated by comma
                policiaLocal: form.policiaLocalDe,
                guardiaCivil: form.guardiaCivilDe,
                autoridadInterviene: form.autoridadInterviene, // Note: DB doesn't have authority field distinct from policia/guardia? Check schema.
                // Schema check: matriculasImplicados is String?, policiaLocal String?, guardiaCivil String?. 
                // autoridadInterviene is NOT in schema explicitly? 
                // Let's put authority in 'policiaLocal' if generic or just trust the mapped fields.
                // Re-reading schema: tipologias is Json.

                // Tablas (JSON)
                vehiculosIds: form.tabla1.map(r => r.vehiculo).filter(Boolean),
                equipoWalkies: [
                    ...form.tabla1.map(r => ({ vehiculo: r.vehiculo, equipo: r.equipo, walkie: r.walkie })),
                    ...form.tabla2.map(r => ({ vehiculo: undefined, equipo: r.equipo, walkie: r.walkie }))
                ].filter(r => r.vehiculo || r.equipo || r.walkie),

                // Tipologías (JSON)
                tipologias: tipologias,
                tipologiasOtrosTexto: { descripcion: form.otrosDescripcion },

                // Accidente
                posiblesCausas: form.posiblesCausas,
                tieneHeridos: form.heridosSi,
                numeroHeridos: parseInt(form.heridosNum) || 0,
                tieneFallecidos: form.fallecidosSi,
                numeroFallecidos: parseInt(form.fallecidosNum) || 0,

                // Contenido
                observaciones: form.observaciones,
                desarrolloDetallado: form.desarrolloDetallado,
                indicativosInforman: form.indicativosInforman,

                // Firmas y responsables
                indicativoCumplimenta: form.indicativoCumplimenta,
                firmaIndicativoCumplimenta: form.firmaInformante, // Mapped
                responsableTurno: form.responsableTurno,
                firmaResponsableTurno: form.firmaResponsable, // Mapped
                vbJefeServicio: form.vbJefeServicio, // This field doesn't exist in DB schema directly? 
                // Schema has firmaJefeServicio. 
                firmaJefeServicio: form.firmaJefe,

                // Otros
                informacionExtra: form, // Copia seguridad UI state
                estado: finalizar ? 'completo' : 'pendiente_vb'
            }

            let url = '/api/partes/psi'
            let method = 'POST'

            if (id) {
                url = `/api/partes/psi/${id}`
                method = 'PUT'
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const saved = await res.json()
                const newId = saved.parte ? saved.parte.id : saved.id

                if (!id && newId) {
                    setId(newId)
                    const params = new URLSearchParams(window.location.search)
                    params.set('id', newId)
                    window.history.replaceState(null, '', `?${params.toString()}`)
                }
                setHasChanges(false)
                if (finalizar) {
                    router.push('/partes')
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }, [id, form, hasChanges, router])

    // Auto-save cada 5 segundos si hay cambios
    useEffect(() => {
        const timer = setTimeout(() => {
            if (id && hasChanges) {
                saveParte()
            }
        }, 5000)
        return () => clearTimeout(timer)
    }, [form, hasChanges, id, saveParte])

    // Setters
    const updateForm = (updater: (prev: PsiFormState) => PsiFormState) => {
        setForm(prev => {
            const next = updater(prev)
            if (JSON.stringify(prev) !== JSON.stringify(next)) {
                setHasChanges(true)
            }
            return next
        })
    }

    const setField = <K extends keyof PsiFormState>(key: K, value: PsiFormState[K]) => {
        updateForm(p => ({ ...p, [key]: value }))
    }

    const setTiempo = (key: TimeKey, value: string) => {
        updateForm(p => ({ ...p, tiempos: { ...p.tiempos, [key]: value } }))
    }

    const setPrevencion = (key: keyof PsiFormState['prevencion']) => {
        updateForm(p => ({ ...p, prevencion: { ...p.prevencion, [key]: !p.prevencion[key] } }))
    }

    const setIntervencion = (key: keyof PsiFormState['intervencion']) => {
        updateForm(p => ({ ...p, intervencion: { ...p.intervencion, [key]: !p.intervencion[key] } }))
    }

    const setOtros = (key: keyof PsiFormState['otros']) => {
        updateForm(p => ({ ...p, otros: { ...p.otros, [key]: !p.otros[key] } }))
    }

    const setRow1 = (idx: number, field: string, val: string) => {
        updateForm(p => {
            const copy = [...p.tabla1]
            copy[idx] = { ...copy[idx], [field]: val }
            return { ...p, tabla1: copy }
        })
    }

    const setRow2 = (idx: number, field: string, val: string) => {
        updateForm(p => {
            const copy = [...p.tabla2]
            copy[idx] = { ...copy[idx], [field]: val }
            return { ...p, tabla2: copy }
        })
    }

    const setMatricula = (idx: number, val: string) => {
        updateForm(p => {
            const copy = [...p.matriculasImplicados]
            copy[idx] = val
            return { ...p, matriculasImplicados: copy }
        })
    }

    const addImage = (img: ImagenParte) => {
        setImagenes(prev => [...prev, img])
    }

    const removeImage = async (imgId: string) => {
        setImagenes(prev => prev.filter(i => i.id !== imgId))
        // Call API delete if needed
    }

    return {
        id,
        form,
        imagenes,
        loading,
        saving,
        hasChanges,
        saveParte,
        setField,
        setTiempo,
        setPrevencion,
        setIntervencion,
        setOtros,
        setRow1,
        setRow2,
        setMatricula,
        addImage,
        removeImage
    }
}
