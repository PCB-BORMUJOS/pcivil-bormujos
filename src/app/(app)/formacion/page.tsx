'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Package, Users, Calendar, BookOpen, Award, AlertCircle, Layers, Edit, Trash2, X } from 'lucide-react'

// Interfaces
interface Articulo {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  stockActual: number
  stockMinimo: number
  stockAsignado?: number
  unidad: string
  familia: {
    id: string
    nombre: string
  }
}

interface Familia {
  id: string
  nombre: string
  slug: string
}

interface Curso {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  tipo: string
  duracionHoras: number
  validezMeses?: number
  activo: boolean
  _count?: {
    convocatorias: number
    certificaciones: number
  }
}

interface Convocatoria {
  id: string
  codigo: string
  fechaInicio: string
  fechaFin: string
  lugar?: string
  horario?: string
  plazasDisponibles: number
  plazasOcupadas: number
  estado: string
  curso: {
    id: string
    nombre: string
    tipo: string
  }
  _count?: {
    inscripciones: number
  }
}

interface Inscripcion {
  id: string
  fechaInscripcion: string
  estado: string
  porcentajeAsistencia?: number
  notaFinal?: number
  apta?: boolean
  usuario: {
    id: string
    nombre: string
    apellidos: string
    email: string
    numeroVoluntario?: string
  }
  convocatoria: {
    id: string
    codigo: string
    curso: {
      id: string
      nombre: string
    }
  }
}

interface Certificacion {
  id: string
  numeroCertificado?: string
  fechaObtencion: string
  fechaExpiracion?: string
  entidadEmisora: string
  vigente: boolean
  renovada: boolean
  certificadoUrl?: string
  usuario: {
    id: string
    nombre: string
    apellidos: string
    numeroVoluntario?: string
  }
  curso: {
    id: string
    nombre: string
    tipo: string
  }
}

interface NecesidadFormativa {
  id: string
  descripcion: string
  areaAfectada: string
  numeroPersonas: number
  motivo: string
  impacto: string
  urgencia: string
  prioridad: number
  fechaLimite?: string
  estado: string
  detectadaPor: string
  fechaDeteccion: string
  curso?: {
    id: string
    nombre: string
  }
}

interface Stats {
  totalCursos: number
  convocatoriasActivas: number
  certificacionesVigentes: number
  necesidadesPendientes: number
}

