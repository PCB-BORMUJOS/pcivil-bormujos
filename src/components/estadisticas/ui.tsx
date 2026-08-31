'use client'

/**
 * Piezas visuales compartidas del área de estadísticas.
 *
 * Estaban dentro de la página general. Se sacan aquí para que las estadísticas
 * de cada tipo de parte —que se ven tanto dentro de PSI, PRF y PAS como en la
 * pestaña «Partes» del menú de Estadísticas— tengan exactamente el mismo
 * aspecto que el resto del módulo, sin duplicar el estilo en cada sitio.
 */

import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'

export const PALETTE = {
    indigo: '#4f46e5', blue: '#2563eb', teal: '#0d9488', green: '#16a34a',
    amber: '#d97706', orange: '#ea580c', red: '#dc2626', purple: '#7c3aed',
    slate: '#475569', pink: '#db2777', cyan: '#0891b2', lime: '#65a30d',
}
export const CHART_COLORS = Object.values(PALETTE)
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const fmtEur = (n: any) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const fmtKm = (n: any) => `${(Number(n) || 0).toLocaleString('es-ES')} km`
export const fmtNum = (n: any) => (Number(n) || 0).toLocaleString('es-ES')
export const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '—'
export const fmtL = (n: any) => `${(Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} L`

export function KpiCard({ label, value, sub, color = 'indigo', icon: Icon }: any) {
    const cm: Record<string, { bg: string; ring: string }> = {
        indigo: { bg: 'bg-indigo-600', ring: 'ring-indigo-100' },
        blue: { bg: 'bg-blue-600', ring: 'ring-blue-100' },
        green: { bg: 'bg-green-600', ring: 'ring-green-100' },
        amber: { bg: 'bg-amber-500', ring: 'ring-amber-100' },
        red: { bg: 'bg-red-600', ring: 'ring-red-100' },
        orange: { bg: 'bg-orange-500', ring: 'ring-orange-100' },
        teal: { bg: 'bg-teal-600', ring: 'ring-teal-100' },
        purple: { bg: 'bg-purple-600', ring: 'ring-purple-100' },
        slate: { bg: 'bg-slate-600', ring: 'ring-slate-100' },
        cyan: { bg: 'bg-cyan-600', ring: 'ring-cyan-100' },
        lime: { bg: 'bg-lime-600', ring: 'ring-lime-100' },
    }
    const c = cm[color] || cm.indigo
    return (
        <div className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ring-1 ${c.ring}`}>
            <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
                {Icon && <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}><Icon size={16} className="text-white" /></div>}
            </div>
            <div className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">{value ?? '—'}</div>
            {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
        </div>
    )
}

export function Panel({ title, children, className = '' }: any) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
            {title && <div className="px-5 py-4 border-b border-slate-50"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3></div>}
            <div className="p-5">{children}</div>
        </div>
    )
}

export function Badge({ label, variant = 'default' }: any) {
    const v: Record<string, string> = {
        default: 'bg-slate-100 text-slate-600',
        green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
        blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
        indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
        purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
        orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
        teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${v[variant] || v.default}`}>{label}</span>
}

export function ChartTooltip({ active, payload, label, formatter }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xl p-3.5 text-xs min-w-[140px]">
            {label && <p className="font-bold text-slate-700 mb-2 pb-1.5 border-b border-slate-100">{label}</p>}
            {payload.map((p: any, i: number) => {
                const val = formatter ? formatter(p.name, p.value) : p.value?.toLocaleString('es-ES')
                return (
                    <div key={i} className="flex items-center justify-between gap-4 mt-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <span className="text-slate-500">{p.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{val}</span>
                    </div>
                )
            })}
        </div>
    )
}

export function DataTable({ heads, rows, empty = 'Sin datos disponibles' }: { heads: ReactNode[]; rows: any[][]; empty?: string }) {
    if (!rows.length) return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText size={32} className="mb-2 opacity-30" />
            <p className="text-sm">{empty}</p>
        </div>
    )
    return (
        <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        {heads.map((h, i) => <th key={i} className={`px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                            {row.map((cell, j) => <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-medium text-slate-800' : 'text-center text-slate-600'}`}>{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function ProgressBar({ label, value, max }: any) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
    const bg = pct >= 90 ? '#dc2626' : pct >= 60 ? '#d97706' : '#4f46e5'
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700 truncate max-w-[60%]">{label}</span>
                <span className="text-slate-400 font-medium">{value?.toLocaleString('es-ES')} / {max?.toLocaleString('es-ES')} <span className="text-slate-300">({pct}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bg }} />
            </div>
        </div>
    )
}

/**
 * Barra horizontal con etiqueta a la izquierda y valor a la derecha, para
 * rankings donde lo que importa es comparar entre sí, no contra un máximo
 * teórico como en ProgressBar.
 */
export function BarraRanking({ etiqueta, n, max, color = PALETTE.indigo, pos, sufijo }: {
    etiqueta: string; n: number; max: number; color?: string; pos?: number; sufijo?: string
}) {
    return (
        <div className="flex items-center gap-3">
            {pos !== undefined && <span className="w-5 text-[11px] font-bold text-slate-300 text-right shrink-0">{pos}</span>}
            <span className="text-sm text-slate-700 flex-1 truncate" title={etiqueta}>{etiqueta}</span>
            <div className="w-24 sm:w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width: `${max > 0 ? (n / max) * 100 : 0}%`, backgroundColor: color }} />
            </div>
            <span className="text-sm font-bold text-slate-800 w-12 text-right shrink-0">
                {n.toLocaleString('es-ES')}{sufijo}
            </span>
        </div>
    )
}

export const SinDatos = ({ texto }: { texto: string }) => (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <FileText size={28} className="mb-2 opacity-30" />
        <p className="text-sm text-center">{texto}</p>
    </div>
)
