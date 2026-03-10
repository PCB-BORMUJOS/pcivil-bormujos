'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bell, Mail, Package, AlertTriangle, Trash2, Check, CheckCheck, MessageSquare, RefreshCw, Reply, Send, CheckCircle, Clock } from 'lucide-react'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  enlace?: string
  leida: boolean
  createdAt: string
}

interface Mensaje {
  id: string
  asunto: string
  contenido: string
  tipo: string
  prioridad: string
  leido: boolean
  leidoEn?: string
  archivado: boolean
  createdAt: string
  remitente: { id: string; nombre: string; apellidos: string }
  destinatario?: { id: string; nombre: string; apellidos: string }
}

interface Props {
  initialSubTab?: 'mensajes' | 'sistema'
}

export default function NotificacionesTab({ initialSubTab = 'mensajes' }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'mensajes' | 'enviados' | 'sistema'>(initialSubTab)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [mensajesEnviados, setMensajesEnviados] = useState<Mensaje[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState<Mensaje | null>(null)
  const [showResponder, setShowResponder] = useState(false)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [resMensajes, resMensajesEnviados, resNotifs] = await Promise.all([
        fetch('/api/mensajes?tipo=recibidos'),
        fetch('/api/mensajes?tipo=enviados'),
        fetch('/api/notificaciones?limite=50')
      ])
      if (resMensajes.ok) {
        const data = await resMensajes.json()
        setMensajes(data.mensajes || [])
      }
      if (resMensajesEnviados.ok) {
        const data = await resMensajesEnviados.json()
        setMensajesEnviados(data.mensajes || [])
      }
      if (resNotifs.ok) {
        const data = await resNotifs.json()
        setNotificaciones(data.notificaciones || [])
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])
  useEffect(() => { setActiveSubTab(initialSubTab) }, [initialSubTab])

  const marcarMensajeLeido = async (id: string) => {
    try {
      await fetch('/api/mensajes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajeId: id, accion: 'marcarLeido' })
      })
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true, leidoEn: new Date().toISOString() } : m))
    } catch (error) { console.error('Error:', error) }
  }

  const eliminarMensaje = async (id: string) => {
    if (!confirm('¿Eliminar este mensaje? Esta acción no se puede deshacer.')) return
    try {
      await fetch('/api/mensajes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajeId: id, accion: 'archivar' })
      })
      setMensajes(prev => prev.filter(m => m.id !== id))
      setMensajeSeleccionado(null)
      setShowResponder(false)
      setTextoRespuesta('')
    } catch (error) { console.error('Error:', error) }
  }

  const handleEnviarRespuesta = async () => {
    if (!textoRespuesta.trim() || !mensajeSeleccionado) return
    setEnviandoRespuesta(true)
    try {
      const res = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarioId: mensajeSeleccionado.remitente.id,
          asunto: mensajeSeleccionado.asunto.startsWith('RE: ') ? mensajeSeleccionado.asunto : `RE: ${mensajeSeleccionado.asunto}`,
          contenido: textoRespuesta.trim(),
        })
      })
      if (!res.ok) throw new Error('Error al enviar')
      setShowResponder(false)
      setTextoRespuesta('')
      await cargarDatos()
      alert('Respuesta enviada correctamente')
    } catch (error) {
      alert('No se pudo enviar la respuesta')
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  const marcarNotificacionLeida = async (id: string) => {
    try {
      await fetch('/api/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacionId: id })
      })
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    } catch (error) { console.error('Error:', error) }
  }

  const marcarTodasLeidas = async () => {
    try {
      if (activeSubTab === 'mensajes') {
        await fetch('/api/mensajes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'marcarTodosLeidos' })
        })
        setMensajes(prev => prev.map(m => ({ ...m, leido: true })))
      } else if (activeSubTab === 'sistema') {
        await fetch('/api/notificaciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marcarTodas: true })
        })
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
      }
    } catch (error) { console.error('Error:', error) }
  }

  const formatearFecha = (fecha: string) => {
    const d = new Date(fecha)
    const ahora = new Date()
    const diffMs = ahora.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHoras < 24) return `Hace ${diffHoras}h`
    if (diffDias < 7) return `Hace ${diffDias} días`
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getInitials = (nombre: string, apellidos: string) =>
    `${nombre[0] || ''}${apellidos[0] || ''}`.toUpperCase()

  const getIconoNotificacion = (tipo: string) => {
    switch (tipo) {
      case 'peticion_estado': case 'peticion_nueva': return <Package size={18} />
      case 'stock_bajo': return <AlertTriangle size={18} />
      case 'mensaje': return <MessageSquare size={18} />
      default: return <Bell size={18} />
    }
  }

  const mensajesNoLeidos = mensajes.filter(m => !m.leido).length
  const notifsNoLeidas = notificaciones.filter(n => !n.leida).length

  // Panel de lista de mensajes (reutilizable recibidos/enviados)
  const renderListaMensajes = (lista: Mensaje[], esEnviados: boolean) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2 max-h-[500px] overflow-y-auto">
        {lista.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{esEnviados ? 'No hay mensajes enviados' : 'No hay mensajes'}</p>
          </div>
        ) : (
          lista.map(msg => (
            <div
              key={msg.id}
              onClick={() => {
                setMensajeSeleccionado(msg)
                setShowResponder(false)
                setTextoRespuesta('')
                if (!esEnviados && !msg.leido) marcarMensajeLeido(msg.id)
              }}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                mensajeSeleccionado?.id === msg.id
                  ? 'bg-orange-100 border-2 border-orange-500'
                  : !esEnviados && !msg.leido
                    ? 'bg-orange-50 hover:bg-orange-100 border border-orange-200'
                    : 'bg-white hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {esEnviados
                    ? getInitials(msg.destinatario?.nombre || '?', msg.destinatario?.apellidos || '')
                    : getInitials(msg.remitente.nombre, msg.remitente.apellidos)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${!esEnviados && !msg.leido ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
                      {esEnviados
                        ? `${msg.destinatario?.nombre || 'Destinatario'} ${msg.destinatario?.apellidos || ''}`
                        : `${msg.remitente.nombre} ${msg.remitente.apellidos}`
                      }
                    </p>
                    {!esEnviados && !msg.leido && <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>}
                  </div>
                  <p className={`text-sm truncate ${!esEnviados && !msg.leido ? 'font-semibold' : 'text-slate-600'}`}>{msg.asunto}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-slate-400">{formatearFecha(msg.createdAt)}</p>
                    {esEnviados && (
                      msg.leido
                        ? <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                            <CheckCircle size={10} /> Leído {msg.leidoEn ? formatearFecha(msg.leidoEn) : ''}
                          </span>
                        : <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={10} /> Pendiente de leer
                          </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Panel detalle */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        {mensajeSeleccionado ? (
          <>
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {esEnviados
                    ? getInitials(mensajeSeleccionado.destinatario?.nombre || '?', mensajeSeleccionado.destinatario?.apellidos || '')
                    : getInitials(mensajeSeleccionado.remitente.nombre, mensajeSeleccionado.remitente.apellidos)
                  }
                </div>
                <div>
                  <p className="font-bold text-slate-800">
                    {esEnviados
                      ? `Para: ${mensajeSeleccionado.destinatario?.nombre || ''} ${mensajeSeleccionado.destinatario?.apellidos || ''}`
                      : `${mensajeSeleccionado.remitente.nombre} ${mensajeSeleccionado.remitente.apellidos}`
                    }
                  </p>
                  <p className="text-xs text-slate-500">{formatearFecha(mensajeSeleccionado.createdAt)}</p>
                  {esEnviados && (
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${mensajeSeleccionado.leido ? 'text-green-600' : 'text-slate-400'}`}>
                      {mensajeSeleccionado.leido
                        ? <><CheckCircle size={12} /> Leído el {mensajeSeleccionado.leidoEn ? new Date(mensajeSeleccionado.leidoEn).toLocaleString('es-ES', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</>
                        : <><Clock size={12} /> Pendiente de leer</>
                      }
                    </p>
                  )}
                </div>
              </div>
              {!esEnviados && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowResponder(v => !v); setTextoRespuesta('') }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      showResponder ? 'bg-orange-100 text-orange-700' : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    <Reply size={15} /> Responder
                  </button>
                  <button
                    onClick={() => eliminarMensaje(mensajeSeleccionado.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-5 overflow-y-auto">
              <h3 className="text-base font-bold text-slate-800 mb-3">{mensajeSeleccionado.asunto}</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{mensajeSeleccionado.contenido}</p>
            </div>

            {!esEnviados && showResponder && (
              <div className="border-t border-slate-200 p-4 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Respondiendo a {mensajeSeleccionado.remitente.nombre} {mensajeSeleccionado.remitente.apellidos}
                </p>
                <textarea
                  value={textoRespuesta}
                  onChange={e => setTextoRespuesta(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  rows={4}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setShowResponder(false); setTextoRespuesta('') }}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEnviarRespuesta}
                    disabled={!textoRespuesta.trim() || enviandoRespuesta}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={14} />
                    {enviandoRespuesta ? 'Enviando...' : 'Enviar respuesta'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
            <Mail className="w-16 h-16 mb-3 opacity-30" />
            <p className="text-sm">Selecciona un mensaje para ver su contenido</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Centro de Notificaciones</h2>
          <p className="text-sm text-slate-500">Mensajes recibidos y alertas del sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarDatos} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {activeSubTab !== 'enviados' && (
            <button onClick={marcarTodasLeidas} className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium">
              <CheckCheck size={16} /> Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveSubTab('mensajes'); setMensajeSeleccionado(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'mensajes' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Mail size={16} /> Recibidos
          {mensajesNoLeidos > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab('enviados'); setMensajeSeleccionado(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'enviados' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Send size={16} /> Enviados
          {mensajesEnviados.length > 0 && (
            <span className="w-5 h-5 bg-slate-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {mensajesEnviados.length > 9 ? '9+' : mensajesEnviados.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab('sistema'); setMensajeSeleccionado(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'sistema' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Bell size={16} /> Sistema
          {notifsNoLeidas > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notifsNoLeidas > 9 ? '9+' : notifsNoLeidas}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-slate-300 animate-spin" />
          <p className="text-slate-500">Cargando...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'mensajes' && renderListaMensajes(mensajes, false)}
          {activeSubTab === 'enviados' && renderListaMensajes(mensajesEnviados, true)}
          {activeSubTab === 'sistema' && (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay notificaciones del sistema</p>
                </div>
              ) : (
                notificaciones.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => { if (!notif.leida) marcarNotificacionLeida(notif.id); if (notif.enlace) window.location.href = notif.enlace; }}
                    className={`p-4 rounded-lg cursor-pointer transition-all flex gap-4 ${!notif.leida ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200' : 'bg-white hover:bg-slate-50 border border-slate-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.tipo === 'peticion_estado' ? 'bg-purple-100 text-purple-600' : notif.tipo === 'peticion_nueva' ? 'bg-blue-100 text-blue-600' : notif.tipo === 'mensaje' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                      {getIconoNotificacion(notif.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!notif.leida ? 'font-bold text-slate-800' : 'text-slate-700'}`}>{notif.titulo}</p>
                        {!notif.leida && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{notif.mensaje}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{formatearFecha(notif.createdAt)}</p>
                    </div>
                    {!notif.leida && (
                      <button onClick={e => { e.stopPropagation(); marcarNotificacionLeida(notif.id); }} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg self-start">
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
