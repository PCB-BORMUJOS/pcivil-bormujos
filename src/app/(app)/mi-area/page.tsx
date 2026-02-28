'use client';

import NotificacionesTab from '@/components/NotificacionesTab'
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  User, GraduationCap, Clock, FileText, Bell, Save, Edit, Upload,
  Calendar, Award, CheckCircle, XCircle, AlertTriangle, Plus,
  Download, Eye, Trash2, X, ChevronRight, MapPin, Phone, Mail,
  Shield, Settings, Lock, Send, FileCheck, Car, CreditCard, Heart, Wallet
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================
interface Formacion {
  id: string;
  nombre: string;
  tipo: string;
  fechaObtencion: string;
  fechaValidez?: string;
  entidad: string;
  horas?: number;
  documentoUrl?: string;
  documentoNombre?: string;
  estado: 'vigente' | 'por_vencer' | 'vencido';
}

interface Actividad {
  id: string;
  tipo: 'servicio' | 'formacion' | 'evento' | 'reunion';
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  descripcion?: string;
  turno?: string;
}

interface Documento {
  id: string;
  tipo: string;
  nombre: string;
  fechaSubida: string;
  fechaVencimiento?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  estado: 'vigente' | 'por_vencer' | 'vencido';
}

interface AsignacionVestuario {
  id: string;
  tipoPrenda: string;
  talla: string;
  cantidad: number;
  fechaAsignacion: string;
  fechaBaja?: string;
  estado: string;
  observaciones?: string;
}

interface SolicitudVestuario {
  id: string;
  tipoPrenda: string;
  talla: string;
  cantidad: number;
  motivo: string;
  descripcion?: string;
  estado: string;
  fechaSolicitud: string;
  fechaRespuesta?: string;
  comentarioRespuesta?: string;
  asignacionAnteriorId?: string;
}

interface DatosPersonales {
  // Datos básicos
  nombre: string;
  apellidos: string;
  dni: string;
  fechaNacimiento: string;
  sexo: string;
  email: string;
  telefono: string;
  telefonoEmergencia: string;
  contactoEmergencia: string;

  // Dirección
  domicilio: string;
  numero: string;
  piso: string;
  codigoPostal: string;
  localidad: string;
  provincia: string;

  // Datos del servicio
  numeroVoluntario: string;
  indicativo2: string;
  fechaAlta: string;
  fechaBaja: string;
  areaAsignada: string;
  categoria: string;
  rol: string;

  // Permisos conducir
  permisoConducir: string;
  fechaExpedicionPermiso: string;
  fechaValidezPermiso: string;

  // Otros
  formacionProfesional: string;
  ocupacionActual: string;
  alergias: string;
  grupoSanguineo: string;
}

// ============================================
// CONSTANTES
// ============================================
const TIPOS_FORMACION = [
  'Formación Básica PC',
  'Socorrismo',
  'Extinción de Incendios',
  'Primeros Auxilios',
  'RCP + DEA',
  'Comunicaciones',
  'Rescate Urbano',
  'Conducción Emergencias',
  'Logística',
  'PMA',
  'Drones / RPA',
  'Otro'
];

const TIPOS_DOCUMENTO = [
  { id: 'dni', nombre: 'DNI / NIE', icono: CreditCard },
  { id: 'carnet_conducir', nombre: 'Carnet de Conducir', icono: Car },
  { id: 'titulo_formacion', nombre: 'Título Formación', icono: GraduationCap },
  { id: 'certificado_medico', nombre: 'Certificado Médico', icono: Heart },
  { id: 'seguro', nombre: 'Seguro Personal', icono: Shield },
  { id: 'otro', nombre: 'Otro Documento', icono: FileText },
];

const AREAS_SERVICIO = [
  'JEFATURA', 'SOCORRISMO', 'EXT_INCENDIOS', 'LOGISTICA',
  'FORMACION', 'TRANSMISIONES', 'ACCION_SOCIAL', 'PMA', 'ADMINISTRACION'
];

