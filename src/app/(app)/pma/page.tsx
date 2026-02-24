'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, Plus, Search, Edit, Trash2, X, Save,
  Package, AlertTriangle, CheckCircle, ShoppingCart,
  Wrench, Calendar, Filter, Clock, History,
  ClipboardList, Send, ChevronDown, ChevronRight, Check,
  Info, Tent, ClipboardCheck, CheckSquare, Square,
  Ruler, Timer, Droplets, Flame, Wind, Shield,
  LayoutGrid, AlignHorizontalSpaceBetween, CornerDownRight, Maximize2,
  ChevronUp, Eye, FileText, Box
} from 'lucide-react'

// ===================== INTERFACES =====================
interface Articulo { id: string; codigo?: string; nombre: string; descripcion?: string; stockActual: number; stockMinimo: number; unidad: string; familia?: { id: string; nombre: string } }
interface Familia { id: string; nombre: string; slug: string; _count?: { articulos: number } }
interface Peticion { id: string; numero: string; nombreArticulo: string; cantidad: number; unidad: string; estado: string; prioridad: string; descripcion?: string; solicitante?: { nombre: string }; fechaSolicitud: string }

// ===================== CONSTANTES =====================
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

const CATEGORIAS_CHECKLIST = [
  'Estructura', 'Paredes y Suelo', 'Mobiliario', 'Iluminación y Electricidad',
  'Material Sanitario', 'Comunicaciones', 'Señalización', 'Herramientas', 'Varios'
]

interface ChecklistItem {
  id: string; nombre: string; cantidad: number; categoria: string; verificado: boolean; observacion?: string
}

const CHECKLIST_INICIAL: ChecklistItem[] = [
  { id: 'e1', nombre: 'Carpa MasterTent Rescue 6×3m — Unidad 1', cantidad: 1, categoria: 'Estructura', verificado: false },
  { id: 'e2', nombre: 'Carpa MasterTent Rescue 6×3m — Unidad 2', cantidad: 1, categoria: 'Estructura', verificado: false },
  { id: 'e3', nombre: 'Pesas de cemento 25 kg (lastres)', cantidad: 16, categoria: 'Estructura', verificado: false },
  { id: 'e4', nombre: 'Piquetas de anclaje', cantidad: 16, categoria: 'Estructura', verificado: false },
  { id: 'e5', nombre: 'Mazas para piquetas', cantidad: 2, categoria: 'Estructura', verificado: false },
  { id: 'e6', nombre: 'Canalones de conexión entre carpas', cantidad: 2, categoria: 'Estructura', verificado: false },
  { id: 'p1', nombre: 'Paredes laterales cerradas', cantidad: 4, categoria: 'Paredes y Suelo', verificado: false },
  { id: 'p2', nombre: 'Paredes con ventana PVC', cantidad: 4, categoria: 'Paredes y Suelo', verificado: false },
  { id: 'p3', nombre: 'Paredes con puerta enrollable', cantidad: 2, categoria: 'Paredes y Suelo', verificado: false },
  { id: 'p4', nombre: 'Pared divisoria interior', cantidad: 2, categoria: 'Paredes y Suelo', verificado: false },
  { id: 'p5', nombre: 'Suelo PVC antideslizante', cantidad: 2, categoria: 'Paredes y Suelo', verificado: false },
  { id: 'p6', nombre: 'Barras de conexión paredes', cantidad: 8, categoria: 'Paredes y Suelo', verificado: false },
  { id: 'm1', nombre: 'Mesas plegables', cantidad: 4, categoria: 'Mobiliario', verificado: false },
  { id: 'm2', nombre: 'Sillas plegables', cantidad: 12, categoria: 'Mobiliario', verificado: false },
  { id: 'm3', nombre: 'Mostrador integrado', cantidad: 1, categoria: 'Mobiliario', verificado: false },
  { id: 'm4', nombre: 'Camillas portátiles', cantidad: 2, categoria: 'Mobiliario', verificado: false },
  { id: 'i1', nombre: 'Focos LED portátiles', cantidad: 4, categoria: 'Iluminación y Electricidad', verificado: false },
  { id: 'i2', nombre: 'Regletas multienchufe', cantidad: 4, categoria: 'Iluminación y Electricidad', verificado: false },
  { id: 'i3', nombre: 'Alargadores eléctricos 25 m', cantidad: 2, categoria: 'Iluminación y Electricidad', verificado: false },
  { id: 'i4', nombre: 'Generador portátil', cantidad: 1, categoria: 'Iluminación y Electricidad', verificado: false },
  { id: 'ms1', nombre: 'Botiquín primeros auxilios completo', cantidad: 1, categoria: 'Material Sanitario', verificado: false },
  { id: 'ms2', nombre: 'Mantas térmicas', cantidad: 10, categoria: 'Material Sanitario', verificado: false },
  { id: 'ms3', nombre: 'Kit de curas', cantidad: 2, categoria: 'Material Sanitario', verificado: false },
  { id: 'co1', nombre: 'Walkie-talkie', cantidad: 2, categoria: 'Comunicaciones', verificado: false },
  { id: 'co2', nombre: 'Megáfono', cantidad: 1, categoria: 'Comunicaciones', verificado: false },
  { id: 'se1', nombre: 'Banderola identificativa PMA', cantidad: 2, categoria: 'Señalización', verificado: false },
  { id: 'se2', nombre: 'Conos de señalización', cantidad: 6, categoria: 'Señalización', verificado: false },
  { id: 'se3', nombre: 'Cinta de balizamiento (rollos)', cantidad: 3, categoria: 'Señalización', verificado: false },
  { id: 'he1', nombre: 'Kit herramientas básico', cantidad: 1, categoria: 'Herramientas', verificado: false },
  { id: 'he2', nombre: 'Bridas plásticas (bolsa)', cantidad: 2, categoria: 'Herramientas', verificado: false },
  { id: 'va1', nombre: 'Bidones de agua 10 L', cantidad: 2, categoria: 'Varios', verificado: false },
  { id: 'va2', nombre: 'Bolsas de basura (rollo)', cantidad: 2, categoria: 'Varios', verificado: false },
]

