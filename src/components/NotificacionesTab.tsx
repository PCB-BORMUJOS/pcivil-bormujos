'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bell, Mail, Send, Archive, ArchiveRestore, Plus, Users, User,
  MessageSquare, X, AlertTriangle, CheckCircle, Info, Package,
  ChevronLeft, CheckCheck, Trash2,
} from 'lucide-react'

interface MensajeItem {
  id: string; asunto: string; contenido: string; tipo: string; prioridad: string
  leido: boolean; leidoEn?: string; archivado: boolean; createdAt: string
  destinatarioGrupo?: string
  remitente: { id: string; nombre: string; apellidos: string; avatar?: string }
  destinatario?: { id: string; nombre: string; apellidos: string }
  respuestas?: { id: string }[]
}
interface Notificacion { id: string; tipo: string; titulo: string; mensaje: string; enlace?: string; leida: boolean; createdAt: string }
interface UsuarioDest { id: string; nombre: string; apellidos: string; numeroVoluntario?: string; rol: { nombre: string } }
interface Grupo { value: string; label: string; tipo: string }
interface Props { initialSubTab?: 'mensajes' | 'sistema' | 'recibidos'; initialMensajeId?: string }

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-violet-500', 'bg-fuchsia-500',
]
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(n: string, a: string) { return `${n[0] || ''}${a[0] || ''}`.toUpperCase() }
function fmtFecha(d: string) {
  const date = new Date(d), now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Ayer'
  if (diff < 7) return date.toLocaleDateString('es-ES', { weekday: 'short' })
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
function fmtFechaHora(d: string) {
  return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const PRIO: Record<string, { label: string; cls: string; dot: string }> = {
  urgente: { label: 'Urgente', cls: 'bg-red-50 text-red-600 border border-red-200', dot: 'bg-red-500' },
  alta:    { label: 'Alta',    cls: 'bg-orange-50 text-orange-600 border border-orange-200', dot: 'bg-orange-500' },
  baja:    { label: 'Baja',   cls: 'bg-slate-100 text-slate-500 border border-slate-200', dot: 'bg-slate-400' },
  normal:  { label: '',       cls: '', dot: '' },
}
const NOTIF_ICON: Record<string, { Icon: any; cls: string }> = {
  mensaje:  { Icon: MessageSquare, cls: 'bg-blue-100 text-blue-600' },
  alerta:   { Icon: AlertTriangle, cls: 'bg-amber-100 text-amber-600' },
  exito:    { Icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-600' },
  peticion: { Icon: Package,       cls: 'bg-violet-100 text-violet-600' },
  default:  { Icon: Info,          cls: 'bg-slate-100 text-slate-500' },
}

export default function NotificacionesTab({ initialSubTab = 'mensajes', initialMensajeId }: Props) {
  type SubTab = 'recibidos' | 'enviados' | 'archivados' | 'sistema'
  const [tab, setTab] = useState<SubTab>(initialSubTab === 'sistema' ? 'sistema' : 'recibidos')
  const [mensajes, setMensajes] = useState<MensajeItem[]>([])
  const [hilo, setHilo] = useState<MensajeItem[]>([])
  const [seleccionado, setSeleccionado] = useState<MensajeItem | null>(null)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHilo, setLoadingHilo] = useState(false)
  const [noLeidos, setNoLeidos] = useState(0)
  const [noLeidosSistema, setNoLeidosSistema] = useState(0)
  const [usuarioActualId, setUsuarioActualId] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [enviandoResp, setEnviandoResp] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)
  const [tipoDest, setTipoDest] = useState<'individual' | 'grupo'>('individual')
  const [destId, setDestId] = useState('')
  const [destGrupo, setDestGrupo] = useState('')
  const [asunto, setAsunto] = useState('')
  const [contenido, setContenido] = useState('')
  const [prioridad, setPrioridad] = useState('normal')
  const [enviandoNuevo, setEnviandoNuevo] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioDest[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  // Mobile: panel único — 'lista' muestra el listado, 'conversacion' la vista de hilo
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'conversacion'>('lista')

  const hiloEndRef = useRef<HTMLDivElement>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cargarMensajes = useCallback(async (t: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/mensajes?tipo=${t}`)
      if (r.ok) {
        const d = await r.json()
        setMensajes(d.mensajes || [])
        if (t === 'recibidos') { setNoLeidos(d.noLeidos || 0); setUsuarioActualId(d.usuarioActualId || '') }
      }
    } finally { setLoading(false) }
  }, [])

  const cargarNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notificaciones?limite=50')
      if (r.ok) {
        const d = await r.json()
        setNotifs(d.notificaciones || [])
        setNoLeidosSistema(d.notificaciones?.filter((n: Notificacion) => !n.leida).length || 0)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    setSeleccionado(null); setHilo([]); setVistaMovil('lista')
    if (tab === 'sistema') cargarNotifs(); else cargarMensajes(tab)
    if (refreshRef.current) clearInterval(refreshRef.current)
    if (tab === 'recibidos') {
      refreshRef.current = setInterval(() => cargarMensajes('recibidos'), 30000)
    } else if (tab === 'sistema') {
      refreshRef.current = setInterval(() => cargarNotifs(), 30000)
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [tab, cargarMensajes, cargarNotifs])

  // Auto-scroll al último mensaje cuando se carga el hilo
  useEffect(() => {
    if (hilo.length > 0) {
      setTimeout(() => hiloEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [hilo])

  const abrirMensaje = async (m: MensajeItem) => {
    setSeleccionado(m); setLoadingHilo(true); setRespuesta('')
    setVistaMovil('conversacion')
    try {
      if (!m.leido && tab === 'recibidos') {
        fetch('/api/mensajes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensajeId: m.id, accion: 'marcarLeido' }) })
        setMensajes(p => p.map(x => x.id === m.id ? { ...x, leido: true } : x))
        setNoLeidos(p => Math.max(0, p - 1))
      }
      const r = await fetch(`/api/mensajes?tipo=hilo&mensajeId=${m.id}`)
      if (r.ok) { const d = await r.json(); setHilo(d.hilo || [m]) }
      else setHilo([m])
    } finally { setLoadingHilo(false) }
  }

  const volverALista = () => { setSeleccionado(null); setHilo([]); setVistaMovil('lista') }

  // Auto-open message when arriving from a notification link
  useEffect(() => {
    if (!initialMensajeId || loading || tab !== 'recibidos') return
    const target = mensajes.find(m => m.id === initialMensajeId)
    if (target) abrirMensaje(target)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMensajeId, mensajes, loading])

  const enviarRespuesta = async () => {
    if (!respuesta.trim() || !hilo.length) return
    setEnviandoResp(true)
    try {
      const root = hilo[0]
      const destino = root.remitente.id === usuarioActualId ? root.destinatario?.id : root.remitente.id
      const body: any = { asunto: `RE: ${root.asunto}`, contenido: respuesta, mensajePadreId: root.id }
      if (root.destinatarioGrupo) body.destinatarioGrupo = root.destinatarioGrupo
      else if (destino) body.destinatarioId = destino
      const r = await fetch('/api/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) {
        setRespuesta('')
        const rh = await fetch(`/api/mensajes?tipo=hilo&mensajeId=${root.id}`)
        if (rh.ok) { const d = await rh.json(); setHilo(d.hilo || []) }
        cargarMensajes(tab)
      }
    } finally { setEnviandoResp(false) }
  }

  const archivar = async (id: string, desarchivar = false) => {
    await fetch('/api/mensajes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensajeId: id, accion: desarchivar ? 'desarchivar' : 'archivar' }) })
    setMensajes(p => p.filter(m => m.id !== id))
    if (seleccionado?.id === id) { volverALista() }
  }

  const leerTodasSistema = async () => {
    await fetch('/api/notificaciones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marcarTodas: true }) })
    setNotifs(p => p.map(n => ({ ...n, leida: true })))
    setNoLeidosSistema(0)
  }

  const borrarLeidasSistema = async () => {
    await fetch('/api/notificaciones', { method: 'DELETE' })
    setNotifs(p => p.filter(n => !n.leida))
  }

  const leerNotif = async (n: Notificacion) => {
    if (!n.leida) {
      fetch('/api/notificaciones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificacionId: n.id }) })
      setNotifs(p => p.map(x => x.id === n.id ? { ...x, leida: true } : x))
      setNoLeidosSistema(p => Math.max(0, p - 1))
    }
    if (n.tipo === 'mensaje' && n.enlace) {
      // Extract mensajeId from enlace and navigate within the component
      const url = new URL(n.enlace, window.location.origin)
      const mensajeId = url.searchParams.get('mensajeId')
      setTab('recibidos')
      if (mensajeId) {
        // cargarMensajes will run via the tab useEffect, then auto-open kicks in
        // We navigate to the recibidos view with the message pre-selected
        await cargarMensajes('recibidos')
        // find and open message directly
        const r = await fetch(`/api/mensajes?tipo=recibidos`)
        if (r.ok) {
          const d = await r.json()
          const target = (d.mensajes || []).find((m: MensajeItem) => m.id === mensajeId)
          if (target) { setMensajes(d.mensajes || []); abrirMensaje(target) }
        }
      }
    } else if (n.enlace) {
      window.location.href = n.enlace
    }
  }

  const marcarTodosLeidos = async () => {
    await fetch('/api/mensajes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'marcarTodosLeidos' }) })
    setMensajes(p => p.map(m => ({ ...m, leido: true })))
    setNoLeidos(0)
  }

  const enviarNuevo = async () => {
    if (!asunto.trim() || !contenido.trim()) return
    if (tipoDest === 'individual' && !destId) return
    if (tipoDest === 'grupo' && !destGrupo) return
    setEnviandoNuevo(true)
    try {
      const body: any = { asunto, contenido, prioridad }
      if (tipoDest === 'individual') body.destinatarioId = destId; else body.destinatarioGrupo = destGrupo
      const r = await fetch('/api/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) {
        setShowNuevo(false); setAsunto(''); setContenido(''); setDestId(''); setDestGrupo('')
        setTab('enviados')
      }
    } finally { setEnviandoNuevo(false) }
  }

  const abrirNuevo = async () => {
    const r = await fetch('/api/mensajes/destinatarios')
    if (r.ok) { const d = await r.json(); setUsuarios(d.usuarios || []); setGrupos(d.grupos || []) }
    setShowNuevo(true)
  }

  const grupoLabel = (g: string) => {
    if (g === 'todos') return 'Todos'
    if (g.startsWith('area:')) return g.replace('area:', '').replace(/\b\w/g, c => c.toUpperCase())
    if (g.startsWith('rol:')) return g.replace('rol:', '').replace(/\b\w/g, c => c.toUpperCase())
    return g
  }

  const TABS = [
    { key: 'recibidos' as SubTab, label: 'Recibidos', Icon: Mail, badge: noLeidos },
    { key: 'enviados' as SubTab, label: 'Enviados', Icon: Send },
    { key: 'archivados' as SubTab, label: 'Archivados', Icon: Archive },
    { key: 'sistema' as SubTab, label: 'Sistema', Icon: Bell, badge: noLeidosSistema },
  ]

  // ─── Item de la lista ────────────────────────────────────────────────────────
  const renderItem = (m: MensajeItem) => {
    const sel = seleccionado?.id === m.id
    const unread = !m.leido && tab === 'recibidos'
    const tieneResp = (m.respuestas?.length || 0) > 0
    const color = avatarColor(m.remitente.nombre + m.remitente.apellidos)
    const prio = PRIO[m.prioridad] || PRIO.normal
    return (
      <div key={m.id} onClick={() => abrirMensaje(m)}
        className={`relative px-4 py-4 cursor-pointer transition-colors border-b border-slate-100 active:bg-slate-100
          ${sel ? 'bg-orange-50' : 'bg-white hover:bg-slate-50/60'}`}>
        {sel && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500 rounded-r" />}
        {unread && !sel && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400 rounded-r" />}
        <div className="flex gap-3 items-start">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ${color}`}>
            {initials(m.remitente.nombre, m.remitente.apellidos)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className={`text-sm truncate ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>
                {m.remitente.nombre} {m.remitente.apellidos}
              </span>
              <span className="text-[11px] text-slate-400 flex-shrink-0 tabular-nums">{fmtFecha(m.createdAt)}</span>
            </div>
            <p className={`text-[13px] truncate mb-1.5 ${unread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>{m.asunto}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {m.destinatarioGrupo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                  <Users size={8} />{grupoLabel(m.destinatarioGrupo)}
                </span>
              )}
              {prio.label && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${prio.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />{prio.label}
                </span>
              )}
              {tieneResp && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <MessageSquare size={9} />{m.respuestas!.length}
                </span>
              )}
            </div>
          </div>
          {unread && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-sm" />}
        </div>
      </div>
    )
  }

  // ─── Panel de conversación (compartido mobile/desktop) ───────────────────────
  const renderConversacion = () => {
    if (!seleccionado) {
      return (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-300 select-none">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <MessageSquare size={28} className="opacity-40" />
          </div>
          <p className="text-sm font-medium text-slate-400">Selecciona una conversación</p>
          <p className="text-xs text-slate-300 mt-1">Los mensajes aparecerán aquí</p>
        </div>
      )
    }
    if (loadingHilo) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    return (
      <div className="flex flex-col h-full">
        {/* Cabecera conversación */}
        <div className="px-3 py-3 border-b border-slate-100 flex items-center gap-2 bg-white flex-shrink-0">
          {/* Botón volver — solo en móvil */}
          <button onClick={volverALista}
            className="md:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0">
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">
              {hilo[0]?.asunto || seleccionado.asunto}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {hilo[0]?.destinatarioGrupo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                  <Users size={8} />{grupoLabel(hilo[0].destinatarioGrupo)}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {hilo.length} {hilo.length === 1 ? 'mensaje' : 'mensajes'} · {fmtFechaHora(hilo[0]?.createdAt || seleccionado.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {tab !== 'archivados' ? (
              <button onClick={() => archivar(seleccionado.id)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Archive size={14} /><span className="hidden sm:inline">Archivar</span>
              </button>
            ) : (
              <button onClick={() => archivar(seleccionado.id, true)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <ArchiveRestore size={14} /><span className="hidden sm:inline">Desarchivar</span>
              </button>
            )}
          </div>
        </div>

        {/* Burbujas de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {hilo.map((m, i) => {
            const esMio = m.remitente.id === usuarioActualId
            const color = avatarColor(m.remitente.nombre + m.remitente.apellidos)
            return (
              <div key={m.id} className={`flex gap-2.5 ${esMio ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ${color}`}>
                  {initials(m.remitente.nombre, m.remitente.apellidos)}
                </div>
                <div className={`flex flex-col max-w-[82%] sm:max-w-[72%] ${esMio ? 'items-end' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${esMio ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-semibold text-slate-700">
                      {esMio ? 'Tú' : `${m.remitente.nombre} ${m.remitente.apellidos}`}
                    </span>
                    {i > 0 && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-medium hidden sm:inline">respuesta</span>}
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
          <div ref={hiloEndRef} />
        </div>

        {/* Área de respuesta */}
        {tab !== 'archivados' && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={respuesta} onChange={e => setRespuesta(e.target.value)}
                placeholder="Escribe tu respuesta…" rows={2}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm resize-none focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-700 placeholder-slate-400 shadow-sm"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) enviarRespuesta() }}
              />
              <button onClick={enviarRespuesta} disabled={!respuesta.trim() || enviandoResp}
                className="w-11 h-11 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm flex-shrink-0">
                {enviandoResp
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render principal ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      style={{ height: 'calc(100dvh - 200px)', minHeight: '480px' }}>

      {/* ── Barra superior: pestañas + botón nuevo ── */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-2 h-12 flex-shrink-0 gap-1">
        <div className="flex gap-0.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ key, label, Icon, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex-shrink-0
                ${tab === key
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              {badge && badge > 0 ? (
                <span className={`text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none
                  ${tab === key ? 'bg-orange-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button onClick={abrirNuevo}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 active:scale-95 transition-all shadow-sm">
          <Plus size={13} /><span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* ── Pestaña Sistema ── */}
      {tab === 'sistema' ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Barra de acciones del sistema */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {notifs.length} notificaciones
            </span>
            <div className="flex items-center gap-1">
              {noLeidosSistema > 0 && (
                <button onClick={leerTodasSistema}
                  className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 active:opacity-70 transition-colors">
                  <CheckCheck size={12} />Leer todo
                </button>
              )}
              {notifs.some(n => n.leida) && (
                <button onClick={borrarLeidasSistema}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 active:opacity-70 transition-colors">
                  <Trash2 size={12} />Borrar leídas
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Bell size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">Sin notificaciones del sistema</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {notifs.map(n => {
                  const ni = NOTIF_ICON[n.tipo] || NOTIF_ICON.default
                  return (
                    <div key={n.id} onClick={() => leerNotif(n)}
                      className={`flex gap-3 p-3.5 rounded-xl border transition-all
                        ${n.enlace ? 'cursor-pointer active:scale-[0.99]' : ''}
                        ${n.leida ? 'bg-white border-slate-100 hover:border-slate-200' : 'bg-blue-50/60 border-blue-100 hover:bg-blue-50'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ni.cls}`}>
                        <ni.Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${n.leida ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>{n.titulo}</p>
                          <span className="text-[11px] text-slate-400 flex-shrink-0 whitespace-nowrap">{fmtFecha(n.createdAt)}</span>
                        </div>
                        {n.mensaje && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.mensaje}</p>}
                        {n.enlace && <p className="text-[11px] text-orange-500 mt-1 font-medium">Toca para ver →</p>}
                      </div>
                      {!n.leida && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 shadow-sm" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Mensajes: layout de dos paneles en escritorio, panel único en móvil ── */
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Panel izquierdo — lista de mensajes */}
          {/* En móvil: visible solo cuando vistaMovil === 'lista'. En escritorio: siempre visible */}
          <div className={`
            w-full md:w-72 border-r border-slate-200 flex-col overflow-hidden flex-shrink-0 bg-slate-50/40
            ${vistaMovil === 'conversacion' ? 'hidden md:flex' : 'flex'}
          `}>
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {tab === 'recibidos' ? `${mensajes.length} conversaciones`
                  : tab === 'enviados' ? 'Enviados'
                  : 'Archivados'}
              </span>
              {tab === 'recibidos' && noLeidos > 0 && (
                <button onClick={marcarTodosLeidos}
                  className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 active:opacity-70 transition-colors py-1">
                  <CheckCheck size={12} />Leer todo
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6 text-center">
                  {tab === 'archivados' ? <Archive size={28} className="mb-2 opacity-20" /> : <Mail size={28} className="mb-2 opacity-20" />}
                  <p className="text-sm">{tab === 'archivados' ? 'No hay mensajes archivados' : 'No hay mensajes'}</p>
                </div>
              ) : mensajes.map(renderItem)}
            </div>
          </div>

          {/* Panel derecho — conversación */}
          {/* En móvil: visible solo cuando vistaMovil === 'conversacion'. En escritorio: siempre visible */}
          <div className={`
            flex-1 flex-col min-w-0 overflow-hidden bg-white
            ${vistaMovil === 'lista' ? 'hidden md:flex' : 'flex'}
          `}>
            {renderConversacion()}
          </div>
        </div>
      )}

      {/* ── Modal Nuevo Mensaje ── */}
      {/* En móvil: bottom sheet. En escritorio: modal centrado */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowNuevo(false) }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border-t sm:border border-slate-200 overflow-hidden flex flex-col"
            style={{ maxHeight: '95dvh' }}
            onClick={e => e.stopPropagation()}>

            {/* Handle visual para bottom sheet */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Nuevo mensaje</h2>
                <p className="text-xs text-slate-400 mt-0.5">Individual o a un grupo</p>
              </div>
              <button onClick={() => setShowNuevo(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Tipo destinatario */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Destinatario</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  {(['individual', 'grupo'] as const).map(t => (
                    <button key={t} onClick={() => setTipoDest(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all
                        ${tipoDest === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {t === 'individual' ? <User size={12} /> : <Users size={12} />}
                      {t === 'individual' ? 'Individual' : 'Grupo / Área'}
                    </button>
                  ))}
                </div>
              </div>

              {tipoDest === 'individual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Voluntario *</label>
                  <select value={destId} onChange={e => setDestId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
                    <option value="">Seleccionar voluntario…</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.numeroVoluntario ? `${u.numeroVoluntario} · ` : ''}{u.nombre} {u.apellidos}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Grupo o Área *</label>
                  <select value={destGrupo} onChange={e => setDestGrupo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
                    <option value="">Seleccionar…</option>
                    {grupos.filter(g => g.tipo !== 'area').length > 0 && (
                      <optgroup label="── Grupos">
                        {grupos.filter(g => g.tipo !== 'area').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </optgroup>
                    )}
                    {grupos.filter(g => g.tipo === 'area').length > 0 && (
                      <optgroup label="── Áreas operativas">
                        {grupos.filter(g => g.tipo === 'area').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Asunto *</label>
                <input type="text" value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Escribe el asunto…"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Prioridad</label>
                <div className="flex gap-2">
                  {(['baja', 'normal', 'alta', 'urgente'] as const).map(p => (
                    <button key={p} onClick={() => setPrioridad(p)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all
                        ${prioridad === p
                          ? (p === 'urgente' ? 'bg-red-500 text-white border-red-500'
                            : p === 'alta' ? 'bg-orange-500 text-white border-orange-500'
                            : p === 'baja' ? 'bg-slate-400 text-white border-slate-400'
                            : 'bg-blue-500 text-white border-blue-500')
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Mensaje *</label>
                <textarea value={contenido} onChange={e => setContenido(e.target.value)}
                  placeholder="Escribe tu mensaje aquí…" rows={5}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all leading-relaxed" />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
              <button onClick={() => setShowNuevo(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button onClick={enviarNuevo}
                disabled={enviandoNuevo || !asunto.trim() || !contenido.trim() || (tipoDest === 'individual' && !destId) || (tipoDest === 'grupo' && !destGrupo)}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95">
                {enviandoNuevo
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando…</>
                  : <><Send size={14} />Enviar mensaje</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
