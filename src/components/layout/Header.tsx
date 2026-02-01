'use client'

import { Bell, Search, ChevronDown, Settings, User, LogOut, MessageSquare, HelpCircle, Package, ShoppingCart, CheckCircle, AlertTriangle, X, Send, Users, Mail } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title?: string
  subtitle?: string
  showSearch?: boolean
  onSearch?: (query: string) => void
}

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
  leido: boolean
  createdAt: string
  remitente: { id: string; nombre: string; apellidos: string }
}

interface Destinatario {
  id: string
  nombre: string
  apellidos: string
  numeroVoluntario?: string
  rol: { nombre: string }
  servicio?: { nombre: string }
}

interface GrupoDestinatario {
  value: string
  label: string
  tipo: string
}

export default function Header({ 
  title,
  subtitle,
  showSearch = true, 
  onSearch,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMensajes, setShowMensajes] = useState(false)
  const [showNuevoMensaje, setShowNuevoMensaje] = useState(false)
  
  // Notificaciones
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0)
  
  // Mensajes
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [grupos, setGrupos] = useState<GrupoDestinatario[]>([])
  const [permisos, setPermisos] = useState({ puedeEnviarGrupos: false, puedeEnviarTodos: false })
  
  // Formulario nuevo mensaje
  const [nuevoMensaje, setNuevoMensaje] = useState({
    asunto: '',
    contenido: '',
    destinatarioId: '',
    destinatarioGrupo: '',
    tipoDestinatario: 'individual' as 'individual' | 'grupo'
  })
  const [enviando, setEnviando] = useState(false)
  
  const { data: session } = useSession()
  const router = useRouter()
  
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mensajesRef = useRef<HTMLDivElement>(null)
  const nuevoMensajeRef = useRef<HTMLDivElement>(null)

  // Cargar notificaciones
  const cargarNotificaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/notificaciones?limite=10')
      if (res.ok) {
        const data = await res.json()
        setNotificaciones(data.notificaciones || [])
        setNotificacionesNoLeidas(data.noLeidas || 0)
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    }
  }, [])

  // Cargar mensajes
  const cargarMensajes = useCallback(async () => {
    try {
      const res = await fetch('/api/mensajes?tipo=recibidos')
      if (res.ok) {
        const data = await res.json()
        setMensajes(data.mensajes || [])
        setMensajesNoLeidos(data.noLeidos || 0)
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error)
    }
  }, [])

  // Cargar destinatarios
  const cargarDestinatarios = useCallback(async () => {
    try {
      const res = await fetch('/api/mensajes/destinatarios')
      if (res.ok) {
        const data = await res.json()
        setDestinatarios(data.usuarios || [])
        setGrupos(data.grupos || [])
        setPermisos(data.permisos || { puedeEnviarGrupos: false, puedeEnviarTodos: false })
      }
    } catch (error) {
      console.error('Error cargando destinatarios:', error)
    }
  }, [])

  // Cargar al montar y cada 30 segundos
  useEffect(() => {
    cargarNotificaciones()
    cargarMensajes()
    const interval = setInterval(() => {
      cargarNotificaciones()
      cargarMensajes()
    }, 30000)
    return () => clearInterval(interval)
  }, [cargarNotificaciones, cargarMensajes])

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (mensajesRef.current && !mensajesRef.current.contains(event.target as Node)) {
        setShowMensajes(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    onSearch?.(e.target.value)
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getRolLabel = (rol: string) => {
    const roles: Record<string, string> = {
      superadmin: 'Superadministrador',
      admin: 'Administrador',
      coordinador: 'Coordinador',
      voluntario: 'Voluntario',
    }
    return roles[rol] || rol
  }

  // Marcar notificación como leída
  const marcarNotificacionLeida = async (notificacionId: string, enlace?: string) => {
    try {
      await fetch('/api/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacionId })
      })
      setNotificaciones(prev => prev.map(n => n.id === notificacionId ? { ...n, leida: true } : n))
      setNotificacionesNoLeidas(prev => Math.max(0, prev - 1))
      if (enlace) {
        setShowNotifications(false)
        window.location.href = enlace
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Marcar mensaje como leído
  const marcarMensajeLeido = async (mensajeId: string) => {
    try {
      await fetch('/api/mensajes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajeId, accion: 'marcarLeido' })
      })
      setMensajes(prev => prev.map(m => m.id === mensajeId ? { ...m, leido: true } : m))
      setMensajesNoLeidos(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Enviar mensaje
  const enviarMensaje = async () => {
    if (!nuevoMensaje.asunto || !nuevoMensaje.contenido) {
      alert('Completa el asunto y el mensaje')
      return
    }
    if (nuevoMensaje.tipoDestinatario === 'individual' && !nuevoMensaje.destinatarioId) {
      alert('Selecciona un destinatario')
      return
    }
    if (nuevoMensaje.tipoDestinatario === 'grupo' && !nuevoMensaje.destinatarioGrupo) {
      alert('Selecciona un grupo')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto: nuevoMensaje.asunto,
          contenido: nuevoMensaje.contenido,
          destinatarioId: nuevoMensaje.tipoDestinatario === 'individual' ? nuevoMensaje.destinatarioId : null,
          destinatarioGrupo: nuevoMensaje.tipoDestinatario === 'grupo' ? nuevoMensaje.destinatarioGrupo : null
        })
      })

      if (res.ok) {
        setShowNuevoMensaje(false)
        setNuevoMensaje({ asunto: '', contenido: '', destinatarioId: '', destinatarioGrupo: '', tipoDestinatario: 'individual' })
        alert('✅ Mensaje enviado')
      } else {
        const data = await res.json()
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Error al enviar mensaje')
    } finally {
      setEnviando(false)
    }
  }

  // Formatear tiempo relativo
  const formatearTiempo = (fecha: string) => {
    const ahora = new Date()
    const notifDate = new Date(fecha)
    const diffMs = ahora.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHoras < 24) return `Hace ${diffHoras}h`
    if (diffDias < 7) return `Hace ${diffDias}d`
    return notifDate.toLocaleDateString('es-ES')
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

  const getColorNotificacion = (tipo: string) => {
    switch (tipo) {
      case 'peticion_estado':
        return 'bg-purple-100 text-purple-600'
      case 'peticion_nueva':
        return 'bg-blue-100 text-blue-600'
      case 'mensaje':
        return 'bg-green-100 text-green-600'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Lado izquierdo - Menú móvil + Búsqueda */}
          <div className="flex items-center gap-4">
            {/* Botón hamburguesa para móvil */}
            <button 
              onClick={() => {
                const sidebar = document.querySelector('.sidebar')
                sidebar?.classList.toggle('open')
                const existingOverlay = document.querySelector('.sidebar-overlay')
                if (existingOverlay) {
                  existingOverlay.remove()
                  sidebar?.classList.remove('open')
                } else {
                  const newOverlay = document.createElement('div')
                  newOverlay.className = 'sidebar-overlay'
                  newOverlay.onclick = () => {
                    sidebar?.classList.remove('open')
                    newOverlay.remove()
                  }
                  document.body.appendChild(newOverlay)
                }
              }}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
              aria-label="Abrir menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            {showSearch && (
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar servicio, voluntario..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-80 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>
            )}
          </div>

          {/* Lado derecho - Acciones */}
          <div className="flex items-center gap-2">
            
            {/* Botón Mensajes */}
            <div className="relative" ref={mensajesRef}>
              <button 
                onClick={() => {
                  setShowMensajes(!showMensajes)
                  if (!showMensajes) cargarMensajes()
                }}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
              >
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Mensajes</span>
                {mensajesNoLeidos > 0 && (
                  <span className="w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}
                  </span>
                )}
              </button>

              {/* Dropdown Mensajes */}
              {showMensajes && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Mensajes</h3>
                      <button
                        onClick={() => { setShowMensajes(false); setShowNuevoMensaje(true); cargarDestinatarios(); }}
                        className="flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600"
                      >
                        <Send size={12} /> Nuevo
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {mensajes.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay mensajes</p>
                      </div>
                    ) : (
                      mensajes.slice(0, 5).map(msg => (
                        <div 
                          key={msg.id} 
                          onClick={() => { marcarMensajeLeido(msg.id); router.push('/mi-area?tab=notificaciones'); setShowMensajes(false); }}
                          className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!msg.leido ? 'bg-orange-50/50' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                              {getInitials(`${msg.remitente.nombre} ${msg.remitente.apellidos}`)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!msg.leido ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                                {msg.asunto}
                              </p>
                              <p className="text-xs text-slate-500">{msg.remitente.nombre} {msg.remitente.apellidos}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{formatearTiempo(msg.createdAt)}</p>
                            </div>
                            {!msg.leido && <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <Link 
                      href="/mi-area?tab=notificaciones"
                      onClick={() => setShowMensajes(false)}
                      className="w-full block text-center text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Ver todos los mensajes
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de ayuda */}
            <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Notificaciones */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) cargarNotificaciones(); }}
                className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <Bell className="w-5 h-5" />
                {notificacionesNoLeidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Notificaciones</h3>
                      <span className="text-xs text-slate-500">{notificacionesNoLeidas} sin leer</span>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificaciones.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay notificaciones</p>
                      </div>
                    ) : (
                      notificaciones.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => marcarNotificacionLeida(notif.id, notif.enlace)}
                          className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!notif.leida ? 'bg-orange-50/50' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorNotificacion(notif.tipo)}`}>
                              {getIconoNotificacion(notif.tipo)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.leida ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{notif.titulo}</p>
                              <p className="text-xs text-slate-500 line-clamp-2">{notif.mensaje}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{formatearTiempo(notif.createdAt)}</p>
                            </div>
                            {!notif.leida && <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <Link href="/mi-area?tab=notificaciones" onClick={() => setShowNotifications(false)} className="w-full block text-center text-sm text-orange-600 hover:text-orange-700 font-medium">
                      Ver todas las notificaciones
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Separador */}
            <div className="w-px h-8 bg-slate-200 mx-2"></div>

            {/* Menú de usuario */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-100 rounded-xl transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {session?.user?.name ? getInitials(session.user.name) : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">{session?.user?.name || 'Usuario'}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{session?.user?.rol ? getRolLabel(session.user.rol) : 'Cargando...'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
                        {session?.user?.name ? getInitials(session.user.name) : 'U'}
                      </div>
                      <div>
                        <p className="font-bold">{session?.user?.name || 'Usuario'}</p>
                        <p className="text-orange-100 text-sm">{session?.user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link href="/mi-area" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setShowUserMenu(false)}>
                      <User className="w-4 h-4 text-slate-400" /> Mi Perfil / FRI
                    </Link>
                    <Link href="/configuracion" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setShowUserMenu(false)}>
                      <Settings className="w-4 h-4 text-slate-400" /> Configuración
                    </Link>
                  </div>
                  <div className="border-t border-slate-200 py-2">
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full">
                      <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal Nuevo Mensaje */}
      {showNuevoMensaje && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={nuevoMensajeRef} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">Nuevo Mensaje</h3>
              <button onClick={() => setShowNuevoMensaje(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo de destinatario */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Enviar a</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNuevoMensaje({ ...nuevoMensaje, tipoDestinatario: 'individual', destinatarioGrupo: '' })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${nuevoMensaje.tipoDestinatario === 'individual' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <User size={16} className="inline mr-2" /> Individual
                  </button>
                  {permisos.puedeEnviarGrupos && (
                    <button
                      onClick={() => setNuevoMensaje({ ...nuevoMensaje, tipoDestinatario: 'grupo', destinatarioId: '' })}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${nuevoMensaje.tipoDestinatario === 'grupo' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Users size={16} className="inline mr-2" /> Grupo
                    </button>
                  )}
                </div>
              </div>

              {/* Selector destinatario */}
              {nuevoMensaje.tipoDestinatario === 'individual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destinatario *</label>
                  <select
                    value={nuevoMensaje.destinatarioId}
                    onChange={e => setNuevoMensaje({ ...nuevoMensaje, destinatarioId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  >
                    <option value="">Seleccionar usuario...</option>
                    {destinatarios.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} {d.apellidos} {d.numeroVoluntario ? `(${d.numeroVoluntario})` : ''} - {d.servicio?.nombre || 'Sin área'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo *</label>
                  <select
                    value={nuevoMensaje.destinatarioGrupo}
                    onChange={e => setNuevoMensaje({ ...nuevoMensaje, destinatarioGrupo: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  >
                    <option value="">Seleccionar grupo...</option>
                    {grupos.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Asunto */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asunto *</label>
                <input
                  type="text"
                  value={nuevoMensaje.asunto}
                  onChange={e => setNuevoMensaje({ ...nuevoMensaje, asunto: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  placeholder="Asunto del mensaje"
                />
              </div>

              {/* Contenido */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensaje *</label>
                <textarea
                  value={nuevoMensaje.contenido}
                  onChange={e => setNuevoMensaje({ ...nuevoMensaje, contenido: e.target.value })}
                  rows={5}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm resize-none"
                  placeholder="Escribe tu mensaje..."
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNuevoMensaje(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarMensaje}
                  disabled={enviando}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enviando ? 'Enviando...' : <><Send size={16} /> Enviar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
