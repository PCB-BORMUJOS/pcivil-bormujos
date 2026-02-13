import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PsiFormState, INITIAL_PSI_STATE, TimeKey } from '@/types/psi'
import { toast } from 'react-hot-toast'
import { validarPartePSI } from '@/lib/psi-validation'

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
                        numero: parte.numeroParte || parte.numero, // Handle schema difference
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
            toast.error('Error al cargar el parte')
        } finally {
            setLoading(false)
        }
    }



    const saveParte = useCallback(async (finalizar = false): Promise<PsiFormState | null> => {
        // Validation check before saving
        const { valido, errores } = validarPartePSI(form)
        if (!valido) {
            errores.forEach(err => toast.error(err))
            return null // Return failure
        }

        if (!hasChanges && !finalizar && id) return form // No changes needed, return current form

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
                matriculasImplicados: form.matriculasImplicados.join(', '),
                policiaLocal: form.policiaLocalDe,
                guardiaCivil: form.guardiaCivilDe,
                autoridadInterviene: form.autoridadInterviene,

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
                firmaIndicativoCumplimenta: form.firmaInformante,
                responsableTurno: form.responsableTurno,
                firmaResponsableTurno: form.firmaResponsable,
                vbJefeServicio: form.vbJefeServicio,
                firmaJefeServicio: form.firmaJefe,

                // Otros
                informacionExtra: form,
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

            const data = await res.json()

            if (!res.ok) {
                // Handle API errors
                if (data.errores && Array.isArray(data.errores)) {
                    data.errores.forEach((e: string) => toast.error(e))
                } else if (data.error) {
                    toast.error(data.error)
                } else {
                    toast.error('Error al guardar el parte')
                }
                return null
            }

            // Success
            const saved = data
            const newId = saved.parte ? saved.parte.id : saved.id
            const newNumero = saved.parte ? saved.parte.numeroParte : saved.numeroParte

            console.log('Parte saved:', saved)

            // Enable updatedForm for return
            const updatedForm = { ...form }

            // Update state with ID and Number immediately
            if (!id && newId) {
                setId(newId)
                updatedForm.id = newId
                // Update URL without reload
                const params = new URLSearchParams(window.location.search)
                params.set('id', newId)
                window.history.replaceState(null, '', `?${params.toString()}`)
            }

            if (newNumero) {
                setField('numero', newNumero)
                updatedForm.numero = newNumero
            }

            setHasChanges(false)
            toast.success(finalizar ? 'Parte finalizado correctamente' : 'Parte guardado correctamente')

            if (finalizar) {
                router.push('/partes')
            }

            return updatedForm

        } catch (err) {
            console.error(err)
            toast.error('Error de conexión')
            return null
        } finally {
            setSaving(false)
        }
    }, [id, form, hasChanges, router])

    // Auto-save disabled or less aggressive to avoid validation spam?
    // Let's keep it but check validation silently? Or just remove auto-save for mandatory fields?
    // Better to keep auto-save OFF for now if validation is strict, 
    // OR only auto-save if validation passes.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (id && hasChanges) {
                // Silent validation check? 
                // Currently saveParte shows toasts. 
                // Maybe simplified auto-save logic needed or just rely on manual save to avoid annoyance.
                // For now, let's comment out auto-save to prevent error spam while typing
                // saveParte() 
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
