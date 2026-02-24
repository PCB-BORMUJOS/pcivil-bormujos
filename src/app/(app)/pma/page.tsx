'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, Plus, Search, Edit, Trash2, X, Save,
  Package, AlertTriangle, CheckCircle, ShoppingCart,
  Wrench, Clock, History, Send, Check, ClipboardList,
  Tent, ClipboardCheck, CheckSquare, Square,
  Ruler, Timer, Droplets, Flame, Wind, Shield,
  LayoutGrid, AlignHorizontalSpaceBetween, CornerDownRight, Maximize2,
  Eye, FileText, Box, ChevronDown, ChevronRight,
  Info, Layers, Weight, Zap, Users, MapPin
} from 'lucide-react'

// ===================== INTERFACES =====================
interface Articulo {
  id: string; codigo?: string; nombre: string; descripcion?: string
  stockActual: number; stockMinimo: number; unidad: string
  familia?: { id: string; nombre: string }
}
interface Familia { id: string; nombre: string; slug: string; _count?: { articulos: number } }
interface Peticion {
  id: string; numero: string; nombreArticulo: string; cantidad: number
  unidad: string; estado: string; prioridad: string; descripcion?: string
  solicitante?: { nombre: string }; fechaSolicitud: string
}
interface ItemRemolque {
  id: string; nombre: string; cantidad: number; categoria: string
  observaciones?: string
}
interface Verificacion {
  id: string; fecha: string; realizadoPor: string
  itemsOk: number; totalItems: number
  items: { nombre: string; cantidad: number; ok: boolean; obs?: string }[]
}

// ===================== CONSTANTES =====================
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

const CATEGORIAS_REMOLQUE = [
  'Estructura', 'Paredes y Suelo', 'Mobiliario', 'Iluminación y Electricidad',
  'Material Sanitario', 'Comunicaciones', 'Señalización', 'Herramientas', 'Varios'
]

const MATERIAL_COMPLETO_REMOLQUE: Omit<ItemRemolque, 'id'>[] = [
  { nombre: 'Carpa MasterTent Rescue 6×3 m — Unidad 1', cantidad: 1, categoria: 'Estructura' },
  { nombre: 'Carpa MasterTent Rescue 6×3 m — Unidad 2', cantidad: 1, categoria: 'Estructura' },
  { nombre: 'Pesas de cemento 25 kg (lastres)', cantidad: 16, categoria: 'Estructura' },
  { nombre: 'Piquetas de anclaje', cantidad: 16, categoria: 'Estructura' },
  { nombre: 'Mazas para piquetas', cantidad: 2, categoria: 'Estructura' },
  { nombre: 'Canalones de conexión entre carpas', cantidad: 2, categoria: 'Estructura' },
  { nombre: 'Paredes laterales cerradas', cantidad: 4, categoria: 'Paredes y Suelo' },
  { nombre: 'Paredes con ventana PVC transparente', cantidad: 4, categoria: 'Paredes y Suelo' },
  { nombre: 'Paredes con puerta enrollable', cantidad: 2, categoria: 'Paredes y Suelo' },
  { nombre: 'Pared divisoria interior', cantidad: 2, categoria: 'Paredes y Suelo' },
  { nombre: 'Suelo PVC antideslizante 6×3 m', cantidad: 2, categoria: 'Paredes y Suelo' },
  { nombre: 'Barras de conexión paredes', cantidad: 8, categoria: 'Paredes y Suelo' },
  { nombre: 'Mesas plegables', cantidad: 4, categoria: 'Mobiliario' },
  { nombre: 'Sillas plegables', cantidad: 12, categoria: 'Mobiliario' },
  { nombre: 'Mostrador integrado', cantidad: 1, categoria: 'Mobiliario' },
  { nombre: 'Camillas portátiles', cantidad: 2, categoria: 'Mobiliario' },
  { nombre: 'Focos LED portátiles', cantidad: 4, categoria: 'Iluminación y Electricidad' },
  { nombre: 'Regletas multienchufe', cantidad: 4, categoria: 'Iluminación y Electricidad' },
  { nombre: 'Alargadores eléctricos 25 m', cantidad: 2, categoria: 'Iluminación y Electricidad' },
  { nombre: 'Generador portátil', cantidad: 1, categoria: 'Iluminación y Electricidad' },
  { nombre: 'Botiquín primeros auxilios completo', cantidad: 1, categoria: 'Material Sanitario' },
  { nombre: 'Mantas térmicas', cantidad: 10, categoria: 'Material Sanitario' },
  { nombre: 'Kit de curas', cantidad: 2, categoria: 'Material Sanitario' },
  { nombre: 'Walkie-talkie', cantidad: 2, categoria: 'Comunicaciones' },
  { nombre: 'Megáfono', cantidad: 1, categoria: 'Comunicaciones' },
  { nombre: 'Banderola identificativa PMA', cantidad: 2, categoria: 'Señalización' },
  { nombre: 'Conos de señalización', cantidad: 6, categoria: 'Señalización' },
  { nombre: 'Cinta de balizamiento (rollos)', cantidad: 3, categoria: 'Señalización' },
  { nombre: 'Kit herramientas básico', cantidad: 1, categoria: 'Herramientas' },
  { nombre: 'Bridas plásticas (bolsa)', cantidad: 2, categoria: 'Herramientas' },
  { nombre: 'Bidones de agua 10 L', cantidad: 2, categoria: 'Varios' },
  { nombre: 'Bolsas de basura (rollo)', cantidad: 2, categoria: 'Varios' },
]

const SPECS = {
  modelo: 'MasterTent Kit Rescue', medidas: '6 × 3 m', superficie: '18 m²',
  peso: '56,2 kg', alturaRecogida: '201 cm', alturaPico: '327 cm',
  medidasPlegada: '70 × 40 × 152 cm', montaje: '< 60 seg',
  estructura: 'Aluminio anodizado reforzado', techo: 'Poliéster 600D con capa PVC',
  paredes: 'PVC reforzado en parte inferior', suelo: 'PVC antideslizante',
  impermeable: '100 %', ignifugo: 'Sí — Certificado', certificacion: 'TÜV',
  viento: 'Hasta 80 km/h (con lastres)', unidades: 2,
}

interface DespliegueConfig {
  id: string; nombre: string; icono: any; medidas: string; superficie: string
  descripcion: string; uso: string[]
}
const CONFIGURACIONES: DespliegueConfig[] = [
  { id: 'cuadrado', nombre: 'Cuadrado', icono: LayoutGrid, medidas: '6 × 6 m', superficie: '36 m²', descripcion: 'Dos carpas unidas lateralmente por el lado de 6 m formando un espacio cuadrado de 36 m².', uso: ['PMA principal con zona triaje + tratamiento', 'Eventos con afluencia media-alta', 'Puesto de mando en emergencias'] },
  { id: 'lineal', nombre: 'Lineal', icono: AlignHorizontalSpaceBetween, medidas: '12 × 3 m', superficie: '36 m²', descripcion: 'Dos carpas unidas en línea por el lado de 3 m formando un pasillo alargado de 12 metros.', uso: ['Pasillos de evacuación cubiertos', 'PMA en espacios estrechos (calles)', 'Zona de paso, registro y triaje lineal'] },
  { id: 'ele', nombre: 'En L', icono: CornerDownRight, medidas: '9 × 6 m (L)', superficie: '36 m²', descripcion: 'Dos carpas en ángulo de 90° formando una L. Comparten una esquina con canalón de unión.', uso: ['Separar zonas funcionales', 'Adaptación a esquinas de edificios', 'Control visual de dos frentes simultáneos'] },
  { id: 'separadas', nombre: 'Separadas', icono: Maximize2, medidas: '2 × (6 × 3 m)', superficie: '2 × 18 m²', descripcion: 'Cada carpa desplegada de forma independiente en ubicaciones distintas del escenario.', uso: ['Múltiples puntos de atención', 'Eventos dispersos geográficamente', 'Despliegue en zonas alejadas entre sí'] },
]

