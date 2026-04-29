'use client'
import TicketOCRUploader from '@/components/admin/TicketOCRUploader'
import { PERMISOS_DISPONIBLES } from '@/lib/permisos';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, DollarSign, Fuel, Wallet, ChevronLeft, ChevronRight,
  Search, Plus, Edit, Eye, Download, Upload, X, Save, FileText, Check,
  AlertCircle, Clock, Car, Phone, Mail, MapPin, CreditCard, Receipt,
  TrendingUp, TrendingDown, Filter, Printer, Shield, Building2, Trash2,
  AlertTriangle, CheckCircle, XCircle, UserCheck, RefreshCw, UserPlus, ChevronDown
} from 'lucide-react';

import DocumentUploader from '@/components/admin/DocumentUploader';

// ============================================
// TIPOS
// ============================================
interface Voluntario {
  id: string;
  numeroVoluntario: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  activo: boolean;
  rolId: string;
  rol: { id: string; nombre: string };
  fichaVoluntario?: {
    areaAsignada?: string;
    areaSecundaria?: string;
    categoria?: string;
    fechaAlta?: string;
  };
  permisosExtra?: string[];
}

interface DisponibilidadAdmin {
  id: string;
  usuario: { id: string; numeroVoluntario: string; nombre: string; apellidos: string };
  noDisponible: boolean;
  detalles: any;
  turnosDeseados: number;
  puedeDobleturno: boolean;
  notas: string;
  estado: string;
}

interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string;
  descripcion: string;
  importe: number;
  saldoPosterior: number;
  categoria?: string;
  adjuntoUrl?: string;
}

interface TicketCombustible {
  id: string;
  fecha: string;
  estacion: string;
  destino: string;
  concepto: string;
  litros: number;
  precioLitro: number;
  importeFinal: number;
  ticketUrl?: string;
}

interface Poliza {
  id: string;
  tipo: string;
  numero: string;
  compania: string;
  descripcion: string;
  fechaInicio: string;
  fechaVencimiento: string;
  primaAnual: number;
  estado: string;
  vehiculoId?: string;
  notas?: string;
}

interface Aspirante {
  id: string;
  fecha: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  estado: 'pendiente' | 'entrevistado' | 'aceptado' | 'rechazado';

  // Entrevista
  fechaEntrevista?: string;
  confirmacionAsistencia: boolean;
  asistioEntrevista: boolean;
  evaluacionEntrevista?: string;

  // Datos personales
  carneConducir?: string;
  formacion?: string;
  ocupacionActual?: string;
  tiempoLibre?: string;
  interesServicio?: string;

  // Gestión
  observaciones?: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// CONSTANTES
// ============================================
// ============================================
// IMPORTS FOR DRAG & DROP
// ============================================

// ... (existing imports)

// ============================================
// CONSTANTES
// ============================================
const AREAS_SERVICIO = [
  { id: 'JEFATURA', nombre: 'Jefatura', color: 'bg-purple-500' },
  { id: 'SOCORRISMO', nombre: 'Socorrismo', color: 'bg-blue-500' },
  { id: 'EXT_INCENDIOS', nombre: 'Ext. Incendios', color: 'bg-red-500' },
  { id: 'LOGISTICA', nombre: 'Logística', color: 'bg-green-500' },
  { id: 'VEHICULOS', nombre: 'Vehículos', color: 'bg-indigo-500' }, // NUEVA ÁREA
  { id: 'FORMACION', nombre: 'Formación', color: 'bg-yellow-500' },
  { id: 'TRANSMISIONES', nombre: 'Transmisiones', color: 'bg-cyan-500' },
  { id: 'ACCION_SOCIAL', nombre: 'Acción Social', color: 'bg-pink-500' },
  { id: 'PMA', nombre: 'PMA', color: 'bg-orange-500' },
  { id: 'ADMINISTRACION', nombre: 'Administración', color: 'bg-slate-500' },
];

// ... (existing constants)

// ============================================
// COMPONENTES DRAG & DROP
// ============================================

// Componente para un voluntario arrastrable
function VoluntarioDraggable({ voluntario }: { voluntario: Voluntario }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: voluntario.id, data: { voluntario } }); // Usamos useSortable para compatibilidad si quisiéramos ordenar, aunque Draggable bastaría

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200 ${isDragging ? 'bg-orange-50 ring-2 ring-orange-500' : 'hover:bg-slate-50'
        }`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold 
        ${!voluntario.fichaVoluntario?.areaAsignada ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'}`}>
        {voluntario.nombre?.charAt(0)}{voluntario.apellidos?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{voluntario.nombre} {voluntario.apellidos}</p>
        <p className="text-xs text-slate-500">{voluntario.numeroVoluntario}</p>
      </div>
    </div>
  );
}

