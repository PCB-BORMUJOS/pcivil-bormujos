'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus, Search, RefreshCw, Package, Users, Calendar, BookOpen,
  Award, AlertCircle, Layers, Edit, Trash2, X, ClipboardList,
  ArrowUpDown, Send, CheckCircle, AlertTriangle, Clock, ShoppingCart, Ban,
  MapPin, Tag, FileText, CalendarDays
} from 'lucide-react';

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
  _count?: {
    convocatorias: number;
    certificaciones: number;
  };
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

  // Estados principales
  const [mainTab, setMainTab] = useState<'inventario' | 'catalogo' | 'convocatorias' | 'inscripciones' | 'certificaciones' | 'necesidades'>('inventario');
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
  const [showNuevaConvocatoria, setShowNuevaConvocatoria] = useState(false);

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
    activo: true
  });

  const [nuevaConvocatoriaData, setNuevaConvocatoriaData] = useState({
    cursoId: '', fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: 20, horario: '', instructores: ''
  });
  const [nuevaNecesidadData, setNuevaNecesidadData] = useState({
    descripcion: '', areaAfectada: '', numeroPersonas: 1, motivo: '', prioridad: 3, impacto: 'medio', urgencia: 'normal'
  });
  const [showNuevaNecesidad, setShowNuevaNecesidad] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [mainTab]);

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
            setCurrentUser(userData.usuario);
            setIsAdmin(userData.usuario.rol?.nombre === 'ADMIN' || userData.usuario.rol?.nombre === 'admin');
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
      const res = await fetch('/api/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'curso',
          nombre: nuevoCurso.nombre,
          codigo: nuevoCurso.codigo,
          descripcion: nuevoCurso.descripcion,
          tipo_curso: nuevoCurso.tipo, // Rename to avoid conflict with 'tipo' action
          duracionHoras: Number(nuevoCurso.duracionHoras),
          validezMeses: nuevoCurso.validezMeses ? Number(nuevoCurso.validezMeses) : null,
          activo: nuevoCurso.activo
        })
      });

      if (res.ok) {
        setShowNuevoCurso(false);
        setNuevoCurso({
          codigo: '', nombre: '', descripcion: '', tipo: 'interna',
          duracionHoras: 0, validezMeses: 0, activo: true
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
        setNuevaConvocatoriaData({ cursoId: '', fechaInicio: '', fechaFin: '', lugar: '', plazasDisponibles: 20, horario: '', instructores: '' });
        cargarConvocatorias();
        alert('✅ Convocatoria creada');
      } else {
        alert('Error al crear convocatoria');
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cursos.map(curso => (
                  <div key={curso.id} className="bg-white border-2 border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                          <BookOpen size={24} className="text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{curso.nombre}</h4>
                          <p className="text-sm text-slate-500">{curso.codigo}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-slate-600">{curso.duracionHoras} horas</span>
                      </div>
                      {curso.validezMeses && (
                        <div className="flex items-center gap-2 text-sm">
                          <Award size={14} className="text-slate-400" />
                          <span className="text-slate-600">Validez: {curso.validezMeses} meses</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-slate-600">{curso._count?.convocatorias || 0} convocatorias</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {curso.tipo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ... (Otros tabs como Convocatorias, Inscripciones, etc.) ... */}
        {mainTab === 'convocatorias' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Convocatorias</h3>
              {isAdmin && (
                <button onClick={() => setShowNuevaConvocatoria(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus size={18} /> Nueva Convocatoria
                </button>
              )}
            </div>
            {convocatorias.length === 0 ? <p className="text-center py-10 text-slate-400">No hay convocatorias registradas</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {convocatorias.map(c => (
                  <div key={c.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{c.curso?.nombre}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">{c.codigo}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.estado === 'inscripciones_abiertas' ? 'bg-green-100 text-green-700' :
                        c.estado === 'planificada' ? 'bg-blue-100 text-blue-700' :
                          c.estado === 'en_curso' ? 'bg-purple-100 text-purple-700' :
                            c.estado === 'finalizada' ? 'bg-gray-100 text-gray-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {c.estado === 'inscripciones_abiertas' ? 'ABIERTA' : c.estado}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" /> {new Date(c.fechaInicio).toLocaleDateString()} - {new Date(c.fechaFin).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {c.lugar || 'Sin ubicación'}</div>
                      <div className="flex items-center gap-2"><Users size={16} className="text-slate-400" /> {c.plazasOcupadas} / {c.plazasDisponibles} plazas</div>
                    </div>

                    <div className="pt-3 border-t flex gap-2">
                      {isAdmin ? (
                        <>
                          <button onClick={() => setShowNuevaConvocatoria(true)} className="flex-1 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Editar</button>
                          <button onClick={() => handleOpenGestion(c)} className="flex-1 py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">Gestionar / Calificar</button>
                        </>
                      ) : (
                        c.estado === 'inscripciones_abiertas' && c.plazasOcupadas < c.plazasDisponibles ? (
                          <button
                            onClick={() => handleApuntarse(c.id)}
                            className="flex-1 py-2 text-center text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                          >
                            📝 Apuntarse
                          </button>
                        ) : c.estado === 'inscripciones_abiertas' && c.plazasOcupadas >= c.plazasDisponibles ? (
                          <button disabled className="flex-1 py-2 text-center text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed">
                            Completo
                          </button>
                        ) : (
                          <button disabled className="flex-1 py-2 text-center text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed">
                            No disponible
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  <tbody className="divide-y">
                    {inscripciones.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{i.usuario?.nombre} {i.usuario?.apellidos}</div>
                          <div className="text-xs text-slate-500">{i.usuario?.numeroVoluntario}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{i.convocatoria?.curso?.nombre}</div>
                          <div className="text-xs text-slate-500">{i.convocatoria?.codigo}</div>
                        </td>
                        <td className="p-3 text-center text-slate-500">{new Date(i.fechaInscripcion).toLocaleDateString()}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${i.estado === 'admitida' ? 'bg-green-100 text-green-700' :
                            i.estado === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{i.estado}</span>
                        </td>
                        <td className="p-3 text-right">
                          {i.estado === 'pendiente' && (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleEstadoInscripcion(i.id, 'admitida')} className="p-1.5 text-green-600 hover:bg-green-100 rounded" title="Admitir"><CheckCircle size={18} /></button>
                              <button onClick={() => handleEstadoInscripcion(i.id, 'rechazada')} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Rechazar"><Ban size={18} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
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

      {/* MODAL: Nuevo Curso */}
      {showNuevoCurso && (
        <Modal title="Crear Nuevo Curso" onClose={() => setShowNuevoCurso(false)} size="lg">
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
              <button onClick={() => setShowNuevoCurso(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarCurso} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm font-medium">
                Crear Curso
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Nueva Convocatoria */}
      {showNuevaConvocatoria && (
        <Modal title="Nueva Convocatoria" onClose={() => setShowNuevaConvocatoria(false)} size="lg">
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
            <div className="flex justify-end gap-2 pt-4 bg-slate-50 -mx-6 -mb-6 p-4 mt-4 border-t">
              <button onClick={() => setShowNuevaConvocatoria(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleGuardarConvocatoria} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">Crear Convocatoria</button>
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
