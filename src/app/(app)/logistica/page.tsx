'use client'
import { TbDrone } from 'react-icons/tb';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermisos } from '@/lib/permisos';
import PeticionesTab, { MovimientosTab } from '@/components/PeticionesTab';

import React, { useState, useEffect } from 'react';
import {
  Package, Search, AlertTriangle, Plus, TrendingUp, TrendingDown, 
  BarChart3, Calendar, MapPin, Trash2, Eye, X, RefreshCw, ArrowUpDown, Pencil, Archive,
  AlertCircle, CheckCircle, Clock, Box, ChevronDown, ChevronRight, ChevronUp, ExternalLink,
  Flame, Heart, Truck, Radio, GraduationCap, BookOpen, Shirt, Shield, Layers, Tent, HeartHandshake,
  ClipboardList, ShoppingCart, Check, FileText, FileCheck, Send, Ban,
  History, User, Building, Receipt, Filter, Users, Tag
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================
interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  color: string;
  esGeneral: boolean;
  padreId: string | null;
  hijos: Categoria[];
}

interface Familia {
  id: string;
  nombre: string;
  slug: string;
  categoria: Categoria;
}

interface Articulo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  stockAsignado?: number;
  unidad: string;
  tieneCaducidad: boolean;
  fechaCaducidad: string | null;
  familia: Familia;
  ubicacion: { id: string; nombre: string } | null;
  metadatos?: { tallas?: string[] } | null;
}

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  motivo: string;
  notas: string;
  createdAt: string;
  articulo: { nombre: string; codigo: string };
  usuario: { nombre: string; apellidos: string; numeroVoluntario: string };
}

interface HistorialPeticion {
  id: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  comentario: string | null;
  createdAt: string;
  usuario: { nombre: string; apellidos: string };
}

interface Peticion {
  id: string;
  numero: string;
  areaOrigen: string;
  nombreArticulo: string;
  cantidad: number;
  unidad: string;
  motivo: string;
  prioridad: string;
  descripcion: string | null;
  estado: string;
  fechaSolicitud: string;
  fechaAprobacion: string | null;
  fechaCompra: string | null;
  fechaRecepcion: string | null;
  proveedor: string | null;
  costeEstimado: number | null;
  costeFinal: number | null;
  numeroFactura: string | null;
  notasAprobacion: string | null;
  notasCompra: string | null;
  notasRecepcion: string | null;
  motivoRechazo: string | null;
  urlRc: string | null;
  urlAlbaran: string | null;
  solicitante: { nombre: string; apellidos: string; numeroVoluntario: string };
  articulo: { id: string; nombre: string; codigo: string } | null;
  aprobadoPor: { nombre: string; apellidos: string } | null;
  recibidoPor: { nombre: string; apellidos: string } | null;
  historial: HistorialPeticion[];
}

interface Stats {
  totalArticulos: number;
  stockBajo: number;
  porCaducar: number;
  caducados: number;
}

interface PeticionStats {
  total: number;
  pendientes: number;
  aprobadas: number;
  enCompra: number;
  recibidas: number;
  rechazadas: number;
}

interface AreaStats {
  id: string;
  slug: string;
  nombre: string;
  color: string;
  icono: string;
  totalArticulos: number;
  stockBajo: number;
  subInventarios: { id: string; slug: string; nombre: string }[];
}

// ============================================
// CONSTANTES
// ============================================
const ICONOS_AREA: Record<string, any> = {
  'logistica': Package,
  'socorrismo': Heart,
  'incendios': Flame,
  'eci': Shield,
  'parque-movil': Truck,
  'vehiculos': Truck,
  'transmisiones': Radio,
  'formacion': BookOpen,
  'pma': Tent,
  'vestuario': Shirt,
  'drones': TbDrone,
  'accion-social': Users,
};

const COLORES_AREA: Record<string, string> = {
  'incendios':     '#ef4444',
  'socorrismo':    '#3b82f6',
  'vestuario':     '#8b5cf6',
  'vehiculos':     '#f59e0b',
  'transmisiones': '#10b981',
  'drones':        '#06b6d4',
  'pma':           '#f97316',
  'formacion':     '#6366f1',
  'accion-social': '#ec4899',
  'logistica':     '#8b5cf6',
};

const ESTADOS_PETICION = {
  pendiente: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Pendiente', icon: Clock },
  aprobada: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Aprobada', icon: Check },
  en_compra: { color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'En Compra', icon: ShoppingCart },
  recibida: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Recibida', icon: CheckCircle },
  rechazada: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Rechazada', icon: Ban },
  cancelada: { color: 'bg-slate-100 text-slate-700 border-slate-300', label: 'Cancelada', icon: X },
};

const PRIORIDADES = {
  baja: { color: 'bg-slate-100 text-slate-600', label: 'Baja' },
  normal: { color: 'bg-blue-100 text-blue-600', label: 'Normal' },
  alta: { color: 'bg-orange-100 text-orange-600', label: 'Alta' },
  urgente: { color: 'bg-red-100 text-red-600', label: 'Urgente' },
};

const MOTIVOS_PETICION = [
  { value: 'reposicion', label: 'Reposición de stock' },
  { value: 'urgente', label: 'Necesidad urgente' },
  { value: 'nuevo', label: 'Material nuevo' },
  { value: 'preventivo', label: 'Aprovisionamiento preventivo' },
  { value: 'proyecto', label: 'Para proyecto/evento' },
];

const AREAS_NOMBRE: Record<string, string> = {
  'logistica': 'Logística',
  'socorrismo': 'Socorrismo',
  'incendios': 'Incendios',
  'eci': 'ECI',
  'parque-movil': 'Parque Móvil',
  'transmisiones': 'Transmisiones',
  'formacion': 'Formación',
  'pma': 'PMA',
  'vestuario': 'Vestuario',
};

const getIconoArea = (slug: string) => ICONOS_AREA[slug] || Package;

