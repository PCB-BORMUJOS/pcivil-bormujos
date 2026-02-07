'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  User,
  Package,
  Flame,
  Heart,
  Truck,
  Radio,
  AlertTriangle,
  Settings,
  LogOut,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  GraduationCap,
  Users,
  FileText,
  BookOpen,
  FlaskConical,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  submenu?: Array<{ name: string; href: string }>
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cuadrantes', href: '/cuadrantes', icon: Calendar },
  { name: 'Administración', href: '/administracion', icon: ShieldCheck, adminOnly: true },
  { name: 'Mi Área', href: '/mi-area', icon: User },
  { name: 'Logística', href: '/logistica', icon: Package },
  { name: 'Incendios', href: '/incendios', icon: Flame },
  { name: 'Socorrismo', href: '/socorrismo', icon: Heart },
  { name: 'Vehículos', href: '/vehiculos', icon: Truck },
  { name: 'Transmisiones', href: '/transmisiones', icon: Radio },
  { name: 'PMA', href: '/pma', icon: AlertTriangle },
  { name: 'Formación', href: '/formacion', icon: GraduationCap },
  { name: 'Acción Social', href: '/accion-social', icon: Users },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
  { 
    name: 'Partes', 
    href: '/partes', 
    icon: FileText,
    submenu: [
      { name: 'PSI - Servicio e Intervención', href: '/partes/psi' },
      { name: 'PRV FSV - Revisión FSV', href: '/partes/prv-fsv' },
      { name: 'PRV VIR - Revisión VIR', href: '/partes/prv-vir' },
      { name: 'POT - Orden de Trabajo', href: '/partes/pot' },
      { name: 'PRD - Revisión DEA', href: '/partes/prd' },
      { name: 'PAS SVB - Asistencia SVB', href: '/partes/pas-svb' },
      { name: 'PRH - Revisión Hidrantes', href: '/partes/prh' },
      { name: 'RPAS - Libro de Vuelo', href: '/partes/rpas' },
      { name: 'PCR - Carga Remolque', href: '/partes/pcr' },
      { name: 'PRMB - Revisión Botiquín', href: '/partes/prmb' },
    ]
  },
  { name: 'Manuales', href: '/manuales', icon: BookOpen },
  { name: 'Prácticas', href: '/practicas', icon: FlaskConical },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const userRole = session?.user?.rol || ''
  const isAdmin = ['superadmin', 'admin', 'coordinador'].includes(userRole)
  
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Cerrar sidebar móvil con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevenir scroll del body cuando el sidebar móvil está abierto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Abrir submenú si estamos en una de sus rutas
  useEffect(() => {
    const item = navigation.find(nav => 
      nav.submenu?.some(sub => pathname.startsWith(sub.href))
    )
    if (item) {
      setOpenSubmenu(item.name)
    }
  }, [pathname])

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getRolLabel = (rol: string) => {
    const roles: Record<string, string> = {
      superadmin: 'SUPERADMINISTRADOR',
      admin: 'ADMINISTRADOR',
      coordinador: 'COORDINADOR',
      voluntario: 'VOLUNTARIO',
    }
    return roles[rol] || rol.toUpperCase()
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    return true
  })

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-pc-dark-900 text-white rounded-lg lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* Overlay para móvil */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'sidebar',
        collapsed && 'collapsed',
        mobileOpen && 'open'
      )}>
        {/* Header del sidebar */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-pc-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pc-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">PC</span>
            </div>
            <div className="sidebar-logo-text flex flex-col">
              <span className="font-semibold text-white text-sm">Protección Civil</span>
              <span className="text-pc-primary-500 text-xs font-medium">BORMUJOS</span>
            </div>
          </div>
          
          {/* Botón cerrar en móvil */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 text-gray-400 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
          
          {/* Botón colapsar en desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-toggle hidden lg:block text-gray-400 hover:text-white"
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-4">
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isSubmenuOpen = openSubmenu === item.name
              
              return (
                <li key={item.name}>
                  {hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => setOpenSubmenu(isSubmenuOpen ? null : item.name)}
                        className={cn(
                          'sidebar-link w-full',
                          isActive && 'active'
                        )}
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="sidebar-text flex-1 text-left">{item.name}</span>
                        <ChevronDown 
                          className={cn(
                            "w-4 h-4 sidebar-text transition-transform",
                            isSubmenuOpen && "rotate-180"
                          )} 
                        />
                      </button>
                      {isSubmenuOpen && !collapsed && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.submenu!.map((sub) => {
                            const isSubActive = pathname === sub.href
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={cn(
                                  'block px-3 py-2 text-sm rounded-lg transition-colors',
                                  isSubActive 
                                    ? 'bg-pc-primary-500 text-white' 
                                    : 'text-gray-400 hover:text-white hover:bg-pc-dark-800'
                                )}
                              >
                                {sub.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link 
                      href={item.href} 
                      className={cn('sidebar-link', isActive && 'active')}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="sidebar-text">{item.name}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Usuario */}
        <div className="border-t border-pc-dark-800 p-4">
          {status === 'loading' ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-pc-primary-500 animate-spin" />
            </div>
          ) : session?.user ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-pc-primary-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {getInitials(session.user.name || 'U')}
                </div>
                <div className="sidebar-user-info flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                  <p className="text-xs text-pc-primary-500 truncate">{getRolLabel(session.user.rol)}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-pc-dark-800 rounded-lg transition-colors",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? 'Desconectar' : undefined}
              >
                <LogOut className="w-4 h-4" />
                <span className="sidebar-text">DESCONECTAR</span>
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-pc-dark-800 rounded-lg transition-colors",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? 'Iniciar sesión' : undefined}
            >
              <User className="w-4 h-4" />
              <span className="sidebar-text">INICIAR SESIÓN</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
