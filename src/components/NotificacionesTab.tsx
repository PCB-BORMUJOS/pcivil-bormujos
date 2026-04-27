'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Mail, Send, Archive, ArchiveRestore, Plus, Users, User,
  MessageSquare, X, AlertTriangle, CheckCircle, Info, Package,
  Clock, Zap, ChevronDown
} from 'lucide-react'

interface MensajeItem {
  id: string; asunto: string; contenido: string; tipo: string; prioridad: string
  leido: boolean; leidoEn?: string; archivado: boolean; createdAt: string
  destinatarioGrupo?: string
  remitente: { id: string; nombre: string; apellidos: string; avatar?: string }
  destinatario?: { id: string; nombre: string; apellidos: string }
  respuestas?: { id: string }[]
}
interface Notificacion { id: string; tipo: string; titulo: string; mensaje: string; leida: boolean; createdAt: string }
interface UsuarioDest { id: string; nombre: string; apellidos: string; numeroVoluntario?: string; rol: { nombre: string } }
interface Grupo { value: string; label: string; tipo: string }
interface Props { initialSubTab?: 'mensajes' | 'sistema' }

const AVATAR_COLORS = [
  'bg-rose-500','bg-orange-500','bg-amber-500','bg-emerald-500',
  'bg-teal-500','bg-cyan-500','bg-blue-500','bg-violet-500','bg-fuchsia-500'
]
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(n: string, a: string) { return `${n[0]||''}${a[0]||''}`.toUpperCase() }
function fmtFecha(d: string) {
  const date = new Date(d), now = new Date()
  const diff = Math.floor((now.getTime()-date.getTime())/(1000*60*60*24))
  if (diff===0) return date.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})
  if (diff===1) return 'Ayer'
  if (diff<7) return date.toLocaleDateString('es-ES',{weekday:'long'})
  return date.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})
}
function fmtFechaHora(d: string) {
  return new Date(d).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}
const PRIO: Record<string,{label:string;cls:string;dot:string}> = {
  urgente:{label:'Urgente',cls:'bg-red-50 text-red-600 border border-red-200',dot:'bg-red-500'},
  alta:   {label:'Alta',   cls:'bg-orange-50 text-orange-600 border border-orange-200',dot:'bg-orange-500'},
  baja:   {label:'Baja',   cls:'bg-slate-100 text-slate-500 border border-slate-200',dot:'bg-slate-400'},
  normal: {label:'',       cls:'',dot:''},
}
const NOTIF_ICON: Record<string,{Icon:any;cls:string}> = {
  mensaje:    {Icon:MessageSquare, cls:'bg-blue-100 text-blue-600'},
  alerta:     {Icon:AlertTriangle, cls:'bg-amber-100 text-amber-600'},
  exito:      {Icon:CheckCircle,   cls:'bg-emerald-100 text-emerald-600'},
  peticion:   {Icon:Package,       cls:'bg-violet-100 text-violet-600'},
  default:    {Icon:Info,          cls:'bg-slate-100 text-slate-500'},
}

