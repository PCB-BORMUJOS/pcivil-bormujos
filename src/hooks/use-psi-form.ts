import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PsiFormState, INITIAL_PSI_STATE, TimeKey } from '@/types/psi'
import { toast } from 'react-hot-toast'
import { validarPartePSI, validarBorradorPSI } from '@/lib/psi-validation'
import { registerInactivitySaveCallback } from '@/components/InactivityGuard'

const LOCALSTORAGE_KEY = 'psi_form_draft'

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
    const cecopalId = searchParams?.get('cecopal')

    const [id, setId] = useState<string | null>(initialId || null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<PsiFormState>(INITIAL_PSI_STATE)
    const [imagenes, setImagenes] = useState<ImagenParte[]>([])
    const [hasChanges, setHasChanges] = useState(false)
    const [draftRestored, setDraftRestored] = useState(false)
    const idRef = useRef<string | null>(initialId || null)

    // Sync idRef with id state
    useEffect(() => { idRef.current = id }, [id])

    // Guardar en localStorage en cada cambio como respaldo ante pérdida de sesión
    useEffect(() => {
        if (!hasChanges) return
        try {
            const key = `${LOCALSTORAGE_KEY}_${idRef.current || 'new'}`
            localStorage.setItem(key, JSON.stringify({ form, savedAt: Date.now() }))
        } catch { /* ignorar errores de cuota */ }
    }, [form, hasChanges])

    // Cargar datos al montar si hay ID
    useEffect(() => {
        if (initialId) {
            loadParte(initialId)
        } else {
            // Parte nuevo: intentar restaurar borrador de localStorage
            try {
                const raw = localStorage.getItem(`${LOCALSTORAGE_KEY}_new`)
                if (raw) {
                    const { form: saved, savedAt } = JSON.parse(raw)
                    const ageMinutes = (Date.now() - savedAt) / 60000
                    if (ageMinutes < 120) { // solo restaurar si tiene menos de 2 horas
                        setForm(saved)
                        setHasChanges(true)
                        setDraftRestored(true)
                        toast('Borrador recuperado de la sesión anterior', {
                            icon: '💾',
                            duration: 5000,
                        })
                    } else {
                        localStorage.removeItem(`${LOCALSTORAGE_KEY}_new`)
                    }
                }
            } catch { /* ignorar */ }
        }
    }, [initialId])

    // Pre-rellenar desde incidencia CECOPAL si viene ?cecopal=ID
    useEffect(() => {
        if (!cecopalId || initialId) return
        fetch(`/api/cecopal?tipo=incidencia-id&id=${cecopalId}`)
            .then(r => r.json())
            .then(data => {
                if (data.incidencia) {
                    const inc = data.incidencia
                    setForm(prev => ({
                        ...prev,
                        lugar: inc.direccion || '',
                        motivo: inc.descripcion || inc.tipoIncidencia || '',
                        tiempos: {
                            llamada: inc.horaLlamada || '00:00',
                            salida: inc.horaSalida || '00:00',
                            llegada: inc.horaLlegada || '00:00',
                            terminado: inc.horaTerminado || '00:00',
                            disponible: inc.horaDisponible || '00:00',
                        },
                        observaciones: inc.observaciones || '',
                    }))
                    setHasChanges(true)
                }
            })
            .catch(() => {})
    }, [cecopalId, initialId])

    const loadParte = async (parteId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/partes/psi/${parteId}`)
            if (res.ok) {
                const parte = await res.json()
                setId(parte.id)
                // Fotos guardadas en Vercel Blob (URLs, no base64)
                setImagenes(
                    Array.isArray(parte.fotosUrls)
                        ? parte.fotosUrls.map((url: string, i: number) => ({ id: `foto-${i}`, url }))
                        : []
                )

                // informacionExtra contiene el PsiFormState completo guardado al hacer save
                const extra: Partial<PsiFormState> = parte.informacionExtra
                    ? (typeof parte.informacionExtra === 'string'
                        ? JSON.parse(parte.informacionExtra)
                        : parte.informacionExtra)
                    : {}

                // Si no hay informacionExtra (partes antiguos), reconstruir desde columnas DB
                const tipologiasDB: string[] = Array.isArray(parte.tipologias) ? parte.tipologias : []
                const tieneExtra = Object.keys(extra).length > 0

                const prevPrevencion = tieneExtra ? extra.prevencion : {
                    mantenimiento: tipologiasDB.some(t => t === 'prevencion.mantenimiento' || t === 'mantenimiento'),
                    practicas: tipologiasDB.some(t => t === 'prevencion.practicas' || t === 'practicas'),
                    suministros: tipologiasDB.some(t => t === 'prevencion.suministros' || t === 'suministros'),
                    preventivo: tipologiasDB.some(t => t === 'prevencion.preventivo' || t === 'preventivo'),
                    otros: tipologiasDB.some(t => t === 'prevencion.otros'),
                }
                const prevIntervencion = tieneExtra ? extra.intervencion : {
                    svb: tipologiasDB.some(t => t === 'intervencion.svb' || t === 'svb' || t === 'soporte_vital'),
                    incendios: tipologiasDB.some(t => t === 'intervencion.incendios' || t === 'incendios'),
                    inundaciones: tipologiasDB.some(t => t === 'intervencion.inundaciones' || t === 'inundaciones'),
                    otros_riesgos_meteo: tipologiasDB.some(t => t === 'intervencion.otros_riesgos_meteo' || t === 'otros_riesgos_meteo' || t === 'riesgos_meteo'),
                    activacion_pem_bor: tipologiasDB.some(t => t === 'intervencion.activacion_pem_bor' || t === 'activacion_pem_bor' || t === 'pem_bor'),
                    otros: tipologiasDB.some(t => t === 'intervencion.otros'),
                }
                const prevOtros = tieneExtra ? extra.otros : {
                    reunion_coordinacion: tipologiasDB.some(t => t === 'otros.reunion_coordinacion' || t === 'reunion_coordinacion'),
                    reunion_areas: tipologiasDB.some(t => t === 'otros.reunion_areas' || t === 'reunion_areas'),
                    limpieza: tipologiasDB.some(t => t === 'otros.limpieza' || t === 'limpieza'),
                    formacion: tipologiasDB.some(t => t === 'otros.formacion' || t === 'formacion'),
                    otros: tipologiasDB.some(t => t === 'otros.otros'),
                }

                // Reconstruir tabla1 desde equipoWalkies DB si no hay extra
                const equipoWalkiesDB: Array<{ vehiculo?: string; equipo: string; walkie: string }> =
                    Array.isArray(parte.equipoWalkies) ? parte.equipoWalkies : []
                const tabla1DB = Array(8).fill(null).map((_, i) => {
                    const row = equipoWalkiesDB.filter(r => r.vehiculo)[i]
                    return { vehiculo: row?.vehiculo || '', equipo: row?.equipo || '', walkie: row?.walkie || '' }
                })
                const tabla2DB = Array(8).fill(null).map((_, i) => {
                    const row = equipoWalkiesDB.filter(r => !r.vehiculo)[i]
                    return { equipo: row?.equipo || '', walkie: row?.walkie || '' }
                })

                setForm({
                    ...INITIAL_PSI_STATE,
                    ...extra,
                    id: parte.id,
                    numero: parte.numeroParte || '',
                    fecha: parte.fecha ? new Date(parte.fecha).toISOString().split('T')[0] : '',
                    lugar: parte.lugar || '',
                    motivo: parte.motivo || '',
                    alertante: parte.alertante || extra.alertante || '',
                    circulacion: parte.circulacion || extra.circulacion || '',
                    observaciones: parte.observaciones || '',
                    desarrolloDetallado: parte.desarrolloDetallado || extra.desarrolloDetallado || '',
                    tiempos: {
                        llamada: parte.horaLlamada || extra.tiempos?.llamada || '00:00',
                        salida: parte.horaSalida || extra.tiempos?.salida || '00:00',
                        llegada: parte.horaLlegada || extra.tiempos?.llegada || '00:00',
                        terminado: parte.horaTerminado || extra.tiempos?.terminado || '00:00',
                        disponible: parte.horaDisponible || extra.tiempos?.disponible || '00:00',
                    },
                    prevencion: prevPrevencion ?? INITIAL_PSI_STATE.prevencion,
                    intervencion: prevIntervencion ?? INITIAL_PSI_STATE.intervencion,
                    otros: prevOtros ?? INITIAL_PSI_STATE.otros,
                    tabla1: tieneExtra ? (extra.tabla1 ?? tabla1DB) : tabla1DB,
                    tabla2: tieneExtra ? (extra.tabla2 ?? tabla2DB) : tabla2DB,
                    matriculasImplicados: tieneExtra
                        ? (extra.matriculasImplicados ?? INITIAL_PSI_STATE.matriculasImplicados)
                        : (parte.matriculasImplicados
                            ? String(parte.matriculasImplicados).split(',').map((s: string) => s.trim()).slice(0, 5).concat(Array(5).fill('')).slice(0, 5)
                            : INITIAL_PSI_STATE.matriculasImplicados),
                    heridos: tieneExtra
                        ? (extra.heridos ?? (parte.tieneHeridos ? 'si' : ''))
                        : (parte.tieneHeridos ? 'si' : '') as 'si' | 'no' | '',
                    heridosNum: tieneExtra ? (extra.heridosNum ?? String(parte.numeroHeridos || '')) : String(parte.numeroHeridos || ''),
                    fallecidos: tieneExtra
                        ? (extra.fallecidos ?? (parte.tieneFallecidos ? 'si' : ''))
                        : (parte.tieneFallecidos ? 'si' : '') as 'si' | 'no' | '',
                    fallecidosNum: tieneExtra ? (extra.fallecidosNum ?? String(parte.numeroFallecidos || '')) : String(parte.numeroFallecidos || ''),
                    indicativosInforman: parte.indicativoCumplimenta || extra.indicativosInforman || '',
                    responsableTurno: parte.responsableTurno || extra.responsableTurno || '',
                    vbJefeServicio: extra.vbJefeServicio || '',
                    indicativoCumplimenta: parte.indicativoCumplimenta || extra.indicativoCumplimenta || '',
                    firmaInformante: parte.firmaIndicativoCumplimenta || extra.firmaInformante || null,
                    firmaResponsable: parte.firmaResponsableTurno || extra.firmaResponsable || null,
                    firmaJefe: parte.firmaJefeServicio || extra.firmaJefe || null,
                    posiblesCausas: parte.posiblesCausas || extra.posiblesCausas || '',
                    policiaLocalDe: parte.policiaLocal || extra.policiaLocalDe || '',
                    guardiaCivilDe: parte.guardiaCivil || extra.guardiaCivilDe || '',
                    autoridadInterviene: extra.autoridadInterviene || '',
                    otrosDescripcion: extra.otrosDescripcion || '',
                    fotos: [],
                })
            }
        } catch (err) {
            console.error(err)
            toast.error('Error al cargar el parte')
        } finally {
            setLoading(false)
        }
    }



    const saveParte = useCallback(async (finalizar = false): Promise<PsiFormState | null> => {
        // Collect simple true values from typologies
        const tipologias = [
            ...Object.entries(form.prevencion).filter(([_, v]) => v).map(([k]) => `prevencion.${k}`),
            ...Object.entries(form.intervencion).filter(([_, v]) => v).map(([k]) => `intervencion.${k}`),
            ...Object.entries(form.otros).filter(([_, v]) => v).map(([k]) => `otros.${k}`)
        ]

        // Validation check before saving
        // We create a validation object that matches what validarPartePSI expects (the API payload structure)
        const validationData = {
            ...form,
            tipologias
        }

        // Dos niveles de validación:
        // - Borrador: solo requiere lugar (permite guardar rápido y subir fotos)
        // - Finalización: requiere todos los campos obligatorios
        if (finalizar) {
            const { valido, errores } = validarPartePSI(validationData)
            if (!valido) {
                errores.forEach(err => toast.error(err))
                return null
            }
        } else {
            const { valido, errores } = validarBorradorPSI(validationData)
            if (!valido) {
                errores.forEach(err => toast.error(err))
                return null
            }
        }

        if (!hasChanges && !finalizar && id) return form // No changes needed, return current form

        setSaving(true)
        try {
            // tipologias is already constructed above

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
                tieneHeridos: form.heridos === 'si',
                numeroHeridos: parseInt(form.heridosNum) || 0,
                tieneFallecidos: form.fallecidos === 'si',
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
                finalizar: finalizar,
                estado: finalizar ? 'completo' : 'borrador'
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
            // Limpiar respaldo de localStorage tras guardar con éxito
            try {
                localStorage.removeItem(`${LOCALSTORAGE_KEY}_${newId || id || 'new'}`)
            } catch { /* ignorar */ }
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

    // Registrar callback de guardado para que InactivityGuard guarde antes de cerrar sesión
    useEffect(() => {
        const save = async () => {
            if (!hasChanges) return
            const tipologias = [
                ...Object.entries(form.prevencion).filter(([, v]) => v).map(([k]) => `prevencion.${k}`),
                ...Object.entries(form.intervencion).filter(([, v]) => v).map(([k]) => `intervencion.${k}`),
                ...Object.entries(form.otros).filter(([, v]) => v).map(([k]) => `otros.${k}`)
            ]
            const { valido } = validarBorradorPSI({ ...form, tipologias })
            if (valido) await saveParte(false)
        }
        return registerInactivitySaveCallback(save)
    }, [form, hasChanges, saveParte])

    // Auto-save silencioso cada 30s si hay cambios y pasa la validación mínima de borrador
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!hasChanges) return
            const tipologias = [
                ...Object.entries(form.prevencion).filter(([, v]) => v).map(([k]) => `prevencion.${k}`),
                ...Object.entries(form.intervencion).filter(([, v]) => v).map(([k]) => `intervencion.${k}`),
                ...Object.entries(form.otros).filter(([, v]) => v).map(([k]) => `otros.${k}`)
            ]
            const { valido } = validarBorradorPSI({ ...form, tipologias })
            if (!valido) return // no guardar si ni siquiera tiene lugar
            await saveParte(false)
            // Al guardar con éxito, limpiar el borrador de localStorage
            try {
                const key = `${LOCALSTORAGE_KEY}_${idRef.current || 'new'}`
                localStorage.removeItem(key)
            } catch { /* ignorar */ }
        }, 30000)
        return () => clearTimeout(timer)
    }, [form, hasChanges, saveParte])

    // Setters
    const updateForm = (updater: (prev: PsiFormState) => PsiFormState) => {
        setForm(prev => updater(prev))
        setHasChanges(true)
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
        draftRestored,
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
