'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import {
  RefreshCw, Plus, Search, Edit, Trash2, Eye, X, Save,
  Package, AlertTriangle, CheckCircle, ShoppingCart, Layers,
  Radio, Battery, BatteryCharging, BatteryLow, BatteryWarning, BatteryFull,
  Wrench, FileText, Calendar, Filter, Clock, History,
  ClipboardList, Send, ChevronDown, ChevronRight,
  MapPin, Settings, Info, Hash, Zap, Signal, Antenna,
  ArrowUpDown, BarChart3, Activity, Power, Plug, Map, BookOpen
} from 'lucide-react'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false })

interface Articulo { id: string; codigo?: string; nombre: string; descripcion?: string; stockActual: number; stockMinimo: number; unidad: string; familia?: { id: string; nombre: string } }
interface Familia { id: string; nombre: string; slug: string; _count?: { articulos: number } }
interface EquipoRadio {
  id: string; codigo: string; tipo: string; marca: string; modelo: string; numeroSerie?: string;
  configuracion: string; estado: string; estadoBateria?: number; fechaInstalacionBat?: string;
  ciclosCarga: number; ubicacion?: string; observaciones?: string;
  freqTxAnalogico?: number; freqRxAnalogico?: number; subtonoTx?: string; subtonoRx?: string; potenciaAnalogico?: number;
  freqTxDigital?: number; freqRxDigital?: number; colorCode?: number; timeslot?: number; potenciaDigital?: number;
  potenciaMaxima?: number; bandaFrecuencia?: string; canalAnalogico?: string; canalDigital?: string;
  latitud?: number; longitud?: number; alturaAntena?: number; radioCobertura?: number;
}
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

const COLORES_COBERTURA: Record<string, { fill: string; stroke: string }> = {
  portatil: { fill: '#2563eb', stroke: '#1d4ed8' },
  base: { fill: '#059669', stroke: '#047857' },
  repetidor: { fill: '#7c3aed', stroke: '#6d28d9' },
  base_junta: { fill: '#dc2626', stroke: '#b91c1c' },
}
function createMapIcon(color, label, size = 36) {
  if (typeof window === 'undefined') return undefined;
  return L.divIcon({ className: '', html: '<div style="width:'+size+'px;height:'+size+'px;background:'+color+';border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:'+(size*0.35)+'px;font-family:system-ui,sans-serif;">'+label+'</div>', iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2] });
}

const CODIGOS_Q = [
  { codigo: 'QAP', significado: 'Escuche en frecuencia / Permanezca a la escucha' },
  { codigo: 'QRA', significado: '¿Cuál es el nombre de su estación? / El nombre de mi estación es...' },
  { codigo: 'QRG', significado: '¿Cuál es mi frecuencia exacta? / Su frecuencia es...' },
  { codigo: 'QRK', significado: '¿Cuál es la inteligibilidad de mi señal? (1-5)' },
  { codigo: 'QRL', significado: '¿Está ocupada la frecuencia? / La frecuencia está ocupada' },
  { codigo: 'QRM', significado: 'Tengo interferencias' },
  { codigo: 'QRN', significado: 'Tengo parásitos atmosféricos' },
  { codigo: 'QRP', significado: 'Baja potencia' },
  { codigo: 'QRS', significado: 'Transmita más despacio' },
  { codigo: 'QRT', significado: 'Cese de transmisión / Deje de transmitir' },
  { codigo: 'QRV', significado: 'Estoy listo / Estoy preparado' },
  { codigo: 'QRX', significado: 'Espere, volveré a llamar' },
  { codigo: 'QRZ', significado: '¿Quién me llama? / Le llama...' },
  { codigo: 'QSA', significado: 'Intensidad de señal (1-5)' },
  { codigo: 'QSL', significado: 'Acuso recibo / Confirmado' },
  { codigo: 'QSO', significado: 'Comunicación directa entre estaciones' },
  { codigo: 'QSP', significado: 'Retransmita el mensaje a...' },
  { codigo: 'QSY', significado: 'Cambie de frecuencia' },
  { codigo: 'QTH', significado: '¿Cuál es su posición? / Mi posición es...' },
  { codigo: 'QTR', significado: '¿Qué hora es? / La hora es...' },
]

const ALFABETO_ICAO = [
  { letra: 'A', palabra: 'Alfa' }, { letra: 'B', palabra: 'Bravo' }, { letra: 'C', palabra: 'Charlie' },
  { letra: 'D', palabra: 'Delta' }, { letra: 'E', palabra: 'Echo' }, { letra: 'F', palabra: 'Foxtrot' },
  { letra: 'G', palabra: 'Golf' }, { letra: 'H', palabra: 'Hotel' }, { letra: 'I', palabra: 'India' },
  { letra: 'J', palabra: 'Juliet' }, { letra: 'K', palabra: 'Kilo' }, { letra: 'L', palabra: 'Lima' },
  { letra: 'M', palabra: 'Mike' }, { letra: 'N', palabra: 'November' }, { letra: 'O', palabra: 'Oscar' },
  { letra: 'P', palabra: 'Papa' }, { letra: 'Q', palabra: 'Quebec' }, { letra: 'R', palabra: 'Romeo' },
  { letra: 'S', palabra: 'Sierra' }, { letra: 'T', palabra: 'Tango' }, { letra: 'U', palabra: 'Uniform' },
  { letra: 'V', palabra: 'Victor' }, { letra: 'W', palabra: 'Whiskey' }, { letra: 'X', palabra: 'X-ray' },
  { letra: 'Y', palabra: 'Yankee' }, { letra: 'Z', palabra: 'Zulu' },
]