export default function NotificacionesTab({ initialSubTab='mensajes' }: Props) {
  type SubTab = 'recibidos'|'enviados'|'archivados'|'sistema'
  const [tab, setTab] = useState<SubTab>('recibidos')
  const [mensajes, setMensajes] = useState<MensajeItem[]>([])
  const [hilo, setHilo] = useState<MensajeItem[]>([])
  const [seleccionado, setSeleccionado] = useState<MensajeItem|null>(null)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHilo, setLoadingHilo] = useState(false)
  const [noLeidos, setNoLeidos] = useState(0)
  const [noLeidosSistema, setNoLeidosSistema] = useState(0)
  const [usuarioActualId, setUsuarioActualId] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [enviandoResp, setEnviandoResp] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)
  const [tipoDest, setTipoDest] = useState<'individual'|'grupo'>('individual')
  const [destId, setDestId] = useState('')
  const [destGrupo, setDestGrupo] = useState('')
  const [asunto, setAsunto] = useState('')
  const [contenido, setContenido] = useState('')
  const [prioridad, setPrioridad] = useState('normal')
  const [enviandoNuevo, setEnviandoNuevo] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioDest[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])

  const cargarMensajes = useCallback(async (t: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/mensajes?tipo=${t}`)
      if (r.ok) {
        const d = await r.json()
        setMensajes(d.mensajes||[])
        if (t==='recibidos') { setNoLeidos(d.noLeidos||0); setUsuarioActualId(d.usuarioActualId||'') }
      }
    } finally { setLoading(false) }
  }, [])

  const cargarNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notificaciones?limite=50')
      if (r.ok) {
        const d = await r.json()
        setNotifs(d.notificaciones||[])
        setNoLeidosSistema(d.notificaciones?.filter((n:Notificacion)=>!n.leida).length||0)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    setSeleccionado(null); setHilo([])
    if (tab==='sistema') cargarNotifs(); else cargarMensajes(tab)
  }, [tab])

  const abrirMensaje = async (m: MensajeItem) => {
    setSeleccionado(m); setLoadingHilo(true); setRespuesta('')
    try {
      if (!m.leido && tab==='recibidos') {
        fetch('/api/mensajes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensajeId:m.id,accion:'marcarLeido'})})
        setMensajes(p=>p.map(x=>x.id===m.id?{...x,leido:true}:x))
        setNoLeidos(p=>Math.max(0,p-1))
      }
      const r = await fetch(`/api/mensajes?tipo=hilo&mensajeId=${m.id}`)
      if (r.ok) { const d=await r.json(); setHilo(d.hilo||[m]) }
      else setHilo([m])
    } finally { setLoadingHilo(false) }
  }

  const enviarRespuesta = async () => {
    if (!respuesta.trim()||!hilo.length) return
    setEnviandoResp(true)
    try {
      const root = hilo[0]
      const destino = root.remitente.id===usuarioActualId ? root.destinatario?.id : root.remitente.id
      const body: any = { asunto:`RE: ${root.asunto}`, contenido:respuesta, mensajePadreId:root.id }
      if (root.destinatarioGrupo) body.destinatarioGrupo = root.destinatarioGrupo
      else if (destino) body.destinatarioId = destino
      const r = await fetch('/api/mensajes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if (r.ok) {
        setRespuesta('')
        const rh = await fetch(`/api/mensajes?tipo=hilo&mensajeId=${root.id}`)
        if (rh.ok) { const d=await rh.json(); setHilo(d.hilo||[]) }
        cargarMensajes(tab)
      }
    } finally { setEnviandoResp(false) }
  }

  const archivar = async (id: string, desarchivar=false) => {
    await fetch('/api/mensajes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensajeId:id,accion:desarchivar?'desarchivar':'archivar'})})
    setMensajes(p=>p.filter(m=>m.id!==id))
    if (seleccionado?.id===id) { setSeleccionado(null); setHilo([]) }
  }

  const enviarNuevo = async () => {
    if (!asunto.trim()||!contenido.trim()) return
    if (tipoDest==='individual'&&!destId) return
    if (tipoDest==='grupo'&&!destGrupo) return
    setEnviandoNuevo(true)
    try {
      const body: any = { asunto, contenido, prioridad }
      if (tipoDest==='individual') body.destinatarioId=destId; else body.destinatarioGrupo=destGrupo
      const r = await fetch('/api/mensajes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if (r.ok) {
        setShowNuevo(false); setAsunto(''); setContenido(''); setDestId(''); setDestGrupo('')
        setTab('enviados')
      }
    } finally { setEnviandoNuevo(false) }
  }

  const abrirNuevo = async () => {
    const r = await fetch('/api/mensajes/destinatarios')
    if (r.ok) { const d=await r.json(); setUsuarios(d.usuarios||[]); setGrupos(d.grupos||[]) }
    setShowNuevo(true)
  }

  const TABS = [
    {key:'recibidos' as SubTab, label:'Recibidos', Icon:Mail, badge:noLeidos},
    {key:'enviados' as SubTab, label:'Enviados', Icon:Send},
    {key:'archivados' as SubTab, label:'Archivados', Icon:Archive},
    {key:'sistema' as SubTab, label:'Sistema', Icon:Bell, badge:noLeidosSistema},
  ]

  const grupoLabel = (g: string) => {
    if (g==='todos') return 'Todos'
    if (g.startsWith('area:')) return g.replace('area:','').replace(/\b\w/g,c=>c.toUpperCase())
    if (g.startsWith('rol:')) return g.replace('rol:','').replace(/\b\w/g,c=>c.toUpperCase())
    return g
  }

  const renderItem = (m: MensajeItem) => {
    const sel = seleccionado?.id===m.id
    const unread = !m.leido && tab==='recibidos'
    const tieneResp = (m.respuestas?.length||0)>0
    const color = avatarColor(m.remitente.nombre+m.remitente.apellidos)
    const prio = PRIO[m.prioridad]||PRIO.normal
    return (
      <div key={m.id} onClick={()=>abrirMensaje(m)}
        className={`relative px-4 py-3.5 cursor-pointer transition-all border-b border-slate-100 group
          ${sel ? 'bg-orange-50' : unread ? 'bg-white hover:bg-slate-50' : 'bg-white hover:bg-slate-50/60'}`}>
        {sel && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500 rounded-r"/>}
        {unread && !sel && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400 rounded-r"/>}
        <div className="flex gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ${color}`}>
            {initials(m.remitente.nombre,m.remitente.apellidos)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1 mb-0.5">
              <span className={`text-sm truncate ${unread?'font-semibold text-slate-900':'font-medium text-slate-600'}`}>
                {m.remitente.nombre} {m.remitente.apellidos}
              </span>
              <span className="text-[11px] text-slate-400 flex-shrink-0 tabular-nums">{fmtFecha(m.createdAt)}</span>
            </div>
            <p className={`text-xs truncate mb-1.5 ${unread?'font-medium text-slate-700':'text-slate-500'}`}>{m.asunto}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {m.destinatarioGrupo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                  <Users size={8}/>{grupoLabel(m.destinatarioGrupo)}
                </span>
              )}
              {prio.label && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${prio.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`}/>
                  {prio.label}
                </span>
              )}
              {tieneResp && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <MessageSquare size={9}/>{m.respuestas!.length}
                </span>
              )}
            </div>
          </div>
          {unread && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 shadow-sm"/>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      style={{height:'calc(100vh - 260px)',minHeight:'520px'}}>

      {/* Top bar */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-4 h-12 flex-shrink-0">
        <div className="flex gap-1">
          {TABS.map(({key,label,Icon,badge})=>(
            <button key={key} onClick={()=>setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                ${tab===key
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}>
              <Icon size={13}/>
              {label}
              {badge && badge>0 ? (
                <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none
                  ${tab===key?'bg-orange-500 text-white':'bg-slate-300 text-slate-600'}`}>
                  {badge>9?'9+':badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button onClick={abrirNuevo}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 active:scale-95 transition-all shadow-sm">
          <Plus size={13}/> Nuevo mensaje
        </button>
      </div>

      {/* Sistema */}
      {tab==='sistema' ? (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : notifs.length===0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Bell size={36} className="mb-3 opacity-20"/>
              <p className="text-sm font-medium">Sin notificaciones del sistema</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifs.map(n=>{
                const ni = NOTIF_ICON[n.tipo]||NOTIF_ICON.default
                return (
                  <div key={n.id} className={`flex gap-3 p-3.5 rounded-xl border transition-all
                    ${n.leida?'bg-white border-slate-100':'bg-blue-50/50 border-blue-100'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ni.cls}`}>
                      <ni.Icon size={14}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${n.leida?'text-slate-600':'font-semibold text-slate-800'}`}>{n.titulo}</p>
                        <span className="text-[11px] text-slate-400 flex-shrink-0 whitespace-nowrap">{fmtFecha(n.createdAt)}</span>
                      </div>
                      {n.mensaje && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.mensaje}</p>}
                    </div>
                    {!n.leida && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"/>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2-panel mensajes */
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Panel izquierdo — lista */}
          <div className="w-72 border-r border-slate-200 flex flex-col overflow-hidden flex-shrink-0 bg-slate-50/40">
            {/* Cabecera lista */}
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {tab==='recibidos'?`${mensajes.length} conversaciones`
                  :tab==='enviados'?'Enviados'
                  :tab==='archivados'?'Archivados':''}
              </span>
              {tab==='recibidos' && noLeidos>0 && (
                <span className="text-[11px] font-semibold text-orange-600">{noLeidos} sin leer</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : mensajes.length===0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6 text-center">
                  {tab==='archivados' ? <Archive size={28} className="mb-2 opacity-20"/> : <Mail size={28} className="mb-2 opacity-20"/>}
                  <p className="text-sm">{tab==='archivados'?'No hay mensajes archivados':'No hay mensajes'}</p>
                </div>
              ) : mensajes.map(renderItem)}
            </div>
          </div>

          {/* Panel derecho — conversación */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
            {!seleccionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 select-none">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="opacity-40"/>
                </div>
                <p className="text-sm font-medium text-slate-400">Selecciona una conversación</p>
                <p className="text-xs text-slate-300 mt-1">Los mensajes aparecerán aquí</p>
              </div>
            ) : loadingHilo ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Header conversación */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">
                      {hilo[0]?.asunto || seleccionado.asunto}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {hilo[0]?.destinatarioGrupo && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
                          <Users size={9}/>{grupoLabel(hilo[0].destinatarioGrupo)}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {hilo.length} {hilo.length===1?'mensaje':'mensajes'} · {fmtFechaHora(hilo[0]?.createdAt||seleccionado.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {tab!=='archivados' ? (
                      <button onClick={()=>archivar(seleccionado.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                        <Archive size={13}/>Archivar
                      </button>
                    ) : (
                      <button onClick={()=>archivar(seleccionado.id,true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                        <ArchiveRestore size={13}/>Desarchivar
                      </button>
                    )}
                  </div>
                </div>

                {/* Burbuja de mensajes */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                  {hilo.map((m,i)=>{
                    const esMio = m.remitente.id===usuarioActualId
                    const color = avatarColor(m.remitente.nombre+m.remitente.apellidos)
                    const esRespuesta = i > 0
                    return (
                      <div key={m.id} className={`flex gap-3 ${esMio?'flex-row-reverse':''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ${color}`}>
                          {initials(m.remitente.nombre,m.remitente.apellidos)}
                        </div>
                        <div className={`flex flex-col max-w-[75%] ${esMio?'items-end':''}`}>
                          <div className={`flex items-center gap-2 mb-1 ${esMio?'flex-row-reverse':''}`}>
                            <span className="text-xs font-semibold text-slate-700">
                              {esMio?'Tú':`${m.remitente.nombre} ${m.remitente.apellidos}`}
                            </span>
                            {esRespuesta && (
                              <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-medium">respuesta</span>
                            )}
                            <span className="text-[11px] text-slate-400">{fmtFechaHora(m.createdAt)}</span>
                          </div>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                            ${esMio
                              ? 'bg-orange-500 text-white rounded-tr-sm'
                              : 'bg-slate-100 text-slate-700 rounded-tl-sm border border-slate-200'}`}>
                            {m.contenido}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Caja respuesta */}
                {tab!=='archivados' && (
                  <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
                    <div className="flex gap-2.5 items-end">
                      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                        <textarea
                          value={respuesta} onChange={e=>setRespuesta(e.target.value)}
                          placeholder="Escribe tu respuesta…" rows={3}
                          className="w-full px-3.5 pt-3 pb-1 text-sm resize-none bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
                          onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) enviarRespuesta() }}
                        />
                        <div className="px-3 pb-2 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Ctrl+Enter para enviar</span>
                          <span className="text-[11px] text-slate-400">{respuesta.length} car.</span>
                        </div>
                      </div>
                      <button onClick={enviarRespuesta} disabled={!respuesta.trim()||enviandoResp}
                        className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm flex-shrink-0">
                        {enviandoResp
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                          : <Send size={15}/>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nuevo Mensaje */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Nuevo mensaje</h2>
                <p className="text-xs text-slate-400 mt-0.5">Envía un mensaje individual o a un grupo</p>
              </div>
              <button onClick={()=>setShowNuevo(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={16}/>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Tipo destinatario */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Destinatario</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  {(['individual','grupo'] as const).map(t=>(
                    <button key={t} onClick={()=>setTipoDest(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all
                        ${tipoDest===t?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                      {t==='individual'?<User size={12}/>:<Users size={12}/>}
                      {t==='individual'?'Individual':'Grupo / Área'}
                    </button>
                  ))}
                </div>
              </div>

              {tipoDest==='individual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Voluntario *</label>
                  <select value={destId} onChange={e=>setDestId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
                    <option value="">Seleccionar voluntario…</option>
                    {usuarios.map(u=>(
                      <option key={u.id} value={u.id}>{u.numeroVoluntario?`${u.numeroVoluntario} · `:''}{u.nombre} {u.apellidos}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Grupo o Área *</label>
                  <select value={destGrupo} onChange={e=>setDestGrupo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
                    <option value="">Seleccionar…</option>
                    {grupos.filter(g=>g.tipo!=='area').length>0 && (
                      <optgroup label="── Grupos">
                        {grupos.filter(g=>g.tipo!=='area').map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
                      </optgroup>
                    )}
                    {grupos.filter(g=>g.tipo==='area').length>0 && (
                      <optgroup label="── Áreas operativas">
                        {grupos.filter(g=>g.tipo==='area').map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Asunto *</label>
                <input type="text" value={asunto} onChange={e=>setAsunto(e.target.value)} placeholder="Escribe el asunto…"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Prioridad</label>
                <div className="flex gap-2">
                  {(['baja','normal','alta','urgente'] as const).map(p=>{
                    const pr = PRIO[p]
                    return (
                      <button key={p} onClick={()=>setPrioridad(p)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all
                          ${prioridad===p ? (p==='urgente'?'bg-red-500 text-white border-red-500':p==='alta'?'bg-orange-500 text-white border-orange-500':p==='baja'?'bg-slate-400 text-white border-slate-400':'bg-blue-500 text-white border-blue-500') : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                        {p.charAt(0).toUpperCase()+p.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Mensaje *</label>
                <textarea value={contenido} onChange={e=>setContenido(e.target.value)}
                  placeholder="Escribe tu mensaje aquí…" rows={5}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all leading-relaxed"/>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button onClick={()=>setShowNuevo(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button onClick={enviarNuevo}
                disabled={enviandoNuevo||!asunto.trim()||!contenido.trim()||(tipoDest==='individual'&&!destId)||(tipoDest==='grupo'&&!destGrupo)}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95">
                {enviandoNuevo
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Enviando…</>
                  : <><Send size={14}/>Enviar mensaje</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
