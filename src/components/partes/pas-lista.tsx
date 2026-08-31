'use client'

/**
 * Listado de partes PAS.
 *
 * Sigue el mismo patrón visual que el listado de partes PSI (cabecera clara con
 * el título a la izquierda y el botón de alta a la derecha, tarjeta de filtros,
 * tabla en tarjeta con badges de estado y acciones por iconos, y paginación al
 * pie), para que los dos módulos de partes se vean y se manejen igual.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, FileText, Trash2, Loader2, Eye, Download, HeartPulse, BarChart3 } from 'lucide-react'
import { ESTADOS_PARTE } from '@/constants/partesPSI'

interface ParteRow {
    id: string
    numeroParte: string
    fecha: string
    estado: string
    numeroInforme: string | null
    lugar: string | null
    motivo: string | null
    pacienteNombre: string | null
    pacienteDni: string | null
    traslado: string | null
    pdfUrl: string | null
    createdAt: string
    creadoPorNombre: string | null
}

/**
 * Nombre abreviado, como en el listado de partes PSI: nombre de pila y la
 * inicial del primer apellido. Los nombres completos no caben en la columna y
 * quedaban cortados a media palabra.
 */
function abreviarNombre(completo: string | null): string {
    const partes = (completo || '').trim().split(/\s+/).filter(Boolean)
    if (partes.length === 0) return '—'
    if (partes.length === 1) return partes[0]
    return `${partes[0]} ${partes[1][0].toUpperCase()}.`
}

/** Desenlace de la asistencia: propio del PAS, no existe en el PSI. */
const DESENLACES: Record<string, { label: string; clases: string }> = {
    renuncia: { label: 'Renuncia traslado', clases: 'bg-amber-100 text-amber-800 border-amber-300' },
    'sin asistencia': { label: 'No desea asistencia', clases: 'bg-red-100 text-red-700 border-red-300' },
}

