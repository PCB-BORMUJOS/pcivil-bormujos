'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart2, Users, Calendar, Clock, TrendingUp, Award, Car, Package, FileText, Download, RefreshCw, ChevronDown } from 'lucide-react'

const TABS = [
  { id: 'personal',    label: 'Personal',     icon: Users },
  { id: 'operativo',   label: 'Operativo',    icon: Calendar },
  { id: 'formacion',   label: 'Formación',    icon: Award },
  { id: 'logistica',   label: 'Logística',    icon: Package },
  { id: 'vehiculos',   label: 'Vehículos',    icon: Car },
  { id: 'economico',   label: 'Económico',    icon: TrendingUp },
]

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const now = new Date()
const currentYear = now.getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear - 2]

function StatCard({ label, value, sub, color = 'indigo', icon: Icon }: any) {
  const c: any = { indigo:'bg-indigo-50 text-indigo-600 border-indigo-100', amber:'bg-amber-50 text-amber-600 border-amber-100', green:'bg-green-50 text-green-600 border-green-100', red:'bg-red-50 text-red-600 border-red-100', blue:'bg-blue-50 text-blue-600 border-blue-100', purple:'bg-purple-50 text-purple-600 border-purple-100' }
  return (
    <div className={`rounded-xl border p-4 ${c[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
        {Icon && <Icon size={16} className="opacity-60" />}
      </div>
      <div className="text-2xl sm:text-3xl font-black">{value ?? '—'}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: any) {
  return <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 mt-6 border-b border-slate-100 pb-2">{children}</h3>
}

export default function EstadisticasPage() {
  const [tab, setTab] = useState('personal')
  const [year, setYear] = useState(currentYear)
  const [mes, setMes] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const mesParam = mes === 'all' ? '' : `&mes=${mes}`
      const res = await fetch(`/api/estadisticas?year=${year}${mesParam}`)
      const raw = await res.json()
      if (raw.error) { setData({}); return }
      setData(raw)
    } finally { setLoading(false) }
  }, [year, mes])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Datos pre-calculados desde /api/estadisticas ───────────────────────────
  const resumen: any                 = data.resumen              || {}
  const guardiasPorMes: any[]        = data.guardiasPorMes       || MESES.map(m => ({ mes: m, mañana: 0, tarde: 0, noche: 0 }))
  const horasPorMes: any[]           = (data.guardiasPorMes      || MESES.map((_: any, i: number) => ({ mes: MESES[i], horas: 0 }))).map((r: any) => ({ mes: r.mes, horas: (r.mañana||0)*6 + (r.tarde||0)*5 + (r.noche||0)*9 }))
  const dietasPorMes: any[]          = data.dietasPorMes         || MESES.map(m => ({ mes: m, importe: 0 }))
  const eventosPorMes: any[]         = data.eventosPorMes        || []
  const cajaPorMes: any[]            = data.cajaPorMes           || []
  const peticionesLog: any[]         = data.peticionesLog        || []
  const movimientosCaja: any[]       = data.movimientosCaja      || []
  const partidas: any[]              = data.partidas             || []
  const partesPSI: any[]             = data.partesPSI            || []
  const diasServicio: any[]          = data.diasServicio         || []

  // Distribución por área (pre-calculada en API)
  const statsPorArea: any[]          = data.statsPorArea         || []
  const areaPie = statsPorArea.map((a: any) => ({ name: a.nombre || a.area || a.areaAsignada, value: a.total || a.count || 0 }))

  // Guardias por voluntario (pre-calculado en API)
  const statsVoluntarios: any[]      = data.statsVoluntarios     || []
  const guardiasPorVol = statsVoluntarios.slice(0, 10).map((v: any) => ({ nombre: v.nombre, guardias: v.totalGuardias || 0 }))

  // Eventos por tipo (pre-calculado en API)
  const eventosTipoMap: any          = data.eventosTipo          || {}
  const eventosPie = Object.entries(eventosTipoMap).map(([name, value]) => ({ name, value }))

  // Formación (pre-calculado en API)
  const statsFormacion: any          = data.statsFormacion       || {}
  const formPie = Object.entries(statsFormacion.porEstado || {}).map(([name, value]) => ({ name, value }))

  // Vehículos (pre-calculado en API)
  const statsVehiculos: any          = data.statsVehiculos       || {}
  const vehPie = Object.entries(statsVehiculos.porEstado || {}).map(([name, value]) => ({ name, value }))

  // Arrays raw para tablas detalle
  const voluntarios: any[]    = data.todosVoluntarios || []
  const guardias: any[]       = data.guardiasRaw      || []
  const eventos: any[]        = data.eventosRaw       || []
  const formaciones: any[]    = data.formacionesRaw   || []
  const vehiculos: any[]      = data.vehiculosRaw     || []
  const peticionesDietas: any[] = data.diasServicio   || []

  // Resumen global
  const totalHoras     = resumen.totalHoras     || 0
  const totalGuardias  = resumen.totalGuardias  || 0
  const volsActivos    = resumen.totalVoluntarios || 0
  const totalEventos   = resumen.totalEventos   || 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? p.value.toLocaleString('es-ES', {style:'currency',currency:'EUR'}) : p.value}</strong></p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Estadísticas</h1>
            <p className="text-sm text-slate-500">Análisis completo de la actividad operativa</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Año */}
          <div className="relative">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {/* Mes */}
          <div className="relative">
            <select value={mes} onChange={e => setMes(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">Todo el año</option>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={fetchData} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500" title="Actualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-1">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {loading && <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}

      {!loading && (
        <>
          {/* ══ TAB PERSONAL ══════════════════════════════════════════════════ */}
          {tab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Voluntarios activos" value={volsActivos} icon={Users} color="indigo" sub={`de ${voluntarios.length} total`} />
                <StatCard label="Guardias realizadas" value={totalGuardias} icon={Calendar} color="amber" sub={`${year}`} />
                <StatCard label="Horas de servicio" value={totalHoras.toLocaleString()} icon={Clock} color="green" sub="estimadas" />
                <StatCard label="Eventos" value={totalEventos} icon={TrendingUp} color="blue" sub={`${year}`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Guardias por mes y turno</SectionTitle>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={guardiasPorMes} barSize={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="mañana" name="Mañana" fill="#f59e0b" radius={[3,3,0,0]} />
                      <Bar dataKey="tarde"  name="Tarde"  fill="#6366f1" radius={[3,3,0,0]} />
                      <Bar dataKey="noche"  name="Noche"  fill="#1e293b" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Distribución por área</SectionTitle>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={areaPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: any) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {areaPie.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Top 10 voluntarios por guardias realizadas</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={guardiasPorVol} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="guardias" name="Guardias" radius={[0,3,3,0]}>
                      {guardiasPorVol.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Horas de servicio acumuladas por mes</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={horasPorMes}>
                    <defs>
                      <linearGradient id="horas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="horas" name="Horas" stroke="#6366f1" fill="url(#horas)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla de voluntarios */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Detalle por voluntario</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <th className="text-left py-2 px-3 rounded-l-lg">Voluntario</th>
                        <th className="text-center py-2 px-3">Área</th>
                        <th className="text-center py-2 px-3">Guardias</th>
                        <th className="text-center py-2 px-3">Horas est.</th>
                        <th className="text-center py-2 px-3 rounded-r-lg">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voluntarios.slice(0, 20).map((v: any, i: number) => {
                        const gVol = guardias.filter((g: any) => g.usuarioId === v.id)
                        const hVol = gVol.reduce((a: number, g: any) => a + (g.turno === 'mañana' ? 6 : g.turno === 'tarde' ? 5 : 9), 0)
                        return (
                          <tr key={v.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{v.numeroVoluntario} {v.nombre} {v.apellidos}</td>
                            <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{v.fichaVoluntario?.areaAsignada || 'Sin área'}</span></td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{gVol.length}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600">{hVol}h</td>
                            <td className="py-2.5 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{v.activo ? 'Activo' : 'Inactivo'}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB OPERATIVO ═════════════════════════════════════════════════ */}
          {tab === 'operativo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total guardias" value={totalGuardias} icon={Calendar} color="indigo" />
                <StatCard label="Mañana" value={guardias.filter((g:any)=>g.turno==='mañana').length} color="amber" sub="turnos" />
                <StatCard label="Tarde" value={guardias.filter((g:any)=>g.turno==='tarde').length} color="blue" sub="turnos" />
                <StatCard label="Noche" value={guardias.filter((g:any)=>g.turno==='noche').length} color="purple" sub="turnos" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Evolución mensual de guardias</SectionTitle>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={guardiasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="mañana" name="Mañana" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="tarde"  name="Tarde"  stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="noche"  name="Noche"  stroke="#1e293b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Eventos por tipo</SectionTitle>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={eventosPie.length ? eventosPie : [{name:'Sin datos', value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any) => `${name}: ${value}`}>
                        {(eventosPie.length ? eventosPie : [{name:'Sin datos',value:1}]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Horas de servicio por mes</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={horasPorMes} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="horas" name="Horas" fill="#6366f1" radius={[4,4,0,0]}>
                      {horasPorMes.map((_: any, i: number) => <Cell key={i} fill={`hsl(${245 + i * 5}, 70%, ${55 + i * 1}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Listado de eventos</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <th className="text-left py-2 px-3 rounded-l-lg">Evento</th>
                        <th className="text-center py-2 px-3">Fecha</th>
                        <th className="text-center py-2 px-3">Tipo</th>
                        <th className="text-center py-2 px-3 rounded-r-lg">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventos.slice(0, 15).map((e: any, i: number) => (
                        <tr key={e.id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          <td className="py-2 px-3 font-medium">{e.titulo}</td>
                          <td className="py-2 px-3 text-center text-slate-500 text-xs">{new Date(e.fecha).toLocaleDateString('es-ES')}</td>
                          <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{e.tipo}</span></td>
                          <td className="py-2 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.estado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{e.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB FORMACIÓN ═════════════════════════════════════════════════ */}
          {tab === 'formacion' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total formaciones" value={formaciones.length} icon={Award} color="purple" />
                <StatCard label="Abiertas" value={formaciones.filter((f:any)=>f.estado==='inscripciones_abiertas').length} color="green" sub="inscripciones" />
                <StatCard label="Completadas" value={formaciones.filter((f:any)=>f.estado==='completada'||f.estado==='realizada').length} color="indigo" />
                <StatCard label="Plazas totales" value={formaciones.reduce((a:number,f:any)=>a+(f.plazasDisponibles||0),0)} color="amber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Estado de convocatorias</SectionTitle>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={formPie.length ? formPie : [{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                        {(formPie.length ? formPie : [{name:'Sin datos',value:1}]).map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Ocupación de plazas</SectionTitle>
                  <div className="space-y-3 mt-2">
                    {formaciones.slice(0, 8).map((f: any) => {
                      const pct = f.plazasDisponibles > 0 ? Math.round((f.plazasOcupadas / f.plazasDisponibles) * 100) : 0
                      return (
                        <div key={f.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 truncate max-w-[200px]">{f.curso?.nombre || 'Sin nombre'}</span>
                            <span className="text-slate-500">{f.plazasOcupadas}/{f.plazasDisponibles} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981' }}></div>
                          </div>
                        </div>
                      )
                    })}
                    {formaciones.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No hay datos de formación para este período</p>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Detalle de formaciones</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <th className="text-left py-2 px-3 rounded-l-lg">Curso</th>
                        <th className="text-center py-2 px-3">Fechas</th>
                        <th className="text-center py-2 px-3">Plazas</th>
                        <th className="text-center py-2 px-3">Inscritos</th>
                        <th className="text-center py-2 px-3 rounded-r-lg">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formaciones.map((f: any, i: number) => (
                        <tr key={f.id} className={`border-b border-slate-50 ${i%2===0?'':'bg-slate-50/30'}`}>
                          <td className="py-2 px-3 font-medium">{f.curso?.nombre || '—'}</td>
                          <td className="py-2 px-3 text-center text-xs text-slate-500">{f.fechaInicio ? new Date(f.fechaInicio).toLocaleDateString('es-ES') : '—'}</td>
                          <td className="py-2 px-3 text-center">{f.plazasDisponibles}</td>
                          <td className="py-2 px-3 text-center font-bold">{f.plazasOcupadas}</td>
                          <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{f.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB LOGÍSTICA ═════════════════════════════════════════════════ */}
          {tab === 'logistica' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Peticiones" value={peticionesLog.length} icon={Package} color="indigo" />
                <StatCard label="Pendientes" value={peticionesLog.filter((p:any)=>p.estado==='pendiente').length} color="amber" />
                <StatCard label="Aprobadas" value={peticionesLog.filter((p:any)=>p.estado==='aprobada').length} color="green" />
                <StatCard label="Recibidas" value={peticionesLog.filter((p:any)=>p.estado==='recibida').length} color="blue" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Peticiones por estado</SectionTitle>
                  {(() => {
                    const estados = ['pendiente','aprobada','en_compra','recibida','rechazada','cancelada']
                    const d = estados.map(e => ({ name: e, value: peticionesLog.filter((p:any)=>p.estado===e).length })).filter(d=>d.value>0)
                    return (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={d.length?d:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                            {(d.length?d:[{name:'Sin datos',value:1}]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                          </Pie>
                          <Tooltip /><Legend wrapperStyle={{fontSize:11}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Peticiones por área</SectionTitle>
                  {(() => {
                    const areas: any = {}
                    peticionesLog.forEach((p:any) => { areas[p.areaOrigen||'Sin área'] = (areas[p.areaOrigen||'Sin área']||0)+1 })
                    const d = Object.entries(areas).map(([name,value])=>({name,value}))
                    return (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={d} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="name" tick={{fontSize:11}}/>
                          <YAxis tick={{fontSize:11}}/>
                          <Tooltip content={<CustomTooltip/>}/>
                          <Bar dataKey="value" name="Peticiones" radius={[4,4,0,0]}>
                            {d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB VEHÍCULOS ═════════════════════════════════════════════════ */}
          {tab === 'vehiculos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total vehículos" value={vehiculos.length} icon={Car} color="indigo" />
                <StatCard label="Disponibles" value={vehiculos.filter((v:any)=>v.estado==='disponible').length} color="green" />
                <StatCard label="En servicio" value={vehiculos.filter((v:any)=>v.estado==='en_servicio').length} color="amber" />
                <StatCard label="Mantenimiento" value={vehiculos.filter((v:any)=>v.estado==='mantenimiento').length} color="red" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Estado de la flota</SectionTitle>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={vehPie.length?vehPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                        {(vehPie.length?vehPie:[{name:'Sin datos',value:1}]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Flota — detalle</SectionTitle>
                  <div className="space-y-3">
                    {vehiculos.map((v: any) => (
                      <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Car size={14} className="text-indigo-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{v.indicativo} — {v.matricula}</p>
                          <p className="text-xs text-slate-500">{v.marca} {v.modelo}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.estado==='disponible'?'bg-green-100 text-green-700':v.estado==='mantenimiento'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>{v.estado}</span>
                      </div>
                    ))}
                    {vehiculos.length===0 && <p className="text-slate-400 text-sm text-center py-8">Sin datos de vehículos</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB ECONÓMICO ═════════════════════════════════════════════════ */}
          {tab === 'economico' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total dietas" value={peticionesDietas.length} icon={FileText} color="indigo" sub={`${year}`} />
                <StatCard label="Importe dietas" value={peticionesDietas.reduce((a:number,d:any)=>a+Number(d.totalDieta||d.importeTotal||0),0).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})} color="green" />
                <StatCard label="Presupuesto ejecutado" value={Number(data.presupuesto?.totalEjecutado||0).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})} color="amber" />
                <StatCard label="Presupuesto aprobado" value={Number(data.presupuesto?.totalAprobado||0).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})} color="blue" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Evolución del gasto en dietas por mes</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dietasPorMes}>
                    <defs>
                      <linearGradient id="dietas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="mes" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:11}} tickFormatter={(v:number)=>v.toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="importe" name="Importe (€)" stroke="#10b981" fill="url(#dietas)" strokeWidth={2} dot={{r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {data.presupuesto?.partidas && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Ejecución por partida presupuestaria</SectionTitle>
                  <div className="space-y-3">
                    {(data.presupuesto.partidas || []).map((p: any) => {
                      const pct = p.importeAprobado > 0 ? Math.min(100, Math.round((p.importeEjecutado / p.importeAprobado) * 100)) : 0
                      return (
                        <div key={p.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{p.nombre}</span>
                            <span className="text-slate-500">{Number(p.importeEjecutado).toLocaleString('es-ES',{style:'currency',currency:'EUR'})} / {Number(p.importeAprobado).toLocaleString('es-ES',{style:'currency',currency:'EUR'})} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:pct>=90?'#ef4444':pct>=60?'#f59e0b':'#6366f1'}}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
