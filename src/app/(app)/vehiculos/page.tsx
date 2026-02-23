'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, Plus, Search, Edit, Trash2, Eye, X, Save,
  Package, AlertTriangle, CheckCircle, ShoppingCart, Layers,
  Truck, Car, Wrench, FileText, Calendar, Filter,
  ClipboardList, Send, History, ChevronDown, ChevronRight,
  Fuel, Droplets, Gauge, MapPin, Navigation, Clock,
  Shield, FileCheck, Upload, Download, MoreVertical,
  ThermometerSun, Activity, CircleDot, Route, Waypoints,
  ArrowUpDown, BarChart3, Settings, Info, Hash
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false })

interface Articulo { id: string; codigo?: string; nombre: string; descripcion?: string; stockActual: number; stockMinimo: number; unidad: string; familia?: { id: string; nombre: string } }
interface Familia { id: string; nombre: string; slug: string; _count?: { articulos: number } }
interface Vehiculo { id: string; indicativo: string; matricula: string; tipo: string; marca: string; modelo: string; anio?: number; color?: string; numeroChasis?: string; bastidor?: string; capacidadCombustible?: number; capacidadCarga?: number; plazas?: number; potencia?: number; cilindrada?: number; kmActual?: number; estado: string; latitud?: number; longitud?: number; observaciones?: string; nivelAceite?: string; nivelRefrigerante?: string; nivelDireccion?: string; nivelLimpiaparabrisas?: string; nivelAdblue?: string; nivelLiquidoFrenos?: string; ultimoCambioAceite?: string; kmUltimoCambioAceite?: number; proximoCambioAceite?: number }
interface Documento { id: string; tipo: string; nombre: string; url: string; fechaSubida: string; fechaCaducidad?: string; usuario?: { nombre: string; apellidos: string } }
interface Mantenimiento { id: string; fecha: string; tipo: string; descripcion: string; kilometraje?: number; coste?: number; proximaRevision?: string; realizadoPor?: string; observaciones?: string }
interface Repostaje { id: string; fecha: string; vehiculoId: string; litros: number; precioLitro?: number; costeTotal?: number; kilometraje: number; tipoCarburante: string; gasolinera?: string; usuario?: { nombre: string; apellidos: string } }
interface RegistroFluido { id: string; fecha: string; vehiculoId: string; tipoFluido: string; accion: string; cantidad?: number; unidad?: string; kilometraje?: number; observaciones?: string; usuario?: { nombre: string; apellidos: string } }

const ESTADOS_VEHICULO: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  en_servicio: { label: 'En Servicio', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  en_taller: { label: 'En Taller', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  reservado: { label: 'Reservado', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
}

const TIPOS_VEHICULO: Record<string, string> = { furgoneta: 'Furgoneta', turismo: 'Turismo', pickup: 'Pick-Up', remolque: 'Remolque', todoterreno: 'Todoterreno', ambulancia: 'Ambulancia', camion: 'Camión' }
const TIPOS_DOCUMENTO = ['ITV', 'Seguro', 'Permiso de circulación', 'Ficha técnica', 'Tarjeta de transporte', 'Otro']
const TIPOS_MANTENIMIENTO = ['Revisión general', 'Cambio de aceite', 'Cambio de filtros', 'Cambio de neumáticos', 'Reparación mecánica', 'Reparación eléctrica', 'Reparación carrocería', 'ITV', 'Otro']
const TIPOS_FLUIDO = [
  { value: 'aceite_motor', label: 'Aceite de motor', icon: Droplets },
  { value: 'refrigerante', label: 'Líquido refrigerante', icon: ThermometerSun },
  { value: 'direccion', label: 'Líquido de dirección', icon: Navigation },
  { value: 'frenos', label: 'Líquido de frenos', icon: CircleDot },
  { value: 'limpiaparabrisas', label: 'Líquido limpiaparabrisas', icon: Droplets },
  { value: 'adblue', label: 'AdBlue / Urea', icon: Droplets },
  { value: 'filtro_particulas', label: 'Aditivo filtro partículas', icon: Filter },
  { value: 'inyectores', label: 'Limpiador de inyectores', icon: Activity },
]
const NIVELES = [
  { value: 'lleno', label: 'Lleno', color: 'bg-emerald-500' },
  { value: 'ok', label: 'Correcto', color: 'bg-blue-500' },
  { value: 'bajo', label: 'Bajo', color: 'bg-amber-500' },
  { value: 'critico', label: 'Crítico', color: 'bg-red-500' },
  { value: 'no_aplica', label: 'N/A', color: 'bg-slate-300' },
]
const ESTADOS_PETICION: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  en_compra: { label: 'En Compra', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ShoppingCart },
  recibida: { label: 'Recibida', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Package },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-200', icon: X },
}
const PRIORIDADES: Record<string, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-amber-100 text-amber-700' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
}

function createVehicleIcon(estado: string) {
  if (typeof window === 'undefined') return undefined
  const L = require('leaflet')
  const colors: Record<string, string> = { disponible: '#10b981', en_servicio: '#3b82f6', en_taller: '#f59e0b', fuera_servicio: '#ef4444', reservado: '#8b5cf6' }
  const color = colors[estado] || '#6b7280'
  return L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20],
  })
}

