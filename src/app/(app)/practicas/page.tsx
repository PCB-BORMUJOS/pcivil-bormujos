'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Plus, Search, Edit, Trash2, X, ChevronDown,
  BookOpen, Users, Clock, AlertTriangle, Shield,
  ClipboardList, CheckCircle2, RefreshCw
} from 'lucide-react'

const FAMILIAS = [
  { id: 'socorrismo', label: 'Socorrismo', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'incendios', label: 'Incendios', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'rescate', label: 'Rescate', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'transmisiones', label: 'Transmisiones', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'drones', label: 'Drones/RPAS', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'pma', label: 'PMA', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'vehiculos', label: 'Vehículos', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const NIVELES = [
  { id: 'basico', label: 'Básico', color: 'bg-green-100 text-green-700' },
  { id: 'intermedio', label: 'Intermedio', color: 'bg-amber-100 text-amber-700' },
  { id: 'avanzado', label: 'Avanzado', color: 'bg-red-100 text-red-700' },
]

const RIESGOS = [
  { id: 'bajo', label: 'Bajo', color: 'text-green-600' },
  { id: 'medio', label: 'Medio', color: 'text-amber-600' },
  { id: 'alto', label: 'Alto', color: 'text-red-600' },
]

interface Practica {
  id: string; numero: string; titulo: string; familia: string
  subfamilia?: string; objetivo: string; descripcion?: string
  desarrollo?: string; conclusiones?: string
  personalMinimo: number; materialNecesario?: string
  riesgoPractica: string; riesgoIntervencion?: string
  duracionEstimada: number; nivel: string; prerequisitos?: string
  activa: boolean; createdAt: string
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5"

function getFamiliaStyle(familia: string) {
  return FAMILIAS.find(f => f.id === familia)?.color || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function PracticasPage() {
  const { data: session } = useSession()
  const [practicas, setPracticas] = useState<Practica[]>([])
  const [familias, setFamilias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroFamilia, setFiltroFamilia] = useState('all')
  const [filtroNivel, setFiltroNivel] = useState('all')
  const [practicaExpandida, setPracticaExpandida] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [practicaEditando, setPracticaEditando] = useState<Practica | null>(null)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroFamilia !== 'all') params.set('familia', filtroFamilia)
      if (filtroNivel !== 'all') params.set('nivel', filtroNivel)
      if (searchTerm) params.set('busqueda', searchTerm)
      const res = await fetch(`/api/practicas?${params}`)
      const data = await res.json()
      setPracticas(data.practicas || [])
      setFamilias(data.familias || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargarDatos() }, [filtroFamilia, filtroNivel])
  useEffect(() => {
    const t = setTimeout(() => cargarDatos(), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSaving(true)
    const body = {
      id: practicaEditando?.id,
      numero: f.get('numero'),
      titulo: f.get('titulo'),
      familia: f.get('familia'),
      subfamilia: f.get('subfamilia'),
      objetivo: f.get('objetivo'),
      descripcion: f.get('descripcion'),
      desarrollo: f.get('desarrollo'),
      conclusiones: f.get('conclusiones'),
      personalMinimo: f.get('personalMinimo'),
      materialNecesario: f.get('materialNecesario'),
      riesgoPractica: f.get('riesgoPractica'),
      riesgoIntervencion: f.get('riesgoIntervencion'),
      duracionEstimada: f.get('duracionEstimada'),
      nivel: f.get('nivel'),
      prerequisitos: f.get('prerequisitos'),
    }
    const method = practicaEditando ? 'PUT' : 'POST'
    await fetch('/api/practicas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowNueva(false)
    setPracticaEditando(null)
    cargarDatos()
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Desactivar esta práctica?')) return
    await fetch(`/api/practicas?id=${id}`, { method: 'DELETE' })
    cargarDatos()
  }

  const practicasFiltradas = practicas.filter(p =>
    !searchTerm || p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const porFamilia = practicasFiltradas.reduce((acc, p) => {
    if (!acc[p.familia]) acc[p.familia] = []
    acc[p.familia].push(p)
    return acc
  }, {} as Record<string, Practica[]>)

  const isAdmin = ['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(
    ((session?.user as any)?.rol || '').toLowerCase()
  )

  const FormularioPractica = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {practicaEditando ? `Editar — ${practicaEditando.numero}` : 'Nueva práctica'}
            </h3>
            <p className="text-xs text-slate-500">Ficha del Libro de Prácticas PCB</p>
          </div>
          <button onClick={() => { setShowNueva(false); setPracticaEditando(null) }}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleGuardar} className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BookOpen size={12} />Identificación
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Número (ej: SOC-001)</label>
                <input name="numero" defaultValue={practicaEditando?.numero || ''} placeholder="AUTO" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Familia *</label>
                <select name="familia" required defaultValue={practicaEditando?.familia || ''} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {FAMILIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Título *</label>
                <input name="titulo" required defaultValue={practicaEditando?.titulo || ''} placeholder="Ej: RCP en adulto con DEA" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Subfamilia</label>
                <input name="subfamilia" defaultValue={practicaEditando?.subfamilia || ''} placeholder="Ej: RCP, Inmovilización..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nivel</label>
                <select name="nivel" defaultValue={practicaEditando?.nivel || 'basico'} className={inputCls}>
                  {NIVELES.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ClipboardList size={12} />Contenido
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Objetivo *</label>
                <textarea name="objetivo" required rows={2} defaultValue={practicaEditando?.objetivo || ''}
                  placeholder="¿Qué se pretende conseguir?" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea name="descripcion" rows={3} defaultValue={practicaEditando?.descripcion || ''}
                  placeholder="Descripción general..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Desarrollo de la práctica</label>
                <textarea name="desarrollo" rows={6} defaultValue={practicaEditando?.desarrollo || ''}
                  placeholder="Pasos detallados para el desarrollo..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Conclusiones</label>
                <textarea name="conclusiones" rows={3} defaultValue={practicaEditando?.conclusiones || ''}
                  placeholder="Puntos clave a reforzar..." className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shield size={12} />Recursos y riesgos
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Personal mínimo</label>
                <input name="personalMinimo" type="number" min="1" defaultValue={practicaEditando?.personalMinimo || 2} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Duración estimada (min)</label>
                <input name="duracionEstimada" type="number" min="5" defaultValue={practicaEditando?.duracionEstimada || 30} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Material necesario</label>
                <textarea name="materialNecesario" rows={2} defaultValue={practicaEditando?.materialNecesario || ''}
                  placeholder="Material necesario..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Riesgo de la práctica</label>
                <select name="riesgoPractica" defaultValue={practicaEditando?.riesgoPractica || 'bajo'} className={inputCls}>
                  {RIESGOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Riesgo de intervención</label>
                <input name="riesgoIntervencion" defaultValue={practicaEditando?.riesgoIntervencion || ''}
                  placeholder="No se tendrá en cuenta..." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Prerequisitos</label>
                <input name="prerequisitos" defaultValue={practicaEditando?.prerequisitos || ''}
                  placeholder="Ej: SOC-001 completada" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowNueva(false); setPracticaEditando(null) }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Guardando...' : practicaEditando ? 'Guardar cambios' : 'Crear práctica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-orange-500" size={24} />Libro de Prácticas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Catálogo de prácticas operativas — Protección Civil Bormujos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarDatos} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
          {isAdmin && (
            <button onClick={() => setShowNueva(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm">
              <Plus size={16} />Nueva práctica
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 font-medium">Total prácticas</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{practicas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 font-medium">Familias</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{familias.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 font-medium">Nivel básico</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{practicas.filter(p => p.nivel === 'basico').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 font-medium">Nivel avanzado</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{practicas.filter(p => p.nivel === 'avanzado').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, número u objetivo..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroFamilia('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroFamilia === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            Todas
          </button>
          {FAMILIAS.map(f => (
            <button key={f.id} onClick={() => setFiltroFamilia(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroFamilia === f.id ? f.color : 'bg-white text-slate-600 border-slate-200'}`}>
              {f.label}
              {familias.find((x: any) => x.familia === f.id) && (
                <span className="ml-1.5 opacity-70">{familias.find((x: any) => x.familia === f.id)?._count.id}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFiltroNivel('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroNivel === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            Todos los niveles
          </button>
          {NIVELES.map(n => (
            <button key={n.id} onClick={() => setFiltroNivel(n.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroNivel === n.id ? n.color + ' border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando prácticas...</div>
      ) : practicasFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <BookOpen size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No hay prácticas registradas</p>
          {isAdmin && (
            <button onClick={() => setShowNueva(true)} className="mt-3 text-orange-500 text-sm font-medium hover:underline">
              + Crear la primera práctica
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porFamilia).map(([familia, pracs]) => {
            const familiaInfo = FAMILIAS.find(f => f.id === familia)
            return (
              <div key={familia}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getFamiliaStyle(familia)}`}>
                    {familiaInfo?.label || familia.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">{pracs.length} práctica{pracs.length !== 1 ? 's' : ''}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <div className="space-y-2">
                  {pracs.map(p => {
                    const isOpen = practicaExpandida === p.id
                    const nivelInfo = NIVELES.find(n => n.id === p.nivel)
                    const riesgoInfo = RIESGOS.find(r => r.id === p.riesgoPractica)
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <button onClick={() => setPracticaExpandida(isOpen ? null : p.id)}
                          className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded shrink-0">{p.numero}</span>
                              <p className="font-semibold text-slate-800 text-sm truncate">{p.titulo}</p>
                              {p.subfamilia && <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded shrink-0">{p.subfamilia}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${nivelInfo?.color}`}>{nivelInfo?.label}</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock size={10} />{p.duracionEstimada}min</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><Users size={10} />≥{p.personalMinimo}</span>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                            <div className="bg-white rounded-lg p-3.5 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Objetivo</p>
                              <p className="text-sm text-slate-700">{p.objetivo}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Personal</p>
                                <p className="text-sm font-bold text-slate-800">≥ {p.personalMinimo}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Duración</p>
                                <p className="text-sm font-bold text-slate-800">{p.duracionEstimada} min</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Riesgo</p>
                                <p className={`text-sm font-bold ${riesgoInfo?.color}`}>{riesgoInfo?.label}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Nivel</p>
                                <p className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${nivelInfo?.color}`}>{nivelInfo?.label}</p>
                              </div>
                            </div>
                            {p.descripcion && <div className="bg-white rounded-lg p-3.5 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Descripción</p><p className="text-sm text-slate-600 whitespace-pre-line">{p.descripcion}</p></div>}
                            {p.desarrollo && <div className="bg-white rounded-lg p-3.5 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Desarrollo</p><p className="text-sm text-slate-600 whitespace-pre-line">{p.desarrollo}</p></div>}
                            {p.materialNecesario && <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100"><p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Material necesario</p><p className="text-sm text-slate-700">{p.materialNecesario}</p></div>}
                            {p.conclusiones && <div className="bg-green-50 rounded-lg p-3.5 border border-green-100"><p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">Conclusiones</p><p className="text-sm text-slate-700">{p.conclusiones}</p></div>}
                            {p.riesgoIntervencion && <div className="bg-slate-100 rounded-lg p-3 border border-slate-200 flex items-start gap-2"><AlertTriangle size={14} className="text-slate-500 shrink-0 mt-0.5" /><div><p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Riesgo de intervención (no se tendrá en cuenta)</p><p className="text-xs text-slate-600">{p.riesgoIntervencion}</p></div></div>}
                            {p.prerequisitos && <div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={12} /><span>Prerequisito: <span className="font-medium">{p.prerequisitos}</span></span></div>}
                            {isAdmin && (
                              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                <button onClick={() => handleEliminar(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50"><Trash2 size={12} />Desactivar</button>
                                <button onClick={() => setPracticaEditando(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"><Edit size={12} />Editar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {(showNueva || practicaEditando) && <FormularioPractica />}
    </div>
  )
}