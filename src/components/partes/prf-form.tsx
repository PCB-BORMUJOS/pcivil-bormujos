'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Save, FileDown, Loader2, Upload, X, Check } from 'lucide-react'
import SignatureCanvas from './SignatureCanvas'
import {
    estadoInicialPRF, type PrfDatos, type ValorCheck, type ItemCheck,
    EXTINTOR_ABC_CHECKS, EXTINTOR_CO2_CHECKS, GAS_IZQ, GAS_DER, DOC_IZQ, DOC_DER,
    ELECTRICA, EVACUACION, RESULTADOS,
} from '@/lib/prf-campos'
import { CASETAS_FERIA } from '@/lib/prf-casetas'

const AZUL = '#283666'

type Fotos = {
    reportaje: string[]
    zonaNoble: string[]
    zonaCocina: string[]
    extintorAbc: string[]
    extintorCo2: string[]
}
const fotosVacias = (): Fotos => ({ reportaje: [], zonaNoble: [], zonaCocina: [], extintorAbc: [], extintorCo2: [] })
type Firmas = { informa1?: string; informa2?: string; jefe?: string; tomador?: string }

// ── Cabecera de sección azul con número ──
function Seccion({ n, titulo, extra }: { n: string; titulo: string; extra?: string }) {
    return (
        <div className="flex items-center justify-between px-3 py-2 mt-5 rounded-t-md" style={{ background: AZUL }}>
            <div className="flex items-center gap-2">
                <span className="text-white/70 font-bold text-sm">{n}</span>
                <span className="text-white font-bold text-sm tracking-wide uppercase">{titulo}</span>
            </div>
            {extra && <span className="text-white/60 text-[11px] font-semibold uppercase">{extra}</span>}
        </div>
    )
}

function Campo({ label, value, onChange, className = '', placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string; type?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</span>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full border-b border-slate-300 focus:border-blue-600 outline-none text-sm py-1 bg-transparent" />
        </label>
    )
}

