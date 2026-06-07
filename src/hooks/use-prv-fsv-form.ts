'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PrvFsvFormState, INITIAL_PRV_FSV_STATE } from '@/types/prv-fsv'
import { getTodaySpain } from '@/lib/date-utils'

const LOCALSTORAGE_KEY = 'prv-fsv-draft'
const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000

export function usePrvFsvForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialId = searchParams?.get('id')

    const [id, setId] = useState<string | null>(initialId || null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [draftRestored, setDraftRestored] = useState(false)
    const [estadoParte, setEstadoParte] = useState<string>('borrador')
    const [form, setForm] = useState<PrvFsvFormState>({
        ...INITIAL_PRV_FSV_STATE,
        fecha: getTodaySpain(),
    })

    const idRef = useRef<string | null>(initialId || null)
    useEffect(() => { idRef.current = id }, [id])

    // ── Auto-save borrador en localStorage ──────────────────────────────────
    useEffect(() => {
        if (!hasChanges) return
        try {
            const key = `${LOCALSTORAGE_KEY}_${idRef.current || 'new'}`
            localStorage.setItem(key, JSON.stringify({ form, savedAt: Date.now() }))
        } catch { /* cuota ignorada */ }
    }, [form, hasChanges])

    // ── Cargar parte existente o restaurar borrador ──────────────────────────
    useEffect(() => {
        if (initialId) {
            loadParte(initialId)
        } else {
            try {
                const raw = localStorage.getItem(`${LOCALSTORAGE_KEY}_new`)
                if (raw) {
                    const { form: saved, savedAt } = JSON.parse(raw)
                    if (Date.now() - savedAt < DRAFT_MAX_AGE_MS) {
                        setForm(saved)
                        setDraftRestored(true)
                    }
                }
            } catch { /* ignorar */ }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadParte = async (parteId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/partes/prv-fsv/${parteId}`)
            if (!res.ok) return
            const parte = await res.json()
            setId(parte.id)
            setEstadoParte(parte.estado || 'borrador')
            setForm({
                id:               parte.id,
                numeroReferencia: parte.numeroReferencia || '',
                fecha:            parte.fecha ? new Date(parte.fecha).toISOString().split('T')[0] : getTodaySpain(),
                hora:             parte.hora || '',
                km:               parte.km?.toString() || '',
                camposFormulario: parte.camposFormulario || {},
                fotoFrontal:      parte.fotoFrontal  || null,
                fotoTrasera:      parte.fotoTrasera  || null,
                fotoLateralIzq:   parte.fotoLateralIzq || null,
                fotoLateralDer:   parte.fotoLateralDer || null,
                estado:           parte.estado || 'borrador',
            })
        } catch (err) {
            console.error('Error cargando parte PRV-FSV:', err)
        } finally {
            setLoading(false)
        }
    }

    // ── Guardar parte ────────────────────────────────────────────────────────
    const saveParte = useCallback(async (finalizar = false): Promise<PrvFsvFormState | null> => {
        setSaving(true)
        try {
            const payload = {
                fecha:            form.fecha,
                hora:             form.hora,
                km:               form.km,
                camposFormulario: form.camposFormulario,
                fotoFrontal:      form.fotoFrontal,
                fotoTrasera:      form.fotoTrasera,
                fotoLateralIzq:   form.fotoLateralIzq,
                fotoLateralDer:   form.fotoLateralDer,
                estado:           finalizar ? 'completo' : undefined,
            }

            let res: Response
            let currentId = idRef.current

            if (currentId) {
                res = await fetch(`/api/partes/prv-fsv/${currentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            } else {
                res = await fetch('/api/partes/prv-fsv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            }

            if (!res.ok) {
                console.error('Error guardando parte PRV-FSV:', res.status)
                return null
            }

            const saved = await res.json()

            if (!currentId) {
                currentId = saved.id
                setId(saved.id)
                idRef.current = saved.id
                router.replace(`/partes/prv-fsv?id=${saved.id}`, { scroll: false })
                try { localStorage.removeItem(`${LOCALSTORAGE_KEY}_new`) } catch { /* ignorar */ }
            }

            setEstadoParte(saved.estado || 'borrador')
            setForm(prev => ({ ...prev, numeroReferencia: saved.numeroReferencia, estado: saved.estado }))
            setHasChanges(false)

            return { ...form, id: saved.id, numeroReferencia: saved.numeroReferencia }
        } catch (err) {
            console.error('Error guardando parte PRV-FSV:', err)
            return null
        } finally {
            setSaving(false)
        }
    }, [form, router])

    // ── Auto-save cada 30s ───────────────────────────────────────────────────
    useEffect(() => {
        if (!hasChanges) return
        const t = setTimeout(() => {
            if (form.fecha) saveParte(false)
        }, 30_000)
        return () => clearTimeout(t)
    }, [form, hasChanges, saveParte])

    const setField = <K extends keyof PrvFsvFormState>(key: K, value: PrvFsvFormState[K]) => {
        setForm(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const setCampo = (fieldName: string, value: string | boolean) => {
        setForm(prev => ({
            ...prev,
            camposFormulario: { ...prev.camposFormulario, [fieldName]: value },
        }))
        setHasChanges(true)
    }

    const setCampos = (campos: Record<string, string | boolean>) => {
        setForm(prev => ({
            ...prev,
            camposFormulario: { ...prev.camposFormulario, ...campos },
        }))
        setHasChanges(true)
    }

    return {
        id,
        form,
        loading,
        saving,
        hasChanges,
        draftRestored,
        estadoParte,
        saveParte,
        setField,
        setCampo,
        setCampos,
    }
}
