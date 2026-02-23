

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus, Search, RefreshCw, Package, Users, Calendar, BookOpen,
  Award, AlertCircle, Layers, Edit, Trash2, X, ClipboardList,
  ArrowUpDown, Send, CheckCircle, AlertTriangle, Clock, ShoppingCart, Ban,
  MapPin, Tag, FileText, CalendarDays
} from 'lucide-react';
import SignatureCanvas from '@/components/partes/SignatureCanvas';

// ============================================
// INTERFACES
// ============================================

interface Articulo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  stockActual: number;
  stockMinimo: number;
  stockAsignado?: number;
  unidad: string;
  familia: {
    id: string;
    nombre: string;
  };
  ubicacion?: {
    nombre: string;
  };
  fechaCaducidad?: string;
}

interface Familia {
  id: string;
  nombre: string;
  slug: string;
}

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  motivo: string;
  notas: string;
  createdAt: string;
  articulo: { nombre: string; codigo: string };
  usuario: { nombre: string; apellidos: string };
}

interface Peticion {
  id: string;
  numero: string;
  areaOrigen: string;
  nombreArticulo: string;
  cantidad: number;
  unidad: string;
  estado: string;
  prioridad: string;
  motivo: string;
  fechaSolicitud: string;
  solicitante: { nombre: string; apellidos: string };
  articulo: { nombre: string; codigo: string } | null;
}

interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  duracionHoras: number;
  validezMeses?: number;
  activo: boolean;
  areaVinculada?: string;
  formadorPrincipal?: string;
  nivelFormacion?: string;
  modalidad?: string;
  objetivos?: string;
  temario?: string;
  requisitosAcceso?: string;
  entidadOrganiza?: string;
  entidadCertifica?: string;
  costoPorAlumno?: number;
  plazasMaximas?: number;
  _count?: {
    convocatorias: number;
    certificaciones: number;
  };
}

interface JornadaAsistencia {
  id: string;
  convocatoriaId: string;
  fecha: string;
  numeroJornada: number;
  titulo?: string;
  horaInicio?: string;
  horaFin?: string;
  bloqueada: boolean;
  observaciones?: string;
  firmas?: RegistroFirma[];
}

interface RegistroFirma {
  id: string;
  jornadaId: string;
  usuarioId?: string;
  participanteExternoId?: string;
  asistio: boolean;
  firmaBase64?: string;
  fechaFirma?: string;
  valoracionFormador?: string;
  notaFormador?: number;
  comentarioFormador?: string;
  usuario?: {
    id: string;
    nombre: string;
    apellidos: string;
    numeroVoluntario?: string;
  };
  participanteExterno?: {
    id: string;
    nombre: string;
    apellidos: string;
    organizacion?: string;
    cargo?: string;
  };
}

interface ParticipanteExterno {
  id: string;
  convocatoriaId: string;
  nombre: string;
  apellidos: string;
  dni?: string;
  email?: string;
  telefono?: string;
  organizacion?: string;
  cargo?: string;
}


interface Convocatoria {
  id: string;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  lugar?: string;
  horario?: string;
  plazasDisponibles: number;
  plazasOcupadas: number;
  estado: string;
  curso: {
    id: string;
    nombre: string;
    tipo: string;
    areaVinculada?: string;
    duracionHoras?: number;
  };
  _count?: {
    inscripciones: number;
  };
}

interface Inscripcion {
  id: string;
  fechaInscripcion: string;
  estado: string;
  porcentajeAsistencia?: number;
  notaFinal?: number;
  apto?: boolean;
  usuario: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
    numeroVoluntario?: string;
  };
  convocatoria: {
    id: string;
    codigo: string;
    curso: {
      id: string
      nombre: string
    }
  }
  // Campos de firma biométrica (opcional)
  firmaBiometrica?: string;
  fechaFirma?: string;
  dispositivoFirma?: string;
  ipFirma?: string;
}

interface Certificacion {
  id: string;
  numeroCertificado?: string;
  fechaObtencion: string;
  fechaExpiracion?: string;
  entidadEmisora: string;
  vigente: boolean;
  renovada: boolean;
  certificadoUrl?: string;
  usuario: {
    id: string
    nombre: string
    apellidos: string
    numeroVoluntario?: string
  }
  curso: {
    id: string
    nombre: string
    tipo: string
  }
}

interface NecesidadFormativa {
  id: string
  descripcion: string
  areaAfectada: string
  numeroPersonas: number
  motivo: string
  impacto: string
  urgencia: string
  prioridad: number
  fechaLimite?: string
  estado: string
  detectadaPor: string
  fechaDeteccion: string
  curso?: {
    id: string
    nombre: string
  }
}

