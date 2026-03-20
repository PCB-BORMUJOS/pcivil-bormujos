'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import {
  BarChart2, Users, Calendar, Clock, TrendingUp, Award, Car,
  Package, FileText, RefreshCw, AlertTriangle, Activity, Truck,
  ShoppingCart, ArrowUpDown, DollarSign, Target, CheckCircle2,
  MapPin, Gauge, Wrench, GraduationCap
} from 'lucide-react'

const TABS = [
  { id: 'personal',  label: 'Personal',    icon: Users },
  { id: 'operativo', label: 'Operativo',   icon: Calendar },
  { id: 'formacion', label: 'Formación',   icon: GraduationCap },
  { id: 'logistica', label: 'Logística',   icon: Package },
  { id: 'vehiculos', label: 'Vehículos',   icon: Truck },
  { id: 'economico', label: 'Económico',   icon: DollarSign },
]
const PALETTE = {
  indigo:'#4f46e5', blue:'#2563eb', teal:'#0d9488', green:'#16a34a',
  amber:'#d97706', orange:'#ea580c', red:'#dc2626', purple:'#7c3aed',
  slate:'#475569', pink:'#db2777',
}
const CHART_COLORS = Object.values(PALETTE)
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const now = new Date()
const currentYear = now.getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear - 2]

const fmtEur = (n: any) =>
  (Number(n)||0).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})
const fmtKm = (n: any) => `${(Number(n)||0).toLocaleString('es-ES')} km`
const fmtNum = (n: any) => (Number(n)||0).toLocaleString('es-ES')
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'

function KpiCard({ label, value, sub, color='indigo', icon: Icon }: any) {
  const cm: Record<string,{bg:string;ring:string}> = {
    indigo:{bg:'bg-indigo-600',ring:'ring-indigo-100'},
    blue:  {bg:'bg-blue-600',  ring:'ring-blue-100'},
    green: {bg:'bg-green-600', ring:'ring-green-100'},
    amber: {bg:'bg-amber-500', ring:'ring-amber-100'},
    red:   {bg:'bg-red-600',   ring:'ring-red-100'},
    orange:{bg:'bg-orange-500',ring:'ring-orange-100'},
    teal:  {bg:'bg-teal-600',  ring:'ring-teal-100'},
    purple:{bg:'bg-purple-600',ring:'ring-purple-100'},
    slate: {bg:'bg-slate-600', ring:'ring-slate-100'},
  }
  const c = cm[color] || cm.indigo
  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ring-1 ${c.ring}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        {Icon && <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}><Icon size={16} className="text-white" /></div>}
      </div>
      <div className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">{value??'—'}</div>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function Panel({ title, children, className='' }: any) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      {title && <div className="px-5 py-4 border-b border-slate-50"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3></div>}
      <div className="p-5">{children}</div>
    </div>
  )
}

function Badge({ label, variant='default' }: any) {
  const v: Record<string,string> = {
    default:'bg-slate-100 text-slate-600',
    green:'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    amber:'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    red:'bg-red-50 text-red-700 ring-1 ring-red-200',
    blue:'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    indigo:'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    purple:'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${v[variant]||v.default}`}>{label}</span>
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active||!payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xl p-3.5 text-xs min-w-[140px]">
      {label && <p className="font-bold text-slate-700 mb-2 pb-1.5 border-b border-slate-100">{label}</p>}
      {payload.map((p: any, i: number) => {
        const val = formatter ? formatter(p.name, p.value) : p.value?.toLocaleString('es-ES')
        return (
          <div key={i} className="flex items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:p.color}}/>
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-bold text-slate-800">{val}</span>
          </div>
        )
      })}
    </div>
  )
}