// ===================== SVG COMPONENTS =====================

function PlantaCuadrado() {
  return (
    <svg viewBox="0 0 440 380" className="w-full">
      <defs>
        <pattern id="g1" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0L0 0 0 15" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/></pattern>
        <linearGradient id="roofA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" stopOpacity="0.18"/><stop offset="100%" stopColor="#dc2626" stopOpacity="0.06"/></linearGradient>
        <linearGradient id="roofB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" stopOpacity="0.14"/><stop offset="100%" stopColor="#dc2626" stopOpacity="0.04"/></linearGradient>
      </defs>
      <rect width="440" height="380" fill="#fafbfc" rx="8"/>
      <rect width="440" height="380" fill="url(#g1)" rx="8"/>
      <text x="220" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">PLANTA — Vista superior</text>
      {/* Carpa 1 */}
      <rect x="60" y="45" width="150" height="150" fill="url(#roofA)" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <line x1="135" y1="45" x2="135" y2="195" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"/>
      <text x="135" y="115" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 1</text>
      <text x="135" y="132" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      {/* Carpa 2 */}
      <rect x="210" y="45" width="150" height="150" fill="url(#roofB)" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <line x1="285" y1="45" x2="285" y2="195" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"/>
      <text x="285" y="115" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 2</text>
      <text x="285" y="132" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      {/* Paredes grises */}
      <rect x="58" y="43" width="304" height="4" fill="#9ca3af" rx="1"/>{/* top */}
      <rect x="58" y="193" width="304" height="4" fill="#9ca3af" rx="1"/>{/* bottom */}
      <rect x="58" y="43" width="4" height="154" fill="#9ca3af" rx="1"/>{/* left */}
      <rect x="358" y="43" width="4" height="154" fill="#9ca3af" rx="1"/>{/* right */}
      {/* Canalón */}
      <rect x="208" y="47" width="4" height="146" fill="#f59e0b" rx="1" opacity="0.8"/>
      <text x="220" y="215" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="600">▲ Canalón unión</text>
      {/* Puertas */}
      <rect x="80" y="193" width="30" height="6" fill="#3b82f6" rx="1" opacity="0.6"/>
      <rect x="310" y="193" width="30" height="6" fill="#3b82f6" rx="1" opacity="0.6"/>
      <text x="95" y="208" textAnchor="middle" fill="#3b82f6" fontSize="7">Puerta</text>
      <text x="325" y="208" textAnchor="middle" fill="#3b82f6" fontSize="7">Puerta</text>
      {/* Cotas horizontal */}
      <line x1="60" y1="240" x2="360" y2="240" stroke="#374151" strokeWidth="1"/>
      <line x1="60" y1="235" x2="60" y2="245" stroke="#374151" strokeWidth="1"/>
      <line x1="360" y1="235" x2="360" y2="245" stroke="#374151" strokeWidth="1"/>
      <text x="210" y="256" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="700">6,00 m</text>
      {/* Cotas vertical */}
      <line x1="400" y1="45" x2="400" y2="195" stroke="#374151" strokeWidth="1"/>
      <line x1="395" y1="45" x2="405" y2="45" stroke="#374151" strokeWidth="1"/>
      <line x1="395" y1="195" x2="405" y2="195" stroke="#374151" strokeWidth="1"/>
      <text x="415" y="125" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="700" transform="rotate(90,415,125)">6,00 m</text>
      {/* Leyenda */}
      <rect x="60" y="275" width="300" height="90" fill="white" stroke="#e2e8f0" strokeWidth="1" rx="6"/>
      <text x="75" y="293" fill="#374151" fontSize="10" fontWeight="600">Leyenda</text>
      <rect x="75" y="302" width="20" height="8" fill="#9ca3af" rx="1"/><text x="102" y="310" fill="#64748b" fontSize="9">Paredes laterales (gris)</text>
      <rect x="75" y="318" width="20" height="8" fill="#dc2626" opacity="0.15" stroke="#dc2626" strokeWidth="0.5" rx="1"/><text x="102" y="326" fill="#64748b" fontSize="9">Techo carpa (rojo)</text>
      <rect x="75" y="334" width="20" height="8" fill="#f59e0b" rx="1" opacity="0.8"/><text x="102" y="342" fill="#64748b" fontSize="9">Canalón de unión</text>
      <rect x="235" y="302" width="20" height="8" fill="#3b82f6" rx="1" opacity="0.6"/><text x="262" y="310" fill="#64748b" fontSize="9">Accesos / Puertas</text>
      <line x1="235" y1="326" x2="255" y2="326" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"/><text x="262" y="330" fill="#64748b" fontSize="9">Cumbrera (línea roja)</text>
      <rect x="148" y="349" width="120" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="208" y="364" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="700">Superficie: 36 m²</text>
    </svg>
  )
}

function AlzadoCuadrado() {
  return (
    <svg viewBox="0 0 440 260" className="w-full">
      <defs>
        <pattern id="g2" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0L0 0 0 15" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/></pattern>
      </defs>
      <rect width="440" height="260" fill="#fafbfc" rx="8"/>
      <rect width="440" height="260" fill="url(#g2)" rx="8"/>
      <text x="220" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">ALZADO — Vista frontal</text>
      {/* Suelo */}
      <line x1="30" y1="210" x2="410" y2="210" stroke="#78716c" strokeWidth="2"/>
      <rect x="30" y="210" width="380" height="8" fill="#e7e5e4" rx="1"/>
      {/* Paredes grises */}
      <rect x="60" y="80" width="8" height="130" fill="#9ca3af" rx="1"/>
      <rect x="352" y="80" width="8" height="130" fill="#9ca3af" rx="1"/>
      {/* Pared frontal gris */}
      <rect x="60" y="80" width="300" height="130" fill="#d1d5db" opacity="0.2" rx="0"/>
      {/* Techo rojo - dos aguas */}
      <polygon points="55,80 210,35 365,80" fill="#dc2626" opacity="0.25" stroke="#dc2626" strokeWidth="2"/>
      <line x1="210" y1="35" x2="210" y2="80" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      {/* Puerta */}
      <rect x="160" y="110" width="60" height="100" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" rx="2"/>
      <circle cx="213" cy="160" r="3" fill="#3b82f6"/>
      <text x="190" y="220" textAnchor="middle" fill="#3b82f6" fontSize="7">Puerta enrollable</text>
      {/* Ventanas */}
      <rect x="85" y="110" width="45" height="35" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" rx="2"/>
      <line x1="107" y1="110" x2="107" y2="145" stroke="#93c5fd" strokeWidth="0.5"/>
      <rect x="280" y="110" width="45" height="35" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" rx="2"/>
      <line x1="302" y1="110" x2="302" y2="145" stroke="#93c5fd" strokeWidth="0.5"/>
      {/* Persona referencia */}
      <circle cx="390" cy="168" r="6" fill="none" stroke="#64748b" strokeWidth="1"/>
      <line x1="390" y1="174" x2="390" y2="198" stroke="#64748b" strokeWidth="1"/>
      <line x1="384" y1="183" x2="396" y2="183" stroke="#64748b" strokeWidth="1"/>
      <line x1="390" y1="198" x2="384" y2="210" stroke="#64748b" strokeWidth="1"/>
      <line x1="390" y1="198" x2="396" y2="210" stroke="#64748b" strokeWidth="1"/>
      <text x="390" y="230" textAnchor="middle" fill="#64748b" fontSize="7">1,75 m</text>
      {/* Cotas altura */}
      <line x1="38" y1="35" x2="38" y2="80" stroke="#374151" strokeWidth="0.8"/>
      <line x1="33" y1="35" x2="43" y2="35" stroke="#374151" strokeWidth="0.8"/>
      <line x1="33" y1="80" x2="43" y2="80" stroke="#374151" strokeWidth="0.8"/>
      <text x="22" y="60" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600">3,27</text>
      <line x1="38" y1="80" x2="38" y2="210" stroke="#374151" strokeWidth="0.8"/>
      <line x1="33" y1="210" x2="43" y2="210" stroke="#374151" strokeWidth="0.8"/>
      <text x="22" y="150" textAnchor="middle" fill="#374151" fontSize="8" fontWeight="600">2,01</text>
      {/* Cota ancho */}
      <line x1="60" y1="240" x2="360" y2="240" stroke="#374151" strokeWidth="0.8"/>
      <line x1="60" y1="235" x2="60" y2="245" stroke="#374151" strokeWidth="0.8"/>
      <line x1="360" y1="235" x2="360" y2="245" stroke="#374151" strokeWidth="0.8"/>
      <text x="210" y="253" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="700">6,00 m</text>
    </svg>
  )
}

