'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Download, Trash2, Eye, FileText } from 'lucide-react'
import { ESTADOS_PARTE } from '@/constants/partesPSI'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function PartesPageInner() {
  const router = useRouter()
  const [partes, setPartes] = useState([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Paginación
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    cargarPartes()
  }, [page, filtroFecha, filtroEstado])

  // Redirigir a /partes/psi?cecopal=ID si viene ?cecopal=ID desde CECOPAL
  useEffect(() => {
    const cecopalId = searchParams.get('cecopal')
    if (cecopalId) {
      router.replace(`/partes/psi?cecopal=${cecopalId}`)
    }
  }, [searchParams])

  const cargarPartes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filtroFecha) params.append('fecha', filtroFecha)
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado)

      const response = await fetch(`/api/partes/psi?${params}`)
      const data = await response.json()
      if (data.partes) {
        setPartes(data.partes)
        setTotalPages(data.totalPages)
      }
    } catch {
      /* silenciado */
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este parte?')) return
    try {
      const response = await fetch(`/api/partes/psi?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await cargarPartes()
      } else {
        alert('No se pudo eliminar (requiere permisos de Superadmin)')
      }
    } catch {
      /* silenciado */
    }
  }

  const handleDescargarPDF = async (id: string, numeroParte: string) => {
    // Cargamos el parte y generamos el PDF con pdf-generator-v3 (mismo que el formulario)
    try {
      const res = await fetch(`/api/partes/psi/${id}`)
      if (!res.ok) { alert('No se pudo cargar el parte'); return }
      const parte = await res.json()

      const extra = parte.informacionExtra
        ? (typeof parte.informacionExtra === 'string' ? JSON.parse(parte.informacionExtra) : parte.informacionExtra)
        : {}

      const { generatePsiPdfV3 } = await import('@/lib/pdf-generator-v3')
      const doc = await generatePsiPdfV3({ ...extra, numero: numeroParte })
      doc.save(`PSI_${numeroParte}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error al generar el PDF')
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
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 shadow-md transition-colors"
        >
          <Plus size={20} />
          <span>Nuevo Parte PSI</span>
        </Link>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por fecha</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="pendiente_vb">Pendiente VB</option>
              <option value="completo">Completo</option>
            </select>
          </div>
          <div className="h-10 flex">
            <button
              onClick={() => { setFiltroFecha(''); setFiltroEstado('todos'); setPage(1) }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium flex-1"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-gray-700">Nº Parte</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-700">Fecha</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-700">Lugar</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Creado por</th>
              <th className="text-center p-4 text-sm font-semibold text-gray-700">Estado</th>
              <th className="text-center p-4 text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Cargando...</td>
              </tr>
            ) : partes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No hay partes que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              partes.map((parte: any) => (
                <tr key={parte.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-sm font-medium text-gray-700">{parte.numeroParte}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {format(new Date(parte.fecha), 'dd/MM/yyyy', { locale: es })}
                    <div className="text-xs text-gray-400">{format(new Date(parte.fecha), 'HH:mm')}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-800 font-medium">{parte.lugar}</td>
                  <td className="p-4 text-sm text-gray-600 hidden md:table-cell">
                    {parte.creadoPor?.nombre} {parte.creadoPor?.apellidos ? parte.creadoPor.apellidos[0] + '.' : ''}
                    <span className="ml-1 text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                      {parte.creadoPor?.numeroVoluntario}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE] ? (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE].bgColor} ${ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE].textColor} ${ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE].borderColor}`}>
                        {ESTADOS_PARTE[parte.estado as keyof typeof ESTADOS_PARTE].label}
                      </span>
                    ) : <span>{parte.estado}</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/partes/psi?id=${parte.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Abrir parte"
                      >
                        <Eye size={18} />
                      </Link>
                      {parte.googleDriveUrl && (
                        <a
                          href={parte.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                          title="Ver en Google Drive"
                        >
                          <FileText size={18} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDescargarPDF(parte.id, parte.numeroParte)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                        title="Descargar PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleEliminar(parte.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
            Página {page} de {totalPages}
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
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
      <PartesPageInner />
    </Suspense>
  )
}