// ── Fila de check SÍ / NO / N.A. ──
function FilaCheck({ item, valor, onChange }: { item: ItemCheck; valor: ValorCheck; onChange: (v: ValorCheck) => void }) {
    const opciones: { v: ValorCheck; t: string }[] = [{ v: 'si', t: 'SÍ' }, { v: 'no', t: 'NO' }, { v: 'na', t: 'N.A.' }]
    return (
        <div className="flex items-center gap-2 py-1 border-b border-slate-100">
            <span className="flex-1 text-[13px] text-slate-700 leading-tight">{item.label}</span>
            <div className="flex gap-1 shrink-0">
                {opciones.map(o => (
                    <button key={o.v} type="button" onClick={() => onChange(valor === o.v ? '' : o.v)}
                        className={`w-9 h-7 rounded text-[10px] font-bold border transition-colors ${valor === o.v
                            ? (o.v === 'si' ? 'bg-emerald-600 text-white border-emerald-600' : o.v === 'no' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-500 text-white border-slate-500')
                            : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}`}>
                        {o.t}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ── Ranura de foto ──
function RanuraFoto({ etiqueta, url, subiendo, onSubir, onQuitar }: { etiqueta: string; url?: string; subiendo: boolean; onSubir: (f: File) => void; onQuitar: () => void }) {
    const ref = useRef<HTMLInputElement>(null)
    return (
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 aspect-[4/3] flex items-center justify-center overflow-hidden">
            {url ? (
                <>
                    <img src={url} alt={etiqueta} className="w-full h-full object-cover" />
                    <button type="button" onClick={onQuitar} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={14} /></button>
                </>
            ) : (
                <button type="button" onClick={() => ref.current?.click()} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 px-3 text-center">
                    {subiendo ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
                    <span className="text-xs font-medium">{etiqueta}</span>
                    <span className="text-[10px] underline">Subir foto</span>
                </button>
            )}
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onSubir(f); e.target.value = '' }} />
        </div>
    )
}

export function PrfForm() {
    const params = useSearchParams()
    const router = useRouter()
    const idParam = params.get('id')

    const [id, setId] = useState<string | null>(idParam)
    const [datos, setDatos] = useState<PrfDatos>(estadoInicialPRF())
    const [fotos, setFotos] = useState<Fotos>(fotosVacias())
    const [firmas, setFirmas] = useState<Firmas>({})
    const [numeroParte, setNumeroParte] = useState<string>('')
    const [cargando, setCargando] = useState(!!idParam)
    const [guardando, setGuardando] = useState(false)
    const [exportando, setExportando] = useState(false)
    const [subiendo, setSubiendo] = useState<string | null>(null)
    const [aviso, setAviso] = useState<string | null>(null)

    // Cargar parte existente
    useEffect(() => {
        if (!idParam) return
        fetch(`/api/partes/prf/${idParam}`).then(r => r.json()).then(d => {
            if (d.parte) {
                setDatos({ ...estadoInicialPRF(), ...(d.parte.datos || {}) })
                setFotos({ ...fotosVacias(), ...(d.parte.fotosUrls || {}) })
                setFirmas(d.parte.firmas || {})
                setNumeroParte(d.parte.numeroParte || '')
            }
        }).catch(() => {}).finally(() => setCargando(false))
    }, [idParam])

    const set = <K extends keyof PrfDatos>(k: K, v: PrfDatos[K]) => setDatos(p => ({ ...p, [k]: v }))
    const setCheck = (key: string, v: ValorCheck) => setDatos(p => ({ ...p, checks: { ...p.checks, [key]: v } }))

    // Subida de foto a una categoría/índice
    const subirFoto = useCallback(async (categoria: keyof Fotos, index: number, file: File) => {
        setSubiendo(`${categoria}-${index}`); setAviso(null)
        try {
            const fd = new FormData(); fd.append('archivo', file); fd.append('categoria', categoria)
            const r = await fetch('/api/partes/prf/imagen', { method: 'POST', body: fd })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Error subiendo')
            setFotos(p => { const arr = [...p[categoria]]; arr[index] = d.url; return { ...p, [categoria]: arr } })
        } catch (e: any) { setAviso(e.message) } finally { setSubiendo(null) }
    }, [])
    const quitarFoto = (categoria: keyof Fotos, index: number) =>
        setFotos(p => { const arr = [...p[categoria]]; arr[index] = ''; return { ...p, [categoria]: arr } })

    const guardar = async (estado: 'borrador' | 'completo' = 'borrador') => {
        setGuardando(true); setAviso(null)
        try {
            const payload = { estado, datos, fotosUrls: fotos, firmas }
            const url = id ? `/api/partes/prf/${id}` : '/api/partes/prf'
            const method = id ? 'PUT' : 'POST'
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Error guardando')
            setId(d.parte.id); setNumeroParte(d.parte.numeroParte)
            if (!idParam) router.replace(`/partes/prf?id=${d.parte.id}`)
            setAviso('✓ Guardado'); return d.parte
        } catch (e: any) { setAviso(e.message); return null } finally { setGuardando(false) }
    }

    const exportarPDF = async () => {
        setExportando(true); setAviso(null)
        try {
            const parte = await guardar('completo')
            const { generarPrfPDF } = await import('@/lib/prf-pdf')
            const doc = await generarPrfPDF({ numeroParte: parte?.numeroParte || numeroParte, datos, fotos, firmas })
            doc.save(`PRF_${parte?.numeroParte || 'borrador'}.pdf`)
        } catch (e: any) { setAviso('Error generando el PDF: ' + (e?.message || '')) } finally { setExportando(false) }
    }

    if (cargando) return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            {/* Cabecera — PRF con protagonismo */}
            <div className="flex items-center justify-between rounded-lg px-5 py-4 text-white sticky top-0 z-20 shadow" style={{ background: AZUL }}>
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black tracking-tight leading-none">PRF</span>
                    <span className="text-[11px] font-bold opacity-80 uppercase leading-tight border-l border-white/25 pl-3">Parte de<br />Revisión Feria</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => guardar('borrador')} disabled={guardando} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                        {guardando ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
                    </button>
                    <button onClick={exportarPDF} disabled={exportando} className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                        {exportando ? <Loader2 className="animate-spin" size={14} /> : <FileDown size={14} />} Exportar PDF
                    </button>
                </div>
            </div>

            {/* Título del acta + Expediente Nº en su sitio (derecha) */}
            <div className="flex items-end justify-between gap-4 mt-4 border-b-2 border-orange-500 pb-2">
                <p className="text-sm font-bold text-slate-700 uppercase">Acta de inspección de seguridad y prevención de incendios en caseta de feria</p>
                <label className="flex items-baseline gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Expediente Nº</span>
                    <input value={datos.expediente} onChange={e => set('expediente', e.target.value)} className="w-32 border-b border-slate-400 outline-none text-sm font-semibold py-0.5" />
                </label>
            </div>
            {numeroParte && <p className="text-[11px] text-slate-400 mt-1">Parte interno Nº {numeroParte}</p>}

            {/* Cabecera de datos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <Campo label="Fecha" value={datos.fecha} onChange={v => set('fecha', v)} type="date" />
                <Campo label="Hora de inicio" value={datos.horaInicio} onChange={v => set('horaInicio', v)} type="time" />
                <Campo label="Hora de fin" value={datos.horaFin} onChange={v => set('horaFin', v)} type="time" />
                <Campo label="Indicativo que informa" value={datos.indicativoInforma} onChange={v => set('indicativoInforma', v)} />
                <Campo label="Equipo" value={datos.equipo} onChange={v => set('equipo', v)} />
                <Campo label="Policía Local · TIP Nº 1" value={datos.policiaTip1} onChange={v => set('policiaTip1', v)} />
                <Campo label="Policía Local · TIP Nº 2" value={datos.policiaTip2} onChange={v => set('policiaTip2', v)} />
                <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Ejemplar del acta</span>
                    <div className="flex gap-2">
                        {(['titular', 'servicio', 'policia_local'] as const).map(e => (
                            <button key={e} type="button" onClick={() => set('ejemplar', datos.ejemplar === e ? '' : e)}
                                className={`text-[11px] px-2 py-1 rounded border font-semibold capitalize ${datos.ejemplar === e ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-600'}`}>
                                {e.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 01 Datos de la caseta */}
            <Seccion n="01" titulo="Datos de la caseta" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-t-0 border-slate-200 rounded-b-md p-3">
                <label className="block col-span-2 md:col-span-3 bg-blue-50/60 border border-blue-200 rounded-lg p-2">
                    <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Caseta de la feria (autocompletar desde el Plan)</span>
                    <select value={datos.numeroCaseta} onChange={e => {
                        const cs = CASETAS_FERIA.find(c => c.id === e.target.value)
                        if (!cs) return
                        setDatos(p => ({ ...p, numeroCaseta: cs.id, nombreCaseta: cs.nombre, calleSector: cs.calle, aforo: String(cs.aforo), modulos: (['1', '2', '3'].includes(String(cs.modulos)) ? String(cs.modulos) : 'otros') as any, modulosOtros: ['1', '2', '3'].includes(String(cs.modulos)) ? '' : `${cs.superficie}`, localidad: 'Bormujos' }))
                    }} className="w-full bg-white border border-slate-300 rounded p-1.5 text-sm">
                        <option value="">— Elegir caseta —</option>
                        {CASETAS_FERIA.map(c => <option key={c.id} value={c.id}>{c.id} · {c.nombre} ({c.calle}) · {c.modulos} mód · aforo {c.aforo}</option>)}
                    </select>
                </label>
                <Campo label="Nombre de la caseta" value={datos.nombreCaseta} onChange={v => set('nombreCaseta', v)} className="col-span-2" />
                <Campo label="Nº de caseta" value={datos.numeroCaseta} onChange={v => set('numeroCaseta', v)} />
                <div className="col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Superficie en módulos</span>
                    <div className="flex items-center gap-2">
                        {(['1', '2', '3', 'otros'] as const).map(m => (
                            <button key={m} type="button" onClick={() => set('modulos', datos.modulos === m ? '' : m)}
                                className={`text-xs px-2.5 py-1 rounded border font-semibold capitalize ${datos.modulos === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-600'}`}>{m}</button>
                        ))}
                        {datos.modulos === 'otros' && (
                            <input value={datos.modulosOtros} onChange={e => set('modulosOtros', e.target.value)} placeholder="m²" className="w-24 border-b border-slate-300 outline-none text-sm py-1" />
                        )}
                    </div>
                </div>
                <Campo label="Aforo autorizado" value={datos.aforo} onChange={v => set('aforo', v)} />
                <Campo label="Calle o sector del real" value={datos.calleSector} onChange={v => set('calleSector', v)} className="col-span-2" />
                <Campo label="Localidad" value={datos.localidad} onChange={v => set('localidad', v)} />
            </div>

            {/* 02 y 03 */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Seccion n="02" titulo="Datos del tomador o responsable" />
                    <div className="grid grid-cols-2 gap-3 border border-t-0 border-slate-200 rounded-b-md p-3">
                        <Campo label="Nombre y apellidos" value={datos.tomadorNombre} onChange={v => set('tomadorNombre', v)} className="col-span-2" />
                        <Campo label="DNI o NIE" value={datos.tomadorDni} onChange={v => set('tomadorDni', v)} />
                        <Campo label="Localidad" value={datos.tomadorLocalidad} onChange={v => set('tomadorLocalidad', v)} />
                        <Campo label="Domicilio" value={datos.tomadorDomicilio} onChange={v => set('tomadorDomicilio', v)} className="col-span-2" />
                        <Campo label="Teléfonos" value={datos.tomadorTelefonos} onChange={v => set('tomadorTelefonos', v)} />
                        <Campo label="Email" value={datos.tomadorEmail} onChange={v => set('tomadorEmail', v)} />
                    </div>
                </div>
                <div>
                    <Seccion n="03" titulo="Póliza de seguro" />
                    <div className="grid grid-cols-2 gap-3 border border-t-0 border-slate-200 rounded-b-md p-3">
                        <Campo label="Compañía" value={datos.polizaCompania} onChange={v => set('polizaCompania', v)} />
                        <Campo label="Nº de póliza" value={datos.polizaNumero} onChange={v => set('polizaNumero', v)} />
                        <Campo label="Vigencia hasta" value={datos.polizaVigencia} onChange={v => set('polizaVigencia', v)} type="date" />
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recibo en vigor</span>
                            <div className="flex gap-2">
                                {(['si', 'no'] as const).map(o => (
                                    <button key={o} type="button" onClick={() => set('polizaRecibo', datos.polizaRecibo === o ? '' : o)}
                                        className={`text-xs px-3 py-1 rounded border font-semibold uppercase ${datos.polizaRecibo === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-600'}`}>{o === 'si' ? 'Sí' : 'No'}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 04 Extintores */}
            <Seccion n="04" titulo="Protección contra incendios · Extintores" extra="RD 513/2017" />
            <div className="grid md:grid-cols-2 gap-4 border border-t-0 border-slate-200 rounded-b-md p-3">
                <div>
                    <div className="flex items-center justify-between mb-2"><span className="font-bold text-slate-800 text-sm">Extintor de polvo ABC</span><span className="text-[10px] font-bold text-orange-600 uppercase">Zona noble</span></div>
                    <div className="grid grid-cols-2 gap-2">
                        <Campo label="Nº de extintor" value={datos.abcNumero} onChange={v => set('abcNumero', v)} />
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precinto</span>
                            <div className="flex gap-1">{(['si', 'no'] as const).map(o => <button key={o} type="button" onClick={() => set('abcPrecinto', datos.abcPrecinto === o ? '' : o)} className={`text-xs px-2 py-1 rounded border font-semibold ${datos.abcPrecinto === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>{o === 'si' ? 'Sí' : 'No'}</button>)}</div>
                        </div>
                        <Campo label="Eficacia mínima 21A-113B" value={datos.abcEficacia} onChange={v => set('abcEficacia', v)} />
                        <Campo label="Revisión en vigor · fecha" value={datos.abcRevision} onChange={v => set('abcRevision', v)} />
                    </div>
                    <div className="mt-2">{EXTINTOR_ABC_CHECKS.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2"><span className="font-bold text-slate-800 text-sm">Extintor de CO₂</span><span className="text-[10px] font-bold text-orange-600 uppercase">Zona cocina</span></div>
                    <div className="grid grid-cols-2 gap-2">
                        <Campo label="Nº de extintor" value={datos.co2Numero} onChange={v => set('co2Numero', v)} />
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precinto</span>
                            <div className="flex gap-1">{(['si', 'no'] as const).map(o => <button key={o} type="button" onClick={() => set('co2Precinto', datos.co2Precinto === o ? '' : o)} className={`text-xs px-2 py-1 rounded border font-semibold ${datos.co2Precinto === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>{o === 'si' ? 'Sí' : 'No'}</button>)}</div>
                        </div>
                        <Campo label="Eficacia mínima 34B" value={datos.co2Eficacia} onChange={v => set('co2Eficacia', v)} />
                        <Campo label="Revisión en vigor · fecha" value={datos.co2Revision} onChange={v => set('co2Revision', v)} />
                    </div>
                    <div className="mt-2">{EXTINTOR_CO2_CHECKS.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>
                </div>
            </div>

            {/* 05 Gas */}
            <Seccion n="05" titulo="Instalación de gas y zona de cocina" extra="RD 919/2006 · ITC-ICG" />
            <div className="grid md:grid-cols-2 gap-x-6 border border-t-0 border-slate-200 rounded-b-md p-3">
                <div>{GAS_IZQ.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>
                <div>{GAS_DER.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>
            </div>

            {/* 06 Documentación */}
            <Seccion n="06" titulo="Documentación aportada por el titular" extra="Original o copia cotejada" />
            <div className="grid md:grid-cols-2 gap-x-6 border border-t-0 border-slate-200 rounded-b-md p-3">
                <div>{DOC_IZQ.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>
                <div>{DOC_DER.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>
            </div>

            {/* 07 Eléctrica */}
            <Seccion n="07" titulo="Instalación eléctrica" extra="REBT" />
            <div className="border border-t-0 border-slate-200 rounded-b-md p-3">{ELECTRICA.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>

            {/* 08 Evacuación */}
            <Seccion n="08" titulo="Evacuación y estructura" />
            <div className="border border-t-0 border-slate-200 rounded-b-md p-3">{EVACUACION.map(it => <FilaCheck key={it.key} item={it} valor={datos.checks[it.key] || ''} onChange={v => setCheck(it.key, v)} />)}</div>

            {/* 09 Observaciones */}
            <Seccion n="09" titulo="Observaciones" />
            <div className="grid md:grid-cols-2 gap-4 border border-t-0 border-slate-200 rounded-b-md p-3">
                <label className="block"><span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zona noble</span><textarea value={datos.obsZonaNoble} onChange={e => set('obsZonaNoble', e.target.value)} rows={3} className="w-full border border-slate-300 rounded p-2 text-sm" /></label>
                <label className="block"><span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zona cocina</span><textarea value={datos.obsZonaCocina} onChange={e => set('obsZonaCocina', e.target.value)} rows={3} className="w-full border border-slate-300 rounded p-2 text-sm" /></label>
            </div>

            {/* 10 Reportaje fotográfico */}
            <Seccion n="10" titulo="Reportaje fotográfico" extra="Anexo probatorio" />
            <div className="grid grid-cols-3 gap-3 border border-t-0 border-slate-200 rounded-b-md p-3">
                {[0, 1, 2].map(i => <RanuraFoto key={i} etiqueta={`Fotografía ${i + 1}`} url={fotos.reportaje[i]} subiendo={subiendo === `reportaje-${i}`} onSubir={f => subirFoto('reportaje', i, f)} onQuitar={() => quitarFoto('reportaje', i)} />)}
            </div>

            {/* 11 Resultado */}
            <Seccion n="11" titulo="Resultado de la revisión y requerimientos" />
            <div className="border border-t-0 border-slate-200 rounded-b-md p-3">
                <div className="grid grid-cols-3 gap-3">
                    {RESULTADOS.map(r => (
                        <button key={r.key} type="button" onClick={() => set('resultado', datos.resultado === r.key ? '' : r.key)}
                            className={`py-3 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 ${datos.resultado === r.key
                                ? (r.key === 'no_apto' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-blue-600 text-blue-700 bg-blue-50')
                                : 'border-slate-300 text-slate-500 bg-white'}`}>
                            {datos.resultado === r.key && <Check size={16} />} {r.label}
                        </button>
                    ))}
                </div>
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <label className="block md:col-span-1"><span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plazo límite</span><input value={datos.plazoLimite} onChange={e => set('plazoLimite', e.target.value)} className="w-full border-b border-slate-300 outline-none text-sm py-1" /></label>
                    <label className="block md:col-span-1"><span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reinspección prevista</span><input value={datos.reinspeccion} onChange={e => set('reinspeccion', e.target.value)} className="w-full border-b border-slate-300 outline-none text-sm py-1" /></label>
                </div>
                <label className="block mt-3"><span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Requerimientos de subsanación</span><textarea value={datos.requerimientos} onChange={e => set('requerimientos', e.target.value)} rows={3} className="w-full border border-slate-300 rounded p-2 text-sm" /></label>
            </div>

            {/* Firmas */}
            <Seccion n="" titulo="Firmas" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-t-0 border-slate-200 rounded-b-md p-3">
                {([['informa1', 'Indicativo que informa 1'], ['informa2', 'Indicativo que informa 2'], ['jefe', 'VºBº Jefe de Servicio'], ['tomador', 'Tomador o representante']] as const).map(([k, label]) => (
                    <div key={k}>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</span>
                        <SignatureCanvas onSave={(d: string) => setFirmas(p => ({ ...p, [k]: d }))} />
                    </div>
                ))}
            </div>

            {/* Anexo · Material gráfico (página 3) */}
            <Seccion n="" titulo="Anexo · Material gráfico" />
            <div className="border border-t-0 border-slate-200 rounded-b-md p-3 space-y-4">
                <div>
                    <p className="text-xs font-bold text-slate-600 uppercase mb-2">Zona noble</p>
                    <div className="grid grid-cols-2 gap-3">{[0, 1].map(i => <RanuraFoto key={i} etiqueta={`Zona noble · Foto ${i + 1}`} url={fotos.zonaNoble[i]} subiendo={subiendo === `zonaNoble-${i}`} onSubir={f => subirFoto('zonaNoble', i, f)} onQuitar={() => quitarFoto('zonaNoble', i)} />)}</div>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-600 uppercase mb-2">Zona cocina</p>
                    <div className="grid grid-cols-2 gap-3">{[0, 1].map(i => <RanuraFoto key={i} etiqueta={`Zona cocina · Foto ${i + 1}`} url={fotos.zonaCocina[i]} subiendo={subiendo === `zonaCocina-${i}`} onSubir={f => subirFoto('zonaCocina', i, f)} onQuitar={() => quitarFoto('zonaCocina', i)} />)}</div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">Extintores de polvo ABC</p>
                        <div className="grid grid-cols-2 gap-3">{[0, 1].map(i => <RanuraFoto key={i} etiqueta={`Extintor ABC · Foto ${i + 1}`} url={fotos.extintorAbc[i]} subiendo={subiendo === `extintorAbc-${i}`} onSubir={f => subirFoto('extintorAbc', i, f)} onQuitar={() => quitarFoto('extintorAbc', i)} />)}</div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">Extintores de CO₂</p>
                        <div className="grid grid-cols-2 gap-3"><RanuraFoto etiqueta="Extintor CO₂ · Foto" url={fotos.extintorCo2[0]} subiendo={subiendo === 'extintorCo2-0'} onSubir={f => subirFoto('extintorCo2', 0, f)} onQuitar={() => quitarFoto('extintorCo2', 0)} /></div>
                    </div>
                </div>
            </div>

            {aviso && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">{aviso}</div>}
        </div>
    )
}