function PerfilCuadrado() {
  return (
    <svg viewBox="0 0 440 260" className="w-full">
      <defs>
        <pattern id="g3" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0L0 0 0 15" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/></pattern>
      </defs>
      <rect width="440" height="260" fill="#fafbfc" rx="8"/>
      <rect width="440" height="260" fill="url(#g3)" rx="8"/>
      <text x="220" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">PERFIL — Vista lateral</text>
      {/* Suelo */}
      <line x1="30" y1="210" x2="410" y2="210" stroke="#78716c" strokeWidth="2"/>
      <rect x="30" y="210" width="380" height="8" fill="#e7e5e4" rx="1"/>
      {/* Pared lateral gris carpa 1 */}
      <rect x="60" y="80" width="150" height="130" fill="#d1d5db" opacity="0.15"/>
      <rect x="58" y="78" width="154" height="134" fill="none" stroke="#9ca3af" strokeWidth="2" rx="1"/>
      {/* Techo rojo carpa 1 */}
      <polygon points="55,80 135,40 215,80" fill="#dc2626" opacity="0.3" stroke="#dc2626" strokeWidth="2"/>
      {/* Pared lateral gris carpa 2 */}
      <rect x="210" y="80" width="150" height="130" fill="#d1d5db" opacity="0.12"/>
      <rect x="208" y="78" width="154" height="134" fill="none" stroke="#9ca3af" strokeWidth="2" rx="1"/>
      {/* Techo rojo carpa 2 */}
      <polygon points="205,80 285,40 365,80" fill="#dc2626" opacity="0.3" stroke="#dc2626" strokeWidth="2"/>
      {/* Líneas cumbrera */}
      <line x1="135" y1="40" x2="135" y2="80" stroke="#dc2626" strokeWidth="1" strokeDasharray="3,2" opacity="0.5"/>
      <line x1="285" y1="40" x2="285" y2="80" stroke="#dc2626" strokeWidth="1" strokeDasharray="3,2" opacity="0.5"/>
      {/* Canalón */}
      <rect x="207" y="78" width="6" height="134" fill="#f59e0b" opacity="0.6" rx="1"/>
      {/* Texto carpas */}
      <text x="135" y="150" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="600">CARPA 1</text>
      <text x="285" y="150" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="600">CARPA 2</text>
      {/* Lastres */}
      <rect x="55" y="200" width="16" height="12" fill="#78716c" stroke="#57534e" strokeWidth="1" rx="2"/>
      <rect x="199" y="200" width="16" height="12" fill="#78716c" stroke="#57534e" strokeWidth="1" rx="2"/>
      <rect x="349" y="200" width="16" height="12" fill="#78716c" stroke="#57534e" strokeWidth="1" rx="2"/>
      <text x="210" y="232" textAnchor="middle" fill="#78716c" fontSize="7">Lastres 25 kg</text>
      {/* Cota profundidad */}
      <line x1="60" y1="240" x2="360" y2="240" stroke="#374151" strokeWidth="0.8"/>
      <line x1="60" y1="235" x2="60" y2="245" stroke="#374151" strokeWidth="0.8"/>
      <line x1="210" y1="235" x2="210" y2="245" stroke="#374151" strokeWidth="0.8"/>
      <line x1="360" y1="235" x2="360" y2="245" stroke="#374151" strokeWidth="0.8"/>
      <text x="135" y="253" textAnchor="middle" fill="#374151" fontSize="9" fontWeight="600">3,00 m</text>
      <text x="285" y="253" textAnchor="middle" fill="#374151" fontSize="9" fontWeight="600">3,00 m</text>
      {/* Cota altura */}
      <line x1="38" y1="40" x2="38" y2="210" stroke="#374151" strokeWidth="0.8"/>
      <line x1="33" y1="40" x2="43" y2="40" stroke="#374151" strokeWidth="0.8"/>
      <line x1="33" y1="80" x2="43" y2="80" stroke="#374151" strokeWidth="0.8"/>
      <line x1="33" y1="210" x2="43" y2="210" stroke="#374151" strokeWidth="0.8"/>
      <text x="22" y="62" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600">3,27</text>
      <text x="22" y="150" textAnchor="middle" fill="#374151" fontSize="8" fontWeight="600">2,01</text>
    </svg>
  )
}

function PlantaLineal() {
  return (
    <svg viewBox="0 0 520 280" className="w-full">
      <defs><pattern id="g4" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0L0 0 0 15" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/></pattern></defs>
      <rect width="520" height="280" fill="#fafbfc" rx="8"/>
      <rect width="520" height="280" fill="url(#g4)" rx="8"/>
      <text x="260" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">PLANTA — Configuración Lineal</text>
      {/* Carpa 1 */}
      <rect x="30" y="55" width="220" height="100" fill="#dc2626" opacity="0.08" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <line x1="30" y1="105" x2="250" y2="105" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <text x="140" y="100" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 1</text>
      <text x="140" y="115" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      {/* Paredes */}
      <rect x="28" y="53" width="224" height="4" fill="#9ca3af" rx="1"/>
      <rect x="28" y="153" width="224" height="4" fill="#9ca3af" rx="1"/>
      <rect x="28" y="53" width="4" height="104" fill="#9ca3af" rx="1"/>
      {/* Carpa 2 */}
      <rect x="250" y="55" width="220" height="100" fill="#dc2626" opacity="0.06" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <line x1="250" y1="105" x2="470" y2="105" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <text x="360" y="100" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 2</text>
      <text x="360" y="115" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      {/* Paredes */}
      <rect x="248" y="53" width="224" height="4" fill="#9ca3af" rx="1"/>
      <rect x="248" y="153" width="224" height="4" fill="#9ca3af" rx="1"/>
      <rect x="468" y="53" width="4" height="104" fill="#9ca3af" rx="1"/>
      {/* Canalón */}
      <rect x="248" y="57" width="4" height="96" fill="#f59e0b" opacity="0.8" rx="1"/>
      {/* Puertas */}
      <rect x="50" y="153" width="30" height="5" fill="#3b82f6" opacity="0.6" rx="1"/>
      <rect x="420" y="153" width="30" height="5" fill="#3b82f6" opacity="0.6" rx="1"/>
      {/* Cotas */}
      <line x1="30" y1="185" x2="470" y2="185" stroke="#374151" strokeWidth="1"/>
      <line x1="30" y1="180" x2="30" y2="190" stroke="#374151" strokeWidth="1"/>
      <line x1="470" y1="180" x2="470" y2="190" stroke="#374151" strokeWidth="1"/>
      <text x="250" y="200" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="700">12,00 m</text>
      <line x1="490" y1="55" x2="490" y2="155" stroke="#374151" strokeWidth="1"/>
      <line x1="485" y1="55" x2="495" y2="55" stroke="#374151" strokeWidth="1"/>
      <line x1="485" y1="155" x2="495" y2="155" stroke="#374151" strokeWidth="1"/>
      <text x="505" y="110" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="700">3 m</text>
      <rect x="200" y="220" width="120" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="260" y="235" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="700">Superficie: 36 m²</text>
    </svg>
  )
}

