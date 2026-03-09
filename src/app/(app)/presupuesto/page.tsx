'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Plus, Search, Edit, Trash2, X,
  Euro, FileText, ShoppingCart, Building2, Receipt, Layers,
  CheckCircle, Clock, AlertTriangle, XCircle, ChevronDown,
  ChevronRight, ArrowRight, Calendar, Phone, Mail, Globe,
  ClipboardList, PieChart, Wallet, Target, Activity,
  CheckSquare, Circle
} from 'lucide-react'

interface PresupuestoAnual {
  id: string; ejercicio: number; denominacion: string
  totalAprobado: number; totalModificado?: number; estado: string; notas?: string
  partidas: PartidaPresupuestaria[]
}
interface PartidaPresupuestaria {
  id: string; presupuestoId: string; codigo: string; denominacion: string
  capitulo: string; importeAsignado: number; importeModificado?: number
  importeComprometido: number; importeEjecutado: number
  _count?: { expedientes: number }
}
interface Proveedor {
  id: string; nombre: string; cif?: string; direccion?: string
  telefono?: string; email?: string; web?: string; contacto?: string
  activo: boolean; notas?: string
  _count?: { expedientes: number; presupuestos: number }
}
interface ExpedienteCompra {
  id: string; numero: string; ejercicio: number; titulo: string
  descripcion?: string; tipo: string; estado: string
  partida?: { codigo: string; denominacion: string }
  proveedor?: { nombre: string }
  importeEstimado?: number; importeAdjudicado?: number; importeFacturado: number
  fechaSolicitud?: string; fechaAdjudicacion?: string; notas?: string
  lineas?: LineaExpediente[]
  presupuestosProv?: PresupuestoProveedor[]
  facturas?: FacturaExpediente[]
  historial?: HistorialExpediente[]
  _count?: { facturas: number; lineas: number; presupuestosProv: number }
}
interface LineaExpediente {
  id: string; descripcion: string; cantidad: number; unidad: string
  precioUnitario?: number; importeTotal?: number; iva: number
}
interface PresupuestoProveedor {
  id: string; proveedorId: string; importe: number; iva: number
  importeTotal: number; estado: string; fechaEmision?: string
  fechaValidez?: string; notas?: string
  proveedor: { nombre: string }
}
interface FacturaExpediente {
  id: string; numeroFactura: string; proveedor: string
  fechaFactura: string; importeBase: number; iva: number
  importeIva: number; importeTotal: number; estado: string
  fechaPago?: string; notas?: string
  expediente?: { numero: string; titulo: string }
}
interface HistorialExpediente {
  id: string; estadoAnterior?: string; estadoNuevo: string
  comentario?: string; usuarioNombre?: string; createdAt: string
}
interface Stats {
  totalAprobado: number; totalComprometido: number; totalEjecutado: number
  totalFacturado: number; disponible: number; porcentajeEjecucion: number
  expedientesAbiertos: number; facturasPendientes: number
  totalProveedores: number; totalExpedientes: number
}

