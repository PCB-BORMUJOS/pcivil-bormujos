'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { StatCard, DataTable, Input, Select, Button } from '@/components/ui'
import { Filter, Plus, Download, Upload } from 'lucide-react'

// Tipos para esta página
interface ArticuloInventario {
  id: string
  nombre: string
  familia: string
  stock: number
  ubicacion: string
  caducidad: string | null
}

// Datos de ejemplo - en producción vendrán de la BD
const articulos: ArticuloInventario[] = []

const familias = [
  { value: '', label: 'Todas las Familias' },
  { value: 'epis', label: 'EPIs' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'extintores', label: 'Extintores' },
  { value: 'mangueras', label: 'Mangueras' },
  { value: 'equipos-respiracion', label: 'Equipos de Respiración' },
]

export default function InventarioIncendiosPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [familiaFilter, setFamiliaFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Calcular estadísticas
  const totalReferencias = articulos.length
  const bajoStock = articulos.filter(a => a.stock < 5).length
  const caducados = articulos.filter(a => {
    if (!a.caducidad) return false
    return new Date(a.caducidad) < new Date()
  }).length

  // Filtrar artículos
  const articulosFiltrados = articulos.filter(articulo => {
    const matchesSearch = articulo.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         articulo.familia.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFamilia = !familiaFilter || articulo.familia === familiaFilter
    return matchesSearch && matchesFamilia
  })

  // Columnas de la tabla
  const columns = [
    {
      key: 'nombre',
      label: 'ARTÍCULO / FAMILIA',
      render: (item: ArticuloInventario) => (
        <div>
          <p className="font-medium text-gray-900">{item.nombre}</p>
          <p className="text-sm text-gray-500">{item.familia}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'STOCK',
      render: (item: ArticuloInventario) => (
        <span className={item.stock < 5 ? 'text-red-500 font-medium' : ''}>
          {item.stock}
        </span>
      ),
    },
    {
      key: 'ubicacion',
      label: 'UBICACIÓN',
    },
    {
      key: 'caducidad',
      label: 'CADUCIDAD',
      render: (item: ArticuloInventario) => {
        if (!item.caducidad) return <span className="text-gray-400">-</span>
        const fecha = new Date(item.caducidad)
        const hoy = new Date()
        const esCaducado = fecha < hoy
        return (
          <span className={esCaducado ? 'text-red-500 font-medium' : ''}>
            {fecha.toLocaleDateString('es-ES')}
          </span>
        )
      },
    },
    {
      key: 'acciones',
      label: 'SOLICITAR',
      render: (item: ArticuloInventario) => (
        <Button variant="outline" size="sm">
          Solicitar
        </Button>
      ),
    },
  ]

  return (
    <>
      <Header showSearch={false} />
      
      <div className="page-content">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Inventario: Incendios</h1>
            <p className="page-subtitle">Control de material operativo del área.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
            </Button>
            <Button 
              variant="primary" 
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nuevo Artículo
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            label="TOTAL REFERENCIAS"
            value={totalReferencias}
          />
          <StatCard
            label="BAJO STOCK"
            value={bajoStock}
            variant={bajoStock > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="CADUCADOS / PRÓX."
            value={caducados}
            variant={caducados > 0 ? 'danger' : 'default'}
          />
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                isSearch
                placeholder="Buscar por nombre, familia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                options={familias}
                value={familiaFilter}
                onChange={(e) => setFamiliaFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={articulosFiltrados}
          emptyMessage="No se encontraron artículos con los filtros actuales."
        />

        {/* Empty State Actions */}
        {articulosFiltrados.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-500 mb-4">
              Empieza añadiendo artículos al inventario de Incendios
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />}>
                Importar CSV
              </Button>
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Añadir Artículo
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