function PlantaEle() {
  return (
    <svg viewBox="0 0 440 380" className="w-full">
      <defs><pattern id="g5" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0L0 0 0 15" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/></pattern></defs>
      <rect width="440" height="380" fill="#fafbfc" rx="8"/>
      <rect width="440" height="380" fill="url(#g5)" rx="8"/>
      <text x="220" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">PLANTA — Configuración en L</text>
      {/* Carpa 1 vertical */}
      <rect x="60" y="40" width="100" height="200" fill="#dc2626" opacity="0.08" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <line x1="110" y1="40" x2="110" y2="240" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <text x="110" y="135" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 1</text>
      <text x="110" y="152" textAnchor="middle" fill="#6b7280" fontSize="9">3 × 6 m</text>
      {/* Paredes carpa 1 */}
      <rect x="58" y="38" width="104" height="4" fill="#9ca3af" rx="1"/>
      <rect x="58" y="38" width="4" height="204" fill="#9ca3af" rx="1"/>
      <rect x="58" y="238" width="104" height="4" fill="#9ca3af" rx="1"/>
      <rect x="158" y="38" width="4" height="104" fill="#9ca3af" rx="1"/>
      {/* Carpa 2 horizontal */}
      <rect x="160" y="140" width="200" height="100" fill="#dc2626" opacity="0.06" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <line x1="160" y1="190" x2="360" y2="190" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <text x="260" y="185" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 2</text>
      <text x="260" y="202" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      {/* Paredes carpa 2 */}
      <rect x="158" y="138" width="204" height="4" fill="#9ca3af" rx="1"/>
      <rect x="158" y="238" width="204" height="4" fill="#9ca3af" rx="1"/>
      <rect x="358" y="138" width="4" height="104" fill="#9ca3af" rx="1"/>
      {/* Ángulo */}
      <path d="M148 130 L170 130 L170 148" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2"/>
      <text x="182" y="128" fill="#ef4444" fontSize="9" fontWeight="600">90°</text>
      {/* Cotas */}
      <line x1="38" y1="40" x2="38" y2="240" stroke="#374151" strokeWidth="1"/>
      <line x1="33" y1="40" x2="43" y2="40" stroke="#374151" strokeWidth="1"/>
      <line x1="33" y1="240" x2="43" y2="240" stroke="#374151" strokeWidth="1"/>
      <text x="25" y="145" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="700" transform="rotate(-90,25,145)">6,00 m</text>
      <line x1="160" y1="265" x2="360" y2="265" stroke="#374151" strokeWidth="1"/>
      <line x1="160" y1="260" x2="160" y2="270" stroke="#374151" strokeWidth="1"/>
      <line x1="360" y1="260" x2="360" y2="270" stroke="#374151" strokeWidth="1"/>
      <text x="260" y="280" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="700">6,00 m</text>
      <rect x="150" y="310" width="140" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="220" y="325" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="700">Superficie: 36 m²</text>
    </svg>
  )
}

function PlantaSeparadas() {
  return (
    <svg viewBox="0 0 520 260" className="w-full">
      <defs><pattern id="g6" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0L0 0 0 15" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/></pattern></defs>
      <rect width="520" height="260" fill="#fafbfc" rx="8"/>
      <rect width="520" height="260" fill="url(#g6)" rx="8"/>
      <text x="260" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">PLANTA — Carpas Separadas</text>
      {/* Carpa 1 */}
      <rect x="30" y="50" width="180" height="120" fill="#dc2626" opacity="0.08" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <rect x="28" y="48" width="184" height="4" fill="#9ca3af" rx="1"/>
      <rect x="28" y="168" width="184" height="4" fill="#9ca3af" rx="1"/>
      <rect x="28" y="48" width="4" height="124" fill="#9ca3af" rx="1"/>
      <rect x="208" y="48" width="4" height="124" fill="#9ca3af" rx="1"/>
      <line x1="120" y1="50" x2="120" y2="170" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <text x="120" y="105" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 1</text>
      <text x="120" y="122" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      <text x="120" y="138" textAnchor="middle" fill="#94a3b8" fontSize="8">Punto A</text>
      {/* Separación */}
      <line x1="230" y1="95" x2="280" y2="95" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,4"/>
      <line x1="230" y1="125" x2="280" y2="125" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,4"/>
      <text x="255" y="115" textAnchor="middle" fill="#94a3b8" fontSize="18">···</text>
      {/* Carpa 2 */}
      <rect x="300" y="50" width="180" height="120" fill="#dc2626" opacity="0.06" stroke="#6b7280" strokeWidth="2" rx="2"/>
      <rect x="298" y="48" width="184" height="4" fill="#9ca3af" rx="1"/>
      <rect x="298" y="168" width="184" height="4" fill="#9ca3af" rx="1"/>
      <rect x="298" y="48" width="4" height="124" fill="#9ca3af" rx="1"/>
      <rect x="478" y="48" width="4" height="124" fill="#9ca3af" rx="1"/>
      <line x1="390" y1="50" x2="390" y2="170" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <text x="390" y="105" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700">CARPA 2</text>
      <text x="390" y="122" textAnchor="middle" fill="#6b7280" fontSize="9">6 × 3 m</text>
      <text x="390" y="138" textAnchor="middle" fill="#94a3b8" fontSize="8">Punto B</text>
      {/* Labels */}
      <rect x="70" y="192" width="100" height="20" rx="10" fill="#fef2f2" stroke="#fecaca" strokeWidth="1"/>
      <text x="120" y="206" textAnchor="middle" fill="#991b1b" fontSize="9" fontWeight="600">18 m²</text>
      <rect x="340" y="192" width="100" height="20" rx="10" fill="#fef2f2" stroke="#fecaca" strokeWidth="1"/>
      <text x="390" y="206" textAnchor="middle" fill="#991b1b" fontSize="9" fontWeight="600">18 m²</text>
      <rect x="195" y="230" width="130" height="22" rx="11" fill="#f0fdf4" stroke="#86efac" strokeWidth="1"/>
      <text x="260" y="245" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="700">Total: 2 × 18 m²</text>
    </svg>
  )
}

