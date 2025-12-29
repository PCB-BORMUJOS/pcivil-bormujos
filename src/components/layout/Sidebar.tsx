'use client'

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
  Search,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cuadrantes', href: '/cuadrantes', icon: Calendar },
  { name: 'Mi Área / FRI', href: '/mi-area', icon: User },
  { name: 'Logística', href: '/logistica', icon: Package },
  { name: 'Incendios', href: '/inventario/incendios', icon: Flame },
  { name: 'Socorrismo', href: '/inventario/socorrismo', icon: Heart },
  { name: 'Vehículos', href: '/vehiculos', icon: Truck },
  { name: 'Transmisiones', href: '/transmisiones', icon: Radio },
  { name: 'PMA', href: '/pma', icon: AlertTriangle },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-pc-dark-800">
        <div className="w-10 h-10 rounded-full bg-pc-primary-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">PC</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white text-sm">Protección Civil</span>
          <span className="text-pc-primary-500 text-xs font-medium">BORMUJOS</span>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-pc-dark-800 border border-pc-dark-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pc-primary-500 focus:border-pc-primary-500"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.name}>
                <Link href={item.href} className={cn('sidebar-link', isActive && 'active')}>
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-pc-dark-800 p-4">
        {status === 'loading' ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 text-pc-primary-500 animate-spin" />
          </div>
        ) : session?.user ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-pc-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                {getInitials(session.user.name || 'U')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                <p className="text-xs text-pc-primary-500 truncate">{getRolLabel(session.user.rol)}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-pc-dark-800 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              <span>DESCONECTAR</span>
            </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-pc-dark-800 rounded-lg transition-colors">
            <User className="w-4 h-4" />
            <span>INICIAR SESIÓN</span>
          </Link>
        )}
      </div>
    </aside>
  )
}