'use client'

import { Bell, Search, Filter } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  showSearch?: boolean
  showFilters?: boolean
  onSearch?: (query: string) => void
  onFilterClick?: () => void
}

export default function Header({ 
  showSearch = true, 
  showFilters = false,
  onSearch,
  onFilterClick 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    onSearch?.(e.target.value)
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-8 py-4">
        {/* Search (optional) */}
        {showSearch && (
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={handleSearch}
              className="input-search"
            />
          </div>
        )}

        {!showSearch && <div />}

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Filter button (optional) */}
          {showFilters && (
            <button 
              onClick={onFilterClick}
              className="btn-outline"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
          )}

          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-pc-primary-500 rounded-full" />
          </button>

          {/* User avatar */}
          <div className="w-9 h-9 rounded-full bg-pc-primary-100 flex items-center justify-center text-pc-primary-600 font-semibold text-sm">
            EG
          </div>
        </div>
      </div>
    </header>
  )
}
