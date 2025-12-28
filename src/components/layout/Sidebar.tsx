'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Bell,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  children?: { name: string; href: string }[]
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

interface SidebarProps {
  usuario?: {
    nombre: string
    apellidos: string
    rol: string
    avatar?: string
  }
}

export default function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  const currentUser = usuario ?? {
    nombre: 'EMILIO',
    apellidos: '',
    rol: 'SUPERADMINISTRADOR',
    avatar: undefined,
  }

  const getInitials = (nombre: string, apellidos: string) => {
    const firstInitial = nombre.charAt(0).toUpperCase()
    const lastInitial = apellidos ? apellidos.charAt(0).toUpperCase() : nombre.charAt(1)?.toUpperCase() || ''
    return `${firstInitial}${lastInitial}`
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-pc-dark-800">
        <div className="w-10 h-10 rounded-full bg-pc-primary-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">PC</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white text-sm">Protección Civil</span>
          <span className="text-pc-primary-500 text-xs font-medium">BORMUJOS</span>
        </div>
      </div>

      {/* Search */}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn('sidebar-link', isActive && 'active')}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="border-t border-pc-dark-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-pc-primary-500 flex items-center justify-center text-white font-semibold text-sm">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.nombre}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(currentUser.nombre, currentUser.apellidos)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentUser.nombre}
            </p>
            <p className="text-xs text-pc-primary-500 truncate">
              {currentUser.rol}
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-pc-dark-800 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
          <span>DESCONECTAR</span>
        </button>
      </div>
    </aside>
  )
}
