'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PrfHoja from './PrfHoja'
import { componerExpediente } from '@/lib/casetas-feria'
import { useSearchParams, useRouter } from 'next/navigation'
import { Save, FileDown, Loader2, Upload, X, Check, ChevronLeft } from 'lucide-react'
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
 *
 * Quedan fuera J0 y J1, que no son indicativos de servicio, y los marcados
 * como baja: quien está de baja no puede firmar una revisión. Ojo, se descarta
 * "B-46 BAJA" pero no "B-46", que es un indicativo distinto y válido.
 */
function ordenarIndicativos(lista: unknown): string[] {
    if (!Array.isArray(lista)) return []
    const num = (i: string) => { const m = i.match(/(\d+)/); return m ? parseInt(m[1], 10) : 9999 }
    const grupo = (i: string) => (i === 'J-44' ? 0 : i.startsWith('S-') ? 1 : i.startsWith('B-') ? 2 : 3)
    return (lista as string[])
        .filter(i => typeof i === 'string')
        .filter(i => !/^J-?[01]$/i.test(i.trim()))
        .filter(i => !/\bbajas?\b/i.test(i))
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

    /**
     * Mientras dura la impresión, la hoja se cuelga directamente de <body>.
     *
     * Hace falta porque la hoja vive dentro del armazón de la aplicación, cuyos
     * contenedores le añaden 12,7 mm de relleno. El navegador ve entonces un
     * documento de 224 mm, lo encoge para meterlo en los 210 del A4 y las hojas
     * dejan de medir 297, con lo que ya no coinciden con las páginas.
     *
     * Va enganchado a beforeprint y no al botón, para que valga igual si se
     * imprime con Cmd+P desde el menú del navegador. Se mueve el nodo, no se
     * copia, para que lo escrito en los campos viaje con él.
     */
    // Se guarda compuesto para que el listado y el PDF muestren lo mismo.
    useEffect(() => {
        const exp = componerExpediente(numeroParte, datos.numeroCaseta)
        if (exp && exp !== datos.expediente) setDatos(p => ({ ...p, expediente: exp }))
    }, [numeroParte, datos.numeroCaseta, datos.expediente])

    useEffect(() => {
        let hoja: HTMLElement | null = null
        let marca: Comment | null = null

        const alEmpezar = () => {
            hoja = document.querySelector<HTMLElement>('.prf-lienzo')
            if (!hoja || !hoja.parentElement || hoja.parentElement === document.body) return
            marca = document.createComment('prf')
            hoja.parentElement.insertBefore(marca, hoja)
            document.body.appendChild(hoja)
            document.documentElement.classList.add('prf-imprimiendo')
        }
        const alTerminar = () => {
            document.documentElement.classList.remove('prf-imprimiendo')
            if (hoja && marca?.parentNode) {
                marca.parentNode.insertBefore(hoja, marca)
                marca.remove()
            }
            hoja = null; marca = null
        }

        window.addEventListener('beforeprint', alEmpezar)
        window.addEventListener('afterprint', alTerminar)
        return () => {
            alTerminar()
            window.removeEventListener('beforeprint', alEmpezar)
            window.removeEventListener('afterprint', alTerminar)
        }
    }, [])

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
            {/* Barra de acciones. Misma píldora flotante que el parte PSI, para que
                los dos módulos se manejen igual. No forma parte del documento: lleva
                prf-no-imprimir y no sale en el PDF. */}
            <div className="prf-no-imprimir sticky top-4 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-2 flex items-center gap-4 border border-gray-200 mb-6 transition-all hover:shadow-xl mx-auto w-fit">
                <Link href="/partes/prf" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700" title="Volver a la lista">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm font-semibold text-gray-600">
                    {numeroParte ? `Ref: ${numeroParte}` : 'Nuevo parte'}
                </span>
                {aviso && <span className="text-xs text-gray-500">{aviso}</span>}
                <div className="h-4 w-px bg-gray-300" />
                <button
                    type="button"
                    onClick={() => guardar('borrador')}
                    disabled={guardando}
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                >
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                    type="button"
                    onClick={exportarPDF}
                    disabled={exportando}
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                    {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Exportar PDF
                </button>
            </div>

            {firmando && (
                <div className="fixed inset-0 z-[1400] bg-slate-900/60 flex items-center justify-center p-4 prf-no-imprimir">
                    <div className="bg-white rounded-xl p-4 w-full max-w-lg">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Firma</h3>
                        <SignatureCanvas
                            label=""
                            initialSignature={(datos as any)[firmando] || undefined}
                            /* Solo guarda. No cierra: el lienzo avisa cada vez que se
                               levanta el lápiz, y cerrar ahí impedía completar el trazo. */
                            onSave={(val: string) => set(firmando as any, val as any)}
                        />
                        <div className="flex justify-end gap-2 mt-3">
                            <button onClick={() => setFirmando(null)} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg">
                                Hecho
                            </button>
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