export default function FormacionPage() {
  // Estados principales
  const [mainTab, setMainTab] = useState<'inventario' | 'catalogo' | 'convocatorias' | 'inscripciones' | 'certificaciones' | 'necesidades'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [loading, setLoading] = useState(true)

  // Estados de datos
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([])
  const [necesidades, setNecesidades] = useState<NecesidadFormativa[]>([])
  const [stats, setStats] = useState<Stats>({
    totalCursos: 0,
    convocatoriasActivas: 0,
    certificacionesVigentes: 0,
    necesidadesPendientes: 0
  })

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')

  // Estados de modales (base)
  const [showNuevoCurso, setShowNuevoCurso] = useState(false)
  const [showNuevaConvocatoria, setShowNuevaConvocatoria] = useState(false)
  const [showNuevaInscripcion, setShowNuevaInscripcion] = useState(false)
  const [showNuevaCertificacion, setShowNuevaCertificacion] = useState(false)
  const [showNuevaNecesidad, setShowNuevaNecesidad] = useState(false)

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos()
  }, [])

  // Cargar datos según tab
  useEffect(() => {
    if (mainTab === 'catalogo') cargarCursos()
    if (mainTab === 'convocatorias') cargarConvocatorias()
    if (mainTab === 'inscripciones') cargarInscripciones()
    if (mainTab === 'certificaciones') cargarCertificaciones()
    if (mainTab === 'necesidades') cargarNecesidades()
  }, [mainTab])

  // Función para cargar todos los datos
  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar artículos de formación
      const resArticulos = await fetch('/api/formacion?tipo=inventario')
      const dataArticulos = await resArticulos.json()

      setArticulos(dataArticulos.articulos || [])
      setFamilias(dataArticulos.familias || [])

      // Cargar stats
      const resStats = await fetch('/api/formacion?tipo=stats')
      const dataStats = await resStats.json()
      setStats(dataStats.stats || {
        totalCursos: 0,
        convocatoriasActivas: 0,
        certificacionesVigentes: 0,
        necesidadesPendientes: 0
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Funciones de carga específicas
  const cargarCursos = async () => {
    try {
      const res = await fetch('/api/formacion?tipo=cursos')
      const data = await res.json()
      setCursos(data.cursos || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarConvocatorias = async () => {
    try {
      const res = await fetch('/api/formacion?tipo=convocatorias')
      const data = await res.json()
      setConvocatorias(data.convocatorias || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarInscripciones = async () => {
    try {
      const res = await fetch('/api/formacion?tipo=inscripciones')
      const data = await res.json()
      setInscripciones(data.inscripciones || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarCertificaciones = async () => {
    try {
      const res = await fetch('/api/formacion?tipo=certificaciones&vigentes=true')
      const data = await res.json()
      setCertificaciones(data.certificaciones || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarNecesidades = async () => {
    try {
      const res = await fetch('/api/formacion?tipo=necesidades')
      const data = await res.json()
      setNecesidades(data.necesidades || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Filtrar artículos
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = searchTerm === '' ||
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia.id === selectedFamiliaFilter
    return matchSearch && matchFamilia
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-xl">
            <BookOpen className="text-purple-600" size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">FORMACIÓN</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Área de Formación</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Gestión de cursos, certificaciones y formación</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={cargarDatos}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cursos', value: stats.totalCursos, icon: BookOpen, bg: 'bg-purple-100', color: 'text-purple-600' },
          { label: 'Convocatorias Activas', value: stats.convocatoriasActivas, icon: Calendar, bg: 'bg-blue-100', color: 'text-blue-600' },
          { label: 'Certificaciones Vigentes', value: stats.certificacionesVigentes, icon: Award, bg: 'bg-green-100', color: 'text-green-600' },
          { label: 'Necesidades Pendientes', value: stats.necesidadesPendientes, icon: AlertCircle, bg: 'bg-amber-100', color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-medium">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.bg} p-2.5 rounded-xl`}>
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Tabs Principales */}
        <div className="flex overflow-x-auto border-b border-slate-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'inventario', label: 'Inventario', icon: Package },
            { id: 'catalogo', label: 'Catálogo', icon: BookOpen },
            { id: 'convocatorias', label: 'Convocatorias', icon: Calendar },
            { id: 'inscripciones', label: 'Inscripciones', icon: Users },
            { id: 'certificaciones', label: 'Certificaciones', icon: Award },
            { id: 'necesidades', label: 'Necesidades', icon: AlertCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${mainTab === tab.id
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido de Inventario */}
        {mainTab === 'inventario' && (
          <div>
            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              {[
                { id: 'stock', label: 'Stock', icon: Package },
                { id: 'peticiones', label: 'Peticiones', icon: Package },
                { id: 'movimientos', label: 'Movimientos', icon: RefreshCw },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInventoryTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${inventoryTab === tab.id
                      ? 'border-purple-500 text-purple-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Tab Stock */}
              {inventoryTab === 'stock' && (
                <div>
                  {/* Filtros */}
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text"
                        placeholder="Buscar artículos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <select
                      value={selectedFamiliaFilter}
                      onChange={(e) => setSelectedFamiliaFilter(e.target.value)}
                      className="px-4 py-2.5 border border-slate-200 rounded-lg"
                    >
                      <option value="all">Todas las familias</option>
                      {familias.map(fam => (
                        <option key={fam.id} value={fam.id}>{fam.nombre}</option>
                      ))}
                    </select>
                    <button
                      className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Layers size={18} />
                      Familias
                    </button>
                  </div>

                  {/* Tabla de artículos */}
                  {loading ? (
                    <div className="text-center py-12 text-slate-400">
                      <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                      <p>Cargando...</p>
                    </div>
                  ) : articulosFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Package size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No hay artículos</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 border-y border-slate-200">
                        <tr>
                          <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Artículo</th>
                          <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Familia</th>
                          <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                          <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {articulosFiltrados.map(art => (
                          <tr key={art.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <p className="font-medium text-slate-800">{art.nombre}</p>
                              <p className="text-xs text-slate-500">Cód: {art.codigo || '-'}</p>
                            </td>
                            <td className="p-3 text-sm text-slate-600">{art.familia?.nombre || '-'}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-slate-800">{art.stockActual}</span>
                              <span className="text-slate-400 text-xs"> {art.unidad}</span>
                            </td>
                            <td className="p-3 text-center">
                              {art.stockActual <= art.stockMinimo ? (
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">⚠ Bajo</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">✓ OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab Peticiones */}
              {inventoryTab === 'peticiones' && (
                <div className="text-center py-12 text-slate-400">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Próximamente: Peticiones de material formativo</p>
                </div>
              )}

              {/* Tab Movimientos */}
              {inventoryTab === 'movimientos' && (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Próximamente: Historial de movimientos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contenido de Catálogo de Cursos */}
        {mainTab === 'catalogo' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Catálogo de Cursos</h3>
                <p className="text-slate-600 text-sm">Gestión del catálogo de cursos de formación</p>
              </div>
              <button
                onClick={() => { console.log('Crear curso'); setShowNuevoCurso(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                <Plus size={18} />
                Nuevo Curso
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                <p>Cargando...</p>
              </div>
            ) : cursos.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-4">No hay cursos en el catálogo</p>
                <button
                  onClick={() => { console.log('Crear curso'); setShowNuevoCurso(true); }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus size={18} className="inline mr-2" />
                  Crear Primer Curso
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cursos.map(curso => (
                  <div key={curso.id} className="bg-white border-2 border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                          <BookOpen size={24} className="text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{curso.nombre}</h4>
                          <p className="text-sm text-slate-500">{curso.codigo}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-slate-600">{curso.duracionHoras} horas</span>
                      </div>
                      {curso.validezMeses && (
                        <div className="flex items-center gap-2 text-sm">
                          <Award size={14} className="text-slate-400" />
                          <span className="text-slate-600">Validez: {curso.validezMeses} meses</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-slate-600">{curso._count?.convocatorias || 0} convocatorias</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {curso.tipo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido de Convocatorias */}
        {mainTab === 'convocatorias' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Convocatorias</h3>
                <p className="text-slate-600 text-sm">Fechas y lugares de los cursos</p>
              </div>
              <button
                onClick={() => { console.log('Crear convocatoria'); setShowNuevaConvocatoria(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Plus size={18} />
                Nueva Convocatoria
              </button>
            </div>

            {convocatorias.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No hay convocatorias</p>
              </div>
            ) : (
              <div className="space-y-3">
                {convocatorias.map(conv => (
                  <div key={conv.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Calendar size={24} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{conv.curso.nombre}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conv.estado === 'inscripciones_abiertas' ? 'bg-green-100 text-green-700' :
                                conv.estado === 'en_curso' ? 'bg-blue-100 text-blue-700' :
                                  conv.estado === 'planificada' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700'
                              }`}>
                              {conv.estado === 'inscripciones_abiertas' ? 'Inscripciones Abiertas' :
                                conv.estado === 'en_curso' ? 'En Curso' :
                                  conv.estado === 'planificada' ? 'Planificada' :
                                    conv.estado === 'finalizada' ? 'Finalizada' : conv.estado}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {new Date(conv.fechaInicio).toLocaleDateString('es-ES')} - {new Date(conv.fechaFin).toLocaleDateString('es-ES')}
                          </p>
                          {conv.lugar && (
                            <p className="text-sm text-slate-600 mt-1">{conv.lugar}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>{conv.plazasOcupadas}/{conv.plazasDisponibles} plazas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido de Inscripciones */}
        {mainTab === 'inscripciones' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Inscripciones</h3>
                <p className="text-slate-600 text-sm">Voluntarios inscritos en cursos</p>
              </div>
              <button
                onClick={() => { console.log('Crear inscripción'); setShowNuevaInscripcion(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <Plus size={18} />
                Nueva Inscripción
              </button>
            </div>

            {inscripciones.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Users size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No hay inscripciones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inscripciones.map(insc => (
                  <div key={insc.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                          <Users size={24} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{insc.usuario.nombre} {insc.usuario.apellidos}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${insc.estado === 'confirmada' ? 'bg-green-100 text-green-700' :
                                insc.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                  insc.estado === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-700'
                              }`}>
                              {insc.estado}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {insc.convocatoria.curso.nombre} - {insc.convocatoria.codigo}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Inscrito: {new Date(insc.fechaInscripcion).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido de Certificaciones */}
        {mainTab === 'certificaciones' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Certificaciones</h3>
                <p className="text-slate-600 text-sm">Certificados obtenidos por voluntarios</p>
              </div>
              <button
                onClick={() => { console.log('Crear certificación'); setShowNuevaCertificacion(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                <Plus size={18} />
                Nueva Certificación
              </button>
            </div>

            {certificaciones.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Award size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No hay certificaciones vigentes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificaciones.map(cert => (
                  <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Award size={24} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{cert.usuario.nombre} {cert.usuario.apellidos}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cert.vigente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                              {cert.vigente ? 'Vigente' : 'Expirada'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{cert.curso.nombre}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Obtenido: {new Date(cert.fechaObtencion).toLocaleDateString('es-ES')}</span>
                            {cert.fechaExpiracion && (
                              <span>Expira: {new Date(cert.fechaExpiracion).toLocaleDateString('es-ES')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido de Necesidades Formativas */}
        {mainTab === 'necesidades' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Necesidades Formativas</h3>
                <p className="text-slate-600 text-sm">Planificación de formación</p>
              </div>
              <button
                onClick={() => { console.log('Crear necesidad'); setShowNuevaNecesidad(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                <Plus size={18} />
                Nueva Necesidad
              </button>
            </div>

            {necesidades.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No hay necesidades formativas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {necesidades.map(nec => (
                  <div key={nec.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${nec.prioridad === 1 ? 'bg-red-100' :
                            nec.prioridad === 2 ? 'bg-orange-100' :
                              nec.prioridad === 3 ? 'bg-amber-100' : 'bg-slate-100'
                          }`}>
                          <AlertCircle size={24} className={
                            nec.prioridad === 1 ? 'text-red-600' :
                              nec.prioridad === 2 ? 'text-orange-600' :
                                nec.prioridad === 3 ? 'text-amber-600' : 'text-slate-600'
                          } />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{nec.descripcion.substring(0, 50)}...</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${nec.estado === 'identificada' ? 'bg-red-100 text-red-700' :
                                nec.estado === 'planificada' ? 'bg-blue-100 text-blue-700' :
                                  nec.estado === 'cubierta' ? 'bg-green-100 text-green-700' :
                                    'bg-slate-100 text-slate-700'
                              }`}>
                              {nec.estado}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            Área: {nec.areaAfectada} - {nec.numeroPersonas} personas
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Detectada por: {nec.detectadaPor}</span>
                            <span>{new Date(nec.fechaDeteccion).toLocaleDateString('es-ES')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Placeholder - Nuevo Curso */}
      {showNuevoCurso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Nuevo Curso</h3>
              <button onClick={() => setShowNuevoCurso(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Modal de creación de curso - PRÓXIMAMENTE</p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowNuevoCurso(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