// ============================================
// COMPONENTE MODAL
// ============================================
function Modal({ title, children, onClose, size = 'md' }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center">
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
export default function MiAreaPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'datos' | 'formacion' | 'actividad' | 'documentos' | 'vestuario' | 'dietas' | 'notificaciones' | 'configuracion'>('datos');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [solicitandoPermiso, setSolicitandoPermiso] = useState(false);
  const [permisoEdicion, setPermisoEdicion] = useState(false);

  // Estados de datos
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales>({
    nombre: '', apellidos: '', dni: '', fechaNacimiento: '', sexo: '',
    email: '', telefono: '', telefonoEmergencia: '', contactoEmergencia: '',
    domicilio: '', numero: '', piso: '', codigoPostal: '', localidad: 'BORMUJOS', provincia: 'SEVILLA',
    numeroVoluntario: '', indicativo2: '', fechaAlta: '', fechaBaja: '', areaAsignada: '', categoria: 'VOLUNTARIO', rol: '',
    permisoConducir: '', fechaExpedicionPermiso: '', fechaValidezPermiso: '',
    formacionProfesional: '', ocupacionActual: '', alergias: '', grupoSanguineo: ''
  });

  const [formaciones, setFormaciones] = useState<Formacion[]>([]);
  const [inscripcionesReales, setInscripcionesReales] = useState<any[]>([]);
  const [certificacionesReales, setCertificacionesReales] = useState<any[]>([]);
  const [loadingFormacion, setLoadingFormacion] = useState(false);
  const [formacionSubTab, setFormacionSubTab] = useState<'inscripciones' | 'certificaciones' | 'manual'>('inscripciones');
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]); // Nueva línea
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [asignacionesVestuario, setAsignacionesVestuario] = useState<AsignacionVestuario[]>([]);
  const [solicitudesVestuario, setSolicitudesVestuario] = useState<SolicitudVestuario[]>([]);
  const [vestuarioSubTab, setVestuarioSubTab] = useState<'asignadas' | 'solicitudes'>('asignadas');
  const [showNuevaSolicitudVestuario, setShowNuevaSolicitudVestuario] = useState(false);
  const [nuevaSolicitudVestuario, setNuevaSolicitudVestuario] = useState({
    tipoPrenda: '', talla: '', cantidad: 1, motivo: '', descripcion: '', asignacionAnteriorId: ''
  });
  const [cambioPassword, setCambioPassword] = useState({
    passwordActual: '',
    passwordNuevo: '',
    passwordConfirmar: ''
  });
  const [dietas, setDietas] = useState<any[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [totalesPorMes, setTotalesPorMes] = useState<any>({});

  // Estados modales
  const [showNuevaFormacion, setShowNuevaFormacion] = useState(false);
  const [showNuevoDocumento, setShowNuevoDocumento] = useState(false);
  const [nuevaFormacion, setNuevaFormacion] = useState({
    nombre: '', tipo: '', fechaObtencion: '', fechaValidez: '', entidad: '', horas: 0
  });
  const [nuevoDocumento, setNuevoDocumento] = useState({
    tipo: '', nombre: '', fechaVencimiento: ''
  });

  // Determinar rol del usuario
  const userRole = session?.user?.rol || 'voluntario';
  const isAdmin = ['superadmin', 'admin'].includes(userRole);
  const canEdit = isAdmin || permisoEdicion;

  // Cargar datos del usuario
  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (activeTab === 'formacion') {
      setLoadingFormacion(true)
      fetch('/api/formacion?tipo=mi-formacion')
        .then(r => r.json())
        .then(data => {
          setInscripcionesReales(data.inscripciones || [])
          setCertificacionesReales(data.certificaciones || [])
        })
        .catch(console.error)
        .finally(() => setLoadingFormacion(false))
    }
    if (activeTab === 'dietas') {
      cargarDietas();
    }
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar datos personales desde la API
      const res = await fetch('/api/mi-area');
      if (res.ok) {
        const data = await res.json();
        console.log('DATA COMPLETO:', data);
        console.log('data.vestuario existe?', !!data.vestuario);
        console.log('data.usuario.asignacionesVestuario:', data.usuario?.asignacionesVestuario);
        if (data.usuario) {
          setDatosPersonales({
            nombre: data.usuario.nombre || '',
            apellidos: data.usuario.apellidos || '',
            dni: data.usuario.dni || '',
            email: data.usuario.email || '',
            telefono: data.usuario.telefono || '',
            numeroVoluntario: data.usuario.numeroVoluntario || '',
            rol: data.usuario.rol?.nombre || '',
            // Datos de la ficha
            ...(data.ficha || {})
          });
        }
        if (data.formaciones) setFormaciones(data.formaciones);
        if (data.actividades) setActividades(data.actividades);
        if (data.documentos) setDocumentos(data.documentos);
        if (data.vestuario) {
          setAsignacionesVestuario(data.vestuario.asignaciones || []);
          setSolicitudesVestuario(data.vestuario.solicitudes || []);
        }
      }

      // Cargar disponibilidades
      const resDisp = await fetch('/api/mi-area/disponibilidades');
      if (resDisp.ok) {
        const dataDisp = await resDisp.json();
        setDisponibilidades(dataDisp.disponibilidades || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarDatos = async () => {
    try {
      const res = await fetch('/api/mi-area', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPersonales)
      });
      if (res.ok) {
        alert('✅ Datos guardados correctamente');
        setIsEditing(false);
      } else {
        alert('Error al guardar los datos');
      }
    } catch (error) {
      alert('Error al guardar los datos');
    }
  };

  const handleSolicitarPermiso = async () => {
    setSolicitandoPermiso(true);
    try {
      const res = await fetch('/api/mi-area/solicitar-permiso', {
        method: 'POST'
      });
      if (res.ok) {
        alert('✅ Solicitud enviada. El superadministrador revisará tu petición.');
      }
    } catch (error) {
      alert('Error al enviar solicitud');
    } finally {
      setSolicitandoPermiso(false);
    }
  };

  const handleGuardarFormacion = async () => {
    if (!nuevaFormacion.nombre || !nuevaFormacion.tipo || !nuevaFormacion.fechaObtencion) {
      alert('Nombre, tipo y fecha de obtención son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/mi-area/formacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaFormacion)
      });
      if (res.ok) {
        const data = await res.json();
        setFormaciones([...formaciones, data.formacion]);
        setShowNuevaFormacion(false);
        setNuevaFormacion({ nombre: '', tipo: '', fechaObtencion: '', fechaValidez: '', entidad: '', horas: 0 });
      }
    } catch (error) {
      alert('Error al guardar formación');
    }
  };

  const handleGuardarDocumento = async () => {
    if (!nuevoDocumento.tipo || !nuevoDocumento.nombre) {
      alert('Tipo y nombre son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/mi-area/documento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoDocumento)
      });
      if (res.ok) {
        const data = await res.json();
        setDocumentos([...documentos, data.documento]);
        setShowNuevoDocumento(false);
        setNuevoDocumento({ tipo: '', nombre: '', fechaVencimiento: '' });
      }
    } catch (error) {
      alert('Error al guardar documento');
    }
  };

  const handleGuardarSolicitudVestuario = async () => {
    if (!nuevaSolicitudVestuario.tipoPrenda || !nuevaSolicitudVestuario.talla || !nuevaSolicitudVestuario.motivo) {
      alert('Tipo de prenda, talla y motivo son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/mi-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'solicitud-vestuario',
          ...nuevaSolicitudVestuario
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSolicitudesVestuario([...solicitudesVestuario, data.solicitud]);
        setShowNuevaSolicitudVestuario(false);
        setNuevaSolicitudVestuario({ tipoPrenda: '', talla: '', cantidad: 1, motivo: '', descripcion: '', asignacionAnteriorId: '' });
        alert('✅ Solicitud enviada correctamente');
      }
    } catch (error) {
      alert('Error al enviar solicitud');
    }
  };

  const handleCambiarPassword = async () => {
    if (!cambioPassword.passwordActual || !cambioPassword.passwordNuevo || !cambioPassword.passwordConfirmar) {
      alert('Todos los campos son requeridos');
      return;
    }
    if (cambioPassword.passwordNuevo !== cambioPassword.passwordConfirmar) {
      alert('❌ Las contraseñas nuevas no coinciden');
      return;
    }
    if (cambioPassword.passwordNuevo.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      const res = await fetch('/api/mi-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'cambiar-password',
          passwordActual: cambioPassword.passwordActual,
          passwordNuevo: cambioPassword.passwordNuevo
        })
      });
      if (res.ok) {
        alert('✅ Contraseña cambiada correctamente');
        setCambioPassword({ passwordActual: '', passwordNuevo: '', passwordConfirmar: '' });
      } else {
        const data = await res.json();
        alert('❌ Error: ' + (data.error || 'No se pudo cambiar la contraseña'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al cambiar contraseña');
    }
  };

  const cargarDietas = async (mes?: string) => {
    try {
      const url = mes ? `/api/mi-area?tipo=dietas&mes=${mes}` : '/api/mi-area?tipo=dietas';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDietas(data.dietas || []);
        setTotalesPorMes(data.totalesPorMes || {});
        setMesSeleccionado(data.mesSeleccionado || '');
      }
    } catch (error) {
      console.error('Error cargando dietas:', error);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente': return 'bg-green-100 text-green-700';
      case 'por_vencer': return 'bg-yellow-100 text-yellow-700';
      case 'vencido': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTipoActividadColor = (tipo: string) => {
    switch (tipo) {
      case 'servicio': return 'bg-blue-500';
      case 'formacion': return 'bg-purple-500';
      case 'evento': return 'bg-orange-500';
      case 'reunion': return 'bg-slate-500';
      default: return 'bg-slate-400';
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header con info del usuario */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-3xl font-bold shadow-lg flex-shrink-0">
            {datosPersonales.nombre?.charAt(0)}{datosPersonales.apellidos?.charAt(0)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-2xl font-bold">{datosPersonales.nombre} {datosPersonales.apellidos}</h1>
              <span className="bg-orange-500 px-3 py-1 rounded-full text-sm font-bold">{datosPersonales.numeroVoluntario}</span>
            </div>
            <p className="text-slate-300 mt-1">{datosPersonales.rol} • {datosPersonales.areaAsignada || 'Sin área asignada'}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-sm text-slate-400">
              <span className="flex items-center gap-1"><Mail size={14} /> {datosPersonales.email}</span>
              <span className="flex items-center gap-1"><Phone size={14} /> {datosPersonales.telefono}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {datosPersonales.localidad}</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-400 text-sm">Fecha de alta</p>
            <p className="text-xl font-bold">{datosPersonales.fechaAlta ? new Date(datosPersonales.fechaAlta).toLocaleDateString('es-ES') : '-'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto scrollbar-hide">
          {[
            { id: 'datos', label: 'Mis Datos', icon: User },
            { id: 'formacion', label: 'Formación', icon: GraduationCap },
            { id: 'actividad', label: 'Historial de Actividad', icon: Clock },
            { id: 'documentos', label: 'Documentos', icon: FileText },
            { id: 'vestuario', label: 'Vestuario', icon: Shield },
            { id: 'dietas', label: 'Dietas', icon: Wallet },
            { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
            { id: 'configuracion', label: 'Configuración', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              {/* ============================================ */}
              {/* TAB: MIS DATOS */}
              {/* ============================================ */}
              {activeTab === 'datos' && (
                <div>
                  {/* Controles de edición */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Datos Personales</h2>
                      <p className="text-sm text-slate-500">Información completa de tu ficha de voluntario</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isAdmin && !permisoEdicion && (
                        <button
                          onClick={handleSolicitarPermiso}
                          disabled={solicitandoPermiso}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                        >
                          <Lock size={16} />
                          {solicitandoPermiso ? 'Enviando...' : 'Solicitar permiso para editar'}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => isEditing ? handleGuardarDatos() : setIsEditing(true)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEditing
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                            }`}
                        >
                          {isEditing ? <><Save size={16} /> Guardar cambios</> : <><Edit size={16} /> Editar datos</>}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formulario de datos */}
                  <div className="space-y-6">
                    {/* Datos básicos */}
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <User size={18} className="text-orange-500" /> Datos Básicos
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                          <input
                            type="text"
                            value={datosPersonales.nombre}
                            onChange={e => setDatosPersonales({ ...datosPersonales, nombre: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellidos</label>
                          <input
                            type="text"
                            value={datosPersonales.apellidos}
                            onChange={e => setDatosPersonales({ ...datosPersonales, apellidos: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI / NIE</label>
                          <input
                            type="text"
                            value={datosPersonales.dni}
                            onChange={e => setDatosPersonales({ ...datosPersonales, dni: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Nacimiento</label>
                          <input
                            type="date"
                            value={datosPersonales.fechaNacimiento?.split('T')[0] || ''}
                            onChange={e => setDatosPersonales({ ...datosPersonales, fechaNacimiento: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sexo</label>
                          <select
                            value={datosPersonales.sexo}
                            onChange={e => setDatosPersonales({ ...datosPersonales, sexo: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            <option value="">Seleccionar</option>
                            <option value="H">Hombre</option>
                            <option value="M">Mujer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                          <input
                            type="email"
                            value={datosPersonales.email}
                            onChange={e => setDatosPersonales({ ...datosPersonales, email: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                          <input
                            type="tel"
                            value={datosPersonales.telefono}
                            onChange={e => setDatosPersonales({ ...datosPersonales, telefono: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo Sanguíneo</label>
                          <select
                            value={datosPersonales.grupoSanguineo}
                            onChange={e => setDatosPersonales({ ...datosPersonales, grupoSanguineo: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            <option value="">Seleccionar</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-orange-500" /> Dirección
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domicilio</label>
                          <input
                            type="text"
                            value={datosPersonales.domicilio}
                            onChange={e => setDatosPersonales({ ...datosPersonales, domicilio: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                          <input
                            type="text"
                            value={datosPersonales.numero}
                            onChange={e => setDatosPersonales({ ...datosPersonales, numero: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Piso/Puerta</label>
                          <input
                            type="text"
                            value={datosPersonales.piso}
                            onChange={e => setDatosPersonales({ ...datosPersonales, piso: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Postal</label>
                          <input
                            type="text"
                            value={datosPersonales.codigoPostal}
                            onChange={e => setDatosPersonales({ ...datosPersonales, codigoPostal: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localidad</label>
                          <input
                            type="text"
                            value={datosPersonales.localidad}
                            onChange={e => setDatosPersonales({ ...datosPersonales, localidad: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Provincia</label>
                          <input
                            type="text"
                            value={datosPersonales.provincia}
                            onChange={e => setDatosPersonales({ ...datosPersonales, provincia: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contacto de emergencia */}
                    <div className="bg-red-50 rounded-xl p-5 border border-red-100">
                      <h3 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} /> Contacto de Emergencia
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Contacto</label>
                          <input
                            type="text"
                            value={datosPersonales.contactoEmergencia}
                            onChange={e => setDatosPersonales({ ...datosPersonales, contactoEmergencia: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                            placeholder="Nombre y relación"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono Emergencia</label>
                          <input
                            type="tel"
                            value={datosPersonales.telefonoEmergencia}
                            onChange={e => setDatosPersonales({ ...datosPersonales, telefonoEmergencia: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alergias / Información Médica Relevante</label>
                          <textarea
                            value={datosPersonales.alergias}
                            onChange={e => setDatosPersonales({ ...datosPersonales, alergias: e.target.value })}
                            disabled={!isEditing}
                            rows={2}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Datos del servicio */}
                    <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                      <h3 className="font-bold text-orange-700 mb-4 flex items-center gap-2">
                        <Shield size={18} /> Datos del Servicio
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indicativo Principal</label>
                          <input
                            type="text"
                            value={datosPersonales.numeroVoluntario}
                            disabled
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-100 text-slate-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indicativo Secundario</label>
                          <input
                            type="text"
                            value={datosPersonales.indicativo2}
                            onChange={e => setDatosPersonales({ ...datosPersonales, indicativo2: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Área Asignada</label>
                          <select
                            value={datosPersonales.areaAsignada}
                            onChange={e => setDatosPersonales({ ...datosPersonales, areaAsignada: e.target.value })}
                            disabled={!isEditing || !isAdmin}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            <option value="">Sin asignar</option>
                            {AREAS_SERVICIO.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Alta</label>
                          <input
                            type="date"
                            value={datosPersonales.fechaAlta?.split('T')[0] || ''}
                            onChange={e => setDatosPersonales({ ...datosPersonales, fechaAlta: e.target.value })}
                            disabled={!isEditing || !isAdmin}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                          <input
                            type="text"
                            value={datosPersonales.categoria}
                            onChange={e => setDatosPersonales({ ...datosPersonales, categoria: e.target.value })}
                            disabled={!isEditing || !isAdmin}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol en Sistema</label>
                          <input
                            type="text"
                            value={datosPersonales.rol}
                            disabled
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-100 text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Permisos de conducir */}
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Car size={18} className="text-orange-500" /> Permisos de Conducir
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clases de Permiso</label>
                          <input
                            type="text"
                            value={datosPersonales.permisoConducir}
                            onChange={e => setDatosPersonales({ ...datosPersonales, permisoConducir: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                            placeholder="Ej: B, B+E, C1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Expedición</label>
                          <input
                            type="date"
                            value={datosPersonales.fechaExpedicionPermiso?.split('T')[0] || ''}
                            onChange={e => setDatosPersonales({ ...datosPersonales, fechaExpedicionPermiso: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Validez</label>
                          <input
                            type="date"
                            value={datosPersonales.fechaValidezPermiso?.split('T')[0] || ''}
                            onChange={e => setDatosPersonales({ ...datosPersonales, fechaValidezPermiso: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Información profesional */}
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <GraduationCap size={18} className="text-orange-500" /> Información Profesional
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formación Profesional</label>
                          <input
                            type="text"
                            value={datosPersonales.formacionProfesional}
                            onChange={e => setDatosPersonales({ ...datosPersonales, formacionProfesional: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ocupación Actual</label>
                          <input
                            type="text"
                            value={datosPersonales.ocupacionActual}
                            onChange={e => setDatosPersonales({ ...datosPersonales, ocupacionActual: e.target.value })}
                            disabled={!isEditing}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================ */}
              {/* TAB: FORMACIÓN */}
              {/* ============================================ */}
              {activeTab === 'formacion' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Formación y Certificaciones</h2>
                      <p className="text-sm text-slate-500">Historial completo de formación</p>
                    </div>
                    <button
                      onClick={() => setShowNuevaFormacion(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <Plus size={16} /> Añadir Manual
                    </button>
                  </div>
                  {/* Sub-tabs */}
                  <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
                    {[
                      { id: 'inscripciones', label: 'Inscripciones', count: inscripcionesReales.length },
                      { id: 'certificaciones', label: 'Certificaciones', count: certificacionesReales.length },
                      { id: 'manual', label: 'Registro Manual', count: formaciones.length }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setFormacionSubTab(t.id as any)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${formacionSubTab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {t.label}
                        {t.count > 0 && <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full font-bold">{t.count}</span>}
                      </button>
                    ))}
                  </div>

                  {/* Sub-tab: Inscripciones */}
                  {formacionSubTab === 'inscripciones' && (
                    <div>
                      {loadingFormacion ? (
                        <div className="text-center py-8 text-slate-400">Cargando...</div>
                      ) : inscripcionesReales.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No tienes inscripciones en el sistema</p>
                          <p className="text-xs mt-1 text-slate-400">Las inscripciones a convocatorias aparecerán aquí</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {inscripcionesReales.map((insc: any) => {
                            const estadoColor: Record<string, string> = {
                              pendiente: 'bg-yellow-100 text-yellow-700',
                              confirmada: 'bg-blue-100 text-blue-700',
                              completada: 'bg-green-100 text-green-700',
                              no_presentado: 'bg-red-100 text-red-700',
                              cancelada: 'bg-slate-100 text-slate-500'
                            }
                            return (
                              <div key={insc.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                                      <GraduationCap size={20} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-800">{insc.convocatoria?.curso?.nombre}</h4>
                                      <p className="text-sm text-slate-500 mt-0.5">
                                        {insc.convocatoria?.curso?.entidadOrganiza && <span>{insc.convocatoria.curso.entidadOrganiza} • </span>}
                                        {insc.convocatoria?.curso?.duracionHoras}h
                                      </p>
                                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <Calendar size={11} />
                                          {insc.convocatoria?.fechaInicio ? new Date(insc.convocatoria.fechaInicio).toLocaleDateString('es-ES') : '—'} — {insc.convocatoria?.fechaFin ? new Date(insc.convocatoria.fechaFin).toLocaleDateString('es-ES') : '—'}
                                        </span>
                                        {insc.convocatoria?.lugar && <span>📍 {insc.convocatoria.lugar}</span>}
                                      </div>
                                      {insc.convocatoria?.curso?.formadorPrincipal && (
                                        <p className="text-xs text-slate-400 mt-1">👤 {insc.convocatoria.curso.formadorPrincipal}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-2">
                                        {insc.apto !== null && insc.apto !== undefined && (
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${insc.apto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {insc.apto ? '✓ APTO' : '✗ NO APTO'}
                                          </span>
                                        )}
                                        {insc.notaFinal !== null && insc.notaFinal !== undefined && (
                                          <span className="text-xs text-slate-500">Nota: <strong>{insc.notaFinal}</strong></span>
                                        )}
                                        {insc.porcentajeAsistencia !== null && insc.porcentajeAsistencia !== undefined && (
                                          <span className="text-xs text-slate-500">Asistencia: <strong>{insc.porcentajeAsistencia}%</strong></span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${estadoColor[insc.estado] || 'bg-slate-100 text-slate-500'}`}>
                                    {insc.estado?.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab: Certificaciones */}
                  {formacionSubTab === 'certificaciones' && (
                    <div>
                      {loadingFormacion ? (
                        <div className="text-center py-8 text-slate-400">Cargando...</div>
                      ) : certificacionesReales.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No tienes certificaciones registradas</p>
                          <p className="text-xs mt-1 text-slate-400">Las certificaciones se generan al completar un curso</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {certificacionesReales.map((cert: any) => {
                            const vigente = cert.vigente && (!cert.fechaExpiracion || new Date(cert.fechaExpiracion) > new Date())
                            return (
                              <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${vigente ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                      <Award size={20} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-800">{cert.curso?.nombre}</h4>
                                      <p className="text-sm text-slate-500">{cert.entidadEmisora}</p>
                                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        <span>📅 Obtenido: {new Date(cert.fechaObtencion).toLocaleDateString('es-ES')}</span>
                                        {cert.fechaExpiracion && (
                                          <span className={new Date(cert.fechaExpiracion) < new Date() ? 'text-red-500 font-medium' : ''}>
                                            ⏱ Expira: {new Date(cert.fechaExpiracion).toLocaleDateString('es-ES')}
                                          </span>
                                        )}
                                      </div>
                                      {cert.numeroCertificado && (
                                        <p className="text-xs text-slate-400 mt-1">Nº {cert.numeroCertificado}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${vigente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {vigente ? 'VIGENTE' : 'VENCIDA'}
                                    </span>
                                    {cert.certificadoUrl && (
                                      <a href={cert.certificadoUrl} target="_blank" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg">
                                        <Eye size={16} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab: Registro Manual */}
                  {formacionSubTab === 'manual' && (formaciones.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay formaciones manuales registradas</p>
                      <button
                        onClick={() => setShowNuevaFormacion(true)}
                        className="mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Añadir primera formación
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formaciones.map(f => (
                        <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                <Award size={24} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800">{f.nombre}</h4>
                                <p className="text-sm text-slate-600">{f.tipo} • {f.entidad}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} /> Obtenido: {new Date(f.fechaObtencion).toLocaleDateString('es-ES')}
                                  </span>
                                  {f.fechaValidez && (
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} /> Validez: {new Date(f.fechaValidez).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                  {f.horas && <span>{f.horas}h</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getEstadoColor(f.estado)}`}>
                                {f.estado === 'vigente' ? 'Vigente' : f.estado === 'por_vencer' ? 'Por vencer' : 'Vencido'}
                              </span>
                              {f.documentoUrl ? (
                                <a href={f.documentoUrl} target="_blank" className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg">
                                  <Eye size={18} />
                                </a>
                              ) : (
                                <button className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                                  <Upload size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: HISTORIAL DE ACTIVIDAD */}
              {/* ============================================ */}
              {activeTab === 'actividad' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Historial de Actividad</h2>
                      <p className="text-sm text-slate-500">Disponibilidad registrada, servicios, formación y eventos</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Disponibilidad</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Servicios</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Formación</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Eventos</span>
                    </div>
                  </div>

                  {/* Combinar y ordenar todas las actividades */}
                  {(() => {
                    const todasActividades = [
                      ...disponibilidades.map(d => ({
                        id: d.id,
                        tipo: 'disponibilidad',
                        fecha: d.semanaInicio,
                        titulo: 'Disponibilidad Registrada',
                        data: d
                      })),
                      ...actividades.map(a => ({
                        id: a.id,
                        tipo: a.tipo,
                        fecha: a.fecha,
                        titulo: a.titulo,
                        data: a
                      }))
                    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                    if (todasActividades.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No hay actividades registradas</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {todasActividades.map(item => {
                          if (item.tipo === 'disponibilidad') {
                            const d = item.data;
                            const detalles = d.detalles || {};
                            const turnosSeleccionados = Object.entries(detalles)
                              .filter(([_, turnos]: [string, any]) => turnos && turnos.length > 0);

                            return (
                              <div key={item.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                                <div className="w-1 h-12 rounded-full bg-indigo-500"></div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-800">Disponibilidad Registrada</h4>
                                  <p className="text-sm text-slate-500">
                                    Semana del {new Date(d.semanaInicio).toLocaleDateString('es-ES')}
                                  </p>
                                  {d.noDisponible ? (
                                    <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                      No disponible
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {turnosSeleccionados.map(([dia, turnos]: [string, any]) => (
                                        <span key={dia} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                          {dia.charAt(0).toUpperCase() + dia.slice(1)}: {turnos.join(', ')}
                                        </span>
                                      ))}
                                      {d.puedeDobleturno && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                          Puede doblar
                                        </span>
                                      )}
                                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                        {d.turnosDeseados} turnos deseados
                                      </span>
                                    </div>
                                  )}
                                  {d.notas && (
                                    <p className="text-xs text-slate-400 mt-1">{d.notas}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-500">
                                    {new Date(d.createdAt).toLocaleDateString('es-ES')}
                                  </p>
                                </div>
                              </div>
                            );
                          } else {
                            // Actividades existentes (servicios, formación, eventos)
                            const a = item.data;
                            return (
                              <div key={item.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                                <div className={`w-1 h-12 rounded-full ${getTipoActividadColor(a.tipo)}`}></div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-slate-800">{a.titulo}</h4>
                                    {a.turno && (
                                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                                        Turno {a.turno}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-500">{a.descripcion}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-800">{new Date(a.fecha).toLocaleDateString('es-ES')}</p>
                                  <p className="text-sm text-slate-500">{a.horaInicio} - {a.horaFin}</p>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ============================================ */}
              {/* TAB: DOCUMENTOS */}
              {/* ============================================ */}
              {activeTab === 'documentos' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Mis Documentos</h2>
                      <p className="text-sm text-slate-500">DNI, carnet de conducir, certificados y otros documentos</p>
                    </div>
                    <button
                      onClick={() => setShowNuevoDocumento(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <Plus size={16} /> Subir Documento
                    </button>
                  </div>

                  {documentos.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay documentos subidos</p>
                      <button
                        onClick={() => setShowNuevoDocumento(true)}
                        className="mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Subir primer documento
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {documentos.map(d => {
                        const tipoInfo = TIPOS_DOCUMENTO.find(t => t.id === d.tipo);
                        const IconoTipo = tipoInfo?.icono || FileText;
                        return (
                          <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d.estado === 'vigente' ? 'bg-green-100 text-green-600' :
                                d.estado === 'por_vencer' ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                <IconoTipo size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-800 truncate">{d.nombre}</h4>
                                <p className="text-xs text-slate-500">{tipoInfo?.nombre || d.tipo}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getEstadoColor(d.estado)}`}>
                                    {d.estado === 'vigente' ? 'Vigente' : d.estado === 'por_vencer' ? 'Por vencer' : 'Vencido'}
                                  </span>
                                  {d.fechaVencimiento && (
                                    <span className="text-[10px] text-slate-400">
                                      Vence: {new Date(d.fechaVencimiento).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                              <span className="text-xs text-slate-400">
                                Subido: {new Date(d.fechaSubida).toLocaleDateString('es-ES')}
                              </span>
                              <div className="flex items-center gap-1">
                                {d.archivoUrl && (
                                  <a href={d.archivoUrl} target="_blank" className="p-1.5 text-orange-600 hover:bg-orange-50 rounded">
                                    <Download size={16} />
                                  </a>
                                )}
                                <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 size={16} />
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
              {/* TAB: VESTUARIO */}
              {/* ============================================ */}
              {activeTab === 'vestuario' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Mi Vestuario</h2>
                      <p className="text-sm text-slate-500">Prendas asignadas y solicitudes de vestuario</p>
                    </div>
                    <button
                      onClick={() => setShowNuevaSolicitudVestuario(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <Plus size={16} /> Nueva Solicitud
                    </button>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex gap-2 mb-6 border-b border-slate-200">
                    <button
                      onClick={() => setVestuarioSubTab('asignadas')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${vestuarioSubTab === 'asignadas'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Prendas Asignadas
                    </button>
                    <button
                      onClick={() => setVestuarioSubTab('solicitudes')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${vestuarioSubTab === 'solicitudes'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Mis Solicitudes
                    </button>
                  </div>

                  {/* Prendas Asignadas */}
                  {vestuarioSubTab === 'asignadas' && (
                    <div>
                      {asignacionesVestuario.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No tienes prendas asignadas</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Prenda</th>
                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Talla</th>
                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Cantidad</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Fecha Asignación</th>
                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {asignacionesVestuario.map(a => (
                                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.estado === 'ASIGNADO' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        <Shield size={20} />
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-800">{a.tipoPrenda}</p>
                                        {a.observaciones && <p className="text-xs text-slate-500">{a.observaciones}</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="font-medium text-slate-800">{a.talla}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="text-lg font-bold text-slate-800">{a.cantidad}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm text-slate-600">
                                      {new Date(a.fechaAsignacion).toLocaleDateString('es-ES')}
                                    </span>
                                    {a.fechaBaja && (
                                      <p className="text-xs text-red-600 mt-1">
                                        Baja: {new Date(a.fechaBaja).toLocaleDateString('es-ES')}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${a.estado === 'ASIGNADO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                      {a.estado === 'ASIGNADO' ? 'Activo' : 'Baja'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {a.estado === 'ASIGNADO' && (
                                      <button
                                        onClick={() => {
                                          setNuevaSolicitudVestuario({
                                            tipoPrenda: a.tipoPrenda,
                                            talla: a.talla,
                                            cantidad: 1,
                                            motivo: 'REPOSICION',
                                            descripcion: '',
                                            asignacionAnteriorId: a.id
                                          });
                                          setShowNuevaSolicitudVestuario(true);
                                        }}
                                        className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
                                      >
                                        Solicitar Reposición
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Solicitudes */}
                  {vestuarioSubTab === 'solicitudes' && (
                    <div>
                      {solicitudesVestuario.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No has realizado solicitudes</p>
                          <button
                            onClick={() => setShowNuevaSolicitudVestuario(true)}
                            className="mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
                          >
                            Crear primera solicitud
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {solicitudesVestuario.map(s => (
                            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-bold text-slate-800">{s.tipoPrenda} - {s.talla}</h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' :
                                      s.estado === 'APROBADA' ? 'bg-green-100 text-green-700' :
                                        s.estado === 'ENTREGADA' ? 'bg-blue-100 text-blue-700' :
                                          'bg-red-100 text-red-700'
                                      }`}>
                                      {s.estado}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <p className="text-slate-600">
                                      <span className="font-medium">Motivo:</span> {s.motivo}
                                    </p>
                                    {s.descripcion && (
                                      <p className="text-slate-600">
                                        <span className="font-medium">Descripción:</span> {s.descripcion}
                                      </p>
                                    )}
                                    <p className="text-slate-500">
                                      Solicitado: {new Date(s.fechaSolicitud).toLocaleDateString('es-ES')}
                                    </p>
                                    {s.fechaRespuesta && (
                                      <p className="text-slate-500">
                                        Respondido: {new Date(s.fechaRespuesta).toLocaleDateString('es-ES')}
                                      </p>
                                    )}
                                    {s.comentarioRespuesta && (
                                      <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                                        <span className="font-medium">Comentario:</span> {s.comentarioRespuesta}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-slate-800">x{s.cantidad}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notificaciones' && (
                <NotificacionesTab />
              )}

              {activeTab === 'configuracion' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Configuración</h2>
                    <p className="text-sm text-slate-500">Gestiona tu cuenta y preferencias</p>
                  </div>
                  {/* Cambiar Contraseña */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Lock size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Cambiar Contraseña</h3>
                        <p className="text-sm text-slate-500">Actualiza tu contraseña de acceso</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña Actual *</label>
                        <input
                          type="password"
                          value={cambioPassword.passwordActual}
                          onChange={e => setCambioPassword({ ...cambioPassword, passwordActual: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                          placeholder="Introduce tu contraseña actual"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña *</label>
                        <input
                          type="password"
                          value={cambioPassword.passwordNuevo}
                          onChange={e => setCambioPassword({ ...cambioPassword, passwordNuevo: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nueva Contraseña *</label>
                        <input
                          type="password"
                          value={cambioPassword.passwordConfirmar}
                          onChange={e => setCambioPassword({ ...cambioPassword, passwordConfirmar: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                          placeholder="Repite la nueva contraseña"
                        />
                      </div>
                      <button
                        onClick={handleCambiarPassword}
                        className="w-full py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                      >
                        Cambiar Contraseña
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dietas' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Mis Dietas</h2>
                      <p className="text-sm text-slate-500">Control de dietas y kilometraje</p>
                    </div>
                    <select
                      value={mesSeleccionado}
                      onChange={(e) => cargarDietas(e.target.value)}
                      className="border border-slate-200 rounded-lg px-4 py-2 text-sm"
                    >
                      <option value="">Todos los meses</option>
                      {Object.keys(totalesPorMes).sort().reverse().map(mes => (
                        <option key={mes} value={mes}>{mes}</option>
                      ))}
                    </select>
                  </div>

                  {/* Resumen mensual */}
                  {mesSeleccionado && totalesPorMes[mesSeleccionado] && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="text-blue-600" size={20} />
                          <span className="text-xs font-bold text-blue-600 uppercase">Servicios</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{totalesPorMes[mesSeleccionado].registros}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="text-green-600" size={20} />
                          <span className="text-xs font-bold text-green-600 uppercase">Dietas</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{totalesPorMes[mesSeleccionado].totalDietas.toFixed(2)} €</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Car className="text-orange-600" size={20} />
                          <span className="text-xs font-bold text-orange-600 uppercase">Kilómetros</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{totalesPorMes[mesSeleccionado].totalKm.toFixed(2)} km</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="text-purple-600" size={20} />
                          <span className="text-xs font-bold text-purple-600 uppercase">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">{totalesPorMes[mesSeleccionado].total.toFixed(2)} €</p>
                      </div>
                    </div>
                  )}

                  {/* Tabla de dietas */}
                  {dietas.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay dietas registradas</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Turno</th>
                            <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Horas</th>
                            <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Dietas</th>
                            <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Km</th>
                            <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Total</th>
                            <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dietas.map(dieta => (
                            <tr key={dieta.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <span className="text-sm text-slate-800">
                                  {new Date(dieta.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-medium text-slate-700">{dieta.turno}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm text-slate-600">{Number(dieta.horasTrabajadas).toFixed(2)} h</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm font-medium text-green-700">{Number(dieta.subtotalDietas).toFixed(2)} €</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="text-sm">
                                  <span className="text-slate-600">{Number(dieta.kilometros).toFixed(2)} km</span>
                                  <p className="text-xs font-medium text-orange-600">{Number(dieta.subtotalKm).toFixed(2)} €</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-base font-bold text-purple-700">{Number(dieta.totalDieta).toFixed(2)} €</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${dieta.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                                  dieta.estado === 'aprobado' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                  {dieta.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </div>
      {/* ============================================ */}
      {/* MODALES */}
      {/* ============================================ */}

      {/* Modal: Nueva Formación */}
      {showNuevaFormacion && (
        <Modal title="Añadir Formación" onClose={() => setShowNuevaFormacion(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Curso/Título *</label>
              <input
                type="text"
                value={nuevaFormacion.nombre}
                onChange={e => setNuevaFormacion({ ...nuevaFormacion, nombre: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                placeholder="Ej: Curso Básico de Protección Civil"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo *</label>
                <select
                  value={nuevaFormacion.tipo}
                  onChange={e => setNuevaFormacion({ ...nuevaFormacion, tipo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_FORMACION.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entidad/Centro</label>
                <input
                  type="text"
                  value={nuevaFormacion.entidad}
                  onChange={e => setNuevaFormacion({ ...nuevaFormacion, entidad: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  placeholder="Ej: APCAS, Cruz Roja..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Obtención *</label>
                <input
                  type="date"
                  value={nuevaFormacion.fechaObtencion}
                  onChange={e => setNuevaFormacion({ ...nuevaFormacion, fechaObtencion: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Validez</label>
                <input
                  type="date"
                  value={nuevaFormacion.fechaValidez}
                  onChange={e => setNuevaFormacion({ ...nuevaFormacion, fechaValidez: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horas</label>
                <input
                  type="number"
                  value={nuevaFormacion.horas || ''}
                  onChange={e => setNuevaFormacion({ ...nuevaFormacion, horas: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adjuntar Título/Certificado</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Arrastra el archivo o haz clic para seleccionar</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNuevaFormacion(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleGuardarFormacion} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo Documento */}
      {showNuevoDocumento && (
        <Modal title="Subir Documento" onClose={() => setShowNuevoDocumento(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Documento *</label>
              <select
                value={nuevoDocumento.tipo}
                onChange={e => setNuevoDocumento({ ...nuevoDocumento, tipo: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
              >
                <option value="">Seleccionar...</option>
                {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre/Descripción *</label>
              <input
                type="text"
                value={nuevoDocumento.nombre}
                onChange={e => setNuevoDocumento({ ...nuevoDocumento, nombre: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                placeholder="Ej: DNI - Anverso y Reverso"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Vencimiento</label>
              <input
                type="date"
                value={nuevoDocumento.fechaVencimiento}
                onChange={e => setNuevoDocumento({ ...nuevoDocumento, fechaVencimiento: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adjuntar Archivo *</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors cursor-pointer">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Arrastra el archivo o haz clic para seleccionar</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNuevoDocumento(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleGuardarDocumento} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">Subir</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nueva Solicitud de Vestuario */}
      {showNuevaSolicitudVestuario && (
        <Modal title="Nueva Solicitud de Vestuario" onClose={() => setShowNuevaSolicitudVestuario(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Prenda *</label>
                <select
                  value={nuevaSolicitudVestuario.tipoPrenda}
                  onChange={e => setNuevaSolicitudVestuario({ ...nuevaSolicitudVestuario, tipoPrenda: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  <option value="POLO">Polo</option>
                  <option value="PANTALON">Pantalón</option>
                  <option value="CHAQUETA">Chaqueta</option>
                  <option value="BOTAS">Botas</option>
                  <option value="CASCO">Casco</option>
                  <option value="GUANTES">Guantes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Talla *</label>
                <select
                  value={nuevaSolicitudVestuario.talla}
                  onChange={e => setNuevaSolicitudVestuario({ ...nuevaSolicitudVestuario, talla: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="XXXL">XXXL</option>
                  {(nuevaSolicitudVestuario.tipoPrenda === 'BOTAS' || nuevaSolicitudVestuario.tipoPrenda === 'GUANTES') && (
                    <>
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
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo *</label>
                <select
                  value={nuevaSolicitudVestuario.motivo}
                  onChange={e => setNuevaSolicitudVestuario({ ...nuevaSolicitudVestuario, motivo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  disabled={!!nuevaSolicitudVestuario.asignacionAnteriorId}
                >
                  <option value="">Seleccionar...</option>
                  <option value="NUEVO_INGRESO">Nuevo Ingreso</option>
                  <option value="REPOSICION">Reposición</option>
                  <option value="DETERIORO">Deterioro</option>
                  <option value="PERDIDA">Pérdida</option>
                  <option value="CAMBIO_TALLA">Cambio de Talla</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={nuevaSolicitudVestuario.cantidad}
                  onChange={e => setNuevaSolicitudVestuario({ ...nuevaSolicitudVestuario, cantidad: parseInt(e.target.value) || 1 })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción / Observaciones</label>
              <textarea
                value={nuevaSolicitudVestuario.descripcion}
                onChange={e => setNuevaSolicitudVestuario({ ...nuevaSolicitudVestuario, descripcion: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                rows={3}
                placeholder="Explica el motivo de tu solicitud..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNuevaSolicitudVestuario(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleGuardarSolicitudVestuario} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">Enviar Solicitud</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}