const ESTADOS_EXP: Record<string, { label: string; color: string; icon: any }> = {
  borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Circle },
  solicitado: { label: 'Solicitado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  en_tramite: { label: 'En trámite', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Activity },
  licitacion: { label: 'Licitación', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Target },
  adjudicado: { label: 'Adjudicado', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: CheckSquare },
  contratado: { label: 'Contratado', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: FileText },
  en_ejecucion: { label: 'En ejecución', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ArrowRight },
  cerrado: { label: 'Cerrado', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  anulado: { label: 'Anulado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
}
const TIPOS_EXP = [
  { value: 'menor', label: 'Contrato Menor (<15.000€)' },
  { value: 'negociado_sin', label: 'Negociado sin publicidad' },
  { value: 'abierto', label: 'Procedimiento Abierto' },
  { value: 'simplificado', label: 'Abierto Simplificado' },
  { value: 'suministro', label: 'Contrato de Suministro' },
  { value: 'servicios', label: 'Contrato de Servicios' },
  { value: 'obras', label: 'Contrato de Obras' },
  { value: 'otro', label: 'Otro' },
]
const ESTADOS_FAC: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  aprobada: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700' },
  pagada: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
  anulada: { label: 'Anulada', color: 'bg-red-100 text-red-700' },
}
const CAPITULOS = ['1','2','3','4','5','6','7','8','9'].map(v => ({ value: v, label: `Cap. ${v}` }))

function fmt(v?: number | null) {
  if (v === undefined || v === null) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES')
}
function pct(part: number, total: number) {
  if (!total) return 0
  return Math.min(100, (part / total) * 100)
}

export default function PresupuestoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = ['superadmin', 'admin'].includes(session?.user?.rol || '')

  const [mainTab, setMainTab] = useState<'resumen'|'presupuesto'|'expedientes'|'proveedores'|'facturas'>('resumen')
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear())
  const [ejercicios, setEjercicios] = useState<number[]>([new Date().getFullYear()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [stats, setStats] = useState<Stats | null>(null)
  const [presupuestos, setPresupuestos] = useState<PresupuestoAnual[]>([])
  const [partidas, setPartidas] = useState<PartidaPresupuestaria[]>([])
  const [expedientes, setExpedientes] = useState<ExpedienteCompra[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [facturas, setFacturas] = useState<FacturaExpediente[]>([])
  const [expDetalle, setExpDetalle] = useState<ExpedienteCompra | null>(null)

  const [searchExp, setSearchExp] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [searchProv, setSearchProv] = useState('')
  const [filtroFac, setFiltroFac] = useState('all')
  const [presExpandido, setPresExpandido] = useState<string | null>(null)

  const [showNuevoPres, setShowNuevoPres] = useState(false)
  const [showEditPres, setShowEditPres] = useState(false)
  const [showNuevaPartida, setShowNuevaPartida] = useState(false)
  const [showEditPartida, setShowEditPartida] = useState(false)
  const [showNuevoProv, setShowNuevoProv] = useState(false)
  const [showEditProv, setShowEditProv] = useState(false)
  const [showNuevoExp, setShowNuevoExp] = useState(false)
  const [showDetalle, setShowDetalle] = useState(false)
  const [showCambioEstado, setShowCambioEstado] = useState(false)
  const [showNuevaFac, setShowNuevaFac] = useState(false)
  const [showNuevaLinea, setShowNuevaLinea] = useState(false)
  const [showNuevoPresProv, setShowNuevoPresProv] = useState(false)

  const [presSel, setPresSel] = useState<PresupuestoAnual | null>(null)
  const [partidaSel, setPartidaSel] = useState<PartidaPresupuestaria | null>(null)
  const [provSel, setProvSel] = useState<Proveedor | null>(null)
  const [expSel, setExpSel] = useState<ExpedienteCompra | null>(null)
  const [detalleTab, setDetalleTab] = useState<'info'|'lineas'|'presupuestos'|'facturas'|'historial'>('info')
  const [presIdParaPartida, setPresIdParaPartida] = useState<string | null>(null)
  const [facExpId, setFacExpId] = useState<string | null>(null)
  const [lineaExpId, setLineaExpId] = useState<string | null>(null)
  const [presProvExpId, setPresProvExpId] = useState<string | null>(null)

  const cargarTodo = useCallback(async () => {
    try {
      setLoading(true)
      const [rStats, rPres, rPart, rExp, rProv, rFac, rEj] = await Promise.all([
        fetch(`/api/presupuesto?tipo=stats&ejercicio=${ejercicio}`),
        fetch(`/api/presupuesto?tipo=presupuestos&ejercicio=${ejercicio}`),
        fetch(`/api/presupuesto?tipo=partidas&ejercicio=${ejercicio}`),
        fetch(`/api/presupuesto?tipo=expedientes&ejercicio=${ejercicio}`),
        fetch(`/api/presupuesto?tipo=proveedores`),
        fetch(`/api/presupuesto?tipo=facturas&ejercicio=${ejercicio}`),
        fetch(`/api/presupuesto?tipo=ejercicios`),
      ])
      const [dS, dPr, dPa, dEx, dPv, dFa, dEj] = await Promise.all([rStats.json(), rPres.json(), rPart.json(), rExp.json(), rProv.json(), rFac.json(), rEj.json()])
      setStats(dS)
      setPresupuestos(dPr.presupuestos || [])
      setPartidas(dPa.partidas || [])
      setExpedientes(dEx.expedientes || [])
      setProveedores(dPv.proveedores || [])
      setFacturas(dFa.facturas || [])
      const ejs: number[] = dEj.ejercicios || []
      if (!ejs.includes(ejercicio)) ejs.unshift(ejercicio)
      setEjercicios(ejs)
    } catch (e) { console.error('Error cargando presupuesto:', e) }
    finally { setLoading(false) }
  }, [ejercicio])

  const cargarDetalle = async (id: string) => {
    const r = await fetch(`/api/presupuesto?tipo=expediente-detalle&id=${id}`)
    const d = await r.json()
    setExpDetalle(d.expediente)
  }

  useEffect(() => {
    if (status === 'authenticated') {
      if (!isAdmin) { router.push('/dashboard'); return }
      cargarTodo()
    }
  }, [status, ejercicio])

  const expFiltrados = expedientes.filter(e =>
    (!searchExp || e.titulo.toLowerCase().includes(searchExp.toLowerCase()) || e.numero.toLowerCase().includes(searchExp.toLowerCase())) &&
    (filtroEstado === 'all' || e.estado === filtroEstado)
  )
  const provFiltrados = proveedores.filter(p =>
    !searchProv || p.nombre.toLowerCase().includes(searchProv.toLowerCase()) || (p.cif || '').toLowerCase().includes(searchProv.toLowerCase())
  )
  const facFiltradas = facturas.filter(f => filtroFac === 'all' || f.estado === filtroFac)

  if (status === 'loading' || loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión Presupuestaria</h1>
              <p className="text-gray-500 text-sm">Control económico y contabilidad del servicio</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={ejercicio} onChange={e => setEjercicio(parseInt(e.target.value))}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              {ejercicios.map(ej => <option key={ej} value={ej}>Ejercicio {ej}</option>)}
            </select>
            <button onClick={cargarTodo} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            {mainTab === 'presupuesto' && <button onClick={() => { setPresSel(null); setShowNuevoPres(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" />Nuevo Presupuesto</button>}
            {mainTab === 'expedientes' && <button onClick={() => setShowNuevoExp(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" />Nuevo Expediente</button>}
            {mainTab === 'proveedores' && <button onClick={() => { setProvSel(null); setShowNuevoProv(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" />Nuevo Proveedor</button>}
            {mainTab === 'facturas' && <button onClick={() => { setFacExpId(null); setShowNuevaFac(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" />Nueva Factura</button>}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {([
            { key: 'resumen', label: 'Resumen', icon: PieChart },
            { key: 'presupuesto', label: 'Presupuesto', icon: Layers },
            { key: 'expedientes', label: 'Expedientes', icon: ClipboardList },
            { key: 'proveedores', label: 'Proveedores', icon: Building2 },
            { key: 'facturas', label: 'Facturas', icon: Receipt },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setMainTab(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${mainTab === key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* RESUMEN */}
          {mainTab === 'resumen' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Presupuesto Aprobado', value: fmt(stats.totalAprobado), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Comprometido', value: fmt(stats.totalComprometido), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Ejecutado', value: fmt(stats.totalEjecutado), icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Disponible', value: fmt(stats.disponible), icon: Wallet, color: stats.disponible < 0 ? 'text-red-600' : 'text-gray-700', bg: stats.disponible < 0 ? 'bg-red-50' : 'bg-gray-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
                    </div>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Ejecución Presupuestaria {ejercicio}</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Comprometido', value: stats.totalComprometido, total: stats.totalAprobado, color: 'bg-blue-500' },
                    { label: 'Ejecutado', value: stats.totalEjecutado, total: stats.totalAprobado, color: 'bg-emerald-500' },
                    { label: 'Facturado', value: stats.totalFacturado, total: stats.totalAprobado, color: 'bg-purple-500' },
                  ].map(({ label, value, total, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium">{fmt(value)} <span className="text-gray-400">({pct(value, total).toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct(value, total)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Expedientes abiertos', value: stats.expedientesAbiertos, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Facturas pendientes', value: stats.facturasPendientes, icon: Receipt, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Total expedientes', value: stats.totalExpedientes, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Proveedores activos', value: stats.totalProveedores, icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Últimos Expedientes</h3>
                  <button onClick={() => setMainTab('expedientes')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Ver todos →</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {expedientes.slice(0, 5).map(exp => {
                    const est = ESTADOS_EXP[exp.estado] || ESTADOS_EXP.borrador
                    const EstIcon = est.icon
                    return (
                      <div key={exp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-500">{exp.numero}</span>
                          <span className="font-medium text-gray-900 text-sm">{exp.titulo}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {exp.importeEstimado && <span className="text-sm font-medium text-gray-700">{fmt(exp.importeEstimado)}</span>}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${est.color}`}><EstIcon className="w-3 h-3" />{est.label}</span>
                        </div>
                      </div>
                    )
                  })}
                  {expedientes.length === 0 && <div className="px-6 py-8 text-center text-gray-400 text-sm">No hay expedientes en este ejercicio</div>}
                </div>
              </div>
            </div>
          )}

          {/* PRESUPUESTO */}
          {mainTab === 'presupuesto' && (
            <div className="space-y-4">
              {presupuestos.length === 0 && (
                <div className="text-center py-16">
                  <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No hay presupuesto para el ejercicio {ejercicio}</p>
                  <button onClick={() => setShowNuevoPres(true)} className="mt-3 text-emerald-600 text-sm font-medium hover:underline">Crear presupuesto anual</button>
                </div>
              )}
              {presupuestos.map(pres => (
                <div key={pres.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setPresExpandido(presExpandido === pres.id ? null : pres.id)}>
                    <div className="flex items-center gap-3">
                      {presExpandido === pres.id ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                      <div>
                        <p className="font-semibold text-gray-900">{pres.denominacion}</p>
                        <p className="text-xs text-gray-500">Ejercicio {pres.ejercicio} · {pres.partidas?.length || 0} partidas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-lg font-bold text-emerald-700">{fmt(pres.totalAprobado)}</p>
                        <p className="text-xs text-gray-500">Total aprobado</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${pres.estado === 'aprobado' ? 'bg-green-100 text-green-700' : pres.estado === 'vigente' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{pres.estado}</span>
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setPresSel(pres); setShowEditPres(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit className="w-4 h-4" /></button>
                        <button onClick={e => { e.stopPropagation(); setPresIdParaPartida(pres.id); setShowNuevaPartida(true) }} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                  {presExpandido === pres.id && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white border-b border-gray-100">
                            {['Código','Denominación','Cap.','Asignado','Comprometido','Ejecutado','Disponible',''].map(h => (
                              <th key={h} className={`py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === '' ? 'px-4' : h === 'Código' ? 'text-left px-6' : ['Denominación','Cap.'].includes(h) ? 'text-left px-4' : 'text-right px-4'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pres.partidas?.map(pa => {
                            const disponible = Number(pa.importeAsignado) - Number(pa.importeComprometido)
                            return (
                              <tr key={pa.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-mono text-xs text-gray-600">{pa.codigo}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{pa.denominacion}</td>
                                <td className="px-4 py-3 text-gray-500">{pa.capitulo}</td>
                                <td className="px-4 py-3 text-right font-medium">{fmt(Number(pa.importeAsignado))}</td>
                                <td className="px-4 py-3 text-right text-blue-600">{fmt(Number(pa.importeComprometido))}</td>
                                <td className="px-4 py-3 text-right text-purple-600">{fmt(Number(pa.importeEjecutado))}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${disponible < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(disponible)}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => { setPartidaSel(pa); setShowEditPartida(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit className="w-3.5 h-3.5" /></button>
                                    <button onClick={async () => {
                                      if (!confirm('¿Eliminar esta partida?')) return
                                      const r = await fetch(`/api/presupuesto?tipo=partida&id=${pa.id}`, { method: 'DELETE' })
                                      const d = await r.json()
                                      if (d.error) alert(d.error); else cargarTodo()
                                    }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {(!pres.partidas || pres.partidas.length === 0) && (
                            <tr><td colSpan={8} className="px-6 py-6 text-center text-gray-400 text-sm">No hay partidas. <button onClick={() => { setPresIdParaPartida(pres.id); setShowNuevaPartida(true) }} className="text-emerald-600 hover:underline">Añadir</button></td></tr>
                          )}
                        </tbody>
                        {pres.partidas && pres.partidas.length > 0 && (
                          <tfoot>
                            <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                              <td colSpan={3} className="px-6 py-3 text-gray-700">TOTAL</td>
                              <td className="px-4 py-3 text-right">{fmt(pres.partidas.reduce((s,p) => s+Number(p.importeAsignado),0))}</td>
                              <td className="px-4 py-3 text-right text-blue-600">{fmt(pres.partidas.reduce((s,p) => s+Number(p.importeComprometido),0))}</td>
                              <td className="px-4 py-3 text-right text-purple-600">{fmt(pres.partidas.reduce((s,p) => s+Number(p.importeEjecutado),0))}</td>
                              <td className="px-4 py-3 text-right text-emerald-600">{fmt(pres.partidas.reduce((s,p) => s+Number(p.importeAsignado)-Number(p.importeComprometido),0))}</td>
                              <td />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* EXPEDIENTES */}
          {mainTab === 'expedientes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchExp} onChange={e => setSearchExp(e.target.value)} placeholder="Buscar expediente..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                  <option value="all">Todos los estados</option>
                  {Object.entries(ESTADOS_EXP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                {expFiltrados.map(exp => {
                  const est = ESTADOS_EXP[exp.estado] || ESTADOS_EXP.borrador
                  const EstIcon = est.icon
                  return (
                    <div key={exp.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{exp.numero}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${est.color}`}><EstIcon className="w-3 h-3" />{est.label}</span>
                          </div>
                          <p className="font-semibold text-gray-900 truncate">{exp.titulo}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            {exp.partida && <span><span className="font-medium">Partida:</span> {exp.partida.codigo}</span>}
                            {exp.proveedor && <span><span className="font-medium">Proveedor:</span> {exp.proveedor.nombre}</span>}
                            {exp.fechaSolicitud && <span><Calendar className="w-3 h-3 inline mr-0.5" />{fmtDate(exp.fechaSolicitud)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {exp.importeAdjudicado ? <><p className="font-semibold text-emerald-700">{fmt(exp.importeAdjudicado)}</p><p className="text-xs text-gray-400">Adjudicado</p></>
                             : exp.importeEstimado ? <><p className="font-medium text-gray-700">{fmt(exp.importeEstimado)}</p><p className="text-xs text-gray-400">Estimado</p></> : null}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={async () => { setExpSel(exp); await cargarDetalle(exp.id); setDetalleTab('info'); setShowDetalle(true) }} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Ver detalle"><FileText className="w-4 h-4" /></button>
                            <button onClick={() => { setExpSel(exp); setShowCambioEstado(true) }} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50" title="Cambiar estado"><ArrowRight className="w-4 h-4" /></button>
                            <button onClick={async () => {
                              if (!confirm('¿Eliminar este expediente?')) return
                              const r = await fetch(`/api/presupuesto?tipo=expediente&id=${exp.id}`, { method: 'DELETE' })
                              const d = await r.json()
                              if (d.error) alert(d.error); else cargarTodo()
                            }} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {expFiltrados.length === 0 && (
                  <div className="text-center py-16">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No hay expedientes</p>
                    <button onClick={() => setShowNuevoExp(true)} className="mt-2 text-emerald-600 text-sm font-medium hover:underline">Crear nuevo expediente</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROVEEDORES */}
          {mainTab === 'proveedores' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchProv} onChange={e => setSearchProv(e.target.value)} placeholder="Buscar proveedor o CIF..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {provFiltrados.map(prov => (
                  <div key={prov.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Building2 className="w-5 h-5 text-emerald-600" /></div>
                      <div className="flex gap-1">
                        <button onClick={() => { setProvSel(prov); setShowEditProv(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={async () => {
                          if (!confirm(`¿Eliminar ${prov.nombre}?`)) return
                          const r = await fetch(`/api/presupuesto?tipo=proveedor&id=${prov.id}`, { method: 'DELETE' })
                          const d = await r.json()
                          if (d.error) alert(d.error); else cargarTodo()
                        }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">{prov.nombre}</p>
                    {prov.cif && <p className="text-xs text-gray-500 mb-2">CIF: {prov.cif}</p>}
                    <div className="space-y-1">
                      {prov.telefono && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="w-3 h-3" />{prov.telefono}</div>}
                      {prov.email && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail className="w-3 h-3" />{prov.email}</div>}
                      {prov.web && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Globe className="w-3 h-3" /><a href={prov.web} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline truncate">{prov.web}</a></div>}
                    </div>
                    {prov._count && <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3 text-xs text-gray-400"><span>{prov._count.expedientes} exp.</span></div>}
                  </div>
                ))}
                {provFiltrados.length === 0 && <div className="col-span-3 text-center py-16"><Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No hay proveedores</p></div>}
              </div>
            </div>
          )}

          {/* FACTURAS */}
          {mainTab === 'facturas' && (
            <div className="space-y-4">
              <select value={filtroFac} onChange={e => setFiltroFac(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                <option value="all">Todas las facturas</option>
                {Object.entries(ESTADOS_FAC).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-200">
                    {['Nº Factura','Proveedor','Expediente','Fecha','Base','IVA','Total','Estado',''].map(h => (
                      <th key={h} className={`py-3 text-xs font-semibold text-gray-500 uppercase ${['Base','IVA','Total'].includes(h) ? 'text-right px-4' : 'text-left px-4'}`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {facFiltradas.map(fac => {
                      const est = ESTADOS_FAC[fac.estado] || ESTADOS_FAC.pendiente
                      return (
                        <tr key={fac.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{fac.numeroFactura}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{fac.proveedor}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fac.expediente?.numero}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(fac.fechaFactura)}</td>
                          <td className="px-4 py-3 text-right">{fmt(Number(fac.importeBase))}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{fmt(Number(fac.importeIva))}</td>
                          <td className="px-4 py-3 text-right font-semibold">{fmt(Number(fac.importeTotal))}</td>
                          <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${est.color}`}>{est.label}</span></td>
                          <td className="px-4 py-3">
                            {fac.estado === 'pendiente' && <div className="flex gap-1">
                              <button onClick={async () => { await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'factura-estado', id: fac.id, estado: 'aprobada' }) }); cargarTodo() }} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Aprobar</button>
                              <button onClick={async () => { await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'factura-estado', id: fac.id, estado: 'pagada' }) }); cargarTodo() }} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Pagar</button>
                            </div>}
                            {fac.estado === 'aprobada' && <button onClick={async () => { await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'factura-estado', id: fac.id, estado: 'pagada' }) }); cargarTodo() }} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Pagar</button>}
                          </td>
                        </tr>
                      )
                    })}
                    {facFiltradas.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No hay facturas</td></tr>}
                  </tbody>
                  {facFiltradas.length > 0 && <tfoot><tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                    <td colSpan={4} className="px-4 py-3 text-gray-700">TOTAL</td>
                    <td className="px-4 py-3 text-right">{fmt(facFiltradas.reduce((s,f)=>s+Number(f.importeBase),0))}</td>
                    <td className="px-4 py-3 text-right">{fmt(facFiltradas.reduce((s,f)=>s+Number(f.importeIva),0))}</td>
                    <td className="px-4 py-3 text-right">{fmt(facFiltradas.reduce((s,f)=>s+Number(f.importeTotal),0))}</td>
                    <td colSpan={2} />
                  </tr></tfoot>}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO PRESUPUESTO */}
      {showNuevoPres && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Nuevo Presupuesto Anual</h3>
              <button onClick={() => setShowNuevoPres(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              try {
                await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'presupuesto', ejercicio: f.get('ejercicio'), denominacion: f.get('denominacion'), totalAprobado: f.get('totalAprobado'), estado: f.get('estado'), notas: f.get('notas') }) })
                setShowNuevoPres(false); cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Ejercicio *</label><input name="ejercicio" type="number" defaultValue={new Date().getFullYear()} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Estado</label>
                  <select name="estado" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="borrador">Borrador</option><option value="aprobado">Aprobado</option><option value="vigente">Vigente</option><option value="cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Denominación *</label><input name="denominacion" required placeholder="Ej: Presupuesto Municipal 2026" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Total Aprobado (€) *</label><input name="totalAprobado" type="number" step="0.01" required placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevoPres(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Crear Presupuesto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PRESUPUESTO */}
      {showEditPres && presSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Editar Presupuesto</h3>
              <button onClick={() => setShowEditPres(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              try {
                await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'presupuesto', id: presSel.id, denominacion: f.get('denominacion'), totalAprobado: f.get('totalAprobado'), estado: f.get('estado'), notas: f.get('notas') }) })
                setShowEditPres(false); cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Denominación *</label><input name="denominacion" defaultValue={presSel.denominacion} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Total Aprobado (€)</label><input name="totalAprobado" type="number" step="0.01" defaultValue={presSel.totalAprobado} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Estado</label>
                  <select name="estado" defaultValue={presSel.estado} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="borrador">Borrador</option><option value="aprobado">Aprobado</option><option value="vigente">Vigente</option><option value="cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} defaultValue={presSel.notas || ''} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditPres(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA/EDITAR PARTIDA */}
      {(showNuevaPartida || showEditPartida) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{partidaSel ? 'Editar Partida' : 'Nueva Partida Presupuestaria'}</h3>
              <button onClick={() => { setShowNuevaPartida(false); setShowEditPartida(false); setPartidaSel(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              try {
                const body = { tipo: 'partida', codigo: f.get('codigo'), denominacion: f.get('denominacion'), capitulo: f.get('capitulo'), importeAsignado: f.get('importeAsignado'), presupuestoId: presIdParaPartida }
                if (partidaSel) await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ...body, id: partidaSel.id }) })
                else await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
                setShowNuevaPartida(false); setShowEditPartida(false); setPartidaSel(null); cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Código *</label><input name="codigo" defaultValue={partidaSel?.codigo} required placeholder="Ej: 130.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Capítulo *</label>
                  <select name="capitulo" defaultValue={partidaSel?.capitulo || '2'} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    {CAPITULOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Denominación *</label><input name="denominacion" defaultValue={partidaSel?.denominacion} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Importe Asignado (€) *</label><input name="importeAsignado" type="number" step="0.01" defaultValue={partidaSel?.importeAsignado} required placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevaPartida(false); setShowEditPartida(false); setPartidaSel(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Guardando...' : partidaSel ? 'Guardar' : 'Crear Partida'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO/EDITAR PROVEEDOR */}
      {(showNuevoProv || showEditProv) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">{provSel ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => { setShowNuevoProv(false); setShowEditProv(false); setProvSel(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              try {
                const body = { tipo: 'proveedor', nombre: f.get('nombre'), cif: f.get('cif'), direccion: f.get('direccion'), telefono: f.get('telefono'), email: f.get('email'), web: f.get('web'), contacto: f.get('contacto'), notas: f.get('notas') }
                if (provSel) await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ...body, id: provSel.id, activo: true }) })
                else await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
                setShowNuevoProv(false); setShowEditProv(false); setProvSel(null); cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre / Razón Social *</label><input name="nombre" defaultValue={provSel?.nombre} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">CIF/NIF</label><input name="cif" defaultValue={provSel?.cif} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Teléfono</label><input name="telefono" defaultValue={provSel?.telefono} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label><input name="email" type="email" defaultValue={provSel?.email} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Web</label><input name="web" defaultValue={provSel?.web} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1.5">Dirección</label><input name="direccion" defaultValue={provSel?.direccion} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1.5">Persona de contacto</label><input name="contacto" defaultValue={provSel?.contacto} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} defaultValue={provSel?.notas} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevoProv(false); setShowEditProv(false); setProvSel(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Guardando...' : provSel ? 'Guardar' : 'Crear Proveedor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO EXPEDIENTE */}
      {showNuevoExp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Nuevo Expediente de Compra</h3>
              <button onClick={() => setShowNuevoExp(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              try {
                await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'expediente', ejercicio, titulo: f.get('titulo'), descripcion: f.get('descripcion'), tipoContrato: f.get('tipo'), partidaId: f.get('partidaId') || null, importeEstimado: f.get('importeEstimado') || null, fechaSolicitud: f.get('fechaSolicitud') || null, objeto: f.get('objeto'), criterios: f.get('criterios'), notas: f.get('notas') }) })
                setShowNuevoExp(false); cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Título *</label><input name="titulo" required placeholder="Denominación del expediente" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Tipo de contrato *</label>
                  <select name="tipo" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    {TIPOS_EXP.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Partida presupuestaria</label>
                  <select name="partidaId" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="">Sin asignar</option>
                    {partidas.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.denominacion}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Importe estimado (€)</label><input name="importeEstimado" type="number" step="0.01" placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha solicitud</label><input name="fechaSolicitud" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Objeto del contrato</label><textarea name="objeto" rows={2} placeholder="Descripción del objeto..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevoExp(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Creando...' : 'Crear Expediente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE EXPEDIENTE */}
      {showDetalle && expDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-gray-500">{expDetalle.numero}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${(ESTADOS_EXP[expDetalle.estado]||ESTADOS_EXP.borrador).color}`}>{(ESTADOS_EXP[expDetalle.estado]||ESTADOS_EXP.borrador).label}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{expDetalle.titulo}</h3>
              </div>
              <button onClick={() => { setShowDetalle(false); setExpDetalle(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex border-b border-gray-100 px-6">
              {([
                { key: 'info', label: 'Información' },
                { key: 'lineas', label: `Líneas (${expDetalle.lineas?.length||0})` },
                { key: 'presupuestos', label: `Presupuestos (${expDetalle.presupuestosProv?.length||0})` },
                { key: 'facturas', label: `Facturas (${expDetalle.facturas?.length||0})` },
                { key: 'historial', label: 'Historial' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setDetalleTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${detalleTab===key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {detalleTab === 'info' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Tipo</p><p className="text-sm">{TIPOS_EXP.find(t=>t.value===expDetalle.tipo)?.label||expDetalle.tipo}</p></div>
                    {expDetalle.partida && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Partida</p><p className="text-sm">{expDetalle.partida.codigo} - {expDetalle.partida.denominacion}</p></div>}
                    {expDetalle.proveedor && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Proveedor</p><p className="text-sm">{expDetalle.proveedor.nombre}</p></div>}
                    {expDetalle.notas && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Notas</p><p className="text-sm text-gray-600">{expDetalle.notas}</p></div>}
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      {[{ label: 'Importe estimado', value: expDetalle.importeEstimado }, { label: 'Importe adjudicado', value: expDetalle.importeAdjudicado }, { label: 'Importe facturado', value: expDetalle.importeFacturado }].map(({ label, value }) => (
                        <div key={label} className="flex justify-between"><span className="text-sm text-gray-500">{label}</span><span className="text-sm font-semibold">{fmt(Number(value)||0)}</span></div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[{ label: 'Fecha solicitud', value: expDetalle.fechaSolicitud }, { label: 'Fecha adjudicación', value: expDetalle.fechaAdjudicacion }].filter(d => d.value).map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-sm"><span className="text-gray-500">{label}</span><span>{fmtDate(value)}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {detalleTab === 'lineas' && (
                <div className="space-y-3">
                  <button onClick={() => { setLineaExpId(expDetalle.id); setShowNuevaLinea(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"><Plus className="w-4 h-4" />Añadir línea</button>
                  {expDetalle.lineas && expDetalle.lineas.length > 0 ? (
                    <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                      <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Descripción</th><th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Cant.</th><th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Ud.</th><th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">P.Unit.</th><th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Total</th><th className="px-4"></th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {expDetalle.lineas.map(l => (
                          <tr key={l.id}><td className="px-4 py-2.5">{l.descripcion}</td><td className="px-4 py-2.5 text-right">{l.cantidad}</td><td className="px-4 py-2.5 text-gray-500">{l.unidad}</td><td className="px-4 py-2.5 text-right">{l.precioUnitario ? fmt(Number(l.precioUnitario)) : '—'}</td><td className="px-4 py-2.5 text-right font-medium">{l.importeTotal ? fmt(Number(l.importeTotal)) : '—'}</td><td className="px-4 py-2.5"><button onClick={async () => { await fetch(`/api/presupuesto?tipo=linea&id=${l.id}`, { method: 'DELETE' }); cargarDetalle(expDetalle.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-gray-400 text-sm text-center py-8">No hay líneas</p>}
                </div>
              )}
              {detalleTab === 'presupuestos' && (
                <div className="space-y-3">
                  <button onClick={() => { setPresProvExpId(expDetalle.id); setShowNuevoPresProv(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"><Plus className="w-4 h-4" />Añadir presupuesto de proveedor</button>
                  {expDetalle.presupuestosProv && expDetalle.presupuestosProv.length > 0 ? (
                    expDetalle.presupuestosProv.map(pp => (
                      <div key={pp.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div><p className="font-medium">{pp.proveedor.nombre}</p>{pp.fechaEmision && <p className="text-xs text-gray-500">Emitido: {fmtDate(pp.fechaEmision)}</p>}</div>
                        <p className="font-semibold">{fmt(Number(pp.importeTotal))}</p>
                      </div>
                    ))
                  ) : <p className="text-gray-400 text-sm text-center py-8">No hay presupuestos de proveedores</p>}
                </div>
              )}
              {detalleTab === 'facturas' && (
                <div className="space-y-3">
                  <button onClick={() => { setFacExpId(expDetalle.id); setShowNuevaFac(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"><Plus className="w-4 h-4" />Registrar factura</button>
                  {expDetalle.facturas && expDetalle.facturas.length > 0 ? (
                    expDetalle.facturas.map(fac => {
                      const est = ESTADOS_FAC[fac.estado] || ESTADOS_FAC.pendiente
                      return <div key={fac.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"><div><p className="font-medium">{fac.numeroFactura} — {fac.proveedor}</p><p className="text-xs text-gray-500">{fmtDate(fac.fechaFactura)}</p></div><div className="flex items-center gap-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${est.color}`}>{est.label}</span><p className="font-semibold">{fmt(Number(fac.importeTotal))}</p></div></div>
                    })
                  ) : <p className="text-gray-400 text-sm text-center py-8">No hay facturas</p>}
                </div>
              )}
              {detalleTab === 'historial' && (
                <div className="space-y-2">
                  {expDetalle.historial && expDetalle.historial.length > 0 ? (
                    expDetalle.historial.map(h => (
                      <div key={h.id} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <div className="flex-1 pb-3 border-b border-gray-50">
                          <div className="flex items-center gap-2">
                            {h.estadoAnterior && <><span className={`px-2 py-0.5 rounded-full text-xs border ${(ESTADOS_EXP[h.estadoAnterior]||ESTADOS_EXP.borrador).color}`}>{(ESTADOS_EXP[h.estadoAnterior]||ESTADOS_EXP.borrador).label}</span><ArrowRight className="w-3 h-3 text-gray-400" /></>}
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${(ESTADOS_EXP[h.estadoNuevo]||ESTADOS_EXP.borrador).color}`}>{(ESTADOS_EXP[h.estadoNuevo]||ESTADOS_EXP.borrador).label}</span>
                          </div>
                          {h.comentario && <p className="text-sm text-gray-600 mt-1">{h.comentario}</p>}
                          <p className="text-xs text-gray-400 mt-1">{h.usuarioNombre} · {fmtDate(h.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  ) : <p className="text-gray-400 text-sm text-center py-8">Sin historial</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIO ESTADO */}
      {showCambioEstado && expSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Cambiar estado — {expSel.numero}</h3>
              <button onClick={() => { setShowCambioEstado(false); setExpSel(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              try {
                await fetch('/api/presupuesto', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'expediente-estado', id: expSel.id, estado: f.get('estado'), comentario: f.get('comentario'), importeAdjudicado: f.get('importeAdjudicado') || null, proveedorId: f.get('proveedorId') || null, fechaAdjudicacion: f.get('fechaAdjudicacion') || null }) })
                setShowCambioEstado(false); setExpSel(null); cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Nuevo estado *</label>
                <select name="estado" required defaultValue={expSel.estado} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  {Object.entries(ESTADOS_EXP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Importe adjudicado (€)</label><input name="importeAdjudicado" type="number" step="0.01" defaultValue={expSel.importeAdjudicado||''} placeholder="Solo si se adjudica" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Proveedor adjudicatario</label>
                <select name="proveedorId" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">Sin asignar</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha adjudicación</label><input name="fechaAdjudicacion" type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Comentario</label><textarea name="comentario" rows={2} placeholder="Motivo del cambio..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCambioEstado(false); setExpSel(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Actualizar estado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA FACTURA */}
      {showNuevaFac && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Registrar Factura</h3>
              <button onClick={() => { setShowNuevaFac(false); setFacExpId(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              const expedienteId = facExpId || f.get('expedienteId') as string
              try {
                await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'factura', expedienteId, numeroFactura: f.get('numeroFactura'), proveedor: f.get('proveedor'), fechaFactura: f.get('fechaFactura'), fechaRecepcion: f.get('fechaRecepcion') || null, importeBase: f.get('importeBase'), iva: f.get('iva') || 21, notas: f.get('notas') }) })
                setShowNuevaFac(false); setFacExpId(null)
                if (expDetalle) cargarDetalle(expDetalle.id)
                cargarTodo()
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              {!facExpId && <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Expediente *</label>
                <select name="expedienteId" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">Seleccionar...</option>
                  {expedientes.map(e => <option key={e.id} value={e.id}>{e.numero} - {e.titulo}</option>)}
                </select>
              </div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Nº Factura *</label><input name="numeroFactura" required placeholder="F-2026-001" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha *</label><input name="fechaFactura" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Proveedor *</label><input name="proveedor" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Base imponible (€) *</label><input name="importeBase" type="number" step="0.01" required placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">IVA</label>
                  <select name="iva" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="0">0% Exento</option><option value="4">4% Superred.</option><option value="10">10% Reducido</option><option value="21">21% General</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevaFac(false); setFacExpId(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar Factura'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA LÍNEA */}
      {showNuevaLinea && lineaExpId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Añadir Línea</h3>
              <button onClick={() => { setShowNuevaLinea(false); setLineaExpId(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              const cantidad = parseFloat(f.get('cantidad') as string)
              const pu = parseFloat(f.get('precioUnitario') as string) || null
              const iva = parseFloat(f.get('iva') as string) || 21
              const total = pu ? pu * cantidad * (1 + iva/100) : null
              try {
                await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'linea', expedienteId: lineaExpId, descripcion: f.get('descripcion'), cantidad, unidad: f.get('unidad'), precioUnitario: pu, importeTotal: total, iva }) })
                setShowNuevaLinea(false); setLineaExpId(null)
                if (expDetalle) cargarDetalle(expDetalle.id)
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Descripción *</label><input name="descripcion" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Cantidad *</label><input name="cantidad" type="number" step="0.001" required defaultValue="1" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Unidad *</label><input name="unidad" required defaultValue="ud" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">IVA %</label>
                  <select name="iva" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="0">0%</option><option value="4">4%</option><option value="10">10%</option><option value="21">21%</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Precio unitario (€)</label><input name="precioUnitario" type="number" step="0.0001" placeholder="0.0000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevaLinea(false); setLineaExpId(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Añadiendo...' : 'Añadir'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRESUPUESTO PROVEEDOR */}
      {showNuevoPresProv && presProvExpId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Presupuesto de Proveedor</h3>
              <button onClick={() => { setShowNuevoPresProv(false); setPresProvExpId(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setSaving(true)
              const importe = parseFloat(f.get('importe') as string)
              const iva = parseFloat(f.get('iva') as string) || 21
              try {
                await fetch('/api/presupuesto', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'presupuesto-proveedor', expedienteId: presProvExpId, proveedorId: f.get('proveedorId'), importe, iva, importeTotal: importe*(1+iva/100), fechaEmision: f.get('fechaEmision') || null, fechaValidez: f.get('fechaValidez') || null, notas: f.get('notas') }) })
                setShowNuevoPresProv(false); setPresProvExpId(null)
                if (expDetalle) cargarDetalle(expDetalle.id)
              } catch(e) { console.error(e) } finally { setSaving(false) }
            }} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Proveedor *</label>
                <select name="proveedorId" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">Seleccionar...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Base imponible (€) *</label><input name="importe" type="number" step="0.01" required placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">IVA %</label>
                  <select name="iva" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="0">0%</option><option value="4">4%</option><option value="10">10%</option><option value="21">21%</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha emisión</label><input name="fechaEmision" type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Válido hasta</label><input name="fechaValidez" type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevoPresProv(false); setPresProvExpId(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Añadiendo...' : 'Añadir'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
