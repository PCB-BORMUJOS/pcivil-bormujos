'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, DollarSign, Fuel, Wallet, ChevronLeft, ChevronRight,
  Search, Plus, Edit, Eye, Download, Upload, X, Save, FileText, Check,
  AlertCircle, Clock, Car, Phone, Mail, MapPin, CreditCard, Receipt,
  TrendingUp, TrendingDown, Filter, Printer, Shield, Building2, Trash2,
  AlertTriangle, CheckCircle, XCircle, UserCheck, RefreshCw, UserPlus
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
    categoria?: string;
    fechaAlta?: string;
  };
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
const AREAS_SERVICIO = [
  { id: 'JEFATURA', nombre: 'Jefatura', color: 'bg-purple-500' },
  { id: 'SOCORRISMO', nombre: 'Socorrismo', color: 'bg-blue-500' },
  { id: 'EXT_INCENDIOS', nombre: 'Ext. Incendios', color: 'bg-red-500' },
  { id: 'LOGISTICA', nombre: 'Logística', color: 'bg-green-500' },
  { id: 'FORMACION', nombre: 'Formación', color: 'bg-yellow-500' },
  { id: 'TRANSMISIONES', nombre: 'Transmisiones', color: 'bg-cyan-500' },
  { id: 'ACCION_SOCIAL', nombre: 'Acción Social', color: 'bg-pink-500' },
  { id: 'PMA', nombre: 'PMA', color: 'bg-orange-500' },
  { id: 'ADMINISTRACION', nombre: 'Administración', color: 'bg-slate-500' },
];

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
  const [activeTab, setActiveTab] = useState<'personal' | 'disponibilidad' | 'dietas' | 'caja' | 'combustible' | 'polizas' | 'areas' | 'aspirantes'>('personal');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Personal
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
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

  // Estados para Caja
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>([]);
  const [saldoActual, setSaldoActual] = useState(0);
  const [showNuevoMovimiento, setShowNuevoMovimiento] = useState(false);
  const [showEditarMovimiento, setShowEditarMovimiento] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState<MovimientoCaja | null>(null);
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'entrada', concepto: '', descripcion: '', importe: 0, categoria: '' });

  // Estados para Combustible
  const [ticketsCombustible, setTicketsCombustible] = useState<TicketCombustible[]>([]);
  const [mesCombustible, setMesCombustible] = useState('');
  const [showNuevoTicket, setShowNuevoTicket] = useState(false);
  const [nuevoTicket, setNuevoTicket] = useState({
    fecha: '', hora: '', estacion: '', destino: 'MAQUINARIA', concepto: 'EFITEC 95',
    litros: 0, precioLitro: 0, importeFinal: 0, vehiculoDestino: '', notas: ''
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
      const res = await fetch('/api/admin/personal?roles=true');
      const data = await res.json();
      setVoluntarios(data.voluntarios || []);
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error cargando voluntarios:', error);
    }
  };

  const cargarDisponibilidades = async () => {
    try {
      const res = await fetch(`/api/admin/disponibilidades?semana=${semanaDisp}`);
      const data = await res.json();
      setDisponibilidades(data.disponibilidades || []);
    } catch (error) {
      console.error('Error cargando disponibilidades:', error);
    }
  };

  const cargarDietas = async () => {
    try {
      const res = await fetch(`/api/admin/dietas?mes=${mesDietas}`);
      const data = await res.json();
      setResumenDietas(data.resumen || []);
    } catch (error) {
      console.error('Error cargando dietas:', error);
    }
  };

  const cargarMovimientosCaja = async () => {
    try {
      const res = await fetch('/api/admin/caja');
      const data = await res.json();
      setMovimientosCaja(data.movimientos || []);
      setSaldoActual(data.saldoActual || 0);
    } catch (error) {
      console.error('Error cargando caja:', error);
    }
  };

  const cargarTicketsCombustible = async () => {
    try {
      const res = await fetch(`/api/admin/combustible?mes=${mesCombustible}`);
      const data = await res.json();
      setTicketsCombustible(data.tickets || []);
    } catch (error) {
      console.error('Error cargando combustible:', error);
    }
  };

  const cargarPolizas = async () => {
    try {
      const res = await fetch('/api/admin/polizas');
      const data = await res.json();
      setPolizas(data.polizas || []);
    } catch (error) {
      console.error('Error cargando pólizas:', error);
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
        fechaAlta: data.ficha?.fechaAlta ? data.ficha.fechaAlta.split('T')[0] : new Date().toISOString().split('T')[0],
        localidad: 'BORMUJOS',
        provincia: 'SEVILLA',
        areaAsignada: data.ficha?.areaAsignada || '',
        categoria: data.ficha?.categoria || 'VOLUNTARIO'
      });
    } catch (error) {
      setFichaData({
        rolId: voluntario.rolId,
        fechaAlta: new Date().toISOString().split('T')[0],
        localidad: 'BORMUJOS',
        provincia: 'SEVILLA',
        areaAsignada: '',
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
      console.error('Error al actualizar estado:', error);
    }
  };

  const handleGuardarFicha = async () => {
    if (!selectedVoluntario) return;

    // Primero guardar la ficha
    try {
      const res = await fetch(`/api/admin/personal/${selectedVoluntario.id}/ficha`, {
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
              id: selectedVoluntario.id,
              rolId: fichaData.rolId,
              accion: 'rol'
            })
          });
        }

        alert('✅ Ficha guardada correctamente');
        setShowFichaModal(false);
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
        setNuevoMovimiento({ tipo: 'entrada', concepto: '', descripcion: '', importe: 0, categoria: '' });
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
          litros: 0, precioLitro: 0, importeFinal: 0, vehiculoDestino: '', notas: ''
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
        body: JSON.stringify({ id, ...data })
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
      console.error('Error al cargar aspirantes:', error);
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
      console.error('Error al actualizar disponibilidad:', error);
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
    voluntarios: voluntarios.filter(v => v.fichaVoluntario?.areaAsignada === area.id)
  }));

  const sinArea = voluntarios.filter(v => !v.fichaVoluntario?.areaAsignada);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* Implementar exportación */ }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} /> Exportar Listado
          </button>
          <button
            onClick={() => {
              if (activeTab === 'personal') {
                // Crear voluntario temporal para nueva ficha
                setSelectedVoluntario({
                  id: '',
                  numeroVoluntario: '',
                  nombre: '',
                  apellidos: '',
                  email: '',
                  telefono: '',
                  activo: true,
                  rolId: '',
                  rol: { id: '', nombre: '' }
                } as Voluntario);
                setFichaData({
                  fechaAlta: new Date().toISOString().split('T')[0],
                  localidad: 'BORMUJOS',
                  provincia: 'SEVILLA',
                  areaAsignada: '',
                  categoria: 'VOLUNTARIO'
                });
                setShowFichaModal(true);
              }
              else if (activeTab === 'polizas') setShowNuevaPoliza(true);
              else if (activeTab === 'caja') setShowNuevoMovimiento(true);
              else if (activeTab === 'combustible') setShowNuevoTicket(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={18} />
            {activeTab === 'personal' ? 'Nueva Ficha' :
              activeTab === 'polizas' ? 'Nueva Póliza' :
                activeTab === 'caja' ? 'Nuevo Movimiento' :
                  activeTab === 'combustible' ? 'Nuevo Ticket' : 'Nuevo'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/50">
          <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={Users} label="Listado Personal" count={voluntarios.length} />
          <TabButton active={activeTab === 'disponibilidad'} onClick={() => setActiveTab('disponibilidad')} icon={Calendar} label="Gestión Disponibilidad" />
          <TabButton active={activeTab === 'dietas'} onClick={() => setActiveTab('dietas')} icon={DollarSign} label="Control Dietas" />
          <TabButton active={activeTab === 'caja'} onClick={() => setActiveTab('caja')} icon={Wallet} label="Caja Efectivo" />
          <TabButton active={activeTab === 'combustible'} onClick={() => setActiveTab('combustible')} icon={Fuel} label="Control Combustible" />
          <TabButton active={activeTab === 'polizas'} onClick={() => setActiveTab('polizas')} icon={Shield} label="Pólizas Seguro" alert={polizasAlerta > 0} />
          <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={Building2} label="Asignación Áreas" />
          <TabButton active={activeTab === 'aspirantes'} onClick={() => setActiveTab('aspirantes')} icon={UserPlus} label="Aspirantes" />
        </div>

        <div className="p-6">
          {/* ============================================ */}
          {/* TAB: LISTADO PERSONAL */}
          {/* ============================================ */}
          {activeTab === 'personal' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
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
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Indicativo</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Voluntario</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Área Asignada</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Teléfono</th>
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
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-medium text-slate-700">
                                {AREAS_SERVICIO.find(a => a.id === v.fichaVoluntario?.areaAsignada)?.nombre || 'Sin asignar'}
                              </span>
                              <p className="text-xs text-slate-500">{v.rol?.nombre}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{v.telefono || '-'}</td>
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Visualizando semana:</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => cambiarSemana('prev')} className="p-2 hover:bg-white rounded-lg transition-colors">
                    <ChevronLeft size={18} className="text-slate-500" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 px-4 min-w-[220px] text-center">
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
                  <table className="w-full">
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
              <div className="flex items-center justify-between mb-6">
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
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                  <Printer size={18} /> Imprimir Informe
                </button>
              </div>

              {/* Resumen */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-6">
                <h3 className="text-blue-100 text-sm font-medium mb-4">RESUMEN DEL PERIODO</h3>
                <div className="grid grid-cols-4 gap-6">
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
                  <table className="w-full">
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
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: CAJA EFECTIVO */}
          {/* ============================================ */}
          {activeTab === 'caja' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl px-6 py-4 text-white">
                  <p className="text-green-100 text-sm">Saldo Actual</p>
                  <p className="text-3xl font-bold">{saldoActual.toFixed(2)} €</p>
                </div>
                <button
                  onClick={() => setShowNuevoMovimiento(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
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
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Concepto</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Descripción</th>
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
                          <td className="py-3 px-4 text-sm text-slate-500">{m.descripcion || '-'}</td>
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
                              <DocumentUploader
                                label="Ticket"
                                onUpload={(url) => {
                                  // Actualizar el movimiento con el nuevo URL
                                  const actualizado = movimientosCaja.map(move => 
                                    move.id === m.id ? { ...move, adjuntoUrl: url } : move
                                  );
                                  setMovimientosCaja(actualizado);
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
                        className={`flex items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors ${aspiranteExpandido === a.id ? 'bg-slate-50' : ''}`}
                        onClick={() => setAspiranteExpandido(aspiranteExpandido === a.id ? null : a.id)}
                      >
                        <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                          <div className="text-sm text-slate-600">{new Date(a.fecha).toLocaleDateString('es-ES')}</div>
                          <div className="font-medium text-slate-700">{a.nombre} {a.apellidos}</div>
                          <div className="text-sm text-slate-600">{a.dni}</div>
                          <div className="text-sm text-slate-600">{a.telefono}</div>
                          <div className="text-sm text-slate-600 truncate">{a.email}</div>
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
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
                        <ChevronDown 
                          size={20} 
                          className={`ml-4 text-slate-400 transition-transform ${aspiranteExpandido === a.id ? 'rotate-180' : ''}`} 
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
                                    value={a.fechaEntrevista ? new Date(a.fechaEntrevista).toISOString().split('T')[0] : ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, fechaEntrevista: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={a.confirmacionAsistencia}
                                      onChange={(e) => handleActualizarAspirante(a.id, { ...a, confirmacionAsistencia: e.target.checked })}
                                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Confirmación Asistencia</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={a.asistioEntrevista}
                                      onChange={(e) => handleActualizarAspirante(a.id, { ...a, asistioEntrevista: e.target.checked })}
                                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Asistió a Entrevista</span>
                                  </label>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Evaluación Entrevista</label>
                                  <textarea 
                                    value={a.evaluacionEntrevista || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, evaluacionEntrevista: e.target.value })}
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
                                    value={a.carneConducir || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, carneConducir: e.target.value })}
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
                                    value={a.formacion || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, formacion: e.target.value })}
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Estudios realizados..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ocupación Actual</label>
                                  <input 
                                    type="text" 
                                    value={a.ocupacionActual || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, ocupacionActual: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Trabajo actual..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiempo Libre Disponible</label>
                                  <textarea 
                                    value={a.tiempoLibre || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, tiempoLibre: e.target.value })}
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Disponibilidad horaria..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interés por el Servicio</label>
                                  <textarea 
                                    value={a.interesServicio || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, interesServicio: e.target.value })}
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
                                    value={a.estado} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, estado: e.target.value as any })}
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
                                    value={a.observaciones || ''} 
                                    onChange={(e) => handleActualizarAspirante(a.id, { ...a, observaciones: e.target.value })}
                                    rows={4}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="Notas internas..."
                                  />
                                </div>
                              </div>
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
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
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                    <Printer size={18} /> Generar Informe
                  </button>
                  <button
                    onClick={() => setShowNuevoTicket(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Plus size={18} /> Nuevo Ticket
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
                  <table className="w-full">
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
                              <a href={t.ticketUrl} target="_blank" className="text-orange-600 hover:text-orange-700">
                                <Receipt size={18} />
                              </a>
                            ) : <span className="text-slate-300">-</span>}
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

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Listado de Pólizas</h3>
                <button
                  onClick={() => setShowNuevaPoliza(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${p.estado === 'vigente' ? 'bg-green-100 text-green-600' :
                              p.estado === 'por_vencer' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                              <IconoTipo size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
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
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Vencimiento</p>
                            <p className="font-bold text-slate-800">{new Date(p.fechaVencimiento).toLocaleDateString('es-ES')}</p>
                            {p.primaAnual && <p className="text-sm text-slate-600">{Number(p.primaAnual).toFixed(2)} €/año</p>}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => {
                                setPolizaEditando(p);
                                setShowNuevaPoliza(true);
                              }}
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: ASIGNACIÓN POR ÁREAS */}
          {/* ============================================ */}
          {activeTab === 'areas' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Distribución por Áreas</h3>
                  <p className="text-sm text-slate-500">{voluntarios.length} voluntarios activos • {sinArea.length} sin área asignada</p>
                </div>
                <button
                  onClick={cargarVoluntarios}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw size={18} /> Actualizar
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {voluntariosPorArea.map(area => (
                    <div key={area.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className={`${area.color} px-4 py-3 text-white`}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold">{area.nombre}</h4>
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">
                            {area.voluntarios.length}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 max-h-48 overflow-y-auto">
                        {area.voluntarios.length === 0 ? (
                          <p className="text-center text-slate-400 text-sm py-4">Sin asignaciones</p>
                        ) : (
                          <div className="space-y-2">
                            {area.voluntarios.map(v => (
                              <div key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg">
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                  {v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">{v.nombre} {v.apellidos}</p>
                                  <p className="text-xs text-slate-500">{v.numeroVoluntario}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Sin área asignada */}
                  {sinArea.length > 0 && (
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-600">Sin Área Asignada</h4>
                          <span className="bg-slate-200 px-2 py-0.5 rounded-full text-sm font-bold text-slate-600">
                            {sinArea.length}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {sinArea.map(v => (
                            <div key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg">
                              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                                {v.nombre?.charAt(0)}{v.apellidos?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{v.nombre} {v.apellidos}</p>
                                <p className="text-xs text-slate-500">{v.numeroVoluntario}</p>
                              </div>
                              <button
                                onClick={() => handleEditarFicha(v)}
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                              >
                                Asignar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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

            {/* Indicativos y fechas */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indicativo 1</label>
                <input type="text" value={selectedVoluntario?.numeroVoluntario || ''} disabled className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm" />
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
                <input type="text" value={selectedVoluntario?.nombre || ''} disabled className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellidos</label>
                <input type="text" value={selectedVoluntario?.apellidos || ''} disabled className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm" />
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
                <input type="text" value={fichaData.localidad || 'BORMUJOS'} onChange={e => setFichaData({ ...fichaData, localidad: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Provincia</label>
                <input type="text" value={fichaData.provincia || 'SEVILLA'} onChange={e => setFichaData({ ...fichaData, provincia: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI/NIE</label>
                <input type="text" value={fichaData.dniNie || ''} onChange={e => setFichaData({ ...fichaData, dniNie: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                <input type="text" value={fichaData.telefonoFijo || selectedVoluntario?.telefono || ''} onChange={e => setFichaData({ ...fichaData, telefonoFijo: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>

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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                <input type="text" value={fichaData.categoria || 'VOLUNTARIO'} onChange={e => setFichaData({ ...fichaData, categoria: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input type="email" value={selectedVoluntario?.email || ''} disabled className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm" />
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adjuntar Documento</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Arrastra un archivo o haz clic para seleccionar</p>
              </div>
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
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors cursor-pointer">
                <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Arrastra el ticket escaneado o haz clic para seleccionar</p>
              </div>
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