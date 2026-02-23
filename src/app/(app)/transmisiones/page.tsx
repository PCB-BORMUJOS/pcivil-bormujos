'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, Plus, Search, Edit, Trash2, Eye, X, Save,
  Package, AlertTriangle, CheckCircle, ShoppingCart, Layers,
  Radio, Battery, BatteryCharging, BatteryLow, BatteryWarning, BatteryFull,
  Wrench, FileText, Calendar, Filter, Clock, History,
  ClipboardList, Send, ChevronDown, ChevronRight,
  MapPin, Settings, Info, Hash, Zap, Signal, Antenna,
  ArrowUpDown, BarChart3, Activity, Power, Plug
} from 'lucide-react'

interface Articulo { id: string; codigo?: string; nombre: string; descripcion?: string; stockActual: number; stockMinimo: number; unidad: string; familia?: { id: string; nombre: string } }
interface Familia { id: string; nombre: string; slug: string; _count?: { articulos: number } }
interface EquipoRadio { id: string; codigo: string; tipo: string; marca: string; modelo: string; numeroSerie?: string; configuracion: string; estado: string; estadoBateria?: number; fechaInstalacionBat?: string; ciclosCarga: number; ubicacion?: string; observaciones?: string }
interface MantenimientoEquipo { id: string; equipoId: string; tipo: string; descripcion: string; fecha: string; realizadoPor?: string; coste?: number; observaciones?: string }
interface CicloCarga { id: string; equipoId: string; fechaInicio: string; fechaFin?: string; duracionHoras?: number; nivelInicial?: number; nivelFinal?: number; observaciones?: string }

const ESTADOS_EQUIPO: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  en_uso: { label: 'En Uso', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  en_carga: { label: 'En Carga', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  averiado: { label: 'Averiado', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  mantenimiento: { label: 'Mantenimiento', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
}
const TIPOS_EQUIPO = [
  { value: 'portatil', label: 'Portátil (Walkie)', icon: Radio },
  { value: 'movil', label: 'Móvil (Emisora)', icon: Signal },
  { value: 'base', label: 'Base', icon: Antenna },
  { value: 'repetidor', label: 'Repetidor', icon: Activity },
]
const CONFIGURACIONES = [
  { value: 'analogico', label: 'Analógico' },
  { value: 'dmr', label: 'DMR (Digital)' },
  { value: 'tetra', label: 'TETRA' },
]
const TIPOS_MANTENIMIENTO = ['Revisión general', 'Reparación', 'Cambio de batería', 'Actualización firmware', 'Limpieza/ajuste', 'Calibración', 'Otro']
const ESTADOS_PETICION: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  en_compra: { label: 'En Compra', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ShoppingCart },
  recibida: { label: 'Recibida', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Package },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-200', icon: X },
}
const PRIORIDADES: Record<string, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'bg-slate-100 text-slate-700' }, normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-amber-100 text-amber-700' }, urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
}

function BateriaIndicador({ nivel }: { nivel?: number }) {
  if (nivel === undefined || nivel === null) return <span className="text-xs text-slate-400">Sin datos</span>
  const color = nivel >= 75 ? 'bg-emerald-500' : nivel >= 50 ? 'bg-blue-500' : nivel >= 25 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = nivel >= 75 ? 'text-emerald-700' : nivel >= 50 ? 'text-blue-700' : nivel >= 25 ? 'text-amber-700' : 'text-red-700'
  const BatIcon = nivel >= 75 ? BatteryFull : nivel >= 50 ? Battery : nivel >= 25 ? BatteryLow : BatteryWarning
  return (
    <div className="flex items-center gap-2">
      <BatIcon className={`w-4 h-4 ${textColor}`} />
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-16"><div className={`h-full rounded-full ${color}`} style={{ width: `${nivel}%` }} /></div>
      <span className={`text-xs font-bold ${textColor}`}>{nivel}%</span>
    </div>
  )
}

