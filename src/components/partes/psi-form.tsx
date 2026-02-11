'use client'

import React, { useState } from 'react'
// Usaremos CSS modules desde la ubicación original importando relativa o absoluta (mejor absoluta si configurado)
// Si movemos este componente, necesitamos mover/referenciar el css.
// El css está en /src/app/(app)/partes/psi/psi.module.css
// Desde src/components/partes/psi-form.tsx -> ../../../app/(app)/partes/psi/psi.module.css
import styles from '@/app/(app)/partes/psi/psi.module.css'
import { usePsiForm } from '@/hooks/use-psi-form'
import { ImageUploader } from './image-uploader'
import { Toaster, toast } from 'react-hot-toast'
import { Loader2, Save, FileDown, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import Image from 'next/image'

export function PsiForm() {
    const {
        id, form, imagenes, loading, saving, hasChanges,
        saveParte, setField, setTiempo, setPrevencion,
        setIntervencion, setOtros, setRow1, setRow2, setMatricula,
        addImage, removeImage
    } = usePsiForm()

    const [expandedExtras, setExpandedExtras] = useState(false)

    const handleExportPdf = async () => {
        if (!id) {
            toast.error('Primero debes guardar el parte')
            return
        }

        try {
            const { generatePsiPdf } = await import('@/lib/pdf-generator')
            toast.loading('Generando PDF...', { id: 'pdf-gen' })
            await generatePsiPdf(form)
            toast.dismiss('pdf-gen')
            toast.success('PDF descargado')
        } catch (e) {
            console.error(e)
            toast.error('Error generando PDF')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await saveParte(true)
        toast.success('Parte finalizado correctamente')
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>
    }

    return (
        <div className="flex flex-col items-center pb-12 bg-gray-50 min-h-screen">
            <Toaster position="top-right" />

            {/* Toolbar Flotante */}
            <div className="sticky top-4 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-2 flex items-center gap-4 border border-gray-200 mb-6 transition-all hover:shadow-xl">
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
                    {/* CABECERA */}
                    <header className={styles.header}>
                        <div className={styles.headerLeft}>
                            <div className={styles.psiBox}>PSI</div>
                            <div className={styles.headerTitle}>
                                <div className={styles.headerTitleTop}>PARTE DE</div>
                                <div className={styles.headerTitleBottom}>SERVICIO E INTERVENCIÓN</div>
                            </div>
                        </div>
                        <div className={styles.headerRight}>
                            <div className={styles.logoMark} aria-hidden="true">
                                <div className={styles.logoSquares} />
                            </div>
                            <div className={styles.logoText}>
                                <div className={styles.logoTextTop}>PROTECCIÓN CIVIL</div>
                                <div className={styles.logoTextBottom}>BORMUJOS</div>
                            </div>
                        </div>
                    </header>

                    {/* BLOQUE SUPERIOR */}
                    <section className={styles.topBlock}>
                        <div className={styles.topGrid}>
                            <div className={styles.fieldRow}>
                                <label className={styles.labelSmall}>FECHA</label>
                                <input type="date" className={styles.inputSmall} style={{ width: '120px' }} value={form.fecha} onChange={(e) => setField('fecha', e.target.value)} />
                                <label className={styles.labelSmall}>HORA</label>
                                <input className={styles.inputSmall} value={form.hora} onChange={(e) => setField('hora', e.target.value)} />
                            </div>

                            <div className={styles.fieldRowRight}>
                                <label className={styles.labelSmall}>Nº INFORME</label>
                                <div className={styles.informeWrap}>
                                    <input
                                        className={styles.inputInforme}
                                        value={form.numeroInforme}
                                        onChange={(e) => setField('numeroInforme', e.target.value)}
                                        placeholder="Auto-generado"
                                        readOnly
                                        title="Se genera al guardar"
                                    />
                                    <div className={styles.informeCheck} aria-hidden="true" />
                                </div>
                            </div>

                            <div className={styles.fieldFull}>
                                <label className={styles.labelSmall}>LUGAR</label>
                                <input className={styles.inputFull} value={form.lugar} onChange={(e) => setField('lugar', e.target.value)} />
                            </div>

                            <div className={styles.fieldFull}>
                                <label className={styles.labelSmall}>MOTIVO</label>
                                <input className={styles.inputFull} value={form.motivo} onChange={(e) => setField('motivo', e.target.value)} />
                            </div>

                            <div className={styles.fieldFull}>
                                <label className={styles.labelSmall}>ALERTANTE</label>
                                <input
                                    className={styles.inputFull}
                                    value={form.alertante}
                                    onChange={(e) => setField('alertante', e.target.value)}
                                />
                            </div>

                            {/* Tabla derecha VEHÍCULOS / EQUIPO / WALKIES */}
                            <div className={styles.rightTables}>
                                <div className={styles.tableBlock}>
                                    <div className={styles.tableHead}>
                                        <div>VEHÍCULOS</div>
                                        <div>EQUIPO</div>
                                        <div>WALKIES</div>
                                    </div>
                                    <div className={styles.tableBody}>
                                        {form.tabla1.map((r, i) => (
                                            <div className={styles.tableRow} key={`t1-${i}`}>
                                                <input className={styles.tableCell} value={r.vehiculo} onChange={(e) => setRow1(i, 'vehiculo', e.target.value)} />
                                                <input className={styles.tableCell} value={r.equipo} onChange={(e) => setRow1(i, 'equipo', e.target.value)} />
                                                <input className={styles.tableCell} value={r.walkie} onChange={(e) => setRow1(i, 'walkie', e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.tableBlock}>
                                    <div className={styles.tableHead}>
                                        <div>EQUIPO</div>
                                        <div>WALKIES</div>
                                    </div>
                                    <div className={styles.tableBody2}>
                                        {form.tabla2.map((r, i) => (
                                            <div className={styles.tableRow2} key={`t2-${i}`}>
                                                <input className={styles.tableCell} value={r.equipo} onChange={(e) => setRow2(i, 'equipo', e.target.value)} />
                                                <input className={styles.tableCell} value={r.walkie} onChange={(e) => setRow2(i, 'walkie', e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Campo CIRCULACIÓN + VB JEFE SERVICIO */}
                            <div className={styles.circulacionRow}>
                                <label className={styles.labelSmall}>CIRCULACIÓN</label>
                                <input className={styles.inputFull} value={form.circulacion} onChange={(e) => setField('circulacion', e.target.value)} />
                            </div>
                            <div className={styles.vbRow}>
                                <label className={styles.labelSmall}>VB JEFE DE SERVICIO</label>
                                <input className={styles.inputFull} value={form.vbJefeServicio} onChange={(e) => setField('vbJefeServicio', e.target.value)} />
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
                                <input className={styles.inputFull} value={form.autoridadInterviene} onChange={(e) => setField('autoridadInterviene', e.target.value)} />
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
                    <section className={styles.footerGrid}>
                        <div className={styles.footerBarLeft}>INDICATIVOS QUE INFORMAN</div>
                        <div className={styles.footerBarRight}>VB JEFE DE SERVICIO</div>

                        <div className={styles.footerCellLeft}>
                            <input className={styles.inputFull} value={form.indicativosInforman} onChange={(e) => setField('indicativosInforman', e.target.value)} />
                        </div>
                        <div className={styles.footerCellRight}>
                            <input className={styles.inputFull} value={form.vbJefeServicio} onChange={(e) => setField('vbJefeServicio', e.target.value)} />
                        </div>

                        <div className={styles.footerRow2}>
                            <div className={styles.footerSmallLabel}>INDICATIVO QUE CUMPLIMENTA</div>
                            <input className={styles.inputFull} value={form.indicativoCumplimenta} onChange={(e) => setField('indicativoCumplimenta', e.target.value)} />
                        </div>

                        <div className={styles.footerRow2}>
                            <div className={styles.footerSmallLabel}>RESPONSABLE DEL TURNO</div>
                            <input className={styles.inputFull} value={form.responsableTurno} onChange={(e) => setField('responsableTurno', e.target.value)} />
                        </div>
                    </section>

                    {/* SECCIÓN EXPANDIBLE */}
                    <section className="mt-8 border-t-2 border-indigo-100 pt-6">
                        <button
                            type="button"
                            onClick={() => setExpandedExtras(!expandedExtras)}
                            className="flex items-center gap-2 text-indigo-700 font-bold hover:text-indigo-900 transition-colors mb-4 w-full justify-between p-2 hover:bg-gray-50 rounded-lg group"
                        >
                            <div className="flex items-center gap-2">
                                {expandedExtras ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                <span className="group-hover:translate-x-1 transition-transform">AMPLIAR INFORMACIÓN Y ADJUNTAR IMÁGENES</span>
                            </div>
                            <div className="h-px bg-indigo-100 flex-1 ml-4" />
                        </button>

                        {expandedExtras && (
                            <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-6">

                                {/* SUBIDA DE IMÁGENES */}
                                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
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
                                                    {/* Badge de orden o tipo si necesario */}
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
                                </div>
                            </div>
                        )}
                    </section>

                    <footer className="mt-12 flex justify-end gap-3 pb-8 border-t border-gray-200 pt-8">
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