interface Stats {
  totalCursos: number
  convocatoriasActivas: number
  certificacionesVigentes: number
  necesidadesPendientes: number
}

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
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto grow custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function FormacionPage() {
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFormacionMember, setIsFormacionMember] = useState(false);

  // Estados principales
  const [mainTab, setMainTab] = useState<'inventario' | 'catalogo' | 'convocatorias' | 'inscripciones' | 'certificaciones' | 'necesidades' | 'asistencia'>('inventario');
  const [inventoryTab, setInventoryTab] = useState<'stock' | 'peticiones' | 'movimientos'>('stock');
  const [loading, setLoading] = useState(true);

  // Estados de datos
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [necesidades, setNecesidades] = useState<NecesidadFormativa[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);

  const [stats, setStats] = useState<Stats>({
    totalCursos: 0,
    convocatoriasActivas: 0,
    certificacionesVigentes: 0,
    necesidadesPendientes: 0
  });

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all');

  // Estados de modales
  const [showNuevoCurso, setShowNuevoCurso] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<Curso | null>(null);
  const [showNuevaConvocatoria, setShowNuevaConvocatoria] = useState(false);
  const [convocatoriaEditando, setConvocatoriaEditando] = useState<Convocatoria | null>(null);

  // Modales de Inventario
  const [showNuevoArticulo, setShowNuevoArticulo] = useState(false);
  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false);

  // Formularios
  const [nuevoArticulo, setNuevoArticulo] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    stockActual: 0,
    stockMinimo: 0,
    unidad: 'unidad',
    tieneCaducidad: false,
    fechaCaducidad: '',
    familiaId: '',
    ubicacionTexto: '' // Campo temporal para ubicación simplificada
  });

  const [nuevaPeticion, setNuevaPeticion] = useState({
    articuloId: '',
    nombreArticulo: '',
    cantidad: 1,
    unidad: 'unidad',
    motivo: '',
    prioridad: 'normal',
    descripcion: '',
    areaOrigen: 'formacion'
  });

  const [nuevoCurso, setNuevoCurso] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'interna',
    duracionHoras: 0,
    validezMeses: 0, // 0 = indefinido
    activo: true,
    formadorPrincipal: '',
    entidadOrganiza: '',
    entidadCertifica: ''
  });

  const [nuevaConvocatoriaData, setNuevaConvocatoriaData] = useState({
    cursoId: '', fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: 20, horario: '', instructores: '', formadorNombre: '', formadorExterno: false
  });
  const [nuevaNecesidadData, setNuevaNecesidadData] = useState({
    descripcion: '', areaAfectada: '', numeroPersonas: 1, motivo: '', prioridad: 3, impacto: 'medio', urgencia: 'normal'
  });
  const [showNuevaNecesidad, setShowNuevaNecesidad] = useState(false);
  const [filtroEstadoConv, setFiltroEstadoConv] = useState<'todas' | 'abiertas' | 'cerradas'>('todas');

  // Estados Registro Asistencia
  const [convocatoriaAsistencia, setConvocatoriaAsistencia] = useState<string>('');
  const [jornadasActivas, setJornadasActivas] = useState<JornadaAsistencia[]>([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<string>('');
  const [registrosFirma, setRegistrosFirma] = useState<RegistroFirma[]>([]);
  const [participantesExternos, setParticipantesExternos] = useState<ParticipanteExterno[]>([]);
  const [showNuevoExterno, setShowNuevoExterno] = useState(false);
  const [showNuevaJornada, setShowNuevaJornada] = useState(false);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [nuevoExterno, setNuevoExterno] = useState({ nombre: '', apellidos: '', dni: '', email: '', telefono: '', organizacion: '', cargo: '' });
  const [nuevaJornada, setNuevaJornada] = useState({ fecha: '', numeroJornada: 1, titulo: '', horaInicio: '', horaFin: '' });

  // Modal de inscripción
  const [showInscripcionModal, setShowInscripcionModal] = useState(false);
  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState<Convocatoria | null>(null);
  const [inscripcionLoading, setInscripcionLoading] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [mainTab]);

  // Effect para manejar edición de curso
  useEffect(() => {
    if (cursoEditando) {
      setNuevoCurso({
        codigo: cursoEditando.codigo || '',
        nombre: cursoEditando.nombre || '',
        descripcion: cursoEditando.descripcion || '',
        tipo: cursoEditando.tipo || 'interna',
        duracionHoras: cursoEditando.duracionHoras || 0,
        validezMeses: cursoEditando.validezMeses || 0,
        activo: cursoEditando.activo !== false,
        formadorPrincipal: cursoEditando.formadorPrincipal || '',
        entidadOrganiza: cursoEditando.entidadOrganiza || '',
        entidadCertifica: cursoEditando.entidadCertifica || ''
      });
      setShowNuevoCurso(true);
    }
  }, [cursoEditando]);

  // Cargar usuario actual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const sessionData = await res.json();
        if (sessionData?.user?.email) {
          // Get full user with role
          const userRes = await fetch('/api/mi-area');
          const userData = await userRes.json();
          if (userData?.usuario) {
            // Guardamos ficha junto al usuario para comprobar área asignada
            setCurrentUser({ ...userData.usuario, ficha: userData.ficha || null });
            setIsAdmin(userData.usuario.rol?.nombre === 'ADMIN' || userData.usuario.rol?.nombre === 'admin' || userData.usuario.rol?.nombre === 'superadmin');
            const area = (userData.ficha && userData.ficha.areaAsignada) || '';
            setIsFormacionMember(area.toLowerCase() === 'formación' || area.toLowerCase() === 'formacion');
          }
        }
      } catch (e) {
        console.error('Error fetching user:', e);
      }
    };
    if (session) {
      fetchCurrentUser();
    }
  }, [session]);

  // UI: curso detalles modal
  const [showCursoDetails, setShowCursoDetails] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);

  const openCursoDetails = (curso: Curso) => {
    setSelectedCurso(curso);
    setShowCursoDetails(true);
  };
  const closeCursoDetails = () => {
    setSelectedCurso(null);
    setShowCursoDetails(false);
  };

  // Inscripciones: control de filas desplegables por convocatoria
  const [expandedConvocatorias, setExpandedConvocatorias] = useState<Record<string, boolean>>({});
  const [expandedCursos, setExpandedCursos] = useState<Record<string, boolean>>({});
  const toggleCursoExpand = (id: string) => setExpandedCursos(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleConvocatoria = (id: string) => {
    setExpandedConvocatorias(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Estado Gestion Convocatoria
  const [showGestionConvocatoria, setShowGestionConvocatoria] = useState(false);
  const [selectedConvocatoriaForGrading, setSelectedConvocatoriaForGrading] = useState<Convocatoria | null>(null);
  const [inscripcionesGrading, setInscripcionesGrading] = useState<Inscripcion[]>([]);
  const [loadingGrading, setLoadingGrading] = useState(false);

  const handleOpenGestion = async (convocatoria: Convocatoria) => {
    setSelectedConvocatoriaForGrading(convocatoria);
    setLoadingGrading(true);
    setShowGestionConvocatoria(true);
    try {
      const res = await fetch(`/api/formacion?tipo=inscripciones&convocatoriaId=${convocatoria.id}`);
      if (res.ok) {
        const data = await res.json();
        setInscripcionesGrading(data.inscripciones || []);
      }
    } catch (e) { console.error(e); }
    setLoadingGrading(false);
  };

  const handleUpdateInscripcion = async (id: string, field: 'notaFinal' | 'porcentajeAsistencia' | 'apto', value: any) => {
    // Optimistic update
    setInscripcionesGrading(prev => prev.map(i =>
      i.id === id ? { ...i, [field]: value } : i
    ));

    // Si cambiamos nota o asistencia, calcular apto automáticamente
    // Lógica simple: Asistencia >= 80% y Nota >= 5 -> Apto
    if (field !== 'apto') {
      // Obtenemos el registro actualizado del estado (pero el estado no se ha actualizado aun en this render frame para el calculo complejo, asi que usamos lo que tenemos)
      // Mejor hacerlo simple: enviar al backend y dejar que el backend o el usuario decida.
      // Por ahora, solo guardamos el valor cambiado.
    }

    try {
      await fetch('/api/formacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'inscripcion', id, [field]: value })
      });
    } catch (e) {
      console.error(e);
      // Revertir si falla (opcional, por simplicidad no lo implemento ahora)
    }
  };

  const handleSaveFirma = async (inscripcionId: string, dataUrl: string) => {
    // Optimistic update in grading list
    setInscripcionesGrading(prev => prev.map(i => i.id === inscripcionId ? { ...i, firmaBiometrica: dataUrl, fechaFirma: new Date().toISOString() } : i));
    // Also update global inscripciones list if present
    setInscripciones(prev => prev.map(i => i.id === inscripcionId ? { ...i, firmaBiometrica: dataUrl, fechaFirma: new Date().toISOString() } : i));

    try {
      await fetch('/api/formacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'inscripcion', id: inscripcionId, firmaBiometrica: dataUrl, fechaFirma: new Date().toISOString(), dispositivoFirma: (typeof navigator !== 'undefined' ? (navigator.platform || navigator.userAgent) : 'web') })
      });
      // Close modal if it was opened for signing
      setShowFirmaModal(false);
    } catch (e) {
      console.error('Error guardando firma:', e);
      alert('Error guardando firma');
    }
  };

  const handleOpenFirma = (insc: Inscripcion) => {
    setFirmaTarget(insc);
    setShowFirmaModal(true);
  };

  const handleCerrarActa = async () => {
    if (!selectedConvocatoriaForGrading) return;
    if (!confirm('¿Estás seguro de cerrar el acta? Esto generará las certificaciones para los alumnos aptos y finalizará la convocatoria. Esta acción no se puede deshacer.')) return;

    try {
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'cerrar-acta', convocatoriaId: selectedConvocatoriaForGrading.id })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Acta cerrada correctamente. Se han generado ${data.certificadosGenerados} certificaciones.`);
        setShowGestionConvocatoria(false);
        cargarConvocatorias(); // Refrescar lista para ver estado finalizada
      } else {
        alert('Error al cerrar acta: ' + (data.error || 'Desconocido'));
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  // ============================================
  // INSCRIPCIÓN DE VOLUNTARIOS (APUNTARSE)
  // ============================================
  const handleApuntarse = async (convocatoriaId: string) => {
    if (!currentUser) {
      alert('Debes iniciar sesión para apuntarte');
      return;
    }
    if (!confirm('¿Quieres apuntarte a esta formación? Tu solicitud será revisada por un administrador.')) {
      return;
    }

    try {
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'inscripcion',
          convocatoriaId,
          usuarioId: currentUser.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('✅ Te has apuntado correctamente. Tu solicitud está pendiente de aprobación.');
        cargarConvocatorias(); // Refresh to show updated plazas
      } else {
        alert('Error: ' + (data.error || 'No se pudo completar la inscripción'));
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  // ============================================
  // INSCRIPCIÓN: ABRIR MODAL DE CONFIRMACIÓN
  // ============================================
  const handleOpenInscripcion = (convocatoria: Convocatoria) => {
    if (!currentUser) {
      alert('Debes iniciar sesión para inscribirte');
      return;
    }
    setConvocatoriaSeleccionada(convocatoria);
    setShowInscripcionModal(true);
  };

  const handleConfirmarInscripcion = async () => {
    if (!convocatoriaSeleccionada || !currentUser) return;

    setInscripcionLoading(true);
    try {
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'inscripcion',
          convocatoriaId: convocatoriaSeleccionada.id,
          usuarioId: currentUser.id,
          estado: 'confirmada'
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('✅ ¡Inscripción confirmada! Te has apuntado correctamente a la formación.');
        setShowInscripcionModal(false);
        setConvocatoriaSeleccionada(null);
        cargarConvocatorias();
      } else {
        alert('Error: ' + (data.error || 'No se pudo completar la inscripción'));
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setInscripcionLoading(false);
    }
  };

  // Efectos secundarios
  useEffect(() => {
    if (mainTab === 'inventario') {
      if (inventoryTab === 'peticiones') cargarPeticiones();
      if (inventoryTab === 'movimientos') cargarMovimientos();
    }
  }, [mainTab, inventoryTab]);

  // ============================================
  // CARGA DE DATOS
  // ============================================
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const resStats = await fetch('/api/formacion?tipo=stats');
      const dataStats = await resStats.json();
      setStats(dataStats.stats || { totalCursos: 0, convocatoriasActivas: 0, certificacionesVigentes: 0, necesidadesPendientes: 0 });

      if (mainTab === 'inventario') await cargarInventario();
      else if (mainTab === 'catalogo') await cargarCursos();
      else if (mainTab === 'convocatorias') await cargarConvocatorias();
      else if (mainTab === 'inscripciones') await cargarInscripciones();
      else if (mainTab === 'certificaciones') await cargarCertificaciones();
      else if (mainTab === 'necesidades') await cargarNecesidades();

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarInventario = async () => {
    try {
      const res = await fetch('/api/formacion?tipo=inventario');
      const data = await res.json();
      setArticulos(data.articulos || []);
      setFamilias(data.familias || []);
    } catch (error) { console.error("Error al cargar inventario", error); }
  };

  const cargarPeticiones = async () => {
    try {
      const res = await fetch('/api/logistica/peticiones?area=formacion');
      const data = await res.json();
      setPeticiones(data.peticiones || []);
    } catch (error) { console.error('Error loading peticiones:', error); }
  };

  const cargarMovimientos = async () => {
    try {
      const res = await fetch('/api/logistica/movimiento?inventario=formacion&limit=100');
      const data = await res.json();
      setMovimientos(data.movimientos || []);
    } catch (error) { console.error('Error loading movimientos:', error); }
  };

  const cargarCursos = async () => {
    const res = await fetch('/api/formacion?tipo=cursos');
    const data = await res.json();
    setCursos(data.cursos || []);
  };

  const cargarConvocatorias = async () => { /* ...existing calls... */
    const res = await fetch('/api/formacion?tipo=convocatorias');
    const data = await res.json();
    setConvocatorias(data.convocatorias || []);
  };

  // Firma modal
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [firmaTarget, setFirmaTarget] = useState<Inscripcion | null>(null);
  const cargarInscripciones = async () => {
    const res = await fetch('/api/formacion?tipo=inscripciones');
    const data = await res.json();
    setInscripciones(data.inscripciones || []);
  };
  const cargarCertificaciones = async () => {
    const res = await fetch('/api/formacion?tipo=certificaciones&vigentes=true');
    const data = await res.json();
    setCertificaciones(data.certificaciones || []);
  };
  const getAreaLabel = (area?: string) => {
    const areas: Record<string, string> = {
      'socorrismo': 'Socorrismo', 'incendios': 'Incendios',
      'transmisiones': 'Transmisiones', 'pma': 'PMA',
      'logistica': 'Logística', 'general': 'General', 'vehiculos': 'Vehículos'
    };
    return area ? (areas[area] || area) : '—';
  };

  const getAreaColor = (area?: string) => {
    const colors: Record<string, string> = {
      'socorrismo': 'bg-red-100 text-red-700',
      'incendios': 'bg-orange-100 text-orange-700',
      'transmisiones': 'bg-blue-100 text-blue-700',
      'pma': 'bg-purple-100 text-purple-700',
      'logistica': 'bg-slate-100 text-slate-700',
      'general': 'bg-gray-100 text-gray-700',
      'vehiculos': 'bg-yellow-100 text-yellow-700'
    };
    return area ? (colors[area] || 'bg-slate-100 text-slate-600') : 'bg-slate-100 text-slate-600';
  };

  const getEstadoConvColor = (estado: string) => {
    const map: Record<string, string> = {
      'inscripciones_abiertas': 'bg-green-100 text-green-700 border-green-200',
      'planificada': 'bg-blue-100 text-blue-700 border-blue-200',
      'en_curso': 'bg-purple-100 text-purple-700 border-purple-200',
      'finalizada': 'bg-slate-100 text-slate-600 border-slate-200',
      'cancelada': 'bg-red-100 text-red-700 border-red-200'
    };
    return map[estado] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getEstadoConvLabel = (estado: string) => {
    const map: Record<string, string> = {
      'inscripciones_abiertas': 'Abierta',
      'planificada': 'Planificada',
      'en_curso': 'En curso',
      'finalizada': 'Finalizada',
      'cancelada': 'Cancelada'
    };
    return map[estado] || estado;
  };

  const cargarJornadas = async (convocatoriaId: string) => {
    if (!convocatoriaId) return;
    setLoadingAsistencia(true);
    try {
      const res = await fetch(`/api/formacion?tipo=jornadas&convocatoriaId=${convocatoriaId}`);
      const data = await res.json();
      setJornadasActivas(data.jornadas || []);
      if (data.jornadas?.length > 0) {
        setJornadaSeleccionada(data.jornadas[0].id);
        await cargarRegistrosFirma(data.jornadas[0].id);
      } else {
        setJornadaSeleccionada('');
        setRegistrosFirma([]);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingAsistencia(false); }
  };

  const cargarRegistrosFirma = async (jornadaId: string) => {
    if (!jornadaId) return;
    setLoadingAsistencia(true);
    try {
      const res = await fetch(`/api/formacion?tipo=registros&jornadaId=${jornadaId}`);
      const data = await res.json();
      setRegistrosFirma(data.registros || []);
    } catch (e) { console.error(e); }
    finally { setLoadingAsistencia(false); }
  };

  const handleCrearJornada = async () => {
    if (!convocatoriaAsistencia || !nuevaJornada.fecha) {
      alert('Selecciona una convocatoria y una fecha');
      return;
    }
    try {
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'jornada', convocatoriaId: convocatoriaAsistencia, ...nuevaJornada })
      });
      if (res.ok) {
        setShowNuevaJornada(false);
        setNuevaJornada({ fecha: '', numeroJornada: jornadasActivas.length + 2, titulo: '', horaInicio: '', horaFin: '' });
        await cargarJornadas(convocatoriaAsistencia);
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'No se pudo crear la jornada'));
      }
    } catch (e) { console.error(e); alert('Error de conexión'); }
  };

  const handleToggleAsistencia = async (registroId: string, asistio: boolean) => {
    try {
      const res = await fetch('/api/formacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'registro-firma', id: registroId, asistio })
      });
      if (res.ok) await cargarRegistrosFirma(jornadaSeleccionada);
    } catch (e) { console.error(e); }
  };

  const handleCrearParticipanteExterno = async () => {
    if (!nuevoExterno.nombre || !nuevoExterno.apellidos) {
      alert('Nombre y apellidos son obligatorios');
      return;
    }
    try {
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'participante-externo', convocatoriaId: convocatoriaAsistencia, ...nuevoExterno })
      });
      if (res.ok) {
        setShowNuevoExterno(false);
        setNuevoExterno({ nombre: '', apellidos: '', dni: '', email: '', telefono: '', organizacion: '', cargo: '' });
        await cargarJornadas(convocatoriaAsistencia);
      } else {
        alert('Error al registrar participante');
      }
    } catch (e) { console.error(e); alert('Error de conexión'); }
  };

    const cargarNecesidades = async () => {
    const res = await fetch('/api/formacion?tipo=necesidades');
    const data = await res.json();
    setNecesidades(data.necesidades || []);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleGuardarArticulo = async () => {
    if (!nuevoArticulo.nombre || !nuevoArticulo.familiaId) {
      alert('Nombre y familia son requeridos');
      return;
    }
    try {
      // In a real implementation we would handle location properly (create or find Ubicacion)
      // For now we pass basic fields.
      const payload = {
        tipo: 'articulo',
        ...nuevoArticulo,
        fechaCaducidad: nuevoArticulo.tieneCaducidad && nuevoArticulo.fechaCaducidad ? new Date(nuevoArticulo.fechaCaducidad) : null
      };

      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowNuevoArticulo(false);
        setNuevoArticulo({
          codigo: '', nombre: '', descripcion: '', stockActual: 0, stockMinimo: 0,
          unidad: 'unidad', tieneCaducidad: false, fechaCaducidad: '', familiaId: '', ubicacionTexto: ''
        });
        cargarInventario();
        alert('✅ Artículo creado correctamente');
      } else {
        alert('Error al crear artículo');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    }
  };

  const handleGuardarPeticion = async () => {
    if (!nuevaPeticion.nombreArticulo || !nuevaPeticion.cantidad || !nuevaPeticion.motivo) {
      alert('Nombre, cantidad y motivo son requeridos');
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
        setNuevaPeticion({
          articuloId: '', nombreArticulo: '', cantidad: 1, unidad: 'unidad',
          motivo: '', prioridad: 'normal', descripcion: '', areaOrigen: 'formacion'
        });
        if (inventoryTab === 'peticiones') cargarPeticiones();
        alert('✅ Petición enviada a Logística');
      } else {
        alert('Error al crear petición');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleGuardarCurso = async () => {
    if (!nuevoCurso.nombre || !nuevoCurso.codigo || nuevoCurso.duracionHoras <= 0) {
      alert('Por favor complete los campos obligatorios (Nombre, Código, Duración)');
      return;
    }

    try {
      const isEditing = !!cursoEditando;

      if (isEditing) {
        // Actualizar curso existente
        const res = await fetch(`/api/formacion?id=${cursoEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'curso',
            id: cursoEditando.id,
            nombre: nuevoCurso.nombre,
            codigo: nuevoCurso.codigo,
            descripcion: nuevoCurso.descripcion,
            tipo_curso: nuevoCurso.tipo,
            duracionHoras: Number(nuevoCurso.duracionHoras),
            validezMeses: nuevoCurso.validezMeses ? Number(nuevoCurso.validezMeses) : null,
            activo: nuevoCurso.activo,
            formadorPrincipal: nuevoCurso.formadorPrincipal,
            entidadOrganiza: nuevoCurso.entidadOrganiza,
            entidadCertifica: nuevoCurso.entidadCertifica
          })
        });

        if (res.ok) {
          setShowNuevoCurso(false);
          setCursoEditando(null);
          setNuevoCurso({
            codigo: '', nombre: '', descripcion: '', tipo: 'interna',
            duracionHoras: 0, validezMeses: 0, activo: true,
            formadorPrincipal: '', entidadOrganiza: '', entidadCertifica: ''
          });
          cargarCursos();
          alert('✅ Curso actualizado correctamente');
        } else {
          const err = await res.json();
          alert('Error al actualizar curso: ' + (err.error || 'Error desconocido'));
        }
      } else {
        // Crear nuevo curso
        const res = await fetch('/api/formacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'curso',
            nombre: nuevoCurso.nombre,
            codigo: nuevoCurso.codigo,
            descripcion: nuevoCurso.descripcion,
            tipo_curso: nuevoCurso.tipo,
            duracionHoras: Number(nuevoCurso.duracionHoras),
            validezMeses: nuevoCurso.validezMeses ? Number(nuevoCurso.validezMeses) : null,
            activo: nuevoCurso.activo,
            formadorPrincipal: nuevoCurso.formadorPrincipal,
            entidadOrganiza: nuevoCurso.entidadOrganiza,
            entidadCertifica: nuevoCurso.entidadCertifica
          })
        });

        if (res.ok) {
          setShowNuevoCurso(false);
          setNuevoCurso({
            codigo: '', nombre: '', descripcion: '', tipo: 'interna',
            duracionHoras: 0, validezMeses: 0, activo: true,
            formadorPrincipal: '', entidadOrganiza: '', entidadCertifica: ''
          });
          cargarCursos();
          // Also refresh stats
          const resStats = await fetch('/api/formacion?tipo=stats');
          const dataStats = await resStats.json();
          setStats(prev => ({ ...prev, totalCursos: dataStats.stats?.totalCursos || prev.totalCursos }));

          alert('✅ Curso creado correctamente');
        } else {
          const err = await res.json();
          alert('Error al crear curso: ' + (err.error || 'Error desconocido'));
        }
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    }
  };

  const handleGuardarConvocatoria = async () => {
    if (!nuevaConvocatoriaData.cursoId || !nuevaConvocatoriaData.fechaInicio || !nuevaConvocatoriaData.fechaFin) {
      alert('Curso y fechas son obligatorios');
      return;
    }
    try {
      if (convocatoriaEditando) {
        // Actualizar convocatoria existente
        const res = await fetch(`/api/formacion?id=${convocatoriaEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'convocatoria',
            id: convocatoriaEditando.id,
            fechaInicio: new Date(nuevaConvocatoriaData.fechaInicio),
            fechaFin: new Date(nuevaConvocatoriaData.fechaFin),
            lugar: nuevaConvocatoriaData.lugar,
            plazasDisponibles: Number(nuevaConvocatoriaData.plazasDisponibles),
            horario: nuevaConvocatoriaData.horario,
            instructores: nuevaConvocatoriaData.instructores,
            formadorNombre: nuevaConvocatoriaData.formadorNombre,
            formadorExterno: nuevaConvocatoriaData.formadorExterno
          })
        });
        if (res.ok) {
          setShowNuevaConvocatoria(false);
          setConvocatoriaEditando(null);
          setNuevaConvocatoriaData({ cursoId: '', fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: 20, horario: '', instructores: '', formadorNombre: '', formadorExterno: false });
          cargarConvocatorias();
          alert('✅ Convocatoria actualizada');
        } else {
          alert('Error al actualizar convocatoria');
        }
      } else {
        const res = await fetch('/api/formacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'convocatoria',
            ...nuevaConvocatoriaData,
            cursoId: nuevaConvocatoriaData.cursoId,
            codigo: `CONV-${Date.now().toString().slice(-6)}`,
            fechaInicio: new Date(nuevaConvocatoriaData.fechaInicio),
            fechaFin: new Date(nuevaConvocatoriaData.fechaFin),
            plazasDisponibles: Number(nuevaConvocatoriaData.plazasDisponibles),
            estado: 'planificada'
          })
        });
        if (res.ok) {
          setShowNuevaConvocatoria(false);
          setNuevaConvocatoriaData({ cursoId: '', fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: 20, horario: '', instructores: '', formadorNombre: '', formadorExterno: false });
          cargarConvocatorias();
          alert('✅ Convocatoria creada');
        } else {
          alert('Error al crear convocatoria');
        }
      }
    } catch (e) { console.error(e); alert('Error'); }
  };

  const handleGuardarNecesidad = async () => {
    if (!nuevaNecesidadData.descripcion || !nuevaNecesidadData.areaAfectada) {
      alert('Descripción y área son obligatorias');
      return;
    }
    try {
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'necesidad',
          ...nuevaNecesidadData,
          numeroPersonas: Number(nuevaNecesidadData.numeroPersonas),
          prioridad: Number(nuevaNecesidadData.prioridad),
          detectadaPor: 'Usuario Actual',
          estado: 'identificada'
        })
      });
      if (res.ok) {
        setShowNuevaNecesidad(false);
        setNuevaNecesidadData({ descripcion: '', areaAfectada: '', numeroPersonas: 1, motivo: '', prioridad: 3, impacto: 'medio', urgencia: 'normal' });
        cargarNecesidades();
        alert('✅ Necesidad registrada');
      } else { alert('Error al registrar necesidad'); }
    } catch (e) { console.error(e); alert('Error'); }
  };

  const handleEstadoInscripcion = async (id: string, nuevoEstado: string) => {
    if (!confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;
    try {
      const res = await fetch('/api/formacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'inscripcion', id, estado: nuevoEstado })
      });
      if (res.ok) {
        cargarInscripciones();
        cargarConvocatorias();
      } else { alert('Error al actualizar estado'); }
    } catch (e) { console.error(e); alert('Error'); }
  };


  // Filtros
  const articulosFiltrados = articulos.filter(a => {
    const matchSearch = searchTerm === '' ||
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchFamilia = selectedFamiliaFilter === 'all' || a.familia.id === selectedFamiliaFilter;
    return matchSearch && matchFamilia;
  });

  // Helper para estado stock
  const getEstadoStock = (articulo: Articulo) => {
    if (articulo.stockActual === 0) return { color: 'bg-red-100 text-red-700', label: 'Sin stock', icon: AlertCircle };
    if (articulo.stockActual < articulo.stockMinimo) return { color: 'bg-yellow-100 text-yellow-700', label: 'Bajo', icon: AlertTriangle };
    return { color: 'bg-green-100 text-green-700', label: 'OK', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-xl">
            <BookOpen className="text-purple-600" size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">FORMACIÓN</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Área de Formación</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Gestión de cursos, certificaciones e inventario</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Refrescar (Izquierda) */}
          <button
            onClick={() => cargarDatos()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mr-2"
            title="Recargar datos"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Botones de Acción */}
          <button onClick={() => setShowNuevaPeticion(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors">
            <Send size={18} /> <span className="hidden sm:inline">Nueva Petición</span>
          </button>

          <button onClick={() => setShowNuevoArticulo(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 border border-purple-200 transition-colors">
            <Package size={18} /> <span className="hidden sm:inline">Nuevo Artículo</span>
          </button>

          <button
            onClick={() => setShowNuevoCurso(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md transition-colors font-medium"
          >
            <Plus size={18} />
            <span>Nuevo Curso</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cursos', value: stats.totalCursos, icon: BookOpen, bg: 'bg-purple-100', color: 'text-purple-600' },
          { label: 'Convocatorias Activas', value: stats.convocatoriasActivas, icon: Calendar, bg: 'bg-blue-100', color: 'text-blue-600' },
          { label: 'Certificaciones Vigentes', value: stats.certificacionesVigentes, icon: Award, bg: 'bg-green-100', color: 'text-green-600' },
          { label: 'Necesidades Pendientes', value: stats.necesidadesPendientes, icon: AlertCircle, bg: 'bg-amber-100', color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-medium">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.bg} p-2.5 rounded-xl`}>
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Tabs Principales */}
        <div className="flex overflow-x-auto border-b border-slate-200 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {[
            { id: 'inventario', label: 'Inventario', icon: Package },
            { id: 'catalogo', label: 'Catálogo', icon: BookOpen },
            { id: 'convocatorias', label: 'Convocatorias', icon: Calendar },
            { id: 'inscripciones', label: 'Inscripciones', icon: Users },
            { id: 'certificaciones', label: 'Certificaciones', icon: Award },
            { id: 'necesidades', label: 'Necesidades', icon: AlertCircle },
            { id: 'asistencia', label: 'Registro Asistencia', icon: ClipboardList },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${mainTab === tab.id
                ? 'border-purple-500 text-purple-600 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ================================================================================== */}
        {/* CONTENIDO: INVENTARIO */}
        {/* ================================================================================== */}
        {mainTab === 'inventario' && (
          <div>
            {/* Sub-tabs Inventario */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4">
              {[
                { id: 'stock', label: 'Stock', icon: Package },
                { id: 'peticiones', label: 'Peticiones', icon: ClipboardList },
                { id: 'movimientos', label: 'Movimientos', icon: ArrowUpDown },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInventoryTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${inventoryTab === tab.id
                    ? 'border-purple-500 text-purple-600 bg-white shadow-sm -mb-[2px] rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* === TAB STOCK === */}
              {inventoryTab === 'stock' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar material..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                    <select
                      value={selectedFamiliaFilter}
                      onChange={(e) => setSelectedFamiliaFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="all">Todas las familias</option>
                      {familias.map(fam => (
                        <option key={fam.id} value={fam.id}>{fam.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {loading && !articulos.length ? (
                    <div className="text-center py-10"><RefreshCw className="animate-spin mx-auto text-purple-500" /></div>
                  ) : articulosFiltrados.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                      <Package size={40} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500">No hay artículos en el inventario</p>
                      <button onClick={() => setShowNuevoArticulo(true)} className="mt-4 text-purple-600 font-medium hover:underline">Crear el primero</button>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                          <tr>
                            <th className="text-left p-3">Artículo</th>
                            <th className="text-left p-3">Familia</th>
                            <th className="text-center p-3">Stock</th>
                            <th className="text-right p-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {articulosFiltrados.map(art => {
                            const estado = getEstadoStock(art);
                            return (
                              <tr key={art.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  <div className="font-medium text-slate-800">{art.nombre}</div>
                                  <div className="text-xs text-slate-500">{art.codigo}</div>
                                </td>
                                <td className="p-3 text-sm text-slate-600">{art.familia?.nombre}</td>
                                <td className="p-3 text-center">
                                  <div className="font-bold text-slate-800">{art.stockActual} <span className="text-slate-400 text-xs font-normal">{art.unidad}</span></div>
                                </td>
                                <td className="p-3 text-right">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${estado.color}`}>
                                    <estado.icon size={12} /> {estado.label}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* === TAB PETICIONES === */}
              {inventoryTab === 'peticiones' && (
                <div className="space-y-4">
                  {peticiones.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                      <ClipboardList size={40} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500">No hay peticiones realizadas</p>
                      <button onClick={() => setShowNuevaPeticion(true)} className="mt-4 text-blue-600 font-medium hover:underline">Solicitar material</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {peticiones.map(pet => (
                        <div key={pet.id} className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pet.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-600' :
                                pet.estado === 'aprobada' ? 'bg-blue-100 text-blue-600' :
                                  pet.estado === 'recibida' ? 'bg-green-100 text-green-600' : 'bg-slate-100'
                                }`}>
                                <ClipboardList size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800">{pet.nombreArticulo}</h4>
                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                  {pet.cantidad} {pet.unidad} • <Clock size={12} /> {new Date(pet.fechaSolicitud).toLocaleDateString()}
                                </p>
                                {pet.motivo && <p className="text-xs text-slate-500 mt-1 italic">"{pet.motivo}"</p>}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${pet.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                              pet.estado === 'aprobada' ? 'bg-blue-100 text-blue-700' :
                                pet.estado === 'recibida' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                              {pet.estado.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === TAB MOVIMIENTOS === */}
              {inventoryTab === 'movimientos' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3">
                    <Clock size={20} className="shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold">Historial de movimientos</p>
                      <p className="opacity-80">Mostrando los últimos 100 movimientos de tus artículos.</p>
                    </div>
                  </div>

                  {movimientos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <ArrowUpDown size={40} className="mx-auto mb-2 opacity-50" />
                      <p>No hay movimientos registrados</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="p-3 text-left">Artículo</th>
                            <th className="p-3 text-center">Tipo</th>
                            <th className="p-3 text-right">Cantidad</th>
                            <th className="p-3 text-left">Usuario</th>
                            <th className="p-3 text-right">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movimientos.map(mov => (
                            <tr key={mov.id}>
                              <td className="p-3 font-medium">{mov.articulo.nombre}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                                  mov.tipo === 'salida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                  }`}>{mov.tipo}</span>
                              </td>
                              <td className="p-3 text-right font-mono">{mov.cantidad}</td>
                              <td className="p-3 text-slate-500">{mov.usuario.nombre} {mov.usuario.apellidos}</td>
                              <td className="p-3 text-right text-slate-400 text-xs">{new Date(mov.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {showCursoDetails && selectedCurso && (
          <Modal title={`Curso: ${selectedCurso.nombre}`} onClose={closeCursoDetails} size="lg">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Código: <span className="font-mono text-slate-800">{selectedCurso.codigo}</span></p>
              <p className="text-sm text-slate-600">Duración: <span className="text-slate-800">{selectedCurso.duracionHoras} horas</span></p>
              {selectedCurso.validezMeses && <p className="text-sm text-slate-600">Validez: <span className="text-slate-800">{selectedCurso.validezMeses} meses</span></p>}
              <div className="text-sm text-slate-700">
                <h5 className="font-bold mb-1">Descripción</h5>
                <div className="prose max-w-none text-slate-600">{selectedCurso.descripcion || 'Sin descripción'}</div>
              </div>
              <div className="flex gap-2 justify-end">
                {isAdmin && (
                  <button onClick={() => { setCursoEditando(selectedCurso); closeCursoDetails(); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Editar curso</button>
                )}
                <button onClick={closeCursoDetails} className="px-4 py-2 bg-gray-100 rounded-lg">Cerrar</button>
              </div>
            </div>
          </Modal>
        )}

        {/* ================================================================================== */}
        {/* CONTENIDOS RESTANTES */}
        {/* ================================================================================== */}

        {mainTab === 'catalogo' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Catálogo de Cursos</h3>
                <p className="text-slate-600 text-sm">Gestión del catálogo de cursos de formación</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowNuevoCurso(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Plus size={18} /> Nuevo Curso
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                <p>Cargando...</p>
              </div>
            ) : cursos.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-4">No hay cursos en el catálogo</p>
                <button
                  onClick={() => setShowNuevoCurso(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus size={18} className="inline mr-2" />
                  Crear Primer Curso
                </button>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-3">Curso</div>
                  <div className="col-span-2">Área / Tipo</div>
                  <div className="col-span-2">Formador</div>
                  <div className="col-span-1 text-center">Horas</div>
                  <div className="col-span-1 text-center">Validez</div>
                  <div className="col-span-1 text-center">Ediciones</div>
                  <div className="col-span-1 text-center">Nivel</div>
                  <div className="col-span-1 text-right">Acciones</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {cursos.map(curso => (
                    <div key={curso.id}>
                      <div
                        className={`grid grid-cols-12 gap-2 px-4 py-3 hover:bg-slate-50 transition-colors items-center cursor-pointer ${!curso.activo ? 'opacity-50' : ''}`}
                        onClick={() => toggleCursoExpand(curso.id)}
                      >
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <BookOpen size={15} className="text-purple-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-800 text-sm leading-tight">{curso.nombre}</p>
                              <p className="text-xs text-slate-400 font-mono">{curso.codigo}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 flex flex-col gap-1">
                          {curso.areaVinculada && (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium w-fit ${getAreaColor(curso.areaVinculada)}`}>
                              {getAreaLabel(curso.areaVinculada)}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 capitalize">{curso.tipo}</span>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-slate-700">{curso.formadorPrincipal || <span className="text-slate-400 italic text-xs">No asignado</span>}</p>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="text-sm font-semibold text-slate-700">{curso.duracionHoras}h</span>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="text-sm text-slate-600">{curso.validezMeses ? `${curso.validezMeses}m` : '∞'}</span>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="text-sm font-semibold text-purple-600">{curso._count?.convocatorias || 0}</span>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="text-xs text-slate-500 capitalize">{curso.nivelFormacion || '—'}</span>
                        </div>
                        <div className="col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {(isAdmin || isFormacionMember) && (
                            <button onClick={() => setCursoEditando(curso)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Editar">
                              <Edit size={15} />
                            </button>
                          )}
                          <button onClick={() => toggleCursoExpand(curso.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <ArrowUpDown size={15} />
                          </button>
                        </div>
                      </div>
                      {expandedCursos[curso.id] && (
                        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-3">
                              {curso.descripcion && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Descripción</p><p className="text-slate-600 leading-relaxed">{curso.descripcion}</p></div>}
                              {curso.objetivos && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Objetivos</p><p className="text-slate-600 leading-relaxed">{curso.objetivos}</p></div>}
                              {curso.requisitosAcceso && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Requisitos</p><p className="text-slate-600 leading-relaxed">{curso.requisitosAcceso}</p></div>}
                            </div>
                            <div className="space-y-3">
                              {curso.temario && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Temario</p><p className="text-slate-600 leading-relaxed whitespace-pre-line">{curso.temario}</p></div>}
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                {curso.entidadOrganiza && <div><span className="font-medium text-slate-500">Organiza:</span> {curso.entidadOrganiza}</div>}
                                {curso.entidadCertifica && <div><span className="font-medium text-slate-500">Certifica:</span> {curso.entidadCertifica}</div>}
                                {curso.modalidad && <div><span className="font-medium text-slate-500">Modalidad:</span> <span className="capitalize">{curso.modalidad}</span></div>}
                                {curso.costoPorAlumno && curso.costoPorAlumno > 0 ? <div><span className="font-medium text-slate-500">Coste/alumno:</span> {curso.costoPorAlumno}€</div> : null}
                              </div>
                            </div>
                          </div>
                          {(isAdmin || isFormacionMember) && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                              <button
                                onClick={() => { setNuevaConvocatoriaData({ cursoId: curso.id, fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: curso.plazasMaximas || 20, horario: '', instructores: '', formadorNombre: '', formadorExterno: false }); setConvocatoriaEditando(null); setShowNuevaConvocatoria(true); }}
                                className="px-4 py-2 text-sm border border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
                              >
                                <Plus size={14} /> Nueva convocatoria de este curso
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
                {/* ... (Otros tabs como Convocatorias, Inscripciones, etc.) ... */}
        {mainTab === 'convocatorias' && (
          <div className="p-6">
            <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
              <h3 className="text-lg font-bold text-slate-800">Convocatorias</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border overflow-hidden text-sm">
                  {(['todas', 'abiertas', 'cerradas'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFiltroEstadoConv(f)}
                      className={`px-3 py-1.5 font-medium transition-colors ${filtroEstadoConv === f ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {f === 'todas' ? 'Todas' : f === 'abiertas' ? 'Abiertas' : 'Cerradas'}
                    </button>
                  ))}
                </div>
                {(isAdmin || isFormacionMember) && (
                  <button
                    onClick={() => { setConvocatoriaEditando(null); setNuevaConvocatoriaData({ cursoId: '', fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: 20, horario: '', instructores: '', formadorNombre: '', formadorExterno: false }); setShowNuevaConvocatoria(true); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} /> Nueva Convocatoria
                  </button>
                )}
              </div>
            </div>
            {(() => {
              const convsFiltradas = convocatorias.filter(c => {
                if (filtroEstadoConv === 'abiertas') return c.estado === 'inscripciones_abiertas';
                if (filtroEstadoConv === 'cerradas') return c.estado !== 'inscripciones_abiertas';
                return true;
              });
              return convsFiltradas.length === 0
                ? <p className="text-center py-10 text-slate-400">No hay convocatorias en este filtro</p>
                : (
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-3">Curso / Edición</div>
                  <div className="col-span-1">Área</div>
                  <div className="col-span-2">Fechas</div>
                  <div className="col-span-2">Formador / Lugar</div>
                  <div className="col-span-1 text-center">Plazas</div>
                  <div className="col-span-1 text-center">Estado</div>
                  <div className="col-span-2 text-right">Acciones</div>
                </div>
                <div className="divide-y divide-slate-100">
                {convsFiltradas.map(c => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-3">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{c.curso?.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono">{c.codigo}</span>
                        {(c as any).edicion && <span className="text-xs text-purple-600 font-medium">{(c as any).edicion}</span>}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {c.curso?.areaVinculada
                        ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getAreaColor(c.curso.areaVinculada)}`}>{getAreaLabel(c.curso.areaVinculada)}</span>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-600">{new Date(c.fechaInicio).toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'2-digit'})}</p>
                      <p className="text-xs text-slate-400">{new Date(c.fechaFin).toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'2-digit'})}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-700 truncate">{(c as any).formadorNombre || '—'}</p>
                      {c.lugar && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate"><MapPin size={10} className="shrink-0" />{c.lugar}</p>}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-semibold text-slate-700">{c.plazasOcupadas}</span>
                      <span className="text-xs text-slate-400">/{c.plazasDisponibles}</span>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                        <div className="bg-purple-500 h-1 rounded-full" style={{width: `${Math.min(100, (c.plazasOcupadas / Math.max(c.plazasDisponibles, 1)) * 100)}%`}}></div>
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold border ${getEstadoConvColor(c.estado)}`}>
                        {getEstadoConvLabel(c.estado)}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      {(isAdmin || isFormacionMember) ? (
                        <>
                          <button onClick={() => { setConvocatoriaEditando(c); setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, cursoId: c.curso?.id, fechaInicio: new Date(c.fechaInicio).toISOString().slice(0,10), fechaFin: new Date(c.fechaFin).toISOString().slice(0,10), lugar: c.lugar || '', plazasDisponibles: c.plazasDisponibles || 20, horario: c.horario || '', instructores: (c as any).instructores || '' }); setShowNuevaConvocatoria(true); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Editar"><Edit size={15} /></button>
                          <button onClick={() => handleOpenGestion(c)} className="p-1.5 text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Acta / Firmas"><FileText size={15} /></button>
                        </>
                      ) : (
                        c.estado === 'inscripciones_abiertas' && c.plazasOcupadas < c.plazasDisponibles ? (
                          <button onClick={() => handleOpenInscripcion(c)} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">Inscribirse</button>
                        ) : (
                          <button disabled className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed">No disponible</button>
                        )
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
              );
            })()}
          </div>
        )}

        {mainTab === 'inscripciones' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Gestión de Inscripciones</h3>
            {inscripciones.length === 0 ? <p className="text-center py-10 text-slate-400">No hay inscripciones registradas</p> : (
              <div className="overflow-hidden border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3 text-left">Usuario</th>
                      <th className="p-3 text-left">Curso / Convocatoria</th>
                      <th className="p-3 text-center">Fecha</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  {
                    (() => {
                      const grouped: Record<string, { convocatoria: any; inscritos: Inscripcion[] }> = {};
                      inscripciones.forEach((insc: Inscripcion) => {
                        const key = insc.convocatoria?.id || 'sin_convocatoria';
                        if (!grouped[key]) grouped[key] = { convocatoria: insc.convocatoria, inscritos: [] };
                        grouped[key].inscritos.push(insc);
                      });

                        return Object.values(grouped).map(g => (
                          <tbody key={g.convocatoria?.id || Math.random()} className="divide-y">
                            <tr className="bg-slate-50 hover:bg-slate-100 cursor-pointer">
                              <td className="p-3" colSpan={5} onClick={() => toggleConvocatoria(g.convocatoria.id)}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-slate-800">{g.convocatoria?.curso?.nombre}</div>
                                    <div className="text-xs text-slate-500">{g.convocatoria?.codigo} · {new Date(g.convocatoria?.fechaInicio || '').toLocaleDateString()} - {new Date(g.convocatoria?.fechaFin || '').toLocaleDateString()}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-sm text-slate-600">{g.inscritos.length} inscritos</div>
                                    <div className="flex items-center justify-end gap-2">
                                      {(isAdmin || isFormacionMember) ? (
                                        <>
                                          <button onClick={(e) => { e.stopPropagation(); handleOpenGestion(g.convocatoria); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">Acta / Firmas</button>
                                          <button onClick={(e) => { e.stopPropagation(); setConvocatoriaEditando(g.convocatoria); setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, cursoId: g.convocatoria.curso?.id, fechaInicio: new Date(g.convocatoria.fechaInicio).toISOString().slice(0,10), fechaFin: new Date(g.convocatoria.fechaFin).toISOString().slice(0,10), lugar: g.convocatoria.lugar || '', plazasDisponibles: g.convocatoria.plazasDisponibles || 20, horario: g.convocatoria.horario || '', instructores: (g.convocatoria as any).instructores || '' }); setShowNuevaConvocatoria(true); }} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">Editar</button>
                                        </>
                                      ) : (
                                        <button disabled className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs">Sin permiso</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {expandedConvocatorias[g.convocatoria.id] && g.inscritos.map(ins => (
                              <tr key={ins.id} className="hover:bg-white">
                                <td className="p-3">
                                  <div className="font-medium text-slate-800">{ins.usuario?.nombre} {ins.usuario?.apellidos}</div>
                                  <div className="text-xs text-slate-500">{ins.usuario?.numeroVoluntario}</div>
                                </td>
                                <td className="p-3">{ins.convocatoria?.curso?.nombre || ins.convocatoria?.codigo}</td>
                                <td className="p-3 text-center">{new Date(ins.fechaInscripcion).toLocaleDateString()}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${ins.estado === 'admitida' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{ins.estado}</span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {(isAdmin || isFormacionMember) && (
                                      <button onClick={(e) => { e.stopPropagation(); setSelectedConvocatoriaForGrading(g.convocatoria); setShowGestionConvocatoria(true); setInscripcionesGrading([ins]); }} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">Firmar</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        ));
                    })()
                  }
                </table>
              </div>
            )}
          </div>
        )}

        {mainTab === 'certificaciones' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Certificaciones Emitidas</h3>
            {certificaciones.length === 0 ? <p className="text-center py-10 text-slate-400">No hay certificaciones vigentes</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificaciones.map(cert => (
                  <div key={cert.id} className="border border-l-4 border-l-green-500 rounded-lg p-4 bg-white shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800">{cert.curso?.nombre}</h4>
                      <p className="text-sm text-slate-600">Otorgado a: {cert.usuario?.nombre} {cert.usuario?.apellidos}</p>
                      <p className="text-xs text-slate-400 mt-1">Fecha: {new Date(cert.fechaObtencion).toLocaleDateString()}</p>
                    </div>
                    <Award size={24} className="text-green-500 opacity-50" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab === 'asistencia' && (
          <div className="p-6">
            <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Registro de Asistencia</h3>
                <p className="text-slate-500 text-sm">Control de asistencia por jornada y recogida de firmas</p>
              </div>
              {(isAdmin || isFormacionMember) && convocatoriaAsistencia && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNuevaJornada({ fecha: '', numeroJornada: jornadasActivas.length + 1, titulo: '', horaInicio: '', horaFin: '' }); setShowNuevaJornada(true); }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus size={16} /> Nueva Jornada
                  </button>
                  <button
                    onClick={() => setShowNuevoExterno(true)}
                    className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Users size={16} /> Añadir Externo
                  </button>
                </div>
              )}
            </div>

            {/* Selector de convocatoria */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Seleccionar convocatoria</label>
              <select
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={convocatoriaAsistencia}
                onChange={e => {
                  setConvocatoriaAsistencia(e.target.value);
                  setJornadaSeleccionada('');
                  setJornadasActivas([]);
                  setRegistrosFirma([]);
                  if (e.target.value) cargarJornadas(e.target.value);
                }}
              >
                <option value="">-- Seleccionar curso/convocatoria --</option>
                {convocatorias.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.curso?.nombre} — {c.codigo} ({new Date(c.fechaInicio).toLocaleDateString('es-ES')} / {new Date(c.fechaFin).toLocaleDateString('es-ES')})
                  </option>
                ))}
              </select>
            </div>

            {convocatoriaAsistencia && (
              <>
                {jornadasActivas.length > 0 ? (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Jornadas</p>
                    <div className="flex gap-2 flex-wrap">
                      {jornadasActivas.map(j => (
                        <button
                          key={j.id}
                          onClick={() => { setJornadaSeleccionada(j.id); cargarRegistrosFirma(j.id); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${jornadaSeleccionada === j.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
                        >
                          <span className="font-semibold">Jornada {j.numeroJornada}</span>
                          {j.titulo && <span className="ml-1 text-xs opacity-75">— {j.titulo}</span>}
                          <span className="ml-2 text-xs opacity-75">{new Date(j.fecha).toLocaleDateString('es-ES')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 mb-6">
                    <CalendarDays size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-500 text-sm mb-3">No hay jornadas creadas para esta convocatoria</p>
                    {(isAdmin || isFormacionMember) && (
                      <button
                        onClick={() => { setNuevaJornada({ fecha: '', numeroJornada: 1, titulo: '', horaInicio: '', horaFin: '' }); setShowNuevaJornada(true); }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                      >
                        <Plus size={14} className="inline mr-1" /> Crear primera jornada
                      </button>
                    )}
                  </div>
                )}

                {jornadaSeleccionada && (
                  loadingAsistencia ? (
                    <div className="text-center py-8"><RefreshCw size={24} className="animate-spin mx-auto text-purple-400" /></div>
                  ) : registrosFirma.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                      <Users size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-slate-500 text-sm">No hay participantes en esta jornada</p>
                      <p className="text-slate-400 text-xs mt-1">Los inscritos confirmados aparecen automáticamente al crear la jornada</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <div className="col-span-3">Participante</div>
                        <div className="col-span-2">Organización</div>
                        <div className="col-span-1 text-center">Asistencia</div>
                        <div className="col-span-4">Firma</div>
                        <div className="col-span-2 text-center">Valoración</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {registrosFirma.map(reg => (
                          <div key={reg.id} className="grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-slate-50">
                            <div className="col-span-3">
                              <p className="font-medium text-slate-800 text-sm">
                                {reg.usuario
                                  ? `${reg.usuario.nombre} ${reg.usuario.apellidos}`
                                  : `${reg.participanteExterno?.nombre} ${reg.participanteExterno?.apellidos}`
                                }
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {reg.usuario?.numeroVoluntario && (
                                  <span className="text-xs text-slate-400 font-mono">{reg.usuario.numeroVoluntario}</span>
                                )}
                                {!reg.usuario && (
                                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Externo</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500">{reg.participanteExterno?.organizacion || 'Protección Civil Bormujos'}</p>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              {(isAdmin || isFormacionMember) ? (
                                <button
                                  onClick={() => handleToggleAsistencia(reg.id, !reg.asistio)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${reg.asistio ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                >
                                  {reg.asistio ? <CheckCircle size={18} /> : <X size={18} />}
                                </button>
                              ) : (
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${reg.asistio ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {reg.asistio ? <CheckCircle size={18} /> : <X size={18} />}
                                </span>
                              )}
                            </div>
                            <div className="col-span-4">
                              {reg.firmaBase64 ? (
                                <div className="flex items-center gap-3">
                                  <img src={reg.firmaBase64} alt="firma" className="h-10 object-contain border rounded bg-white p-1" />
                                  <span className="text-xs text-green-600 font-medium">Firmado</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Pendiente de firma</span>
                              )}
                            </div>
                            <div className="col-span-2 text-center">
                              {(isAdmin || isFormacionMember) ? (
                                <select
                                  className="w-full text-xs border border-slate-200 rounded-lg p-1.5"
                                  value={reg.valoracionFormador || ''}
                                  onChange={async (e) => {
                                    await fetch('/api/formacion', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ tipo: 'registro-firma', id: reg.id, valoracionFormador: e.target.value })
                                    });
                                    await cargarRegistrosFirma(jornadaSeleccionada);
                                  }}
                                >
                                  <option value="">Sin valorar</option>
                                  <option value="apto">Apto</option>
                                  <option value="no_apto">No apto</option>
                                  <option value="pendiente">Pendiente</option>
                                </select>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded font-medium ${reg.valoracionFormador === 'apto' ? 'bg-green-100 text-green-700' : reg.valoracionFormador === 'no_apto' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {reg.valoracionFormador === 'apto' ? 'Apto' : reg.valoracionFormador === 'no_apto' ? 'No apto' : '—'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}
        {mainTab === 'necesidades' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Necesidades Formativas</h3>
              <button onClick={() => setShowNuevaNecesidad(true)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2">
                <Plus size={18} /> Nueva Necesidad
              </button>
            </div>
            {necesidades.length === 0 ? <p className="text-center py-10 text-slate-400">No hay necesidades registradas</p> : (
              <div className="space-y-3">
                {necesidades.map(nec => (
                  <div key={nec.id} className="border rounded-xl p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between mb-2">
                      <h4 className="font-bold text-slate-800">{nec.descripcion}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${nec.prioridad <= 1 ? 'bg-red-100 text-red-700' :
                        nec.prioridad === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>Prio: {nec.prioridad}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{nec.motivo}</p>
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span>Detectado: {new Date(nec.fechaDeteccion).toLocaleDateString()}</span>
                      <span>Área: {nec.areaAfectada}</span>
                      <span>Personas: {nec.numeroPersonas}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: Nueva Jornada */}
      {showNuevaJornada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-800">Nueva Jornada</h3>
              <button onClick={() => setShowNuevaJornada(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nº jornada</label>
                  <input type="number" min="1" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevaJornada.numeroJornada} onChange={e => setNuevaJornada({ ...nuevaJornada, numeroJornada: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevaJornada.fecha} onChange={e => setNuevaJornada({ ...nuevaJornada, fecha: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título (opcional)</label>
                <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Ej: Jornada teórica..." value={nuevaJornada.titulo} onChange={e => setNuevaJornada({ ...nuevaJornada, titulo: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora inicio</label>
                  <input type="time" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevaJornada.horaInicio} onChange={e => setNuevaJornada({ ...nuevaJornada, horaInicio: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora fin</label>
                  <input type="time" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevaJornada.horaFin} onChange={e => setNuevaJornada({ ...nuevaJornada, horaFin: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button onClick={() => setShowNuevaJornada(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleCrearJornada} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Crear Jornada</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Participante Externo */}
      {showNuevoExterno && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-800">Participante Externo</h3>
              <button onClick={() => setShowNuevoExterno(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Participante ajeno al servicio. Se registrará en el acta de la formación.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevoExterno.nombre} onChange={e => setNuevoExterno({ ...nuevoExterno, nombre: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevoExterno.apellidos} onChange={e => setNuevoExterno({ ...nuevoExterno, apellidos: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevoExterno.dni} onChange={e => setNuevoExterno({ ...nuevoExterno, dni: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevoExterno.telefono} onChange={e => setNuevoExterno({ ...nuevoExterno, telefono: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Organización</label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Ayuntamiento, Cruz Roja..." value={nuevoExterno.organizacion} onChange={e => setNuevoExterno({ ...nuevoExterno, organizacion: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevoExterno.cargo} onChange={e => setNuevoExterno({ ...nuevoExterno, cargo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={nuevoExterno.email} onChange={e => setNuevoExterno({ ...nuevoExterno, email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button onClick={() => setShowNuevoExterno(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleCrearParticipanteExterno} className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODALES */}
      {/* ============================================ */}

      {/* MODAL: Nuevo Artículo */}
      {showNuevoArticulo && (
        <Modal title="Nuevo Artículo (Formación)" onClose={() => setShowNuevoArticulo(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del artículo <span className="text-red-500">*</span></label>
              <input type="text" className="w-full border rounded-lg p-2" value={nuevoArticulo.nombre} onChange={e => setNuevoArticulo({ ...nuevoArticulo, nombre: e.target.value })} placeholder="Ej. Manual Básico de Primeros Auxilios" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea className="w-full border rounded-lg p-2 h-20" value={nuevoArticulo.descripcion} onChange={e => setNuevoArticulo({ ...nuevoArticulo, descripcion: e.target.value })} placeholder="Detalles adicionales del artículo..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código / Referencia</label>
                <input type="text" className="w-full border rounded-lg p-2" value={nuevoArticulo.codigo} onChange={e => setNuevoArticulo({ ...nuevoArticulo, codigo: e.target.value })} placeholder="Ej. MAT-FORM-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Familia/Categoría <span className="text-red-500">*</span></label>
                <select className="w-full border rounded-lg p-2" value={nuevoArticulo.familiaId} onChange={e => setNuevoArticulo({ ...nuevoArticulo, familiaId: e.target.value })}>
                  <option value="">Seleccionar familia...</option>
                  {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label>
                <input type="number" className="w-full border rounded-lg p-2" value={nuevoArticulo.stockActual} onChange={e => setNuevoArticulo({ ...nuevoArticulo, stockActual: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
                <input type="number" className="w-full border rounded-lg p-2" value={nuevoArticulo.stockMinimo} onChange={e => setNuevoArticulo({ ...nuevoArticulo, stockMinimo: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                <select className="w-full border rounded-lg p-2" value={nuevoArticulo.unidad} onChange={e => setNuevoArticulo({ ...nuevoArticulo, unidad: e.target.value })}>
                  <option value="unidad">Unidad</option>
                  <option value="caja">Caja</option>
                  <option value="paquete">Paquete</option>
                  <option value="par">Par</option>
                  <option value="litro">Litro</option>
                  <option value="kg">Kg</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={nuevoArticulo.tieneCaducidad} onChange={e => setNuevoArticulo({ ...nuevoArticulo, tieneCaducidad: e.target.checked })} />
                <span className="text-sm font-medium text-slate-700">Este artículo tiene fecha de caducidad</span>
              </label>
              {nuevoArticulo.tieneCaducidad && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Caducidad</label>
                  <input type="date" className="border rounded-lg p-2" value={nuevoArticulo.fechaCaducidad} onChange={e => setNuevoArticulo({ ...nuevoArticulo, fechaCaducidad: e.target.value })} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 bg-slate-50 -mx-6 -mb-6 p-4 mt-4 border-t">
              <button onClick={() => setShowNuevoArticulo(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarArticulo} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm font-medium">Crear Artículo</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Nueva Petición */}
      {showNuevaPeticion && (
        <Modal title="Nueva Petición de Material" onClose={() => setShowNuevaPeticion(false)} size="lg">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 flex items-start gap-3 border border-blue-100">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="font-bold mb-1">Petición desde Área de Formación</p>
                <p>Estás solicitando material que se cargará al presupuesto/inventario de Formación. Esta petición será revisada por el responsable de Logística.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Material / Artículo <span className="text-red-500">*</span></label>
                <input type="text" className="w-full border rounded-lg p-2" value={nuevaPeticion.nombreArticulo} onChange={e => setNuevaPeticion({ ...nuevaPeticion, nombreArticulo: e.target.value })} placeholder="¿Qué necesitas?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad <span className="text-red-500">*</span></label>
                  <input type="number" min="1" className="w-full border rounded-lg p-2" value={nuevaPeticion.cantidad} onChange={e => setNuevaPeticion({ ...nuevaPeticion, cantidad: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                  <select className="w-full border rounded-lg p-2" value={nuevaPeticion.prioridad} onChange={e => setNuevaPeticion({ ...nuevaPeticion, prioridad: e.target.value })}>
                    <option value="baja">Baja (Sin urgencia)</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente (Crítico)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de la solicitud <span className="text-red-500">*</span></label>
                <select className="w-full border rounded-lg p-2 mb-2" value={nuevaPeticion.motivo} onChange={e => setNuevaPeticion({ ...nuevaPeticion, motivo: e.target.value })}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="reposicion">Reposición de stock agotado</option>
                  <option value="nuevo_material">Necesidad de nuevo material</option>
                  <option value="curso_especifico">Material para curso específico</option>
                  <option value="deterioro">Sustitución por deterioro/rotura</option>
                  <option value="otro">Otro motivo</option>
                </select>
                {nuevaPeticion.motivo === 'otro' && (
                  <input type="text" className="w-full border rounded-lg p-2 mt-2" placeholder="Especificar otro motivo..." />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones / Detalles adicionales</label>
                <textarea className="w-full border rounded-lg p-2 h-24" value={nuevaPeticion.descripcion} onChange={e => setNuevaPeticion({ ...nuevaPeticion, descripcion: e.target.value })} placeholder="Explica detalladamente para qué es necesario, si hay alguna preferencia de marca, etc." />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 bg-slate-50 -mx-6 -mb-6 p-4 mt-4 border-t">
              <button onClick={() => setShowNuevaPeticion(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarPeticion} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium flex items-center gap-2">
                <Send size={18} /> Enviar Petición
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Nuevo/Editar Curso */}
      {showNuevoCurso && (
        <Modal title={cursoEditando ? 'Editar Curso' : 'Crear Nuevo Curso'} onClose={() => { setShowNuevoCurso(false); setCursoEditando(null); }} size="lg">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Curso <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  placeholder="Ej. Soporte Vital Básico"
                  value={nuevoCurso.nombre}
                  onChange={e => setNuevoCurso({ ...nuevoCurso, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 uppercase"
                  placeholder="Ej. SVB-2024"
                  value={nuevoCurso.codigo}
                  onChange={e => setNuevoCurso({ ...nuevoCurso, codigo: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea
                className="w-full border rounded-lg p-2 h-24"
                placeholder="Objetivos y contenido del curso..."
                value={nuevoCurso.descripcion}
                onChange={e => setNuevoCurso({ ...nuevoCurso, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Formación</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={nuevoCurso.tipo}
                  onChange={e => setNuevoCurso({ ...nuevoCurso, tipo: e.target.value })}
                >
                  <option value="interna">Formación Interna</option>
                  <option value="externa">Formación Externa</option>
                  <option value="iespa">IESPA</option>
                  <option value="reciclaje">Reciclaje</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duración (Horas) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  className="w-full border rounded-lg p-2"
                  value={nuevoCurso.duracionHoras}
                  onChange={e => setNuevoCurso({ ...nuevoCurso, duracionHoras: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Validez (Meses)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded-lg p-2"
                  placeholder="0 = Indefinida"
                  value={nuevoCurso.validezMeses}
                  onChange={e => setNuevoCurso({ ...nuevoCurso, validezMeses: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Formador Principal</label>
                <input type="text" className="w-full border rounded-lg p-2" placeholder="Nombre del formador habitual..." value={nuevoCurso.formadorPrincipal} onChange={e => setNuevoCurso({ ...nuevoCurso, formadorPrincipal: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entidad que Organiza</label>
                <input type="text" className="w-full border rounded-lg p-2" placeholder="Ej. Cruz Roja, IESPA..." value={nuevoCurso.entidadOrganiza} onChange={e => setNuevoCurso({ ...nuevoCurso, entidadOrganiza: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entidad que Certifica</label>
              <input type="text" className="w-full border rounded-lg p-2" placeholder="Ej. Consejería de Salud, DGT..." value={nuevoCurso.entidadCertifica} onChange={e => setNuevoCurso({ ...nuevoCurso, entidadCertifica: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cursoActivo"
                className="w-4 h-4 text-purple-600 rounded"
                checked={nuevoCurso.activo}
                onChange={e => setNuevoCurso({ ...nuevoCurso, activo: e.target.checked })}
              />
              <label htmlFor="cursoActivo" className="text-sm font-medium text-slate-700">Curso Activo</label>
            </div>

            <div className="flex justify-end gap-2 pt-4 bg-slate-50 -mx-6 -mb-6 p-4 mt-4 border-t">
              <button onClick={() => { setShowNuevoCurso(false); setCursoEditando(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarCurso} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm font-medium">
                {cursoEditando ? 'Guardar Cambios' : 'Crear Curso'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Confirmar Inscripción */}
      {showInscripcionModal && convocatoriaSeleccionada && (
        <Modal title="Confirmar Inscripción" onClose={() => setShowInscripcionModal(false)} size="md">
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-bold text-purple-900 text-lg">{convocatoriaSeleccionada.curso?.nombre}</h4>
              <p className="text-purple-700 text-sm mt-1">{convocatoriaSeleccionada.codigo}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={18} className="text-slate-400" />
                <span>
                  <strong>Fecha:</strong> {new Date(convocatoriaSeleccionada.fechaInicio).toLocaleDateString()} - {new Date(convocatoriaSeleccionada.fechaFin).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={18} className="text-slate-400" />
                <span>
                  <strong>Lugar:</strong> {convocatoriaSeleccionada.lugar || 'Por determinar'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <Users size={18} className="text-slate-400" />
                <span>
                  <strong>Plazas:</strong> {convocatoriaSeleccionada.plazasOcupadas} / {convocatoriaSeleccionada.plazasDisponibles} ocupadas
                </span>
              </div>

              {convocatoriaSeleccionada.horario && (
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={18} className="text-slate-400" />
                  <span>
                    <strong>Horario:</strong> {convocatoriaSeleccionada.horario}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p>Plazas disponibles restantes: <strong>{convocatoriaSeleccionada.plazasDisponibles - convocatoriaSeleccionada.plazasOcupadas}</strong></p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowInscripcionModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarInscripcion}
                disabled={inscripcionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inscripcionLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>✅ Confirmar Inscripción</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Nueva Convocatoria */}
      {showNuevaConvocatoria && (
        <Modal title={convocatoriaEditando ? 'Editar Convocatoria' : 'Nueva Convocatoria'} onClose={() => { setShowNuevaConvocatoria(false); setConvocatoriaEditando(null); }} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Curso <span className="text-red-500">*</span></label>
              <select className="w-full border rounded-lg p-2" value={nuevaConvocatoriaData.cursoId} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, cursoId: e.target.value })}>
                <option value="">Seleccionar curso...</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border rounded-lg p-2" value={nuevaConvocatoriaData.fechaInicio} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, fechaInicio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border rounded-lg p-2" value={nuevaConvocatoriaData.fechaFin} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, fechaFin: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                <input type="text" className="w-full border rounded-lg p-2" placeholder="Ej. Aula 1" value={nuevaConvocatoriaData.lugar} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, lugar: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plazas</label>
                <input type="number" className="w-full border rounded-lg p-2" value={nuevaConvocatoriaData.plazasDisponibles} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, plazasDisponibles: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Instructores</label>
              <input type="text" className="w-full border rounded-lg p-2" placeholder="Nombres de instructores..." value={nuevaConvocatoriaData.instructores} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, instructores: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Formador de esta edición</label>
                <input type="text" className="w-full border rounded-lg p-2" placeholder="Nombre del formador..." value={nuevaConvocatoriaData.formadorNombre} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, formadorNombre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="formadorExterno" className="w-4 h-4 rounded" checked={nuevaConvocatoriaData.formadorExterno} onChange={e => setNuevaConvocatoriaData({ ...nuevaConvocatoriaData, formadorExterno: e.target.checked })} />
                <label htmlFor="formadorExterno" className="text-sm font-medium text-slate-700">Formador externo</label>
              </div>
            </div>
              <div className="flex justify-end gap-2 pt-4 bg-slate-50 -mx-6 -mb-6 p-4 mt-4 border-t">
                <button onClick={() => { setShowNuevaConvocatoria(false); setConvocatoriaEditando(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button onClick={handleGuardarConvocatoria} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">{convocatoriaEditando ? 'Guardar Cambios' : 'Crear Convocatoria'}</button>
              </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Nueva Necesidad */}
      {showNuevaNecesidad && (
        <Modal title="Registrar Necesidad Formativa" onClose={() => setShowNuevaNecesidad(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción de la necesidad <span className="text-red-500">*</span></label>
              <textarea className="w-full border rounded-lg p-2 h-20" placeholder="¿Qué formación se necesita?" value={nuevaNecesidadData.descripcion} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Área Afectada <span className="text-red-500">*</span></label>
                <select className="w-full border rounded-lg p-2" value={nuevaNecesidadData.areaAfectada} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, areaAfectada: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  <option value="sanitaria">Sanitaria</option>
                  <option value="logistica">Logística</option>
                  <option value="comunicaciones">Comunicaciones</option>
                  <option value="rescate">Rescate</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nº Personas</label>
                <input type="number" min="1" className="w-full border rounded-lg p-2" value={nuevaNecesidadData.numeroPersonas} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, numeroPersonas: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Justificación</label>
              <input type="text" className="w-full border rounded-lg p-2" placeholder="Ej. Nuevos protocolos, incorporación de voluntarios..." value={nuevaNecesidadData.motivo} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, motivo: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                <select className="w-full border rounded-lg p-2" value={nuevaNecesidadData.prioridad} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, prioridad: parseInt(e.target.value) })}>
                  <option value="1">Alta (1)</option>
                  <option value="2">Media (2)</option>
                  <option value="3">Baja (3)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Impacto</label>
                <select className="w-full border rounded-lg p-2" value={nuevaNecesidadData.impacto} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, impacto: e.target.value })}>
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="bajo">Bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urgencia</label>
                <select className="w-full border rounded-lg p-2" value={nuevaNecesidadData.urgencia} onChange={e => setNuevaNecesidadData({ ...nuevaNecesidadData, urgencia: e.target.value })}>
                  <option value="inmediata">Inmediata</option>
                  <option value="normal">Normal</option>
                  <option value="planificable">Planificable</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 bg-slate-50 -mx-6 -mb-6 p-4 mt-4 border-t">
              <button onClick={() => setShowNuevaNecesidad(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarNecesidad} className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm font-medium">Registrar Necesidad</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Gestionar Convocatoria / Cerrar Acta */}
      {showGestionConvocatoria && selectedConvocatoriaForGrading && (
        <Modal title={`Gestionar: ${selectedConvocatoriaForGrading.curso?.nombre || 'Convocatoria'}`} onClose={() => setShowGestionConvocatoria(false)} size="xl">
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="block text-slate-500 text-xs uppercase font-bold">Código</span>
                  <span className="font-mono font-medium text-slate-800">{selectedConvocatoriaForGrading.codigo}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs uppercase font-bold">Fechas</span>
                  <span className="text-slate-800">
                    {new Date(selectedConvocatoriaForGrading.fechaInicio).toLocaleDateString()} - {new Date(selectedConvocatoriaForGrading.fechaFin).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs uppercase font-bold">Estado</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedConvocatoriaForGrading.estado === 'finalizada' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selectedConvocatoriaForGrading.estado}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800">Listado de Alumnos ({inscripcionesGrading.length})</h4>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                    🖨️ Imprimir Acta
                  </button>
                </div>
              </div>

              {loadingGrading ? (
                <div className="py-10 text-center"><RefreshCw className="animate-spin mx-auto text-purple-600" /></div>
              ) : inscripcionesGrading.length === 0 ? (
                <div className="py-10 text-center text-slate-500 border-2 border-dashed rounded-xl">No hay alumnos inscritos.</div>
              ) : (
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-xs">
                      <tr>
                        <th className="p-3 text-left">Voluntario</th>
                        <th className="p-3 text-center w-24">Asistencia %</th>
                        <th className="p-3 text-center w-20">Nota</th>
                        <th className="p-3 text-center w-24">Apto</th>
                        <th className="p-3 text-center w-24">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inscripcionesGrading.map((insc) => (
                        <tr key={insc.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{insc.usuario?.nombre} {insc.usuario?.apellidos}</div>
                            <div className="text-xs text-slate-500">{insc.usuario?.numeroVoluntario || 'Sin N.V.'}</div>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full border rounded p-1 text-center"
                              value={insc.porcentajeAsistencia || 0}
                              onChange={(e) => handleUpdateInscripcion(insc.id, 'porcentajeAsistencia', parseFloat(e.target.value))}
                              disabled={selectedConvocatoriaForGrading.estado === 'finalizada'}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-full border rounded p-1 text-center"
                              value={insc.notaFinal || 0}
                              onChange={(e) => handleUpdateInscripcion(insc.id, 'notaFinal', parseFloat(e.target.value))}
                              disabled={selectedConvocatoriaForGrading.estado === 'finalizada'}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                              checked={insc.apto || false}
                              onChange={(e) => handleUpdateInscripcion(insc.id, 'apto', e.target.checked)}
                              disabled={selectedConvocatoriaForGrading.estado === 'finalizada'}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${insc.estado === 'admitida' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {insc.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sección: Tabla de Firmas */}
              {inscripcionesGrading.length > 0 && (
                <div className="mt-6">
                  <h5 className="font-bold text-slate-800 mb-3">Firmas</h5>
                  <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-xs">
                        <tr>
                          <th className="p-3 text-left">Voluntario</th>
                          <th className="p-3 text-center w-48">Firma</th>
                          <th className="p-3 text-center">Fecha Firma</th>
                          <th className="p-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inscripcionesGrading.map(ins => (
                          <tr key={ins.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{ins.usuario?.nombre} {ins.usuario?.apellidos}</div>
                              <div className="text-xs text-slate-500">{ins.usuario?.numeroVoluntario || 'Sin N.V.'}</div>
                            </td>
                            <td className="p-3 text-center">
                              {ins.firmaBiometrica ? (
                                <img src={ins.firmaBiometrica} alt="firma" className="mx-auto h-12 object-contain" />
                              ) : (
                                <div className="mx-auto h-12 w-36 border border-dashed rounded flex items-center justify-center text-xs text-slate-400">Sin firma</div>
                              )}
                            </td>
                            <td className="p-3 text-center text-xs text-slate-600">{ins.fechaFirma ? new Date(ins.fechaFirma).toLocaleString() : '-'}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(isAdmin || isFormacionMember) ? (
                                  <>
                                    <button onClick={() => handleOpenFirma(ins)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">Firmar</button>
                                    {ins.firmaBiometrica && (
                                      <a href={ins.firmaBiometrica} target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">Abrir</a>
                                    )}
                                  </>
                                ) : (
                                  <button disabled className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs">Sin permiso</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Firmas por participante — admin/formacion gestionan, cada voluntario puede firmar la suya */}
              <div className="mt-6">
                <h5 className="font-bold text-slate-800 mb-3">
                  ✍️ Firmas de asistencia
                  {!(isAdmin || isFormacionMember) && (
                    <span className="ml-2 text-xs text-slate-400 font-normal">Puedes firmar tu propia asistencia</span>
                  )}
                </h5>
                <div className="space-y-4">
                  {inscripcionesGrading.map(ins => {
                    const esPropio = currentUser?.id === ins.usuario?.id;
                    const puedeFirmar = isAdmin || isFormacionMember || esPropio;
                    return (
                      <div key={`firma-${ins.id}`} className="border rounded-xl p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-800">{ins.usuario?.nombre} {ins.usuario?.apellidos}</p>
                            <p className="text-xs text-slate-400">{ins.usuario?.numeroVoluntario || 'Sin N.V.'}</p>
                          </div>
                          {ins.firmaBiometrica
                            ? <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">✅ Firmado {ins.fechaFirma ? new Date(ins.fechaFirma).toLocaleDateString() : ''}</span>
                            : <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">⏳ Pendiente firma</span>
                          }
                        </div>
                        {ins.firmaBiometrica ? (
                          <div className="flex items-center gap-4">
                            <img src={ins.firmaBiometrica} alt="firma" className="h-14 object-contain border rounded-lg bg-slate-50 p-1" />
                            {(isAdmin || isFormacionMember) && (
                              <button
                                onClick={() => handleOpenFirma(ins)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Repetir firma
                              </button>
                            )}
                          </div>
                        ) : puedeFirmar ? (
                          <div>
                            <p className="text-xs text-slate-500 mb-2">
                              {esPropio && !(isAdmin || isFormacionMember) ? 'Firma aquí para registrar tu asistencia:' : `Capturar firma de ${ins.usuario?.nombre}:`}
                            </p>
                            <SignatureCanvas
                              initialSignature=""
                              onSave={(dataUrl) => handleSaveFirma(ins.id, dataUrl)}
                              label={esPropio && !(isAdmin || isFormacionMember) ? 'Tu firma' : `Firma de ${ins.usuario?.nombre}`}
                            />
                          </div>
                        ) : (
                          <div className="h-10 border border-dashed rounded-lg flex items-center justify-center text-xs text-slate-400 bg-slate-50">
                            Sin permisos para firmar en este dispositivo
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t gap-3 bg-slate-50 -mx-6 -mb-6 p-4 mt-4">
              <button onClick={() => setShowGestionConvocatoria(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                Cerrar Ventana
              </button>
              {selectedConvocatoriaForGrading.estado !== 'finalizada' && (
                <button
                  onClick={handleCerrarActa}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md font-medium flex items-center gap-2"
                >
                  <Award size={18} /> Cerrar Acta y Certificar
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
