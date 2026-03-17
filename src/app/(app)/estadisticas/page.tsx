'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from 'recharts'
import {
  BarChart2, Users, Calendar, Clock, TrendingUp, Award, Car,
  Package, FileText, Download, RefreshCw, ChevronDown,
  AlertTriangle, CheckCircle, Activity, Truck, ShoppingCart,
  ArrowUpDown, DollarSign, Target, Layers
} from 'lucide-react'

const TABS = [
  { id: 'personal',    label: 'Personal',     icon: Users },
  { id: 'operativo',   label: 'Operativo',    icon: Calendar },
  { id: 'formacion',   label: 'Formación',    icon: Award },
  { id: 'logistica',   label: 'Logística',    icon: Package },
  { id: 'vehiculos',   label: 'Vehículos',    icon: Truck },
  { id: 'economico',   label: 'Económico',    icon: DollarSign },
]

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16']
const MESES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const now = new Date()
const currentYear = now.getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear - 2]

function StatCard({ label, value, sub, color = 'indigo', icon: Icon }: any) {
  const c: any = {
    indigo:  'bg-indigo-50  text-indigo-700  border-indigo-200',
    amber:   'bg-amber-50   text-amber-700   border-amber-200',
    green:   'bg-green-50   text-green-700   border-green-200',
    red:     'bg-red-50     text-red-700     border-red-200',
    blue:    'bg-blue-50    text-blue-700    border-blue-200',
    purple:  'bg-purple-50  text-purple-700  border-purple-200',
    teal:    'bg-teal-50    text-teal-700    border-teal-200',
    orange:  'bg-orange-50  text-orange-700  border-orange-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${c[color] || c.indigo}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
        {Icon && <Icon size={16} className="opacity-60" />}
      </div>
      <div className="text-2xl sm:text-3xl font-black">{value ?? '—'}</div>
      {sub && <div className="text-[11px] mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: any) {
  return <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-2 border-b border-slate-100 pb-2">{children}</h3>
}

function Table({ heads, rows, empty = 'Sin datos' }: { heads: string[], rows: any[][], empty?: string }) {
  if (rows.length === 0) return <p className="text-slate-400 text-sm text-center py-8">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            {heads.map((h, i) => <th key={i} className={`py-2 px-3 text-${i === 0 ? 'left' : 'center'} font-semibold`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 ${i % 2 ? 'bg-slate-50/20' : ''}`}>
              {row.map((cell, j) => (
                <td key={j} className={`py-2 px-3 ${j === 0 ? 'font-medium text-slate-800' : 'text-center text-slate-600'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{
          typeof p.value === 'number' && p.value > 999
            ? p.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
            : p.value
        }</strong></p>
      ))}
    </div>
  )
}

export default function EstadisticasPage() {
  const [tab, setTab]     = useState('personal')
  const [year, setYear]   = useState(currentYear)
  const [mes, setMes]     = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [data, setData]   = useState<any>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const mesParam = mes === 'all' ? '' : `&mes=${mes}`
      const res = await fetch(`/api/estadisticas?year=${year}${mesParam}`)
      const json = await res.json()
      setData(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [year, mes])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Datos normalizados ────────────────────────────────────────────────────
  const resumen          = data.resumen              || {}
  const guardiasPorMes   = (data.guardiasPorMes      || []).map((g: any, i: number) => ({ ...g, mes: MESES[i] ?? g.mes }))
  const horasPorMes      = guardiasPorMes.map((g: any) => ({ mes: g.mes, horas: (g.manana||0)*6+(g.tarde||0)*5+(g.noche||0)*9 }))
  const dietasPorMes     = (data.dietasPorMes        || []).map((d: any, i: number) => ({ ...d, mes: MESES[i] ?? d.mes }))
  const eventosPorMes    = (data.eventosPorMes       || []).map((e: any, i: number) => ({ ...e, mes: MESES[i] ?? e.mes }))
  const cajaPorMes       = (data.cajaPorMes          || []).map((c: any, i: number) => ({ ...c, mes: MESES[i] ?? c.mes }))
  const peticionesPorMes = (data.peticionesPorMes    || []).map((p: any, i: number) => ({ ...p, mes: MESES[i] ?? p.mes }))
  const vuelosPorMes     = (data.vuelosPorMes        || []).map((v: any, i: number) => ({ ...v, mes: MESES[i] ?? v.mes }))
  const statsVoluntarios: any[] = data.statsVoluntarios || []
  const statsPorArea: any[]     = data.statsPorArea     || []
  const voluntarios: any[]      = data.todosVoluntarios  || []
  const guardias: any[]         = data.guardiasRaw       || []
  const eventos: any[]          = data.eventosRaw        || []
  const formaciones: any[]      = data.statsFormacion?.lista || data.formacionesRaw || []
  const vehiculos: any[]        = data.statsVehiculos?.lista || data.vehiculosRaw   || []
  const peticionesLog: any[]    = data.peticionesLog      || []
  const movimientosCaja: any[]  = data.movimientosCaja    || []
  const partidas: any[]         = data.partidas           || []
  const partesPSI: any[]        = data.partesPSI          || []
  const drones: any[]           = data.drones             || []

  // Pies
  const areaPie   = statsPorArea.map((a: any) => ({ name: a.area || 'Sin área', value: a.voluntarios || 0 }))
  const eventoPie = Object.entries(data.eventosTipo || {}).map(([name, value]) => ({ name, value }))
  const formPie   = Object.entries(data.statsFormacion?.porEstado || {}).map(([name, value]) => ({ name, value }))
  const vehPie    = Object.entries(data.statsVehiculos?.porEstado || {}).map(([name, value]) => ({ name, value }))
  const petPie    = Object.entries(data.peticionesEstados || {}).map(([name, value]) => ({ name, value }))

  // Top voluntarios
  const top10 = statsVoluntarios.slice(0, 10).map((v: any) => ({
    nombre: `${v.nombre} ${v.apellidos}`.trim().slice(0, 20),
    guardias: v.guardias || 0,
    horas: v.horas || 0,
  }))

  // Horas medias por indicativo
  const horasPorIndicativo = statsVoluntarios
    .filter((v: any) => v.guardias > 0)
    .map((v: any) => ({
      indicativo: v.numeroVoluntario || '—',
      nombre: `${v.nombre} ${v.apellidos}`.trim(),
      guardias: v.guardias,
      horas: v.horas,
      mediaHorasGuardia: v.guardias > 0 ? (v.horas / v.guardias).toFixed(1) : '—',
      area: v.area,
    }))
    .sort((a: any, b: any) => b.horas - a.horas)

  // Horas colectivas por mes
  const horasColectivasPorMes = guardiasPorMes.map((g: any) => ({
    mes: g.mes,
    guardiasH: (g.manana || 0) * 6 + (g.tarde || 0) * 5 + (g.noche || 0) * 9,
    eventosH: eventosPorMes.find((e: any) => e.mes === g.mes)?.total || 0,
    total: ((g.manana || 0) * 6 + (g.tarde || 0) * 5 + (g.noche || 0) * 9),
  }))

  // Stock por área
  const stockPorArea = Object.entries(data.stockPorArea || {}).map(([slug, s]: any) => ({
    name: s.nombre || slug,
    total: s.total,
    stockBajo: s.stockBajo,
    ok: s.total - s.stockBajo,
  }))

  // Peticiones por área
  const petPorArea = Object.entries(data.peticionesPorArea || {}).map(([name, value]) => ({ name, value }))

  // Mantenimiento por mes
  const mantPorMes = (data.statsVehiculos?.mantenimientoPorMes || []).map((m: any, i: number) => ({ ...m, mes: MESES[i] ?? m.mes }))

  const fmt = (n: any) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const totalHoras = resumen.totalHoras || 0
  const mediaHorasVol = statsVoluntarios.length ? (totalHoras / statsVoluntarios.filter((v: any) => v.guardias > 0).length).toFixed(1) : '0'

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Estadísticas</h1>
            <p className="text-sm text-slate-500">Análisis completo · Protección Civil Bormujos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none">
            <option value="all">Todo el año</option>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <button onClick={fetchData} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
            <Download size={15} />Exportar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={14} />{t.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* ══ PERSONAL ══════════════════════════════════════════════════════ */}
          {tab === 'personal' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Voluntarios activos" value={resumen.totalVoluntarios} icon={Users} color="indigo" sub={`de ${voluntarios.length} registrados`} />
                <StatCard label="Guardias realizadas" value={resumen.totalGuardias} icon={Calendar} color="amber" sub={`año ${year}`} />
                <StatCard label="Horas totales" value={(totalHoras||0).toLocaleString()} icon={Clock} color="green" sub="estimadas" />
                <StatCard label="Media horas/voluntario" value={`${mediaHorasVol}h`} icon={Activity} color="blue" sub="activos en período" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Guardias por mes y turno</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={guardiasPorMes} barSize={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="manana" name="Mañana" fill="#f59e0b" radius={[3,3,0,0]} />
                      <Bar dataKey="tarde"  name="Tarde"  fill="#6366f1" radius={[3,3,0,0]} />
                      <Bar dataKey="noche"  name="Noche"  fill="#1e293b" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Distribución por área</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={areaPie.length ? areaPie : [{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,percent}:any)=>`${name} ${((percent||0)*100).toFixed(0)}%`} labelLine={false}>
                        {areaPie.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Horas colectivas del cuerpo por mes (guardias)</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={horasColectivasPorMes}>
                    <defs>
                      <linearGradient id="hc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="guardiasH" name="Horas guardias" stroke="#6366f1" fill="url(#hc)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Top 10 voluntarios por guardias realizadas</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={top10} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="guardias" name="Guardias" radius={[0,3,3,0]}>
                      {top10.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla horas medias por indicativo */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Horas medias de servicio por indicativo</SectionTitle>
                <Table
                  heads={['Nº Voluntario','Nombre','Área','Guardias','Horas totales','Media h/guardia']}
                  rows={horasPorIndicativo.map((v:any) => [
                    <span className="font-mono text-indigo-700">{v.indicativo}</span>,
                    v.nombre,
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{v.area}</span>,
                    v.guardias,
                    `${v.horas}h`,
                    <span className="font-bold">{v.mediaHorasGuardia}h</span>,
                  ])}
                  empty="Sin datos de horas en este período"
                />
              </div>

              {/* Tabla completa voluntarios */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Detalle completo por voluntario</SectionTitle>
                <Table
                  heads={['Nº','Nombre','Área','Categoría','Guardias','Horas','Dietas (€)','Km','Estado']}
                  rows={statsVoluntarios.map((v:any) => [
                    v.numeroVoluntario || '—',
                    `${v.nombre} ${v.apellidos}`.trim(),
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{v.area}</span>,
                    v.categoria,
                    v.guardias,
                    `${v.horas}h`,
                    v.importeDietas > 0 ? fmt(v.importeDietas) : '—',
                    v.km > 0 ? `${v.km} km` : '—',
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{v.activo ? 'Activo' : 'Inactivo'}</span>,
                  ])}
                />
              </div>

              {/* Sin actividad */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Voluntarios sin actividad en el período</SectionTitle>
                <Table
                  heads={['Nº','Nombre','Área','Estado']}
                  rows={statsVoluntarios.filter((v:any) => v.guardias === 0).map((v:any) => [
                    v.numeroVoluntario || '—',
                    `${v.nombre} ${v.apellidos}`.trim(),
                    v.area,
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v.activo ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{v.activo ? 'Sin guardias' : 'Inactivo'}</span>,
                  ])}
                  empty="Todos los voluntarios tienen actividad"
                />
              </div>
            </div>
          )}

          {/* ══ OPERATIVO ═════════════════════════════════════════════════════ */}
          {tab === 'operativo' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total guardias" value={resumen.totalGuardias} icon={Calendar} color="indigo" />
                <StatCard label="Eventos" value={resumen.totalEventos} icon={Activity} color="amber" />
                <StatCard label="Partes PSI" value={resumen.totalPSI} icon={FileText} color="blue" />
                <StatCard label="Participaciones" value={resumen.totalParticipaciones} icon={Users} color="green" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Evolución mensual de guardias</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={guardiasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="manana" name="Mañana" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="tarde"  name="Tarde"  stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="noche"  name="Noche"  stroke="#1e293b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Eventos por tipo</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={eventoPie.length ? eventoPie : [{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                        {(eventoPie.length ? eventoPie : [{name:'Sin datos',value:1}]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Eventos por mes</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={eventosPorMes} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Eventos" fill="#6366f1" radius={[4,4,0,0]}>
                      {eventosPorMes.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Listado de eventos</SectionTitle>
                <Table
                  heads={['Evento','Fecha','Tipo','Participantes','Estado']}
                  rows={eventos.map((e:any) => [
                    e.titulo,
                    new Date(e.fecha).toLocaleDateString('es-ES'),
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{e.tipo}</span>,
                    e.participantes?.length || 0,
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${e.estado==='completado'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{e.estado}</span>,
                  ])}
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Partes PSI registrados</SectionTitle>
                <Table
                  heads={['Fecha','Tipo','Municipio','Estado']}
                  rows={partesPSI.map((p:any) => [
                    new Date(p.createdAt).toLocaleDateString('es-ES'),
                    p.tipoIncidencia || p.tipo || '—',
                    p.municipio || '—',
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{p.estado || 'registrado'}</span>,
                  ])}
                  empty="Sin partes PSI en este período"
                />
              </div>
            </div>
          )}

          {/* ══ FORMACIÓN ═════════════════════════════════════════════════════ */}
          {tab === 'formacion' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total convocatorias" value={formaciones.length} icon={Award} color="purple" />
                <StatCard label="Abiertas" value={formaciones.filter((f:any)=>f.estado==='inscripciones_abiertas').length} color="green" sub="inscripciones" />
                <StatCard label="Completadas" value={formaciones.filter((f:any)=>['completada','realizada'].includes(f.estado)).length} color="indigo" />
                <StatCard label="Total inscritos" value={formaciones.reduce((a:number,f:any)=>a+(f.inscritos||f.plazasOcupadas||0),0)} color="amber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Estado de convocatorias</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={formPie.length?formPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                        {(formPie.length?formPie:[{name:'Sin datos',value:1}]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Ocupación de plazas por curso</SectionTitle>
                  <div className="space-y-3 mt-2 max-h-56 overflow-y-auto">
                    {formaciones.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Sin datos de formación</p>}
                    {formaciones.map((f:any) => {
                      const pct = f.plazasDisponibles > 0 ? Math.round(((f.inscritos||f.plazasOcupadas||0)/f.plazasDisponibles)*100) : 0
                      return (
                        <div key={f.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 truncate max-w-[200px]">{f.nombre}</span>
                            <span className="text-slate-500">{f.inscritos||f.plazasOcupadas||0}/{f.plazasDisponibles} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{width:`${pct}%`,backgroundColor:pct>=90?'#ef4444':pct>=60?'#f59e0b':'#10b981'}}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Detalle de convocatorias</SectionTitle>
                <Table
                  heads={['Curso','Tipo','Fecha inicio','Plazas','Inscritos','Horas','Estado']}
                  rows={formaciones.map((f:any) => [
                    f.nombre,
                    f.tipo || '—',
                    f.fechaInicio ? new Date(f.fechaInicio).toLocaleDateString('es-ES') : '—',
                    f.plazasDisponibles,
                    f.inscritos || f.plazasOcupadas || 0,
                    f.horas ? `${f.horas}h` : '—',
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{f.estado}</span>,
                  ])}
                />
              </div>
            </div>
          )}

          {/* ══ LOGÍSTICA ═════════════════════════════════════════════════════ */}
          {tab === 'logistica' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total artículos" value={resumen.totalArticulos} icon={Package} color="indigo" />
                <StatCard label="Stock bajo" value={stockPorArea.reduce((a:number,s:any)=>a+s.stockBajo,0)} icon={AlertTriangle} color="red" />
                <StatCard label="Peticiones período" value={resumen.totalPeticiones} icon={ShoppingCart} color="amber" />
                <StatCard label="Pendientes" value={peticionesLog.filter((p:any)=>p.estado==='pendiente').length} icon={Clock} color="orange" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Stock por área — total vs stock bajo</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stockPorArea} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="ok"       name="Stock OK"   fill="#10b981" radius={[3,3,0,0]} />
                      <Bar dataKey="stockBajo" name="Stock bajo" fill="#ef4444" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Peticiones por estado</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={petPie.length?petPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                        {(petPie.length?petPie:[{name:'Sin datos',value:1}]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Peticiones por área</SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={petPorArea} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Peticiones" radius={[4,4,0,0]}>
                        {petPorArea.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Evolución de peticiones por mes</SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={peticionesPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="total"    name="Total"     stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="aprobadas" name="Aprobadas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Todas las peticiones del período</SectionTitle>
                <Table
                  heads={['Número','Material','Área','Solicitante','Estado','Fecha']}
                  rows={peticionesLog.map((p:any) => [
                    <span className="font-mono text-xs text-slate-500">{p.numero}</span>,
                    p.nombreArticulo,
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{p.areaOrigen || '—'}</span>,
                    p.solicitante ? `${p.solicitante.nombre} ${p.solicitante.apellidos}` : '—',
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.estado==='pendiente'?'bg-amber-100 text-amber-700':p.estado==='aprobada'?'bg-blue-100 text-blue-700':p.estado==='recibida'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{p.estado}</span>,
                    new Date(p.fechaSolicitud).toLocaleDateString('es-ES'),
                  ])}
                  empty="Sin peticiones en este período"
                />
              </div>
            </div>
          )}

          {/* ══ VEHÍCULOS ═════════════════════════════════════════════════════ */}
          {tab === 'vehiculos' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total vehículos" value={vehiculos.length} icon={Truck} color="indigo" />
                <StatCard label="Disponibles" value={vehiculos.filter((v:any)=>v.estado==='disponible').length} color="green" />
                <StatCard label="En servicio" value={vehiculos.filter((v:any)=>v.estado==='en_servicio').length} color="amber" />
                <StatCard label="Mantenimientos" value={vehiculos.reduce((a:number,v:any)=>a+(v.mantenimientos||0),0)} color="red" sub="en período" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Estado de la flota</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={vehPie.length?vehPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                        {(vehPie.length?vehPie:[{name:'Sin datos',value:1}]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Mantenimientos por mes — número y coste</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={mantPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v:number)=>fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="left" dataKey="total" name="Nº mantenimientos" fill="#6366f1" radius={[4,4,0,0]} />
                      <Line yAxisId="right" type="monotone" dataKey="coste" name="Coste (€)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Detalle de flota</SectionTitle>
                <Table
                  heads={['Indicativo','Matrícula','Marca / Modelo','Km actuales','Mantenimientos','Coste total','Estado']}
                  rows={vehiculos.map((v:any) => [
                    <span className="font-bold text-indigo-700">{v.indicativo}</span>,
                    v.matricula,
                    `${v.marca} ${v.modelo}`,
                    v.kmActual ? `${Number(v.kmActual).toLocaleString()} km` : '—',
                    v.mantenimientos || 0,
                    v.costeMant > 0 ? fmt(v.costeMant) : '—',
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v.estado==='disponible'?'bg-green-100 text-green-700':v.estado==='mantenimiento'||v.estado==='en_taller'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>{v.estado}</span>,
                  ])}
                />
              </div>
            </div>
          )}

          {/* ══ ECONÓMICO ═════════════════════════════════════════════════════ */}
          {tab === 'economico' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Importe dietas" value={fmt(resumen.totalDietas||0)} icon={FileText} color="indigo" sub={`${year}`} />
                <StatCard label="Total km" value={`${(resumen.totalKm||0).toLocaleString()} km`} icon={Activity} color="blue" />
                <StatCard label="Ingresos caja" value={fmt(resumen.ingresos||0)} icon={TrendingUp} color="green" />
                <StatCard label="Gastos caja" value={fmt(resumen.gastos||0)} icon={ArrowUpDown} color="red" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                <StatCard label="Saldo" value={fmt(resumen.saldo||0)} color={(resumen.saldo||0)>=0?"green":"red"} sub="ingresos - gastos" />
                <StatCard label="Días de servicio (dietas)" value={resumen.totalDietas > 0 ? (data.diasServicio||[]).length : 0} color="amber" sub="registros de dieta" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Evolución dietas por mes</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dietasPorMes}>
                    <defs>
                      <linearGradient id="diet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v:number)=>fmt(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="importe" name="Importe (€)" stroke="#10b981" fill="url(#diet)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Ingresos vs Gastos por mes</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cajaPorMes} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v:number)=>fmt(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3,3,0,0]} />
                    <Bar dataKey="gastos"   name="Gastos"   fill="#ef4444" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {partidas.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionTitle>Ejecución presupuestaria por partida</SectionTitle>
                  <div className="space-y-3">
                    {partidas.map((p:any) => {
                      const pct = p.importeAprobado > 0 ? Math.min(100, Math.round((p.importeEjecutado/p.importeAprobado)*100)) : 0
                      return (
                        <div key={p.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{p.nombre}</span>
                            <span className="text-slate-500">{fmt(p.importeEjecutado)} / {fmt(p.importeAprobado)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{width:`${pct}%`,backgroundColor:pct>=90?'#ef4444':pct>=60?'#f59e0b':'#6366f1'}}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Movimientos de caja</SectionTitle>
                <Table
                  heads={['Fecha','Concepto','Tipo','Importe']}
                  rows={movimientosCaja.map((m:any) => [
                    new Date(m.fecha).toLocaleDateString('es-ES'),
                    m.concepto || m.descripcion || '—',
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${m.tipo==='ingreso'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{m.tipo}</span>,
                    <span className={`font-bold ${m.tipo==='ingreso'?'text-green-700':'text-red-600'}`}>{fmt(Number(m.importe||0))}</span>,
                  ])}
                  empty="Sin movimientos de caja en este período"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <SectionTitle>Dietas por voluntario</SectionTitle>
                <Table
                  heads={['Voluntario','Área','Días','Km','Importe dietas']}
                  rows={statsVoluntarios.filter((v:any)=>v.importeDietas>0).map((v:any) => [
                    `${v.nombre} ${v.apellidos}`.trim(),
                    v.area,
                    v.diasServicio,
                    `${v.km} km`,
                    <span className="font-bold text-green-700">{fmt(v.importeDietas)}</span>,
                  ])}
                  empty="Sin dietas registradas en este período"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
