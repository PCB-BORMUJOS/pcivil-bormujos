'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Download, Trash2, Eye, FileText, Loader2 } from 'lucide-react'
import { ESTADOS_PARTE } from '@/constants/partesPSI'
import { INITIAL_PSI_STATE } from '@/types/psi'
import type { PsiFormState } from '@/types/psi'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Reconstruye un PsiFormState a partir de un parte devuelto por la API
function parteAFormState(parte: any): PsiFormState {
  const extra: Partial<PsiFormState> = parte.informacionExtra
    ? (typeof parte.informacionExtra === 'string'
      ? JSON.parse(parte.informacionExtra)
      : parte.informacionExtra)
    : {}

  if (Object.keys(extra).length > 0) {
    return { ...INITIAL_PSI_STATE, ...extra, numero: parte.numeroParte }
  }

  // Sin informacionExtra (partes anteriores): reconstruir desde columnas DB
  const tipologiasDB: string[] = Array.isArray(parte.tipologias) ? parte.tipologias : []
  const equipoWalkiesDB: Array<{ vehiculo?: string; equipo: string; walkie: string }> =
    Array.isArray(parte.equipoWalkies) ? parte.equipoWalkies : []
  const tabla1 = Array(8).fill(null).map((_, i) => {
    const row = equipoWalkiesDB.filter(r => r.vehiculo)[i]
    return { vehiculo: row?.vehiculo || '', equipo: row?.equipo || '', walkie: row?.walkie || '' }
  })
  const tabla2 = Array(8).fill(null).map((_, i) => {
    const row = equipoWalkiesDB.filter(r => !r.vehiculo)[i]
    return { equipo: row?.equipo || '', walkie: row?.walkie || '' }
  })

  return {
    ...INITIAL_PSI_STATE,
    numero: parte.numeroParte,
    fecha: parte.fecha ? new Date(parte.fecha).toISOString().split('T')[0] : '',
    lugar: parte.lugar || '',
    motivo: parte.motivo || '',
    alertante: parte.alertante || '',
    circulacion: parte.circulacion || '',
    observaciones: parte.observaciones || '',
    desarrolloDetallado: parte.desarrolloDetallado || '',
    tiempos: {
      llamada: parte.horaLlamada || '00:00',
      salida: parte.horaSalida || '00:00',
      llegada: parte.horaLlegada || '00:00',
      terminado: parte.horaTerminado || '00:00',
      disponible: parte.horaDisponible || '00:00',
    },
    prevencion: {
      mantenimiento: tipologiasDB.some(t => t === 'prevencion.mantenimiento' || t === 'mantenimiento'),
      practicas: tipologiasDB.some(t => t === 'prevencion.practicas' || t === 'practicas'),
      suministros: tipologiasDB.some(t => t === 'prevencion.suministros' || t === 'suministros'),
      preventivo: tipologiasDB.some(t => t === 'prevencion.preventivo' || t === 'preventivo'),
      otros: tipologiasDB.some(t => t === 'prevencion.otros'),
    },
    intervencion: {
      svb: tipologiasDB.some(t => t === 'intervencion.svb' || t === 'svb' || t === 'soporte_vital'),
      incendios: tipologiasDB.some(t => t === 'intervencion.incendios' || t === 'incendios'),
      inundaciones: tipologiasDB.some(t => t === 'intervencion.inundaciones' || t === 'inundaciones'),
      otros_riesgos_meteo: tipologiasDB.some(t => t === 'intervencion.otros_riesgos_meteo' || t === 'otros_riesgos_meteo' || t === 'riesgos_meteo'),
      activacion_pem_bor: tipologiasDB.some(t => t === 'intervencion.activacion_pem_bor' || t === 'activacion_pem_bor' || t === 'pem_bor'),
      otros: tipologiasDB.some(t => t === 'intervencion.otros'),
    },
    otros: {
      reunion_coordinacion: tipologiasDB.some(t => t === 'otros.reunion_coordinacion' || t === 'reunion_coordinacion'),
      reunion_areas: tipologiasDB.some(t => t === 'otros.reunion_areas' || t === 'reunion_areas'),
      limpieza: tipologiasDB.some(t => t === 'otros.limpieza' || t === 'limpieza'),
      formacion: tipologiasDB.some(t => t === 'otros.formacion' || t === 'formacion'),
      otros: tipologiasDB.some(t => t === 'otros.otros'),
    },
    tabla1,
    tabla2,
    matriculasImplicados: parte.matriculasImplicados
      ? String(parte.matriculasImplicados).split(',').map((s: string) => s.trim()).slice(0, 5).concat(Array(5).fill('')).slice(0, 5)
      : INITIAL_PSI_STATE.matriculasImplicados,
    heridosSi: !!parte.tieneHeridos,
    heridosNo: !parte.tieneHeridos,
    heridosNum: String(parte.numeroHeridos || ''),
    fallecidosSi: !!parte.tieneFallecidos,
    fallecidosNo: !parte.tieneFallecidos,
    fallecidosNum: String(parte.numeroFallecidos || ''),
    posiblesCausas: parte.posiblesCausas || '',
    policiaLocalDe: parte.policiaLocal || '',
    guardiaCivilDe: parte.guardiaCivil || '',
    indicativosInforman: parte.indicativoCumplimenta || '',
    responsableTurno: parte.responsableTurno || '',
    indicativoCumplimenta: parte.indicativoCumplimenta || '',
    firmaInformante: parte.firmaIndicativoCumplimenta || null,
    firmaResponsable: parte.firmaResponsableTurno || null,
    firmaJefe: parte.firmaJefeServicio || null,
  }
}