// Componente para un área droppable
function AreaDroppable({ id, color, nombre, count, children }: { id: string, color: string, nombre: string, count: number, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useSortable({ id: id, data: { type: 'AREA', areaId: id } }); // Usamos useSortable para que el contenedor también sea parte del contexto si needed, pero useDroppable es mejor para contenedores fijos

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border-2 rounded-xl overflow-hidden transition-colors flex flex-col h-full ${isOver ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
        }`}
      style={{ minHeight: '200px' }}
    >
      <div className={`${color} px-4 py-3 text-white flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold">{nombre}</h4>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">
            {count}
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto bg-slate-50/50">
        {React.Children.count(children) === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-slate-300 text-sm py-4 italic">Arrastra aquí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const FORMACION_PC = [
  'NIVEL 1 FORMACIÓN BÁSICA', 'COMUNICACIONES', 'RESCATE URBANO',
  'LAPL RPA MULTIROTOR', 'OPERADOR 112', 'SOCORRISMO AVA',
  'RCP + DEA', 'EXTINCIÓN DE INCENDIOS', 'INTERVENCIÓN MV',
  'INSTRUCTOR RCP + DEA', 'ACCIÓN SOCIAL'
];

const TIPOS_POLIZA = [
  { id: 'vehiculo', nombre: 'Vehículo', icono: Car },
  { id: 'rc_general', nombre: 'RC General', icono: Shield },
  { id: 'accidentes', nombre: 'Accidentes', icono: AlertTriangle },
  { id: 'voluntarios', nombre: 'Voluntarios', icono: Users },
  { id: 'instalaciones', nombre: 'Instalaciones', icono: Building2 },
];

// ============================================
// COMPONENTE MODAL
// ============================================
function Modal({ title, children, onClose, size = 'md' }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE TAB
// ============================================
function TabButton({ active, onClick, icon: Icon, label, count, alert }: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count?: number;
  alert?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${active
        ? 'border-orange-500 text-orange-600 bg-orange-50/50'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      <Icon size={18} />
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
          {count}
        </span>
      )}
      {alert && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      )}
    </button>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function AdministracionPage() {
  // DRAG & DROP STATE
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const voluntarioId = active.id as string;
    const voluntario = voluntarios.find(v => v.id === voluntarioId);

    const nuevaAreaId = over.id as string;
    let areaFinal = nuevaAreaId;

    // Si soltamos sobre un voluntario (sortable item), buscamos su area
    if (!AREAS_SERVICIO.some(a => a.id === nuevaAreaId) && nuevaAreaId !== 'sin-area') {
      const overVoluntario = voluntarios.find(v => v.id === nuevaAreaId);
      if (overVoluntario) {
        areaFinal = overVoluntario.fichaVoluntario?.areaAsignada || 'sin-area';
      } else {
        // Fallback si no encontramos
        return;
      }
    }

    // Convertir 'sin-area' a string vacío
    if (areaFinal === 'sin-area') areaFinal = '';

    if (!voluntario) return;
    if (voluntario.fichaVoluntario?.areaAsignada === areaFinal || (!voluntario.fichaVoluntario?.areaAsignada && areaFinal === '')) {
      return;
    }

    // Actualización Optimista
    const prevVoluntarios = [...voluntarios];
    setVoluntarios(prev => prev.map(v => {
      if (v.id === voluntarioId) {
        return {
          ...v,
          fichaVoluntario: {
            ...v.fichaVoluntario,
            areaAsignada: areaFinal || undefined
          }
        };
      }
      return v;
    }));

    // Llamada API
    try {
      const resFicha = await fetch(`/api/admin/personal/${voluntarioId}/ficha`);
      const dataFicha = await resFicha.json();
      const fichaActual = dataFicha.ficha || {};

      const payload = {
        ...fichaActual,
        areaAsignada: areaFinal
      };

      await fetch(`/api/admin/personal/${voluntarioId}/ficha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    } catch (error) {
      /* error silenciado */;
      alert("Error al guardar el cambio de área. Se revertirá.");
      setVoluntarios(prevVoluntarios);
    }
  };
  const [activeTab, setActiveTab] = useState<'personal' | 'disponibilidad' | 'dietas' | 'caja' | 'combustible' | 'polizas' | 'areas' | 'aspirantes'>('personal');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Personal
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [modoNuevaFicha, setModoNuevaFicha] = useState<'existente' | 'nuevo'>('existente');
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showNuevoVoluntario, setShowNuevoVoluntario] = useState(false);
  const [selectedVoluntario, setSelectedVoluntario] = useState<Voluntario | null>(null);
  const [fichaData, setFichaData] = useState<any>({});

  // Estados para Disponibilidad
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadAdmin[]>([]);
  const [semanaDisp, setSemanaDisp] = useState('');

  // Estados para Dietas
  const [mesDietas, setMesDietas] = useState('');
  const [resumenDietas, setResumenDietas] = useState<any[]>([]);
  const [informesDietas, setInformesDietas] = useState<any[]>([]);
  const [showNuevoInforme, setShowNuevoInforme] = useState(false);
  const [partidasDietas, setPartidasDietas] = useState<any[]>([]);

  // Estados para Caja
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>([]);
  const [saldoActual, setSaldoActual] = useState(0);
  const [showNuevoMovimiento, setShowNuevoMovimiento] = useState(false);
  const [showEditarMovimiento, setShowEditarMovimiento] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState<MovimientoCaja | null>(null);
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'entrada', concepto: '', descripcion: '', importe: 0, categoria: '', adjuntoUrl: '' });

  // Estados para Combustible
  const [ticketsCombustible, setTicketsCombustible] = useState<TicketCombustible[]>([]);
  const [mesCombustible, setMesCombustible] = useState('');
  const [showNuevoTicket, setShowNuevoTicket] = useState(false);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null)
  const [nuevoTicket, setNuevoTicket] = useState({
    fecha: '', hora: '', estacion: '', destino: 'MAQUINARIA', concepto: 'EFITEC 95',
    litros: 0, precioLitro: 0, importeFinal: 0, vehiculoDestino: '', notas: '', ticketUrl: ''
  });

  // Estados para Pólizas
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [showNuevaPoliza, setShowNuevaPoliza] = useState(false);
  const [polizaEditando, setPolizaEditando] = useState<Poliza | null>(null);
  const [nuevaPoliza, setNuevaPoliza] = useState({
    tipo: 'vehiculo', numero: '', compania: '', descripcion: '',
    fechaInicio: '', fechaVencimiento: '', primaAnual: 0, vehiculoId: '', notas: ''
  });

  // Estados para Aspirantes
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([]);
  const [showNuevoAspirante, setShowNuevoAspirante] = useState(false);
  const [aspiranteEditando, setAspiranteEditando] = useState<Aspirante | null>(null);
  const [aspiranteExpandido, setAspiranteExpandido] = useState<string | null>(null);
  const [aspiranteEditandoTemp, setAspiranteEditandoTemp] = useState<any>(null);
  const [nuevoAspirante, setNuevoAspirante] = useState({
    nombre: '', apellidos: '', dni: '', telefono: '', email: ''
  });

  // Estados para Documentos
  const [documentUrls, setDocumentUrls] = useState({
    acuerdoIndividual: '',
    certificadoTitularidad: '',
    modelo145: '',
    dni: ''
  });

  // Inicializar fechas
  useEffect(() => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    setMesDietas(mesActual);
    setMesCombustible(mesActual);

    const diaSemana = hoy.getDay();
    const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diasHastaLunes);
    setSemanaDisp(lunes.toISOString().split('T')[0]);
  }, []);

  // Cargar datos según tab activa
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'personal':
          case 'areas':
            await cargarVoluntarios();
            break;
          case 'disponibilidad':
            if (semanaDisp) await cargarDisponibilidades();
            break;
          case 'dietas':
            if (mesDietas) await cargarDietas();
            break;
          case 'caja':
            await cargarMovimientosCaja();
            break;
          case 'combustible':
            if (mesCombustible) await cargarTicketsCombustible();
            break;
          case 'polizas':
            await cargarPolizas();
            break;
          case 'aspirantes':
            await cargarAspirantes();
            break;
        }
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [activeTab, semanaDisp, mesDietas, mesCombustible]);

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================
  const cargarVoluntarios = async () => {
    try {
      const res = await fetch('/api/admin/personal?roles=true&bajas=true');
      const data = await res.json();
      setVoluntarios(data.voluntarios || []);
      setRoles(data.roles || []);
      setServicios(data.servicios || []);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarDisponibilidades = async () => {
    try {
      const res = await fetch(`/api/admin/disponibilidades?semana=${semanaDisp}`);
      const data = await res.json();
      setDisponibilidades(data.disponibilidades || []);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarDietas = async () => {
    try {
      const res = await fetch(`/api/admin/dietas?mes=${mesDietas}`);
      const data = await res.json();
      setResumenDietas(data.resumen || []);
      // Cargar informes del año actual
      const anio = mesDietas ? mesDietas.split('-')[0] : new Date().getFullYear().toString();
      const resInformes = await fetch(`/api/admin/dietas?tipo=informes&anio=${anio}`);
      const dataInformes = await resInformes.json();
      setInformesDietas(dataInformes.informes || []);
      // Cargar partidas presupuestarias para selector
      const resPartidas = await fetch(`/api/presupuesto?tipo=partidas&ejercicio=${anio}`);
      const dataPartidas = await resPartidas.json();
      setPartidasDietas(dataPartidas.partidas || []);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarMovimientosCaja = async () => {
    try {
      const res = await fetch('/api/admin/caja');
      const data = await res.json();
      setMovimientosCaja(data.movimientos || []);
      setSaldoActual(data.saldoActual || 0);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarTicketsCombustible = async () => {
    try {
      const res = await fetch(`/api/admin/combustible?mes=${mesCombustible}`);
      const data = await res.json();
      setTicketsCombustible(data.tickets || []);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const cargarPolizas = async () => {
    try {
      const res = await fetch('/api/admin/polizas');
      const data = await res.json();
      setPolizas(data.polizas || []);
    } catch (error) {
      /* error silenciado */;
    }
  };

  // ============================================
  // HANDLERS
  // ============================================
  const handleEditarFicha = async (voluntario: Voluntario) => {
    setSelectedVoluntario(voluntario);
    try {
      const res = await fetch(`/api/admin/personal/${voluntario.id}/ficha`);
      const data = await res.json();
      setFichaData({
        ...data.ficha,
        rolId: voluntario.rolId, // Inicializar con el rol actual
        permisosExtra: voluntario.permisosExtra || [],
        fechaAlta: data.ficha?.fechaAlta ? data.ficha.fechaAlta.split('T')[0] : new Date().toISOString().split('T')[0],
        localidad: data.ficha?.localidad || '',
        provincia: data.ficha?.provincia || '',
        areaAsignada: data.ficha?.areaAsignada || '',
        areaSecundaria: data.ficha?.areaSecundaria || '',
        categoria: data.ficha?.categoria || 'VOLUNTARIO',
        enPracticas: data.ficha?.enPracticas ?? false,
        turnosPracticasRealizados: data.ficha?.turnosPracticasRealizados ?? 0,
        fechaInicioPracticas: data.ficha?.fechaInicioPracticas ? data.ficha.fechaInicioPracticas.split('T')[0] : ''
      });
    } catch (error) {
      setFichaData({
        rolId: voluntario.rolId,
        fechaAlta: new Date().toISOString().split('T')[0],
        localidad: '',
        provincia: '',
        areaAsignada: '',
        areaSecundaria: '',
        categoria: 'VOLUNTARIO'
      });
    }
    setShowFichaModal(true);
  };

  const toggleActivo = async (voluntarioId: string, activo: boolean) => {
    try {
      const res = await fetch(`/api/admin/personal/${voluntarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo })
      });

      if (res.ok) {
        // Actualizar el estado local
        setVoluntarios(prev =>
          prev.map(v =>
            v.id === voluntarioId ? { ...v, activo } : v
          )
        );
      }
    } catch (error) {
      /* error silenciado */;
    }
  };

  const handleGuardarFicha = async () => {
    if (!selectedVoluntario) return;

    // Verificar que los campos obligatorios estén preenchidos para nueva ficha
    const esNuevaFicha = modoNuevaFicha === 'nuevo';
    if (esNuevaFicha) {
      if (modoNuevaFicha === 'nuevo') {
        if (!selectedVoluntario.nombre || !selectedVoluntario.apellidos || !selectedVoluntario.email) {
          alert('Por favor, completa los datos del voluntario: Nombre, Apellidos y Email');
          return;
        }
        if (!nuevoPassword) {
          alert('Por favor, introduce una contraseña para el nuevo voluntario');
          return;
        }
        if (!fichaData.rolId) {
          alert('Por favor, selecciona un rol para el voluntario');
          return;
        }
        if (!fichaData.servicioId) {
          alert('Por favor, selecciona un servicio para el voluntario');
          return;
        }
      }
    }

    try {
      let voluntarioId = selectedVoluntario.id;

      // Si es una nueva ficha y estamos en modo 'nuevo', primero crear el voluntario
      if (esNuevaFicha && modoNuevaFicha === 'nuevo') {
        const resVoluntario = await fetch('/api/admin/personal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numeroVoluntario: selectedVoluntario.numeroVoluntario || null,
            nombre: selectedVoluntario.nombre,
            apellidos: selectedVoluntario.apellidos,
            email: selectedVoluntario.email,
            telefono: selectedVoluntario.telefono || '',
            rolId: fichaData.rolId || null,
            servicioId: fichaData.servicioId || null,
            password: nuevoPassword,
            activo: true
          })
        });
        const dataVoluntario = await resVoluntario.json();

        // La API devuelve el usuario directamente (status 201) o un error
        if (!resVoluntario.ok) {
          alert('Error al crear el voluntario: ' + (dataVoluntario.error || 'Error desconocido'));
          return;
        }

        voluntarioId = dataVoluntario.id;
      }

      // Guardar la ficha
      // Si es edición, actualizar también nombre/apellidos/indicativo
      if (!esNuevaFicha && selectedVoluntario.id) {
        const resDatos = await fetch('/api/admin/personal', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: voluntarioId,
            nombre: selectedVoluntario.nombre,
            apellidos: selectedVoluntario.apellidos,
            email: selectedVoluntario.email,
            telefono: selectedVoluntario.telefono,
            numeroVoluntario: selectedVoluntario.numeroVoluntario,
            servicioId: fichaData.servicioId || null,
            permisosExtra: fichaData.permisosExtra || [],
            accion: 'datos'
          })
        });
        const dataDatos = await resDatos.json();
        if (!resDatos.ok) {
          alert('Error al actualizar datos: ' + (dataDatos.error || 'Error desconocido'));
          return;
        }
      }
      const res = await fetch(`/api/admin/personal/${voluntarioId}/ficha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fichaData)
      });
      const data = await res.json();

      if (data.success) {
        // Si el rol ha cambiado, actualizarlo también
        if (selectedVoluntario.rolId && fichaData.rolId && selectedVoluntario.rolId !== fichaData.rolId) {
          await fetch('/api/admin/personal', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: voluntarioId,
              rolId: fichaData.rolId,
              accion: 'rol'
            })
          });
        }

        alert('✅ Ficha guardada correctamente');
        setShowFichaModal(false);
        setNuevoPassword('');
        cargarVoluntarios();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al guardar la ficha');
    }
  };

  const handleToggleActivo = async (voluntario: Voluntario) => {
    if (!confirm(`¿Estás seguro de ${voluntario.activo ? 'dar de baja' : 'reactivar'} a ${voluntario.nombre}?`)) return;
    try {
      const res = await fetch('/api/admin/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voluntario.id, activo: !voluntario.activo })
      });
      const data = await res.json();
      if (data.success) {
        cargarVoluntarios();
      }
    } catch (error) {
      alert('Error al actualizar estado');
    }
  };

  const handleGuardarMovimientoCaja = async () => {
    if (!nuevoMovimiento.concepto || !nuevoMovimiento.importe) {
      alert('Concepto e importe son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/admin/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoMovimiento)
      });
      const data = await res.json();
      if (data.success) {
        setShowNuevoMovimiento(false);
        setNuevoMovimiento({ tipo: 'entrada', concepto: '', descripcion: '', importe: 0, categoria: '', adjuntoUrl: '' });
        cargarMovimientosCaja();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al guardar movimiento');
    }
  };

  const handleActualizarMovimientoCaja = async () => {
    if (!movimientoEditando || !movimientoEditando.concepto || !movimientoEditando.importe) {
      alert('Concepto e importe son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/admin/caja', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movimientoEditando)
      });
      const data = await res.json();
      if (data.success) {
        setShowEditarMovimiento(false);
        setMovimientoEditando(null);
        cargarMovimientosCaja();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al actualizar movimiento');
    }
  };

  const handleAbrirEdicion = (movimiento: MovimientoCaja) => {
    setMovimientoEditando({ ...movimiento });
    setShowEditarMovimiento(true);
  };

  const handleEliminarMovimientoCaja = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) return;
    try {
      const res = await fetch('/api/admin/caja', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        cargarMovimientosCaja();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al eliminar movimiento');
    }
  };

  const generarInformeTicket = (ticket: any) => {
    const hoy = new Date()
    const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    const diaStr = hoy.getDate().toString().padStart(2, '0')
    const mesStr = (hoy.getMonth() + 1).toString().padStart(2, '0')
    const anioStr = hoy.getFullYear().toString()
    const refInvertida = `${anioStr}${mesStr}${diaStr}`.split('').reverse().join('')
    const fechaTicket = new Date(ticket.fecha).toLocaleDateString('es-ES')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe SOLRED</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9.5pt; color: #000; }
  .page { width:210mm; min-height:297mm; padding:15mm 20mm 20mm 20mm; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #003366; padding-bottom:10px; margin-bottom:14px; }
  .header img { height:52px; object-fit:contain; }
  .header-right { text-align:right; }
  .header-right img { height:52px; }
  .header-right .sub { font-size:7pt; color:#555; margin-top:3px; }
  .dest { margin-bottom:14px; line-height:1.8; }
  .ref { margin-bottom:10px; line-height:1.8; font-weight:bold; font-size:9pt; }
  hr { border:none; border-top:1px solid #bbb; margin:10px 0; }
  p { margin-bottom:8px; line-height:1.6; text-align:justify; }
  table { width:100%; border-collapse:collapse; margin:10px 0 14px; font-size:8.5pt; }
  thead tr { background:#003366; color:#fff; }
  thead th { padding:5px 8px; text-align:left; text-transform:uppercase; font-size:8pt; }
  tbody tr:nth-child(even) { background:#f5f5f5; }
  tbody td { padding:5px 8px; border-bottom:1px solid #e0e0e0; }
  .ticket-img-section { margin-top:14px; }
  .ticket-img-section h4 { font-size:9pt; color:#003366; border-bottom:1px solid #003366; padding-bottom:3px; margin-bottom:8px; }
  .ticket-img-section img { max-width:160mm; max-height:130mm; display:block; margin:0 auto; border:1px solid #ccc; }
  .firma { margin-top:20px; line-height:1.8; }
  .firma .nombre { font-weight:bold; font-size:10pt; }
  .footer { margin-top:20px; border-top:1px solid #ddd; padding-top:5px; text-align:center; font-size:7pt; color:#888; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="/images/logo-ayuntamiento-bormujos.png" alt="Ayuntamiento de Bormujos" />
    <div class="header-right">
      <img src="/images/logo-proteccion-civil-bormujos.png" alt="Protección Civil Bormujos" />
      <div class="sub">Servicio Local de Protección Civil<br>Excmo. Ayto. De Bormujos (Sevilla)</div>
    </div>
  </div>

  <div class="dest">
    <div>A/A: D.Luis Alberto Paniagua López</div>
    <div>Delegado de Economía y Hacienda</div>
    <br>
    <div>C/C: Maria Irene Martínez Criado</div>
    <div>Dpto. de intervención</div>
  </div>

  <div class="ref">
    <div>REF: ${refInvertida} Informe tarjeta SOLRED 9724990031420621</div>
    <div>ASUNTO: Informe sobre el uso de la tarjeta SOLRED asignada al Servicio de Protección Civil.</div>
  </div>

  <hr>

  <p>Por medio del presente Emilio Simón Gómez en calidad de Jefe de Protección Civil y Emergencias del Ayuntamiento de Bormujos informa para que surta los efectos oportunos.</p>
  <p>Los vehículos no requieren del reportaje con esta tarjeta ya que todos son de Gasoil y su reportaje se realiza en la nave de obras y servicios con el correspondiente control por parte del personal de las propias instalaciones.</p>
  <p>Los gastos cargados a esta tarjeta corresponden al gasto en gasolina que está destinada a las herramientas mecánicas como motosierras, motobombas del VIR y grupos electrógenos.</p>
  <p>En relación al documento recibido aparecen los siguientes gastos de combustible (gasolina):</p>
  <p><strong>SOLRED 9724990031420621 Maquinaria Protección Civil</strong></p>

  <table>
    <thead><tr><th>DESTINO</th><th>FECHA</th><th>CONCEPTO</th><th>LITROS</th><th>IMPORTE SIN DESCUENTO</th></tr></thead>
    <tbody>
      <tr>
        <td>${ticket.destino || ''}</td>
        <td>${fechaTicket}</td>
        <td>${ticket.concepto || ''}</td>
        <td>${Number(ticket.litros).toFixed(2)}</td>
        <td>${Number(ticket.importeFinal).toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>

  <p>Se adjunta el ticket correspondiente al repostaje mencionado confirmando que es correcto en relación a la factura que nos ha remitido vía mail el Dpto. de Intervención.</p>

  ${ticket.ticketUrl ? `<div class="ticket-img-section"><h4>Ticket de combustible adjunto</h4><img src="${ticket.ticketUrl}" alt="Ticket" /></div>` : ''}

  <div class="firma">
    <p>Sin más que añadir se firma el presente para que surta los efectos que proceda.</p>
    <p>En Bormujos a ${fechaHoy}</p>
    <br>
    <div class="nombre">Emilio Simón Gómez</div>
    <div>Jefe de Protección Civil y Emergencias</div>
    <div>Ayuntamiento de Bormujos</div>
  </div>

  <div class="footer">
    Calle Maestro D. Francisco Rodríguez esq. Avda. Universidad de Salamanca &nbsp;|&nbsp;
    www.proteccioncivilbormujos.es | info.pcivil@bormujos.net
  </div>
</div>
<script>window.onload = () => { window.print() }</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=750')
    if (win) { win.document.write(html); win.document.close() }
  }

  const generarInformeCombustible = () => {
    const periodo = mesCombustible || new Date().toISOString().slice(0, 7)
    const [anio, mes] = periodo.split('-')
    const hoy = new Date()
    const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    const diaStr = hoy.getDate().toString().padStart(2, '0')
    const refNormal = `${anio}${mes}${diaStr}`
    const refInvertida = refNormal.split('').reverse().join('')

    import('jspdf').then(({ jsPDF }) => {
      const doc = new (jsPDF as any)({ format: 'a4', unit: 'mm' })
      const W = 210
      const margin = 20

      doc.setFillColor(0, 51, 102)
      doc.rect(0, 0, W, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PROTECCION CIVIL BORMUJOS', W - margin, 12, { align: 'right' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Servicio Local de Proteccion Civil', W - margin, 18, { align: 'right' })
      doc.text('Excmo. Ayto. De Bormujos (Sevilla)', W - margin, 23, { align: 'right' })

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      let y = 38
      doc.text('A/A: D.Luis Alberto Paniagua Lopez', margin, y)
      doc.text('Delegado de Economia y Hacienda', margin, y + 5)
      doc.text('C/C: Maria Irene Martinez Criado', margin, y + 12)
      doc.text('Dpto. de intervencion', margin, y + 17)

      y = 66
      doc.setFont('helvetica', 'bold')
      doc.text('REF: ' + refInvertida + ' Informe tarjeta SOLRED 9724990031420621', margin, y)
      doc.text('ASUNTO: Informe sobre el uso de la tarjeta SOLRED asignada al Servicio de Proteccion Civil.', margin, y + 7)

      y = 81
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, W - margin, y)

      y = 89
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const t1 = 'Por medio del presente Emilio Simon Gomez en calidad de Jefe de Proteccion Civil y Emergencias del Ayuntamiento de Bormujos informa para que surta los efectos oportunos.'
      const l1 = doc.splitTextToSize(t1, W - margin * 2)
      doc.text(l1, margin, y); y += l1.length * 5 + 4

      const t2 = 'Los vehiculos no requieren del reportaje con esta tarjeta ya que todos son de Gasoil y su reportaje se realiza en la nave de obras y servicios con el correspondiente control por parte del personal de las propias instalaciones.'
      const l2 = doc.splitTextToSize(t2, W - margin * 2)
      doc.text(l2, margin, y); y += l2.length * 5 + 4

      const t3 = 'Los gastos cargados a esta tarjeta corresponden al gasto en gasolina destinada a herramientas mecanicas como motosierras, motobombas del VIR y grupos electrogenos.'
      const l3 = doc.splitTextToSize(t3, W - margin * 2)
      doc.text(l3, margin, y); y += l3.length * 5 + 4

      doc.text('En relacion al documento recibido aparecen los siguientes gastos de combustible (gasolina):', margin, y)
      y += 8

      doc.setFillColor(0, 51, 102)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const cols = [40, 32, 42, 22, 34]
      const hdrs = ['DESTINO', 'FECHA', 'CONCEPTO', 'LITROS', 'IMPORTE']
      let x = margin + 2
      hdrs.forEach((h, i) => { doc.text(h, x, y + 5); x += cols[i] })
      y += 8

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      ticketsCombustible.forEach((t: any, idx: number) => {
        if (idx % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(margin, y, W - margin * 2, 7, 'F') }
        x = margin + 2
        const row = [
          t.destino || '',
          new Date(t.fecha).toLocaleDateString('es-ES'),
          t.concepto || '',
          Number(t.litros).toFixed(2),
          Number(t.importeFinal).toFixed(2) + ' EUR'
        ]
        row.forEach((val, i) => { doc.text(String(val), x, y + 5); x += cols[i] })
        y += 7
      })

      doc.setFillColor(220, 220, 220)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setFont('helvetica', 'bold')
      const total = ticketsCombustible.reduce((s: number, t: any) => s + Number(t.importeFinal), 0).toFixed(2)
      doc.text('TOTAL', margin + 2, y + 5)
      doc.text(total + ' EUR', margin + 2 + cols[0] + cols[1] + cols[2] + cols[3], y + 5)
      y += 14

      doc.setFont('helvetica', 'normal')
      const tadj = 'Se adjuntan los tickets correspondientes a los repostajes mencionados confirmando que son correctos en relacion a la factura remitida via mail por el Dpto. de Intervencion.'
      const ladj = doc.splitTextToSize(tadj, W - margin * 2)
      doc.text(ladj, margin, y); y += ladj.length * 5 + 10

      doc.text('Sin mas que anadir se firma el presente para que surta los efectos que proceda.', margin, y)
      y += 10
      doc.text('En Bormujos a ' + fechaHoy, margin, y)
      y += 16
      doc.setFont('helvetica', 'bold')
      doc.text('Emilio Simon Gomez', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text('Jefe de Proteccion Civil y Emergencias', margin, y + 5)
      doc.text('Ayuntamiento de Bormujos', margin, y + 10)

      doc.setFontSize(7)
      doc.setTextColor(130, 130, 130)
      doc.text('Calle Maestro D. Francisco Rodriguez esq. Avda. Universidad de Salamanca', W / 2, 285, { align: 'center' })
      doc.text('www.proteccioncivilbormujos.es | info.pcivil@bormujos.net', W / 2, 289, { align: 'center' })

      doc.save('Informe-SOLRED-' + periodo + '.pdf')
    })
  }

  const handleGuardarTicket = async () => {
    if (!nuevoTicket.fecha || !nuevoTicket.litros || !nuevoTicket.importeFinal) {
      alert('Fecha, litros e importe son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/admin/combustible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoTicket)
      });
      const data = await res.json();
      if (data.success) {
        setShowNuevoTicket(false);
        setNuevoTicket({
          fecha: '', hora: '', estacion: '', destino: 'MAQUINARIA', concepto: 'EFITEC 95',
          litros: 0, precioLitro: 0, importeFinal: 0, vehiculoDestino: '', notas: '', ticketUrl: ''
        });
        cargarTicketsCombustible();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al guardar ticket');
    }
  };

  const handleGuardarAspirante = async () => {
    if (!nuevoAspirante.nombre || !nuevoAspirante.apellidos || !nuevoAspirante.dni) {
      alert('Nombre, apellidos y DNI son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/admin/aspirantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoAspirante)
      });
      const data = await res.json();
      if (data.success) {
        setShowNuevoAspirante(false);
        setNuevoAspirante({ nombre: '', apellidos: '', dni: '', telefono: '', email: '' });
        cargarAspirantes();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al guardar aspirante');
    }
  };

  const handleActualizarAspirante = async (id: string, data: Aspirante) => {
    try {
      const res = await fetch('/api/admin/aspirantes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id })
      });
      const resData = await res.json();
      if (resData.success) {
        cargarAspirantes();
      } else {
        alert('Error: ' + resData.error);
      }
    } catch (error) {
      alert('Error al actualizar aspirante');
    }
  };

  const handleEliminarAspirante = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este aspirante?')) return;
    try {
      const res = await fetch('/api/admin/aspirantes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        cargarAspirantes();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al eliminar aspirante');
    }
  };

  const cargarAspirantes = async () => {
    try {
      const res = await fetch('/api/admin/aspirantes');
      const data = await res.json();
      if (data.aspirantes) setAspirantes(data.aspirantes);
    } catch (error) {
      /* error silenciado */;
    }
  };

  const handleGuardarPoliza = async () => {
    const polizaData = polizaEditando || nuevaPoliza;
    if (!polizaData.tipo || !polizaData.compania || !polizaData.fechaInicio || !polizaData.fechaVencimiento) {
      alert('Tipo, compañía y fechas son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/admin/polizas', {
        method: polizaEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(polizaEditando ? { id: polizaEditando.id, ...polizaData } : polizaData)
      });
      const data = await res.json();
      if (data.success) {
        setShowNuevaPoliza(false);
        setPolizaEditando(null);
        setNuevaPoliza({
          tipo: 'vehiculo', numero: '', compania: '', descripcion: '',
          fechaInicio: '', fechaVencimiento: '', primaAnual: 0, vehiculoId: '', notas: ''
        });
        cargarPolizas();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al guardar póliza');
    }
  };

  const handleEliminarPoliza = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta póliza?')) return;
    try {
      const res = await fetch(`/api/admin/polizas?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        cargarPolizas();
      }
    } catch (error) {
      alert('Error al eliminar póliza');
    }
  };

  const cambiarSemana = (direccion: 'prev' | 'next') => {
    const fecha = new Date(semanaDisp);
    fecha.setDate(fecha.getDate() + (direccion === 'next' ? 7 : -7));
    setSemanaDisp(fecha.toISOString().split('T')[0]);
  };

  const toggleNoDisponible = async (id: string, noDisponible: boolean) => {
    try {
      const res = await fetch('/api/admin/disponibilidades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponibilidadId: id, noDisponible })
      });

      if (res.ok) {
        // Actualizar el estado local
        setDisponibilidades(prev =>
          prev.map(d =>
            d.id === id ? { ...d, noDisponible } : d
          )
        );
      }
    } catch (error) {
      /* error silenciado */;
    }
  };

  const formatearSemana = (fecha: string) => {
    const inicio = new Date(fecha);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    return `Del ${inicio.getDate()}/${inicio.getMonth() + 1}/${inicio.getFullYear()} al ${fin.getDate()}/${fin.getMonth() + 1}/${fin.getFullYear()}`;
  };

  const getDetallesFranjas = (detalles: any) => {
    if (!detalles || typeof detalles !== 'object') return '-';
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const franjas: string[] = [];
    dias.forEach(dia => {
      const turnos = detalles[dia] || [];
      if (turnos.length > 0) {
        const diaCorto = dia.charAt(0).toUpperCase() + dia.slice(1, 3);
        turnos.forEach((t: string) => {
          franjas.push(`${diaCorto}-${t === 'mañana' ? 'M' : 'T'}`);
        });
      }
    });
    return franjas.length > 0 ? franjas.join(', ') : '-';
  };

  const getEstadoPoliza = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Vigente' };
      case 'por_vencer':
        return { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, label: 'Por vencer' };
      case 'vencida':
        return { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Vencida' };
      default:
        return { color: 'bg-slate-100 text-slate-700', icon: AlertCircle, label: estado };
    }
  };

  // Filtrar voluntarios
  const voluntariosFiltrados = voluntarios.filter(v => {
    const term = searchTerm.toLowerCase();
    return v.numeroVoluntario?.toLowerCase().includes(term) ||
      v.nombre?.toLowerCase().includes(term) ||
      v.apellidos?.toLowerCase().includes(term);
  });

  // Agrupar voluntarios por área
  const voluntariosPorArea = AREAS_SERVICIO.map(area => ({
    ...area,
    voluntarios: voluntarios.filter(v => (v.fichaVoluntario?.areaAsignada === area.id || v.fichaVoluntario?.areaSecundaria === area.id) && v.activo)
  }));

  const sinArea = voluntarios.filter(v => !v.fichaVoluntario?.areaAsignada && v.activo);

  // Contar pólizas por vencer o vencidas
  const polizasAlerta = polizas.filter(p => p.estado === 'por_vencer' || p.estado === 'vencida').length;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administración de Personal</h1>
          <p className="text-slate-500 text-sm">Gestión del Registro de Voluntarios (FRI) y Disponibilidad.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {/* Exportar */ }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => {
              if (activeTab === 'personal') {
                setSelectedVoluntario({ id: '', numeroVoluntario: '', nombre: '', apellidos: '', email: '', telefono: '', activo: true, rolId: '', rol: { id: '', nombre: '' } } as Voluntario);
                setFichaData({ fechaAlta: new Date().toISOString().split('T')[0], localidad: '',  provincia: '', areaAsignada: '', categoria: 'VOLUNTARIO' });
                setModoNuevaFicha('existente');
                setNuevoPassword('');
                setShowFichaModal(true);
              }
              else if (activeTab === 'polizas') setShowNuevaPoliza(true);
              else if (activeTab === 'caja') setShowNuevoMovimiento(true);
              else if (activeTab === 'combustible') setShowNuevoTicket(true);
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">
              {activeTab === 'personal' ? 'Nueva Ficha' :
                activeTab === 'polizas' ? 'Nueva Póliza' :
                  activeTab === 'caja' ? 'Nuevo Movimiento' :
                    activeTab === 'combustible' ? 'Nuevo Ticket' : 'Nuevo'}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Selector móvil — visible solo en pantallas pequeñas */}
        <div className="sm:hidden border-b border-slate-200 bg-slate-50/50 p-3">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="personal">Listado Personal ({voluntarios.length})</option>
            <option value="disponibilidad">Gestión Disponibilidad</option>
            <option value="dietas">Control Dietas</option>
            <option value="caja">Caja Efectivo</option>
            <option value="combustible">Control Combustible</option>
            <option value="polizas">Pólizas Seguro{polizasAlerta > 0 ? ` (⚠️${polizasAlerta})` : ''}</option>
            <option value="areas">Asignación Áreas</option>
            <option value="aspirantes">Aspirantes</option>
          </select>
        </div>

        {/* Tabs horizontales — visibles solo en sm+ */}
        <div className="hidden sm:flex overflow-x-auto border-b border-slate-200 bg-slate-50/50">
          <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={Users} label="Listado Personal" count={voluntarios.length} />
          <TabButton active={activeTab === 'disponibilidad'} onClick={() => setActiveTab('disponibilidad')} icon={Calendar} label="Disponibilidad" />
          <TabButton active={activeTab === 'dietas'} onClick={() => setActiveTab('dietas')} icon={DollarSign} label="Dietas" />
          <TabButton active={activeTab === 'caja'} onClick={() => setActiveTab('caja')} icon={Wallet} label="Caja" />
          <TabButton active={activeTab === 'combustible'} onClick={() => setActiveTab('combustible')} icon={Fuel} label="Combustible" />
          <TabButton active={activeTab === 'polizas'} onClick={() => setActiveTab('polizas')} icon={Shield} label="Pólizas" alert={polizasAlerta > 0} />
          <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={Building2} label="Áreas" />
          <TabButton active={activeTab === 'aspirantes'} onClick={() => setActiveTab('aspirantes')} icon={UserPlus} label="Aspirantes" />
        </div>

        <div className="p-6">
          {/* ============================================ */}
          {/* TAB: LISTADO PERSONAL */}
          {/* ============================================ */}
          {activeTab === 'personal' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por indicativo, nombre..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={cargarVoluntarios}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors self-start"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Indicativo</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Voluntario</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase hidden sm:table-cell">Área Asignada</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Teléfono</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voluntariosFiltrados.map(v => (
                        <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{v.numeroVoluntario || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                {v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-700">{v.nombre} {v.apellidos}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <div>
                              <span className="font-medium text-slate-700">
                                {AREAS_SERVICIO.find(a => a.id === v.fichaVoluntario?.areaAsignada)?.nombre || 'Sin asignar'}
                              </span>
                              <p className="text-xs text-slate-500">{v.rol?.nombre}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 hidden md:table-cell">{v.telefono || '-'}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleActivo(v.id, !v.activo)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${v.activo
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              title="Click para cambiar estado"
                            >
                              {v.activo ? 'ACTIVO' : 'BAJA'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditarFicha(v)}
                                className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1 px-3 py-1.5 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                VER FICHA <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleActivo(v)}
                                className={`p-1.5 rounded-lg transition-colors ${v.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                                title={v.activo ? 'Dar de baja' : 'Reactivar'}
                              >
                                {v.activo ? <XCircle size={18} /> : <CheckCircle size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {voluntariosFiltrados.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No se encontraron voluntarios
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: GESTIÓN DISPONIBILIDAD */}
          {/* ============================================ */}
          {activeTab === 'disponibilidad' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Visualizando semana:</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => cambiarSemana('prev')} className="p-2 hover:bg-white rounded-lg transition-colors">
                    <ChevronLeft size={18} className="text-slate-500" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 px-2 sm:px-4 min-w-[150px] sm:min-w-[220px] text-center">
                    {formatearSemana(semanaDisp)}
                  </span>
                  <button onClick={() => cambiarSemana('next')} className="p-2 hover:bg-white rounded-lg transition-colors">
                    <ChevronRight size={18} className="text-slate-500" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : disponibilidades.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No se han recibido disponibilidades para la semana del {new Date(semanaDisp).toLocaleDateString('es-ES')}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Indicativo / Nombre</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Detalle Días/Franjas</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Turnos Deseados</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Dobla</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Comentarios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disponibilidades.map(d => (
                        <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-sm">
                                {d.usuario.nombre?.charAt(0)}{d.usuario.apellidos?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">{d.usuario.numeroVoluntario}</span>
                                <p className="text-sm text-slate-600">{d.usuario.nombre} {d.usuario.apellidos}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleNoDisponible(d.id, !d.noDisponible)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${d.noDisponible
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              title="Click para cambiar estado"
                            >
                              {d.noDisponible ? 'NO DISPONIBLE' : 'DISPONIBLE'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 max-w-[300px]">
                            {d.noDisponible ? '-' : getDetallesFranjas(d.detalles)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {d.noDisponible ? '-' : d.turnosDeseados}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {d.noDisponible ? '-' : (
                              d.puedeDobleturno ? (
                                <CheckCircle size={18} className="text-green-600 mx-auto" />
                              ) : (
                                <span className="text-slate-400">-</span>
                              )
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500 max-w-[200px] truncate">
                            {d.notas || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: CONTROL DIETAS */}
          {/* ============================================ */}
          {activeTab === 'dietas' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodo</label>
                    <input
                      type="month"
                      value={mesDietas}
                      onChange={e => setMesDietas(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowNuevoInforme(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <FileText size={18} /> <span className="hidden sm:inline">Presentar Informe</span>
                </button>
              </div>

              {/* Resumen */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-6">
                <h3 className="text-blue-100 text-sm font-medium mb-4">RESUMEN DEL PERIODO</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div>
                    <p className="text-blue-100 text-sm">Total Días</p>
                    <p className="text-3xl font-bold">{resumenDietas.reduce((sum, r) => sum + (r.dias || 0), 0)}</p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Subtotal Dietas</p>
                    <p className="text-3xl font-bold">{resumenDietas.reduce((sum, r) => sum + (r.subtotalDietas || 0), 0).toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Subtotal KM</p>
                    <p className="text-3xl font-bold">{resumenDietas.reduce((sum, r) => sum + (r.subtotalKm || 0), 0).toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Total a Percibir</p>
                    <p className="text-3xl font-bold">{resumenDietas.reduce((sum, r) => sum + (r.totalDietas || 0), 0).toFixed(2)} €</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : resumenDietas.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay registros de dietas para este periodo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-600">IND</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-600">NOMBRE</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-600">APELLIDOS</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-600">DÍAS</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-600">IMPORTE/DÍA</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-600">SUBTOTAL DIETAS</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-600">SUBTOTAL KM</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 bg-blue-50">TOTAL DIETAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenDietas.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{r.indicativo}</td>
                          <td className="py-3 px-4 text-slate-700">{r.nombre}</td>
                          <td className="py-3 px-4 text-slate-700">{r.apellidos}</td>
                          <td className="py-3 px-4 text-center font-medium">{r.dias}</td>
                          <td className="py-3 px-4 text-right text-slate-600">29,45 €</td>
                          <td className="py-3 px-4 text-right text-slate-700">{r.subtotalDietas?.toFixed(2)} €</td>
                          <td className="py-3 px-4 text-right text-slate-700">{r.subtotalKm?.toFixed(2)} €</td>
                          <td className="py-3 px-4 text-right font-bold text-blue-600 bg-blue-50">{r.totalDietas?.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* INFORMES PRESENTADOS */}
              {informesDietas.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Informes presentados este año</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-2 px-4 text-xs font-bold text-slate-500">MES</th>
                          <th className="text-left py-2 px-4 text-xs font-bold text-slate-500">FECHA PRESENTACIÓN</th>
                          <th className="text-left py-2 px-4 text-xs font-bold text-slate-500">FIRMADO POR</th>
                          <th className="text-center py-2 px-4 text-xs font-bold text-slate-500">VOLUNTARIOS</th>
                          <th className="text-right py-2 px-4 text-xs font-bold text-slate-500">TOTAL</th>
                          <th className="text-left py-2 px-4 text-xs font-bold text-slate-500">PARTIDA</th>
                          <th className="text-center py-2 px-4 text-xs font-bold text-slate-500">ESTADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {informesDietas.map((inf: any) => (
                          <tr key={inf.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-4 font-mono font-medium text-slate-800">{inf.mes}</td>
                            <td className="py-2 px-4 text-slate-600">{new Date(inf.fechaPresentacion).toLocaleDateString('es-ES')}</td>
                            <td className="py-2 px-4 text-slate-600">{inf.firmadoPor || '—'}</td>
                            <td className="py-2 px-4 text-center">{inf.numVoluntarios}</td>
                            <td className="py-2 px-4 text-right font-bold text-orange-700">{Number(inf.totalDietas).toFixed(2)} €</td>
                            <td className="py-2 px-4 text-slate-500 text-xs">{inf.partida ? inf.partida.codigo + ' — ' + inf.partida.denominacion : '—'}</td>
                            <td className="py-2 px-4 text-center">
                              <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (inf.estado === 'pagado' ? 'bg-green-100 text-green-700' : inf.estado === 'anulado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{inf.estado}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* MODAL PRESENTAR INFORME DIETAS */}
          {showNuevoInforme && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-semibold">Presentar Informe de Dietas</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Mes: {mesDietas || 'Sin seleccionar'}</p>
                  </div>
                  <button onClick={() => setShowNuevoInforme(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                </div>
                <form onSubmit={async e => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const totalDietas = resumenDietas.reduce((s, r) => s + (r.totalDietas || 0), 0);
                  const subtotalDietas = resumenDietas.reduce((s, r) => s + (r.subtotalDietas || 0), 0);
                  const subtotalKm = resumenDietas.reduce((s, r) => s + (r.subtotalKm || 0), 0);
                  const numDias = resumenDietas.reduce((s, r) => s + (r.dias || 0), 0);
                  try {
                    const res = await fetch('/api/admin/dietas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'informe', mes: mesDietas, fechaPresentacion: f.get('fechaPresentacion'), totalDietas, subtotalDietas, subtotalKm, numVoluntarios: resumenDietas.length, numDias, partidaId: f.get('partidaId') || null, notas: f.get('notas'), firmadoPor: f.get('firmadoPor') }) });
                    const data = await res.json();
                    if (data.error) { alert(data.error); return; }
                    setShowNuevoInforme(false);
                    cargarDietas();
                  } catch(err) { console.error(err); }
                }} className="p-6 space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-xs text-orange-600 font-medium">Subtotal Dietas</p><p className="text-lg font-bold text-orange-800">{resumenDietas.reduce((s,r) => s+(r.subtotalDietas||0),0).toFixed(2)} €</p></div>
                    <div><p className="text-xs text-orange-600 font-medium">Subtotal KM</p><p className="text-lg font-bold text-orange-800">{resumenDietas.reduce((s,r) => s+(r.subtotalKm||0),0).toFixed(2)} €</p></div>
                    <div><p className="text-xs text-orange-600 font-medium">TOTAL A PAGAR</p><p className="text-xl font-bold text-orange-900">{resumenDietas.reduce((s,r) => s+(r.totalDietas||0),0).toFixed(2)} €</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha de presentación *</label><input name="fechaPresentacion" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Firmado por</label><input name="firmadoPor" type="text" placeholder="Coordinador/a" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Partida presupuestaria</label>
                    <select name="partidaId" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                      <option value="">Sin vincular a partida</option>
                      {partidasDietas.map((p: any) => <option key={p.id} value={p.id}>{p.codigo} — {p.denominacion}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Notas</label><textarea name="notas" rows={2} placeholder="Observaciones para intervención..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" /></div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowNuevoInforme(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Registrar Informe</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* ============================================ */}
          {/* TAB: CAJA EFECTIVO */}
          {/* ============================================ */}
          {activeTab === 'caja' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl px-6 py-4 text-white">
                  <p className="text-green-100 text-sm">Saldo Actual</p>
                  <p className="text-3xl font-bold">{saldoActual.toFixed(2)} €</p>
                </div>
                <button
                  onClick={() => setShowNuevoMovimiento(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors self-start sm:self-auto"
                >
                  <Plus size={18} /> Nuevo Movimiento
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : movimientosCaja.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay movimientos registrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Concepto</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase hidden sm:table-cell">Descripción</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Importe</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Saldo</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Adjunto</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosCaja.map(m => (
                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">{new Date(m.fecha).toLocaleDateString('es-ES')}</td>
                          <td className="py-3 px-4">
                            <span className={`flex items-center gap-1 text-sm font-medium ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                              {m.tipo === 'entrada' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                              {m.tipo.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">{m.concepto}</td>
                          <td className="py-3 px-4 text-sm text-slate-500 hidden sm:table-cell">{m.descripcion || '-'}</td>
                          <td className={`py-3 px-4 text-right font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {m.tipo === 'entrada' ? '+' : '-'}{Number(m.importe).toFixed(2)} €
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">{Number(m.saldoPosterior).toFixed(2)} €</td>
                          <td className="py-3 px-4 text-center">
                            {m.adjuntoUrl ? (
                              <a href={m.adjuntoUrl} target="_blank" className="text-orange-600 hover:text-orange-700">
                                <FileText size={18} />
                              </a>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleAbrirEdicion(m)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors" title="Editar">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleEliminarMovimientoCaja(m.id)} className="p-1.5 bg-slate-100 text-red-600 rounded hover:bg-red-100 transition-colors" title="Eliminar">
                                <Trash2 size={14} />
                              </button>
                              <DocumentUploader
                                label="Ticket"
                                apiEndpoint="/api/admin/caja/drive-upload"
                                onUpload={async (url) => {
                                  // Actualizar el movimiento con el nuevo URL en la base de datos
                                  try {
                                    const res = await fetch('/api/admin/caja', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        id: m.id,
                                        tipo: m.tipo,
                                        concepto: m.concepto,
                                        descripcion: m.descripcion,
                                        importe: m.importe,
                                        categoria: m.categoria,
                                        fecha: m.fecha,
                                        adjuntoUrl: url
                                      })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      cargarMovimientosCaja();
                                    } else {
                                      alert('Error al guardar adjunto: ' + data.error);
                                    }
                                  } catch (error) {
                                    alert('Error al guardar adjunto');
                                  }
                                }}
                                currentUrl={m.adjuntoUrl}
                                folder="Tickets Caja"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: ASPIRANTES */}
          {/* ============================================ */}
          {activeTab === 'aspirantes' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Gestión de Aspirantes</h3>
                  <p className="text-sm text-slate-500">{aspirantes.length} aspirantes registrados</p>
                </div>
                <button
                  onClick={() => { setAspiranteEditando(null); setShowNuevoAspirante(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus size={18} /> Nuevo Aspirante
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : aspirantes.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay aspirantes registrados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aspirantes.map(a => (
                    <div key={a.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Fila principal */}
                      <div
                        className={`flex items-start sm:items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors ${aspiranteExpandido === a.id ? 'bg-slate-50' : ''}`}
                        onClick={() => {
                          if (aspiranteExpandido === a.id) {
                            setAspiranteExpandido(null);
                            setAspiranteEditandoTemp(null);
                          } else {
                            setAspiranteExpandido(a.id);
                            setAspiranteEditandoTemp({ ...a });
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          {/* Móvil: apilado */}
                          <div className="sm:hidden">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-slate-800 text-sm truncate">{a.nombre} {a.apellidos}</span>
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                a.estado === 'entrevistado' ? 'bg-blue-100 text-blue-800' :
                                  a.estado === 'aceptado' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              <p>{new Date(a.fecha).toLocaleDateString('es-ES')} · {a.telefono}</p>
                              <p className="truncate">{a.email}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setAspiranteEditando(a); setShowNuevoAspirante(true); }}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                title="Editar"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEliminarAspirante(a.id); }}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {/* Desktop: grid 7 columnas */}
                          <div className="hidden sm:grid grid-cols-7 gap-4 items-center">
                            <div className="text-sm text-slate-600">{new Date(a.fecha).toLocaleDateString('es-ES')}</div>
                            <div className="font-medium text-slate-700">{a.nombre} {a.apellidos}</div>
                            <div className="text-sm text-slate-600">{a.dni}</div>
                            <div className="text-sm text-slate-600">{a.telefono}</div>
                            <div className="text-sm text-slate-600 truncate">{a.email}</div>
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                a.estado === 'entrevistado' ? 'bg-blue-100 text-blue-800' :
                                  a.estado === 'aceptado' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setAspiranteEditando(a); setShowNuevoAspirante(true); }}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                title="Editar"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEliminarAspirante(a.id); }}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          size={20}
                          className={`ml-4 mt-1 sm:mt-0 text-slate-400 transition-transform flex-shrink-0 ${aspiranteExpandido === a.id ? 'rotate-180' : ''}`}
                        />
                      </div>

                      {/* Contenido expandido */}
                      {aspiranteExpandido === a.id && (
                        <div className="bg-slate-50 p-6 border-t border-slate-200">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sección 1: Entrevista */}
                            <div className="bg-white rounded-xl p-5 border border-slate-200">
                              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-orange-500" />
                                Información de Entrevista
                              </h4>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Entrevista</label>
                                  <input
                                    type="date"
                                    value={aspiranteEditandoTemp?.fechaEntrevista ? new Date(aspiranteEditandoTemp.fechaEntrevista).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, fechaEntrevista: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={aspiranteEditandoTemp?.confirmacionAsistencia}
                                      onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, confirmacionAsistencia: e.target.checked })}
                                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Confirmación Asistencia</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={aspiranteEditandoTemp?.asistioEntrevista}
                                      onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, asistioEntrevista: e.target.checked })}
                                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Asistió a Entrevista</span>
                                  </label>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Evaluación Entrevista</label>
                                  <textarea
                                    value={aspiranteEditandoTemp?.evaluacionEntrevista || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, evaluacionEntrevista: e.target.value })}
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Evaluación de la entrevista..."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Sección 2: Datos Personales */}
                            <div className="bg-white rounded-xl p-5 border border-slate-200">
                              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <UserCheck size={18} className="text-orange-500" />
                                Datos Personales
                              </h4>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Carné de Conducir</label>
                                  <select
                                    value={aspiranteEditandoTemp?.carneConducir || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, carneConducir: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                  >
                                    <option value="">Sin especificar</option>
                                    <option value="No">No</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="Otros">Otros</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formación Académica</label>
                                  <textarea
                                    value={aspiranteEditandoTemp?.formacion || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, formacion: e.target.value })}
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Estudios realizados..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ocupación Actual</label>
                                  <input
                                    type="text"
                                    value={aspiranteEditandoTemp?.ocupacionActual || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, ocupacionActual: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Trabajo actual..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiempo Libre Disponible</label>
                                  <textarea
                                    value={aspiranteEditandoTemp?.tiempoLibre || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, tiempoLibre: e.target.value })}
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Disponibilidad horaria..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interés por el Servicio</label>
                                  <textarea
                                    value={aspiranteEditandoTemp?.interesServicio || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, interesServicio: e.target.value })}
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Motivos para incorporarse..."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Sección 3: Gestión */}
                            <div className="bg-white rounded-xl p-5 border border-slate-200 lg:col-span-2">
                              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <CheckCircle size={18} className="text-orange-500" />
                                Gestión
                              </h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                                  <select
                                    value={aspiranteEditandoTemp?.estado || ""}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, estado: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                  >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="entrevistado">Entrevistado</option>
                                    <option value="aceptado">Aceptado</option>
                                    <option value="rechazado">Rechazado</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                                  <textarea
                                    value={aspiranteEditandoTemp?.observaciones || ''}
                                    onChange={(e) => setAspiranteEditandoTemp({ ...aspiranteEditandoTemp, observaciones: e.target.value })}
                                    rows={4}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Notas internas..."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="mt-6 flex justify-end gap-3 px-6">
                              <button
                                type="button"
                                onClick={() => {
                                  setAspiranteExpandido(null);
                                  setAspiranteEditandoTemp(null);
                                }}
                                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (aspiranteEditandoTemp) {
                                    handleActualizarAspirante(aspiranteEditandoTemp.id, aspiranteEditandoTemp);
                                    setAspiranteExpandido(null);
                                    setAspiranteEditandoTemp(null);
                                  }
                                }}
                                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                              >
                                Guardar Cambios
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: CONTROL COMBUSTIBLE */}
          {/* ============================================ */}
          {activeTab === 'combustible' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodo</label>
                    <input
                      type="month"
                      value={mesCombustible}
                      onChange={e => setMesCombustible(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <div className="bg-purple-100 rounded-xl px-4 py-3">
                    <p className="text-purple-600 text-xs font-bold">Total Mes</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {ticketsCombustible.reduce((sum, t) => sum + Number(t.importeFinal), 0).toFixed(2)} €
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={generarInformeCombustible} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                    <Printer size={18} /> <span className="hidden sm:inline">Generar Informe</span>
                  </button>
                  <button
                    onClick={() => setShowNuevoTicket(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Plus size={18} /> <span className="hidden sm:inline">Nuevo Ticket</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : ticketsCombustible.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Fuel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay tickets registrados para este periodo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Destino</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Concepto</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Litros</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">€/L</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Importe</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Ticket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketsCombustible.map(t => (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">{new Date(t.fecha).toLocaleDateString('es-ES')}</td>
                          <td className="py-3 px-4 font-medium text-slate-700">{t.destino}</td>
                          <td className="py-3 px-4 text-slate-600">{t.concepto}</td>
                          <td className="py-3 px-4 text-right text-slate-700">{Number(t.litros).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{Number(t.precioLitro).toFixed(3)}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">{Number(t.importeFinal).toFixed(2)} €</td>
                          <td className="py-3 px-4 text-center">
                            {t.ticketUrl ? (
                              <button onClick={() => setTicketPreview(t.ticketUrl || null)} className="text-orange-500 hover:text-orange-700 transition-colors">
                                <Eye size={18} />
                              </button>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => generarInformeTicket(t)} className="text-slate-500 hover:text-orange-600 transition-colors" title="Generar informe">
                              <Printer size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: PÓLIZAS DE SEGURO */}
          {/* ============================================ */}
          {activeTab === 'polizas' && (
            <div>
              {/* Resumen de alertas */}
              {polizasAlerta > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <AlertTriangle className="text-yellow-600" size={24} />
                  <div>
                    <p className="font-medium text-yellow-800">Atención: {polizasAlerta} póliza(s) requieren revisión</p>
                    <p className="text-sm text-yellow-600">Hay pólizas vencidas o próximas a vencer</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h3 className="text-lg font-bold text-slate-800">Listado de Pólizas</h3>
                <button
                  onClick={() => setShowNuevaPoliza(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors self-start"
                >
                  <Plus size={18} /> Nueva Póliza
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : polizas.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay pólizas registradas.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {polizas.map(p => {
                    const estado = getEstadoPoliza(p.estado);
                    const tipoInfo = TIPOS_POLIZA.find(t => t.id === p.tipo);
                    const IconoTipo = tipoInfo?.icono || Shield;

                    return (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${p.estado === 'vigente' ? 'bg-green-100 text-green-600' :
                              p.estado === 'por_vencer' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                              <IconoTipo size={24} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-slate-800">{tipoInfo?.nombre || p.tipo}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${estado.color}`}>
                                  <estado.icon size={12} />
                                  {estado.label}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">{p.compania} {p.numero && `• Nº ${p.numero}`}</p>
                              {p.descripcion && <p className="text-xs text-slate-500 mt-1">{p.descripcion}</p>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Vencimiento</p>
                              <p className="font-bold text-slate-800">{new Date(p.fechaVencimiento).toLocaleDateString('es-ES')}</p>
                              {p.primaAnual && <p className="text-sm text-slate-600">{Number(p.primaAnual).toFixed(2)} €/año</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setPolizaEditando(p); setShowNuevaPoliza(true); }}
                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleEliminarPoliza(p.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: ASIGNACIÓN POR ÁREAS */}
          {/* ============================================ */}
          {/* TAB: ASIGNACIÓN POR ÁREAS (DRAG & DROP) */}
          {/* ============================================ */}
          {activeTab === 'areas' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={(event) => setActiveId(event.active.id as string)}
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Distribución por Áreas</h3>
                    <p className="text-sm text-slate-500">{voluntarios.length} voluntarios activos • {sinArea.length} sin área asignada</p>
                    <p className="text-xs text-orange-600 mt-1 font-medium bg-orange-50 inline-block px-2 py-1 rounded">
                      💡 Arrastra los voluntarios para cambiar su área asignada
                    </p>
                  </div>
                  <button
                    onClick={cargarVoluntarios}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors self-start"
                  >
                    <RefreshCw size={18} /> Actualizar
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                    {/* ZONA SIN ÁREA */}
                    <AreaDroppable id="sin-area" nombre="Sin Área Asignada" color="bg-slate-500" count={sinArea.length}>
                      <SortableContext items={sinArea.map(v => v.id)} strategy={rectSortingStrategy}>
                        {sinArea.map(v => (
                          <VoluntarioDraggable key={v.id} voluntario={v} />
                        ))}
                      </SortableContext>
                    </AreaDroppable>

                    {/* ÁREAS DE SERVICIO */}
                    {AREAS_SERVICIO.map(area => { // Excluir Administración si se desea, o mantenerla.
                      // Filter volunteers for this area
                      const areaVols = voluntarios.filter(v => (v.fichaVoluntario?.areaAsignada === area.id || v.fichaVoluntario?.areaSecundaria === area.id) && v.activo);
                      return (
                        <AreaDroppable key={area.id} id={area.id} nombre={area.nombre} color={area.color} count={areaVols.length}>
                          <SortableContext items={areaVols.map(v => v.id)} strategy={rectSortingStrategy}>
                            {areaVols.map(v => (
                              <VoluntarioDraggable key={v.id} voluntario={v} />
                            ))}
                          </SortableContext>
                        </AreaDroppable>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Overlay para mostrar el item arrastrándose */}
              <DragOverlay>
                {activeId ? (
                  <div className="bg-white shadow-xl p-2 rounded-lg border-2 border-orange-500 opacity-90 w-64 ring-4 ring-orange-200 pointer-events-none">
                    {(() => {
                      const v = voluntarios.find(vol => vol.id === activeId);
                      if (!v) return null;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{v.nombre} {v.apellidos}</p>
                            <p className="text-xs text-slate-500">{v.numeroVoluntario}</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : null}
              </DragOverlay>

            </DndContext>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* MODALES */}
      {/* ============================================ */}

      {/* Modal: Ficha FRI */}
      {showFichaModal && (
        <Modal title="Ficha de Registro Individual (FRI)" onClose={() => setShowFichaModal(false)} size="xl">
          <div className="space-y-6">
            {/* Header FRI */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-3xl font-bold">FRI</p>
                  <p className="text-slate-300">FICHA DE REGISTRO INDIVIDUAL</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold">PROTECCIÓN CIVIL</p>
                  <p className="text-2xl font-bold">BORMUJOS</p>
                </div>
              </div>
            </div>

            {/* Selector de modo — solo cuando es nueva ficha */}
            {!selectedVoluntario?.id && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <p className="text-xs font-bold text-slate-600 uppercase">Origen de los datos del voluntario</p>
                </div>
                <div className="p-4 space-y-3">
                  {/* Tabs de modo */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setModoNuevaFicha('existente'); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors ${modoNuevaFicha === 'existente' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                    >
                      Vincular usuario ya registrado
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModoNuevaFicha('nuevo'); setSelectedVoluntario(prev => ({ ...prev!, id: '' })); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors ${modoNuevaFicha === 'nuevo' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                    >
                      Crear nuevo usuario
                    </button>
                  </div>

                  {/* Modo: vincular existente */}
                  {modoNuevaFicha === 'existente' && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Selecciona el usuario ya registrado en Configuración → Roles y Permisos al que quieres asignar esta ficha:</p>
                      <select
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500"
                        value={selectedVoluntario?.id || ''}
                        onChange={(e) => {
                          const uid = e.target.value;
                          const vol = voluntarios.find(v => v.id === uid);
                          if (vol) {
                            setSelectedVoluntario(vol);
                            // Si ya tiene ficha, cargar todos sus datos
                            if (vol.fichaVoluntario) {
                              setFichaData({
                                ...vol.fichaVoluntario,
                                rolId: vol.rolId || '',
                              });
                            } else {
                              setFichaData({
                                rolId: vol.rolId || '',
                                fechaAlta: new Date().toISOString().split('T')[0],
                                localidad: fichaData?.localidad || '',
                                provincia: fichaData?.provincia || '',
                              });
                            }
                          }
                        }}
                      >
                        <option value="">-- Seleccionar usuario existente --</option>
                        {voluntarios
                          .map(v => (
                            <option key={v.id} value={v.id}>
                              {v.numeroVoluntario ? `${v.numeroVoluntario} — ` : ''}{v.nombre} {v.apellidos} ({v.email}){v.fichaVoluntario ? ' · Ficha existente' : ''}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-slate-400 mt-1">Los usuarios marcados con "Ficha existente" ya tienen datos registrados que se cargarán para edición.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Indicativos y fechas */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indicativo 1</label>
                <input
                  type="text"
                  value={selectedVoluntario?.numeroVoluntario || ''}
                  onChange={e => setSelectedVoluntario({ ...selectedVoluntario!, numeroVoluntario: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indicativo 2</label>
                <input type="text" value={fichaData.indicativo2 || ''} onChange={e => setFichaData({ ...fichaData, indicativo2: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Alta</label>
                <input type="date" value={fichaData.fechaAlta?.split('T')[0] || ''} onChange={e => setFichaData({ ...fichaData, fechaAlta: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Baja</label>
                <input type="date" value={fichaData.fechaBaja?.split('T')[0] || ''} onChange={e => setFichaData({ ...fichaData, fechaBaja: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>

            {/* Datos personales */}
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  value={selectedVoluntario?.nombre || ''}
                  onChange={e => setSelectedVoluntario({ ...selectedVoluntario!, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellidos</label>
                <input
                  type="text"
                  value={selectedVoluntario?.apellidos || ''}
                  onChange={e => setSelectedVoluntario({ ...selectedVoluntario!, apellidos: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Edad</label>
                <input
                  type="number"
                  value={fichaData.fechaNacimiento ? (() => {
                    const hoy = new Date();
                    const nacimiento = new Date(fichaData.fechaNacimiento);
                    let edad = hoy.getFullYear() - nacimiento.getFullYear();
                    const mes = hoy.getMonth() - nacimiento.getMonth();
                    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
                      edad--;
                    }
                    return edad;
                  })() : ''}
                  disabled
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-100 text-sm font-bold text-slate-600"
                  placeholder="Automático"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sexo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFichaData({ ...fichaData, sexo: 'H' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${fichaData.sexo === 'H' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>H</button>
                  <button type="button" onClick={() => setFichaData({ ...fichaData, sexo: 'M' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${fichaData.sexo === 'M' ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-600'}`}>M</button>
                </div>
              </div>
            </div>

            {/* Fecha nacimiento */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-bold text-amber-700 uppercase mb-2">Datos Internos (Para cálculo):</p>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Nacimiento</label>
                  <input type="date" value={fichaData.fechaNacimiento?.split('T')[0] || ''} onChange={e => setFichaData({ ...fichaData, fechaNacimiento: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="grid grid-cols-7 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domicilio</label>
                <input type="text" value={fichaData.domicilio || ''} onChange={e => setFichaData({ ...fichaData, domicilio: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº</label>
                <input type="text" value={fichaData.numero || ''} onChange={e => setFichaData({ ...fichaData, numero: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Blq</label>
                <input type="text" value={fichaData.bloque || ''} onChange={e => setFichaData({ ...fichaData, bloque: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Piso</label>
                <input type="text" value={fichaData.piso || ''} onChange={e => setFichaData({ ...fichaData, piso: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Puerta</label>
                <input type="text" value={fichaData.puerta || ''} onChange={e => setFichaData({ ...fichaData, puerta: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CP</label>
                <input type="text" value={fichaData.codigoPostal || ''} onChange={e => setFichaData({ ...fichaData, codigoPostal: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localidad</label>
                <input type="text" value={fichaData.localidad || ''} onChange={e => setFichaData({ ...fichaData, localidad: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Provincia</label>
                <input type="text" value={fichaData.provincia || ''} onChange={e => setFichaData({ ...fichaData, provincia: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI/NIE</label>
                <input type="text" value={fichaData.dniNie || ''} onChange={e => setFichaData({ ...fichaData, dniNie: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                <input type="text" value={selectedVoluntario?.telefono || ''} onChange={e => setSelectedVoluntario(prev => prev ? { ...prev, telefono: e.target.value } : prev)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Km Desplazamiento (ida)</label>
                <input type="number" step="0.1" min="0" value={fichaData.kmDesplazamiento || 0} onChange={e => setFichaData({ ...fichaData, kmDesplazamiento: parseFloat(e.target.value)||0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                <p className="text-xs text-slate-400 mt-1">Km desde domicilio al parque (se multiplica ×2)</p>
              </div>
            </div>

            {/* Acceso al sistema (solo nueva ficha en modo nuevo) */}
            {!selectedVoluntario?.id && modoNuevaFicha === 'nuevo' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-bold text-blue-700 uppercase mb-3">Acceso al Sistema — obligatorio para nuevo voluntario</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                    <input
                      type="email"
                      value={selectedVoluntario?.email || ''}
                      onChange={e => setSelectedVoluntario({ ...selectedVoluntario!, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña inicial *</label>
                    <input
                      type="password"
                      value={nuevoPassword}
                      onChange={e => setNuevoPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Servicio *</label>
                    <select
                      value={fichaData.servicioId || ''}
                      onChange={e => setFichaData({ ...fichaData, servicioId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                    >
                      <option value="">-- Seleccionar servicio --</option>
                      {servicios.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                      {servicios.length === 0 && (
                        <option value="default">Protección Civil Bormujos</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Área, rol y categoría */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol</label>
                <select
                  value={fichaData.rolId || selectedVoluntario?.rolId || ''}
                  onChange={e => setFichaData({ ...fichaData, rolId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Área Asignada</label>
                <select value={fichaData.areaAsignada || ''} onChange={e => setFichaData({ ...fichaData, areaAsignada: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="">Seleccionar...</option>
                  {AREAS_SERVICIO.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Área Secundaria</label>
                <select value={fichaData.areaSecundaria || ''} onChange={e => setFichaData({ ...fichaData, areaSecundaria: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="">Ninguna</option>
                  {AREAS_SERVICIO.filter(a => a.id !== fichaData.areaAsignada).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                <select
                  value={fichaData.enPracticas ? 'EN_PRACTICAS' : (fichaData.categoria || 'VOLUNTARIO')}
                  onChange={e => {
                    const val = e.target.value
                    if (val === 'EN_PRACTICAS') {
                      setFichaData({ ...fichaData, categoria: 'VOLUNTARIO EN PRÁCTICAS', enPracticas: true, fechaInicioPracticas: fichaData.fechaInicioPracticas || new Date().toISOString().split('T')[0] })
                    } else {
                      setFichaData({ ...fichaData, categoria: val, enPracticas: false })
                    }
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="VOLUNTARIO">Voluntario</option>
                  <option value="EN_PRACTICAS">Voluntario en Prácticas</option>
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="JEFE_SERVICIO">Jefe de Servicio</option>
                </select>
              </div>
              {fichaData.enPracticas && (
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span className="text-xs font-bold text-amber-700 uppercase">Periodo de Prácticas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha inicio prácticas</label>
                      <input
                        type="date"
                        value={fichaData.fechaInicioPracticas?.split('T')[0] || ''}
                        onChange={e => setFichaData({ ...fichaData, fechaInicioPracticas: e.target.value })}
                        className="w-full border border-amber-200 rounded-lg p-2.5 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turnos realizados</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={fichaData.turnosPracticasRealizados ?? 0}
                          onChange={e => setFichaData({ ...fichaData, turnosPracticasRealizados: parseInt(e.target.value) || 0 })}
                          className="w-full border border-amber-200 rounded-lg p-2.5 text-sm bg-white"
                        />
                        <span className="text-xs text-amber-600 font-bold whitespace-nowrap">/ 15</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((fichaData.turnosPracticasRealizados ?? 0) / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={selectedVoluntario?.email || ''}
                  onChange={e => setSelectedVoluntario({ ...selectedVoluntario!, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
            </div>

            {/* Permisos extra */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Permisos adicionales</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PERMISOS_DISPONIBLES.map(p => (
                  <label key={p.key} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={(fichaData.permisosExtra || []).includes(p.key)}
                      onChange={e => {
                        const actual: string[] = fichaData.permisosExtra || []
                        const nuevos = e.target.checked
                          ? [...actual, p.key]
                          : actual.filter((x: string) => x !== p.key)
                        setFichaData({ ...fichaData, permisosExtra: nuevos })
                      }}
                      className="rounded border-slate-300 text-violet-600"
                    />
                    <span className="text-xs text-slate-700">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Permiso conducir */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Permiso Conducir (Clase)</label>
                <input type="text" value={fichaData.permisoConducir || ''} onChange={e => setFichaData({ ...fichaData, permisoConducir: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Ej: B, B+E, C" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Exped.</label>
                <input type="date" value={fichaData.fechaExpedicion?.split('T')[0] || ''} onChange={e => setFichaData({ ...fichaData, fechaExpedicion: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validez</label>
                <input type="date" value={fichaData.fechaValidez?.split('T')[0] || ''} onChange={e => setFichaData({ ...fichaData, fechaValidez: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>

            {/* Formación y ocupación */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formación</label>
                <input type="text" value={fichaData.formacionProfesional || ''} onChange={e => setFichaData({ ...fichaData, formacionProfesional: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ocupación Actual</label>
                <input type="text" value={fichaData.ocupacionActual || ''} onChange={e => setFichaData({ ...fichaData, ocupacionActual: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>

            {/* Datos médicos y emergencia */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Minusvalía Reconocida</label>
                <input type="text" value={fichaData.minusvaliaReconocida || ''} onChange={e => setFichaData({ ...fichaData, minusvaliaReconocida: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto Emergencia</label>
                <input type="text" value={fichaData.contactoEmergencia || ''} onChange={e => setFichaData({ ...fichaData, contactoEmergencia: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tlfn Emergencia</label>
                <input type="text" value={fichaData.telefonoEmergencia || ''} onChange={e => setFichaData({ ...fichaData, telefonoEmergencia: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
            {/* Alergias */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="block text-xs font-bold text-red-600 uppercase mb-2">Datos Destacados / Alergias</label>
              <textarea value={fichaData.datosAlergias || ''} onChange={e => setFichaData({ ...fichaData, datosAlergias: e.target.value })} rows={2} className="w-full border border-red-200 rounded-lg p-2.5 text-sm" />
            </div>

            {/* Formación PC */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Formación P. Civil</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMACION_PC.map(f => {
                  const formacionActual = fichaData.formacionPC || [];
                  const checked = formacionActual.includes(f);
                  return (
                    <label key={f} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const nueva = checked
                            ? formacionActual.filter((x: string) => x !== f)
                            : [...formacionActual, f];
                          setFichaData({ ...fichaData, formacionPC: nueva });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      {f}
                    </label>
                  );
                })}
              </div>
              <div className="mt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Otras Titulaciones</label>
                <input type="text" value={fichaData.otrasTitulaciones || ''} onChange={e => setFichaData({ ...fichaData, otrasTitulaciones: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Añadir curso..." />
              </div>
            </div>

            {/* Documentos */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={fichaData.acuerdoIndividual || false} onChange={e => setFichaData({ ...fichaData, acuerdoIndividual: e.target.checked })} className="w-5 h-5 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Acuerdo Individual</p>
                  <DocumentUploader
                    label="Acuerdo Individual"
                    currentUrl={documentUrls.acuerdoIndividual}
                    onUpload={(url: string) => setDocumentUrls({ ...documentUrls, acuerdoIndividual: url })}
                  />
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={fichaData.certificadoTitularidad || false} onChange={e => setFichaData({ ...fichaData, certificadoTitularidad: e.target.checked })} className="w-5 h-5 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Certificado Titularidad</p>
                  <DocumentUploader
                    label="Certificado Titularidad"
                    currentUrl={documentUrls.certificadoTitularidad}
                    onUpload={(url: string) => setDocumentUrls({ ...documentUrls, certificadoTitularidad: url })}
                  />
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={fichaData.modelo145 || false} onChange={e => setFichaData({ ...fichaData, modelo145: e.target.checked })} className="w-5 h-5 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Modelo 145</p>
                  <DocumentUploader
                    label="Modelo 145"
                    currentUrl={documentUrls.modelo145}
                    onUpload={(url: string) => setDocumentUrls({ ...documentUrls, modelo145: url })}
                  />
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={fichaData.dniAdjuntado || false} onChange={e => setFichaData({ ...fichaData, dniAdjuntado: e.target.checked })} className="w-5 h-5 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">DNI (Anverso y Reverso)</p>
                  <DocumentUploader
                    label="DNI"
                    currentUrl={documentUrls.dni}
                    onUpload={(url: string) => setDocumentUrls({ ...documentUrls, dni: url })}
                  />
                </div>
              </label>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setShowFichaModal(false)} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleGuardarFicha} className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                <Save size={18} /> GUARDAR
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo Movimiento Caja */}
      {showNuevoMovimiento && (
        <Modal title="Nuevo Movimiento de Caja" onClose={() => setShowNuevoMovimiento(false)} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'entrada' })} className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${nuevoMovimiento.tipo === 'entrada' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <TrendingUp size={18} /> Entrada
                </button>
                <button type="button" onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'salida' })} className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${nuevoMovimiento.tipo === 'salida' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <TrendingDown size={18} /> Salida
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concepto *</label>
              <input type="text" value={nuevoMovimiento.concepto} onChange={e => setNuevoMovimiento({ ...nuevoMovimiento, concepto: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Ej: Compra material" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
              <textarea value={nuevoMovimiento.descripcion} onChange={e => setNuevoMovimiento({ ...nuevoMovimiento, descripcion: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Importe (€) *</label>
              <input type="number" step="0.01" value={nuevoMovimiento.importe || ''} onChange={e => setNuevoMovimiento({ ...nuevoMovimiento, importe: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
              <select value={nuevoMovimiento.categoria} onChange={e => setNuevoMovimiento({ ...nuevoMovimiento, categoria: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                <option value="">Sin categoría</option>
                <option value="material">Material</option>
                <option value="equipamiento">Equipamiento</option>
                <option value="formacion">Formación</option>
                <option value="transporte">Transporte</option>
                <option value="otros">Otros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adjunto</label>
              <DocumentUploader
                label="Ticket"
                apiEndpoint="/api/admin/caja/drive-upload"
                onUpload={(url) => setNuevoMovimiento({ ...nuevoMovimiento, adjuntoUrl: url })}
                currentUrl={nuevoMovimiento.adjuntoUrl}
                folder="Tickets Caja"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowNuevoMovimiento(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="button" onClick={handleGuardarMovimientoCaja} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar Movimiento Caja */}
      {showEditarMovimiento && movimientoEditando && (
        <Modal title="Editar Movimiento de Caja" onClose={() => setShowEditarMovimiento(false)} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMovimientoEditando({ ...movimientoEditando!, tipo: 'entrada' })} className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${movimientoEditando.tipo === 'entrada' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <TrendingUp size={18} /> Entrada
                </button>
                <button type="button" onClick={() => setMovimientoEditando({ ...movimientoEditando!, tipo: 'salida' })} className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${movimientoEditando.tipo === 'salida' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <TrendingDown size={18} /> Salida
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={movimientoEditando.fecha ? new Date(movimientoEditando.fecha).toISOString().split('T')[0] : ''}
                onChange={e => setMovimientoEditando({ ...movimientoEditando, fecha: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concepto *</label>
              <input type="text" value={movimientoEditando.concepto} onChange={e => setMovimientoEditando({ ...movimientoEditando, concepto: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Ej: Compra material" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
              <textarea value={movimientoEditando.descripcion} onChange={e => setMovimientoEditando({ ...movimientoEditando, descripcion: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Importe (€) *</label>
              <input type="number" step="0.01" value={movimientoEditando.importe || ''} onChange={e => setMovimientoEditando({ ...movimientoEditando, importe: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
              <select value={movimientoEditando.categoria || ''} onChange={e => setMovimientoEditando({ ...movimientoEditando, categoria: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                <option value="">Sin categoría</option>
                <option value="material">Material</option>
                <option value="equipamiento">Equipamiento</option>
                <option value="formacion">Formación</option>
                <option value="transporte">Transporte</option>
                <option value="otros">Otros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adjunto</label>
              <DocumentUploader
                label="Ticket"
                apiEndpoint="/api/admin/caja/drive-upload"
                onUpload={(url) => setMovimientoEditando({ ...movimientoEditando, adjuntoUrl: url })}
                currentUrl={movimientoEditando.adjuntoUrl}
                folder="Tickets Caja"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEditarMovimiento(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="button" onClick={handleActualizarMovimientoCaja} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Guardar Cambios</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Preview Ticket */}
      {ticketPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4" onClick={() => setTicketPreview(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-semibold text-slate-700">Ticket de combustible</span>
              <div className="flex gap-2">
                <a href={ticketPreview} target="_blank" className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"><Download size={14} /> Abrir</a>
                <button onClick={() => setTicketPreview(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
            </div>
            <div className="p-4 flex justify-center bg-slate-50 max-h-[70vh] overflow-auto">
              <img src={ticketPreview} alt="Ticket" className="max-w-full rounded shadow" onError={() => window.open(ticketPreview!, '_blank')} />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Ticket Combustible */}
      {showNuevoTicket && (
        <Modal title="Nuevo Ticket Combustible" onClose={() => setShowNuevoTicket(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha *</label>
                <input type="date" value={nuevoTicket.fecha} onChange={e => setNuevoTicket({ ...nuevoTicket, fecha: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
                <input type="time" value={nuevoTicket.hora} onChange={e => setNuevoTicket({ ...nuevoTicket, hora: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estación</label>
                <input type="text" value={nuevoTicket.estacion} onChange={e => setNuevoTicket({ ...nuevoTicket, estacion: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Ej: CAMPSA CIUDAD UNIVERSITARIA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destino *</label>
                <select value={nuevoTicket.destino} onChange={e => setNuevoTicket({ ...nuevoTicket, destino: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="MAQUINARIA">MAQUINARIA</option>
                  <option value="VIR">VIR</option>
                  <option value="GRUPO ELECTRÓGENO">GRUPO ELECTRÓGENO</option>
                  <option value="MOTOBOMBA">MOTOBOMBA</option>
                  <option value="MOTOSIERRA">MOTOSIERRA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concepto *</label>
                <select value={nuevoTicket.concepto} onChange={e => setNuevoTicket({ ...nuevoTicket, concepto: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                  <option value="EFITEC 95">EFITEC 95</option>
                  <option value="EFITEC 98">EFITEC 98</option>
                  <option value="DIESEL">DIESEL</option>
                  <option value="DIESEL+">DIESEL+</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Litros *</label>
                <input type="number" step="0.01" value={nuevoTicket.litros || ''} onChange={e => setNuevoTicket({ ...nuevoTicket, litros: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">€/Litro *</label>
                <input type="number" step="0.001" value={nuevoTicket.precioLitro || ''} onChange={e => setNuevoTicket({ ...nuevoTicket, precioLitro: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Importe Final *</label>
                <input type="number" step="0.01" value={nuevoTicket.importeFinal || ''} onChange={e => setNuevoTicket({ ...nuevoTicket, importeFinal: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas</label>
              <textarea value={nuevoTicket.notas} onChange={e => setNuevoTicket({ ...nuevoTicket, notas: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adjuntar Ticket</label>
              <TicketOCRUploader
                onDatosExtraidos={(datos) => setNuevoTicket(prev => ({
                  ...prev,
                  fecha: datos.fecha || prev.fecha,
                  hora: datos.hora || prev.hora,
                  estacion: datos.estacion || prev.estacion,
                  litros: datos.litros ?? prev.litros,
                  precioLitro: datos.precioLitro ?? prev.precioLitro,
                  importeFinal: datos.importeFinal ?? prev.importeFinal,
                  concepto: datos.concepto || prev.concepto,
                }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowNuevoTicket(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="button" onClick={handleGuardarTicket} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nueva/Editar Póliza */}
      {showNuevaPoliza && (
        <Modal title={polizaEditando ? 'Editar Póliza' : 'Nueva Póliza de Seguro'} onClose={() => { setShowNuevaPoliza(false); setPolizaEditando(null); }} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Póliza *</label>
                <select
                  value={polizaEditando?.tipo || nuevaPoliza.tipo}
                  onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, tipo: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, tipo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                  {TIPOS_POLIZA.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Póliza</label>
                <input
                  type="text"
                  value={polizaEditando?.numero || nuevaPoliza.numero}
                  onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, numero: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, numero: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Compañía Aseguradora *</label>
              <input
                type="text"
                value={polizaEditando?.compania || nuevaPoliza.compania}
                onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, compania: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, compania: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                placeholder="Ej: Mapfre, Allianz, AXA..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
              <textarea
                value={polizaEditando?.descripcion || nuevaPoliza.descripcion}
                onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, descripcion: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, descripcion: e.target.value })}
                rows={2}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                placeholder="Detalles de la cobertura..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Inicio *</label>
                <input
                  type="date"
                  value={(polizaEditando?.fechaInicio || nuevaPoliza.fechaInicio)?.split('T')[0] || ''}
                  onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, fechaInicio: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, fechaInicio: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Vencimiento *</label>
                <input
                  type="date"
                  value={(polizaEditando?.fechaVencimiento || nuevaPoliza.fechaVencimiento)?.split('T')[0] || ''}
                  onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, fechaVencimiento: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, fechaVencimiento: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prima Anual (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={polizaEditando?.primaAnual || nuevaPoliza.primaAnual || ''}
                  onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, primaAnual: parseFloat(e.target.value) || 0 }) : setNuevaPoliza({ ...nuevaPoliza, primaAnual: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas</label>
              <textarea
                value={polizaEditando?.notas || nuevaPoliza.notas}
                onChange={e => polizaEditando ? setPolizaEditando({ ...polizaEditando, notas: e.target.value }) : setNuevaPoliza({ ...nuevaPoliza, notas: e.target.value })}
                rows={2}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowNuevaPoliza(false); setPolizaEditando(null); }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="button" onClick={handleGuardarPoliza} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">
                {polizaEditando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo/Editar Aspirante */}
      {showNuevoAspirante && (
        <Modal title={aspiranteEditando ? 'Editar Aspirante' : 'Nuevo Aspirante'} onClose={() => { setShowNuevoAspirante(false); setAspiranteEditando(null); }} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre *</label>
                <input
                  type="text"
                  value={aspiranteEditando?.nombre || nuevoAspirante.nombre}
                  onChange={(e) => aspiranteEditando ? setAspiranteEditando({ ...aspiranteEditando, nombre: e.target.value }) : setNuevoAspirante({ ...nuevoAspirante, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellidos *</label>
                <input
                  type="text"
                  value={aspiranteEditando?.apellidos || nuevoAspirante.apellidos}
                  onChange={(e) => aspiranteEditando ? setAspiranteEditando({ ...aspiranteEditando, apellidos: e.target.value }) : setNuevoAspirante({ ...nuevoAspirante, apellidos: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  placeholder="Apellidos"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI *</label>
                <input
                  type="text"
                  value={aspiranteEditando?.dni || nuevoAspirante.dni}
                  onChange={(e) => aspiranteEditando ? setAspiranteEditando({ ...aspiranteEditando, dni: e.target.value }) : setNuevoAspirante({ ...nuevoAspirante, dni: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  placeholder="DNI"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={aspiranteEditando?.telefono || nuevoAspirante.telefono}
                  onChange={(e) => aspiranteEditando ? setAspiranteEditando({ ...aspiranteEditando, telefono: e.target.value }) : setNuevoAspirante({ ...nuevoAspirante, telefono: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  placeholder="Teléfono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input
                type="email"
                value={aspiranteEditando?.email || nuevoAspirante.email}
                onChange={(e) => aspiranteEditando ? setAspiranteEditando({ ...aspiranteEditando, email: e.target.value }) : setNuevoAspirante({ ...nuevoAspirante, email: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowNuevoAspirante(false); setAspiranteEditando(null); }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="button" onClick={aspiranteEditando ? () => handleActualizarAspirante(aspiranteEditando.id, aspiranteEditando) : handleGuardarAspirante} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">
                {aspiranteEditando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}