'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Mail, Package, AlertTriangle, Trash2, Check, CheckCheck, MessageSquare, RefreshCw } from 'lucide-react'

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
  archivado: boolean
  createdAt: string
  remitente: { id: string; nombre: string; apellidos: string }
}

export default function NotificacionesTab() {
  const [activeSubTab, setActiveSubTab] = useState<'mensajes' | 'sistema'>('mensajes')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState<Mensaje | null>(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [resMensajes, resNotifs] = await Promise.all([
        fetch('/api/mensajes?tipo=recibidos'),
        fetch('/api/notificaciones?limite=50')
      ])
      
      if (resMensajes.ok) {
        const data = await resMensajes.json()
        setMensajes(data.mensajes || [])
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

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const marcarMensajeLeido = async (id: string) => {
    try {
      await fetch('/api/mensajes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajeId: id, accion: 'marcarLeido' })
      })
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const archivarMensaje = async (id: string) => {
    try {
      await fetch('/api/mensajes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajeId: id, accion: 'archivar' })
      })
      setMensajes(prev => prev.filter(m => m.id !== id))
      setMensajeSeleccionado(null)
    } catch (error) {
      console.error('Error:', error)
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
    } catch (error) {
      console.error('Error:', error)
    }
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
      } else {
        await fetch('/api/notificaciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marcarTodas: true })
        })
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
      }
    } catch (error) {
      console.error('Error:', error)
    }
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

  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre[0] || ''}${apellidos[0] || ''}`.toUpperCase()
  }

  const getIconoNotificacion = (tipo: string) => {
    switch (tipo) {
      case 'peticion_estado':
      case 'peticion_nueva':
        return <Package size={18} />
      case 'stock_bajo':
        return <AlertTriangle size={18} />
      case 'mensaje':
        return <MessageSquare size={18} />
      default:
        return <Bell size={18} />
    }
  }

  const mensajesNoLeidos = mensajes.filter(m => !m.leido).length
  const notifsNoLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Centro de Notificaciones</h2>
          <p className="text-sm text-slate-500">Mensajes recibidos y alertas del sistema</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={cargarDatos}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={marcarTodasLeidas}
            className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
          >
            <CheckCheck size={16} /> Marcar todas leídas
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSubTab('mensajes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'mensajes' 
              ? 'bg-orange-500 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Mail size={16} /> Mensajes
          {mensajesNoLeidos > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('sistema')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'sistema' 
              ? 'bg-orange-500 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
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
          {/* Tab Mensajes */}
          {activeSubTab === 'mensajes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de mensajes */}
              <div className="lg:col-span-1 space-y-2 max-h-[500px] overflow-y-auto">
                {mensajes.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay mensajes</p>
                  </div>
                ) : (
                  mensajes.map(msg => (
                    <div
                      key={msg.id}
                      onClick={() => { setMensajeSeleccionado(msg); if (!msg.leido) marcarMensajeLeido(msg.id); }}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        mensajeSeleccionado?.id === msg.id 
                          ? 'bg-orange-100 border-2 border-orange-500' 
                          : !msg.leido 
                            ? 'bg-orange-50 hover:bg-orange-100 border border-orange-200'
                            : 'bg-white hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                          {getInitials(msg.remitente.nombre, msg.remitente.apellidos)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!msg.leido ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
                              {msg.remitente.nombre} {msg.remitente.apellidos}
                            </p>
                            {!msg.leido && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                          </div>
                          <p className={`text-sm truncate ${!msg.leido ? 'font-semibold' : 'text-slate-600'}`}>{msg.asunto}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatearFecha(msg.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Detalle del mensaje */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
                {mensajeSeleccionado ? (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                          {getInitials(mensajeSeleccionado.remitente.nombre, mensajeSeleccionado.remitente.apellidos)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {mensajeSeleccionado.remitente.nombre} {mensajeSeleccionado.remitente.apellidos}
                          </p>
                          <p className="text-xs text-slate-500">{formatearFecha(mensajeSeleccionado.createdAt)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => archivarMensaje(mensajeSeleccionado.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Archivar mensaje"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{mensajeSeleccionado.asunto}</h3>
                    <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                      {mensajeSeleccionado.contenido}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Mail className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p>Selecciona un mensaje para ver su contenido</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Sistema (Notificaciones) */}
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
                    className={`p-4 rounded-lg cursor-pointer transition-all flex gap-4 ${
                      !notif.leida 
                        ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                        : 'bg-white hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      notif.tipo === 'peticion_estado' ? 'bg-purple-100 text-purple-600' :
                      notif.tipo === 'peticion_nueva' ? 'bg-blue-100 text-blue-600' :
                      notif.tipo === 'mensaje' ? 'bg-green-100 text-green-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {getIconoNotificacion(notif.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!notif.leida ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
                          {notif.titulo}
                        </p>
                        {!notif.leida && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{notif.mensaje}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{formatearFecha(notif.createdAt)}</p>
                    </div>
                    {!notif.leida && (
                      <button
                        onClick={(e) => { e.stopPropagation(); marcarNotificacionLeida(notif.id); }}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg self-start"
                        title="Marcar como leída"
                      >
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
