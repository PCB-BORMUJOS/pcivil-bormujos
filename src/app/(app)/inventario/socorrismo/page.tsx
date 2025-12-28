'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { StatCard, DataTable, Input, Select, Button } from '@/components/ui'
import { Filter, Plus } from 'lucide-react'

interface ArticuloInventario {
  id: string
  nombre: string
  familia: string
  stock: number
  ubicacion: string
  caducidad: string | null
}

const articulos: ArticuloInventario[] = []

const familias = [
  { value: '', label: 'Todas las Familias' },
  { value: 'botiquines', label: 'Botiquines' },
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'material-curas', label: 'Material de Curas' },
  { value: 'inmovilizacion', label: 'Inmovilización' },
  { value: 'reanimacion', label: 'Reanimación' },
  { value: 'oxigenoterapia', label: 'Oxigenoterapia' },
]

export default function InventarioSocorrismoPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [familiaFilter, setFamiliaFilter] = useState('')

  const totalReferencias = articulos.length
  const bajoStock = articulos.filter(a => a.stock < 5).length
  const caducados = articulos.filter(a => a.caducidad && new Date(a.caducidad) < new Date()).length

  const articulosFiltrados = articulos.filter(articulo => {
    const matchesSearch = articulo.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFamilia = !familiaFilter || articulo.familia === familiaFilter
    return matchesSearch && matchesFamilia
  })

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
        <span className={item.stock < 5 ? 'text-red-500 font-medium' : ''}>{item.stock}</span>
      ),
    },
    { key: 'ubicacion', label: 'UBICACIÓN' },
    {
      key: 'caducidad',
      label: 'CADUCIDAD',
      render: (item: ArticuloInventario) => {
        if (!item.caducidad) return <span className="text-gray-400">-</span>
        const fecha = new Date(item.caducidad)
        return <span className={fecha < new Date() ? 'text-red-500 font-medium' : ''}>{fecha.toLocaleDateString('es-ES')}</span>
      },
    },
    { key: 'acciones', label: 'SOLICITAR', render: () => <Button variant="outline" size="sm">Solicitar</Button> },
  ]

  return (
    <>
      <Header showSearch={false} />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Inventario: Socorrismo</h1>
            <p className="page-subtitle">Control de material sanitario del área.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filtros</Button>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Nuevo Artículo</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard label="TOTAL REFERENCIAS" value={totalReferencias} />
          <StatCard label="BAJO STOCK" value={bajoStock} variant={bajoStock > 0 ? 'warning' : 'default'} />
          <StatCard label="CADUCADOS / PRÓX." value={caducados} variant={caducados > 0 ? 'danger' : 'default'} />
        </div>
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input isSearch placeholder="Buscar por nombre, familia..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="w-full md:w-48">
              <Select options={familias} value={familiaFilter} onChange={(e) => setFamiliaFilter(e.target.value)} />
            </div>
          </div>
        </div>
        <DataTable columns={columns} data={articulosFiltrados} emptyMessage="No se encontraron artículos con los filtros actuales." />
      </div>
    </>
  )
}
