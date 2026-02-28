'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield, CreditCard, History, Users, TrendingUp, Download, Edit, Loader2, Plus, X, Eye, EyeOff, Trash2, Save, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import TrazabilidadPanel from '@/components/configuracion/TrazabilidadPanel';

interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  dni?: string;
  numeroVoluntario?: string;
  activo: boolean;
  responsableTurno?: boolean;
  carnetConducir?: boolean;
  esOperativo?: boolean;
  esJefeServicio?: boolean;
  experiencia?: string;
  nivelCompromiso?: string;
  rol: {
    id: string;
    nombre: string;
  };
  servicio: {
    id: string;
    nombre: string;
  };
}

interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface Servicio {
  id: string;
  nombre: string;
  codigo: string;
}

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'liquidaciones' | 'roles' | 'criterios' | 'audit'>('roles');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  // Estados para usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Estados para ordenación
  const [sortBy, setSortBy] = useState<'nombre' | 'email' | 'voluntario' | 'rol' | 'estado'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    dni: '',
    numeroVoluntario: '',
    rolId: '',
    servicioId: '',
    password: '',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editFormSuccess, setEditFormSuccess] = useState('');

  const dietRules = [
    { id: 'd1', minHours: 4, amount: 29, label: 'Tramo > 4h' },
    { id: 'd2', minHours: 8, amount: 45, label: 'Tramo > 8h' },
    { id: 'd3', minHours: 12, amount: 65, label: 'Tramo > 12h' }
  ];

  const generateReport = () => {
    setLoading(true);
    setTimeout(() => {
      setReportData([
        { indicativo: 'J-44', nombre: 'EMILIO SIMÓN', municipio: 'Bormujos', kmUnitario: 0, numTurnos: 5, subtotalDietas: 145, subtotalKm: 0, total: 145 },
        { indicativo: 'S-01', nombre: 'TANYA GONZÁLEZ', municipio: 'Mairena', kmUnitario: 5.25, numTurnos: 8, subtotalDietas: 232, subtotalKm: 42, total: 274 },
        { indicativo: 'B-29', nombre: 'JOSE C. BAILÓN', municipio: 'Tomares', kmUnitario: 3.50, numTurnos: 6, subtotalDietas: 174, subtotalKm: 21, total: 195 },
      ]);
      setLoading(false);
    }, 1500);
  };

  // Cargar usuarios, roles y servicios
  const fetchData = async () => {
    setLoadingUsuarios(true);
    try {
      const params = new URLSearchParams({ roles: 'true' });
      const response = await fetch(`/api/admin/personal?${params}`);
      const data = await response.json();
      if (data.voluntarios) {
        setUsuarios(data.voluntarios);
      }
      if (data.roles) {
        setRoles(data.roles);
      }
      // Servicios hardcodeados por ahora
      setServicios([
        { id: '1', nombre: 'Protección Civil Bormujos', codigo: 'PCB' },
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles' || activeTab === 'criterios') {
      fetchData();
    }
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch('/api/admin/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'Error al crear usuario');
        return;
      }

      setFormSuccess('Usuario creado correctamente');
      setShowModal(false);
      setFormData({
        nombre: '',
        apellidos: '',
        email: '',
        telefono: '',
        dni: '',
        numeroVoluntario: '',
        rolId: '',
        servicioId: '',
        password: '',
      });
      fetchData();
    } catch (error) {
      setFormError('Error de conexión');
    }
  };

  const toggleUsuarioActivo = async (id: string, actual: boolean) => {
    try {
      const response = await fetch('/api/admin/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: !actual }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  };

  const openEditModal = (usuario: Usuario) => {
    setEditingUser(usuario);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setEditFormError('');
    setEditFormSuccess('');
    setShowEditModal(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');
    setEditFormSuccess('');

    if (!editingUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setEditFormError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setEditFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await fetch('/api/admin/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          accion: 'password',
          password: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditFormError(data.error || 'Error al actualizar contraseña');
        return;
      }

      setEditFormSuccess('Contraseña actualizada correctamente');
      setTimeout(() => {
        setShowEditModal(false);
        setEditingUser(null);
      }, 1500);
    } catch (error) {
      setEditFormError('Error de conexión');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/personal?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    }
  };

  // Función para ordenar usuarios
  const getSortedUsuarios = () => {
    return [...usuarios].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'nombre':
          comparison = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'voluntario':
          const aVol = a.numeroVoluntario || '';
          const bVol = b.numeroVoluntario || '';
          comparison = aVol.localeCompare(bVol);
          break;
        case 'rol':
          comparison = a.rol.nombre.localeCompare(b.rol.nombre);
          break;
        case 'estado':
          comparison = (a.activo ? 1 : 0) - (b.activo ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Cambiar ordenación
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Renderizar icono de ordenación
  const renderSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
    }
    return sortOrder === 'asc' ? <ArrowUp size={14} className="text-orange-600 ml-1" /> : <ArrowDown size={14} className="text-orange-600 ml-1" />;
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl"><Shield size={32} /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Panel de Gestión Administrativa</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Configuración de dietas, kilometraje y auditoría</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 pb-px">
        <button onClick={() => setActiveTab('liquidaciones')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'liquidaciones' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <CreditCard size={16} /> Liquidaciones
        </button>
        <button onClick={() => setActiveTab('roles')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'roles' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <Users size={16} /> Roles y Permisos
        </button>
        <button onClick={() => setActiveTab('criterios')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'criterios' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <TrendingUp size={16} /> Criterios de Personal
        </button>
        <button onClick={() => setActiveTab('audit')} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'audit' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-slate-400'}`}>
          <History size={16} /> Trazabilidad
        </button>
      </div>

      {/* Liquidaciones */}
      {activeTab === 'liquidaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-orange-600" /> Baremo de Dietas</h3>
              <div className="space-y-4">
                {dietRules.map(rule => (
                  <div key={rule.id} className="p-4 bg-slate-50 rounded-lg border">
                    <label className="text-xs text-slate-400 font-bold block mb-2">{rule.label}</label>
                    <div className="flex gap-4">
                      <div className="flex-1"><span className="text-xs text-slate-500">Min. Horas</span><input type="number" className="w-full border rounded p-2 text-sm" defaultValue={rule.minHours} /></div>
                      <div className="flex-1"><span className="text-xs text-slate-500">Importe €</span><input type="number" className="w-full border rounded p-2 text-sm" defaultValue={rule.amount} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Generador de Informe Mensual</h3>
              <div className="flex gap-4">
                <input type="month" className="border rounded p-2 text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                <button onClick={generateReport} disabled={loading} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null} Generar
                </button>
              </div>
            </div>

            {reportData.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Indicativo</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Nombre</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Jefe Serv.</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Operativo</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Responsable</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Conductor</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Experiencia</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Compromiso</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Estado</th>
                    </tr>
                  </thead>
                <tbody className="divide-y">
                  {reportData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-bold text-slate-700">{row.indicativo}</td>
                      <td className="p-4 font-bold text-slate-800">{row.nombre}</td>
                      <td className="p-4 text-sm text-slate-600">{row.municipio}</td>
                      <td className="p-4 text-center font-bold">{row.numTurnos}</td>
                      <td className="p-4 text-right">{row.subtotalDietas.toFixed(2)}€</td>
                      <td className="p-4 text-right">{row.subtotalKm.toFixed(2)}€</td>
                      <td className="p-4 text-right"><span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-bold">{row.total.toFixed(2)}€</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center text-slate-400">
                <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Seleccione periodo y genere el informe</p>
              </div>
            )}

            {reportData.length > 0 && (
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Total {selectedMonth}</p>
                  <p className="text-3xl font-bold">{reportData.reduce((acc, r) => acc + r.total, 0).toFixed(2)} €</p>
                </div>
                <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Download size={18} /> Exportar PDF</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roles */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header con botón de crear */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestión de Usuarios y Permisos</h3>
              <p className="text-sm text-slate-500">Administra los usuarios del sistema y sus niveles de acceso</p>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-700 transition-colors">
              <Plus size={18} /> Nuevo Usuario
            </button>
          </div>

          {/* Tabla de usuarios */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Usuarios del Sistema</h3>
              <span className="text-xs text-slate-500">{usuarios.length} usuarios</span>
            </div>

            {loadingUsuarios ? (
              <div className="p-20 text-center">
                <Loader2 size={32} className="mx-auto animate-spin text-orange-600" />
                <p className="text-sm text-slate-500 mt-4">Cargando usuarios...</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th
                      className="p-4 text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors flex items-center"
                      onClick={() => handleSort('nombre')}
                    >
                      Usuario {renderSortIcon('nombre')}
                    </th>
                    <th
                      className="p-4 text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      Email {renderSortIcon('email')}
                    </th>
                    <th
                      className="p-4 text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('voluntario')}
                    >
                      Voluntario {renderSortIcon('voluntario')}
                    </th>
                    <th
                      className="p-4 text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('rol')}
                    >
                      Rol {renderSortIcon('rol')}
                    </th>
                    <th
                      className="p-4 text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('estado')}
                    >
                      Estado {renderSortIcon('estado')}
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getSortedUsuarios().map(usuario => (
                    <tr key={usuario.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{usuario.nombre} {usuario.apellidos}</div>
                        {usuario.telefono && <div className="text-xs text-slate-400">{usuario.telefono}</div>}
                      </td>
                      <td className="p-4 text-sm text-slate-600">{usuario.email}</td>
                      <td className="p-4 font-mono text-sm text-slate-600">{usuario.numeroVoluntario || '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${usuario.rol.nombre === 'superadmin' ? 'bg-indigo-100 text-indigo-700' :
                          usuario.rol.nombre === 'admin' ? 'bg-blue-100 text-blue-700' :
                            usuario.rol.nombre === 'operador' ? 'bg-green-100 text-green-700' :
                              'bg-slate-100 text-slate-600'
                          }`}>
                          {usuario.rol.nombre}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${usuario.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(usuario)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Cambiar contraseña"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => toggleUsuarioActivo(usuario.id, usuario.activo)}
                          className={`text-xs px-3 py-1 rounded-lg font-bold ${usuario.activo ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {usuario.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usuario.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-slate-400">
                        <Users size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No hay usuarios registrados</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Criterios de Personal */}
      {activeTab === 'criterios' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Criterios de Generación Automática</h3>
            <p className="text-sm text-slate-500">Configura los criterios que el algoritmo usará para generar los cuadrantes automáticamente</p>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-800">Voluntarios y Criterios</h3>
            </div>

            {loadingUsuarios ? (
              <div className="p-20 text-center">
                <Loader2 size={32} className="mx-auto animate-spin text-orange-600" />
                <p className="text-sm text-slate-500 mt-4">Cargando voluntarios...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Indicativo</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Nombre</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Jefe Serv.</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Operativo</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Responsable</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Conductor</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Experiencia</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Compromiso</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...usuarios].sort((a, b) => {
                        const orden = (v: string) => v?.startsWith('J') ? 0 : v?.startsWith('S') ? 1 : 2;
                        const oa = orden(a.numeroVoluntario || '');
                        const ob = orden(b.numeroVoluntario || '');
                        if (oa !== ob) return oa - ob;
                        return (a.numeroVoluntario || '').localeCompare(b.numeroVoluntario || '');
                      }).map(usuario => (
                      <tr key={usuario.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-700">{usuario.numeroVoluntario || '-'}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{usuario.nombre} {usuario.apellidos}</div>
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={usuario.esJefeServicio || false}
                            onChange={async (e) => {
                              const newValue = e.target.checked;
                              try {
                                await fetch(`/api/admin/personal/${usuario.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ esJefeServicio: newValue })
                                });
                                fetchData();
                              } catch (error) {
                                console.error('Error updating:', error);
                              }
                            }}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={usuario.esOperativo !== false}
                            onChange={async (e) => {
                              const newValue = e.target.checked;
                              try {
                                await fetch(`/api/admin/personal/${usuario.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ esOperativo: newValue })
                                });
                                fetchData();
                              } catch (error) {
                                console.error('Error updating:', error);
                              }
                            }}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={usuario.responsableTurno || false}
                            onChange={async (e) => {
                              const newValue = e.target.checked;
                              try {
                                await fetch(`/api/admin/personal/${usuario.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ responsableTurno: newValue })
                                });
                                fetchData();
                              } catch (error) {
                                console.error('Error updating:', error);
                              }
                            }}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={usuario.carnetConducir || false}
                            onChange={async (e) => {
                              const newValue = e.target.checked;
                              try {
                                await fetch(`/api/admin/personal/${usuario.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ carnetConducir: newValue })
                                });
                                fetchData();
                              } catch (error) {
                                console.error('Error updating:', error);
                              }
                            }}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={usuario.experiencia || 'MEDIA'}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              try {
                                await fetch(`/api/admin/personal/${usuario.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ experiencia: newValue })
                                });
                                fetchData();
                              } catch (error) {
                                console.error('Error updating:', error);
                              }
                            }}
                            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="BAJA">Baja</option>
                            <option value="MEDIA">Media</option>
                            <option value="ALTA">Alta</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={usuario.nivelCompromiso || 'MEDIO'}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              try {
                                await fetch(`/api/admin/personal/${usuario.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ nivelCompromiso: newValue })
                                });
                                fetchData();
                              } catch (error) {
                                console.error('Error updating:', error);
                              }
                            }}
                            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="BAJO">Bajo</option>
                            <option value="MEDIO">Medio</option>
                            <option value="ALTO">Alto</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${usuario.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-20 text-center text-slate-400">
                          <Users size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="text-sm">No hay voluntarios registrados</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Información de puntuación */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-600" />
              Sistema de Puntuación Automática
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">🎯 Responsable de turno:</span>
                <span className="font-bold text-orange-600">+10 puntos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">⭐ Experiencia ALTA:</span>
                <span className="font-bold text-orange-600">+5 puntos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">💪 Compromiso ALTO:</span>
                <span className="font-bold text-orange-600">+5 puntos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">🚗 Conductor:</span>
                <span className="font-bold text-orange-600">+3 puntos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">⚖️ Equidad (por turno):</span>
                <span className="font-bold text-slate-600">-2 puntos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">📅 Turnos deseados:</span>
                <span className="font-bold text-green-600">+1 punto</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit */}
      {activeTab === 'audit' && (
        <TrazabilidadPanel />
      )}

      {/* Modal de creación de usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Crear Nuevo Usuario</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Nombre del usuario"
                  />
                </div>

                {/* Apellidos */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Apellidos *</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Apellidos"
                  />
                </div>

                {/* Email */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="email@ejemplo.com"
                  />
                </div>

                {/* Teléfono */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="666 666 666"
                  />
                </div>

                {/* DNI */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">DNI</label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="12345678A"
                  />
                </div>

                {/* Número Voluntario */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Número Voluntario</label>
                  <input
                    type="text"
                    name="numeroVoluntario"
                    value={formData.numeroVoluntario}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="J-01, S-02..."
                  />
                </div>

                {/* Rol */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rol *</label>
                  <select
                    name="rolId"
                    value={formData.rolId}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Seleccionar rol...</option>
                    {roles.map(rol => (
                      <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Servicio */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Servicio *</label>
                  <select
                    name="servicioId"
                    value={formData.servicioId}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Seleccionar servicio...</option>
                    {servicios.map(servicio => (
                      <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Contraseña */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contraseña Inicial *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edición de contraseña */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Cambiar Contraseña</h3>
                <p className="text-sm text-slate-500 mt-1">{editingUser.nombre} {editingUser.apellidos}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-6">
              {editFormError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {editFormError}
                </div>
              )}
              {editFormSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {editFormSuccess}
                </div>
              )}

              <div className="space-y-4">
                {/* Nueva contraseña */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nueva Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar Contraseña *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 flex items-center gap-2"
                >
                  <Save size={18} /> Guardar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