function PartesPageInner() {
  const router = useRouter()
  const [partes, setPartes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [descargando, setDescargando] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { cargarPartes() }, [page, filtroFecha, filtroEstado])

  useEffect(() => {
    const cecopalId = searchParams.get('cecopal')
    if (cecopalId) router.replace(`/partes/psi?cecopal=${cecopalId}`)
  }, [searchParams])

  const cargarPartes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filtroFecha) params.append('fecha', filtroFecha)
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado)
      const data = await fetch(`/api/partes/psi?${params}`).then(r => r.json())
      if (data.partes) { setPartes(data.partes); setTotalPages(data.totalPages) }
    } catch { /* silenciado */ }
    finally { setLoading(false) }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este parte?')) return
    try {
      const res = await fetch(`/api/partes/psi/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await cargarPartes()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'No se pudo eliminar')
      }
    } catch { /* silenciado */ }
  }

  const handleDescargarPDF = async (id: string, numeroParte: string) => {
    setDescargando(id)
    try {
      const res = await fetch(`/api/partes/psi/${id}`)
      if (!res.ok) { alert('No se pudo cargar el parte'); return }
      const parte = await res.json()
      const formState = parteAFormState(parte)
      const { generatePsiPdfV3 } = await import('@/lib/pdf-generator-v3')
      const doc = await generatePsiPdfV3(formState)
      doc.save(`PSI_${numeroParte}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error al generar el PDF')
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Partes de Servicio (PSI)</h1>
          <p className="text-gray-500 mt-1">Gestión de partes de servicio e intervención</p>
        </div>
        <Link
          href="/partes/psi"
          className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 shadow-md transition-colors whitespace-nowrap"
        >
          <Plus size={18} />
          Nuevo Parte PSI
        </Link>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white outline-none"
            >
              <option value="todos">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="pendiente_vb">Pendiente VB</option>
              <option value="completo">Completo</option>
            </select>
          </div>
          <button
            onClick={() => { setFiltroFecha(''); setFiltroEstado('todos'); setPage(1) }}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px] table-fixed">
          <colgroup>
            <col className="w-[130px]" />
            <col className="w-[110px]" />
            <col className="w-auto" />
            <col className="w-[150px]" />
            <col className="w-[120px]" />
            <col className="w-[140px]" />
          </colgroup>
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Nº Parte</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Fecha / Hora</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Lugar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Creado por</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <Loader2 className="animate-spin mx-auto text-orange-500 mb-2" size={24} />
                  <span className="text-sm text-gray-400">Cargando partes...</span>
                </td>
              </tr>
            ) : partes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-sm text-gray-400">
                  No hay partes que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              partes.map((parte: any) => {
                const estadoInfo = ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE]
                const fecha = new Date(parte.fecha)
                return (
                  <tr key={parte.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {parte.numeroParte}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{format(fecha, 'dd/MM/yy', { locale: es })}</span>
                      <span className="text-xs text-gray-400 ml-1">{format(fecha, 'HH:mm')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800 font-medium block truncate" title={parte.lugar}>
                        {parte.lugar}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {parte.creadoPor?.nombre} {parte.creadoPor?.apellidos?.[0]}.
                      </span>
                      {parte.creadoPor?.numeroVoluntario && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                          {parte.creadoPor.numeroVoluntario}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {estadoInfo ? (
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
                          href={`/partes/psi?id=${parte.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Abrir parte"
                        >
                          <Eye size={16} />
                        </Link>
                        {parte.googleDriveUrl && (
                          <a
                            href={parte.googleDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver en Google Drive"
                          >
                            <FileText size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => handleDescargarPDF(parte.id, parte.numeroParte)}
                          disabled={descargando === parte.id}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Descargar PDF"
                        >
                          {descargando === parte.id
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Download size={16} />
                          }
                        </button>
                        <button
                          onClick={() => handleEliminar(parte.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
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

export default function PartesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    }>
      <PartesPageInner />
    </Suspense>
  )
}