const SPECS_MASTERTENT = {
  modelo: 'MasterTent Kit Rescue',
  medidas: '6 × 3 m',
  superficie: '18 m²',
  peso: '56,2 kg',
  alturaRecogida: '201 cm',
  alturaPico: '327 cm',
  medidasPlegada: '70 × 40 × 152 cm',
  montaje: '< 60 segundos',
  estructura: 'Aluminio anodizado reforzado',
  techo: 'Poliéster 600D con capa PVC',
  paredesLaterales: 'PVC reforzado en parte inferior',
  suelo: 'PVC antideslizante, absorbente',
  impermeable: '100%',
  ignifugo: 'Sí — Certificado',
  certificacion: 'TÜV',
  resistenciaViento: 'Hasta 80 km/h (con lastres)',
  unidades: 2,
}

interface DespliegueConfig {
  id: string; nombre: string; medidas: string; superficie: string; descripcion: string; usoRecomendado: string
}

const CONFIGURACIONES: DespliegueConfig[] = [
  { id: 'cuadrado', nombre: 'Cuadrado', medidas: '6 × 6 m', superficie: '36 m²', descripcion: 'Dos carpas unidas lateralmente por el lado de 6 m, formando un espacio cuadrado.', usoRecomendado: 'PMA principal con zona de triaje y zona de tratamiento. Eventos con afluencia media. Puesto de mando en emergencias.' },
  { id: 'lineal', nombre: 'Lineal', medidas: '12 × 3 m', superficie: '36 m²', descripcion: 'Dos carpas unidas en línea por el lado de 3 m, formando un pasillo alargado.', usoRecomendado: 'Pasillos de evacuación. PMA en espacios estrechos (calles, pasillos). Zona de paso y registro.' },
  { id: 'ele', nombre: 'En L', medidas: '9 × 6 m (L)', superficie: '36 m²', descripcion: 'Dos carpas en ángulo de 90° formando una L. Comparten una esquina.', usoRecomendado: 'Separar zonas funcionales (recepción/tratamiento). Adaptación a esquinas de edificios. Control visual de dos frentes.' },
  { id: 'separadas', nombre: 'Separadas', medidas: '2 × (6 × 3 m)', superficie: '2 × 18 m²', descripcion: 'Cada carpa desplegada de forma independiente en ubicaciones distintas.', usoRecomendado: 'Múltiples puntos de atención simultáneos. Eventos dispersos. Despliegue en zonas alejadas entre sí.' },
]

// ===================== SVG DESPLIEGUES =====================
function DiagramaCuadrado() {
  return (
    <svg viewBox="0 0 320 280" className="w-full max-w-md mx-auto">
      <defs>
        <pattern id="grid-sq" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/></pattern>
        <linearGradient id="tent-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/></linearGradient>
        <linearGradient id="tent-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity="0.15"/><stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/></linearGradient>
      </defs>
      <rect width="320" height="280" fill="white" rx="12"/>
      <rect width="320" height="280" fill="url(#grid-sq)" rx="12"/>
      {/* Carpa 1 */}
      <rect x="40" y="40" width="120" height="120" fill="url(#tent-a)" stroke="#3b82f6" strokeWidth="2.5" rx="4" strokeDasharray="none"/>
      <text x="100" y="95" textAnchor="middle" className="text-[11px]" fill="#1e40af" fontWeight="700">CARPA 1</text>
      <text x="100" y="112" textAnchor="middle" className="text-[10px]" fill="#3b82f6">6 × 3 m</text>
      {/* Carpa 2 */}
      <rect x="160" y="40" width="120" height="120" fill="url(#tent-b)" stroke="#f97316" strokeWidth="2.5" rx="4"/>
      <text x="220" y="95" textAnchor="middle" className="text-[11px]" fill="#c2410c" fontWeight="700">CARPA 2</text>
      <text x="220" y="112" textAnchor="middle" className="text-[10px]" fill="#f97316">6 × 3 m</text>
      {/* Canalón */}
      <line x1="160" y1="45" x2="160" y2="155" stroke="#6b7280" strokeWidth="2" strokeDasharray="6,4"/>
      <text x="160" y="175" textAnchor="middle" className="text-[9px]" fill="#6b7280">Canalón de unión</text>
      {/* Cotas */}
      <line x1="40" y1="205" x2="280" y2="205" stroke="#374151" strokeWidth="1.5" markerEnd="url(#arrow)"/>
      <line x1="40" y1="200" x2="40" y2="210" stroke="#374151" strokeWidth="1.5"/>
      <line x1="280" y1="200" x2="280" y2="210" stroke="#374151" strokeWidth="1.5"/>
      <text x="160" y="222" textAnchor="middle" className="text-[11px]" fill="#374151" fontWeight="600">6,00 m</text>
      <line x1="300" y1="40" x2="300" y2="160" stroke="#374151" strokeWidth="1.5"/>
      <line x1="295" y1="40" x2="305" y2="40" stroke="#374151" strokeWidth="1.5"/>
      <line x1="295" y1="160" x2="305" y2="160" stroke="#374151" strokeWidth="1.5"/>
      <text x="307" y="105" textAnchor="start" className="text-[11px]" fill="#374151" fontWeight="600" transform="rotate(90,307,105)">6,00 m</text>
      {/* Superficie */}
      <rect x="105" y="242" width="110" height="24" rx="12" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="160" y="258" textAnchor="middle" className="text-[11px]" fill="#166534" fontWeight="700">Total: 36 m²</text>
    </svg>
  )
}