function NivelIndicador({ nivel }: { nivel?: string }) {
  const nivelInfo = NIVELES.find(n => n.value === nivel) || NIVELES[4]
  return (<div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${nivelInfo.color}`} /><span className="text-sm text-slate-600">{nivelInfo.label}</span></div>)
}

export default function VehiculosPage() {
  const { data: session } = useSession()
  const [mainTab, setMainTab] = useState<'inventario' | 'flota' | 'documentacion' | 'localizacion'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [vehicleDetailTab, setVehicleDetailTab] = useState<'ficha' | 'niveles' | 'repostajes' | 'documentos' | 'mantenimiento'>('ficha')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [peticiones, setPeticiones] = useState<any[]>([])
  const [categoriaArea, setCategoriaArea] = useState<string | null>(null)
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [repostajes, setRepostajes] = useState<Repostaje[]>([])
  const [registrosFluidos, setRegistrosFluidos] = useState<RegistroFluido[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')
  const [filtroEstadoVehiculo, setFiltroEstadoVehiculo] = useState('all')
  const [filtroVehiculo, setFiltroVehiculo] = useState('all')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [showDetalleVehiculo, setShowDetalleVehiculo] = useState(false)
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showEditarArticulo, setShowEditarArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showNuevoRepostaje, setShowNuevoRepostaje] = useState(false)
  const [showNuevoFluido, setShowNuevoFluido] = useState(false)
  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false)
  const [showSubirDocumento, setShowSubirDocumento] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [nuevaFamilia, setNuevaFamilia] = useState('')
  const [familiaEditando, setFamiliaEditando] = useState<string | null>(null)
  const [familiaEditandoNombre, setFamiliaEditandoNombre] = useState('')

  // DATA LOADING
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const [resVeh, resInv, resCat] = await Promise.all([
        fetch('/api/vehiculos'),
        fetch('/api/logistica?inventario=vehiculos'),
        fetch('/api/logistica?tipo=categoria&slug=vehiculos'),
      ])
      const dataVeh = await resVeh.json()
      const dataInv = await resInv.json()
      const dataCat = await resCat.json()
      setVehiculos(dataVeh.vehiculos || dataVeh || [])
      setArticulos(dataInv.articulos || [])
      setFamilias(dataInv.familias || [])
      if (dataCat.categoria) setCategoriaArea(dataCat.categoria.id)
    } catch (error) { console.error('Error cargando datos:', error) }
    finally { setLoading(false) }
  }, [])

  const cargarPeticiones = useCallback(async () => {
    try { const res = await fetch('/api/logistica/peticiones?area=vehiculos'); const data = await res.json(); setPeticiones(data.peticiones || []) }
    catch (error) { console.error('Error:', error) }
  }, [])

  const cargarDocumentos = useCallback(async (vid: string) => {
    try { const res = await fetch(`/api/vehiculos?tipo=documentos&vehiculoId=${vid}`); const data = await res.json(); setDocumentos(data.documentos || []) }
    catch (error) { console.error('Error:', error) }
  }, [])

  const cargarMantenimientos = useCallback(async (vid: string) => {
    try { const res = await fetch(`/api/vehiculos?tipo=mantenimientos&vehiculoId=${vid}`); const data = await res.json(); setMantenimientos(data.mantenimientos || []) }
    catch (error) { console.error('Error:', error) }
  }, [])

  const cargarRepostajes = useCallback(async (vid: string) => {
    try { const res = await fetch(`/api/vehiculos?tipo=repostajes&vehiculoId=${vid}`); const data = await res.json(); setRepostajes(data.repostajes || []) }
    catch (error) { console.error('Error:', error) }
  }, [])

  const cargarRegistrosFluidos = useCallback(async (vid: string) => {
    try { const res = await fetch(`/api/vehiculos?tipo=fluidos&vehiculoId=${vid}`); const data = await res.json(); setRegistrosFluidos(data.registros || []) }
    catch (error) { console.error('Error:', error) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab, cargarPeticiones])
  useEffect(() => {
    if (vehiculoSeleccionado && showDetalleVehiculo) {
      cargarDocumentos(vehiculoSeleccionado.id)
      cargarMantenimientos(vehiculoSeleccionado.id)
      cargarRepostajes(vehiculoSeleccionado.id)
      cargarRegistrosFluidos(vehiculoSeleccionado.id)
    }
  }, [vehiculoSeleccionado, showDetalleVehiculo, cargarDocumentos, cargarMantenimientos, cargarRepostajes, cargarRegistrosFluidos])

  // HANDLERS
  const handleCrearArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = new FormData(e.currentTarget)
    try { setSaving(true); const res = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', codigo: form.get('codigo'), nombre: form.get('nombre'), descripcion: form.get('descripcion'), stockActual: parseInt(form.get('stockActual') as string) || 0, stockMinimo: parseInt(form.get('stockMinimo') as string) || 0, unidad: form.get('unidad') || 'unidades', familiaId: form.get('familiaId') }) }); if (res.ok) { setShowNuevoArticulo(false); cargarDatos() } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const handleEditarArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!articuloSeleccionado) return; const form = new FormData(e.currentTarget)
    try { setSaving(true); const res = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', id: articuloSeleccionado.id, codigo: form.get('codigo'), nombre: form.get('nombre'), descripcion: form.get('descripcion'), stockActual: parseInt(form.get('stockActual') as string) || 0, stockMinimo: parseInt(form.get('stockMinimo') as string) || 0, unidad: form.get('unidad') || 'unidades', familiaId: form.get('familiaId') }) }); if (res.ok) { setShowEditarArticulo(false); setArticuloSeleccionado(null); cargarDatos() } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const handleCrearPeticion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = new FormData(e.currentTarget)
    try { setSaving(true); const res = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'peticion', articuloId: form.get('articuloId') || null, nombreArticulo: form.get('nombreArticulo'), cantidad: parseInt(form.get('cantidad') as string) || 1, unidad: form.get('unidad') || 'unidades', prioridad: form.get('prioridad') || 'normal', descripcion: form.get('descripcion'), areaOrigen: 'vehiculos' }) }); if (res.ok) { setShowNuevaPeticion(false); cargarPeticiones() } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const handleCrearFamilia = async () => {
    if (!nuevaFamilia.trim() || !categoriaArea) return
    try { const res = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', nombre: nuevaFamilia.trim(), categoriaId: categoriaArea }) }); if (res.ok) { setNuevaFamilia(''); cargarDatos() } }
    catch (error) { console.error('Error:', error) }
  }

  const handleEditarFamilia = async (id: string) => {
    if (!familiaEditandoNombre.trim()) return
    try { const res = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', id, nombre: familiaEditandoNombre.trim() }) }); if (res.ok) { setFamiliaEditando(null); cargarDatos() } }
    catch (error) { console.error('Error:', error) }
  }

  const handleEliminarFamilia = async (id: string) => {
    if (!confirm('¿Eliminar esta familia?')) return
    try { const res = await fetch(`/api/logistica?tipo=familia&id=${id}`, { method: 'DELETE' }); if (res.ok) cargarDatos() }
    catch (error) { console.error('Error:', error) }
  }

  const handleSubirDocumento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!vehiculoSeleccionado) return; const form = new FormData(e.currentTarget); form.append('vehiculoId', vehiculoSeleccionado.id)
    try { setSaving(true); const res = await fetch('/api/vehiculos/documentos', { method: 'POST', body: form }); if (res.ok) { setShowSubirDocumento(false); cargarDocumentos(vehiculoSeleccionado.id) } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const handleNuevoMantenimiento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!vehiculoSeleccionado) return; const form = new FormData(e.currentTarget)
    try { setSaving(true); const res = await fetch('/api/vehiculos/mantenimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehiculoId: vehiculoSeleccionado.id, fecha: form.get('fecha'), tipo: form.get('tipo'), descripcion: form.get('descripcion'), kilometraje: parseInt(form.get('kilometraje') as string) || null, coste: parseFloat(form.get('coste') as string) || null, proximaRevision: form.get('proximaRevision') || null, realizadoPor: form.get('realizadoPor'), observaciones: form.get('observaciones') }) }); if (res.ok) { setShowNuevoMantenimiento(false); cargarMantenimientos(vehiculoSeleccionado.id) } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const handleNuevoRepostaje = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!vehiculoSeleccionado) return; const form = new FormData(e.currentTarget)
    try { setSaving(true); const res = await fetch('/api/vehiculos/repostajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehiculoId: vehiculoSeleccionado.id, fecha: form.get('fecha'), litros: parseFloat(form.get('litros') as string), precioLitro: parseFloat(form.get('precioLitro') as string) || null, costeTotal: parseFloat(form.get('costeTotal') as string) || null, kilometraje: parseInt(form.get('kilometraje') as string), tipoCarburante: form.get('tipoCarburante'), gasolinera: form.get('gasolinera') }) }); if (res.ok) { setShowNuevoRepostaje(false); cargarRepostajes(vehiculoSeleccionado.id) } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const handleNuevoFluido = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!vehiculoSeleccionado) return; const form = new FormData(e.currentTarget)
    try { setSaving(true); const res = await fetch('/api/vehiculos/fluidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehiculoId: vehiculoSeleccionado.id, fecha: form.get('fecha'), tipoFluido: form.get('tipoFluido'), accion: form.get('accion'), cantidad: parseFloat(form.get('cantidad') as string) || null, unidad: form.get('unidad'), kilometraje: parseInt(form.get('kilometraje') as string) || null, observaciones: form.get('observaciones') }) }); if (res.ok) { setShowNuevoFluido(false); cargarRegistrosFluidos(vehiculoSeleccionado.id) } }
    catch (error) { console.error('Error:', error) } finally { setSaving(false) }
  }

  const abrirDetalleVehiculo = (v: Vehiculo) => { setVehiculoSeleccionado(v); setVehicleDetailTab('ficha'); setShowDetalleVehiculo(true) }

  // FILTERS
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia?.id === selectedFamiliaFilter
    return matchSearch && matchFamilia
  })
  const peticionesFiltradas = peticiones.filter(p => filtroPeticiones === 'all' || p.estado === filtroPeticiones)
  const vehiculosFiltrados = vehiculos.filter(v => filtroEstadoVehiculo === 'all' || v.estado === filtroEstadoVehiculo)

  const stats = {
    totalArticulos: articulos.length,
    stockBajo: articulos.filter(a => a.stockActual <= a.stockMinimo).length,
    totalVehiculos: vehiculos.length,
    operativos: vehiculos.filter(v => v.estado === 'disponible' || v.estado === 'en_servicio').length,
    enTaller: vehiculos.filter(v => v.estado === 'en_taller').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" /><p className="text-slate-500 font-medium">Cargando Parque Móvil...</p></div></div>
  )

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><Truck className="w-6 h-6 text-indigo-600" /></div>
            Parque Móvil
          </h1>
          <p className="text-slate-500 mt-1">Gestión de flota, inventario y documentación vehicular</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"><ShoppingCart className="w-4 h-4" />Petición</button>
          <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Artículo</button>
          <button onClick={cargarDatos} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Recargar"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Material', value: stats.totalArticulos, icon: Package, iconColor: 'text-indigo-400' },
          { label: 'Stock Bajo', value: stats.stockBajo, icon: AlertTriangle, iconColor: 'text-amber-400' },
          { label: 'Vehículos', value: stats.totalVehiculos, icon: Truck, iconColor: 'text-blue-400' },
          { label: 'Operativos', value: stats.operativos, icon: CheckCircle, iconColor: 'text-emerald-400' },
          { label: 'En Taller', value: stats.enTaller, icon: Wrench, iconColor: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">{s.label}</span><s.icon className={`w-5 h-5 ${s.iconColor}`} /></div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* MAIN TABS */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px">
          {[
            { key: 'inventario', label: 'Inventario del Área', icon: Package },
            { key: 'flota', label: 'Gestión de Flota', icon: Truck },
            { key: 'documentacion', label: 'Documentación', icon: FileCheck },
            { key: 'localizacion', label: 'Localización', icon: MapPin },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === tab.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: INVENTARIO */}
      {mainTab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {[{ key: 'stock', label: 'Stock' }, { key: 'peticiones', label: 'Peticiones' }, { key: 'movimientos', label: 'Movimientos' }].map(tab => (
              <button key={tab.key} onClick={() => setInventoryTab(tab.key as any)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${inventoryTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
            ))}
          </div>

          {inventoryTab === 'stock' && (
            <div className="bg-white border border-slate-200 rounded-xl">
              <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar artículos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
                <select value={selectedFamiliaFilter} onChange={e => setSelectedFamiliaFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="all">Todas las familias</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Layers className="w-4 h-4" />Familias</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th><th className="text-left px-4 py-3 font-medium text-slate-600">Artículo</th><th className="text-left px-4 py-3 font-medium text-slate-600">Familia</th><th className="text-center px-4 py-3 font-medium text-slate-600">Stock</th><th className="text-center px-4 py-3 font-medium text-slate-600">Mínimo</th><th className="text-left px-4 py-3 font-medium text-slate-600">Unidad</th><th className="text-center px-4 py-3 font-medium text-slate-600">Estado</th><th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {articulosFiltrados.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-slate-400"><Package className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No hay artículos registrados</p></td></tr>
                    ) : articulosFiltrados.map(art => (
                      <tr key={art.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{art.codigo || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{art.nombre}</td>
                        <td className="px-4 py-3 text-slate-500">{art.familia?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-center"><span className={`font-semibold ${art.stockActual <= art.stockMinimo ? 'text-red-600' : 'text-slate-800'}`}>{art.stockActual}</span></td>
                        <td className="px-4 py-3 text-center text-slate-500">{art.stockMinimo}</td>
                        <td className="px-4 py-3 text-slate-500">{art.unidad}</td>
                        <td className="px-4 py-3 text-center">{art.stockActual <= art.stockMinimo ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" />Bajo</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" />OK</span>}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => { setArticuloSeleccionado(art); setShowEditarArticulo(true) }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar"><Edit className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inventoryTab === 'peticiones' && (
            <div className="bg-white border border-slate-200 rounded-xl">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Filtrar:</span>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setFiltroPeticiones('all')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroPeticiones === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todas</button>
                  {Object.entries(ESTADOS_PETICION).map(([key, val]) => (<button key={key} onClick={() => setFiltroPeticiones(key)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroPeticiones === key ? 'bg-slate-800 text-white' : `${val.color} border`}`}>{val.label}</button>))}
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {peticionesFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-slate-400"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No hay peticiones</p></div>
                ) : peticionesFiltradas.map(pet => {
                  const estado = ESTADOS_PETICION[pet.estado] || ESTADOS_PETICION.pendiente; const prioridad = PRIORIDADES[pet.prioridad] || PRIORIDADES.normal; const EstadoIcon = estado.icon
                  return (
                    <div key={pet.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4"><div className="flex-1">
                        <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-slate-400">{pet.numero}</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}><EstadoIcon className="w-3 h-3" />{estado.label}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridad.color}`}>{prioridad.label}</span></div>
                        <p className="font-medium text-slate-800">{pet.nombreArticulo}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{pet.cantidad} {pet.unidad} · {new Date(pet.fechaSolicitud).toLocaleDateString('es-ES')}</p>
                        {pet.descripcion && <p className="text-sm text-slate-400 mt-1">{pet.descripcion}</p>}
                      </div></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {inventoryTab === 'movimientos' && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400"><History className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">Historial de movimientos</p><p className="text-sm mt-1">Los movimientos de stock se registrarán aquí</p></div>
          )}
        </div>
      )}

      {/* TAB: GESTIÓN DE FLOTA */}
      {mainTab === 'flota' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ height: '350px' }}>
            <MapContainer center={[37.3710, -6.0710]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {vehiculos.filter(v => v.latitud && v.longitud).map(v => (
                <Marker key={v.id} position={[v.latitud!, v.longitud!]} icon={createVehicleIcon(v.estado)}>
                  <Popup><div className="text-center"><p className="font-bold">{v.indicativo}</p><p className="text-sm text-gray-600">{v.matricula}</p><p className="text-xs text-gray-500">{v.marca} {v.modelo}</p></div></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Estado:</span>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFiltroEstadoVehiculo('all')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroEstadoVehiculo === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
              {Object.entries(ESTADOS_VEHICULO).map(([key, val]) => (<button key={key} onClick={() => setFiltroEstadoVehiculo(key)} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${filtroEstadoVehiculo === key ? 'bg-slate-800 text-white border-slate-800' : `${val.bg} ${val.color}`}`}>{val.label}</button>))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Indicativo</th><th className="text-left px-4 py-3 font-medium text-slate-600">Matrícula</th><th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th><th className="text-left px-4 py-3 font-medium text-slate-600">Vehículo</th><th className="text-center px-4 py-3 font-medium text-slate-600">Estado</th><th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {vehiculosFiltrados.map(v => {
                  const estado = ESTADOS_VEHICULO[v.estado] || ESTADOS_VEHICULO.disponible
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => abrirDetalleVehiculo(v)}>
                      <td className="px-4 py-3"><span className="font-bold text-indigo-600">{v.indicativo}</span></td>
                      <td className="px-4 py-3 font-mono text-slate-600">{v.matricula}</td>
                      <td className="px-4 py-3 text-slate-600">{TIPOS_VEHICULO[v.tipo] || v.tipo}</td>
                      <td className="px-4 py-3 text-slate-800">{v.marca} {v.modelo}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${estado.bg} ${estado.color}`}>{estado.label}</span></td>
                      <td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); abrirDetalleVehiculo(v) }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalle"><Eye className="w-4 h-4" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTACIÓN */}
      {mainTab === 'documentacion' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileCheck className="w-5 h-5 text-indigo-500" />Documentación de la Flota</h3><p className="text-sm text-slate-500 mt-1">Estado de ITV, seguros, permisos y documentación de cada vehículo</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Vehículo</th><th className="text-center px-4 py-3 font-medium text-slate-600">ITV</th><th className="text-center px-4 py-3 font-medium text-slate-600">Seguro</th><th className="text-center px-4 py-3 font-medium text-slate-600">Permiso Circ.</th><th className="text-center px-4 py-3 font-medium text-slate-600">Ficha Técnica</th><th className="text-center px-4 py-3 font-medium text-slate-600">Docs</th><th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {vehiculos.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3"><div><span className="font-bold text-indigo-600">{v.indicativo}</span><span className="text-slate-400 ml-2">{v.matricula}</span></div><p className="text-xs text-slate-500">{v.marca} {v.modelo}</p></td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500"><Info className="w-3 h-3" />Sin datos</span></td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500"><Info className="w-3 h-3" />Sin datos</span></td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500"><Info className="w-3 h-3" />Sin datos</span></td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500"><Info className="w-3 h-3" />Sin datos</span></td>
                      <td className="px-4 py-3 text-center"><span className="text-slate-500 font-medium">0</span></td>
                      <td className="px-4 py-3 text-right"><button onClick={() => { setVehiculoSeleccionado(v); setVehicleDetailTab('documentos'); setShowDetalleVehiculo(true) }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Upload className="w-3 h-3" />Gestionar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LOCALIZACIÓN */}
      {mainTab === 'localizacion' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vehículo</label><select value={filtroVehiculo} onChange={e => setFiltroVehiculo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="all">Todos los vehículos</option>{vehiculos.map(v => <option key={v.id} value={v.id}>{v.indicativo} - {v.matricula}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Desde</label><input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label><input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div className="flex items-end"><button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"><Route className="w-4 h-4" />Ver Recorrido</button></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ height: '450px' }}>
            <MapContainer center={[37.3710, -6.0710]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {vehiculos.filter(v => v.latitud && v.longitud).map(v => (<Marker key={v.id} position={[v.latitud!, v.longitud!]} icon={createVehicleIcon(v.estado)}><Popup><div className="text-center"><p className="font-bold">{v.indicativo}</p><p className="text-sm text-gray-600">{v.matricula}</p></div></Popup></Marker>))}
            </MapContainer>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><Waypoints className="w-5 h-5 text-indigo-500" />Historial de Movimientos</h3></div>
            <div className="p-8 text-center text-slate-400"><Navigation className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Localización en tiempo real</p><p className="text-sm mt-1">Se activará con la conexión a los iPads de cada vehículo.<br />Los movimientos se registrarán automáticamente con timestamp y coordenadas GPS.</p></div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE VEHÍCULO */}
      {showDetalleVehiculo && vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowDetalleVehiculo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '680px' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 rounded-t-2xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 rounded-xl"><Truck className="w-6 h-6" /></div>
                <div><h2 className="text-xl font-bold">{vehiculoSeleccionado.indicativo}</h2><p className="text-indigo-200 text-sm">{vehiculoSeleccionado.matricula} · {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</p></div>
              </div>
              <button onClick={() => setShowDetalleVehiculo(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {/* Sub-tabs */}
            <div className="border-b border-slate-200 px-5 shrink-0">
              <nav className="flex gap-1 -mb-px">
                {[
                  { key: 'ficha', label: 'Ficha Técnica', icon: Info },
                  { key: 'niveles', label: 'Niveles y Fluidos', icon: Droplets },
                  { key: 'repostajes', label: 'Repostajes', icon: Fuel },
                  { key: 'documentos', label: 'Documentación', icon: FileText },
                  { key: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setVehicleDetailTab(tab.key as any)} className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${vehicleDetailTab === tab.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <tab.icon className="w-4 h-4" />{tab.label}
                  </button>
                ))}
              </nav>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* FICHA TÉCNICA */}
              {vehicleDetailTab === 'ficha' && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4"><Car className="w-4 h-4 text-indigo-500" />Identificación</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Tipo', value: TIPOS_VEHICULO[vehiculoSeleccionado.tipo] || vehiculoSeleccionado.tipo },
                        { label: 'Marca', value: vehiculoSeleccionado.marca },
                        { label: 'Modelo', value: vehiculoSeleccionado.modelo },
                        { label: 'Año', value: vehiculoSeleccionado.anio || '-' },
                        { label: 'Color', value: vehiculoSeleccionado.color || '-' },
                        { label: 'Nº Chasis', value: vehiculoSeleccionado.numeroChasis || '-' },
                        { label: 'Bastidor', value: vehiculoSeleccionado.bastidor || '-' },
                      ].map(row => (<div key={row.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0"><span className="text-sm text-slate-500">{row.label}</span><span className="text-sm font-medium text-slate-800">{row.value}</span></div>))}
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-indigo-500" />Estado y Uso</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-1 border-b border-slate-50"><span className="text-sm text-slate-500">Estado</span><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ESTADOS_VEHICULO[vehiculoSeleccionado.estado]?.bg || ''} ${ESTADOS_VEHICULO[vehiculoSeleccionado.estado]?.color || ''}`}>{ESTADOS_VEHICULO[vehiculoSeleccionado.estado]?.label || vehiculoSeleccionado.estado}</span></div>
                      {[
                        { label: 'Kilometraje', value: vehiculoSeleccionado.kmActual ? `${vehiculoSeleccionado.kmActual.toLocaleString()} km` : '-' },
                        { label: 'Potencia', value: vehiculoSeleccionado.potencia ? `${vehiculoSeleccionado.potencia} CV` : '-' },
                        { label: 'Cilindrada', value: vehiculoSeleccionado.cilindrada ? `${vehiculoSeleccionado.cilindrada} cc` : '-' },
                        { label: 'Plazas', value: vehiculoSeleccionado.plazas || '-' },
                        { label: 'Cap. Combustible', value: vehiculoSeleccionado.capacidadCombustible ? `${vehiculoSeleccionado.capacidadCombustible} L` : '-' },
                        { label: 'Cap. Carga', value: vehiculoSeleccionado.capacidadCarga ? `${vehiculoSeleccionado.capacidadCarga} kg` : '-' },
                      ].map(row => (<div key={row.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0"><span className="text-sm text-slate-500">{row.label}</span><span className="text-sm font-medium text-slate-800">{row.value}</span></div>))}
                    </div>
                  </div>
                  {vehiculoSeleccionado.observaciones && (<div className="col-span-2 border border-slate-200 rounded-xl p-4"><h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-indigo-500" />Observaciones</h4><p className="text-sm text-slate-600">{vehiculoSeleccionado.observaciones}</p></div>)}
                </div>
              )}

              {/* NIVELES Y FLUIDOS */}
              {vehicleDetailTab === 'niveles' && (
                <div className="space-y-5">
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold text-slate-800 flex items-center gap-2"><Gauge className="w-4 h-4 text-indigo-500" />Niveles Actuales</h4><button onClick={() => setShowNuevoFluido(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium transition-colors"><Plus className="w-3 h-3" />Registrar</button></div>
                    <div className="grid grid-cols-2 gap-3">
                      {TIPOS_FLUIDO.map(fluido => { const FI = fluido.icon; return (
                        <div key={fluido.value} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><FI className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-700">{fluido.label}</span></div><NivelIndicador /></div>
                      )})}
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4"><History className="w-4 h-4 text-indigo-500" />Historial de Fluidos</h4>
                    {registrosFluidos.length === 0 ? (<div className="text-center py-6 text-slate-400"><Droplets className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay registros de fluidos</p></div>) : (
                      <div className="space-y-2">{registrosFluidos.map(reg => { const ti = TIPOS_FLUIDO.find(t => t.value === reg.tipoFluido); return (
                        <div key={reg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium text-slate-800">{ti?.label || reg.tipoFluido}</p><p className="text-xs text-slate-500">{reg.accion === 'relleno' ? 'Relleno' : reg.accion === 'cambio_completo' ? 'Cambio completo' : 'Revisión'}{reg.cantidad && ` · ${reg.cantidad} ${reg.unidad || 'L'}`}{reg.kilometraje && ` · ${reg.kilometraje.toLocaleString()} km`}</p></div><span className="text-xs text-slate-400">{new Date(reg.fecha).toLocaleDateString('es-ES')}</span></div>
                      )})}</div>
                    )}
                  </div>
                </div>
              )}

              {/* REPOSTAJES */}
              {vehicleDetailTab === 'repostajes' && (
                <div className="space-y-5">
                  <div className="flex justify-end"><button onClick={() => setShowNuevoRepostaje(true)} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Nuevo Repostaje</button></div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th><th className="text-right px-4 py-3 font-medium text-slate-600">Litros</th><th className="text-right px-4 py-3 font-medium text-slate-600">€/L</th><th className="text-right px-4 py-3 font-medium text-slate-600">Coste</th><th className="text-right px-4 py-3 font-medium text-slate-600">Km</th><th className="text-left px-4 py-3 font-medium text-slate-600">Carburante</th><th className="text-left px-4 py-3 font-medium text-slate-600">Gasolinera</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {repostajes.length === 0 ? (<tr><td colSpan={7} className="text-center py-8 text-slate-400"><Fuel className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay repostajes registrados</p></td></tr>) : repostajes.map(rep => (
                          <tr key={rep.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-600">{new Date(rep.fecha).toLocaleDateString('es-ES')}</td><td className="px-4 py-3 text-right font-medium text-slate-800">{rep.litros.toFixed(1)}</td><td className="px-4 py-3 text-right text-slate-600">{rep.precioLitro ? `${rep.precioLitro.toFixed(3)} €` : '-'}</td><td className="px-4 py-3 text-right font-medium text-slate-800">{rep.costeTotal ? `${rep.costeTotal.toFixed(2)} €` : '-'}</td><td className="px-4 py-3 text-right text-slate-600">{rep.kilometraje?.toLocaleString() || '-'}</td><td className="px-4 py-3 text-slate-600">{rep.tipoCarburante}</td><td className="px-4 py-3 text-slate-500">{rep.gasolinera || '-'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOCUMENTOS */}
              {vehicleDetailTab === 'documentos' && (
                <div className="space-y-5">
                  <div className="flex justify-end"><button onClick={() => setShowSubirDocumento(true)} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"><Upload className="w-4 h-4" />Subir Documento</button></div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th><th className="text-left px-4 py-3 font-medium text-slate-600">Documento</th><th className="text-left px-4 py-3 font-medium text-slate-600">Subido</th><th className="text-left px-4 py-3 font-medium text-slate-600">Caducidad</th><th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {documentos.length === 0 ? (<tr><td colSpan={5} className="text-center py-8 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay documentos</p></td></tr>) : documentos.map(doc => (
                          <tr key={doc.id} className="hover:bg-slate-50"><td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"><FileCheck className="w-3 h-3" />{doc.tipo}</span></td><td className="px-4 py-3 text-slate-800 font-medium">{doc.nombre}</td><td className="px-4 py-3 text-slate-600">{new Date(doc.fechaSubida).toLocaleDateString('es-ES')}</td><td className="px-4 py-3 text-slate-600">{doc.fechaCaducidad ? new Date(doc.fechaCaducidad).toLocaleDateString('es-ES') : '-'}</td><td className="px-4 py-3 text-right">{doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600 inline-flex" title="Descargar"><Download className="w-4 h-4" /></a>}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MANTENIMIENTO */}
              {vehicleDetailTab === 'mantenimiento' && (
                <div className="space-y-5">
                  <div className="flex justify-end"><button onClick={() => setShowNuevoMantenimiento(true)} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Registrar Mantenimiento</button></div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th><th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th><th className="text-left px-4 py-3 font-medium text-slate-600">Descripción</th><th className="text-right px-4 py-3 font-medium text-slate-600">Km</th><th className="text-right px-4 py-3 font-medium text-slate-600">Coste</th><th className="text-left px-4 py-3 font-medium text-slate-600">Realizado por</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {mantenimientos.length === 0 ? (<tr><td colSpan={6} className="text-center py-8 text-slate-400"><Settings className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay registros</p></td></tr>) : mantenimientos.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-600">{new Date(m.fecha).toLocaleDateString('es-ES')}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><Wrench className="w-3 h-3" />{m.tipo}</span></td><td className="px-4 py-3 text-slate-800">{m.descripcion}</td><td className="px-4 py-3 text-right text-slate-600">{m.kilometraje?.toLocaleString() || '-'}</td><td className="px-4 py-3 text-right font-medium text-slate-800">{m.coste ? `${m.coste.toFixed(2)} €` : '-'}</td><td className="px-4 py-3 text-slate-500">{m.realizadoPor || '-'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO ARTÍCULO */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevoArticulo(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-500" />Nuevo Artículo</h3><button onClick={() => setShowNuevoArticulo(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleCrearArticulo} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Código</label><input name="codigo" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Familia *</label><select name="familiaId" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label><input name="nombre" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><textarea name="descripcion" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label><input name="stockActual" type="number" min="0" defaultValue={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label><input name="stockMinimo" type="number" min="0" defaultValue={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><input name="unidad" defaultValue="unidades" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">{saving ? 'Guardando...' : 'Crear Artículo'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ARTÍCULO */}
      {showEditarArticulo && articuloSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => { setShowEditarArticulo(false); setArticuloSeleccionado(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Edit className="w-5 h-5 text-indigo-500" />Editar Artículo</h3><button onClick={() => { setShowEditarArticulo(false); setArticuloSeleccionado(null) }} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleEditarArticulo} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Código</label><input name="codigo" defaultValue={articuloSeleccionado.codigo || ''} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Familia *</label><select name="familiaId" required defaultValue={articuloSeleccionado.familia?.id || ''} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label><input name="nombre" required defaultValue={articuloSeleccionado.nombre} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><textarea name="descripcion" rows={2} defaultValue={articuloSeleccionado.descripcion || ''} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label><input name="stockActual" type="number" min="0" defaultValue={articuloSeleccionado.stockActual} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label><input name="stockMinimo" type="number" min="0" defaultValue={articuloSeleccionado.stockMinimo} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><input name="unidad" defaultValue={articuloSeleccionado.unidad} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setShowEditarArticulo(false); setArticuloSeleccionado(null) }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Cambios'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA PETICIÓN */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevaPeticion(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-500" />Nueva Petición de Material</h3><button onClick={() => setShowNuevaPeticion(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleCrearPeticion} className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Artículo existente (opcional)</label><select name="articuloId" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="">— Material nuevo —</option>{articulos.map(a => <option key={a.id} value={a.id}>{a.nombre} (Stock: {a.stockActual})</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre del material *</label><input name="nombreArticulo" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Cantidad *</label><input name="cantidad" type="number" min="1" defaultValue={1} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><input name="unidad" defaultValue="unidades" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label><select name="prioridad" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">{Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label><textarea name="descripcion" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">{saving ? 'Enviando...' : 'Enviar Petición'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN FAMILIAS */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowGestionFamilias(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-500" />Gestión de Familias</h3><button onClick={() => setShowGestionFamilias(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2"><input type="text" placeholder="Nueva familia..." value={nuevaFamilia} onChange={e => setNuevaFamilia(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" onKeyDown={e => e.key === 'Enter' && handleCrearFamilia()} /><button onClick={handleCrearFamilia} disabled={!nuevaFamilia.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">Añadir</button></div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {familias.length === 0 ? <p className="text-center py-4 text-sm text-slate-400">No hay familias</p> : familias.map(fam => (
                  <div key={fam.id} className="flex items-center justify-between py-3">
                    {familiaEditando === fam.id ? (
                      <div className="flex-1 flex gap-2"><input type="text" value={familiaEditandoNombre} onChange={e => setFamiliaEditandoNombre(e.target.value)} className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm" autoFocus /><button onClick={() => handleEditarFamilia(fam.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-4 h-4" /></button><button onClick={() => setFamiliaEditando(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button></div>
                    ) : (<><div><span className="text-sm font-medium text-slate-800">{fam.nombre}</span><span className="text-xs text-slate-400 ml-2">({fam._count?.articulos || 0})</span></div><div className="flex gap-1"><button onClick={() => { setFamiliaEditando(fam.id); setFamiliaEditandoNombre(fam.nombre) }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => handleEliminarFamilia(fam.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" disabled={(fam._count?.articulos || 0) > 0}><Trash2 className="w-3.5 h-3.5" /></button></div></>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO REPOSTAJE */}
      {showNuevoRepostaje && vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4" onClick={() => setShowNuevoRepostaje(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Fuel className="w-5 h-5 text-indigo-500" />Nuevo Repostaje — {vehiculoSeleccionado.indicativo}</h3><button onClick={() => setShowNuevoRepostaje(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleNuevoRepostaje} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label><input name="fecha" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Carburante *</label><select name="tipoCarburante" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="diesel">Diésel</option><option value="gasolina_95">Gasolina 95</option><option value="gasolina_98">Gasolina 98</option><option value="electrico">Eléctrico</option></select></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Litros *</label><input name="litros" type="number" step="0.1" min="0" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">€/Litro</label><input name="precioLitro" type="number" step="0.001" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Coste Total €</label><input name="costeTotal" type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Kilometraje *</label><input name="kilometraje" type="number" min="0" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Gasolinera</label><input name="gasolinera" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowNuevoRepostaje(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO FLUIDO */}
      {showNuevoFluido && vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4" onClick={() => setShowNuevoFluido(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Droplets className="w-5 h-5 text-indigo-500" />Registro de Fluido — {vehiculoSeleccionado.indicativo}</h3><button onClick={() => setShowNuevoFluido(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleNuevoFluido} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Fluido *</label><select name="tipoFluido" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">{TIPOS_FLUIDO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Acción *</label><select name="accion" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="relleno">Relleno</option><option value="cambio_completo">Cambio completo</option><option value="revision">Revisión / Control</option></select></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label><input name="fecha" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label><input name="cantidad" type="number" step="0.1" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="L">Litros</option><option value="mL">Mililitros</option><option value="kg">Kilogramos</option></select></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Kilometraje</label><input name="kilometraje" type="number" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label><input name="observaciones" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowNuevoFluido(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO MANTENIMIENTO */}
      {showNuevoMantenimiento && vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4" onClick={() => setShowNuevoMantenimiento(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-emerald-500" />Registrar Mantenimiento — {vehiculoSeleccionado.indicativo}</h3><button onClick={() => setShowNuevoMantenimiento(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleNuevoMantenimiento} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label><input name="fecha" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label><select name="tipo" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">{TIPOS_MANTENIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label><textarea name="descripcion" required rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Kilometraje</label><input name="kilometraje" type="number" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Coste €</label><input name="coste" type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Próxima revisión</label><input name="proximaRevision" type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Realizado por</label><input name="realizadoPor" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label><input name="observaciones" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowNuevoMantenimiento(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBIR DOCUMENTO */}
      {showSubirDocumento && vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4" onClick={() => setShowSubirDocumento(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Upload className="w-5 h-5 text-indigo-500" />Subir Documento — {vehiculoSeleccionado.indicativo}</h3><button onClick={() => setShowSubirDocumento(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleSubirDocumento} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo de documento *</label><select name="tipo" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">{TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha caducidad</label><input name="fechaCaducidad" type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Archivo *</label><input name="archivo" type="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowSubirDocumento(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">{saving ? 'Subiendo...' : 'Subir Documento'}</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
