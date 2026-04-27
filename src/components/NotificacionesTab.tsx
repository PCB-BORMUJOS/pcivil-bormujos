'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bell, Mail, Send, Reply, Archive, ArchiveRestore, Plus, CheckCheck, RefreshCw, Users, User, MessageSquare, X, AlertTriangle, Package, ChevronRight } from 'lucide-react'

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

function initials(n: string, a: string) { return `${n[0]||''}${a[0]||''}`.toUpperCase() }
function fmtFecha(d: string) {
  const date = new Date(d), now = new Date()
  const diff = Math.floor((now.getTime()-date.getTime())/(1000*60*60*24))
  if (diff===0) return date.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})
  if (diff===1) return 'Ayer'
  if (diff<7) return date.toLocaleDateString('es-ES',{weekday:'short'})
  return date.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})
}
function prioColor(p: string) {
  return p==='urgente'?'bg-red-100 text-red-700':p==='alta'?'bg-orange-100 text-orange-700':p==='baja'?'bg-slate-100 text-slate-500':'bg-blue-50 text-blue-600'
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
  // Reply
  const [respuesta, setRespuesta] = useState('')
  const [enviandoResp, setEnviandoResp] = useState(false)
  // Nuevo mensaje
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

  const renderItem = (m: MensajeItem) => {
    const sel = seleccionado?.id===m.id
    const unread = !m.leido&&tab==='recibidos'
    const tieneResp = (m.respuestas?.length||0)>0
    return (
      <div key={m.id} onClick={()=>abrirMensaje(m)}
        className={`p-3 border-b cursor-pointer transition-all ${sel?'bg-orange-50 border-l-2 border-l-orange-500':unread?'bg-blue-50/40 hover:bg-blue-50':'hover:bg-slate-50'}`}>
        <div className="flex gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${unread?'bg-orange-500 text-white':'bg-slate-200 text-slate-600'}`}>
            {initials(m.remitente.nombre,m.remitente.apellidos)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`text-sm truncate ${unread?'font-semibold text-slate-900':'font-medium text-slate-700'}`}>
                {m.remitente.nombre} {m.remitente.apellidos}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-1">{fmtFecha(m.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <p className={`text-xs truncate ${unread?'font-medium text-slate-800':'text-slate-500'}`}>{m.asunto}</p>
              {tieneResp&&<MessageSquare size={10} className="text-slate-400 flex-shrink-0"/>}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {m.destinatarioGrupo&&(
                <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  {m.destinatarioGrupo==='todos'?'Todos':m.destinatarioGrupo.replace('area:','').replace('rol:','').replace(/^\w/,c=>c.toUpperCase())}
                </span>
              )}
              {m.prioridad!=='normal'&&<span className={`text-xs px-1.5 py-0.5 rounded-full ${prioColor(m.prioridad)}`}>{m.prioridad}</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{height:'calc(100vh - 280px)',minHeight:'480px'}}>
      {/* Tabs + Nuevo */}
      <div className="flex items-center gap-0.5 border-b border-slate-200 px-1 pt-1 flex-wrap">
        {TABS.map(({key,label,Icon,badge})=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab===key?'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50':'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}>
            <Icon size={14}/>{label}
            {badge&&badge>0?<span className="bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">{badge>9?'9+':badge}</span>:null}
          </button>
        ))}
        <button onClick={abrirNuevo}
          className="ml-auto mr-1 mb-1 flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
          <Plus size={14}/> Nuevo
        </button>
      </div>

      {/* Sistema */}
      {tab==='sistema'?(
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading?<div className="text-center py-10 text-slate-400">Cargando...</div>
          :notifs.length===0?<div className="text-center py-10 text-slate-400">Sin notificaciones</div>
          :notifs.map(n=>(
            <div key={n.id} className={`p-3 rounded-lg border ${n.leida?'bg-white border-slate-200':'bg-blue-50 border-blue-200'}`}>
              <div className="flex gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.leida?'bg-slate-300':'bg-blue-500'}`}/>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{n.titulo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.mensaje}</p>
                  <p className="text-xs text-slate-400 mt-1">{fmtFecha(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ):(
        /* 2-panel mensajes */
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Lista */}
          <div className="w-72 border-r border-slate-200 flex flex-col overflow-y-auto flex-shrink-0">
            {loading?<div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>
            :mensajes.length===0?<div className="text-center py-10 text-slate-400 text-sm">
              {tab==='archivados'?'No hay mensajes archivados':'No hay mensajes'}
            </div>
            :mensajes.map(renderItem)}
          </div>

          {/* Hilo / detalle */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {!seleccionado?(
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center"><MessageSquare size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm">Selecciona un mensaje para ver la conversación</p></div>
              </div>
            ):loadingHilo?(
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Cargando conversación...</div>
            ):(
              <div className="flex flex-col h-full">
                {/* Header hilo */}
                <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight">{hilo[0]?.asunto||seleccionado.asunto}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {hilo[0]?.destinatarioGrupo&&(
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users size={10}/>{hilo[0].destinatarioGrupo==='todos'?'Todos':hilo[0].destinatarioGrupo.replace('area:','Área: ').replace('rol:','Rol: ')}
                        </span>
                      )}
                      {hilo.length>1&&<span className="text-xs text-slate-400">{hilo.length} mensajes</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {tab!=='archivados'?(
                      <button onClick={()=>archivar(seleccionado.id)} title="Archivar"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                        <Archive size={15}/>
                      </button>
                    ):(
                      <button onClick={()=>archivar(seleccionado.id,true)} title="Desarchivar"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                        <ArchiveRestore size={15}/>
                      </button>
                    )}
                  </div>
                </div>

                {/* Mensajes del hilo */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {hilo.map((m,i)=>(
                    <div key={m.id} className={`flex gap-3 ${i>0?'pl-6 border-l-2 border-slate-100':''}`}>
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold flex-shrink-0 text-slate-600">
                        {initials(m.remitente.nombre,m.remitente.apellidos)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{m.remitente.nombre} {m.remitente.apellidos}</span>
                          {i>0&&<span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Respuesta</span>}
                          <span className="text-xs text-slate-400 ml-auto">{fmtFecha(m.createdAt)}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {m.contenido}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Caja respuesta */}
                {tab!=='archivados'&&(
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2 items-end">
                      <textarea value={respuesta} onChange={e=>setRespuesta(e.target.value)}
                        placeholder="Escribe tu respuesta..." rows={3}
                        className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                        onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) enviarRespuesta() }}
                      />
                      <button onClick={enviarRespuesta} disabled={!respuesta.trim()||enviandoResp}
                        className="px-3 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <Send size={15}/>
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Ctrl+Enter para enviar</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nuevo Mensaje */}
      {showNuevo&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 bg-orange-500 rounded-t-xl">
              <h2 className="text-white font-bold text-lg">Nuevo Mensaje</h2>
              <button onClick={()=>setShowNuevo(false)} className="text-white/80 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ENVIAR A</label>
                <div className="flex gap-2">
                  {(['individual','grupo'] as const).map(t=>(
                    <button key={t} onClick={()=>setTipoDest(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tipoDest===t?'bg-orange-500 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {t==='individual'?<User size={14}/>:<Users size={14}/>}
                      {t==='individual'?'Individual':'Grupo'}
                    </button>
                  ))}
                </div>
              </div>

              {tipoDest==='individual'?(
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">DESTINATARIO *</label>
                  <select value={destId} onChange={e=>setDestId(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                    <option value="">Seleccionar voluntario...</option>
                    {usuarios.map(u=>(
                      <option key={u.id} value={u.id}>{u.numeroVoluntario?`${u.numeroVoluntario} — `:''}{u.nombre} {u.apellidos}</option>
                    ))}
                  </select>
                </div>
              ):(
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">GRUPO / ÁREA *</label>
                  <select value={destGrupo} onChange={e=>setDestGrupo(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                    <option value="">Seleccionar grupo...</option>
                    {grupos.filter(g=>g.tipo!=='area').length>0&&<optgroup label="— Grupos">
                      {grupos.filter(g=>g.tipo!=='area').map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
                    </optgroup>}
                    {grupos.filter(g=>g.tipo==='area').length>0&&<optgroup label="— Áreas">
                      {grupos.filter(g=>g.tipo==='area').map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
                    </optgroup>}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ASUNTO *</label>
                <input type="text" value={asunto} onChange={e=>setAsunto(e.target.value)} placeholder="Asunto del mensaje"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">PRIORIDAD</label>
                <select value={prioridad} onChange={e=>setPrioridad(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">MENSAJE *</label>
                <textarea value={contenido} onChange={e=>setContenido(e.target.value)} placeholder="Escribe tu mensaje..." rows={5}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"/>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={()=>setShowNuevo(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={enviarNuevo}
                disabled={enviandoNuevo||!asunto.trim()||!contenido.trim()||(tipoDest==='individual'&&!destId)||(tipoDest==='grupo'&&!destGrupo)}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                <Send size={14}/>{enviandoNuevo?'Enviando...':'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