function DiagramaLineal() {
  return (
    <svg viewBox="0 0 400 200" className="w-full max-w-lg mx-auto">
      <defs>
        <pattern id="grid-ln" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/></pattern>
        <linearGradient id="tent-a2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/></linearGradient>
        <linearGradient id="tent-b2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f97316" stopOpacity="0.15"/><stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/></linearGradient>
      </defs>
      <rect width="400" height="200" fill="white" rx="12"/>
      <rect width="400" height="200" fill="url(#grid-ln)" rx="12"/>
      {/* Carpa 1 */}
      <rect x="20" y="40" width="170" height="70" fill="url(#tent-a2)" stroke="#3b82f6" strokeWidth="2.5" rx="4"/>
      <text x="105" y="73" textAnchor="middle" className="text-[11px]" fill="#1e40af" fontWeight="700">CARPA 1</text>
      <text x="105" y="88" textAnchor="middle" className="text-[10px]" fill="#3b82f6">6 × 3 m</text>
      {/* Carpa 2 */}
      <rect x="190" y="40" width="170" height="70" fill="url(#tent-b2)" stroke="#f97316" strokeWidth="2.5" rx="4"/>
      <text x="275" y="73" textAnchor="middle" className="text-[11px]" fill="#c2410c" fontWeight="700">CARPA 2</text>
      <text x="275" y="88" textAnchor="middle" className="text-[10px]" fill="#f97316">6 × 3 m</text>
      {/* Canalón */}
      <line x1="190" y1="45" x2="190" y2="105" stroke="#6b7280" strokeWidth="2" strokeDasharray="6,4"/>
      <text x="190" y="125" textAnchor="middle" className="text-[9px]" fill="#6b7280">Canalón</text>
      {/* Cotas */}
      <line x1="20" y1="145" x2="360" y2="145" stroke="#374151" strokeWidth="1.5"/>
      <line x1="20" y1="140" x2="20" y2="150" stroke="#374151" strokeWidth="1.5"/>
      <line x1="360" y1="140" x2="360" y2="150" stroke="#374151" strokeWidth="1.5"/>
      <text x="190" y="162" textAnchor="middle" className="text-[11px]" fill="#374151" fontWeight="600">12,00 m</text>
      <line x1="375" y1="40" x2="375" y2="110" stroke="#374151" strokeWidth="1.5"/>
      <line x1="370" y1="40" x2="380" y2="40" stroke="#374151" strokeWidth="1.5"/>
      <line x1="370" y1="110" x2="380" y2="110" stroke="#374151" strokeWidth="1.5"/>
      <text x="390" y="78" textAnchor="middle" className="text-[10px]" fill="#374151" fontWeight="600">3 m</text>
      <rect x="145" y="175" width="110" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="200" y="190" textAnchor="middle" className="text-[11px]" fill="#166534" fontWeight="700">Total: 36 m²</text>
    </svg>
  )
}

function DiagramaEle() {
  return (
    <svg viewBox="0 0 320 320" className="w-full max-w-md mx-auto">
      <defs>
        <pattern id="grid-el" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/></pattern>
        <linearGradient id="tent-a3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/></linearGradient>
        <linearGradient id="tent-b3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f97316" stopOpacity="0.15"/><stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/></linearGradient>
      </defs>
      <rect width="320" height="320" fill="white" rx="12"/>
      <rect width="320" height="320" fill="url(#grid-el)" rx="12"/>
      {/* Carpa 1 - Vertical */}
      <rect x="40" y="30" width="80" height="170" fill="url(#tent-a3)" stroke="#3b82f6" strokeWidth="2.5" rx="4"/>
      <text x="80" y="110" textAnchor="middle" className="text-[11px]" fill="#1e40af" fontWeight="700">CARPA 1</text>
      <text x="80" y="127" textAnchor="middle" className="text-[10px]" fill="#3b82f6">6 × 3 m</text>
      {/* Carpa 2 - Horizontal */}
      <rect x="120" y="130" width="170" height="70" fill="url(#tent-b3)" stroke="#f97316" strokeWidth="2.5" rx="4"/>
      <text x="205" y="163" textAnchor="middle" className="text-[11px]" fill="#c2410c" fontWeight="700">CARPA 2</text>
      <text x="205" y="178" textAnchor="middle" className="text-[10px]" fill="#f97316">6 × 3 m</text>
      {/* Zona de unión */}
      <rect x="118" y="128" width="4" height="74" fill="#6b7280" rx="1" opacity="0.5"/>
      <text x="140" y="220" className="text-[9px]" fill="#6b7280">Unión en L</text>
      {/* Cotas vertical */}
      <line x1="25" y1="30" x2="25" y2="200" stroke="#374151" strokeWidth="1.5"/>
      <line x1="20" y1="30" x2="30" y2="30" stroke="#374151" strokeWidth="1.5"/>
      <line x1="20" y1="200" x2="30" y2="200" stroke="#374151" strokeWidth="1.5"/>
      <text x="15" y="120" textAnchor="middle" className="text-[10px]" fill="#374151" fontWeight="600" transform="rotate(-90,15,120)">6,00 m</text>
      {/* Cotas horizontal */}
      <line x1="120" y1="225" x2="290" y2="225" stroke="#374151" strokeWidth="1.5"/>
      <line x1="120" y1="220" x2="120" y2="230" stroke="#374151" strokeWidth="1.5"/>
      <line x1="290" y1="220" x2="290" y2="230" stroke="#374151" strokeWidth="1.5"/>
      <text x="205" y="242" textAnchor="middle" className="text-[11px]" fill="#374151" fontWeight="600">6,00 m</text>
      {/* Ángulo */}
      <path d="M110 115 L130 115 L130 135" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3"/>
      <text x="145" y="118" className="text-[9px]" fill="#ef4444" fontWeight="600">90°</text>
      <rect x="95" y="268" width="130" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="160" y="283" textAnchor="middle" className="text-[11px]" fill="#166534" fontWeight="700">Total: 36 m²</text>
    </svg>
  )
}