// ===================== COMPONENTE PRINCIPAL =====================
export default function PMAPage() {
  const { data: session } = useSession()
  const [mainTab, setMainTab] = useState<'inventario' | 'remolque' | 'despliegues' | 'ficha'>('inventario')
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock')
  const [loading, setLoading] = useState(true)

  // Inventario
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

  // Remolque
  const [materialRemolque, setMaterialRemolque] = useState<ItemRemolque[]>([])
  const [editandoItem, setEditandoItem] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCantidad, setEditCantidad] = useState(1)
  const [editCategoria, setEditCategoria] = useState('')
  const [showNuevoItemRemolque, setShowNuevoItemRemolque] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('all')

  // Verificación
  const [verificando, setVerificando] = useState(false)
  const [checkMap, setCheckMap] = useState<Record<string, { ok: boolean; obs: string }>>({})
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [showHistorial, setShowHistorial] = useState(false)

  // Despliegues
  const [configSeleccionada, setConfigSeleccionada] = useState('cuadrado')
  const [vistaSeleccionada, setVistaSeleccionada] = useState<'planta' | 'alzado' | 'perfil'>('planta')

  // Paginación
  const ITEMS_POR_PAGINA = 30
  const [paginaActual, setPaginaActual] = useState(1)

  // ---- CARGA DE DATOS ----
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const [resInv, resCat] = await Promise.all([
        fetch('/api/logistica?inventario=pma'),
        fetch('/api/logistica?tipo=categoria&slug=pma')
      ])
      const dataInv = await resInv.json()
      const dataCat = await resCat.json()
      setArticulos(dataInv.articulos || [])
      setFamilias(dataInv.familias || [])
      if (dataCat.categoria) setCategoriaPMA(dataCat.categoria.id)
    } catch (err) { console.error('Error cargando datos PMA:', err) }
    finally { setLoading(false) }
  }, [])

  const cargarPeticiones = useCallback(async () => {
    try {
      const res = await fetch('/api/logistica/peticiones?area=pma')
      const data = await res.json()
      setPeticiones(data.peticiones || [])
    } catch (err) { console.error('Error:', err) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])
  useEffect(() => { if (inventoryTab === 'peticiones') cargarPeticiones() }, [inventoryTab, cargarPeticiones])

  // ---- HANDLERS INVENTARIO ----
  const handleCrearArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    try { const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', codigo: f.get('codigo'), nombre: f.get('nombre'), descripcion: f.get('descripcion'), stockActual: parseInt(f.get('stockActual') as string) || 0, stockMinimo: parseInt(f.get('stockMinimo') as string) || 0, unidad: f.get('unidad') || 'unidad', familiaId: f.get('familiaId'), categoriaSlug: 'pma' }) }); if (r.ok) { setShowNuevoArticulo(false); cargarDatos() } } catch (err) { console.error(err) }
  }
  const handleEditarArticulo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!articuloSeleccionado) return; const f = new FormData(e.currentTarget)
    try { const r = await fetch('/api/logistica', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'articulo', id: articuloSeleccionado.id, codigo: f.get('codigo'), nombre: f.get('nombre'), descripcion: f.get('descripcion'), stockActual: parseInt(f.get('stockActual') as string) || 0, stockMinimo: parseInt(f.get('stockMinimo') as string) || 0, unidad: f.get('unidad'), familiaId: f.get('familiaId') }) }); if (r.ok) { setShowEditArticulo(false); setArticuloSeleccionado(null); cargarDatos() } } catch (err) { console.error(err) }
  }
  const handleCrearPeticion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    try { const r = await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'peticion', articuloId: f.get('articuloId') || null, nombreArticulo: f.get('nombreArticulo'), cantidad: parseInt(f.get('cantidad') as string) || 1, unidad: f.get('unidad') || 'unidad', prioridad: f.get('prioridad') || 'normal', descripcion: f.get('descripcion'), areaOrigen: 'pma' }) }); if (r.ok) { setShowNuevaPeticion(false); cargarPeticiones() } } catch (err) { console.error(err) }
  }
  const handleCrearFamilia = async (nombre: string) => {
    if (!categoriaPMA || !nombre.trim()) return
    try { await fetch('/api/logistica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'familia', nombre: nombre.trim(), categoriaId: categoriaPMA }) }); cargarDatos() } catch (err) { console.error(err) }
  }
  const handleEliminarFamilia = async (id: string) => {
    try { await fetch(`/api/logistica?tipo=familia&id=${id}`, { method: 'DELETE' }); cargarDatos() } catch (err) { console.error(err) }
  }

  // ---- HANDLERS REMOLQUE ----
  const generarListadoCompleto = () => {
    const items: ItemRemolque[] = MATERIAL_COMPLETO_REMOLQUE.map((m, i) => ({ ...m, id: `rem-${Date.now()}-${i}` }))
    setMaterialRemolque(items)
  }
  const agregarItemRemolque = (nombre: string, cantidad: number, categoria: string) => {
    setMaterialRemolque(prev => [...prev, { id: `rem-${Date.now()}`, nombre, cantidad, categoria }])
    setShowNuevoItemRemolque(false)
  }
  const eliminarItemRemolque = (id: string) => setMaterialRemolque(prev => prev.filter(i => i.id !== id))
  const guardarEdicion = (id: string) => {
    setMaterialRemolque(prev => prev.map(i => i.id === id ? { ...i, nombre: editNombre, cantidad: editCantidad, categoria: editCategoria } : i))
    setEditandoItem(null)
  }
  const iniciarEdicion = (item: ItemRemolque) => {
    setEditandoItem(item.id); setEditNombre(item.nombre); setEditCantidad(item.cantidad); setEditCategoria(item.categoria)
  }

  // ---- HANDLERS VERIFICACIÓN ----
  const iniciarVerificacion = () => {
    setVerificando(true)
    const map: Record<string, { ok: boolean; obs: string }> = {}
    materialRemolque.forEach(i => { map[i.id] = { ok: false, obs: '' } })
    setCheckMap(map)
  }
  const toggleCheck = (id: string) => setCheckMap(prev => ({ ...prev, [id]: { ...prev[id], ok: !prev[id].ok } }))
  const setObs = (id: string, obs: string) => setCheckMap(prev => ({ ...prev, [id]: { ...prev[id], obs } }))
  const guardarVerificacion = () => {
    const items = materialRemolque.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, ok: checkMap[i.id]?.ok || false, obs: checkMap[i.id]?.obs || '' }))
    const oks = items.filter(i => i.ok).length
    setVerificaciones(prev => [{ id: `ver-${Date.now()}`, fecha: new Date().toISOString(), realizadoPor: session?.user?.name || 'Usuario', itemsOk: oks, totalItems: items.length, items }, ...prev])
    setVerificando(false); setCheckMap({})
  }

  // ---- FILTROS ----
  const articulosFiltrados = articulos.filter(a => {
    const s = !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || a.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    const f = selectedFamiliaFilter === 'all' || a.familia?.id === selectedFamiliaFilter
    return s && f
  })
  const totalPaginas = Math.ceil(articulosFiltrados.length / ITEMS_POR_PAGINA)
  const articulosPag = articulosFiltrados.slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
  const peticionesFiltradas = peticiones.filter(p => filtroPeticiones === 'all' || p.estado === filtroPeticiones)
  const materialFiltrado = materialRemolque.filter(m => filtroCategoria === 'all' || m.categoria === filtroCategoria)
  const checkStats = { total: materialRemolque.length, ok: Object.values(checkMap).filter(v => v.ok).length }

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-orange-500" /></div>

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* ===== HEADER (patrón Transmisiones) ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center"><Tent className="w-6 h-6 text-orange-600" /></div>
          <div>
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">PMA</p>
            <h1 className="text-xl font-bold text-slate-800">Puesto de Mando Avanzado</h1>
            <p className="text-sm text-slate-500">MasterTent Rescue 6×3 m — Gestión del remolque PMA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={cargarDatos} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-all"><RefreshCw className="w-4 h-4" /></button>
          {mainTab === 'inventario' && (<>
            <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-all"><ShoppingCart className="w-4 h-4" /> Petición</button>
            <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-all"><Plus className="w-4 h-4" /> Artículo</button>
          </>)}
          {mainTab === 'remolque' && !verificando && materialRemolque.length > 0 && (
            <button onClick={iniciarVerificacion} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-all"><ClipboardCheck className="w-4 h-4" /> Verificar</button>
          )}
        </div>
      </div>

      {/* ===== STATS (patrón Transmisiones) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Material del Área', value: articulos.length, icon: Package, bg: 'bg-orange-50', ic: 'text-orange-600' },
          { label: 'Stock Bajo', value: articulos.filter(a => a.stockActual <= a.stockMinimo && a.stockMinimo > 0).length, icon: AlertTriangle, bg: 'bg-red-50', ic: 'text-red-500' },
          { label: 'Items Remolque', value: materialRemolque.length, icon: ClipboardCheck, bg: 'bg-blue-50', ic: 'text-blue-600' },
          { label: 'Carpas MasterTent', value: 2, icon: Tent, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
          { label: 'Verificaciones', value: verificaciones.length, icon: CheckCircle, bg: 'bg-purple-50', ic: 'text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-xs text-slate-500 mb-1">{s.label}</p><p className="text-2xl font-bold text-slate-800">{s.value}</p></div>
              <div className={`p-2 ${s.bg} rounded-xl`}><s.icon className={`w-5 h-5 ${s.ic}`} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== TABS PRINCIPALES (patrón Incendios) ===== */}
      <div className="flex gap-6 border-b border-slate-200 overflow-x-auto">
        {[
          { key: 'inventario' as const, label: 'Inventario del Área', icon: Package },
          { key: 'remolque' as const, label: 'Material Remolque', icon: ClipboardCheck },
          { key: 'despliegues' as const, label: 'Configuraciones Despliegue', icon: Tent },
          { key: 'ficha' as const, label: 'Ficha Técnica', icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)} className={`flex items-center gap-2 px-1 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${mainTab === tab.key ? 'text-orange-600 border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB: INVENTARIO ==================== */}
      {mainTab === 'inventario' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-4">
            {[
              { key: 'stock' as const, label: 'Stock', icon: Package },
              { key: 'peticiones' as const, label: 'Peticiones', icon: ShoppingCart },
              { key: 'movimientos' as const, label: 'Movimientos', icon: RefreshCw }
            ].map(tab => (
              <button key={tab.key} onClick={() => { setInventoryTab(tab.key); setPaginaActual(1) }} className={`flex items-center gap-1.5 px-1 py-2 text-sm font-medium border-b-2 transition-all ${inventoryTab === tab.key ? 'text-orange-600 border-orange-400' : 'text-slate-400 border-transparent hover:text-slate-600'}`}><tab.icon className="w-3.5 h-3.5" /> {tab.label}</button>
            ))}
          </div>

          {inventoryTab === 'stock' && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPaginaActual(1) }} placeholder="Buscar artículos..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
                <select value={selectedFamiliaFilter} onChange={e => { setSelectedFamiliaFilter(e.target.value); setPaginaActual(1) }} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 min-w-[180px]"><option value="all">Todas las familias</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"><Layers className="w-4 h-4" /> Familias</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Artículo</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Familia</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Stock</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Mínimo</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Unidad</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Estado</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Acciones</th></tr></thead>
                  <tbody>
                    {articulosPag.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No hay artículos en el inventario del PMA</td></tr> : articulosPag.map(a => (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{a.codigo || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                        <td className="px-4 py-3 text-slate-500">{a.familia?.nombre || '—'}</td>
                        <td className="px-4 py-3 text-center font-semibold">{a.stockActual}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{a.stockMinimo}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{a.unidad}</td>
                        <td className="px-4 py-3 text-center">{a.stockActual <= a.stockMinimo && a.stockMinimo > 0 ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Bajo</span> : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">OK</span>}</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => { setArticuloSeleccionado(a); setShowEditArticulo(true) }} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><Edit className="w-4 h-4 text-slate-400" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Mostrando {(paginaActual-1)*ITEMS_POR_PAGINA+1}-{Math.min(paginaActual*ITEMS_POR_PAGINA, articulosFiltrados.length)} de {articulosFiltrados.length}</p><div className="flex gap-1">{Array.from({length: totalPaginas}, (_, i) => <button key={i} onClick={() => setPaginaActual(i+1)} className={`px-3 py-1.5 rounded-lg text-sm ${paginaActual===i+1 ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{i+1}</button>)}</div></div>}
            </div>
          )}

          {inventoryTab === 'peticiones' && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFiltroPeticiones('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filtroPeticiones==='all'?'bg-orange-500 text-white':'bg-white border border-slate-200 text-slate-600'}`}>Todas</button>
                {Object.entries(ESTADOS_PETICION).map(([k, v]) => <button key={k} onClick={() => setFiltroPeticiones(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filtroPeticiones===k?'bg-orange-500 text-white':'bg-white border border-slate-200 text-slate-600'}`}>{v.label}</button>)}
              </div>
              <div className="space-y-3">{peticionesFiltradas.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">No hay peticiones</div> : peticionesFiltradas.map(p => { const est = ESTADOS_PETICION[p.estado] || ESTADOS_PETICION.pendiente; const pri = PRIORIDADES[p.prioridad] || PRIORIDADES.normal; return (<div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs text-slate-400">{p.numero}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${est.color}`}>{est.label}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pri.color}`}>{pri.label}</span></div><p className="font-medium text-slate-800 mt-1">{p.nombreArticulo} <span className="text-slate-400">× {p.cantidad} {p.unidad}</span></p>{p.descripcion && <p className="text-sm text-slate-500 mt-1">{p.descripcion}</p>}<p className="text-xs text-slate-400 mt-2">{p.solicitante?.nombre} — {new Date(p.fechaSolicitud).toLocaleDateString('es-ES')}</p></div>) })}</div>
            </div>
          )}

          {inventoryTab === 'movimientos' && <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center"><History className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">Historial de movimientos de stock</p><p className="text-sm text-slate-300 mt-1">Se registrarán automáticamente al crear peticiones y recibir material</p></div>}
        </div>
      )}

      {/* ==================== TAB: MATERIAL REMOLQUE ==================== */}
      {mainTab === 'remolque' && (
        <div className="space-y-4">
          {/* Barra verificación activa */}
          {verificando && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3"><ClipboardCheck className="w-5 h-5 text-orange-600" /><div><p className="font-semibold text-orange-800">Verificación en curso</p><p className="text-sm text-orange-600">{checkStats.ok} de {checkStats.total} items verificados ({checkStats.total > 0 ? Math.round(checkStats.ok/checkStats.total*100) : 0}%)</p></div></div>
              <div className="flex gap-2">
                <button onClick={() => { setVerificando(false); setCheckMap({}) }} className="px-3 py-2 bg-white border border-orange-200 rounded-xl text-sm font-medium text-orange-700 hover:bg-orange-50">Cancelar</button>
                <button onClick={guardarVerificacion} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
              </div>
            </div>
          )}

          {/* Contenido vacío o con items */}
          {materialRemolque.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <ClipboardCheck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Listado de material del remolque vacío</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">Genera el listado completo con todo el material real del remolque PMA, o añade items individualmente.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowNuevoItemRemolque(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4" /> Añadir item</button>
                <button onClick={generarListadoCompleto} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"><ClipboardList className="w-4 h-4" /> Generar listado completo</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setFiltroCategoria('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroCategoria==='all'?'bg-orange-500 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Todos ({materialRemolque.length})</button>
                  {CATEGORIAS_REMOLQUE.map(cat => { const n = materialRemolque.filter(i => i.categoria === cat).length; return n > 0 ? <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroCategoria===cat?'bg-orange-500 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{cat} ({n})</button> : null })}
                </div>
                <div className="flex gap-2">
                  {verificaciones.length > 0 && <button onClick={() => setShowHistorial(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><History className="w-4 h-4" /> Historial</button>}
                  <button onClick={() => setShowNuevoItemRemolque(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4" /> Añadir</button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    {verificando && <th className="w-12 px-3 py-3"></th>}
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Material</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Cantidad</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoría</th>
                    {verificando ? <th className="text-left px-4 py-3 font-semibold text-slate-600">Observación</th> : <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Acciones</th>}
                  </tr></thead>
                  <tbody>
                    {materialFiltrado.map(item => (
                      <tr key={item.id} className={`border-b border-slate-100 transition-all ${verificando && checkMap[item.id]?.ok ? 'bg-emerald-50/60' : 'hover:bg-slate-50/50'}`}>
                        {verificando && <td className="px-3 py-3"><button onClick={() => toggleCheck(item.id)} className="p-0.5">{checkMap[item.id]?.ok ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}</button></td>}
                        <td className="px-4 py-3">
                          {editandoItem === item.id ? <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="w-full px-2 py-1 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /> : <span className={`font-medium ${verificando && checkMap[item.id]?.ok ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{item.nombre}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editandoItem === item.id ? <input type="number" value={editCantidad} onChange={e => setEditCantidad(parseInt(e.target.value) || 1)} min={1} className="w-16 px-2 py-1 border border-orange-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200" /> : <span className="font-semibold text-slate-700">{item.cantidad}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {editandoItem === item.id ? <select value={editCategoria} onChange={e => setEditCategoria(e.target.value)} className="px-2 py-1 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">{CATEGORIAS_REMOLQUE.map(c => <option key={c} value={c}>{c}</option>)}</select> : <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{item.categoria}</span>}
                        </td>
                        {verificando ? (
                          <td className="px-4 py-3"><input value={checkMap[item.id]?.obs || ''} onChange={e => setObs(item.id, e.target.value)} placeholder="Observación..." className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-200" /></td>
                        ) : (
                          <td className="px-4 py-3 text-center">
                            {editandoItem === item.id ? (
                              <div className="flex justify-center gap-1">
                                <button onClick={() => guardarEdicion(item.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4 text-emerald-600" /></button>
                                <button onClick={() => setEditandoItem(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1">
                                <button onClick={() => iniciarEdicion(item)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Edit className="w-4 h-4 text-slate-400" /></button>
                                <button onClick={() => eliminarItemRemolque(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {verificando && <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center gap-3"><div className="flex-1 bg-slate-100 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full transition-all" style={{width:`${checkStats.total>0?(checkStats.ok/checkStats.total)*100:0}%`}} /></div><span className="text-sm font-semibold text-slate-700 min-w-[50px] text-right">{checkStats.total>0?Math.round(checkStats.ok/checkStats.total*100):0}%</span></div></div>}
            </>
          )}
        </div>
      )}

      {/* ==================== TAB: DESPLIEGUES ==================== */}
      {mainTab === 'despliegues' && (
        <div className="space-y-4">
          {/* Selector configuración */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CONFIGURACIONES.map(c => (
              <button key={c.id} onClick={() => { setConfigSeleccionada(c.id); setVistaSeleccionada('planta') }} className={`bg-white border rounded-2xl p-4 text-left transition-all ${configSeleccionada===c.id ? 'border-orange-400 ring-2 ring-orange-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2 mb-2"><c.icono className={`w-5 h-5 ${configSeleccionada===c.id?'text-orange-600':'text-slate-400'}`} /><span className={`text-sm font-semibold ${configSeleccionada===c.id?'text-orange-700':'text-slate-700'}`}>{c.nombre}</span></div>
                <p className="text-xs text-slate-500">{c.medidas}</p>
                <p className="text-xs text-slate-400">{c.superficie}</p>
              </button>
            ))}
          </div>

          {/* Selector vista */}
          <div className="flex gap-2">
            {[
              { key: 'planta' as const, label: 'Planta' },
              { key: 'alzado' as const, label: 'Alzado frontal' },
              { key: 'perfil' as const, label: 'Perfil lateral' },
            ].map(v => (
              <button key={v.key} onClick={() => setVistaSeleccionada(v.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${vistaSeleccionada===v.key ? 'bg-orange-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{v.label}</button>
            ))}
          </div>

          {/* Diagrama */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            {vistaSeleccionada === 'planta' && configSeleccionada === 'cuadrado' && <PlantaCuadrado />}
            {vistaSeleccionada === 'planta' && configSeleccionada === 'lineal' && <PlantaLineal />}
            {vistaSeleccionada === 'planta' && configSeleccionada === 'ele' && <PlantaEle />}
            {vistaSeleccionada === 'planta' && configSeleccionada === 'separadas' && <PlantaSeparadas />}
            {vistaSeleccionada === 'alzado' && <AlzadoCuadrado />}
            {vistaSeleccionada === 'perfil' && <PerfilCuadrado />}
          </div>

          {/* Info config seleccionada */}
          {(() => { const cfg = CONFIGURACIONES.find(c => c.id === configSeleccionada); if (!cfg) return null; return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Info className="w-4 h-4 text-orange-500" /> Descripción</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{cfg.descripcion}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Uso recomendado</h4>
                <ul className="space-y-1">{cfg.uso.map((u, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{u}</li>)}</ul>
              </div>
            </div>
          ) })()}

          {/* Datos rápidos */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-3"><Timer className="w-5 h-5 text-orange-500" /><div><p className="text-orange-600 text-xs font-medium">Montaje</p><p className="text-slate-800 font-semibold">&lt; 60 seg/carpa</p></div></div>
              <div className="flex items-center gap-3"><Weight className="w-5 h-5 text-orange-500" /><div><p className="text-orange-600 text-xs font-medium">Peso unitario</p><p className="text-slate-800 font-semibold">56,2 kg</p></div></div>
              <div className="flex items-center gap-3"><Wind className="w-5 h-5 text-orange-500" /><div><p className="text-orange-600 text-xs font-medium">Resistencia viento</p><p className="text-slate-800 font-semibold">80 km/h</p></div></div>
              <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-orange-500" /><div><p className="text-orange-600 text-xs font-medium">Certificación</p><p className="text-slate-800 font-semibold">TÜV — Ignífuga</p></div></div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: FICHA TÉCNICA ==================== */}
      {mainTab === 'ficha' && (
        <div className="space-y-4">
          {/* Header ficha */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-500 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur flex items-center justify-center"><Tent className="w-8 h-8 text-white" /></div>
                <div className="text-white">
                  <p className="text-red-200 text-xs font-medium uppercase tracking-wider">Ficha Técnica</p>
                  <h2 className="text-xl font-bold">{SPECS.modelo}</h2>
                  <p className="text-red-100 text-sm">{SPECS.medidas} — {SPECS.unidades} unidades disponibles — Superficie unitaria {SPECS.superficie}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Dimensiones + Materiales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Ruler className="w-4 h-4 text-orange-500" /> Dimensiones</h4>
                  <div className="space-y-0 text-sm">{[
                    ['Desplegada', SPECS.medidas],['Superficie', SPECS.superficie],['Altura alero', SPECS.alturaRecogida],
                    ['Altura cumbrera', SPECS.alturaPico],['Plegada', SPECS.medidasPlegada],['Peso', SPECS.peso],
                  ].map(([l,v]) => <div key={l} className="flex justify-between py-2 border-b border-slate-100 last:border-0"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800">{v}</span></div>)}</div>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-orange-500" /> Materiales</h4>
                  <div className="space-y-0 text-sm">{[
                    ['Estructura', SPECS.estructura],['Techo', SPECS.techo],['Paredes', SPECS.paredes],['Suelo', SPECS.suelo],
                  ].map(([l,v]) => <div key={l} className="flex justify-between py-2 border-b border-slate-100 last:border-0"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800 text-right max-w-[60%]">{v}</span></div>)}</div>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500" /> Operativa</h4>
                  <div className="space-y-0 text-sm">{[
                    ['Montaje', SPECS.montaje],['Personas montaje', '2 personas'],['Certificación', SPECS.certificacion],['Modular', 'Sí — Conexión entre carpas'],
                  ].map(([l,v]) => <div key={l} className="flex justify-between py-2 border-b border-slate-100 last:border-0"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800">{v}</span></div>)}</div>
                </div>
              </div>

              {/* Certificaciones */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-4">Certificaciones y Resistencia</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Droplets, label: 'Impermeable', value: '100 %', bg: 'bg-blue-50', border: 'border-blue-100', ic: 'text-blue-600', tx: 'text-blue-800', sub: 'text-blue-600' },
                    { icon: Flame, label: 'Ignífuga', value: 'Certificado', bg: 'bg-red-50', border: 'border-red-100', ic: 'text-red-600', tx: 'text-red-800', sub: 'text-red-600' },
                    { icon: Wind, label: 'Resistencia viento', value: '80 km/h', bg: 'bg-emerald-50', border: 'border-emerald-100', ic: 'text-emerald-600', tx: 'text-emerald-800', sub: 'text-emerald-600' },
                    { icon: Timer, label: 'Montaje rápido', value: '< 60 seg', bg: 'bg-amber-50', border: 'border-amber-100', ic: 'text-amber-600', tx: 'text-amber-800', sub: 'text-amber-600' },
                  ].map((c, i) => (
                    <div key={i} className={`${c.bg} border ${c.border} rounded-xl p-4 text-center`}>
                      <c.icon className={`w-6 h-6 ${c.ic} mx-auto mb-2`} />
                      <p className={`text-xs font-semibold ${c.tx}`}>{c.label}</p>
                      <p className={`text-xs ${c.sub} mt-0.5`}>{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sistema paredes */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">Sistema de Paredes Modulares — Kit Rescue</h4>
                <p className="text-sm text-slate-500 mb-4">Las paredes incorporan un sistema multicapa: red anti-insectos, cobertura transparente PVC y oscurecimiento total. Cada ventana puede transformarse en puerta enrollable.</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  {[
                    { nombre: 'Cerrada', qty: 4, desc: 'PVC opaco reforzado' },
                    { nombre: 'Con ventana', qty: 4, desc: 'PVC transparente + red' },
                    { nombre: 'Con puerta', qty: 2, desc: 'Enrollable a 3 alturas' },
                    { nombre: 'Divisoria', qty: 2, desc: 'Separación interior' },
                    { nombre: 'Suelo PVC', qty: 2, desc: 'Antideslizante absorbente' },
                  ].map(p => (
                    <div key={p.nombre} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1"><span className="font-medium text-slate-700">{p.nombre}</span><span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">×{p.qty}</span></div>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colores */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-3">Identificación Visual</h4>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-600 rounded-lg border border-red-700"></div><div><p className="text-sm font-medium text-slate-700">Techo</p><p className="text-xs text-slate-500">Rojo — alta visibilidad</p></div></div>
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-400 rounded-lg border border-gray-500"></div><div><p className="text-sm font-medium text-slate-700">Paredes</p><p className="text-xs text-slate-500">Gris — estándar rescue</p></div></div>
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-700 rounded-lg border border-gray-800"></div><div><p className="text-sm font-medium text-slate-700">Estructura</p><p className="text-xs text-slate-500">Aluminio anodizado</p></div></div>
                </div>
              </div>

              {/* Resumen inventario PMA */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-3">Inventario de Carpas PMA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2].map(n => (
                    <div key={n} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><Tent className="w-5 h-5 text-red-600" /></div><div><p className="font-semibold text-slate-800">Unidad {n}</p><p className="text-xs text-slate-500">{SPECS.modelo}</p></div><span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Operativa</span></div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded-lg p-2 text-center"><p className="text-slate-400">Medidas</p><p className="font-semibold text-slate-700">{SPECS.medidas}</p></div>
                        <div className="bg-white rounded-lg p-2 text-center"><p className="text-slate-400">Peso</p><p className="font-semibold text-slate-700">{SPECS.peso}</p></div>
                        <div className="bg-white rounded-lg p-2 text-center"><p className="text-slate-400">Plegada</p><p className="font-semibold text-slate-700">{SPECS.medidasPlegada}</p></div>
                      </div>
                    </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"><div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Nuevo Artículo — PMA</h3><button onClick={() => setShowNuevoArticulo(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleCrearArticulo} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Código</label><input name="codigo" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="unidad">Unidad</option><option value="metro">Metro</option><option value="kg">Kg</option><option value="litro">Litro</option><option value="caja">Caja</option><option value="rollo">Rollo</option><option value="par">Par</option></select></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label><input name="nombre" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><textarea name="descripcion" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Familia *</label><select name="familiaId" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label><input name="stockActual" type="number" defaultValue={0} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label><input name="stockMinimo" type="number" defaultValue={0} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div></div>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Crear</button></div>
          </form>
        </div></div>
      )}

      {/* Modal Editar Artículo */}
      {showEditArticulo && articuloSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"><div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Editar Artículo</h3><button onClick={() => { setShowEditArticulo(false); setArticuloSeleccionado(null) }} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleEditarArticulo} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Código</label><input name="codigo" defaultValue={articuloSeleccionado.codigo||''} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" defaultValue={articuloSeleccionado.unidad} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="unidad">Unidad</option><option value="metro">Metro</option><option value="kg">Kg</option><option value="litro">Litro</option><option value="caja">Caja</option><option value="rollo">Rollo</option><option value="par">Par</option></select></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label><input name="nombre" required defaultValue={articuloSeleccionado.nombre} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><textarea name="descripcion" rows={2} defaultValue={articuloSeleccionado.descripcion||''} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Familia *</label><select name="familiaId" required defaultValue={articuloSeleccionado.familia?.id||''} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="">Seleccionar...</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label><input name="stockActual" type="number" defaultValue={articuloSeleccionado.stockActual} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label><input name="stockMinimo" type="number" defaultValue={articuloSeleccionado.stockMinimo} min={0} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div></div>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => { setShowEditArticulo(false); setArticuloSeleccionado(null) }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Guardar</button></div>
          </form>
        </div></div>
      )}

      {/* Modal Nueva Petición */}
      {showNuevaPeticion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"><div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Nueva Petición — PMA</h3><button onClick={() => setShowNuevaPeticion(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleCrearPeticion} className="p-5 space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Artículo del inventario</label><select name="articuloId" onChange={e => { const art = articulos.find(a => a.id === e.target.value); if (art) { const ni = e.target.form?.querySelector('input[name="nombreArticulo"]') as HTMLInputElement; const ui = e.target.form?.querySelector('select[name="unidad"]') as HTMLSelectElement; if (ni) ni.value = art.nombre; if (ui) ui.value = art.unidad }}} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="">Seleccionar (opcional)...</option>{articulos.map(a => <option key={a.id} value={a.id}>{a.nombre} (Stock: {a.stockActual})</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre del material *</label><input name="nombreArticulo" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Cantidad *</label><input name="cantidad" type="number" required min={1} defaultValue={1} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label><select name="unidad" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="unidad">Unidad</option><option value="metro">Metro</option><option value="kg">Kg</option><option value="litro">Litro</option><option value="caja">Caja</option></select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label><select name="prioridad" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"><option value="normal">Normal</option><option value="baja">Baja</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label><textarea name="descripcion" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Enviar</button></div>
          </form>
        </div></div>
      )}

      {/* Modal Gestión Familias */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"><div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Familias — PMA</h3><button onClick={() => setShowGestionFamilias(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <div className="p-5 space-y-4">
            <form onSubmit={e => { e.preventDefault(); const inp = e.currentTarget.elements.namedItem('nf') as HTMLInputElement; handleCrearFamilia(inp.value); inp.value = '' }} className="flex gap-2"><input name="nf" placeholder="Nueva familia..." className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /><button type="submit" className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Añadir</button></form>
            <div className="space-y-2">{familias.length===0?<p className="text-sm text-slate-400 text-center py-4">No hay familias</p>:familias.map(f => <div key={f.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl"><div><span className="text-sm font-medium text-slate-700">{f.nombre}</span><span className="text-xs text-slate-400 ml-2">({f._count?.articulos||0} artículos)</span></div><button onClick={() => { if ((f._count?.articulos||0)===0) handleEliminarFamilia(f.id); else alert('No se puede eliminar: tiene artículos') }} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button></div>)}</div>
          </div>
        </div></div>
      )}

      {/* Modal Nuevo Item Remolque */}
      {showNuevoItemRemolque && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"><div className="bg-white rounded-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Añadir Material al Remolque</h3><button onClick={() => setShowNuevoItemRemolque(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); agregarItemRemolque(fd.get('nombre') as string, parseInt(fd.get('cantidad') as string)||1, fd.get('categoria') as string) }} className="p-5 space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Material *</label><input name="nombre" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label><input name="cantidad" type="number" defaultValue={1} min={1} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label><select name="categoria" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">{CATEGORIAS_REMOLQUE.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowNuevoItemRemolque(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">Cancelar</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Añadir</button></div>
          </form>
        </div></div>
      )}

      {/* Modal Historial Verificaciones */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Historial de Verificaciones</h3><button onClick={() => setShowHistorial(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <div className="p-5 space-y-4">
            {verificaciones.length===0?<p className="text-sm text-slate-400 text-center py-4">Sin verificaciones</p>:verificaciones.map(v => (
              <div key={v.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">{new Date(v.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.itemsOk===v.totalItems?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{v.itemsOk}/{v.totalItems}</span>
                </div>
                <p className="text-sm text-slate-500">Realizado por: {v.realizadoPor}</p>
                <div className="mt-2 bg-slate-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{width:`${v.totalItems>0?(v.itemsOk/v.totalItems)*100:0}%`}} /></div>
                {v.items.filter(i => !i.ok || i.obs).length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 space-y-1"><p className="text-xs font-medium text-slate-600">Incidencias:</p>{v.items.filter(i => !i.ok).map((i, idx) => <p key={idx} className="text-xs text-red-600">- {i.nombre}{i.obs ? ` — ${i.obs}` : ''}</p>)}</div>
                )}
              </div>
            ))}
          </div>
        </div></div>
      )}
    </div>
  )
}
