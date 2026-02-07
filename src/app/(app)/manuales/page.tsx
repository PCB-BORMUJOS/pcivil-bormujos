'use client'
import { useState, useEffect } from 'react'
import { BookOpen, Upload, Search, Filter, Download, Edit2, Trash2, FileText, X, Plus } from 'lucide-react'

interface Manual {
  id: string
  titulo: string
  descripcion: string | null
  categoria: string
  tipo: string | null
  fabricante: string | null
  modelo: string | null
  url: string
  nombreArchivo: string
  tamano: number
  createdAt: string
  usuario: {
    nombre: string
    apellidos: string
  }
}

interface Stats {
  total: number
  porCategoria: {
    incendios: number
    socorrismo: number
    vehiculos: number
    transmisiones: number
    pma: number
    general: number
  }
}

const CATEGORIAS = [
  { value: 'incendios', label: 'Incendios', color: 'bg-orange-500' },
  { value: 'socorrismo', label: 'Socorrismo', color: 'bg-red-500' },
  { value: 'vehiculos', label: 'Vehículos', color: 'bg-blue-500' },
  { value: 'transmisiones', label: 'Transmisiones', color: 'bg-purple-500' },
  { value: 'pma', label: 'PMA', color: 'bg-green-500' },
  { value: 'general', label: 'General', color: 'bg-gray-500' },
]

const TIPOS_MANUAL = [
  { value: 'manual_usuario', label: 'Manual de Usuario' },
  { value: 'ficha_tecnica', label: 'Ficha Técnica' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'guia_rapida', label: 'Guía Rápida' },
]

export default function ManualesPage() {
  const [manuales, setManuales] = useState<Manual[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState('all')
  const [busqueda, setBusqueda] = useState('')
  
  // Modales
  const [showNuevoManual, setShowNuevoManual] = useState(false)
  const [showEditarManual, setShowEditarManual] = useState(false)
  const [manualSeleccionado, setManualSeleccionado] = useState<Manual | null>(null)
  
  // Upload
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [categoriaFiltro, busqueda])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        tipo: 'manuales',
        categoria: categoriaFiltro,
      })
      if (busqueda) params.append('busqueda', busqueda)

      const res = await fetch(`/api/logistica?${params}`)
      const data = await res.json()
      setManuales(data.manuales || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error cargando manuales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubirManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)
    formData.append('tipo', 'manual')

    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await cargarDatos()
        setShowNuevoManual(false)
        alert('Manual subido correctamente')
      } else {
        const error = await res.json()
        alert(error.error || 'Error al subir manual')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir manual')
    } finally {
      setUploading(false)
    }
  }

  const handleEditarManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!manualSeleccionado) return

    const formData = new FormData(e.currentTarget)
    const data = {
      tipo: 'manual',
      id: manualSeleccionado.id,
      titulo: formData.get('titulo'),
      descripcion: formData.get('descripcion'),
      categoria: formData.get('categoria'),
      tipoManual: formData.get('tipoManual'),
      fabricante: formData.get('fabricante'),
      modelo: formData.get('modelo'),
    }

    try {
      const res = await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await cargarDatos()
        setShowEditarManual(false)
        setManualSeleccionado(null)
        alert('Manual actualizado correctamente')
      } else {
        alert('Error al actualizar manual')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar manual')
    }
  }

  const handleEliminarManual = async (manual: Manual) => {
    if (!confirm(`¿Eliminar el manual "${manual.titulo}"?`)) return

    try {
      const res = await fetch(`/api/logistica?tipo=manual&id=${manual.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await cargarDatos()
        alert('Manual eliminado correctamente')
      } else {
        alert('Error al eliminar manual')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar manual')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getCategoriaLabel = (value: string) => {
    return CATEGORIAS.find(c => c.value === value)?.label || value
  }

  const getCategoriaColor = (value: string) => {
    return CATEGORIAS.find(c => c.value === value)?.color || 'bg-gray-500'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manuales</h1>
            <p className="text-gray-600">Biblioteca de documentación técnica</p>
          </div>
        </div>
        <button
          onClick={() => setShowNuevoManual(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Upload className="w-5 h-5" />
          Subir Manual
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          {CATEGORIAS.map((cat) => (
            <div key={cat.value} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-600">{cat.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.porCategoria[cat.value as keyof typeof stats.porCategoria]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, fabricante, modelo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtro por categoría */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Manuales */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Cargando manuales...</p>
        </div>
      ) : manuales.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay manuales disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {manuales.map((manual) => (
            <div key={manual.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
              {/* Icono y Categoría */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getCategoriaColor(manual.categoria)}`}>
                  {getCategoriaLabel(manual.categoria)}
                </span>
              </div>

              {/* Título */}
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{manual.titulo}</h3>

              {/* Descripción */}
              {manual.descripcion && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{manual.descripcion}</p>
              )}

              {/* Metadatos */}
              <div className="space-y-1 mb-3">
                {manual.fabricante && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Fabricante:</span> {manual.fabricante}
                  </p>
                )}
                {manual.modelo && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Modelo:</span> {manual.modelo}
                  </p>
                )}
                {manual.tipo && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Tipo:</span>{' '}
                    {TIPOS_MANUAL.find(t => t.value === manual.tipo)?.label || manual.tipo}
                  </p>
                )}
              </div>

              {/* Info adicional */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pb-3 border-b">
                <span>{formatBytes(manual.tamano)}</span>
                <span>{new Date(manual.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <a
                  href={manual.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Ver PDF
                </a>
                <button
                  onClick={() => {
                    setManualSeleccionado(manual)
                    setShowEditarManual(true)
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEliminarManual(manual)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Manual */}
      {showNuevoManual && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Subir Manual</h2>
              <button onClick={() => setShowNuevoManual(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubirManual} className="p-6">
              <div className="space-y-4">
                {/* Archivo PDF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo PDF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo 20MB</p>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Manual de Usuario Motobomba Honda WB20"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    name="descripcion"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Descripción breve del manual..."
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoria"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Manual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Manual</label>
                  <select
                    name="tipoManual"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_MANUAL.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fabricante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
                  <input
                    type="text"
                    name="fabricante"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Honda, Motorola, etc."
                  />
                </div>

                {/* Modelo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: WB20, DP4800, etc."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNuevoManual(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir Manual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Manual */}
      {showEditarManual && manualSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Editar Manual</h2>
              <button
                onClick={() => {
                  setShowEditarManual(false)
                  setManualSeleccionado(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditarManual} className="p-6">
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    required
                    defaultValue={manualSeleccionado.titulo}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    name="descripcion"
                    rows={3}
                    defaultValue={manualSeleccionado.descripcion || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoria"
                    required
                    defaultValue={manualSeleccionado.categoria}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Manual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Manual</label>
                  <select
                    name="tipoManual"
                    defaultValue={manualSeleccionado.tipo || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_MANUAL.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fabricante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
                  <input
                    type="text"
                    name="fabricante"
                    defaultValue={manualSeleccionado.fabricante || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Modelo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    defaultValue={manualSeleccionado.modelo || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarManual(false)
                    setManualSeleccionado(null)
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