function DiagramaSeparadas() {
  return (
    <svg viewBox="0 0 380 220" className="w-full max-w-lg mx-auto">
      <defs>
        <pattern id="grid-sp" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/></pattern>
        <linearGradient id="tent-a4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/></linearGradient>
        <linearGradient id="tent-b4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity="0.15"/><stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/></linearGradient>
      </defs>
      <rect width="380" height="220" fill="white" rx="12"/>
      <rect width="380" height="220" fill="url(#grid-sp)" rx="12"/>
      {/* Carpa 1 */}
      <rect x="20" y="35" width="140" height="100" fill="url(#tent-a4)" stroke="#3b82f6" strokeWidth="2.5" rx="4"/>
      <text x="90" y="80" textAnchor="middle" className="text-[11px]" fill="#1e40af" fontWeight="700">CARPA 1</text>
      <text x="90" y="97" textAnchor="middle" className="text-[10px]" fill="#3b82f6">6 × 3 m</text>
      <text x="90" y="113" textAnchor="middle" className="text-[9px]" fill="#64748b">Punto A</text>
      {/* Carpa 2 */}
      <rect x="220" y="35" width="140" height="100" fill="url(#tent-b4)" stroke="#f97316" strokeWidth="2.5" rx="4"/>
      <text x="290" y="80" textAnchor="middle" className="text-[11px]" fill="#c2410c" fontWeight="700">CARPA 2</text>
      <text x="290" y="97" textAnchor="middle" className="text-[10px]" fill="#f97316">6 × 3 m</text>
      <text x="290" y="113" textAnchor="middle" className="text-[9px]" fill="#64748b">Punto B</text>
      {/* Separación */}
      <line x1="168" y1="70" x2="212" y2="70" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,4"/>
      <line x1="168" y1="100" x2="212" y2="100" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,4"/>
      <text x="190" y="88" textAnchor="middle" className="text-[10px]" fill="#94a3b8" fontWeight="500">···</text>
      {/* Labels abajo */}
      <rect x="20" y="155" width="140" height="22" rx="11" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1"/>
      <text x="90" y="170" textAnchor="middle" className="text-[10px]" fill="#1e40af" fontWeight="600">18 m²</text>
      <rect x="220" y="155" width="140" height="22" rx="11" fill="#fff7ed" stroke="#fed7aa" strokeWidth="1"/>
      <text x="290" y="170" textAnchor="middle" className="text-[10px]" fill="#c2410c" fontWeight="600">18 m²</text>
      <rect x="120" y="190" width="140" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="190" y="205" textAnchor="middle" className="text-[11px]" fill="#166534" fontWeight="700">Total: 2 × 18 m²</text>
    </svg>
  )
}

