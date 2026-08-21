'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Trash2, Loader2, Search, ClipboardCheck } from 'lucide-react'

const AZUL = '#283666'

interface ParteRow {
    id: string; numeroParte: string; fecha: string; estado: string
    expediente: string | null; nombreCaseta: string | null; numeroCaseta: string | null
    resultado: string | null; pdfUrl: string | null; createdAt: string
}

const RES_BADGE: Record<string, { txt: string; cls: string }> = {
    apto: { txt: 'Apto', cls: 'bg-emerald-100 text-emerald-700' },
    apto_condiciones: { txt: 'Apto c/cond.', cls: 'bg-amber-100 text-amber-700' },
    no_apto: { txt: 'No apto', cls: 'bg-red-100 text-red-700' },
}

export function PrfLista() {
    const [partes, setPartes] = useState<ParteRow[]>([])
    const [cargando, setCargando] = useState(true)
    const [q, setQ] = useState('')

    const cargar = () => {
        setCargando(true)
        fetch(`/api/partes/prf?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`)
            .then(r => r.json()).then(d => setPartes(d.partes || [])).catch(() => {}).finally(() => setCargando(false))
    }
    useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const borrar = async (id: string) => {
        if (!confirm('¿Archivar este parte PRF?')) return
        await fetch(`/api/partes/prf/${id}`, { method: 'DELETE' })
        setPartes(p => p.filter(x => x.id !== id))
    }

    const fmtFecha = (s: string) => new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' })

    return (
        <div className="max-w-5xl mx-auto p-4">
            <div className="flex items-center justify-between rounded-xl px-5 py-4 text-white" style={{ background: AZUL }}>
                <div className="flex items-center gap-3">
                    <ClipboardCheck size={26} />
                    <div>
                        <h1 className="text-xl font-black leading-tight">Partes PRF · Revisión de Feria</h1>
                        <p className="text-xs opacity-70">Actas de inspección de casetas de feria</p>
                    </div>
                </div>
                <Link href="/partes/prf?nuevo=1" className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-bold">
                    <Plus size={16} /> Nuevo parte
                </Link>
            </div>

            <div className="flex items-center gap-2 mt-4">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && cargar()}
                        placeholder="Buscar por nº, expediente o caseta…" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" />
                </div>
                <button onClick={cargar} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold">Buscar</button>
            </div>

            <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
                {cargando ? (
                    <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : partes.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                        <FileText size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay partes PRF todavía.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-400 font-bold">
                            <tr>
                                <th className="px-4 py-3">Nº parte</th>
                                <th className="px-4 py-3">Caseta</th>
                                <th className="px-4 py-3">Expediente</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Resultado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {partes.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{p.numeroParte}</td>
                                    <td className="px-4 py-3">{p.nombreCaseta || '—'}{p.numeroCaseta ? ` · ${p.numeroCaseta}` : ''}</td>
                                    <td className="px-4 py-3 text-slate-500">{p.expediente || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{fmtFecha(p.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        {p.resultado && RES_BADGE[p.resultado]
                                            ? <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${RES_BADGE[p.resultado].cls}`}>{RES_BADGE[p.resultado].txt}</span>
                                            : <span className="text-[11px] text-slate-400">{p.estado === 'borrador' ? 'Borrador' : '—'}</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/partes/prf?id=${p.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">Abrir</Link>
                                            {p.pdfUrl && <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-700"><FileText size={16} /></a>}
                                            <button onClick={() => borrar(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