export function PasLista() {
    const [partes, setPartes] = useState<ParteRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [filtroTexto, setFiltroTexto] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [filtroDesenlace, setFiltroDesenlace] = useState('todos')
    const [descargando, setDescargando] = useState<string | null>(null)

    const cargarPartes = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (filtroTexto.trim()) params.set('q', filtroTexto.trim())
            if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
            const data = await fetch(`/api/partes/pas?${params}`).then(r => r.json())
            setPartes(data.partes || [])
            setTotalPages(data.totalPages || 1)
        } catch {
            setPartes([])
        } finally {
            setLoading(false)
        }
    }, [page, filtroTexto, filtroEstado])

    useEffect(() => { cargarPartes() }, [cargarPartes])

    // El desenlace no se filtra en la API, así que se afina aquí sobre lo recibido.
    const visibles = filtroDesenlace === 'todos'
        ? partes
        : partes.filter(p => (p.traslado || 'trasladado') === filtroDesenlace)

    const handleEliminar = async (id: string) => {
        if (!confirm('¿Archivar este parte PAS?')) return
        const res = await fetch(`/api/partes/pas/${id}`, { method: 'DELETE' })
        if (res.ok) setPartes(p => p.filter(x => x.id !== id))
    }

    const handleDescargarPDF = (id: string, url: string | null) => {
        if (!url) return
        setDescargando(id)
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => setDescargando(null), 800)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Partes de Soporte Vital Básico (PAS)</h1>
                    <p className="text-gray-500 mt-1">Asistencias sanitarias del equipo de SVB</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/partes/pas/estadisticas"
                        className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <BarChart3 size={16} />
                        Estadísticas
                    </Link>
                    <Link
                        href="/partes/pas?nuevo=1"
                        className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 shadow-md transition-colors whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Nuevo Parte PAS
                    </Link>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-200">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-[2] min-w-[220px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
                        <input
                            type="text"
                            value={filtroTexto}
                            onChange={e => { setFiltroTexto(e.target.value); setPage(1) }}
                            placeholder="Nº de parte, informe, lugar o paciente"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                        <select
                            value={filtroEstado}
                            onChange={e => { setFiltroEstado(e.target.value); setPage(1) }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white outline-none"
                        >
                            <option value="todos">Todos</option>
                            <option value="borrador">Borrador</option>
                            <option value="completo">Completo</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Desenlace</label>
                        <select
                            value={filtroDesenlace}
                            onChange={e => setFiltroDesenlace(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white outline-none"
                        >
                            <option value="todos">Todos</option>
                            <option value="trasladado">Trasladado</option>
                            <option value="renuncia">Renuncia al traslado</option>
                            <option value="sin asistencia">No desea asistencia</option>
                        </select>
                    </div>
                    <button
                        onClick={() => { setFiltroTexto(''); setFiltroEstado('todos'); setFiltroDesenlace('todos'); setPage(1) }}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium"
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                {/* El expediente («20260822-001-PSV-01») es el dato mas largo y de ancho
                    conocido, asi que lleva columna propia holgada; la caseta, de largo
                    variable, se queda con el sobrante. */}
                <table className="w-full min-w-[960px] table-fixed">
                    <colgroup>
                        <col className="w-[130px]" />
                        <col className="w-auto" />
                        <col className="w-[190px]" />
                        <col className="w-[95px]" />
                        <col className="w-[150px]" />
                        <col className="w-[130px]" />
                        <col className="w-[140px]" />
                    </colgroup>
                    <thead className="bg-slate-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Nº Parte</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Paciente</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Lugar</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Creado por</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Desenlace</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16">
                                    <Loader2 className="animate-spin mx-auto text-orange-500 mb-2" size={24} />
                                    <span className="text-sm text-gray-400">Cargando partes...</span>
                                </td>
                            </tr>
                        ) : visibles.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16 text-sm text-gray-400">
                                    <HeartPulse size={32} className="mx-auto mb-2 opacity-30" />
                                    No hay partes que coincidan con los filtros.
                                </td>
                            </tr>
                        ) : (
                            visibles.map(parte => {
                                const estadoInfo = ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE]
                                const desenlace = parte.traslado ? DESENLACES[parte.traslado] : null
                                const fecha = new Date(parte.fecha)
                                return (
                                    <tr key={parte.id} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">
                                                {parte.numeroParte}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-800 font-medium block truncate" title={parte.pacienteNombre || ''}>
                                                {parte.pacienteNombre || '—'}
                                            </span>
                                            {parte.numeroInforme && (
                                                <span className="text-xs text-gray-400">Informe {parte.numeroInforme}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600 block truncate" title={parte.lugar || ''}>
                                                {parte.lugar || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-sm text-gray-700">{format(fecha, 'dd/MM/yy', { locale: es })}</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-sm text-gray-600" title={parte.creadoPorNombre || ''}>
                                                {abreviarNombre(parte.creadoPorNombre)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {desenlace ? (
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${desenlace.clases}`}>
                                                    {desenlace.label}
                                                </span>
                                            ) : estadoInfo ? (
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${estadoInfo.bgColor} ${estadoInfo.textColor} ${estadoInfo.borderColor}`}>
                                                    {estadoInfo.label}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">{parte.estado}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    href={`/partes/pas?id=${parte.id}`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Abrir parte"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                                {parte.pdfUrl && (
                                                    <a
                                                        href={parte.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Ver el PDF guardado"
                                                    >
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleDescargarPDF(parte.id, parte.pdfUrl)}
                                                    disabled={!parte.pdfUrl || descargando === parte.id}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                                                    title={parte.pdfUrl ? 'Descargar PDF' : 'Este parte aún no tiene PDF guardado'}
                                                >
                                                    {descargando === parte.id
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : <Download size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(parte.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Archivar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                    >
                        Anterior
                    </button>
                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    )
}