function DataTable({ heads, rows, empty='Sin datos disponibles' }: {heads:string[];rows:any[][];empty?:string}) {
  if (!rows.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <FileText size={32} className="mb-2 opacity-30"/>
      <p className="text-sm">{empty}</p>
    </div>
  )
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {heads.map((h,i) => <th key={i} className={`px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${i===0?'text-left':'text-center'}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
              {row.map((cell,j) => <td key={j} className={`px-5 py-3 ${j===0?'font-medium text-slate-800':'text-center text-slate-600'}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProgressBar({ label, value, max }: any) {
  const pct = max>0 ? Math.min(100,Math.round((value/max)*100)) : 0
  const bg = pct>=90?'#dc2626':pct>=60?'#d97706':'#4f46e5'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-700 truncate max-w-[60%]">{label}</span>
        <span className="text-slate-400 font-medium">{value?.toLocaleString('es-ES')} / {max?.toLocaleString('es-ES')} <span className="text-slate-300">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:bg}}/>
      </div>
    </div>
  )
}

export default function EstadisticasPage() {
  const [tab, setTab]   = useState('personal')
  const [year, setYear] = useState(currentYear)
  const [mes, setMes]   = useState<number|'all'>('all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const mesParam = mes==='all' ? '' : `&mes=${mes}`
      const res = await fetch(`/api/estadisticas?year=${year}${mesParam}`)
      setData(await res.json())
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }, [year, mes])

  useEffect(() => { fetchData() }, [fetchData])

  const resumen          = data.resumen              || {}
  const guardiasPorMes   = (data.guardiasPorMes      || []).map((g:any,i:number)=>({...g,mes:MESES[i]??g.mes}))
  const dietasPorMes     = (data.dietasPorMes        || []).map((d:any,i:number)=>({...d,mes:MESES[i]??d.mes}))
  const eventosPorMes    = (data.eventosPorMes        || []).map((e:any,i:number)=>({...e,mes:MESES[i]??e.mes}))
  const cajaPorMes       = (data.cajaPorMes           || []).map((c:any,i:number)=>({...c,mes:MESES[i]??c.mes}))
  const peticionesPorMes = (data.peticionesPorMes     || []).map((p:any,i:number)=>({...p,mes:MESES[i]??p.mes}))
  const statsVoluntarios: any[] = data.statsVoluntarios || []
  const statsPorArea: any[]     = data.statsPorArea     || []
  const voluntarios: any[]      = data.todosVoluntarios  || []
  const eventos: any[]          = data.eventosRaw        || []
  const formaciones: any[]      = data.statsFormacion?.lista || []
  const vehiculos: any[]        = data.statsVehiculos?.lista || []
  const peticionesLog: any[]    = data.peticionesLog      || []
  const movimientosCaja: any[]  = data.movimientosCaja    || []
  const partidas: any[]         = data.partidas           || []
  const partesPSI: any[]        = data.partesPSI          || []
  const mantPorMes = (data.statsVehiculos?.mantenimientoPorMes||[]).map((m:any,i:number)=>({...m,mes:MESES[i]??m.mes}))

  const totalHoras = resumen.totalHoras || 0
  const volActivos = statsVoluntarios.filter((v:any)=>v.guardias>0)
  const mediaHorasVol = volActivos.length ? (totalHoras/volActivos.length).toFixed(1) : '0'
  const areaPie   = statsPorArea.map((a:any)=>({name:a.area||'Sin área',value:a.voluntarios||0}))
  const eventoPie = Object.entries(data.eventosTipo||{}).map(([name,value])=>({name,value}))
  const formPie   = Object.entries(data.statsFormacion?.porEstado||{}).map(([name,value])=>({name,value}))
  const vehPie    = Object.entries(data.statsVehiculos?.porEstado||{}).map(([name,value])=>({name,value}))
  const petPie    = Object.entries(data.peticionesEstados||{}).map(([name,value])=>({name,value}))
  const top10 = statsVoluntarios.slice(0,10).map((v:any)=>({
    nombre:`${v.nombre} ${(v.apellidos||'').split(' ')[0]}`.trim().slice(0,18),
    guardias:v.guardias||0,horas:v.horas||0,
  }))
  const horasColectivasPorMes = guardiasPorMes.map((g:any)=>({mes:g.mes,horas:(g.manana||0)*6+(g.tarde||0)*5+(g.noche||0)*9}))
  const stockPorArea = Object.entries(data.stockPorArea||{}).map(([slug,s]:any)=>({name:s.nombre||slug,ok:s.total-s.stockBajo,stockBajo:s.stockBajo}))
  const petPorArea = Object.entries(data.peticionesPorArea||{}).map(([name,value])=>({name,value}))

  const estadoBadge = (e:string) => {
    const m:Record<string,string>={pendiente:'amber',aprobada:'blue',en_compra:'purple',recibida:'green',rechazada:'red',cancelada:'red',disponible:'green',en_servicio:'blue',mantenimiento:'amber',en_taller:'red',completado:'green',planificado:'blue',cancelado:'red'}
    return m[e]||'default'
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BarChart2 size={20} className="text-white"/>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Estadísticas</h1>
              <p className="text-xs text-slate-400 font-medium">Análisis operativo · Protección Civil Bormujos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={year} onChange={e=>setYear(Number(e.target.value))} className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={mes} onChange={e=>setMes(e.target.value==='all'?'all':Number(e.target.value))} className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="all">Todo el año</option>
              {MESES.map((m,i)=><option key={i} value={i}>{m} {year}</option>)}
            </select>
            <button onClick={fetchData} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw size={15} className={loading?'animate-spin':''}/>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-2xl overflow-x-auto">
          {TABS.map(t=>{
            const Icon=t.icon; const active=tab===t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${active?'bg-indigo-600 text-white shadow-sm shadow-indigo-200':'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                <Icon size={14}/>{t.label}
              </button>
            )
          })}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-slate-400 font-medium">Cargando estadísticas...</p>
          </div>
        )}

        {!loading && (
          <>
            {tab==='personal' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Voluntarios activos" value={fmtNum(resumen.totalVoluntarios)} icon={Users} color="indigo" sub={`${voluntarios.length} registrados en total`}/>
                  <KpiCard label="Guardias realizadas" value={fmtNum(resumen.totalGuardias)} icon={Calendar} color="amber" sub={`Año ${year}`}/>
                  <KpiCard label="Horas de servicio" value={`${fmtNum(totalHoras)} h`} icon={Clock} color="teal" sub="Estimadas según turno"/>
                  <KpiCard label="Media por voluntario" value={`${mediaHorasVol} h`} icon={Activity} color="blue" sub="Voluntarios con actividad"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Panel title="Guardias por mes y turno" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={guardiasPorMes} barSize={10} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b',paddingTop:8}}/>
                        <Bar dataKey="manana" name="Mañana" fill={PALETTE.amber}  radius={[3,3,0,0]}/>
                        <Bar dataKey="tarde"  name="Tarde"  fill={PALETTE.indigo} radius={[3,3,0,0]}/>
                        <Bar dataKey="noche"  name="Noche"  fill={PALETTE.slate}  radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Distribución por área">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={areaPie.length?areaPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} innerRadius={40} paddingAngle={2}>
                          {areaPie.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={(val:any,name:any)=>[`${val} voluntarios`,name]}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>
                </div>
                <Panel title="Horas colectivas de servicio por mes">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={horasColectivasPorMes}>
                      <defs>
                        <linearGradient id="gradHoras" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PALETTE.indigo} stopOpacity={0.2}/>
                          <stop offset="100%" stopColor={PALETTE.indigo} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Area type="monotone" dataKey="horas" name="Horas" stroke={PALETTE.indigo} fill="url(#gradHoras)" strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.indigo,strokeWidth:0}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Panel>
                <Panel title="Top 10 voluntarios por actividad">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={top10} layout="vertical" barSize={12} margin={{left:8}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="nombre" tick={{fontSize:11,fill:'#475569'}} width={120} axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                      <Bar dataKey="guardias" name="Guardias" radius={[0,4,4,0]}>
                        {top10.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
                <Panel title="Detalle por voluntario">
                  <DataTable
                    heads={['Nº Vol.','Nombre completo','Área','Categoría','Guardias','Horas','Dietas','Km','Estado']}
                    rows={statsVoluntarios.map((v:any)=>[
                      <span key="n" className="font-mono text-xs font-bold text-indigo-600">{v.numeroVoluntario||'—'}</span>,
                      `${v.nombre} ${v.apellidos}`.trim(),
                      <Badge key="a" label={v.area} variant="indigo"/>,
                      <span key="c" className="text-xs text-slate-500">{v.categoria}</span>,
                      <span key="g" className="font-bold">{v.guardias}</span>,
                      v.horas>0?`${v.horas} h`:'—',
                      v.importeDietas>0?<span key="d" className="font-semibold text-green-700">{fmtEur(v.importeDietas)}</span>:'—',
                      v.km>0?<span key="km">{fmtKm(v.km)}</span>:'—',
                      <Badge key="s" label={v.activo?'Activo':'Inactivo'} variant={v.activo?'green':'red'}/>,
                    ])}
                    empty="Sin datos de voluntarios"
                  />
                </Panel>
              </div>
            )}

            {tab==='operativo' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Total guardias" value={fmtNum(resumen.totalGuardias)} icon={Calendar} color="indigo"/>
                  <KpiCard label="Eventos" value={fmtNum(resumen.totalEventos)} icon={Activity} color="amber"/>
                  <KpiCard label="Partes PSI" value={fmtNum(resumen.totalPSI)} icon={FileText} color="blue"/>
                  <KpiCard label="Participaciones" value={fmtNum(resumen.totalParticipaciones)} icon={Users} color="green"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Panel title="Evolución mensual de guardias" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={guardiasPorMes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTooltip/>}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b',paddingTop:8}}/>
                        <Line type="monotone" dataKey="manana" name="Mañana" stroke={PALETTE.amber}  strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.amber,strokeWidth:0}}/>
                        <Line type="monotone" dataKey="tarde"  name="Tarde"  stroke={PALETTE.indigo} strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.indigo,strokeWidth:0}}/>
                        <Line type="monotone" dataKey="noche"  name="Noche"  stroke={PALETTE.slate}  strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.slate,strokeWidth:0}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Eventos por tipo">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={eventoPie.length?eventoPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} innerRadius={40} paddingAngle={2}>
                          {eventoPie.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip/><Legend wrapperStyle={{fontSize:11,color:'#64748b'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>
                </div>
                <Panel title="Eventos por mes">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={eventosPorMes} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                      <Bar dataKey="total" name="Eventos" radius={[4,4,0,0]}>
                        {eventosPorMes.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
                <Panel title="Listado de eventos">
                  <DataTable
                    heads={['Evento','Fecha','Tipo','Participantes','Estado']}
                    rows={eventos.map((e:any)=>[
                      <span key="t" className="font-medium">{e.titulo}</span>,
                      fmtDate(e.fecha),
                      <Badge key="tp" label={e.tipo} variant="indigo"/>,
                      <span key="p" className="font-bold">{e.participantes?.length||0}</span>,
                      <Badge key="s" label={e.estado||'planificado'} variant={estadoBadge(e.estado)}/>,
                    ])}
                    empty="Sin eventos en este período"
                  />
                </Panel>
                {partesPSI.length>0 && (
                  <Panel title="Partes PSI registrados">
                    <DataTable
                      heads={['Fecha','Tipo incidencia','Municipio','Estado']}
                      rows={partesPSI.map((p:any)=>[
                        fmtDate(p.createdAt),
                        p.tipoIncidencia||p.tipo||'—',
                        p.municipio||'—',
                        <Badge key="s" label={p.estado||'registrado'} variant="green"/>,
                      ])}
                      empty="Sin partes PSI"
                    />
                  </Panel>
                )}
              </div>
            )}

            {tab==='formacion' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Total convocatorias" value={fmtNum(formaciones.length)} icon={GraduationCap} color="purple"/>
                  <KpiCard label="Inscripciones abiertas" value={fmtNum(formaciones.filter((f:any)=>f.estado==='inscripciones_abiertas').length)} icon={Target} color="green"/>
                  <KpiCard label="Completadas" value={fmtNum(formaciones.filter((f:any)=>['completada','realizada'].includes(f.estado)).length)} icon={CheckCircle2} color="teal"/>
                  <KpiCard label="Total inscritos" value={fmtNum(formaciones.reduce((a:number,f:any)=>a+(f.inscritos||f.plazasOcupadas||0),0))} icon={Users} color="amber"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Panel title="Estado de convocatorias">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={formPie.length?formPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} innerRadius={45} paddingAngle={3}>
                          {formPie.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip/><Legend wrapperStyle={{fontSize:11,color:'#64748b'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Ocupación de plazas por convocatoria">
                    <div className="space-y-4 mt-2 max-h-60 overflow-y-auto pr-1">
                      {formaciones.length===0 && <p className="text-slate-400 text-sm text-center py-8">Sin datos de formación</p>}
                      {formaciones.map((f:any)=>(
                        <ProgressBar key={f.id} label={f.nombre} value={f.inscritos||f.plazasOcupadas||0} max={f.plazasDisponibles||1}/>
                      ))}
                    </div>
                  </Panel>
                </div>
                <Panel title="Detalle de convocatorias">
                  <DataTable
                    heads={['Curso','Tipo','Fecha inicio','Plazas','Inscritos','Horas','Estado']}
                    rows={formaciones.map((f:any)=>[
                      <span key="n" className="font-medium">{f.nombre}</span>,
                      f.tipo?<Badge key="t" label={f.tipo} variant="purple"/>:'—',
                      fmtDate(f.fechaInicio),
                      f.plazasDisponibles||'—',
                      <span key="i" className="font-bold">{f.inscritos||f.plazasOcupadas||0}</span>,
                      f.horas?`${f.horas} h`:'—',
                      <Badge key="s" label={f.estado} variant={estadoBadge(f.estado)}/>,
                    ])}
                    empty="Sin convocatorias en este período"
                  />
                </Panel>
              </div>
            )}

            {tab==='logistica' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Total artículos" value={fmtNum(resumen.totalArticulos)} icon={Package} color="indigo"/>
                  <KpiCard label="Artículos stock bajo" value={fmtNum(stockPorArea.reduce((a:number,s:any)=>a+s.stockBajo,0))} icon={AlertTriangle} color="red"/>
                  <KpiCard label="Peticiones en período" value={fmtNum(resumen.totalPeticiones)} icon={ShoppingCart} color="amber"/>
                  <KpiCard label="Pendientes de resolver" value={fmtNum(peticionesLog.filter((p:any)=>p.estado==='pendiente').length)} icon={Clock} color="orange"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Panel title="Stock por área" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stockPorArea} barSize={14} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b',paddingTop:8}}/>
                        <Bar dataKey="ok"        name="Stock correcto" fill={PALETTE.teal} radius={[3,3,0,0]}/>
                        <Bar dataKey="stockBajo" name="Stock bajo"     fill={PALETTE.red}  radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Peticiones por estado">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={petPie.length?petPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} innerRadius={40} paddingAngle={2}>
                          {petPie.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip/><Legend wrapperStyle={{fontSize:11,color:'#64748b'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Panel title="Peticiones por área">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={petPorArea} barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                        <Bar dataKey="value" name="Peticiones" radius={[4,4,0,0]}>
                          {petPorArea.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Evolución de peticiones">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={peticionesPorMes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTooltip/>}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b',paddingTop:8}}/>
                        <Line type="monotone" dataKey="total"     name="Total"     stroke={PALETTE.indigo} strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.indigo,strokeWidth:0}}/>
                        <Line type="monotone" dataKey="aprobadas" name="Aprobadas" stroke={PALETTE.green}  strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.green,strokeWidth:0}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </Panel>
                </div>
                <Panel title="Registro de peticiones del período">
                  <DataTable
                    heads={['Número','Material','Área','Solicitante','Estado','Fecha']}
                    rows={peticionesLog.map((p:any)=>[
                      <span key="n" className="font-mono text-xs text-slate-400">{p.numero}</span>,
                      <span key="m" className="font-medium">{p.nombreArticulo}</span>,
                      <Badge key="a" label={p.areaOrigen||'—'} variant="indigo"/>,
                      p.solicitante?`${p.solicitante.nombre} ${p.solicitante.apellidos}`:'—',
                      <Badge key="s" label={p.estado} variant={estadoBadge(p.estado)}/>,
                      fmtDate(p.fechaSolicitud),
                    ])}
                    empty="Sin peticiones en este período"
                  />
                </Panel>
              </div>
            )}

            {tab==='vehiculos' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Total flota" value={fmtNum(vehiculos.length)} icon={Truck} color="indigo"/>
                  <KpiCard label="Disponibles" value={fmtNum(vehiculos.filter((v:any)=>v.estado==='disponible').length)} icon={CheckCircle2} color="green"/>
                  <KpiCard label="En servicio" value={fmtNum(vehiculos.filter((v:any)=>v.estado==='en_servicio').length)} icon={Activity} color="amber"/>
                  <KpiCard label="En mantenimiento" value={fmtNum(vehiculos.filter((v:any)=>['mantenimiento','en_taller'].includes(v.estado)).length)} icon={Wrench} color="red"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Panel title="Estado de la flota">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={vehPie.length?vehPie:[{name:'Sin datos',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} innerRadius={45} paddingAngle={3}>
                          {vehPie.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip/><Legend wrapperStyle={{fontSize:11,color:'#64748b'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Mantenimientos — cantidad y coste" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={mantPorMes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="left" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v:number)=>fmtEur(v)}/>
                        <Tooltip content={<ChartTooltip formatter={(name:string,val:any)=>name==='Coste (€)'?[fmtEur(val),name]:[`${val}`,name]}/>}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b',paddingTop:8}}/>
                        <Bar yAxisId="left" dataKey="total" name="Nº trabajos" fill={PALETTE.indigo} radius={[4,4,0,0]} barSize={16}/>
                        <Line yAxisId="right" type="monotone" dataKey="coste" name="Coste (€)" stroke={PALETTE.red} strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.red,strokeWidth:0}}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Panel>
                </div>
                <Panel title="Ficha de flota">
                  <DataTable
                    heads={['Indicativo','Matrícula','Marca / Modelo','Km actuales','Mantenimientos','Coste total','Estado']}
                    rows={vehiculos.map((v:any)=>[
                      <span key="i" className="font-black text-indigo-700 text-sm">{v.indicativo}</span>,
                      <span key="m" className="font-mono text-xs">{v.matricula}</span>,
                      `${v.marca} ${v.modelo}`,
                      v.kmActual>0?<span key="km" className="font-medium">{fmtKm(v.kmActual)}</span>:'—',
                      <span key="mt" className="font-bold">{v.mantenimientos||0}</span>,
                      v.costeMant>0?<span key="c" className="font-semibold text-red-600">{fmtEur(v.costeMant)}</span>:'—',
                      <Badge key="s" label={v.estado} variant={estadoBadge(v.estado)}/>,
                    ])}
                    empty="Sin vehículos registrados"
                  />
                </Panel>
              </div>
            )}

            {tab==='economico' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Importe dietas" value={fmtEur(resumen.totalDietas||0)} icon={FileText} color="indigo" sub={`Año ${year}`}/>
                  <KpiCard label="Km desplazamiento" value={fmtKm(resumen.totalKm||0)} icon={MapPin} color="blue"/>
                  <KpiCard label="Ingresos caja" value={fmtEur(resumen.ingresos||0)} icon={TrendingUp} color="green"/>
                  <KpiCard label="Gastos caja" value={fmtEur(resumen.gastos||0)} icon={ArrowUpDown} color="red"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KpiCard label="Saldo neto" value={fmtEur(resumen.saldo||0)} icon={Gauge} color={(resumen.saldo||0)>=0?'green':'red'} sub="Ingresos – Gastos"/>
                  <KpiCard label="Días de servicio con dieta" value={fmtNum((data.diasServicio||[]).length||0)} icon={Calendar} color="amber" sub="Registros con dieta generada"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Panel title="Evolución de dietas por mes">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={dietasPorMes}>
                        <defs>
                          <linearGradient id="gradDietas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PALETTE.green} stopOpacity={0.2}/>
                            <stop offset="100%" stopColor={PALETTE.green} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v:number)=>fmtEur(v)}/>
                        <Tooltip content={<ChartTooltip/>}/>
                        <Area type="monotone" dataKey="importe" name="Dietas (€)" stroke={PALETTE.green} fill="url(#gradDietas)" strokeWidth={2.5} dot={{r:3.5,fill:PALETTE.green,strokeWidth:0}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Ingresos vs Gastos por mes">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={cajaPorMes} barSize={14} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v:number)=>fmtEur(v)}/>
                        <Tooltip content={<ChartTooltip formatter={(name:string,val:any)=>[fmtEur(val),name]}/>}/>
                        <Legend wrapperStyle={{fontSize:11,color:'#64748b',paddingTop:8}}/>
                        <Bar dataKey="ingresos" name="Ingresos" fill={PALETTE.green} radius={[3,3,0,0]}/>
                        <Bar dataKey="gastos"   name="Gastos"   fill={PALETTE.red}   radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>
                </div>
                {partidas.length>0 && (
                  <Panel title="Ejecución presupuestaria por partida">
                    <div className="space-y-4">
                      {partidas.map((p:any)=>(
                        <ProgressBar key={p.id} label={`${p.codigo?`[${p.codigo}] `:''}${p.nombre}`} value={Number(p.importeEjecutado)||0} max={Number(p.importeAprobado)||1}/>
                      ))}
                    </div>
                  </Panel>
                )}
                <Panel title="Dietas por voluntario">
                  <DataTable
                    heads={['Voluntario','Área','Días de servicio','Km totales','Importe dietas']}
                    rows={statsVoluntarios.filter((v:any)=>v.importeDietas>0).map((v:any)=>[
                      `${v.nombre} ${v.apellidos}`.trim(),
                      <Badge key="a" label={v.area} variant="indigo"/>,
                      <span key="d" className="font-bold">{v.diasServicio}</span>,
                      v.km>0?<span key="km">{fmtKm(v.km)}</span>:'—',
                      <span key="i" className="font-bold text-green-700">{fmtEur(v.importeDietas)}</span>,
                    ])}
                    empty="Sin dietas registradas en este período"
                  />
                </Panel>
                <Panel title="Movimientos de caja">
                  <DataTable
                    heads={['Fecha','Concepto','Tipo','Importe']}
                    rows={movimientosCaja.map((m:any)=>[
                      fmtDate(m.fecha),
                      <span key="c" className="font-medium">{m.concepto||m.descripcion||'—'}</span>,
                      <Badge key="t" label={m.tipo} variant={m.tipo==='ingreso'?'green':'red'}/>,
                      <span key="i" className={`font-bold text-sm ${m.tipo==='ingreso'?'text-green-700':'text-red-600'}`}>
                        {m.tipo==='ingreso'?'+':'−'}{fmtEur(Math.abs(Number(m.importe||0)))}
                      </span>,
                    ])}
                    empty="Sin movimientos de caja en este período"
                  />
                </Panel>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
