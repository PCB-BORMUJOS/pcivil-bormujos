'use client';
import { useSearchParams } from 'next/navigation';

import React, { useState, useEffect } from 'react';
import {
  Package, Search, AlertTriangle, Plus, TrendingUp, TrendingDown, 
  BarChart3, Calendar, MapPin, Trash2, Eye, X, RefreshCw, ArrowUpDown,
  AlertCircle, CheckCircle, Clock, Box, ChevronDown, ChevronRight,
  Flame, Heart, Truck, Radio, GraduationCap, Shirt, Shield, Layers,
  ClipboardList, ShoppingCart, Check, FileText, Send, Ban,
  History, User, Building, Receipt, Filter, Users
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
  solicitante: { nombre: string; apellidos: string; numeroVoluntario: string };
  articulo: { nombre: string; codigo: string } | null;
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
  'transmisiones': Radio,
  'formacion': GraduationCap,
  'pma': AlertTriangle,
  'vestuario': Shirt,
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
  const [showDetallePeticion, setShowDetallePeticion] = useState<Peticion | null>(null);
  const [showAccionPeticion, setShowAccionPeticion] = useState<{ peticion: Peticion; accion: string } | null>(null);
  const [articuloMovimiento, setArticuloMovimiento] = useState<Articulo | null>(null);

  // Formularios
  const [nuevoArticulo, setNuevoArticulo] = useState({
    codigo: '', nombre: '', descripcion: '', stockActual: 0, stockMinimo: 0,
    unidad: 'unidad', tieneCaducidad: false, fechaCaducidad: '', familiaId: ''
  });
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'entrada', cantidad: 0, motivo: '', notas: '' });
  const [nuevaPeticion, setNuevaPeticion] = useState({
    articuloId: '', nombreArticulo: '', cantidad: 1, unidad: 'unidad',
    motivo: 'reposicion', prioridad: 'normal', descripcion: '', areaOrigen: ''
  });
  const [accionForm, setAccionForm] = useState({ comentario: '', proveedor: '', costeEstimado: '', costeFinal: '', numeroFactura: '' });

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
      console.error('Error cargando datos:', error);
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
      console.error('Error cargando peticiones:', error);
    }
  };

  const cargarMovimientos = async () => {
    try {
      const res = await fetch('/api/logistica/movimiento?limit=100');
      const data = await res.json();
      setMovimientos(data.movimientos || []);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    }
  };
  
  const cargarAsignaciones = async () => {
    try {
      const res = await fetch(`/api/logistica?tipo=asignaciones&inventario=${inventarioActual}`);
      const data = await res.json();
      setAsignaciones(data.asignaciones || []);
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
    }
  };

  const cargarUsuarios = async () => {
  try {
    const res = await fetch('/api/admin/personal');
    const data = await res.json();
    setUsuarios(data.voluntarios || []);
  } catch (error) {
    console.error('Error cargando usuarios:', error);
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
        setNuevoArticulo({ codigo: '', nombre: '', descripcion: '', stockActual: 0, stockMinimo: 0, unidad: 'unidad', tieneCaducidad: false, fechaCaducidad: '', familiaId: '' });
        cargarDatos();
        alert('✅ Artículo creado correctamente');
      }
    } catch (error) {
      alert('Error al guardar artículo');
    }
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
      const res = await fetch('/api/logistica/peticiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaPeticion)
      });
      if (res.ok) {
        setShowNuevaPeticion(false);
        setNuevaPeticion({ articuloId: '', nombreArticulo: '', cantidad: 1, unidad: 'unidad', motivo: 'reposicion', prioridad: 'normal', descripcion: '', areaOrigen: '' });
        cargarPeticiones();
        alert('✅ Petición creada correctamente');
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
      console.error('Error asignando vestuario:', error);
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
        setAccionForm({ comentario: '', proveedor: '', costeEstimado: '', costeFinal: '', numeroFactura: '' });
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Selector de Inventario */}
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
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">⚠️ {area.stockBajo}</span>
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
            <h1 className="text-2xl font-bold text-slate-800">{getNombreInventario()}</h1>
            <p className="text-slate-500 text-sm">{inventarioActual === 'all' ? 'Gestión centralizada de todos los inventarios' : 'Gestión de artículos del área'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Send size={18} /> Nueva Petición
          </button>
          <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Plus size={18} /> Nuevo Artículo
          </button>
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
        <div className={`bg-white p-5 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${soloAlertas ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-slate-200'}`} onClick={() => setSoloAlertas(!soloAlertas)}>
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
      {inventarioActual === 'all' && statsPorArea.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statsPorArea.map(area => {
            const IconoArea = getIconoArea(area.slug);
            return (
              <button key={area.id} onClick={() => handleCambiarInventario(area.slug)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: area.color }}><IconoArea size={16} /></div>
                  <span className="font-medium text-slate-800 text-sm truncate">{area.nombre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-800">{area.totalArticulos}</span>
                  {area.stockBajo > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">{area.stockBajo}⚠️</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

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
          <button onClick={() => { cargarDatos(); cargarPeticiones(); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={18} /></button>
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
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && cargarDatos()}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <select value={selectedFamilia} onChange={e => setSelectedFamilia(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
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
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Stock</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Ubicación</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Caducidad</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articulos.map(articulo => {
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
                              <span className="text-lg font-bold text-slate-800">{articulo.stockActual}</span>
                              <span className="text-xs text-slate-400 ml-1">{articulo.unidad}</span>
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${estadoStock.color}`}>
                                <EstadoIcon size={10} /> {estadoStock.label}
                              </div>
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
                                <button onClick={() => { setNuevaPeticion({ ...nuevaPeticion, articuloId: articulo.id, nombreArticulo: articulo.nombre, unidad: articulo.unidad, areaOrigen: articulo.familia.categoria.slug }); setShowNuevaPeticion(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Solicitar"><Send size={16} /></button>
                                <button onClick={() => handleEliminarArticulo(articulo.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* TAB: PETICIONES */}
          {/* ============================================ */}
          {activeTab === 'peticiones' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <select value={filtroPeticiones} onChange={e => setFiltroPeticiones(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="all">Todos los estados</option>
                    <option value="pendiente">Pendientes ({peticionStats.pendientes})</option>
                    <option value="aprobada">Aprobadas ({peticionStats.aprobadas})</option>
                    <option value="en_compra">En Compra ({peticionStats.enCompra})</option>
                    <option value="recibida">Recibidas ({peticionStats.recibidas})</option>
                    <option value="rechazada">Rechazadas ({peticionStats.rechazadas})</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> {peticionStats.pendientes} Pendientes</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400"></span> {peticionStats.aprobadas} Aprobadas</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400"></span> {peticionStats.enCompra} En Compra</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400"></span> {peticionStats.recibidas} Recibidas</span>
                </div>
              </div>

              {peticiones.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay peticiones</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {peticiones.map(peticion => {
                    const estadoInfo = ESTADOS_PETICION[peticion.estado as keyof typeof ESTADOS_PETICION] || ESTADOS_PETICION.pendiente;
                    const prioridadInfo = PRIORIDADES[peticion.prioridad as keyof typeof PRIORIDADES] || PRIORIDADES.normal;
                    const EstadoIcon = estadoInfo.icon;
                    const AreaIcon = getIconoArea(peticion.areaOrigen);
                    
                    return (
                      <div key={peticion.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                              <AreaIcon size={24} className="text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800">{peticion.numero}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${estadoInfo.color}`}>
                                  <EstadoIcon size={12} className="inline mr-1" />{estadoInfo.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${prioridadInfo.color}`}>{prioridadInfo.label}</span>
                              </div>
                              <p className="font-medium text-slate-700 mt-1">{peticion.nombreArticulo} <span className="text-slate-400">× {peticion.cantidad} {peticion.unidad}</span></p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><User size={12} /> {peticion.solicitante.nombre} {peticion.solicitante.apellidos}</span>
                                <span className="flex items-center gap-1"><Building size={12} /> {AREAS_NOMBRE[peticion.areaOrigen] || peticion.areaOrigen}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {formatearFecha(peticion.fechaSolicitud)}</span>
                              </div>
                              {peticion.descripcion && <p className="text-sm text-slate-500 mt-2 line-clamp-1">{peticion.descripcion}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button onClick={() => setShowDetallePeticion(peticion)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Eye size={18} /></button>
                            
                            {/* Acciones según estado */}
                            <div className="flex items-center gap-1">
                              {peticion.estado === 'pendiente' && (
                                <>
                                  <button onClick={() => setShowAccionPeticion({ peticion, accion: 'aprobar' })} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 flex items-center gap-1"><Check size={14} /> Aprobar</button>
                                  <button onClick={() => setShowAccionPeticion({ peticion, accion: 'rechazar' })} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 flex items-center gap-1"><X size={14} /> Rechazar</button>
                                </>
                              )}
                              {peticion.estado === 'aprobada' && (
                                <button onClick={() => setShowAccionPeticion({ peticion, accion: 'en_compra' })} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 flex items-center gap-1"><ShoppingCart size={14} /> Pasar a Compra</button>
                              )}
                              {(peticion.estado === 'aprobada' || peticion.estado === 'en_compra') && (
                                <button onClick={() => setShowAccionPeticion({ peticion, accion: 'recibir' })} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 flex items-center gap-1"><CheckCircle size={14} /> Recepcionar</button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timeline mini */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                          <div className={`flex items-center gap-1 text-xs ${peticion.fechaSolicitud ? 'text-green-600' : 'text-slate-300'}`}>
                            <div className={`w-2 h-2 rounded-full ${peticion.fechaSolicitud ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                            Solicitada
                          </div>
                          <div className="flex-1 h-px bg-slate-200"></div>
                          <div className={`flex items-center gap-1 text-xs ${peticion.fechaAprobacion ? 'text-green-600' : 'text-slate-300'}`}>
                            <div className={`w-2 h-2 rounded-full ${peticion.fechaAprobacion ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                            Aprobada
                          </div>
                          <div className="flex-1 h-px bg-slate-200"></div>
                          <div className={`flex items-center gap-1 text-xs ${peticion.fechaCompra ? 'text-green-600' : 'text-slate-300'}`}>
                            <div className={`w-2 h-2 rounded-full ${peticion.fechaCompra ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                            En Compra
                          </div>
                          <div className="flex-1 h-px bg-slate-200"></div>
                          <div className={`flex items-center gap-1 text-xs ${peticion.fechaRecepcion ? 'text-green-600' : 'text-slate-300'}`}>
                            <div className={`w-2 h-2 rounded-full ${peticion.fechaRecepcion ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                            Recibida
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* TAB: MOVIMIENTOS */}
          {/* ============================================ */}
          {activeTab === 'movimientos' && (
            <>
              {movimientos.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ArrowUpDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movimientos.map(mov => (
                    <div key={mov.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-600' : mov.tipo === 'salida' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {mov.tipo === 'entrada' ? <TrendingUp size={20} /> : mov.tipo === 'salida' ? <TrendingDown size={20} /> : <BarChart3 size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{mov.articulo.nombre}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' : mov.tipo === 'salida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {mov.tipo === 'entrada' ? '+' : mov.tipo === 'salida' ? '-' : '='}{mov.cantidad}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{mov.motivo}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-slate-600">{mov.usuario.nombre} {mov.usuario.apellidos}</p>
                        <p className="text-slate-400 text-xs">{formatearFechaHora(mov.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* TAB: ASIGNACIONES */}
          {/* ============================================ */}
          {activeTab === 'asignaciones' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">Vestuario Asignado</h3>
                  <p className="text-sm text-slate-500">Gestión de asignaciones a voluntarios</p>
                </div>
                <button
                  onClick={() => setShowAsignarModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus size={18} />
                  Asignar Vestuario
                </button>
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
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          asig.estado === 'ASIGNADO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {asig.estado}
                        </span>
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
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowNuevoArticulo(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleGuardarArticulo} className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Guardar</button>
            </div>
          </div>
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

      {/* Modal: Nueva Petición */}
      {showNuevaPeticion && (
        <Modal title="Nueva Petición de Material" onClose={() => setShowNuevaPeticion(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Área Solicitante *</label>
              <select value={nuevaPeticion.areaOrigen} onChange={e => setNuevaPeticion({ ...nuevaPeticion, areaOrigen: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                <option value="">Seleccionar área...</option>
                {Object.entries(AREAS_NOMBRE).map(([slug, nombre]) => <option key={slug} value={slug}>{nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Artículo *</label>
              <input type="text" value={nuevaPeticion.nombreArticulo} onChange={e => setNuevaPeticion({ ...nuevaPeticion, nombreArticulo: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Nombre del artículo" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad *</label>
                <input type="number" value={nuevaPeticion.cantidad} onChange={e => setNuevaPeticion({ ...nuevaPeticion, cantidad: parseInt(e.target.value) || 1 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" min={1} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidad</label>
                <select value={nuevaPeticion.unidad} onChange={e => setNuevaPeticion({ ...nuevaPeticion, unidad: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="unidad">Unidad</option>
                  <option value="cajas">Cajas</option>
                  <option value="pares">Pares</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
                <select value={nuevaPeticion.prioridad} onChange={e => setNuevaPeticion({ ...nuevaPeticion, prioridad: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo *</label>
              <select value={nuevaPeticion.motivo} onChange={e => setNuevaPeticion({ ...nuevaPeticion, motivo: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                {MOTIVOS_PETICION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
              <textarea value={nuevaPeticion.descripcion} onChange={e => setNuevaPeticion({ ...nuevaPeticion, descripcion: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Detalles adicionales..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNuevaPeticion(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarPeticion} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium">Crear Petición</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Detalle Petición */}
      {showDetallePeticion && (
        <Modal title={`Petición ${showDetallePeticion.numero}`} onClose={() => setShowDetallePeticion(null)} size="xl">
          <div className="space-y-6">
            {/* Info principal */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800">{showDetallePeticion.nombreArticulo}</h3>
                <p className="text-slate-500">{showDetallePeticion.cantidad} {showDetallePeticion.unidad}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${ESTADOS_PETICION[showDetallePeticion.estado as keyof typeof ESTADOS_PETICION]?.color}`}>
                    {ESTADOS_PETICION[showDetallePeticion.estado as keyof typeof ESTADOS_PETICION]?.label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORIDADES[showDetallePeticion.prioridad as keyof typeof PRIORIDADES]?.color}`}>
                    {PRIORIDADES[showDetallePeticion.prioridad as keyof typeof PRIORIDADES]?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Detalles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Solicitante</p>
                <p className="font-medium">{showDetallePeticion.solicitante.nombre} {showDetallePeticion.solicitante.apellidos}</p>
                <p className="text-sm text-slate-500">{showDetallePeticion.solicitante.numeroVoluntario}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Área</p>
                <p className="font-medium">{AREAS_NOMBRE[showDetallePeticion.areaOrigen] || showDetallePeticion.areaOrigen}</p>
              </div>
            </div>

            {showDetallePeticion.descripcion && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Descripción</p>
                <p className="text-slate-700">{showDetallePeticion.descripcion}</p>
              </div>
            )}

            {/* Historial */}
            <div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><History size={18} /> Historial</h4>
              <div className="space-y-3">
                {showDetallePeticion.historial.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">{i + 1}</div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{h.estadoNuevo.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-xs text-slate-400">{formatearFechaHora(h.createdAt)}</span>
                      </div>
                      {h.comentario && <p className="text-sm text-slate-600 mt-1">{h.comentario}</p>}
                      <p className="text-xs text-slate-400 mt-1">Por: {h.usuario.nombre} {h.usuario.apellidos}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowDetallePeticion(null)} className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium">Cerrar</button>
          </div>
        </Modal>
      )}

      {/* Modal: Acción Petición */}
      {showAccionPeticion && (
        <Modal 
          title={
            showAccionPeticion.accion === 'aprobar' ? 'Aprobar Petición' :
            showAccionPeticion.accion === 'rechazar' ? 'Rechazar Petición' :
            showAccionPeticion.accion === 'en_compra' ? 'Pasar a Compra' :
            'Recepcionar Material'
          } 
          onClose={() => setShowAccionPeticion(null)}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-medium">{showAccionPeticion.peticion.nombreArticulo}</p>
              <p className="text-sm text-slate-500">{showAccionPeticion.peticion.cantidad} {showAccionPeticion.peticion.unidad} - {AREAS_NOMBRE[showAccionPeticion.peticion.areaOrigen]}</p>
            </div>

            {showAccionPeticion.accion === 'en_compra' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor</label>
                  <input type="text" value={accionForm.proveedor} onChange={e => setAccionForm({ ...accionForm, proveedor: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coste Estimado (€)</label>
                  <input type="number" step="0.01" value={accionForm.costeEstimado} onChange={e => setAccionForm({ ...accionForm, costeEstimado: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                </div>
              </>
            )}

            {showAccionPeticion.accion === 'recibir' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coste Final (€)</label>
                  <input type="number" step="0.01" value={accionForm.costeFinal} onChange={e => setAccionForm({ ...accionForm, costeFinal: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Factura</label>
                  <input type="text" value={accionForm.numeroFactura} onChange={e => setAccionForm({ ...accionForm, numeroFactura: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                </div>
                {showAccionPeticion.peticion.articulo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                    ✓ Al recepcionar, se añadirán {showAccionPeticion.peticion.cantidad} {showAccionPeticion.peticion.unidad} al stock del artículo
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {showAccionPeticion.accion === 'rechazar' ? 'Motivo del Rechazo *' : 'Comentario'}
              </label>
              <textarea value={accionForm.comentario} onChange={e => setAccionForm({ ...accionForm, comentario: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAccionPeticion(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium">Cancelar</button>
              <button 
                onClick={handleAccionPeticion} 
                className={`flex-1 py-2.5 text-white rounded-lg font-medium ${
                  showAccionPeticion.accion === 'rechazar' ? 'bg-red-500 hover:bg-red-600' :
                  showAccionPeticion.accion === 'aprobar' ? 'bg-green-500 hover:bg-green-600' :
                  'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Talla *</label>
                <select
                  value={asignacionData.talla}
                  onChange={e => setAsignacionData({...asignacionData, talla: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="XXXL">XXXL</option>
                  <option value="36">36</option>
                  <option value="37">37</option>
                  <option value="38">38</option>
                  <option value="39">39</option>
                  <option value="40">40</option>
                  <option value="41">41</option>
                  <option value="42">42</option>
                  <option value="43">43</option>
                  <option value="44">44</option>
                  <option value="45">45</option>
                  <option value="46">46</option>
                  <option value="47">47</option>
                  <option value="48">48</option>
                </select>
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