const NUMEROS_ICAO = [
  { num: '0', palabra: 'Zero' }, { num: '1', palabra: 'One' }, { num: '2', palabra: 'Two' },
  { num: '3', palabra: 'Three' }, { num: '4', palabra: 'Four' }, { num: '5', palabra: 'Five' },
  { num: '6', palabra: 'Six' }, { num: '7', palabra: 'Seven' }, { num: '8', palabra: 'Eight' },
  { num: '9', palabra: 'Niner' },
]

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
  const [mainTab, setMainTab] = useState<'inventario' | 'equipos' | 'config_rf' | 'cobertura' | 'codigos'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [detalleTab, setDetalleTab] = useState<'ficha' | 'bateria' | 'mantenimiento'>('ficha')
  const [codigosTab, setCodigosTab] = useState<'codigo_q' | 'icao'>('codigo_q')
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
  const [showConfigRF, setShowConfigRF] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoRadio | null>(null)
  const [nuevaFamilia, setNuevaFamilia] = useState('')
  const [familiaEditando, setFamiliaEditando] = useState<string | null>(null)
  const [familiaEditandoNombre, setFamiliaEditandoNombre] = useState('')
  const [coberturaVisible, setCoberturaVisible] = useState<Record<string, boolean>>({ portatil: true, base: true, repetidor: true, base_junta: true })
  const [searchCodigo, setSearchCodigo] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

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
  const handleGuardarConfigRF = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!equipoSeleccionado) return; const f = new FormData(e.currentTarget)
    try { setSaving(true); const r = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      tipo: 'equipo-radio', id: equipoSeleccionado.id,
      freqTxAnalogico: parseFloat(f.get('freqTxAnalogico') as string) || null, freqRxAnalogico: parseFloat(f.get('freqRxAnalogico') as string) || null,
      subtonoTx: f.get('subtonoTx') || null, subtonoRx: f.get('subtonoRx') || null, potenciaAnalogico: parseFloat(f.get('potenciaAnalogico') as string) || null,
      freqTxDigital: parseFloat(f.get('freqTxDigital') as string) || null, freqRxDigital: parseFloat(f.get('freqRxDigital') as string) || null,
      colorCode: parseInt(f.get('colorCode') as string) || null, timeslot: parseInt(f.get('timeslot') as string) || null, potenciaDigital: parseFloat(f.get('potenciaDigital') as string) || null,
      potenciaMaxima: parseFloat(f.get('potenciaMaxima') as string) || null, bandaFrecuencia: f.get('bandaFrecuencia') || null,
      canalAnalogico: f.get('canalAnalogico') || null, canalDigital: f.get('canalDigital') || null,
      latitud: parseFloat(f.get('latitud') as string) || null, longitud: parseFloat(f.get('longitud') as string) || null,
      alturaAntena: parseFloat(f.get('alturaAntena') as string) || null, radioCobertura: parseFloat(f.get('radioCobertura') as string) || null,
    }) }); if (r.ok) { setShowConfigRF(false); setEquipoSeleccionado(null); cargarDatos() } } catch (e) { console.error(e) } finally { setSaving(false) }
  }
  const abrirDetalleEquipo = (eq: EquipoRadio) => { setEquipoSeleccionado(eq); setDetalleTab('ficha'); setShowDetalleEquipo(true) }

  const articulosFiltrados = articulos.filter(a => { const ms = !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase())); return ms && (selectedFamiliaFilter === 'all' || a.familia?.id === selectedFamiliaFilter) })
  const peticionesFiltradas = peticiones.filter(p => filtroPeticiones === 'all' || p.estado === filtroPeticiones)
  const equiposFiltrados = equipos.filter(eq => (filtroEstadoEquipo === 'all' || eq.estado === filtroEstadoEquipo) && (filtroTipoEquipo === 'all' || eq.tipo === filtroTipoEquipo))
  const stats = { totalArticulos: articulos.length, stockBajo: articulos.filter(a => a.stockActual <= a.stockMinimo).length, totalEquipos: equipos.length, bateriaBaja: equipos.filter(e => e.estadoBateria !== undefined && e.estadoBateria !== null && e.estadoBateria < 30).length, averiados: equipos.filter(e => e.estado === 'averiado').length }

  const equiposConCobertura = equipos.filter(eq => {
    if (!coberturaVisible[eq.tipo]) return false
    if (eq.tipo === 'portatil') return true
    return eq.latitud && eq.longitud
  })

  const codigosFiltrados_Q = CODIGOS_Q.filter(c => !searchCodigo || c.codigo.toLowerCase().includes(searchCodigo.toLowerCase()) || c.significado.toLowerCase().includes(searchCodigo.toLowerCase()))
  const icaoFiltrado = ALFABETO_ICAO.filter(i => !searchCodigo || i.letra.toLowerCase().includes(searchCodigo.toLowerCase()) || i.palabra.toLowerCase().includes(searchCodigo.toLowerCase()))

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
            <div className="flex items-center justify-between mb-3"><span className="text-sm text-slate-500">{s.label}</span><div className={`p-2 rounded-xl ${s.iconBg}`}><s.icon className={`w-5 h-5 ${s.iconColor}`} /></div></div>
            <p className="text-4xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* MAIN TABS */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { key: 'inventario', label: 'Inventario del Área', icon: Package },
            { key: 'equipos', label: 'Equipos de Radio', icon: Radio },
            { key: 'config_rf', label: 'Configuración RF', icon: Settings },
            { key: 'cobertura', label: 'Mapa de Cobertura', icon: Map },
            { key: 'codigos', label: 'Códigos Q / ICAO', icon: BookOpen },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)} className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${mainTab === tab.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: INVENTARIO */}
      {mainTab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex gap-6 border-b border-slate-100">
            {[{ key: 'stock', label: 'Stock', icon: Package }, { key: 'peticiones', label: 'Peticiones', icon: ShoppingCart }, { key: 'movimientos', label: 'Movimientos', icon: History }].map(tab => (
              <button key={tab.key} onClick={() => setInventoryTab(tab.key as any)} className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${inventoryTab === tab.key ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>
          {inventoryTab === 'stock' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[250px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar artículos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>
                <select value={selectedFamiliaFilter} onChange={e => setSelectedFamiliaFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="all">Todas las familias</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors"><Layers className="w-4 h-4" />Familias</button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100"><th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Artículo</th><th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Familia</th><th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Stock</th><th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Estado</th><th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {articulosFiltrados.length === 0 ? <tr><td colSpan={5} className="text-center py-16 text-slate-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No hay artículos registrados</p></td></tr>
                  : articulosFiltrados.map(art => (
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
                {peticionesFiltradas.length === 0 ? <div className="text-center py-16 text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No hay peticiones</p></div>
                : peticionesFiltradas.map(pet => { const est = ESTADOS_PETICION[pet.estado] || ESTADOS_PETICION.pendiente; const pri = PRIORIDADES[pet.prioridad] || PRIORIDADES.normal; const EI = est.icon; return (
                  <div key={pet.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-slate-400">{pet.numero}</span><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${est.color}`}><EI className="w-3 h-3" />{est.label}</span><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${pri.color}`}>{pri.label}</span></div>
                    <p className="font-medium text-slate-800">{pet.nombreArticulo}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{pet.cantidad} {pet.unidad} - {new Date(pet.fechaSolicitud).toLocaleDateString('es-ES')}</p>
                    {pet.descripcion && <p className="text-sm text-slate-400 mt-1">{pet.descripcion}</p>}
                  </div>
                )})}
              </div>
            </div>
          )}
          {inventoryTab === 'movimientos' && <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400"><History className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Historial de movimientos</p><p className="text-sm mt-1">Los movimientos de stock se registrarán aquí</p></div>}
        </div>
      )}

      {/* TAB: EQUIPOS DE RADIO */}
      {mainTab === 'equipos' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Estado:</span>
            <button onClick={() => setFiltroEstadoEquipo('all')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroEstadoEquipo === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
            {Object.entries(ESTADOS_EQUIPO).map(([k, v]) => (<button key={k} onClick={() => setFiltroEstadoEquipo(k)} className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filtroEstadoEquipo === k ? 'bg-slate-800 text-white border-slate-800' : `${v.bg} ${v.color}`}`}>{v.label}</button>))}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <span className="text-sm font-medium text-slate-600">Tipo:</span>
            <button onClick={() => setFiltroTipoEquipo('all')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroTipoEquipo === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
            {TIPOS_EQUIPO.map(t => (<button key={t.value} onClick={() => setFiltroTipoEquipo(t.value)} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${filtroTipoEquipo === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.label}</button>))}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Código</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Equipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Config</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Batería</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {equiposFiltrados.length === 0 ? <tr><td colSpan={7} className="text-center py-16 text-slate-400"><Radio className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No hay equipos registrados</p></td></tr>
                : equiposFiltrados.map(eq => {
                  const est = ESTADOS_EQUIPO[eq.estado] || ESTADOS_EQUIPO.disponible; const tipoInfo = TIPOS_EQUIPO.find(t => t.value === eq.tipo); const TipoIcon = tipoInfo?.icon || Radio
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

      {/* TAB: CONFIGURACIÓN RF */}
      {mainTab === 'config_rf' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Parámetros de Radiofrecuencia por Equipo</h3><p className="text-sm text-slate-500 mt-1">Frecuencias TX/RX, subtonos CTCSS, potencia y configuración de canales</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Equipo</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap" colSpan={2}>Analógico</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap" colSpan={2}>Digital (DMR)</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Subtono</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Potencia</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Editar</th>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th></th>
                  <th className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">TX MHz</th>
                  <th className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">RX MHz</th>
                  <th className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">TX MHz</th>
                  <th className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">RX MHz</th>
                  <th className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">CTCSS</th>
                  <th className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">Max W</th>
                  <th></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {equipos.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-400"><Settings className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay equipos para configurar</p></td></tr>
                  : equipos.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3"><span className="font-bold text-purple-600">{eq.codigo}</span><span className="text-xs text-slate-400 ml-2">{eq.marca} {eq.modelo}</span></td>
                      <td className="px-3 py-3 text-center font-mono text-xs">{eq.freqTxAnalogico ? eq.freqTxAnalogico.toFixed(4) : <span className="text-slate-300">-</span>}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs">{eq.freqRxAnalogico ? eq.freqRxAnalogico.toFixed(4) : <span className="text-slate-300">-</span>}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs">{eq.freqTxDigital ? eq.freqTxDigital.toFixed(4) : <span className="text-slate-300">-</span>}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs">{eq.freqRxDigital ? eq.freqRxDigital.toFixed(4) : <span className="text-slate-300">-</span>}</td>
                      <td className="px-3 py-3 text-center text-xs">{eq.subtonoTx ? <span className="font-mono">{eq.subtonoTx} Hz</span> : <span className="text-slate-300">-</span>}</td>
                      <td className="px-3 py-3 text-center text-xs">{eq.potenciaMaxima ? <span className="font-bold">{eq.potenciaMaxima}W</span> : <span className="text-slate-300">-</span>}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => { setEquipoSeleccionado(eq); setShowConfigRF(true) }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Settings className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MAPA DE COBERTURA */}
      {mainTab === 'cobertura' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-800">Mapa de Cobertura de Comunicaciones</h3><p className="text-xs text-slate-400">Banda VHF | Centro: Bormujos</p></div>
            <div className="flex items-center gap-5 flex-wrap">
              {[{key:'portatil',label:'Portátiles (~10 km)',color:'#1d4ed8'},{key:'base',label:'Base PC Digital (~25 km)',color:'#047857'},{key:'repetidor',label:'Repetidor Digital (~30 km)',color:'#6d28d9'},{key:'base_junta',label:'Red Emergencias Junta (~80 km)',color:'#b91c1c'}].map(t=>(
                <label key={t.key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={coberturaVisible[t.key]||false} onChange={()=>setCoberturaVisible(prev=>({...prev,[t.key]:!prev[t.key]}))} className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                  <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{backgroundColor:t.color}} />
                  <span className="text-sm font-medium text-slate-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{height:'600px'}}>
            {isMounted && (
              <MapContainer center={[37.3716,-6.0719]} zoom={11} style={{height:'100%',width:'100%'}} scrollWheelZoom={true}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                {coberturaVisible.repetidor && (<><Circle center={[37.37405612396787,-6.079995246657121]} radius={30000} pathOptions={{color:'#6d28d9',fillColor:'#7c3aed',fillOpacity:0.10,weight:3,dashArray:'12,8'}} /><Circle center={[37.37405612396787,-6.079995246657121]} radius={20000} pathOptions={{color:'#7c3aed',fillColor:'#8b5cf6',fillOpacity:0.06,weight:2,dashArray:'8,6'}} /><Marker position={[37.37405612396787,-6.079995246657121]} icon={createMapIcon('#6d28d9','R',42)}><Popup><div className="text-sm"><p className="font-bold text-purple-700">Repetidor Digital VHF</p><p className="text-slate-600">Cobertura: ~30 km</p><p className="text-xs text-slate-500 mt-1">Frecuencia digital (DMR)</p><p className="text-xs text-slate-400 font-mono">37.3741, -6.0800</p></div></Popup></Marker></>)}
                {coberturaVisible.base && (<><Circle center={[37.370547477757015,-6.08469160785196]} radius={25000} pathOptions={{color:'#047857',fillColor:'#059669',fillOpacity:0.10,weight:3,dashArray:'10,6'}} /><Circle center={[37.370547477757015,-6.08469160785196]} radius={15000} pathOptions={{color:'#059669',fillColor:'#10b981',fillOpacity:0.06,weight:2,dashArray:'6,5'}} /><Marker position={[37.370547477757015,-6.08469160785196]} icon={createMapIcon('#047857','B',42)}><Popup><div className="text-sm"><p className="font-bold text-emerald-700">Base CECOPAL - PC Bormujos</p><p className="text-slate-600">Cobertura: ~25 km (digital)</p><p className="text-xs text-slate-500 mt-1">Emisora fija en sede Protección Civil</p><p className="text-xs text-slate-400 font-mono">37.3705, -6.0847</p></div></Popup></Marker></>)}
                {coberturaVisible.base_junta && (<><Circle center={[37.37040742334877,-6.084648323420483]} radius={80000} pathOptions={{color:'#b91c1c',fillColor:'#dc2626',fillOpacity:0.06,weight:3,dashArray:'15,10'}} /><Circle center={[37.37040742334877,-6.084648323420483]} radius={50000} pathOptions={{color:'#dc2626',fillColor:'#ef4444',fillOpacity:0.04,weight:2,dashArray:'10,8'}} /><Marker position={[37.37040742334877,-6.084648323420483]} icon={createMapIcon('#b91c1c','J',42)}><Popup><div className="text-sm"><p className="font-bold text-red-700">Red Emergencias - Junta de Andalucía</p><p className="text-slate-600">Cobertura: ~80 km</p><p className="text-xs text-slate-500 mt-1">Antena en CECOPAL Bormujos</p><p className="text-xs text-slate-400 font-mono">37.3704, -6.0846</p></div></Popup></Marker></>)}
                {coberturaVisible.portatil && (<><Circle center={[37.3716,-6.0719]} radius={10000} pathOptions={{color:'#1d4ed8',fillColor:'#2563eb',fillOpacity:0.12,weight:3,dashArray:'8,5'}} /><Circle center={[37.3716,-6.0719]} radius={5000} pathOptions={{color:'#2563eb',fillColor:'#3b82f6',fillOpacity:0.08,weight:2,dashArray:'5,4'}} /><Marker position={[37.3716,-6.0719]} icon={createMapIcon('#1d4ed8','P',36)}><Popup><div className="text-sm"><p className="font-bold text-blue-700">Portátiles (Walkies)</p><p className="text-slate-600">Cobertura directa: ~10 km</p><p className="text-xs text-slate-500 mt-1">Alcance mayor vía repetidor</p></div></Popup></Marker></>)}
                {equipos.filter(eq=>eq.latitud&&eq.longitud&&eq.radioCobertura).map(eq=>{const col=COLORES_COBERTURA[eq.tipo]||COLORES_COBERTURA.base;return coberturaVisible[eq.tipo]?(<div key={eq.id}><Circle center={[eq.latitud,eq.longitud]} radius={(eq.radioCobertura||10)*1000} pathOptions={{color:col.stroke,fillColor:col.fill,fillOpacity:0.10,weight:2,dashArray:'8,5'}} /><Marker position={[eq.latitud,eq.longitud]} icon={createMapIcon(col.stroke,eq.codigo.charAt(0),34)}><Popup><div className="text-sm"><p className="font-bold" style={{color:col.stroke}}>{eq.codigo} - {eq.marca} {eq.modelo}</p><p className="text-slate-600">{TIPOS_EQUIPO.find(t=>t.value===eq.tipo)?.label}</p><p className="text-xs text-slate-400">~{eq.radioCobertura} km</p></div></Popup></Marker></div>):null})}
              </MapContainer>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-4 h-4 rounded-full bg-blue-700" /><h4 className="font-semibold text-slate-800">Portátiles</h4></div><div className="space-y-1 text-sm text-slate-600"><p>Cobertura directa: ~10 km</p><p>Vía repetidor: ~30 km</p></div></div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-4 h-4 rounded-full bg-emerald-700" /><h4 className="font-semibold text-slate-800">Base CECOPAL</h4></div><div className="space-y-1 text-sm text-slate-600"><p>Cobertura digital: ~25 km</p><p>Frecuencia PC Bormujos</p></div></div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-4 h-4 rounded-full bg-purple-700" /><h4 className="font-semibold text-slate-800">Repetidor Digital</h4></div><div className="space-y-1 text-sm text-slate-600"><p>Cobertura: ~30 km</p><p>DMR / Frecuencia digital</p></div></div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-4 h-4 rounded-full bg-red-700" /><h4 className="font-semibold text-slate-800">Red Junta Andalucía</h4></div><div className="space-y-1 text-sm text-slate-600"><p>Cobertura: ~80 km</p><p>Red de Emergencias autonómica</p></div></div>
          </div>
        </div>
      )}

      {/* TAB: CÓDIGOS Q / ICAO */}
      {mainTab === 'codigos' && (
        <div className="space-y-4">
          <div className="flex gap-6 border-b border-slate-100">
            {[{ key: 'codigo_q', label: 'Código Q', icon: Hash }, { key: 'icao', label: 'Alfabeto ICAO', icon: BookOpen }].map(tab => (
              <button key={tab.key} onClick={() => { setCodigosTab(tab.key as any); setSearchCodigo('') }} className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${codigosTab === tab.key ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder={codigosTab === 'codigo_q' ? 'Buscar código Q...' : 'Buscar letra...'} value={searchCodigo} onChange={e => setSearchCodigo(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" /></div>

          {codigosTab === 'codigo_q' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100"><th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase w-28">Código</th><th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Significado</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {codigosFiltrados_Q.map(c => (
                    <tr key={c.codigo} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5"><span className="font-mono font-bold text-purple-600 text-base">{c.codigo}</span></td>
                      <td className="px-5 py-3.5 text-slate-700">{c.significado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {codigosTab === 'icao' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100"><h4 className="font-semibold text-slate-800">Alfabeto Fonético OACI/ICAO</h4></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-0">
                  {icaoFiltrado.map(i => (
                    <div key={i.letra} className="flex flex-col items-center p-4 border-b border-r border-slate-50 hover:bg-purple-50/50 transition-colors">
                      <span className="text-2xl font-bold text-purple-600">{i.letra}</span>
                      <span className="text-xs text-slate-600 font-medium mt-1">{i.palabra}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100"><h4 className="font-semibold text-slate-800">Números</h4></div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-0">
                  {NUMEROS_ICAO.map(n => (
                    <div key={n.num} className="flex flex-col items-center p-4 border-b border-r border-slate-50 hover:bg-purple-50/50 transition-colors">
                      <span className="text-2xl font-bold text-slate-800">{n.num}</span>
                      <span className="text-xs text-slate-600 font-medium mt-1">{n.palabra}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: DETALLE EQUIPO */}
      {showDetalleEquipo && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowDetalleEquipo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3"><div className="p-2.5 bg-purple-100 rounded-xl"><Radio className="w-5 h-5 text-purple-600" /></div><div><h3 className="text-lg font-semibold text-slate-800">{equipoSeleccionado.codigo}</h3><p className="text-sm text-slate-500">{equipoSeleccionado.marca} {equipoSeleccionado.modelo}</p></div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEditarEquipo(true)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleEliminarEquipo(equipoSeleccionado.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setShowDetalleEquipo(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex gap-4 px-6 pt-4 border-b border-slate-100">
              {[{ key: 'ficha', label: 'Ficha Técnica', icon: FileText }, { key: 'bateria', label: 'Batería y Cargas', icon: Battery }, { key: 'mantenimiento', label: 'Mantenimiento', icon: Wrench }].map(tab => (
                <button key={tab.key} onClick={() => setDetalleTab(tab.key as any)} className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${detalleTab === tab.key ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
              ))}
            </div>
            <div className="p-6">
              {detalleTab === 'ficha' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Tipo', value: TIPOS_EQUIPO.find(t => t.value === equipoSeleccionado.tipo)?.label || equipoSeleccionado.tipo },
                      { label: 'Configuración', value: CONFIGURACIONES.find(c => c.value === equipoSeleccionado.configuracion)?.label || equipoSeleccionado.configuracion },
                      { label: 'Marca', value: equipoSeleccionado.marca }, { label: 'Modelo', value: equipoSeleccionado.modelo },
                      { label: 'Nº Serie', value: equipoSeleccionado.numeroSerie || 'Sin registrar' },
                      { label: 'Estado', value: ESTADOS_EQUIPO[equipoSeleccionado.estado]?.label || equipoSeleccionado.estado },
                      { label: 'Ubicación', value: equipoSeleccionado.ubicacion || 'Sin asignar' },
                      { label: 'Ciclos de Carga', value: `${equipoSeleccionado.ciclosCarga} ciclos` },
                    ].map(item => (<div key={item.label} className="bg-slate-50 rounded-xl p-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p><p className="text-sm font-medium text-slate-800">{item.value}</p></div>))}
                  </div>
                  {equipoSeleccionado.observaciones && <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Observaciones</p><p className="text-sm text-slate-700">{equipoSeleccionado.observaciones}</p></div>}
                </div>
              )}
              {detalleTab === 'bateria' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-slate-800">Estado de Batería</h4><BateriaIndicador nivel={equipoSeleccionado.estadoBateria ?? undefined} /></div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div><p className="text-xs text-slate-500">Salud</p><p className="text-lg font-bold text-slate-800">{equipoSeleccionado.estadoBateria ?? '-'}%</p></div>
                      <div><p className="text-xs text-slate-500">Ciclos</p><p className="text-lg font-bold text-slate-800">{equipoSeleccionado.ciclosCarga}</p></div>
                      <div><p className="text-xs text-slate-500">Instalación</p><p className="text-sm font-medium text-slate-800">{equipoSeleccionado.fechaInstalacionBat ? new Date(equipoSeleccionado.fechaInstalacionBat).toLocaleDateString('es-ES') : '-'}</p></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between"><h4 className="font-semibold text-slate-800">Historial de Cargas</h4><button onClick={() => setShowNuevoCiclo(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"><BatteryCharging className="w-4 h-4" />Registrar Carga</button></div>
                  {ciclosCarga.length === 0 ? <div className="text-center py-8 text-slate-400"><BatteryCharging className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay cargas registradas</p></div>
                  : <div className="space-y-2">{ciclosCarga.map(c => (
                    <div key={c.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="p-2 bg-amber-100 rounded-lg"><Plug className="w-4 h-4 text-amber-600" /></div>
                      <div className="flex-1"><div className="flex items-center gap-3 text-sm"><span className="text-slate-800 font-medium">{new Date(c.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>{c.duracionHoras && <span className="text-slate-500">{c.duracionHoras}h</span>}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">{c.nivelInicial !== null && c.nivelInicial !== undefined && <span>Inicio: {c.nivelInicial}%</span>}{c.nivelFinal !== null && c.nivelFinal !== undefined && <span>Final: {c.nivelFinal}%</span>}{c.observaciones && <span className="text-slate-400">- {c.observaciones}</span>}</div></div>
                    </div>
                  ))}</div>}
                </div>
              )}
              {detalleTab === 'mantenimiento' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><h4 className="font-semibold text-slate-800">Historial de Mantenimiento</h4><button onClick={() => setShowNuevoMantenimiento(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"><Wrench className="w-4 h-4" />Nuevo</button></div>
                  {mantenimientos.length === 0 ? <div className="text-center py-8 text-slate-400"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay mantenimientos registrados</p></div>
                  : <div className="space-y-2">{mantenimientos.map(m => (
                    <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="p-2 bg-purple-100 rounded-lg"><Wrench className="w-4 h-4 text-purple-600" /></div>
                      <div className="flex-1"><div className="flex items-center gap-2"><span className="font-medium text-slate-800">{m.tipo}</span>{m.coste && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{m.coste.toFixed(2)}€</span>}</div>
                      <p className="text-sm text-slate-600 mt-0.5">{m.descripcion}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1"><span>{new Date(m.fecha).toLocaleDateString('es-ES')}</span>{m.realizadoPor && <span>Por: {m.realizadoPor}</span>}</div></div>
                    </div>
                  ))}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR ARTÍCULO */}
      {(showNuevoArticulo || showEditarArticulo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => { setShowNuevoArticulo(false); setShowEditarArticulo(false); setArticuloSeleccionado(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-800">{showEditarArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}</h3><button onClick={() => { setShowNuevoArticulo(false); setShowEditarArticulo(false); setArticuloSeleccionado(null) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={showEditarArticulo ? handleEditarArticulo : handleCrearArticulo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Código</label><input name="codigo" defaultValue={articuloSeleccionado?.codigo || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="TR-001" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Unidad</label><select name="unidad" defaultValue={articuloSeleccionado?.unidad || 'unidades'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="unidades">Unidades</option><option value="pares">Pares</option><option value="cajas">Cajas</option><option value="rollos">Rollos</option><option value="metros">Metros</option></select></div></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nombre *</label><input name="nombre" required defaultValue={articuloSeleccionado?.nombre || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Descripción</label><textarea name="descripcion" rows={2} defaultValue={articuloSeleccionado?.descripcion || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Familia *</label><select name="familiaId" required defaultValue={articuloSeleccionado?.familia?.id || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Stock Actual</label><input name="stockActual" type="number" defaultValue={articuloSeleccionado?.stockActual || 0} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Stock Mínimo</label><input name="stockMinimo" type="number" defaultValue={articuloSeleccionado?.stockMinimo || 0} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowNuevoArticulo(false); setShowEditarArticulo(false); setArticuloSeleccionado(null) }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA PETICIÓN */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevaPeticion(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-800">Nueva Petición de Material</h3><button onClick={() => setShowNuevaPeticion(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleCrearPeticion} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Artículo existente</label><select name="articuloId" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="">Material no inventariado</option>{articulos.map(a => <option key={a.id} value={a.id}>{a.nombre} (Stock: {a.stockActual})</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nombre del Material *</label><input name="nombreArticulo" required className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Cantidad *</label><input name="cantidad" type="number" min={1} defaultValue={1} required className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Unidad</label><select name="unidad" defaultValue="unidades" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="unidades">Unidades</option><option value="cajas">Cajas</option></select></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Prioridad</label><select name="prioridad" defaultValue="normal" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Motivo</label><textarea name="descripcion" rows={3} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowNuevaPeticion(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Creando...' : 'Crear Petición'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN FAMILIAS */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowGestionFamilias(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-800">Gestión de Familias</h3><button onClick={() => setShowGestionFamilias(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2"><input type="text" value={nuevaFamilia} onChange={e => setNuevaFamilia(e.target.value)} placeholder="Nueva familia..." className="flex-1 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" onKeyDown={e => e.key === 'Enter' && handleCrearFamilia()} /><button onClick={handleCrearFamilia} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"><Plus className="w-4 h-4" /></button></div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {familias.length === 0 ? <p className="text-center text-sm text-slate-400 py-4">No hay familias creadas</p> : familias.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    {familiaEditando === f.id ? (<div className="flex items-center gap-2 flex-1"><input type="text" value={familiaEditandoNombre} onChange={e => setFamiliaEditandoNombre(e.target.value)} className="flex-1 border border-slate-200 rounded-lg py-1.5 px-2.5 text-sm" onKeyDown={e => e.key === 'Enter' && handleEditarFamilia(f.id)} autoFocus /><button onClick={() => handleEditarFamilia(f.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button><button onClick={() => setFamiliaEditando(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4" /></button></div>
                    ) : (<><div><span className="font-medium text-slate-800 text-sm">{f.nombre}</span><span className="text-xs text-slate-400 ml-2">{f._count?.articulos || 0} art.</span></div><div className="flex items-center gap-1"><button onClick={() => { setFamiliaEditando(f.id); setFamiliaEditandoNombre(f.nombre) }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => handleEliminarFamilia(f.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR EQUIPO */}
      {(showNuevoEquipo || showEditarEquipo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => { setShowNuevoEquipo(false); setShowEditarEquipo(false) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-800">{showEditarEquipo ? 'Editar Equipo' : 'Nuevo Equipo de Radio'}</h3><button onClick={() => { setShowNuevoEquipo(false); setShowEditarEquipo(false) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={showEditarEquipo ? handleEditarEquipo : handleCrearEquipo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Código *</label><input name="codigo" required defaultValue={equipoSeleccionado?.codigo || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="TR-01" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Tipo *</label><select name="tipoEquipo" required defaultValue={equipoSeleccionado?.tipo || 'portatil'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{TIPOS_EQUIPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Marca *</label><input name="marca" required defaultValue={equipoSeleccionado?.marca || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Modelo *</label><input name="modelo" required defaultValue={equipoSeleccionado?.modelo || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nº Serie</label><input name="numeroSerie" defaultValue={equipoSeleccionado?.numeroSerie || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Configuración</label><select name="configuracion" defaultValue={equipoSeleccionado?.configuracion || 'analogico'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{CONFIGURACIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Estado</label><select name="estado" defaultValue={equipoSeleccionado?.estado || 'disponible'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{Object.entries(ESTADOS_EQUIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Batería (%)</label><input name="estadoBateria" type="number" min={0} max={100} defaultValue={equipoSeleccionado?.estadoBateria || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ubicación</label><input name="ubicacion" defaultValue={equipoSeleccionado?.ubicacion || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Base PC, Vehículo FSV..." /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Observaciones</label><textarea name="observaciones" rows={2} defaultValue={equipoSeleccionado?.observaciones || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowNuevoEquipo(false); setShowEditarEquipo(false) }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO MANTENIMIENTO */}
      {showNuevoMantenimiento && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevoMantenimiento(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100"><div><h3 className="text-lg font-semibold text-slate-800">Nuevo Mantenimiento</h3><p className="text-sm text-slate-500">Equipo: {equipoSeleccionado.codigo}</p></div><button onClick={() => setShowNuevoMantenimiento(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleNuevoMantenimiento} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Tipo *</label><select name="tipoMantenimiento" required className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">{TIPOS_MANTENIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Descripción *</label><textarea name="descripcion" required rows={3} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Fecha</label><input name="fecha" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Realizado por</label><input name="realizadoPor" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Coste (€)</label><input name="coste" type="number" step="0.01" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Observaciones</label><input name="observaciones" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowNuevoMantenimiento(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO CICLO CARGA */}
      {showNuevoCiclo && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setShowNuevoCiclo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100"><div><h3 className="text-lg font-semibold text-slate-800">Registrar Ciclo de Carga</h3><p className="text-sm text-slate-500">Equipo: {equipoSeleccionado.codigo}</p></div><button onClick={() => setShowNuevoCiclo(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleNuevoCiclo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Inicio *</label><input name="fechaInicio" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Fin</label><input name="fechaFin" type="datetime-local" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">% Inicial</label><input name="nivelInicial" type="number" min={0} max={100} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">% Final</label><input name="nivelFinal" type="number" min={0} max={100} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Duración (h)</label><input name="duracionHoras" type="number" step="0.5" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Observaciones</label><textarea name="observaciones" rows={2} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowNuevoCiclo(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURACIÓN RF */}
      {showConfigRF && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => { setShowConfigRF(false); setEquipoSeleccionado(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div><h3 className="text-lg font-semibold text-slate-800">Configuración RF</h3><p className="text-sm text-slate-500">{equipoSeleccionado.codigo} - {equipoSeleccionado.marca} {equipoSeleccionado.modelo}</p></div>
              <button onClick={() => { setShowConfigRF(false); setEquipoSeleccionado(null) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGuardarConfigRF} className="p-6 space-y-6">
              {/* General */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-500" />General</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Banda</label><select name="bandaFrecuencia" defaultValue={equipoSeleccionado.bandaFrecuencia || 'VHF'} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="VHF">VHF (136-174 MHz)</option><option value="UHF">UHF (400-470 MHz)</option></select></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Potencia Máx (W)</label><input name="potenciaMaxima" type="number" step="0.1" defaultValue={equipoSeleccionado.potenciaMaxima || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Radio Cobertura (km)</label><input name="radioCobertura" type="number" step="0.5" defaultValue={equipoSeleccionado.radioCobertura || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                </div>
              </div>
              {/* Analógico */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-blue-500" />Modo Analógico</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Canal</label><input name="canalAnalogico" defaultValue={equipoSeleccionado.canalAnalogico || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Canal PC" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Potencia (W)</label><input name="potenciaAnalogico" type="number" step="0.1" defaultValue={equipoSeleccionado.potenciaAnalogico || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Freq TX (MHz)</label><input name="freqTxAnalogico" type="number" step="0.0001" defaultValue={equipoSeleccionado.freqTxAnalogico || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="156.0000" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Freq RX (MHz)</label><input name="freqRxAnalogico" type="number" step="0.0001" defaultValue={equipoSeleccionado.freqRxAnalogico || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="156.0000" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Subtono TX (CTCSS Hz)</label><input name="subtonoTx" defaultValue={equipoSeleccionado.subtonoTx || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="67.0" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Subtono RX (CTCSS Hz)</label><input name="subtonoRx" defaultValue={equipoSeleccionado.subtonoRx || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="67.0" /></div>
                </div>
              </div>
              {/* Digital */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" />Modo Digital (DMR / Repetidor)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Canal Digital</label><input name="canalDigital" defaultValue={equipoSeleccionado.canalDigital || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Repetidor PC" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Potencia (W)</label><input name="potenciaDigital" type="number" step="0.1" defaultValue={equipoSeleccionado.potenciaDigital || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Freq TX (MHz)</label><input name="freqTxDigital" type="number" step="0.0001" defaultValue={equipoSeleccionado.freqTxDigital || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Freq RX (MHz)</label><input name="freqRxDigital" type="number" step="0.0001" defaultValue={equipoSeleccionado.freqRxDigital || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Color Code</label><input name="colorCode" type="number" min={0} max={15} defaultValue={equipoSeleccionado.colorCode || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="0-15" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Timeslot</label><select name="timeslot" defaultValue={equipoSeleccionado.timeslot || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"><option value="">-</option><option value="1">TS 1</option><option value="2">TS 2</option></select></div>
                </div>
              </div>
              {/* Coordenadas */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" />Ubicación Antena (base/repetidor)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Latitud</label><input name="latitud" type="number" step="0.00000001" defaultValue={equipoSeleccionado.latitud || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Longitud</label><input name="longitud" type="number" step="0.00000001" defaultValue={equipoSeleccionado.longitud || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Altura Antena (m)</label><input name="alturaAntena" type="number" step="0.1" defaultValue={equipoSeleccionado.alturaAntena || ''} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                </div>
              </div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowConfigRF(false); setEquipoSeleccionado(null) }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Configuración'}</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
