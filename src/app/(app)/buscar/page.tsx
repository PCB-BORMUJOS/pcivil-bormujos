'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, User, Truck, Briefcase, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Voluntario {
  id: string; nombre: string; apellidos: string; email: string
  numeroVoluntario?: string; rol: { nombre: string }
}
interface Vehiculo {
  id: string; indicativo: string; matricula: string
  marca: string; modelo: string; tipo: string; estado: string
}
interface Servicio {
  id: string; nombre: string; descripcion?: string
}

const ESTADO_COLORS: Record<string, string> = {
  operativo: 'bg-green-100 text-green-700',
  averia: 'bg-red-100 text-red-700',
  revision: 'bg-yellow-100 text-yellow-700',
}

function BuscarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') || ''
  const [loading, setLoading] = useState(false)
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [inputVal, setInputVal] = useState(q)

  const buscar = useCallback(async (query: string) => {
    if (!query || query.length < 2) return
    setLoading(true)
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setVoluntarios(data.voluntarios || [])
      setVehiculos(data.vehiculos || [])
      setServicios(data.servicios || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setInputVal(q)
    buscar(q)
  }, [q, buscar])

  const total = voluntarios.length + vehiculos.length + servicios.length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && inputVal.trim()) router.push(`/buscar?q=${encodeURIComponent(inputVal.trim())}`) }}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm"
            placeholder="Buscar voluntario, vehículo, servicio..."
            autoFocus
          />
        </div>
      </div>

      {/* Info */}
      {q && !loading && (
        <p className="text-sm text-slate-500">
          {total === 0 ? `Sin resultados para "${q}"` : `${total} resultado${total !== 1 ? 's' : ''} para "${q}"`}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Voluntarios */}
          {voluntarios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Voluntarios ({voluntarios.length})</h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {voluntarios.map((v, i) => (
                  <Link
                    key={v.id}
                    href="/administracion"
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-orange-50 transition-colors ${i < voluntarios.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                      {v.nombre[0]}{v.apellidos[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{v.nombre} {v.apellidos}</p>
                      <p className="text-xs text-slate-500">{v.email} {v.numeroVoluntario ? `· Nº ${v.numeroVoluntario}` : ''}</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full shrink-0">{v.rol.nombre}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Vehículos */}
          {vehiculos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Vehículos ({vehiculos.length})</h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {vehiculos.map((v, i) => (
                  <Link
                    key={v.id}
                    href="/vehiculos"
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-blue-50 transition-colors ${i < vehiculos.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{v.indicativo} — {v.marca} {v.modelo}</p>
                      <p className="text-xs text-slate-500">{v.matricula} · {v.tipo}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ESTADO_COLORS[v.estado] || 'bg-slate-100 text-slate-600'}`}>{v.estado}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Servicios */}
          {servicios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Servicios ({servicios.length})</h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {servicios.map((s, i) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-4 px-4 py-3 ${i < servicios.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{s.nombre}</p>
                      {s.descripcion && <p className="text-xs text-slate-500 truncate">{s.descripcion}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin resultados */}
          {!loading && q && total === 0 && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Sin resultados para "{q}"</p>
              <p className="text-slate-400 text-sm mt-1">Prueba con otro término</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <BuscarContent />
    </Suspense>
  )
}
