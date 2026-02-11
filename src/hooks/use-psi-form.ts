import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PsiFormState, INITIAL_PSI_STATE, TimeKey } from '@/types/psi'
import { ImagenParte } from '@prisma/client'

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
            const payload = {
                fecha: form.fecha ? new Date(form.fecha) : new Date(),
                lugar: form.lugar,
                motivo: form.motivo,
                alertante: form.alertante,
                horaLlamada: form.tiempos.llamada,
                horaSalida: form.tiempos.salida,
                horaLlegada: form.tiempos.llegada,
                horaTerminado: form.tiempos.terminado,
                horaDisponible: form.tiempos.disponible,
                observaciones: form.observaciones,
                informacionExtra: form, // Guardamos TODO el estado UI
                estado: finalizar ? 'finalizado' : 'borrador'
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
                if (!id) {
                    setId(saved.id)
                    const params = new URLSearchParams(window.location.search)
                    params.set('id', saved.id)
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