// ===================== COMPONENTE PRINCIPAL =====================
export default function PMAPage() {
  const { data: session } = useSession()
  const [mainTab, setMainTab] = useState<'inventario' | 'remolque' | 'despliegues' | 'ficha'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [loading, setLoading] = useState(true)

  // Datos inventario
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [peticiones, setPeticiones] = useState<Peticion[]>([])
  const [categoriaPMA, setCategoriaPMA] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all')
  const [filtroPeticiones, setFiltroPeticiones] = useState('all')

  // Modales
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false)
  const [showEditArticulo, setShowEditArticulo] = useState(false)
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)

  // Checklist remolque
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(CHECKLIST_INICIAL)
  const [checklistCategoriaFiltro, setChecklistCategoriaFiltro] = useState('all')
  const [verificando, setVerificando] = useState(false)
  const [verificaciones, setVerificaciones] = useState<any[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [showNuevoItem, setShowNuevoItem] = useState(false)

  // Despliegues
  const [despliegueSeleccionado, setDespliegueSeleccionado] = useState<string>('cuadrado')

  // Paginación
  const ITEMS_POR_PAGINA = 30
  const [paginaActual, setPaginaActual] = useState(1)

  // ---- CARGA DE DATOS ----
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const resInv = await fetch('/api/logistica?inventario=pma')
      const dataInv = await resInv.json()
      setArticulos(dataInv.articulos || [])
      setFamilias(dataInv.familias || [])

      const resCat = await fetch('/api/logistica?tipo=categoria&slug=pma')
      const dataCat = await resCat.json()
      if (dataCat.categoria) setCategoriaPMA(dataCat.categoria.id)
    } catch (error) { console.error('Error cargando datos PMA:', error) }
    finally { setLoading(false) }
  }, [])

  const cargarPeticiones = useCallback(async () => {
    try {
      const res = await fetch('/api/logistica/peticiones?area=pma')
      const data = await res.json()
      setPeticiones(data.peticiones || [])
    } catch (error) { console.error('Error cargando peticiones:', error) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab, cargarPeticiones])

  // ---- HANDLERS ----
  const handleCrearArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', codigo: form.get('codigo'), nombre: form.get('nombre'), descripcion: form.get('descripcion'), stockActual: parseInt(form.get('stockActual') as string) || 0, stockMinimo: parseInt(form.get('stockMinimo') as string) || 0, unidad: form.get('unidad') || 'unidad', familiaId: form.get('familiaId'), categoriaSlug: 'pma' }) })
      if (res.ok) { setShowNuevoArticulo(false); cargarDatos() }
    } catch (error) { console.error('Error:', error) }
  }

  const handleEditarArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!articuloSeleccionado) return
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', id: articuloSeleccionado.id, codigo: form.get('codigo'), nombre: form.get('nombre'), descripcion: form.get('descripcion'), stockActual: parseInt(form.get('stockActual') as string) || 0, stockMinimo: parseInt(form.get('stockMinimo') as string) || 0, unidad: form.get('unidad'), familiaId: form.get('familiaId') }) })
      if (res.ok) { setShowEditArticulo(false); setArticuloSeleccionado(null); cargarDatos() }
    } catch (error) { console.error('Error:', error) }
  }

  const handleCrearPeticion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'peticion', articuloId: form.get('articuloId') || null, nombreArticulo: form.get('nombreArticulo'), cantidad: parseInt(form.get('cantidad') as string) || 1, unidad: form.get('unidad') || 'unidad', prioridad: form.get('prioridad') || 'normal', descripcion: form.get('descripcion'), areaOrigen: 'pma' }) })
      if (res.ok) { setShowNuevaPeticion(false); cargarPeticiones() }
    } catch (error) { console.error('Error:', error) }
  }

  const handleCrearFamilia = async (nombre: string) => {
    if (!categoriaPMA || !nombre.trim()) return
    try {
      await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', nombre: nombre.trim(), categoriaId: categoriaPMA }) })
      cargarDatos()
    } catch (error) { console.error('Error:', error) }
  }

  const handleEliminarFamilia = async (id: string) => {
    try {
      await fetch(`/api/logistica?tipo=familia&id=${id}`, { method: 'DELETE' })
      cargarDatos()
    } catch (error) { console.error('Error:', error) }
  }

  const toggleCheckItem = (id: string) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, verificado: !item.verificado } : item))
  }

  const handleGuardarVerificacion = () => {
    const verificados = checklistItems.filter(i => i.verificado).length
    const nueva = { id: Date.now().toString(), fecha: new Date().toISOString(), realizadoPor: session?.user?.name || 'Usuario', itemsVerificados: verificados, totalItems: checklistItems.length, items: checklistItems.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, ok: i.verificado, observacion: i.observacion })) }
    setVerificaciones(prev => [nueva, ...prev])
    setVerificando(false)
    setChecklistItems(prev => prev.map(i => ({ ...i, verificado: false, observacion: undefined })))
  }

  const handleAgregarItemChecklist = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nuevo: ChecklistItem = { id: `custom-${Date.now()}`, nombre: form.get('nombre') as string, cantidad: parseInt(form.get('cantidad') as string) || 1, categoria: form.get('categoria') as string, verificado: false }
    setChecklistItems(prev => [...prev, nuevo])
    setShowNuevoItem(false)
  }

  // ---- FILTROS ----
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || a.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia?.id === selectedFamiliaFilter
    return matchSearch && matchFamilia
  })
  const totalPaginas = Math.ceil(articulosFiltrados.length / ITEMS_POR_PAGINA)
  const articulosPaginados = articulosFiltrados.slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)

  const peticionesFiltradas = peticiones.filter(p => filtroPeticiones === 'all' || p.estado === filtroPeticiones)

  const checklistFiltrada = checklistItems.filter(i => checklistCategoriaFiltro === 'all' || i.categoria === checklistCategoriaFiltro)
  const checklistStats = { total: checklistItems.length, verificados: checklistItems.filter(i => i.verificado).length }

  const statsData = { totalArticulos: articulos.length, stockBajo: articulos.filter(a => a.stockActual <= a.stockMinimo).length, totalChecklist: checklistItems.length, ultimaVerificacion: verificaciones[0]?.fecha }

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-orange-500" /></div>

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Puesto de Mando Avanzado</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión del PMA — MasterTent Rescue 6×3m (×2)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mainTab === 'inventario' && (<>
            <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"><Send className="w-4 h-4" /> Petición</button>
            <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-3.5 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-all shadow-sm"><Plus className="w-4 h-4" /> Artículo</button>
          </>)}
          {mainTab === 'remolque' && !verificando && (
            <button onClick={() => setVerificando(true)} className="flex items-center gap-2 px-3.5 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-all shadow-sm"><ClipboardCheck className="w-4 h-4" /> Iniciar Verificación</button>
          )}
          <button onClick={cargarDatos} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center gap-3"><div className="p-2.5 bg-orange-50 rounded-xl"><Package className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold text-slate-800">{statsData.totalArticulos}</p><p className="text-xs text-slate-500">Material del Área</p></div></div></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center gap-3"><div className="p-2.5 bg-red-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold text-slate-800">{statsData.stockBajo}</p><p className="text-xs text-slate-500">Stock Bajo</p></div></div></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center gap-3"><div className="p-2.5 bg-blue-50 rounded-xl"><ClipboardList className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-slate-800">{statsData.totalChecklist}</p><p className="text-xs text-slate-500">Items Remolque</p></div></div></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center gap-3"><div className="p-2.5 bg-emerald-50 rounded-xl"><Tent className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold text-slate-800">2</p><p className="text-xs text-slate-500">Carpas MasterTent</p></div></div></div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {[
          { key: 'inventario' as const, label: 'Inventario del Área', icon: Package },
          { key: 'remolque' as const, label: 'Material Remolque', icon: ClipboardCheck },
          { key: 'despliegues' as const, label: 'Configuraciones de Despliegue', icon: Tent },
          { key: 'ficha' as const, label: 'Ficha Técnica', icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${mainTab === tab.key ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB: INVENTARIO ==================== */}
      {mainTab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl">
            {[{ key: 'stock' as const, label: 'Stock' }, { key: 'peticiones' as const, label: 'Peticiones' }, { key: 'movimientos' as const, label: 'Movimientos' }].map(tab => (
              <button key={tab.key} onClick={() => { setInventoryTab(tab.key); setPaginaActual(1) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${inventoryTab === tab.key ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
            ))}
          </div>

          {/* SUB-TAB: STOCK */}
          {inventoryTab === 'stock' && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPaginaActual(1) }} placeholder="Buscar artículo..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
                <select value={selectedFamiliaFilter} onChange={e => { setSelectedFamiliaFilter(e.target.value); setPaginaActual(1) }} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="all">Todas las familias</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"><Wrench className="w-4 h-4" /> Familias</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Artículo</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Familia</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Stock</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Mínimo</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Unidad</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Estado</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Acciones</th></tr></thead>
                  <tbody>
                    {articulosPaginados.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No hay artículos en el inventario del PMA</td></tr>
                    ) : articulosPaginados.map(a => (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{a.codigo || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                        <td className="px-4 py-3 text-slate-500">{a.familia?.nombre || '—'}</td>
                        <td className="px-4 py-3 text-center font-semibold">{a.stockActual}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{a.stockMinimo}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{a.unidad}</td>
                        <td className="px-4 py-3 text-center">{a.stockActual <= a.stockMinimo ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Bajo</span> : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">OK</span>}</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => { setArticuloSeleccionado(a); setShowEditArticulo(true) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><Edit className="w-4 h-4 text-slate-400" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Mostrando {(paginaActual-1)*ITEMS_POR_PAGINA+1}-{Math.min(paginaActual*ITEMS_POR_PAGINA, articulosFiltrados.length)} de {articulosFiltrados.length}</p><div className="flex gap-1">{Array.from({length:totalPaginas},(_,i)=>(<button key={i} onClick={()=>setPaginaActual(i+1)} className={`px-3 py-1.5 rounded-lg text-sm ${paginaActual===i+1?'bg-orange-500 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{i+1}</button>))}</div></div>
              )}
            </div>
          )}

          {/* SUB-TAB: PETICIONES */}
          {inventoryTab === 'peticiones' && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFiltroPeticiones('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroPeticiones === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Todas</button>
                {Object.entries(ESTADOS_PETICION).map(([key, val]) => (<button key={key} onClick={() => setFiltroPeticiones(key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroPeticiones === key ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{val.label}</button>))}
              </div>
              <div className="space-y-3">
                {peticionesFiltradas.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">No hay peticiones</div> : peticionesFiltradas.map(p => {
                  const estado = ESTADOS_PETICION[p.estado] || ESTADOS_PETICION.pendiente
                  const prioridad = PRIORIDADES[p.prioridad] || PRIORIDADES.normal
                  return (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs text-slate-400">{p.numero}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.label}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridad.color}`}>{prioridad.label}</span></div>
                          <p className="font-medium text-slate-800 mt-1">{p.nombreArticulo} <span className="text-slate-400">× {p.cantidad} {p.unidad}</span></p>
                          {p.descripcion && <p className="text-sm text-slate-500 mt-1">{p.descripcion}</p>}
                          <p className="text-xs text-slate-400 mt-2">{p.solicitante?.nombre} — {new Date(p.fechaSolicitud).toLocaleDateString('es-ES')}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB: MOVIMIENTOS */}
          {inventoryTab === 'movimientos' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center"><History className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">Historial de movimientos de stock</p><p className="text-sm text-slate-300 mt-1">Se registrarán automáticamente al crear peticiones y recibir material</p></div>
          )}
        </div>
      )}

      {/* ==================== TAB: MATERIAL REMOLQUE ==================== */}
      {mainTab === 'remolque' && (
        <div className="space-y-4">
          {verificando && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><ClipboardCheck className="w-5 h-5 text-orange-600" /><div><p className="font-semibold text-orange-800">Verificación en curso</p><p className="text-sm text-orange-600">{checklistStats.verificados} de {checklistStats.total} items verificados</p></div></div>
              <div className="flex gap-2">
                <button onClick={() => { setVerificando(false); setChecklistItems(prev => prev.map(i => ({...i, verificado: false}))) }} className="px-3 py-2 bg-white border border-orange-200 rounded-xl text-sm font-medium text-orange-700 hover:bg-orange-50">Cancelar</button>
                <button onClick={handleGuardarVerificacion} className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Verificación</button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setChecklistCategoriaFiltro('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${checklistCategoriaFiltro === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Todos ({checklistItems.length})</button>
              {CATEGORIAS_CHECKLIST.map(cat => { const count = checklistItems.filter(i => i.categoria === cat).length; return count > 0 ? <button key={cat} onClick={() => setChecklistCategoriaFiltro(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${checklistCategoriaFiltro === cat ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{cat} ({count})</button> : null })}
            </div>
            <div className="flex gap-2">
              {verificaciones.length > 0 && <button onClick={() => setShowHistorial(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><History className="w-4 h-4" /> Historial</button>}
              <button onClick={() => setShowNuevoItem(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4" /> Añadir Item</button>
            </div>
          </div>

          {/* Tabla checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                {verificando && <th className="w-12 px-4 py-3"></th>}
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Material</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Cantidad</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoría</th>
                {verificando && <th className="text-left px-4 py-3 font-semibold text-slate-600">Observación</th>}
                {!verificando && <th className="text-center px-4 py-3 font-semibold text-slate-600">Acciones</th>}
              </tr></thead>
              <tbody>
                {checklistFiltrada.map(item => (
                  <tr key={item.id} className={`border-b border-slate-100 transition-all ${verificando && item.verificado ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}>
                    {verificando && <td className="px-4 py-3"><button onClick={() => toggleCheckItem(item.id)} className="p-0.5">{item.verificado ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}</button></td>}
                    <td className={`px-4 py-3 font-medium ${verificando && item.verificado ? 'text-emerald-700' : 'text-slate-800'}`}>{item.nombre}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{item.cantidad}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{item.categoria}</span></td>
                    {verificando && <td className="px-4 py-3"><input placeholder="Observación..." className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-200" onChange={e => setChecklistItems(prev => prev.map(i => i.id === item.id ? {...i, observacion: e.target.value} : i))} /></td>}
                    {!verificando && <td className="px-4 py-3 text-center">{item.id.startsWith('custom-') && <button onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verificando && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-3"><div className="flex-1 bg-slate-100 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full transition-all" style={{width: `${(checklistStats.verificados/checklistStats.total)*100}%`}} /></div><span className="text-sm font-semibold text-slate-700">{Math.round((checklistStats.verificados/checklistStats.total)*100)}%</span></div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: DESPLIEGUES ==================== */}
      {mainTab === 'despliegues' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-800 mb-1">Configuraciones de Despliegue</h3>
            <p className="text-sm text-slate-500">Con 2 unidades MasterTent Rescue 6×3m se pueden realizar 4 configuraciones de despliegue distintas según las necesidades operativas.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CONFIGURACIONES.map(config => {
              const icons: Record<string, any> = { cuadrado: LayoutGrid, lineal: AlignHorizontalSpaceBetween, ele: CornerDownRight, separadas: Maximize2 }
              const Icon = icons[config.id] || LayoutGrid
              return (
                <button key={config.id} onClick={() => setDespliegueSeleccionado(config.id)} className={`bg-white border rounded-2xl p-4 text-left transition-all ${despliegueSeleccionado === config.id ? 'border-orange-400 ring-2 ring-orange-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-2 mb-2"><Icon className={`w-5 h-5 ${despliegueSeleccionado === config.id ? 'text-orange-600' : 'text-slate-400'}`} /><span className={`text-sm font-semibold ${despliegueSeleccionado === config.id ? 'text-orange-700' : 'text-slate-700'}`}>{config.nombre}</span></div>
                  <p className="text-xs text-slate-500">{config.medidas}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{config.superficie}</p>
                </button>
              )
            })}
          </div>

          {/* Diagrama */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-bold text-slate-800">{CONFIGURACIONES.find(c => c.id === despliegueSeleccionado)?.nombre}</h3>
              <p className="text-sm text-slate-500">{CONFIGURACIONES.find(c => c.id === despliegueSeleccionado)?.medidas} — {CONFIGURACIONES.find(c => c.id === despliegueSeleccionado)?.superficie}</p>
            </div>
            <div className="flex justify-center py-4">
              {despliegueSeleccionado === 'cuadrado' && <DiagramaCuadrado />}
              {despliegueSeleccionado === 'lineal' && <DiagramaLineal />}
              {despliegueSeleccionado === 'ele' && <DiagramaEle />}
              {despliegueSeleccionado === 'separadas' && <DiagramaSeparadas />}
            </div>
          </div>

          {/* Info de la config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Info className="w-4 h-4 text-orange-500" /> Descripción</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{CONFIGURACIONES.find(c => c.id === despliegueSeleccionado)?.descripcion}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Uso Recomendado</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{CONFIGURACIONES.find(c => c.id === despliegueSeleccionado)?.usoRecomendado}</p>
            </div>
          </div>

          {/* Datos técnicos compartidos */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
            <h4 className="font-semibold text-orange-800 mb-3">Datos técnicos de cada unidad</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-orange-600 font-medium">Montaje</p><p className="text-slate-700 font-semibold">&lt; 60 segundos</p></div>
              <div><p className="text-orange-600 font-medium">Peso unitario</p><p className="text-slate-700 font-semibold">56,2 kg</p></div>
              <div><p className="text-orange-600 font-medium">Resistencia viento</p><p className="text-slate-700 font-semibold">Hasta 80 km/h</p></div>
              <div><p className="text-orange-600 font-medium">Certificación</p><p className="text-slate-700 font-semibold">TÜV — Ignífuga</p></div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: FICHA TÉCNICA ==================== */}
      {mainTab === 'ficha' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><Tent className="w-8 h-8" /></div>
                <div><h2 className="text-xl font-bold">{SPECS_MASTERTENT.modelo}</h2><p className="text-orange-100">{SPECS_MASTERTENT.medidas} — {SPECS_MASTERTENT.unidades} unidades</p></div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dimensiones */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Ruler className="w-4 h-4 text-orange-500" /> Dimensiones</h4>
                  <div className="space-y-2 text-sm">{[['Medidas desplegada', SPECS_MASTERTENT.medidas], ['Superficie', SPECS_MASTERTENT.superficie], ['Altura recogida', SPECS_MASTERTENT.alturaRecogida], ['Altura al pico', SPECS_MASTERTENT.alturaPico], ['Medidas plegada', SPECS_MASTERTENT.medidasPlegada], ['Peso', SPECS_MASTERTENT.peso]].map(([l,v]) => (<div key={l} className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800">{v}</span></div>))}</div>
                </div>
                {/* Características */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-orange-500" /> Características</h4>
                  <div className="space-y-2 text-sm">{[['Estructura', SPECS_MASTERTENT.estructura], ['Techo', SPECS_MASTERTENT.techo], ['Paredes', SPECS_MASTERTENT.paredesLaterales], ['Suelo', SPECS_MASTERTENT.suelo]].map(([l,v]) => (<div key={l} className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800">{v}</span></div>))}</div>
                </div>
              </div>
              {/* Certificaciones */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-4">Certificaciones y Resistencia</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center"><Droplets className="w-6 h-6 text-blue-600 mx-auto mb-2" /><p className="text-xs font-semibold text-blue-800">Impermeable</p><p className="text-xs text-blue-600">{SPECS_MASTERTENT.impermeable}</p></div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center"><Flame className="w-6 h-6 text-red-600 mx-auto mb-2" /><p className="text-xs font-semibold text-red-800">Ignífuga</p><p className="text-xs text-red-600">{SPECS_MASTERTENT.ignifugo}</p></div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center"><Wind className="w-6 h-6 text-emerald-600 mx-auto mb-2" /><p className="text-xs font-semibold text-emerald-800">Viento</p><p className="text-xs text-emerald-600">{SPECS_MASTERTENT.resistenciaViento}</p></div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center"><Timer className="w-6 h-6 text-amber-600 mx-auto mb-2" /><p className="text-xs font-semibold text-amber-800">Montaje</p><p className="text-xs text-amber-600">{SPECS_MASTERTENT.montaje}</p></div>
                </div>
              </div>
              {/* Paredes */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-3">Sistema de Paredes Modulares</h4>
                <p className="text-sm text-slate-600 mb-4">Las paredes del Kit Rescue incorporan un sistema multicapa que permite transformar las ventanas en puertas. Cada pared incluye: red anti-insectos, cobertura transparente PVC, y cobertura de oscurecimiento total.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {['Pared cerrada', 'Pared con ventana', 'Pared con puerta enrollable', 'Pared divisoria interior'].map(tipo => (
                    <div key={tipo} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"><Box className="w-5 h-5 text-slate-400 mx-auto mb-1" /><p className="text-xs font-medium text-slate-700">{tipo}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODALES ==================== */}

      {/* Modal Nuevo Artículo */}
      {showNuevoArticulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Nuevo Artículo PMA</h3><button onClick={() => setShowNuevoArticulo(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleCrearArticulo} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Código</label><input name="codigo" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="unidad">Unidad</option><option value="metro">Metro</option><option value="kg">Kg</option><option value="litro">Litro</option><option value="caja">Caja</option><option value="rollo">Rollo</option><option value="par">Par</option></select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label><input name="nombre" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><textarea name="descripcion" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Familia *</label><select name="familiaId" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="">Seleccionar familia...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label><input name="stockActual" type="number" defaultValue={0} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label><input name="stockMinimo" type="number" defaultValue={0} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Crear Artículo</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Artículo */}
      {showEditArticulo && articuloSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Editar Artículo</h3><button onClick={() => { setShowEditArticulo(false); setArticuloSeleccionado(null) }} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleEditarArticulo} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Código</label><input name="codigo" defaultValue={articuloSeleccionado.codigo || ''} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" defaultValue={articuloSeleccionado.unidad} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="unidad">Unidad</option><option value="metro">Metro</option><option value="kg">Kg</option><option value="litro">Litro</option><option value="caja">Caja</option><option value="rollo">Rollo</option><option value="par">Par</option></select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label><input name="nombre" required defaultValue={articuloSeleccionado.nombre} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><textarea name="descripcion" rows={2} defaultValue={articuloSeleccionado.descripcion || ''} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Familia *</label><select name="familiaId" required defaultValue={articuloSeleccionado.familia?.id || ''} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label><input name="stockActual" type="number" defaultValue={articuloSeleccionado.stockActual} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label><input name="stockMinimo" type="number" defaultValue={articuloSeleccionado.stockMinimo} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => { setShowEditArticulo(false); setArticuloSeleccionado(null) }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Guardar Cambios</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Petición */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Nueva Petición — PMA</h3><button onClick={() => setShowNuevaPeticion(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleCrearPeticion} className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Artículo del inventario</label><select name="articuloId" onChange={e => { const art = articulos.find(a => a.id === e.target.value); if (art) { const nameInput = e.target.form?.querySelector('input[name="nombreArticulo"]') as HTMLInputElement; const unitInput = e.target.form?.querySelector('select[name="unidad"]') as HTMLSelectElement; if (nameInput) nameInput.value = art.nombre; if (unitInput) unitInput.value = art.unidad }}} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="">Seleccionar artículo (opcional)...</option>{articulos.map(a => <option key={a.id} value={a.id}>{a.nombre} (Stock: {a.stockActual})</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre del material *</label><input name="nombreArticulo" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Cantidad *</label><input name="cantidad" type="number" required min={1} defaultValue={1} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="unidad">Unidad</option><option value="metro">Metro</option><option value="kg">Kg</option><option value="litro">Litro</option><option value="caja">Caja</option></select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label><select name="prioridad" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="normal">Normal</option><option value="baja">Baja</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Descripción</label><textarea name="descripcion" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Enviar Petición</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión Familias */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Familias de Material — PMA</h3><button onClick={() => setShowGestionFamilias(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              <form onSubmit={e => { e.preventDefault(); const input = (e.currentTarget.elements.namedItem('nombreFamilia') as HTMLInputElement); handleCrearFamilia(input.value); input.value = '' }} className="flex gap-2"><input name="nombreFamilia" placeholder="Nueva familia..." className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /><button type="submit" className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Añadir</button></form>
              <div className="space-y-2">{familias.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No hay familias creadas</p> : familias.map(f => (<div key={f.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl"><div><span className="text-sm font-medium text-slate-700">{f.nombre}</span><span className="text-xs text-slate-400 ml-2">({f._count?.articulos || 0} artículos)</span></div><button onClick={() => { if ((f._count?.articulos || 0) === 0) handleEliminarFamilia(f.id); else alert('No se puede eliminar: tiene artículos asociados') }} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button></div>))}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Item Checklist */}
      {showNuevoItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Añadir al Remolque</h3><button onClick={() => setShowNuevoItem(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleAgregarItemChecklist} className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Material *</label><input name="nombre" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label><input name="cantidad" type="number" defaultValue={1} min={1} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label><select name="categoria" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">{CATEGORIAS_CHECKLIST.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowNuevoItem(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Añadir</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial Verificaciones */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Historial de Verificaciones</h3><button onClick={() => setShowHistorial(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              {verificaciones.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No hay verificaciones registradas</p> : verificaciones.map(v => (
                <div key={v.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2"><span className="font-semibold text-slate-800">{new Date(v.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.itemsVerificados === v.totalItems ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.itemsVerificados}/{v.totalItems}</span></div>
                  <p className="text-sm text-slate-500">Realizado por: {v.realizadoPor}</p>
                  {v.items.filter((i: any) => !i.ok || i.observacion).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200"><p className="text-xs font-medium text-slate-600 mb-1">Incidencias:</p>{v.items.filter((i: any) => !i.ok).map((i: any, idx: number) => <p key={idx} className="text-xs text-red-600">- {i.nombre}: No verificado{i.observacion ? ` — ${i.observacion}` : ''}</p>)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