// ============================================
// COMPONENTE MODAL
// ============================================
function Modal({ title, children, onClose, size = 'md' }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function LogisticaPage() {
  // Estados principales
  const { data: session } = useSession();
  const { isAdmin, canCreate, canEdit, canDelete, canApprove } = usePermisos();
  // isAdmin proviene de usePermisos()
  const searchParams = useSearchParams();
  const tabInicial = searchParams.get('tab') as 'stock' | 'peticiones' | 'movimientos' || 'stock';
  const [activeTab, setActiveTab] = useState<'stock' | 'peticiones' | 'movimientos' | 'asignaciones'>(tabInicial);
  const [loading, setLoading] = useState(true);
  const [inventarioActual, setInventarioActual] = useState('all');
  const [showSelectorInventario, setShowSelectorInventario] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamilia, setSelectedFamilia] = useState('all');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtroPeticiones, setFiltroPeticiones] = useState('all');

  // Datos
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [areas, setAreas] = useState<Categoria[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [stats, setStats] = useState<Stats>({ totalArticulos: 0, stockBajo: 0, porCaducar: 0, caducados: 0 });
  const [statsPorArea, setStatsPorArea] = useState<AreaStats[]>([]);
  const [peticionStats, setPeticionStats] = useState<PeticionStats>({ total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 });
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [asignacionData, setAsignacionData] = useState({
    usuarioId: '',
    articuloId: '',
    talla: '',
    cantidad: 1,
    observaciones: ''
  });
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Modales
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false);
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false);
  const [peticionEditando, setPeticionEditando] = useState<Peticion | null>(null);
  const [showDetallePeticion, setShowDetallePeticion] = useState<Peticion | null>(null);
  const [showAccionPeticion, setShowAccionPeticion] = useState<{ peticion: Peticion; accion: string } | null>(null);
  const [paginaPeticiones, setPaginaPeticiones] = useState(1);
  const PETICIONES_POR_PAGINA = 10;
  const [articuloMovimiento, setArticuloMovimiento] = useState<Articulo | null>(null);
  const [articuloEditando, setArticuloEditando] = useState<any>(null);
  // Familias
  const [showGestionFamilias, setShowGestionFamilias] = useState(false);
  const [familiaEditando, setFamiliaEditando] = useState<{id: string, nombre: string} | null>(null);
  const [nuevaFamiliaText, setNuevaFamiliaText] = useState('');
  const [gestionTab, setGestionTab] = useState<'familias' | 'subfamilias'>('familias');
  const [nuevaFamiliaCatText, setNuevaFamiliaCatText] = useState('');
  const [subfamiliaParentId, setSubfamiliaParentId] = useState('');

  // Formularios
  const [nuevoArticulo, setNuevoArticulo] = useState({
    codigo: '', nombre: '', descripcion: '', stockActual: 0, stockMinimo: 0,
    unidad: 'unidad', tieneCaducidad: false, fechaCaducidad: '', familiaId: '', tallas: [] as string[]
  });
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'entrada', cantidad: 0, motivo: '', notas: '' });
  const [nuevaPeticion, setNuevaPeticion] = useState({
    articuloId: '', nombreArticulo: '', cantidad: 1, unidad: 'unidad',
    motivo: 'reposicion', prioridad: 'normal', descripcion: '', areaOrigen: ''
  });
  const [accionForm, setAccionForm] = useState({ comentario: '', proveedor: '', costeEstimado: '', costeFinal: '', numeroFactura: '', urlRc: '', urlAlbaran: '' });
  const [peticionesExpandidas, setPeticionesExpandidas] = useState<Set<string>>(new Set());

  // ============================================
  // EFECTOS
  // ============================================
  useEffect(() => {
    cargarDatos();
  }, [inventarioActual, soloAlertas]);

  useEffect(() => {
    if (activeTab === 'peticiones') cargarPeticiones();
    if (activeTab === 'movimientos') cargarMovimientos();
    if (activeTab === 'asignaciones') { cargarAsignaciones(); cargarUsuarios(); }
  }, [activeTab, filtroPeticiones]);

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================
  const cargarDatos = async () => {
    setPaginaActual(1);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('inventario', inventarioActual);
      if (selectedFamilia !== 'all') params.append('familia', selectedFamilia);
      if (soloAlertas) params.append('alertas', 'true');
      if (searchTerm) params.append('busqueda', searchTerm);

      const res = await fetch(`/api/logistica?${params.toString()}`);
      const data = await res.json();

      setArticulos(data.articulos || []);
      setCategorias(data.categorias || []);
      setAreas(data.areas || []);
      setFamilias(data.familias || []);
      setStats(data.stats || { totalArticulos: 0, stockBajo: 0, porCaducar: 0, caducados: 0 });
      setStatsPorArea(data.statsPorArea || []);
    } catch (error) {
      /* error silenciado */;
    } finally {
      setLoading(false);
    }
  };

  const cargarPeticiones = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroPeticiones !== 'all') params.append('estado', filtroPeticiones);

      const res = await fetch(`/api/logistica/peticiones?${params.toString()}`);
      const data = await res.json();
      setPeticiones(data.peticiones || []);
      setPeticionStats(data.stats || { total: 0, pendientes: 0, aprobadas: 0, enCompra: 0, recibidas: 0, rechazadas: 0 });
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarMovimientos = async () => {
    try {
      const res = await fetch('/api/logistica/movimiento?limit=100');
      const data = await res.json();
      setMovimientos(data.movimientos || []);
    } catch (error) {
      /* error silenciado */;
    }
  };
  
  const cargarAsignaciones = async () => {
    try {
      const res = await fetch(`/api/logistica?tipo=asignaciones&inventario=${inventarioActual}`);
      const data = await res.json();
      setAsignaciones(data.asignaciones || []);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarUsuarios = async () => {
  try {
    const res = await fetch('/api/admin/personal');
    const data = await res.json();
    setUsuarios(data.voluntarios || []);
  } catch (error) {
    /* error silenciado */;
  }
};

  // ============================================
  // HANDLERS
  // ============================================
  const handleCambiarInventario = (slug: string) => {
    setInventarioActual(slug);
    setSelectedFamilia('all');
    setShowSelectorInventario(false);
  };

  const handleGuardarArticulo = async () => {
    if (!nuevoArticulo.nombre || !nuevoArticulo.familiaId) {
      alert('Nombre y familia son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'articulo', ...nuevoArticulo })
      });
      if (res.ok) {
        setShowNuevoArticulo(false);
        setNuevoArticulo({ codigo: '', nombre: '', descripcion: '', stockActual: 0, stockMinimo: 0, unidad: 'unidad', tieneCaducidad: false, fechaCaducidad: '', familiaId: '', tallas: [] });
        cargarDatos();
        alert('✅ Artículo creado correctamente');
      }
    } catch (error) {
      alert('Error al guardar artículo');
    }
  };

  // ---- Gestión Familias (Familias = CategoriaInventario hija, Subfamilias = FamiliaArticulo) ----
  const handleCrearFamiliaCat = async () => {
    if (!nuevaFamiliaCatText.trim()) { alert('El nombre es requerido'); return; }
    const catVestuario = categorias.find(c => c.slug === 'vestuario') || areas.find(a => a.slug === 'vestuario');
    if (!catVestuario) { alert('No se encontró la categoría vestuario'); return; }
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'familia-cat', nombre: nuevaFamiliaCatText.trim(), padreId: catVestuario.id })
      });
      const data = await res.json();
      if (data.success || data.categoria) { setNuevaFamiliaCatText(''); cargarDatos(); }
      else alert('Error: ' + (data.error || 'No se pudo crear'));
    } catch { alert('Error al crear familia'); }
  };

  const handleGuardarFamilia = async () => {
    const nombre = familiaEditando ? familiaEditando.nombre : nuevaFamiliaText;
    if (!nombre.trim()) { alert('El nombre es requerido'); return; }
    try {
      if (familiaEditando) {
        // Buscar categoría de la familia que editamos
        const fam = familias.find(f => f.id === familiaEditando.id);
        const res = await fetch('/api/logistica', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'familia', id: familiaEditando.id, nombre, categoriaId: fam?.categoria?.id })
        });
        const data = await res.json();
        if (data.success) { setFamiliaEditando(null); cargarDatos(); }
        else alert('Error: ' + (data.error || 'No se pudo actualizar'));
      } else {
        // Subfamilia: usar la familia (subcategoría) seleccionada, o vestuario como fallback
        const catVestuario = categorias.find(c => c.slug === 'vestuario') || areas.find(a => a.slug === 'vestuario');
        const categoriaId = subfamiliaParentId || catVestuario?.id;
        if (!categoriaId) { alert('Selecciona una familia o crea una primero'); return; }
        const res = await fetch('/api/logistica', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'familia', nombre: nuevaFamiliaText.trim(), categoriaId })
        });
        const data = await res.json();
        if (data.success || data.familia) { setNuevaFamiliaText(''); cargarDatos(); }
        else alert('Error: ' + (data.error || 'No se pudo crear'));
      }
    } catch { alert('Error al guardar familia'); }
  };

  const handleEliminarFamilia = async (familiaId: string) => {
    const fam = familias.find(f => f.id === familiaId);
    if (!confirm(`¿Eliminar la familia "${fam?.nombre}"? Solo se puede eliminar si no tiene artículos.`)) return;
    try {
      const res = await fetch(`/api/logistica?tipo=familia&id=${familiaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) cargarDatos();
      else alert('Error: ' + (data.error || 'No se pudo eliminar. Puede que tenga artículos asociados.'));
    } catch { alert('Error al eliminar familia'); }
  };

  const handleDevolverVestuario = async (asignacionId: string, articuloNombre: string, cantidad: number) => {
    if (!confirm(`¿Confirmar devolución de ${cantidad} "${articuloNombre}"?`)) return;
    try {
      const res = await fetch('/api/logistica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'devolver-vestuario', id: asignacionId })
      });
      const data = await res.json();
      if (data.success) { cargarAsignaciones(); cargarDatos(); }
      else alert('Error: ' + (data.error || 'No se pudo registrar la devolución'));
    } catch { alert('Error al registrar devolución'); }
  };

  const handleGuardarMovimiento = async () => {
    if (!articuloMovimiento || !nuevoMovimiento.cantidad || !nuevoMovimiento.motivo) {
      alert('Cantidad y motivo son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/logistica/movimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articuloId: articuloMovimiento.id, ...nuevoMovimiento })
      });
      if (res.ok) {
        setShowMovimiento(false);
        setArticuloMovimiento(null);
        setNuevoMovimiento({ tipo: 'entrada', cantidad: 0, motivo: '', notas: '' });
        cargarDatos();
        alert('✅ Movimiento registrado');
      }
    } catch (error) {
      alert('Error al registrar movimiento');
    }
  };

  const handleGuardarPeticion = async () => {
    if (!nuevaPeticion.nombreArticulo || !nuevaPeticion.cantidad || !nuevaPeticion.areaOrigen) {
      alert('Nombre del artículo, cantidad y área son requeridos');
      return;
    }
    try {
      const url = peticionEditando ? `/api/logistica/peticiones/${peticionEditando.id}` : '/api/logistica/peticiones';
      const method = peticionEditando ? 'PUT' : 'POST';
      const body = peticionEditando ? { accion: 'editar', ...nuevaPeticion } : nuevaPeticion;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowNuevaPeticion(false);
        setPeticionEditando(null);
        setNuevaPeticion({
          articuloId: '', nombreArticulo: '', cantidad: 1, unidad: 'unidad',
          motivo: 'reposicion', prioridad: 'normal', descripcion: '', areaOrigen: ''
        });
        cargarPeticiones();
        alert(peticionEditando ? '✅ Petición actualizada' : '✅ Petición creada');
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'No se pudo guardar la petición'));
      }
    } catch (error) {
      alert('Error al crear petición');
    }
  };

  const handleAsignarVestuario = async () => {
    if (!asignacionData.usuarioId || !asignacionData.articuloId || !asignacionData.talla) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'asignar-vestuario',
          ...asignacionData
        })
      });

      if (res.ok) {
        alert('✅ Vestuario asignado correctamente');
        setShowAsignarModal(false);
        setAsignacionData({ usuarioId: '', articuloId: '', talla: '', cantidad: 1, observaciones: '' });
        cargarAsignaciones();
        cargarDatos(); // Recargar para actualizar el stock
      } else {
        const data = await res.json();
        alert('❌ Error: ' + (data.error || 'No se pudo asignar el vestuario'));
      }
    } catch (error) {
      /* error silenciado */;
      alert('❌ Error al asignar vestuario');
    }
  };

  const handleAccionPeticion = async () => {
    if (!showAccionPeticion) return;
    try {
      const res = await fetch(`/api/logistica/peticiones/${showAccionPeticion.peticion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: showAccionPeticion.accion, ...accionForm })
      });
      if (res.ok) {
        setShowAccionPeticion(null);
        setAccionForm({ comentario: '', proveedor: '', costeEstimado: '', costeFinal: '', numeroFactura: '', urlRc: '', urlAlbaran: '' });
        cargarPeticiones();
        alert('✅ Petición actualizada');
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al actualizar petición');
    }
  };

  const handleEliminarArticulo = async (id: string) => {
    if (!confirm('¿Eliminar este artículo?')) return;
    try {
      await fetch(`/api/logistica/${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const handleActualizarDoc = async (peticionId: string, tipo: 'rc' | 'albaran') => {
    const inputEl = document.getElementById(`${tipo}-${peticionId}`) as HTMLInputElement;
    if (!inputEl || !inputEl.value) return;
    try {
      const body = { accion: 'actualizar_docs', [tipo === 'rc' ? 'urlRc' : 'urlAlbaran']: inputEl.value };
      const res = await fetch(`/api/logistica/peticiones/${peticionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert('✅ Documento adjuntado');
        cargarPeticiones();
      } else {
        alert('Error al adjuntar documento');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const abrirEditarPeticion = (peticion: Peticion) => {
    setPeticionEditando(peticion);
    setNuevaPeticion({
      articuloId: peticion.articulo?.id || '', 
      nombreArticulo: peticion.nombreArticulo, 
      cantidad: peticion.cantidad, 
      unidad: peticion.unidad,
      motivo: peticion.motivo, 
      prioridad: peticion.prioridad, 
      descripcion: peticion.descripcion || '', 
      areaOrigen: peticion.areaOrigen
    });
    setShowNuevaPeticion(true);
  };

  // ============================================
  // HELPERS
  // ============================================
  const getNombreInventario = () => {
    if (inventarioActual === 'all') return 'Inventario General';
    return AREAS_NOMBRE[inventarioActual] || 'Inventario';
  };

  const getColorInventario = () => {
    if (inventarioActual === 'all') return '#8b5cf6';
    const cat = categorias.find(c => c.slug === inventarioActual);
    return cat?.color || '#8b5cf6';
  };

  const getEstadoStock = (articulo: Articulo) => {
    if (articulo.stockActual === 0) return { color: 'bg-red-100 text-red-700', label: 'Sin stock', icon: AlertCircle };
    if (articulo.stockActual < articulo.stockMinimo) return { color: 'bg-yellow-100 text-yellow-700', label: 'Stock bajo', icon: AlertTriangle };
    return { color: 'bg-green-100 text-green-700', label: 'OK', icon: CheckCircle };
  };

  const getEstadoCaducidad = (articulo: Articulo) => {
    if (!articulo.fechaCaducidad) return null;
    const fecha = new Date(articulo.fechaCaducidad);
    const hoy = new Date();
    const tresMeses = new Date();
    tresMeses.setMonth(tresMeses.getMonth() + 3);
    if (fecha <= hoy) return { color: 'bg-red-100 text-red-700', label: 'Caducado' };
    if (fecha <= tresMeses) return { color: 'bg-yellow-100 text-yellow-700', label: 'Por caducar' };
    return null;
  };

  const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-ES');
  const formatearFechaHora = (fecha: string) => new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Selector de Inventario */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowSelectorInventario(!showSelectorInventario)}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all"
                style={{ borderLeftColor: getColorInventario(), borderLeftWidth: '4px' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: getColorInventario() }}>
                  {React.createElement(getIconoArea(inventarioActual === 'all' ? 'logistica' : inventarioActual), { size: 20 })}
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 uppercase font-bold">Inventario</p>
                  <p className="font-bold text-slate-800">{getNombreInventario()}</p>
                </div>
                <ChevronDown size={20} className="text-slate-400 ml-2" />
              </button>
              {showSelectorInventario && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-2 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase px-2">Seleccionar Inventario</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <button
                      onClick={() => handleCambiarInventario('all')}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors ${inventarioActual === 'all' ? 'bg-purple-50' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white"><Layers size={20} /></div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-slate-800">Inventario General</p>
                        <p className="text-xs text-slate-500">Todos los artículos</p>
                      </div>
                    </button>
                    <div className="border-t border-slate-100"></div>
                    {statsPorArea.map(area => {
                      const IconoArea = getIconoArea(area.slug);
                      return (
                        <div key={area.id}>
                          <button
                            onClick={() => handleCambiarInventario(area.slug)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${inventarioActual === area.slug ? 'bg-slate-100' : ''}`}
                          >
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: area.color }}><IconoArea size={20} /></div>
                            <div className="text-left flex-1">
                              <p className="font-medium text-slate-800">{area.nombre}</p>
                              <p className="text-xs text-slate-500">{area.totalArticulos} artículos</p>
                            </div>
                            {area.stockBajo > 0 && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold flex items-center gap-1"><AlertTriangle size={12} />{area.stockBajo}</span>
                            )}
                          </button>
                          {area.subInventarios.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => handleCambiarInventario(sub.slug)}
                              className={`w-full flex items-center gap-3 px-4 py-2 pl-12 hover:bg-slate-50 ${inventarioActual === sub.slug ? 'bg-slate-100' : ''}`}
                            >
                              <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center"><Box size={14} className="text-slate-500" /></div>
                              <span className="text-sm text-slate-600">{sub.nombre}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{getNombreInventario()}</h1>
              <p className="text-slate-500 text-sm">{inventarioActual === 'all' ? 'Gestión centralizada de todos los inventarios' : 'Gestión de artículos del área'}</p>
            </div>
          </div>
          {/* Desktop: botones a la derecha */}
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => { cargarDatos(); cargarPeticiones(); }} className="flex items-center justify-center p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200" title="Recargar"><RefreshCw size={18} /></button>
            <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"><ShoppingCart size={18} />Petición</button>
            <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400 font-medium text-sm"><Package size={18} />Artículo</button>
          </div>
        </div>
        {/* Móvil: fila completa */}
        <div className="flex sm:hidden gap-2 w-full">
          <button onClick={() => { cargarDatos(); cargarPeticiones(); }} className="flex-1 flex items-center justify-center p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"><RefreshCw size={18} /></button>
          <button onClick={() => setShowNuevaPeticion(true)} className="flex-1 flex items-center justify-center px-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><ShoppingCart size={18} /></button>
          <button onClick={() => setShowNuevoArticulo(true)} className="flex-1 flex items-center justify-center px-2 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400"><Package size={18} /></button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Artículos</p>
              <p className="text-3xl font-bold text-slate-800">{stats.totalArticulos}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600"><Package size={24} /></div>
          </div>
        </div>
        <div className={`bg-white p-5 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${soloAlertas ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-slate-200'}`} onClick={() => { setSoloAlertas(!soloAlertas); setPaginaActual(1); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Stock Bajo</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.stockBajo}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600"><AlertTriangle size={24} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Peticiones Pendientes</p>
              <p className="text-3xl font-bold text-blue-600">{peticionStats.pendientes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><ClipboardList size={24} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">En Compra</p>
              <p className="text-3xl font-bold text-purple-600">{peticionStats.enCompra}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600"><ShoppingCart size={24} /></div>
          </div>
        </div>
      </div>

      {/* Resumen por áreas (solo en inventario general) */}

      {inventarioActual === 'all' && statsPorArea.length > 0 && (() => {
        const ORDEN_AREAS = ['incendios','socorrismo','vestuario','vehiculos','transmisiones','drones','pma','formacion','accion-social']
        const areasOrdenadas = [...statsPorArea].sort((a, b) => {
          const ia = ORDEN_AREAS.indexOf(a.slug)
          const ib = ORDEN_AREAS.indexOf(b.slug)
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        })
        return (
          <div className="grid grid-cols-3 gap-4">
            {areasOrdenadas.map(area => {
              const IconoArea = getIconoArea(area.slug);
              const color = area.color || COLORES_AREA[area.slug] || '#8b5cf6';
              const stockOk = area.totalArticulos - area.stockBajo;
              return (
                <button
                  key={area.id}
                  onClick={() => handleCambiarInventario(area.slug)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left overflow-hidden group"
                >
                  {/* Cabecera con color del área */}
                  <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: `3px solid ${color}` }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm" style={{ backgroundColor: color }}>
                      <IconoArea size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm leading-tight truncate">{area.nombre}</p>
                      {area.subInventarios?.length > 0 && (
                        <p className="text-xs text-slate-400 truncate">{area.subInventarios.map((s: any) => s.nombre).join(' · ')}</p>
                      )}
                    </div>
                  </div>
                  {/* Cuerpo con métricas */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-black text-slate-800 leading-none">{area.totalArticulos}</p>
                        <p className="text-xs text-slate-400 mt-0.5">referencias</p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          <CheckCircle size={11} className="text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600">{stockOk} OK</span>
                        </div>
                        {area.stockBajo > 0 && (
                          <div className="flex items-center justify-end gap-1.5">
                            <AlertTriangle size={11} className="text-amber-500" />
                            <span className="text-xs font-semibold text-amber-600">{area.stockBajo} bajo mínimo</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Barra de estado */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: area.totalArticulos > 0 ? `${Math.round((stockOk / area.totalArticulos) * 100)}%` : '0%',
                          backgroundColor: area.stockBajo > 0 ? '#f59e0b' : color,
                        }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )
      })()}

      {/* Tabs y Contenido */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4">
          <div className="flex">
            {[
             { id: 'stock', label: 'Stock', icon: Package },
             { id: 'peticiones', label: 'Peticiones', icon: ClipboardList, badge: peticionStats.pendientes },
             { id: 'movimientos', label: 'Movimientos', icon: ArrowUpDown },
             ...(inventarioActual === 'vestuario' ? [{ id: 'asignaciones', label: 'Asignaciones', icon: Users }] : []),
             ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {inventarioActual === 'vestuario' && (
              <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                <Tag size={16} />
                Familias
              </button>
            )}
            <button onClick={() => { cargarDatos(); cargarPeticiones(); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={18} /></button>
          </div>
        </div>

        <div className="p-6">
          {/* ============================================ */}
          {/* TAB: STOCK */}
          {/* ============================================ */}
          {activeTab === 'stock' && (
            <>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="relative flex-1 min-w-[250px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, código..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPaginaActual(1); }}
                    onKeyDown={e => e.key === 'Enter' && cargarDatos()}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <select value={selectedFamilia} onChange={e => { setSelectedFamilia(e.target.value); setPaginaActual(1); }} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                  <option value="all">Todas las familias</option>
                  {familias.map(f => <option key={f.id} value={f.id}>{f.categoria.nombre} → {f.nombre}</option>)}
                </select>
                <button onClick={cargarDatos} className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Buscar</button>
                {soloAlertas && (
                  <button onClick={() => setSoloAlertas(false)} className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium flex items-center gap-1">
                    <AlertTriangle size={14} /> Solo alertas <X size={14} className="ml-1" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
              ) : articulos.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No se encontraron artículos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Artículo</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Área / Familia</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">{inventarioActual === 'vestuario' ? 'Total / Almacén / Asignado' : 'Stock'}</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Ubicación</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Caducidad</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articulos.slice((paginaActual - 1) * 30, paginaActual * 30).map(articulo => {
                        const estadoStock = getEstadoStock(articulo);
                        const estadoCaducidad = getEstadoCaducidad(articulo);
                        const EstadoIcon = estadoStock.icon;
                        const IconoCategoria = getIconoArea(articulo.familia.categoria.slug);
                        return (
                          <tr key={articulo.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: articulo.familia.categoria.color || '#8b5cf6' }}>
                                  <IconoCategoria size={18} />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800">{articulo.nombre}</p>
                                  {articulo.codigo && <p className="text-xs text-slate-500">Cód: {articulo.codigo}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: articulo.familia.categoria.color || '#8b5cf6' }}>{articulo.familia.categoria.nombre}</span>
                              <p className="text-xs text-slate-500 mt-1">{articulo.familia.nombre}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {inventarioActual === 'vestuario' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-700">Total: {articulo.stockActual}</span>
                                    <span className="px-2 py-0.5 bg-green-100 rounded font-bold text-green-700">Almacén: {articulo.stockActual - (articulo.stockAsignado || 0)}</span>
                                    <span className="px-2 py-0.5 bg-purple-100 rounded font-bold text-purple-700">Asignado: {articulo.stockAsignado || 0}</span>
                                  </div>
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoStock.color}`}>
                                    <EstadoIcon size={10} /> {estadoStock.label}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="text-lg font-bold text-slate-800">{articulo.stockActual}</span>
                                  <span className="text-xs text-slate-400 ml-1">{articulo.unidad}</span>
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${estadoStock.color}`}>
                                    <EstadoIcon size={10} /> {estadoStock.label}
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {articulo.ubicacion ? (
                                <span className="flex items-center gap-1 text-sm text-slate-600"><MapPin size={14} className="text-slate-400" />{articulo.ubicacion.nombre}</span>
                              ) : <span className="text-sm text-slate-400">-</span>}
                            </td>
                            <td className="py-3 px-4">
                              {articulo.fechaCaducidad ? (
                                <div>
                                  <span className="flex items-center gap-1 text-sm text-slate-600"><Calendar size={14} className="text-slate-400" />{formatearFecha(articulo.fechaCaducidad)}</span>
                                  {estadoCaducidad && <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoCaducidad.color}`}>{estadoCaducidad.label}</span>}
                                </div>
                              ) : <span className="text-sm text-slate-400">-</span>}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => { setArticuloMovimiento(articulo); setShowMovimiento(true); }} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Movimiento"><ArrowUpDown size={16} /></button>
                                <button onClick={() => setArticuloEditando(articulo)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg" title="Editar artículo"><Pencil size={16} /></button>
                                <button onClick={() => { setNuevaPeticion({ ...nuevaPeticion, articuloId: articulo.id, nombreArticulo: articulo.nombre, unidad: articulo.unidad, areaOrigen: articulo.familia.categoria.slug }); setShowNuevaPeticion(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Solicitar"><Send size={16} /></button>
                                <button onClick={() => handleEliminarArticulo(articulo.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {articulos.length > 30 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                      <p className="text-sm text-slate-500">
                        Mostrando {((paginaActual - 1) * 30) + 1}-{Math.min(paginaActual * 30, articulos.length)} de {articulos.length} artículos
                      </p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
                        {Array.from({ length: Math.ceil(articulos.length / 30) }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setPaginaActual(p)} className={`w-8 h-8 text-sm font-medium rounded-lg ${paginaActual === p ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>{p}</button>
                        ))}
                        <button onClick={() => setPaginaActual(p => Math.min(Math.ceil(articulos.length / 30), p + 1))} disabled={paginaActual >= Math.ceil(articulos.length / 30)} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Siguiente →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* TAB: PETICIONES */}
          {/* ============================================ */}
          {activeTab === 'peticiones' && (
            <PeticionesTab areaOrigen={inventarioActual} isAdmin={isAdmin} accentColor="from-purple-600 to-purple-700" />
          )}

          {/* ============================================ */}
          {/* TAB: MOVIMIENTOS */}
          {/* ============================================ */}
          {activeTab === 'movimientos' && (
            <MovimientosTab inventario={inventarioActual} />
          )}

          {/* ============================================ */}
          {/* TAB: ASIGNACIONES */}
          {/* ============================================ */}
          {activeTab === 'asignaciones' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-slate-800">Vestuario Asignado</h3>
                  <p className="text-sm text-slate-500">{asignaciones.length} asignación{asignaciones.length !== 1 ? 'es' : ''} registrada{asignaciones.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowAsignarModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus size={18} />
                  Asignar Vestuario
                </button>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Filtrar por voluntario o prenda..."
                  onChange={e => {
                    const term = e.target.value.toLowerCase();
                    if (!term) { cargarAsignaciones(); return; }
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  id="filtro-asignaciones"
                />
              </div>

              {asignaciones.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay asignaciones registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {asignaciones.map((asig: any) => (
                    <div key={asig.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                        {asig.usuario.nombre?.charAt(0)}{asig.usuario.apellidos?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-slate-800">
                            {asig.usuario.nombre} {asig.usuario.apellidos}
                          </span>
                          <span className="text-sm text-slate-500">
                            {asig.usuario.numeroVoluntario}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-600">
                            <span className="font-medium">{asig.tipoPrenda}</span> - Talla: {asig.talla}
                          </span>
                          <span className="text-slate-500">Cantidad: {asig.cantidad}</span>
                          <span className="text-slate-400">
                            {new Date(asig.fechaAsignacion).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        {asig.observaciones && (
                          <p className="text-xs text-slate-500 mt-1">{asig.observaciones}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          asig.estado === 'ASIGNADO' ? 'bg-green-100 text-green-700' :
                          asig.estado === 'DEVUELTO' ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {asig.estado}
                        </span>
                        {asig.estado === 'ASIGNADO' && (
                          <button
                            onClick={() => handleDevolverVestuario(asig.id, asig.tipoPrenda, asig.cantidad)}
                            className="px-2 py-1 text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 font-medium"
                          >
                            Devolver
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* MODALES */}
      {/* ============================================ */}

      {/* Modal: Nuevo Artículo */}
      {showNuevoArticulo && (
        <Modal title="Nuevo Artículo" onClose={() => setShowNuevoArticulo(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código</label>
                <input type="text" value={nuevoArticulo.codigo} onChange={e => setNuevoArticulo({ ...nuevoArticulo, codigo: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="ART-001" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidad</label>
                <select value={nuevoArticulo.unidad} onChange={e => setNuevoArticulo({ ...nuevoArticulo, unidad: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="unidad">Unidad</option>
                  <option value="pares">Pares</option>
                  <option value="cajas">Cajas</option>
                  <option value="litros">Litros</option>
                  <option value="kg">Kilogramos</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre *</label>
              <input type="text" value={nuevoArticulo.nombre} onChange={e => setNuevoArticulo({ ...nuevoArticulo, nombre: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Familia *</label>
              <select value={nuevoArticulo.familiaId} onChange={e => setNuevoArticulo({ ...nuevoArticulo, familiaId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                <option value="">Seleccionar...</option>
                {familias.map(f => <option key={f.id} value={f.id}>{f.categoria.nombre} → {f.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Inicial</label>
                <input type="number" value={nuevoArticulo.stockActual} onChange={e => setNuevoArticulo({ ...nuevoArticulo, stockActual: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Mínimo</label>
                <input type="number" value={nuevoArticulo.stockMinimo} onChange={e => setNuevoArticulo({ ...nuevoArticulo, stockMinimo: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
            {inventarioActual === 'vestuario' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tallas disponibles</label>
                <div className="flex flex-wrap gap-2">
                  {['XS','S','M','L','XL','XXL','2XL','3XL','36','37','38','39','40','41','42','43','44','45'].map(talla => (
                    <button
                      key={talla}
                      type="button"
                      onClick={() => {
                        const current = nuevoArticulo.tallas || [];
                        const updated = current.includes(talla)
                          ? current.filter((t: string) => t !== talla)
                          : [...current, talla];
                        setNuevoArticulo({ ...nuevoArticulo, tallas: updated });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        (nuevoArticulo.tallas || []).includes(talla)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                      }`}
                    >
                      {talla}
                    </button>
                  ))}
                </div>
                {(nuevoArticulo.tallas || []).length > 0 && (
                  <p className="text-xs text-purple-600 mt-2">Seleccionadas: {(nuevoArticulo.tallas || []).join(', ')}</p>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowNuevoArticulo(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleGuardarArticulo} className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Guardar</button>
            </div>
          </div>
        </Modal>
      )}


      {/* Modal: Editar Artículo */}
      {articuloEditando && (
        <Modal title={`Editar artículo — ${articuloEditando.nombre}`} onClose={() => setArticuloEditando(null)}>
          <form onSubmit={async e => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            const res = await fetch('/api/logistica', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipo: 'articulo',
                id: articuloEditando.id,
                codigo: f.get('codigo'),
                nombre: f.get('nombre'),
                descripcion: f.get('descripcion'),
                stockActual: parseInt(f.get('stockActual') as string),
                stockMinimo: parseInt(f.get('stockMinimo') as string),
                unidad: f.get('unidad'),
                ubicacion: f.get('ubicacion'),
              })
            })
            if (res.ok) {
              setArticuloEditando(null)
              cargarDatos()
            }
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Código</label>
                <input name="codigo" defaultValue={articuloEditando.codigo || ''} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unidad</label>
                <input name="unidad" defaultValue={articuloEditando.unidad || 'ud'} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre *</label>
                <input name="nombre" required defaultValue={articuloEditando.nombre} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descripción</label>
                <textarea name="descripcion" rows={2} defaultValue={articuloEditando.descripcion || ''} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Stock actual</label>
                <input name="stockActual" type="number" min="0" defaultValue={articuloEditando.stockActual} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
                <p className="text-[10px] text-slate-400 mt-1">Puede ponerse a 0 para reflejar inventario real</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Stock mínimo</label>
                <input name="stockMinimo" type="number" min="0" defaultValue={articuloEditando.stockMinimo} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ubicación</label>
                <input name="ubicacion" defaultValue={articuloEditando.ubicacion || ''} placeholder="Ej: Armario 3, Estantería B..." className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400" />
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setArticuloEditando(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700">Guardar cambios</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Movimiento */}
      {showMovimiento && articuloMovimiento && (
        <Modal title="Registrar Movimiento" onClose={() => { setShowMovimiento(false); setArticuloMovimiento(null); }}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-medium text-slate-800">{articuloMovimiento.nombre}</p>
              <p className="text-sm text-slate-500">Stock actual: {articuloMovimiento.stockActual} {articuloMovimiento.unidad}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo</label>
              <div className="flex gap-2">
                {['entrada', 'salida', 'ajuste'].map(tipo => (
                  <button key={tipo} onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo })} className={`flex-1 py-2.5 rounded-lg font-medium capitalize ${nuevoMovimiento.tipo === tipo ? (tipo === 'entrada' ? 'bg-green-500 text-white' : tipo === 'salida' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-slate-100 text-slate-600'}`}>{tipo}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad *</label>
              <input type="number" value={nuevoMovimiento.cantidad || ''} onChange={e => setNuevoMovimiento({ ...nuevoMovimiento, cantidad: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo *</label>
              <select value={nuevoMovimiento.motivo} onChange={e => setNuevoMovimiento({ ...nuevoMovimiento, motivo: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                <option value="">Seleccionar...</option>
                {nuevoMovimiento.tipo === 'entrada' && <><option value="Compra">Compra</option><option value="Donación">Donación</option><option value="Devolución">Devolución</option></>}
                {nuevoMovimiento.tipo === 'salida' && <><option value="Uso en servicio">Uso en servicio</option><option value="Caducidad">Caducidad</option><option value="Pérdida">Pérdida</option></>}
                {nuevoMovimiento.tipo === 'ajuste' && <><option value="Inventario">Ajuste inventario</option><option value="Corrección">Corrección</option></>}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowMovimiento(false); setArticuloMovimiento(null); }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarMovimiento} className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium">Registrar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gestión de Familias / Subfamilias - Vestuario */}
      {showGestionFamilias && (() => {
        const vestuarioCat = categorias.find(c => c.slug === 'vestuario') || areas.find(a => a.slug === 'vestuario');
        const familiasVestuario = categorias.filter(c => c.padreId === vestuarioCat?.id);
        const subfamiliasVestuario = familias.filter(f => {
          const catPadreId = categorias.find(c => c.id === f.categoria?.id)?.padreId;
          return catPadreId === vestuarioCat?.id || f.categoria?.id === vestuarioCat?.id;
        });
        return (
          <Modal title="Vestuario — Familias y Subfamilias" onClose={() => { setShowGestionFamilias(false); setFamiliaEditando(null); setNuevaFamiliaText(''); setNuevaFamiliaCatText(''); setGestionTab('familias'); }} size="lg">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-4">
              <button onClick={() => setGestionTab('familias')} className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${gestionTab === 'familias' ? 'border-purple-500 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                Familias ({familiasVestuario.length})
              </button>
              <button onClick={() => setGestionTab('subfamilias')} className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${gestionTab === 'subfamilias' ? 'border-purple-500 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                Subfamilias ({subfamiliasVestuario.length})
              </button>
            </div>

            {gestionTab === 'familias' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Las familias son los grupos principales (ej: EPI, Uniformidad, Calzado).</p>
                <div className="bg-slate-50 rounded-xl p-4 flex gap-2">
                  <input
                    type="text"
                    value={nuevaFamiliaCatText}
                    onChange={e => setNuevaFamiliaCatText(e.target.value)}
                    placeholder="Nombre de la familia..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleCrearFamiliaCat()}
                  />
                  <button onClick={handleCrearFamiliaCat} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">Añadir</button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {familiasVestuario.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No hay familias creadas</p>
                  ) : familiasVestuario.map(fam => (
                    <div key={fam.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: fam.color || '#8b5cf6' }}>{fam.nombre.charAt(0)}</div>
                        <span className="font-medium text-slate-800">{fam.nombre}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gestionTab === 'subfamilias' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Las subfamilias son tipos de artículo dentro de cada familia (ej: Pantalón de intervención, Botas de montaña).</p>
                {familiasVestuario.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">Primero crea al menos una Familia en la pestaña anterior.</div>
                )}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Familia a la que pertenece *</label>
                    <select value={subfamiliaParentId} onChange={e => setSubfamiliaParentId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="">— Seleccionar familia —</option>
                      {familiasVestuario.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    {familiaEditando ? (
                      <>
                        <input type="text" value={familiaEditando.nombre} onChange={e => setFamiliaEditando({ ...familiaEditando, nombre: e.target.value })} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        <button onClick={handleGuardarFamilia} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">Actualizar</button>
                        <button onClick={() => { setFamiliaEditando(null); setNuevaFamiliaText(''); }} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <input type="text" value={nuevaFamiliaText} onChange={e => setNuevaFamiliaText(e.target.value)} placeholder="Nombre de la subfamilia..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" onKeyDown={e => e.key === 'Enter' && handleGuardarFamilia()} />
                        <button onClick={handleGuardarFamilia} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">Añadir</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {subfamiliasVestuario.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No hay subfamilias creadas</p>
                  ) : subfamiliasVestuario.map(fam => (
                    <div key={fam.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">{fam.nombre}</p>
                        <p className="text-xs text-slate-400">{fam.categoria?.nombre}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFamiliaEditando({ id: fam.id, nombre: fam.nombre })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => handleEliminarFamilia(fam.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Modal: Asignar Vestuario */}
      {showAsignarModal && (
        <Modal title="Asignar Vestuario a Voluntario" onClose={() => setShowAsignarModal(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Voluntario *</label>
              <select
                value={asignacionData.usuarioId}
                onChange={e => setAsignacionData({...asignacionData, usuarioId: e.target.value})}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Seleccionar voluntario...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellidos} - {u.numeroVoluntario}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Artículo de Vestuario *</label>
              <select
                value={asignacionData.articuloId}
                onChange={e => setAsignacionData({...asignacionData, articuloId: e.target.value})}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Seleccionar artículo...</option>
                {articulos.map(art => (
                  <option key={art.id} value={art.id}>
                    {art.nombre} (Stock: {art.stockActual - (art.stockAsignado || 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Info stock artículo seleccionado */}
            {asignacionData.articuloId && (() => {
              const art = articulos.find(a => a.id === asignacionData.articuloId);
              if (!art) return null;
              const disponible = art.stockActual - (art.stockAsignado || 0);
              return (
                <div className={`rounded-lg p-3 flex items-center gap-3 ${disponible <= 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{art.nombre}</p>
                    <div className="flex gap-4 mt-1 text-xs">
                      <span className="text-slate-600">Total: <strong>{art.stockActual}</strong></span>
                      <span className="text-purple-700">Asignado: <strong>{art.stockAsignado || 0}</strong></span>
                      <span className={disponible <= 0 ? 'text-red-700' : 'text-green-700'}>Disponible: <strong>{disponible}</strong></span>
                    </div>
                  </div>
                  {disponible <= 0 && <span className="text-xs text-red-600 font-bold">SIN STOCK</span>}
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Talla *</label>
                {(() => {
                  const art = articulos.find(a => a.id === asignacionData.articuloId);
                  const tallasArt = art?.metadatos ? (art.metadatos as any)?.tallas as string[] : [];
                  const tallasDisponibles = tallasArt && tallasArt.length > 0 ? tallasArt : ['XS','S','M','L','XL','XXL','2XL','3XL','36','37','38','39','40','41','42','43','44','45'];
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {tallasDisponibles.map(talla => (
                        <button
                          key={talla}
                          type="button"
                          onClick={() => setAsignacionData({...asignacionData, talla})}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            asignacionData.talla === talla
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                          }`}
                        >
                          {talla}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {asignacionData.talla && (
                  <p className="text-xs text-purple-600 mt-1">Talla seleccionada: <strong>{asignacionData.talla}</strong></p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  value={asignacionData.cantidad}
                  onChange={e => setAsignacionData({...asignacionData, cantidad: parseInt(e.target.value) || 1})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones</label>
              <textarea
                value={asignacionData.observaciones}
                onChange={e => setAsignacionData({...asignacionData, observaciones: e.target.value})}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={3}
                placeholder="Notas adicionales sobre la asignación..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowAsignarModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarVestuario}
                className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
              >
                Asignar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
