'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Save, FileDown, Loader2, ChevronLeft } from 'lucide-react'
import PasHoja from './PasHoja'
import SignatureCanvas from './SignatureCanvas'
import { estadoInicialPAS, type PasDatos, type MarcaLesion } from '@/lib/pas-campos'
import { getTodaySpain } from '@/lib/date-utils'

export function PasForm() {
    const params = useSearchParams()
    const router = useRouter()
    const idParam = params.get('id')

    const [id, setId] = useState<string | null>(idParam)
    const [datos, setDatos] = useState<PasDatos>(estadoInicialPAS())
    const [marcas, setMarcas] = useState<MarcaLesion[]>([])
    const [lesionActiva, setLesionActiva] = useState(1)
    const [numeroParte, setNumeroParte] = useState('')
    const [cargando, setCargando] = useState(!!idParam)
    const [guardando, setGuardando] = useState(false)
    const [exportando, setExportando] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    const [indicativos, setIndicativos] = useState<string[]>([])
    const [firmando, setFirmando] = useState<string | null>(null)

    // Indicativos del servicio para el desplegable de equipo: J-44 primero,
    // luego los S- y los B-, y fuera J0, J1 y los dados de baja.
    useEffect(() => {
        fetch('/api/indicativos')
            .then(r => r.ok ? r.json() : { indicativos: [] })
            .then(d => {
                const lista: string[] = Array.isArray(d.indicativos) ? d.indicativos : []
                const num = (i: string) => { const m = i.match(/(\d+)/); return m ? parseInt(m[1], 10) : 9999 }
                const grupo = (i: string) => (i === 'J-44' ? 0 : i.startsWith('S-') ? 1 : i.startsWith('B-') ? 2 : 3)
                setIndicativos(lista
                    .filter(i => typeof i === 'string' && !/^J-?[01]$/i.test(i.trim()) && !/\bbajas?\b/i.test(i))
                    .sort((a, b) => grupo(a) - grupo(b) || num(a) - num(b) || a.localeCompare(b, 'es')))
            })
            .catch(() => setIndicativos([]))
    }, [])

    const set = <K extends keyof PasDatos>(k: K, v: PasDatos[K]) => setDatos(p => ({ ...p, [k]: v }))

    // Un parte nuevo arranca con el momento real de la asistencia, fecha y hora.
    // Importa de madrugada: una atencion a la 01:00 del dia 29 es del 29, aunque
    // el turno de noche empezara la tarde del 28.
    useEffect(() => {
        if (idParam) return
        const ahora = new Date().toLocaleTimeString('es-ES', {
            timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
        })
        setDatos(p => ({ ...p, fecha: p.fecha || getTodaySpain(), hora: p.hora || ahora }))

        // El número lo asigna el servidor al guardar, así que en un parte nuevo
        // aún no existe. Se consulta cuál tocaría para enseñarlo desde el
        // principio, igual que la fecha y la hora. El definitivo llega al
        // guardar, por si entretanto otra persona ha creado un parte.
        fetch('/api/partes/pas?siguiente=1')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.numeroParte) setDatos(p => ({ ...p, numeroInforme: p.numeroInforme || d.numeroParte })) })
            .catch(() => {})
    }, [idParam])

    const cargar = useCallback(async () => {
        if (!idParam) return
        setCargando(true)
        try {
            const d = await fetch(`/api/partes/pas/${idParam}`).then(r => r.json())
            if (d.parte) {
                setDatos({ ...estadoInicialPAS(), ...(d.parte.datos || {}) })
                setMarcas(Array.isArray(d.parte.lesiones) ? d.parte.lesiones : [])
                setNumeroParte(d.parte.numeroParte || '')
            }
        } catch { setAviso('No se ha podido cargar el parte') } finally { setCargando(false) }
    }, [idParam])
    useEffect(() => { cargar() }, [cargar])

    const guardar = async (estado: 'borrador' | 'completo' = 'borrador') => {
        setGuardando(true); setAviso(null)
        try {
            const cuerpo = JSON.stringify({ datos, lesiones: marcas, estado })
            const url = id ? `/api/partes/pas/${id}` : '/api/partes/pas'
            const r = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'No se ha podido guardar')
            if (d.parte) {
                setId(d.parte.id)
                setNumeroParte(d.parte.numeroParte || '')
                // El nº de informe lo genera el servidor al crear el parte.
                if (d.parte.numeroInforme) setDatos(p => ({ ...p, numeroInforme: d.parte.numeroInforme }))
                if (!id) router.replace(`/partes/pas?id=${d.parte.id}`)
            }
            setAviso('✓ Guardado')
            return d.parte
        } catch (e: any) { setAviso(e.message); return null } finally { setGuardando(false) }
    }

    const exportarPDF = async () => {
        setExportando(true)
        try {
            await guardar('completo')
            await new Promise(r => setTimeout(r, 350))
            window.print()
        } finally { setExportando(false) }
    }

    /**
     * Mientras dura la impresión, la hoja se cuelga directamente de <body>.
     * Sin esto, los contenedores de la aplicación le añaden su relleno, el
     * navegador ve un documento más ancho que el A4 y lo encoge para que quepa.
     * Va enganchado a beforeprint para que valga igual con Cmd+P.
     */
    useEffect(() => {
        let hoja: HTMLElement | null = null
        let marca: Comment | null = null
        const alEmpezar = () => {
            hoja = document.querySelector<HTMLElement>('.pas-lienzo')
            if (!hoja || !hoja.parentElement || hoja.parentElement === document.body) return
            marca = document.createComment('pas')
            hoja.parentElement.insertBefore(marca, hoja)
            document.body.appendChild(hoja)
            document.documentElement.classList.add('pas-imprimiendo')
        }
        const alTerminar = () => {
            document.documentElement.classList.remove('pas-imprimiendo')
            if (hoja && marca?.parentNode) { marca.parentNode.insertBefore(hoja, marca); marca.remove() }
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

    if (cargando) {
        return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="animate-spin w-8 h-8 text-orange-500" /></div>
    }

    return (
        <div className="pb-16">
            {/* Barra de acciones: misma píldora que en PSI y PRF. No se imprime. */}
            <div className="pas-no-imprimir sticky top-4 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-2 flex items-center gap-4 border border-gray-200 mb-6 transition-all hover:shadow-xl mx-auto w-fit">
                <Link href="/partes/pas" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700" title="Volver a la lista">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm font-semibold text-gray-600">
                    {numeroParte ? `Ref: ${numeroParte}` : 'Nuevo parte'}
                </span>
                {aviso && <span className="text-xs text-gray-500">{aviso}</span>}
                <div className="h-4 w-px bg-gray-300" />
                <button type="button" onClick={() => guardar('borrador')} disabled={guardando}
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50">
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={exportarPDF} disabled={exportando}
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50">
                    {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Exportar PDF
                </button>
            </div>

            {/* Panel de firma: se dibuja en grande y se guarda en el hueco */}
            {firmando && (
                <div className="pas-no-imprimir fixed inset-0 z-[1400] bg-slate-900/60 flex items-center justify-center p-4">
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
                            <button onClick={() => setFirmando(null)}
                                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg">
                                Hecho
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PasHoja
                datos={datos}
                marcas={marcas}
                lesionActiva={lesionActiva}
                indicativos={indicativos}
                editable
                onCampo={(k, v) => set(k as any, v)}
                onMarcas={setMarcas}
                onLesionActiva={setLesionActiva}
                onFirmar={campo => setFirmando(campo)}
            />
        </div>
    )
}
