'use client'

import React, { useState, useEffect } from 'react'
// Refresh HMR: 2026-02-12T14:26:00
// Usaremos CSS modules desde la ubicación original importando relativa o absoluta (mejor absoluta si configurado)
// Si movemos este componente, necesitamos mover/referenciar el css.
// El css está en /src/app/(app)/partes/psi/psi.module.css
// Desde src/components/partes/psi-form.tsx -> ../../../app/(app)/partes/psi/psi.module.css
import styles from '@/app/(app)/partes/psi/psi.module.css'
import { usePsiForm } from '@/hooks/use-psi-form'
import { ImageUploader } from './image-uploader'
import SignatureCanvas from './SignatureCanvas'
import { Toaster, toast } from 'react-hot-toast'
import { Loader2, Save, FileDown, Plus, ChevronDown, ChevronUp, Trash2, ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function PsiForm() {
    const {
        id, form, imagenes, loading, saving, hasChanges,
        saveParte, setField, setTiempo, setPrevencion,
        setIntervencion, setOtros, setRow1, setRow2, setMatricula,
        addImage, removeImage
    } = usePsiForm()

    const [expandedExtras, setExpandedExtras] = useState(false) // Deprecated, will remove
    const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1)

    // Structured Text State
    const [textComponents, setTextComponents] = useState({
        introduccion: '',
        desarrollo: '',
        conclusion: ''
    })

    // Parse existing text on load
    useEffect(() => {
        if (form.desarrolloDetallado && !hasChanges) {
            // Simple parsing strategy: look for headers
            const text = form.desarrolloDetallado
            const introMatch = text.match(/INTRODUCCIÓN:\s*([\s\S]*?)(?=\n\nDESARROLLO:|$)/)
            const bodyMatch = text.match(/DESARROLLO:\s*([\s\S]*?)(?=\n\nCONCLUSIÓN:|$)/)
            const concMatch = text.match(/CONCLUSIÓN:\s*([\s\S]*?)$/)

            if (introMatch || bodyMatch || concMatch) {
                setTextComponents({
                    introduccion: introMatch ? introMatch[1].trim() : '',
                    desarrollo: bodyMatch ? bodyMatch[1].trim() : '',
                    conclusion: concMatch ? concMatch[1].trim() : ''
                })
            } else {
                // Formatting legacy text: put everything in body if no headers found
                // Or maybe put in intro? Let's put in desarrollo as default.
                setTextComponents(prev => ({ ...prev, desarrollo: text }))
            }
        }
    }, [form.desarrolloDetallado, hasChanges])

    // Update form when text components change
    useEffect(() => {
        const fullText = `INTRODUCCIÓN:
${textComponents.introduccion}

DESARROLLO:
${textComponents.desarrollo}

CONCLUSIÓN:
${textComponents.conclusion}`.trim()

        if (fullText !== form.desarrolloDetallado) {
            // Avoid infinite loop if no actual change
            // We need to setField but careful not to re-trigger the parser above if we simply set it.
            // The parser checks !hasChanges or we can add a ref to ignore internal updates.
            // Actually, setField triggers hasChanges=true in hook.
            setField('desarrolloDetallado', fullText)
        }
    }, [textComponents])

    // Lists for dropdowns
    const [indicativosList, setIndicativosList] = useState<string[]>([])
    const VEHICULOS_LIST = ['UMJ', 'VIR', 'FSV', 'PMA']
    const WALKIES_LIST = ['WJ01', 'WJ02', ...Array.from({ length: 25 }, (_, i) => `W${String(i + 1).padStart(2, '0')}`)]

    useEffect(() => {
        // Fetch indicativos
        fetch('/api/indicativos')
            .then(res => res.json())
            .then(data => {
                if (data.indicativos) {
                    const sorted = (data.indicativos as string[]).sort((a, b) => {
                        // J-44 first
                        if (a === 'J-44') return -1
                        if (b === 'J-44') return 1
                        // S-xx second
                        const aS = a.startsWith('S-')
                        const bS = b.startsWith('S-')
                        if (aS && !bS) return -1
                        if (!aS && bS) return 1
                        // B-xx third
                        const aB = a.startsWith('B-')
                        const bB = b.startsWith('B-')
                        if (aB && !bB) return -1
                        if (!aB && bB) return 1
                        // Default sort
                        return a.localeCompare(b)
                    })
                    setIndicativosList(sorted)
                }
            })
            .catch(err => console.error('Error fetching indicativos', err))
    }, [])

    const handleExportPdf = async () => {
        // Attempt to save (or get current state if no changes)
        const savedForm = await saveParte(false)

        if (!savedForm) {
            return
        }

        try {
            const { generatePsiPdfV3 } = await import('@/lib/pdf-generator-v3')
            toast.loading('Generando y subiendo PDF...', { id: 'pdf-gen' })

            // Map current images to form.fotos
            const formDataWithPhotos = {
                ...savedForm,
                fotos: imagenes.map(img => img.url)
            }

            // Generate PDF Blob
            const doc = await generatePsiPdfV3(formDataWithPhotos)
            const pdfBlob = doc.output('blob')

            // Trigger download locally
            doc.save(`PSI_${savedForm.numero || 'borrador'}.pdf`)

            // Upload to Google Drive (Background)
            if (savedForm.id && savedForm.numero) {
                const formData = new FormData()
                formData.append('file', pdfBlob, `PSI_${savedForm.numero}.pdf`)
                formData.append('parteId', savedForm.id)
                formData.append('numeroParte', savedForm.numero)

                fetch('/api/partes/psi/drive-upload', {
                    method: 'POST',
                    body: formData
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            toast.success('PDF sincronizado con Google Drive', { id: 'drive-upload' })
                        } else {
                            console.error('Error subida Drive:', data)
                            toast.error('Error sincronizando con Drive', { id: 'drive-upload' })
                        }
                    })
                    .catch(err => {
                        console.error('Error network Drive:', err)
                        toast.error('Error de red al subir a Drive', { id: 'drive-upload' })
                    })
            }

            toast.dismiss('pdf-gen')
        } catch (e) {
            console.error(e)
            toast.error('Error generador PDF')
            toast.dismiss('pdf-gen')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const saved = await saveParte(true)
        if (saved) {
            // Toast already handled in saveParte
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>
    }

    return (
        <div className="flex flex-col items-center pb-12 bg-gray-50 min-h-screen">
            <Toaster position="top-right" />

            {/* Toolbar Flotante */}
            <div className="sticky top-4 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-2 flex items-center gap-4 border border-gray-200 mb-6 transition-all hover:shadow-xl">
                <Link href="/partes" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700" title="Volver a lista">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    {id ? `Ref: ${form.numero || '...'}` : 'Nuevo Parte'}
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full border border-yellow-300">v2.0 Beta</span>
                </span>
                <div className="h-4 w-px bg-gray-300" />
                <button
                    type="button"
                    onClick={() => saveParte(false)}
                    disabled={saving || !hasChanges}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${hasChanges
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400'}`}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Guardado'}
                </button>

                <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                    <FileDown className="w-4 h-4" />
                    Exportar PDF
                </button>
            </div>

            <div className={styles.page}>
                <form onSubmit={handleSubmit}>
                    {/* TABS NAVIGATION */}
                    <div className={styles.tabsContainer}>
                        <button
                            type="button"
                            onClick={() => setActiveTab(1)}
                            className={`${styles.tabButton} ${activeTab === 1 ? styles.activeTab : ''}`}
                        >
                            Página 1 (Datos)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab(2)}
                            className={`${styles.tabButton} ${activeTab === 2 ? styles.activeTab : ''}`}
                        >
                            Página 2 (Desarrollo)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab(3)}
                            className={`${styles.tabButton} ${activeTab === 3 ? styles.activeTab : ''}`}
                        >
                            Página 3 (Fotos)
                        </button>
                    </div>

                    {/* CABECERA (Visible siempre) */}
                    <header className={styles.header}>
                        <div className={styles.headerLeft}>
                            <div className={styles.psiBox}>PSI</div>
                            <div className={styles.headerTitle}>
                                <div className={styles.headerTitleTop}>PARTE DE</div>
                                <div className={styles.headerTitleBottom}>SERVICIO E INTERVENCIÓN</div>
                            </div>
                        </div>
                        <div className={styles.headerRight}>
                            <img
                                src="/logo-pcb.png"
                                alt="Protección Civil Bormujos"
                                style={{ height: 56, width: 'auto', objectFit: 'contain' }}
                            />
                        </div>
                    </header>

                    {/* TAB 1: DATOS PRINCIPALES (Grid Layout) */}
                    <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>

                        {/* BLOQUE SUPERIOR */}
                        <section className={styles.topBlock}>
                            <div className={styles.topGrid}>
                                {/* LEFT COLUMN */}
                                <div className={styles.leftColumnData}>
                                    {/* Row 1: FECHA / HORA / INFORME */}
                                    <div className={styles.dateTimeReportRow}>
                                        <div className="flex flex-col gap-1">
                                            {/* FECHA with Box */}
                                            <div className="flex items-center gap-2">
                                                <label className={styles.labelSmall} style={{ width: '45px' }}>FECHA</label>
                                                <div className={styles.boxFrame}>
                                                    <input type="date" className={styles.inputReset} style={{ textAlign: 'center' }} value={form.fecha} onChange={(e) => setField('fecha', e.target.value)} />
                                                </div>
                                            </div>
                                            {/* HORA with Box */}
                                            <div className="flex items-center gap-2">
                                                <label className={styles.labelSmall} style={{ width: '45px' }}>HORA</label>
                                                <div className={styles.boxFrame}>
                                                    <input type="time" className={styles.inputReset} style={{ textAlign: 'center' }} value={form.hora} onChange={(e) => setField('hora', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <label className={styles.labelSmall} style={{ whiteSpace: 'nowrap' }}>Nº INFORME</label>
                                            <div className={styles.informeWrapFrame}>
                                                <input
                                                    className={styles.inputReset}
                                                    value={form.numero || ''}
                                                    onChange={(e) => setField('numero', e.target.value)}
                                                    placeholder="Auto-generado"
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: LUGAR */}
                                    <div className={styles.fieldFull}>
                                        <label className={styles.labelSmall} style={{ width: '70px' }}>LUGAR</label>
                                        <input className={styles.inputFull} value={form.lugar} onChange={(e) => setField('lugar', e.target.value)} />
                                    </div>

                                    {/* Row 3: MOTIVO */}
                                    <div className={styles.fieldFull}>
                                        <label className={styles.labelSmall} style={{ width: '70px' }}>MOTIVO</label>
                                        <input className={styles.inputFull} value={form.motivo} onChange={(e) => setField('motivo', e.target.value)} />
                                    </div>

                                    {/* Row 4: ALERTANTE */}
                                    <div className={styles.fieldFull}>
                                        <label className={styles.labelSmall} style={{ width: '70px' }}>ALERTANTE</label>
                                        <input
                                            className={styles.inputFull}
                                            value={form.alertante}
                                            onChange={(e) => setField('alertante', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: 3 TABLES */}
                                <div className={styles.resourceGrid}>
                                    {/* Col 1: VEHÍCULOS (4 rows) */}
                                    <div className={styles.resourceCol}>
                                        <div className={styles.tableHeaderBlue}>VEHÍCULOS</div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {[0, 1, 2, 3].map((i) => (
                                                <select
                                                    key={`veh-${i}`}
                                                    className={styles.tableCell}
                                                    value={form.tabla1[i]?.vehiculo || ''}
                                                    onChange={(e) => setRow1(i, 'vehiculo', e.target.value)}
                                                >
                                                    <option value=""></option>
                                                    {VEHICULOS_LIST.map(v => (
                                                        <option key={v} value={v}>{v}</option>
                                                    ))}
                                                </select>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Col 2: EQUIPO (6 rows) */}
                                    <div className={styles.resourceColDouble}>
                                        <div className={styles.tableHeaderBlueDouble}>
                                            <div>EQUIPO</div>
                                            <div>WALKIES</div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                                <div key={`eq1-${i}`} className="grid grid-cols-2 gap-1">
                                                    <select
                                                        className={styles.tableCell}
                                                        value={form.tabla1[i]?.equipo || ''}
                                                        onChange={(e) => setRow1(i, 'equipo', e.target.value)}
                                                    >
                                                        <option value=""></option>
                                                        {indicativosList.map(ind => (
                                                            <option key={ind} value={ind}>{ind}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        className={styles.tableCell}
                                                        value={form.tabla1[i]?.walkie || ''}
                                                        onChange={(e) => setRow1(i, 'walkie', e.target.value)}
                                                    >
                                                        <option value=""></option>
                                                        {WALKIES_LIST.map(w => (
                                                            <option key={w} value={w}>{w}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Col 3: EQUIPO 2 (6 rows) */}
                                    {/* Used to be tabla2, re-using here for second column of personnel */}
                                    <div className={styles.resourceColDouble}>
                                        <div className={styles.tableHeaderBlueDouble}>
                                            <div>EQUIPO</div>
                                            <div>WALKIES</div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {form.tabla2.slice(0, 6).map((r, i) => (
                                                <div key={`eq2-${i}`} className="grid grid-cols-2 gap-1">
                                                    <select
                                                        className={styles.tableCell}
                                                        value={r.equipo}
                                                        onChange={(e) => setRow2(i, 'equipo', e.target.value)}
                                                    >
                                                        <option value=""></option>
                                                        {indicativosList.map(ind => (
                                                            <option key={ind} value={ind}>{ind}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        className={styles.tableCell}
                                                        value={r.walkie}
                                                        onChange={(e) => setRow2(i, 'walkie', e.target.value)}
                                                    >
                                                        <option value=""></option>
                                                        {WALKIES_LIST.map(w => (
                                                            <option key={w} value={w}>{w}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>


                            </div>
                        </section>

                        {/* PAUTAS DE TIEMPO */}
                        <section className={styles.block}>
                            <div className={styles.bar}>PAUTAS DE TIEMPO</div>
                            <div className={styles.timeGrid}>
                                <div className={styles.timeBox}>
                                    <input className={styles.timeInput} value={form.tiempos.llamada} onChange={(e) => setTiempo('llamada', e.target.value)} />
                                    <div className={styles.timeLabel}>LLAMADA</div>
                                </div>
                                <div className={styles.timeBox}>
                                    <input className={styles.timeInput} value={form.tiempos.salida} onChange={(e) => setTiempo('salida', e.target.value)} />
                                    <div className={styles.timeLabel}>SALIDA</div>
                                </div>
                                <div className={styles.timeBox}>
                                    <input className={styles.timeInput} value={form.tiempos.llegada} onChange={(e) => setTiempo('llegada', e.target.value)} />
                                    <div className={styles.timeLabel}>LLEGADA</div>
                                </div>
                                <div className={styles.timeBox}>
                                    <input className={styles.timeInput} value={form.tiempos.terminado} onChange={(e) => setTiempo('terminado', e.target.value)} />
                                    <div className={styles.timeLabel}>TERMINADO</div>
                                </div>
                                <div className={styles.timeBox}>
                                    <input className={styles.timeInput} value={form.tiempos.disponible} onChange={(e) => setTiempo('disponible', e.target.value)} />
                                    <div className={styles.timeLabel}>DISPONIBLE</div>
                                </div>
                            </div>
                        </section>

                        {/* TIPOLOGÍA DE SERVICIO */}
                        <section className={styles.block}>
                            <div className={styles.bar}>TIPOLOGÍA DE SERVICIO</div>

                            <div className={styles.typologyGrid}>
                                {/* PREVENCIÓN */}
                                <div className={styles.typologyCol}>
                                    <div className={styles.typologyTitle}>PREVENCIÓN</div>
                                    <div className={styles.typologyList}>
                                        <TypItem n="1" label="MANTENIMIENTO" checked={form.prevencion.mantenimiento} onToggle={() => setPrevencion('mantenimiento')} />
                                        <TypItem n="2" label="PRÁCTICAS" checked={form.prevencion.practicas} onToggle={() => setPrevencion('practicas')} />
                                        <TypItem n="3" label="SUMINISTROS" checked={form.prevencion.suministros} onToggle={() => setPrevencion('suministros')} />
                                        <TypItem n="4" label="PREVENTIVO" checked={form.prevencion.preventivo} onToggle={() => setPrevencion('preventivo')} />
                                        <TypItem n="5" label="OTROS" checked={form.prevencion.otros} onToggle={() => setPrevencion('otros')} />
                                    </div>
                                </div>

                                {/* INTERVENCIÓN */}
                                <div className={styles.typologyCol}>
                                    <div className={styles.typologyTitle}>INTERVENCIÓN</div>
                                    <div className={styles.typologyList}>
                                        <TypItem n="1" label="SOPORTE VITAL" checked={form.intervencion.svb} onToggle={() => setIntervencion('svb')} />
                                        <TypItem n="2" label="INCENDIOS" checked={form.intervencion.incendios} onToggle={() => setIntervencion('incendios')} />
                                        <TypItem n="3" label="INUNDACIONES" checked={form.intervencion.inundaciones} onToggle={() => setIntervencion('inundaciones')} />
                                        <TypItem n="4" label="OTROS RIESGOS METEO" checked={form.intervencion.otros_riesgos_meteo} onToggle={() => setIntervencion('otros_riesgos_meteo')} />
                                        <TypItem n="5" label="ACTIVACIÓN PEM- BOR" checked={form.intervencion.activacion_pem_bor} onToggle={() => setIntervencion('activacion_pem_bor')} />
                                        <TypItem n="6" label="OTROS" checked={form.intervencion.otros} onToggle={() => setIntervencion('otros')} />
                                    </div>
                                </div>

                                {/* OTROS */}
                                <div className={styles.typologyCol}>
                                    <div className={styles.typologyTitle}>OTROS</div>
                                    <div className={styles.typologyList}>
                                        <TypItem n="1" label="REUNIÓN COORDINACIÓN" checked={form.otros.reunion_coordinacion} onToggle={() => setOtros('reunion_coordinacion')} />
                                        <TypItem n="2" label="REUNIÓN ÁREAS" checked={form.otros.reunion_areas} onToggle={() => setOtros('reunion_areas')} />
                                        <TypItem n="3" label="LIMPIEZA" checked={form.otros.limpieza} onToggle={() => setOtros('limpieza')} />
                                        <TypItem n="4" label="FORMACIÓN" checked={form.otros.formacion} onToggle={() => setOtros('formacion')} />
                                        <TypItem n="5" label="OTROS" checked={form.otros.otros} onToggle={() => setOtros('otros')} />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.subBar}>OTROS DESCRIPCIÓN</div>
                            <textarea className={styles.textAreaShort} value={form.otrosDescripcion} onChange={(e) => setField('otrosDescripcion', e.target.value)} />

                            <div className={styles.subBar}>POSIBLES CAUSAS</div>
                            <textarea className={styles.textAreaShort} value={form.posiblesCausas} onChange={(e) => setField('posiblesCausas', e.target.value)} />

                            {/* HERIDOS / FALLECIDOS */}
                            <div className={styles.casualtiesRow}>
                                <div className={styles.casualtyBox}>
                                    <div className={styles.casualtyTitle}>HERIDOS</div>
                                    <div className={styles.casualtyControls}>
                                        <span className={styles.smallText}>SI</span>
                                        <input type="checkbox" checked={form.heridosSi} onChange={() => setField('heridosSi', !form.heridosSi)} />
                                        <span className={styles.smallText}>NO</span>
                                        <input type="checkbox" checked={form.heridosNo} onChange={() => setField('heridosNo', !form.heridosNo)} />
                                        <span className={styles.smallText}>Nº</span>
                                        <input className={styles.inputTiny} value={form.heridosNum} onChange={(e) => setField('heridosNum', e.target.value)} />
                                    </div>
                                </div>

                                <div className={styles.casualtyBox}>
                                    <div className={styles.casualtyTitle}>FALLECIDOS</div>
                                    <div className={styles.casualtyControls}>
                                        <span className={styles.smallText}>SI</span>
                                        <input type="checkbox" checked={form.fallecidosSi} onChange={() => setField('fallecidosSi', !form.fallecidosSi)} />
                                        <span className={styles.smallText}>NO</span>
                                        <input type="checkbox" checked={form.fallecidosNo} onChange={() => setField('fallecidosNo', !form.fallecidosNo)} />
                                        <span className={styles.smallText}>Nº</span>
                                        <input className={styles.inputTiny} value={form.fallecidosNum} onChange={(e) => setField('fallecidosNum', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* ACCIDENTES DE TRÁFICO */}
                            <div className={styles.subBar}>EN ACCIDENTES DE TRÁFICO</div>
                            <div className={styles.trafficGrid}>
                                <div className={styles.trafficRow}>
                                    <div className={styles.trafficLabel}>MATRÍCULA VEHÍCULOS IMPLICADOS</div>
                                    <div className={styles.trafficInputs}>
                                        {form.matriculasImplicados.map((m, i) => (
                                            <input key={`mat-${i}`} className={styles.inputMatricula} value={m} onChange={(e) => setMatricula(i, e.target.value)} />
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.trafficRow2}>
                                    <div className={styles.trafficLabel}>AUTORIDAD QUE INTERVIENEN</div>
                                    <div className={styles.inlineLabel}>POLICÍA LOCAL DE</div>
                                    <input className={styles.inputMid} value={form.policiaLocalDe} onChange={(e) => setField('policiaLocalDe', e.target.value)} />
                                    <div className={styles.inlineLabel}>GUARDIA CIVIL DE</div>
                                    <input className={styles.inputMid} value={form.guardiaCivilDe} onChange={(e) => setField('guardiaCivilDe', e.target.value)} />
                                </div>
                            </div>

                            {/* OBSERVACIONES */}
                            <div className={styles.bar}>OBSERVACIONES</div>
                            <textarea className={styles.textAreaBig} value={form.observaciones} onChange={(e) => setField('observaciones', e.target.value)} />
                        </section>

                        {/* PIE: INDICATIVOS + VB + RESPONSABLE */}
                        {/* PIE: INDICATIVOS + VB + RESPONSABLE */}
                        <section className={styles.footerGrid3Col}>
                            {/* Headers */}
                            <div className={styles.footerHeader}>INDICATIVO QUE INFORMA</div>
                            <div className={styles.footerHeader}>RESPONSABLE DE TURNO</div>
                            <div className={styles.footerHeader}>VB JEFE DE SERVICIO</div>

                            {/* Columna 1: Indicativo Informante */}
                            <div className={styles.footerContent}>
                                <div>
                                    <label className={styles.footerLabel}>INDICATIVO</label>
                                    <select
                                        className={styles.footerDropdown}
                                        value={form.indicativosInforman}
                                        onChange={(e) => setField('indicativosInforman', e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {indicativosList.map((ind) => (
                                            <option key={ind} value={ind}>
                                                {ind}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <SignatureCanvas
                                        label="Firma Informante"
                                        initialSignature={form.firmaInformante || undefined}
                                        onSave={(val) => setField('firmaInformante', val)}
                                    />
                                </div>
                            </div>

                            {/* Columna 2: Responsable Turno */}
                            <div className={styles.footerContent}>
                                <div>
                                    <label className={styles.footerLabel}>RESPONSABLE DE TURNO</label>
                                    <select
                                        className={styles.footerDropdown}
                                        value={form.responsableTurno}
                                        onChange={(e) => setField('responsableTurno', e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {indicativosList.map((ind) => (
                                            <option key={ind} value={ind}>
                                                {ind}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <SignatureCanvas
                                        label="Firma Responsable"
                                        initialSignature={form.firmaResponsable || undefined}
                                        onSave={(val) => setField('firmaResponsable', val)}
                                    />
                                </div>
                            </div>

                            {/* Columna 3: Jefe Servicio */}
                            <div className={styles.footerContent}>
                                <div>
                                    <label className={styles.footerLabel}>JEFE DE SERVICIO</label>
                                    <div className={styles.footerDropdown} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: '#f8fafc' }}>
                                        J-44
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <SignatureCanvas
                                        label="Firma Jefe Servicio"
                                        initialSignature={form.firmaJefe || undefined}
                                        onSave={(val) => setField('firmaJefe', val)}
                                    />

                                </div>
                            </div>
                        </section>
                    </div>

                    {/* TAB 2: DESARROLLO DETALLADO */}
                    <div style={{ display: activeTab === 2 ? 'block' : 'none' }}>
                        <section className="p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                    <FileDown className="w-5 h-5 text-indigo-600" />
                                </div>
                                Desarrollo Detallado
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">INTRODUCCIÓN</label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        placeholder="Breve introducción de los hechos..."
                                        value={textComponents.introduccion}
                                        onChange={(e) => setTextComponents(prev => ({ ...prev, introduccion: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">DESARROLLO DETALLADO</label>
                                    <textarea
                                        className="w-full min-h-[300px] p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        placeholder="Descripción detallada de la intervención..."
                                        value={textComponents.desarrollo}
                                        onChange={(e) => setTextComponents(prev => ({ ...prev, desarrollo: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">CONCLUSIÓN</label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        placeholder="Conclusión final o resolución..."
                                        value={textComponents.conclusion}
                                        onChange={(e) => setTextComponents(prev => ({ ...prev, conclusion: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* TAB 3: FOTOGRAFÍAS */}
                    <div style={{ display: activeTab === 3 ? 'block' : 'none' }}>
                        <section className="p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                    <Plus className="w-5 h-5 text-indigo-600" />
                                </div>
                                Adjuntar Imágenes
                            </h3>

                            {/* Grid de imágenes existentes */}
                            {imagenes.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {imagenes.map((img) => (
                                        <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            {/* Usamos un placeholder si la URL falla o mientras carga */}
                                            <div className="absolute inset-0 bg-gray-100 animate-pulse" />
                                            <Image
                                                src={img.url}
                                                alt={img.descripcion || 'Imagen parte'}
                                                fill
                                                className="object-cover z-10"
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(img.id)}
                                                    className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 hover:scale-110 transition-transform shadow-lg"
                                                    title="Eliminar imagen"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {id ? (
                                <ImageUploader parteId={id} onUploadComplete={addImage} />
                            ) : (
                                <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                                    <div className="mb-2">💾</div>
                                    Guarda el parte automáticamente al escribir para poder adjuntar imágenes
                                </div>
                            )}
                        </section>
                    </div>

                    <footer className="mt-12 flex justify-end gap-3 pb-8 border-t border-gray-200 pt-8 mr-6 ml-6">
                        <button
                            type="submit"
                            className="bg-indigo-600/90 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            FINALIZAR Y GUARDAR PARTE
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}

function TypItem(props: { n: string; label: string; checked: boolean; onToggle: () => void }) {
    return (
        <div className={styles.typItem}>
            <div className={styles.typNum}>{props.n}</div>
            <div className={styles.typLabel}>{props.label}</div>
            <div className={styles.typCheck}>
                <input
                    type="checkbox"
                    checked={props.checked}
                    onChange={props.onToggle}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
            </div>
        </div>
    )
}