export default function TransmisionesPage() {
  const { data: session } = useSession()
  const [mainTab, setMainTab] = useState<'inventario' | 'equipos'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [detalleTab, setDetalleTab] = useState<'ficha' | 'bateria' | 'mantenimiento'>('ficha')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [peticiones, setPeticiones] = useState<any[]>([])
  const [equipos, setEquipos] = useState<EquipoRadio[]>([])
  const [mantenimientos, setMantenimientos] = useState<MantenimientoEquipo[]>([])
  const [ciclosCarga, setCiclosCarga] = useState<CicloCarga[]>([])
  const [categoriaArea, setCategoriaArea] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState('all')
  const [filtroTipoEquipo, setFiltroTipoEquipo] = useState('all')
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showEditarArticulo, setShowEditarArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoEquipo, setShowNuevoEquipo] = useState(false)
  const [showEditarEquipo, setShowEditarEquipo] = useState(false)
  const [showDetalleEquipo, setShowDetalleEquipo] = useState(false)
  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false)
  const [showNuevoCiclo, setShowNuevoCiclo] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoRadio | null>(null)
  const [nuevaFamilia, setNuevaFamilia] = useState('')
  const [familiaEditando, setFamiliaEditando] = useState<string | null>(null)
  const [familiaEditandoNombre, setFamiliaEditandoNombre] = useState('')

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const [resEq, resInv, resCat] = await Promise.all([fetch('/api/logistica?tipo=equipos-radio'), fetch('/api/logistica?inventario=transmisiones'), fetch('/api/logistica?tipo=categoria&slug=transmisiones')])
      const dataEq = await resEq.json(); const dataInv = await resInv.json(); const dataCat = await resCat.json()
      setEquipos(dataEq.equipos || []); setArticulos(dataInv.articulos || []); setFamilias(dataInv.familias || [])
      if (dataCat.categoria) setCategoriaArea(dataCat.categoria.id)
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }, [])
  const cargarPeticiones = useCallback(async () => { try { const r = await fetch('/api/logistica/peticiones?area=transmisiones'); const d = await r.json(); setPeticiones(d.peticiones || []) } catch (e) { console.error(e) } }, [])
  const cargarMantenimientos = useCallback(async (eqId: string) => { try { const r = await fetch(`/api/logistica?tipo=mantenimientos-equipo&equipoId=${eqId}`); const d = await r.json(); setMantenimientos(d.mantenimientos || []) } catch (e) { console.error(e) } }, [])
  const cargarCiclos = useCallback(async (eqId: string) => { try { const r = await fetch(`/api/logistica?tipo=ciclos-carga&equipoId=${eqId}`); const d = await r.json(); setCiclosCarga(d.ciclos || []) } catch (e) { console.error(e) } }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab, cargarPeticiones])
  useEffect(() => { if (equipoSeleccionado && showDetalleEquipo) { cargarMantenimientos(equipoSeleccionado.id); cargarCiclos(equipoSeleccionado.id) } }, [equipoSeleccionado, showDetalleEquipo, cargarMantenimientos, cargarCiclos])

  const handleCrearArticulo = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', codigo: f.get('codigo'), nombre: f.get('nombre'), descripcion: f.get('descripcion'), stockActual: parseInt(f.get('stockActual') as string) || 0, stockMinimo: parseInt(f.get('stockMinimo') as string) || 0, unidad: f.get('unidad') || 'unidades', familiaId: f.get('familiaId') }) }); if (r.ok) { setShowNuevoArticulo(false); cargarDatos() } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const handleEditarArticulo = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!articuloSeleccionado) return; const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', id: articuloSeleccionado.id, codigo: f.get('codigo'), nombre: f.get('nombre'), descripcion: f.get('descripcion'), stockActual: parseInt(f.get('stockActual') as string) || 0, stockMinimo: parseInt(f.get('stockMinimo') as string) || 0, unidad: f.get('unidad') || 'unidades', familiaId: f.get('familiaId') }) }); if (r.ok) { setShowEditarArticulo(false); setArticuloSeleccionado(null); cargarDatos() } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const handleCrearPeticion = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'peticion', articuloId: f.get('articuloId') || null, nombreArticulo: f.get('nombreArticulo'), cantidad: parseInt(f.get('cantidad') as string) || 1, unidad: f.get('unidad') || 'unidades', prioridad: f.get('prioridad') || 'normal', descripcion: f.get('descripcion'), areaOrigen: 'transmisiones' }) }); if (r.ok) { setShowNuevaPeticion(false); cargarPeticiones() } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const handleCrearFamilia = async () => { if (!nuevaFamilia.trim() || !categoriaArea) return; try { const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', nombre: nuevaFamilia.trim(), categoriaId: categoriaArea }) }); if (r.ok) { setNuevaFamilia(''); cargarDatos() } } catch (e) { console.error(e) } }
  const handleEditarFamilia = async (id: string) => { if (!familiaEditandoNombre.trim()) return; try { const r = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', id, nombre: familiaEditandoNombre.trim() }) }); if (r.ok) { setFamiliaEditando(null); cargarDatos() } } catch (e) { console.error(e) } }
  const handleEliminarFamilia = async (id: string) => { if (!confirm('¿Eliminar esta familia?')) return; try { await fetch(`/api/logistica?tipo=familia&id=${id}`, { method: 'DELETE' }); cargarDatos() } catch (e) { console.error(e) } }
  const handleCrearEquipo = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'equipo-radio', codigo: f.get('codigo'), tipoEquipo: f.get('tipoEquipo'), marca: f.get('marca'), modelo: f.get('modelo'), numeroSerie: f.get('numeroSerie'), configuracion: f.get('configuracion'), estado: f.get('estado') || 'disponible', estadoBateria: parseInt(f.get('estadoBateria') as string) || null, ubicacion: f.get('ubicacion'), observaciones: f.get('observaciones') }) }); if (r.ok) { setShowNuevoEquipo(false); cargarDatos() } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const handleEditarEquipo = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!equipoSeleccionado) return; const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'equipo-radio', id: equipoSeleccionado.id, codigo: f.get('codigo'), tipoEquipo: f.get('tipoEquipo'), marca: f.get('marca'), modelo: f.get('modelo'), numeroSerie: f.get('numeroSerie'), configuracion: f.get('configuracion'), estado: f.get('estado'), estadoBateria: parseInt(f.get('estadoBateria') as string) || null, ubicacion: f.get('ubicacion'), observaciones: f.get('observaciones') }) }); if (r.ok) { setShowEditarEquipo(false); setShowDetalleEquipo(false); setEquipoSeleccionado(null); cargarDatos() } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const handleEliminarEquipo = async (id: string) => { if (!confirm('¿Eliminar este equipo?')) return; try { await fetch(`/api/logistica?tipo=equipo-radio&id=${id}`, { method: 'DELETE' }); setShowDetalleEquipo(false); cargarDatos() } catch (e) { console.error(e) } }
  const handleNuevoMantenimiento = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!equipoSeleccionado) return; const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'mantenimiento-equipo', equipoId: equipoSeleccionado.id, tipoMantenimiento: f.get('tipoMantenimiento'), descripcion: f.get('descripcion'), fecha: f.get('fecha'), realizadoPor: f.get('realizadoPor'), coste: parseFloat(f.get('coste') as string) || null, observaciones: f.get('observaciones') }) }); if (r.ok) { setShowNuevoMantenimiento(false); cargarMantenimientos(equipoSeleccionado.id) } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const handleNuevoCiclo = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!equipoSeleccionado) return; const f = new FormData(e.currentTarget); try { setSaving(true); const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'ciclo-carga', equipoId: equipoSeleccionado.id, fechaInicio: f.get('fechaInicio'), fechaFin: f.get('fechaFin') || null, duracionHoras: parseFloat(f.get('duracionHoras') as string) || null, nivelInicial: parseInt(f.get('nivelInicial') as string) || null, nivelFinal: parseInt(f.get('nivelFinal') as string) || null, observaciones: f.get('observaciones') }) }); if (r.ok) { setShowNuevoCiclo(false); cargarCiclos(equipoSeleccionado.id); cargarDatos() } } catch (e) { console.error(e) } finally { setSaving(false) } }
  const abrirDetalleEquipo = (eq: EquipoRadio) => { setEquipoSeleccionado(eq); setDetalleTab('ficha'); setShowDetalleEquipo(true) }

  const articulosFiltrados = articulos.filter(a => { const ms = !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase())); return ms && (selectedFamiliaFilter === 'all' || a.familia?.id === selectedFamiliaFilter) })
  const peticionesFiltradas = peticiones.filter(p => filtroPeticiones === 'all' || p.estado === filtroPeticiones)
  const equiposFiltrados = equipos.filter(eq => (filtroEstadoEquipo === 'all' || eq.estado === filtroEstadoEquipo) && (filtroTipoEquipo === 'all' || eq.tipo === filtroTipoEquipo))
  const stats = { totalArticulos: articulos.length, stockBajo: articulos.filter(a => a.stockActual <= a.stockMinimo).length, totalEquipos: equipos.length, bateriaBaja: equipos.filter(e => e.estadoBateria !== undefined && e.estadoBateria !== null && e.estadoBateria < 30).length, averiados: equipos.filter(e => e.estado === 'averiado').length }

  if (loading) return (<div className="flex items-center justify-center h-96"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-purple-500 animate-spin" /><p className="text-slate-500 font-medium">Cargando Transmisiones...</p></div></div>)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-xl"><Radio className="w-7 h-7 text-purple-600" /></div>
          <div>
            <p className="text-sm font-bold text-purple-600 uppercase tracking-wide">TRANSMISIONES</p>
            <h1 className="text-2xl font-bold text-slate-800">Equipos de Comunicación</h1>
            <p className="text-sm text-slate-500">Radios, emisoras, repetidores y gestión de baterías</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargarDatos} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Recargar"><RefreshCw className="w-5 h-5" /></button>
          <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold transition-colors shadow-sm"><ShoppingCart className="w-4 h-4" />Petición</button>
          <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-semibold transition-colors shadow-sm"><Plus className="w-4 h-4" />Artículo</button>
          <button onClick={() => setShowNuevoEquipo(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold transition-colors shadow-sm"><Radio className="w-4 h-4" />Equipo</button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Material del Área', value: stats.totalArticulos, icon: Package, iconBg: 'bg-violet-100', iconColor: 'text-violet-500' },
          { label: 'Stock Bajo', value: stats.stockBajo, icon: AlertTriangle, iconBg: 'bg-amber-100', iconColor: 'text-amber-500' },
          { label: 'Equipos Radio', value: stats.totalEquipos, icon: Radio, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
          { label: 'Batería Baja', value: stats.bateriaBaja, icon: BatteryWarning, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
          { label: 'Averiados', value: stats.averiados, icon: Wrench, iconBg: 'bg-amber-100', iconColor: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{s.label}</span>
              <div className={`p-2 rounded-xl ${s.iconBg}`}><s.icon className={`w-5 h-5 ${s.iconColor}`} /></div>
            </div>
            <p className="text-4xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* MAIN TABS */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { key: 'inventario', label: 'Inventario del Área', icon: Package },
            { key: 'equipos', label: 'Equipos de Radio', icon: Radio },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)} className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === tab.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: INVENTARIO */}
      {mainTab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex gap-6 border-b border-slate-100">
            {[
              { key: 'stock', label: 'Stock', icon: Package },
              { key: 'peticiones', label: 'Peticiones', icon: ShoppingCart },
              { key: 'movimientos', label: 'Movimientos', icon: History },
            ].map(tab => (
              <button key={tab.key} onClick={() => setInventoryTab(tab.key as any)} className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${inventoryTab === tab.key ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>

          {inventoryTab === 'stock' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Buscar artículos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                </div>
                <select value={selectedFamiliaFilter} onChange={e => setSelectedFamiliaFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                  <option value="all">Todas las familias</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
                <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors"><Layers className="w-4 h-4" />Familias</button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Artículo</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Familia</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {articulosFiltrados.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-16 text-slate-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No hay artículos registrados</p></td></tr>
                  ) : articulosFiltrados.map(art => (
                    <tr key={art.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4"><p className="font-medium text-slate-800">{art.nombre}</p>{art.codigo && <p className="text-xs text-slate-400 mt-0.5">{art.codigo}</p>}</td>
                      <td className="px-5 py-4 text-slate-500">{art.familia?.nombre || '-'}</td>
                      <td className="px-5 py-4 text-center"><span className={`text-lg font-bold ${art.stockActual <= art.stockMinimo ? 'text-red-600' : 'text-slate-800'}`}>{art.stockActual}</span><span className="text-slate-400 text-xs ml-1">/ {art.stockMinimo}</span></td>
                      <td className="px-5 py-4 text-center">{art.stockActual <= art.stockMinimo ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" />Bajo</span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" />OK</span>}</td>
                      <td className="px-5 py-4 text-right"><button onClick={() => { setArticuloSeleccionado(art); setShowEditarArticulo(true) }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {inventoryTab === 'peticiones' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-slate-600">Filtrar:</span>
                <button onClick={() => setFiltroPeticiones('all')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroPeticiones === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todas</button>
                {Object.entries(ESTADOS_PETICION).map(([k, v]) => (<button key={k} onClick={() => setFiltroPeticiones(k)} className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filtroPeticiones === k ? 'bg-slate-800 text-white border-slate-800' : v.color}`}>{v.label}</button>))}
              </div>
              <div className="divide-y divide-slate-50">
                {peticionesFiltradas.length === 0 ? (
                  <div className="text-center py-16 text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No hay peticiones</p></div>
                ) : peticionesFiltradas.map(pet => {
                  const est = ESTADOS_PETICION[pet.estado] || ESTADOS_PETICION.pendiente; const pri = PRIORIDADES[pet.prioridad] || PRIORIDADES.normal; const EI = est.icon
                  return (
                    <div key={pet.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-slate-400">{pet.numero}</span><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${est.color}`}><EI className="w-3 h-3" />{est.label}</span><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${pri.color}`}>{pri.label}</span></div>
                      <p className="font-medium text-slate-800">{pet.nombreArticulo}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{pet.cantidad} {pet.unidad} · {new Date(pet.fechaSolicitud).toLocaleDateString('es-ES')}</p>
                      {pet.descripcion && <p className="text-sm text-slate-400 mt-1">{pet.descripcion}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {inventoryTab === 'movimientos' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400"><History className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Historial de movimientos</p><p className="text-sm mt-1">Los movimientos de stock se registrarán aquí</p></div>
          )}
        </div>
      )}

      {/* TAB: EQUIPOS DE RADIO */}
      {mainTab === 'equipos' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Estado:</span>
            <button onClick={() => setFiltroEstadoEquipo('all')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroEstadoEquipo === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
            {Object.entries(ESTADOS_EQUIPO).map(([k, v]) => (<button key={k} onClick={() => setFiltroEstadoEquipo(k)} className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filtroEstadoEquipo === k ? 'bg-slate-800 text-white border-slate-800' : `${v.bg} ${v.color}`}`}>{v.label}</button>))}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <span className="text-sm font-medium text-slate-600">Tipo:</span>
            <button onClick={() => setFiltroTipoEquipo('all')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroTipoEquipo === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
            {TIPOS_EQUIPO.map(t => (<button key={t.value} onClick={() => setFiltroTipoEquipo(t.value)} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroTipoEquipo === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.label}</button>))}
          </div>
          {/* Tabla equipos */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuración</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Batería</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {equiposFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400"><Radio className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No hay equipos registrados</p></td></tr>
                ) : equiposFiltrados.map(eq => {
                  const est = ESTADOS_EQUIPO[eq.estado] || ESTADOS_EQUIPO.disponible
                  const tipoInfo = TIPOS_EQUIPO.find(t => t.value === eq.tipo)
                  const TipoIcon = tipoInfo?.icon || Radio
                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => abrirDetalleEquipo(eq)}>
                      <td className="px-5 py-4"><span className="font-bold text-purple-600 text-base">{eq.codigo}</span></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2 text-slate-600"><TipoIcon className="w-4 h-4 text-slate-400" />{tipoInfo?.label || eq.tipo}</div></td>
                      <td className="px-5 py-4"><p className="font-medium text-slate-800">{eq.marca} {eq.modelo}</p>{eq.numeroSerie && <p className="text-xs text-slate-400 mt-0.5">S/N: {eq.numeroSerie}</p>}</td>
                      <td className="px-5 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{CONFIGURACIONES.find(c => c.value === eq.configuracion)?.label || eq.configuracion}</span></td>
                      <td className="px-5 py-4"><BateriaIndicador nivel={eq.estadoBateria ?? undefined} /></td>
                      <td className="px-5 py-4 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${est.bg} ${est.color}`}>{est.label}</span></td>
                      <td className="px-5 py-4 text-right"><button onClick={e => { e.stopPropagation(); abrirDetalleEquipo(eq) }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: DETALLE EQUIPO */}
      {/* ============================================ */}
      {showDetalleEquipo && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowDetalleEquipo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 rounded-xl"><Radio className="w-5 h-5 text-purple-600" /></div>
                <div><h3 className="text-lg font-semibold text-slate-800">{equipoSeleccionado.codigo}</h3><p className="text-sm text-slate-500">{equipoSeleccionado.marca} {equipoSeleccionado.modelo}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowEditarEquipo(true) }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleEliminarEquipo(equipoSeleccionado.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setShowDetalleEquipo(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            {/* Tabs detalle */}
            <div className="flex gap-4 px-6 pt-4 border-b border-slate-100">
              {[
                { key: 'ficha', label: 'Ficha Técnica', icon: FileText },
                { key: 'bateria', label: 'Batería y Cargas', icon: Battery },
                { key: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
              ].map(tab => (
                <button key={tab.key} onClick={() => setDetalleTab(tab.key as any)} className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${detalleTab === tab.key ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </div>
            <div className="p-6">
              {/* TAB FICHA */}
              {detalleTab === 'ficha' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Tipo', value: TIPOS_EQUIPO.find(t => t.value === equipoSeleccionado.tipo)?.label || equipoSeleccionado.tipo },
                      { label: 'Configuración', value: CONFIGURACIONES.find(c => c.value === equipoSeleccionado.configuracion)?.label || equipoSeleccionado.configuracion },
                      { label: 'Marca', value: equipoSeleccionado.marca },
                      { label: 'Modelo', value: equipoSeleccionado.modelo },
                      { label: 'Nº Serie', value: equipoSeleccionado.numeroSerie || 'Sin registrar' },
                      { label: 'Estado', value: ESTADOS_EQUIPO[equipoSeleccionado.estado]?.label || equipoSeleccionado.estado },
                      { label: 'Ubicación', value: equipoSeleccionado.ubicacion || 'Sin asignar' },
                      { label: 'Ciclos de Carga', value: `${equipoSeleccionado.ciclosCarga} ciclos` },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-sm font-medium text-slate-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {equipoSeleccionado.observaciones && (
                    <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Observaciones</p><p className="text-sm text-slate-700">{equipoSeleccionado.observaciones}</p></div>
                  )}
                </div>
              )}
              {/* TAB BATERÍA Y CARGAS */}
              {detalleTab === 'bateria' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-800">Estado de Batería</h4>
                      <BateriaIndicador nivel={equipoSeleccionado.estadoBateria ?? undefined} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div><p className="text-xs text-slate-500">Salud</p><p className="text-lg font-bold text-slate-800">{equipoSeleccionado.estadoBateria ?? '-'}%</p></div>
                      <div><p className="text-xs text-slate-500">Ciclos Totales</p><p className="text-lg font-bold text-slate-800">{equipoSeleccionado.ciclosCarga}</p></div>
                      <div><p className="text-xs text-slate-500">Instalación</p><p className="text-sm font-medium text-slate-800">{equipoSeleccionado.fechaInstalacionBat ? new Date(equipoSeleccionado.fechaInstalacionBat).toLocaleDateString('es-ES') : 'Sin datos'}</p></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">Historial de Cargas</h4>
                    <button onClick={() => setShowNuevoCiclo(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"><BatteryCharging className="w-4 h-4" />Registrar Carga</button>
                  </div>
                  {ciclosCarga.length === 0 ? (
                    <div className="text-center py-8 text-slate-400"><BatteryCharging className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay cargas registradas</p></div>
                  ) : (
                    <div className="space-y-2">
                      {ciclosCarga.map(c => (
                        <div key={c.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                          <div className="p-2 bg-amber-100 rounded-lg"><Plug className="w-4 h-4 text-amber-600" /></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 text-sm"><span className="text-slate-800 font-medium">{new Date(c.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>{c.duracionHoras && <span className="text-slate-500">{c.duracionHoras}h</span>}</div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              {c.nivelInicial !== null && c.nivelInicial !== undefined && <span>Inicio: {c.nivelInicial}%</span>}
                              {c.nivelFinal !== null && c.nivelFinal !== undefined && <span>Final: {c.nivelFinal}%</span>}
                              {c.observaciones && <span className="text-slate-400">· {c.observaciones}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* TAB MANTENIMIENTO */}
              {detalleTab === 'mantenimiento' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">Historial de Mantenimiento</h4>
                    <button onClick={() => setShowNuevoMantenimiento(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"><Wrench className="w-4 h-4" />Nuevo</button>
                  </div>
                  {mantenimientos.length === 0 ? (
                    <div className="text-center py-8 text-slate-400"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay mantenimientos registrados</p></div>
                  ) : (
                    <div className="space-y-2">
                      {mantenimientos.map(m => (
                        <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                          <div className="p-2 bg-purple-100 rounded-lg"><Wrench className="w-4 h-4 text-purple-600" /></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2"><span className="font-medium text-slate-800">{m.tipo}</span>{m.coste && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{m.coste.toFixed(2)}€</span>}</div>
                            <p className="text-sm text-slate-600 mt-0.5">{m.descripcion}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                              <span>{new Date(m.fecha).toLocaleDateString('es-ES')}</span>
                              {m.realizadoPor && <span>Por: {m.realizadoPor}</span>}
                              {m.observaciones && <span>· {m.observaciones}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: NUEVO / EDITAR ARTÍCULO */}
      {/* ============================================ */}
      {(showNuevoArticulo || showEditarArticulo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => { setShowNuevoArticulo(false); setShowEditarArticulo(false); setArticuloSeleccionado(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">{showEditarArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
              <button onClick={() => { setShowNuevoArticulo(false); setShowEditarArticulo(false); setArticuloSeleccionado(null) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={showEditarArticulo ? handleEditarArticulo : handleCrearArticulo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Código</label><input name="codigo" defaultValue={articuloSeleccionado?.codigo || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" placeholder="TR-001" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unidad</label><select name="unidad" defaultValue={articuloSeleccionado?.unidad || 'unidades'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="unidades">Unidades</option><option value="pares">Pares</option><option value="cajas">Cajas</option><option value="rollos">Rollos</option><option value="metros">Metros</option></select></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label><input name="nombre" required defaultValue={articuloSeleccionado?.nombre || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label><textarea name="descripcion" rows={2} defaultValue={articuloSeleccionado?.descripcion || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Familia *</label><select name="familiaId" required defaultValue={articuloSeleccionado?.familia?.id || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Stock Actual</label><input name="stockActual" type="number" defaultValue={articuloSeleccionado?.stockActual || 0} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Stock Mínimo</label><input name="stockMinimo" type="number" defaultValue={articuloSeleccionado?.stockMinimo || 0} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevoArticulo(false); setShowEditarArticulo(false); setArticuloSeleccionado(null) }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: NUEVA PETICIÓN */}
      {/* ============================================ */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevaPeticion(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Nueva Petición de Material</h3>
              <button onClick={() => setShowNuevaPeticion(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCrearPeticion} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Artículo existente (opcional)</label><select name="articuloId" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="">Material no inventariado</option>{articulos.map(a => <option key={a.id} value={a.id}>{a.nombre} (Stock: {a.stockActual})</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Material *</label><input name="nombreArticulo" required className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad *</label><input name="cantidad" type="number" min={1} defaultValue={1} required className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unidad</label><select name="unidad" defaultValue="unidades" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="unidades">Unidades</option><option value="cajas">Cajas</option><option value="rollos">Rollos</option></select></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prioridad</label><select name="prioridad" defaultValue="normal" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción / Motivo</label><textarea name="descripcion" rows={3} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" placeholder="Motivo de la solicitud..." /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevaPeticion(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">{saving ? 'Creando...' : 'Crear Petición'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: GESTIÓN DE FAMILIAS */}
      {/* ============================================ */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowGestionFamilias(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Gestión de Familias</h3>
              <button onClick={() => setShowGestionFamilias(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input type="text" value={nuevaFamilia} onChange={e => setNuevaFamilia(e.target.value)} placeholder="Nueva familia..." className="flex-1 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" onKeyDown={e => e.key === 'Enter' && handleCrearFamilia()} />
                <button onClick={handleCrearFamilia} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {familias.length === 0 ? <p className="text-center text-sm text-slate-400 py-4">No hay familias creadas</p> : familias.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    {familiaEditando === f.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="text" value={familiaEditandoNombre} onChange={e => setFamiliaEditandoNombre(e.target.value)} className="flex-1 border border-slate-200 rounded-lg py-1.5 px-2.5 text-sm" onKeyDown={e => e.key === 'Enter' && handleEditarFamilia(f.id)} autoFocus />
                        <button onClick={() => handleEditarFamilia(f.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setFamiliaEditando(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <div><span className="font-medium text-slate-800 text-sm">{f.nombre}</span><span className="text-xs text-slate-400 ml-2">{f._count?.articulos || 0} artículos</span></div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setFamiliaEditando(f.id); setFamiliaEditandoNombre(f.nombre) }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarFamilia(f.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: NUEVO / EDITAR EQUIPO */}
      {/* ============================================ */}
      {(showNuevoEquipo || showEditarEquipo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => { setShowNuevoEquipo(false); setShowEditarEquipo(false) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">{showEditarEquipo ? 'Editar Equipo' : 'Nuevo Equipo de Radio'}</h3>
              <button onClick={() => { setShowNuevoEquipo(false); setShowEditarEquipo(false) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={showEditarEquipo ? handleEditarEquipo : handleCrearEquipo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Código *</label><input name="codigo" required defaultValue={equipoSeleccionado?.codigo || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" placeholder="TR-01" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo *</label><select name="tipoEquipo" required defaultValue={equipoSeleccionado?.tipo || 'portatil'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{TIPOS_EQUIPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Marca *</label><input name="marca" required defaultValue={equipoSeleccionado?.marca || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Modelo *</label><input name="modelo" required defaultValue={equipoSeleccionado?.modelo || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nº Serie</label><input name="numeroSerie" defaultValue={equipoSeleccionado?.numeroSerie || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Configuración *</label><select name="configuracion" required defaultValue={equipoSeleccionado?.configuracion || 'analogico'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{CONFIGURACIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label><select name="estado" defaultValue={equipoSeleccionado?.estado || 'disponible'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{Object.entries(ESTADOS_EQUIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Batería (%)</label><input name="estadoBateria" type="number" min={0} max={100} defaultValue={equipoSeleccionado?.estadoBateria || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ubicación</label><input name="ubicacion" defaultValue={equipoSeleccionado?.ubicacion || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" placeholder="Base PC, Vehículo FSV..." /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label><textarea name="observaciones" rows={2} defaultValue={equipoSeleccionado?.observaciones || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNuevoEquipo(false); setShowEditarEquipo(false) }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: NUEVO MANTENIMIENTO */}
      {/* ============================================ */}
      {showNuevoMantenimiento && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevoMantenimiento(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div><h3 className="text-lg font-semibold text-slate-800">Nuevo Mantenimiento</h3><p className="text-sm text-slate-500">Equipo: {equipoSeleccionado.codigo}</p></div>
              <button onClick={() => setShowNuevoMantenimiento(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleNuevoMantenimiento} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Mantenimiento *</label><select name="tipoMantenimiento" required className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{TIPOS_MANTENIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción *</label><textarea name="descripcion" required rows={3} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" placeholder="Detalle del mantenimiento realizado..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label><input name="fecha" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Realizado por</label><input name="realizadoPor" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Coste (€)</label><input name="coste" type="number" step="0.01" min={0} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label><input name="observaciones" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevoMantenimiento(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: NUEVO CICLO DE CARGA */}
      {/* ============================================ */}
      {showNuevoCiclo && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevoCiclo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div><h3 className="text-lg font-semibold text-slate-800">Registrar Ciclo de Carga</h3><p className="text-sm text-slate-500">Equipo: {equipoSeleccionado.codigo}</p></div>
              <button onClick={() => setShowNuevoCiclo(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleNuevoCiclo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Inicio Carga *</label><input name="fechaInicio" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fin Carga</label><input name="fechaFin" type="datetime-local" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">% Inicial</label><input name="nivelInicial" type="number" min={0} max={100} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="0-100" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">% Final</label><input name="nivelFinal" type="number" min={0} max={100} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="0-100" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duración (h)</label><input name="duracionHoras" type="number" step="0.5" min={0} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label><textarea name="observaciones" rows={2} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNuevoCiclo(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
