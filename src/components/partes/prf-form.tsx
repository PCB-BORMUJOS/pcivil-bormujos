'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PrfHoja from './PrfHoja'
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

/**
 * Orden del listado de indicativos que informan: primero J-44 (Jefe de
 * Servicio), después los S- y por último los B-, cada grupo por su número.
 * J0 y J1 no son indicativos de servicio y quedan fuera.
 */
function ordenarIndicativos(lista: unknown): string[] {
    if (!Array.isArray(lista)) return []
    const num = (i: string) => { const m = i.match(/(\d+)/); return m ? parseInt(m[1], 10) : 9999 }
    const grupo = (i: string) => (i === 'J-44' ? 0 : i.startsWith('S-') ? 1 : i.startsWith('B-') ? 2 : 3)
    return (lista as string[])
        .filter(i => typeof i === 'string' && !/^J-?[01]$/i.test(i.trim()))
        .sort((a, b) => grupo(a) - grupo(b) || num(a) - num(b) || a.localeCompare(b, 'es'))
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
    const [indicativos, setIndicativos] = useState<string[]>([])
    const [firmando, setFirmando] = useState<string | null>(null)

    // Lista de indicativos del servicio para los desplegables de la hoja.
    useEffect(() => {
        fetch('/api/indicativos')
            .then(r => r.ok ? r.json() : { indicativos: [] })
            .then(d => setIndicativos(ordenarIndicativos(d.indicativos)))
            .catch(() => setIndicativos([]))
    }, [])

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
            // Se comprime en el navegador: una foto de iPad pasa de varios MB a
            // unos cientos de KB sin pérdida apreciable al tamaño del documento.
            const { comprimirImagen, pesoLegible } = await import('@/lib/comprimir-imagen')
            const c = await comprimirImagen(file)
            if (c.reduccion > 0) setAviso(`Foto comprimida ${pesoLegible(c.bytesOriginales)} → ${pesoLegible(c.bytesFinales)} (−${c.reduccion}%)`)
            const fd = new FormData(); fd.append('archivo', c.archivo); fd.append('categoria', categoria)
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
            await guardar('completo')
            // Se imprime la propia hoja: el PDF y lo que se ve en pantalla son el
            // mismo documento, así que no pueden diferir. En el diálogo del
            // navegador basta con elegir "Guardar como PDF".
            await new Promise(r => setTimeout(r, 350))
            window.print()
        } catch (e: any) { setAviso('Error generando el PDF: ' + (e?.message || '')) } finally { setExportando(false) }
    }

    if (cargando) return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>

    return (
        <div className="pb-16">
            {/* Barra de acciones: no forma parte del documento, no se imprime */}
            <div className="prf-no-imprimir flex items-center justify-between rounded-lg px-5 py-4 text-white sticky top-0 z-20 shadow" style={{ background: AZUL }}>
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black tracking-tight leading-none">PRF</span>
                    <span className="text-[11px] font-bold opacity-80 uppercase leading-tight border-l border-white/25 pl-3">
                        Parte de<br />Revisión Feria
                    </span>
                    {numeroParte && <span className="text-[11px] opacity-70 ml-2">Nº {numeroParte}</span>}
                </div>
                <div className="flex items-center gap-2">
                    {aviso && <span className="text-[11px] opacity-90 mr-2">{aviso}</span>}
                    <button onClick={() => guardar('borrador')} disabled={guardando}
                            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                        {guardando ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
                    </button>
                    <button onClick={exportarPDF} disabled={exportando}
                            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                        {exportando ? <Loader2 className="animate-spin" size={14} /> : <FileDown size={14} />} Exportar PDF
                    </button>
                </div>
            </div>

            {/* El documento: se rellena aquí y esto mismo es lo que se imprime */}
            {firmando && (
                <div className="fixed inset-0 z-[1400] bg-slate-900/60 flex items-center justify-center p-4 prf-no-imprimir">
                    <div className="bg-white rounded-xl p-4 w-full max-w-lg">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Firma</h3>
                        <SignatureCanvas
                            label=""
                            initialSignature={(datos as any)[firmando] || undefined}
                            onSave={(val: string) => { set(firmando as any, val as any); setFirmando(null) }}
                        />
                        <div className="flex justify-end gap-2 mt-3">
                            <button onClick={() => setFirmando(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <PrfHoja
                datos={datos}
                numeroParte={numeroParte}
                fotos={fotos}
                indicativos={indicativos}
                onCampos={cambios => setDatos(p => ({ ...p, ...cambios }))}
                onFoto={(bloque, i, f) => subirFoto(bloque as any, i, f)}
                onFirmar={campo => setFirmando(campo)}
                editable
                onCampo={(k, v) => set(k as any, v)}
                onCheck={setCheck}
            />
        </div>
    )
}
