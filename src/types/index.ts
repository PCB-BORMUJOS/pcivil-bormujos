// ===========================================
// TIPOS COMPARTIDOS - Protección Civil Bormujos
// ===========================================

// Usuario
export interface Usuario {
  id: string
  email: string
  nombre: string
  apellidos: string
  telefono?: string | null
  dni?: string | null
  numeroVoluntario?: string | null
  avatar?: string | null
  activo: boolean
  rolId: string
  agrupacionId: string
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date | null
  rol?: Rol
  agrupacion?: Agrupacion
}

export interface Rol {
  id: string
  nombre: string
  descripcion?: string | null
  permisos: string[]
}

export interface Agrupacion {
  id: string
  nombre: string
  codigo: string
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  logo?: string | null
  activa: boolean
}

// Inventario
export interface CategoriaInventario {
  id: string
  nombre: string
  slug: string
  descripcion?: string | null
  icono?: string | null
  color?: string | null
  orden: number
  activa: boolean
  familias?: FamiliaArticulo[]
}

export interface FamiliaArticulo {
  id: string
  nombre: string
  slug: string
  descripcion?: string | null
  categoriaId: string
  categoria?: CategoriaInventario
  articulos?: Articulo[]
}

export interface Articulo {
  id: string
  codigo?: string | null
  nombre: string
  descripcion?: string | null
  stockActual: number
  stockMinimo: number
  unidad: string
  tieneCaducidad: boolean
  fechaCaducidad?: Date | null
  ubicacionId?: string | null
  familiaId: string
  agrupacionId: string
  metadatos?: Record<string, unknown> | null
  activo: boolean
  createdAt: Date
  updatedAt: Date
  ubicacion?: Ubicacion
  familia?: FamiliaArticulo
}

export interface Ubicacion {
  id: string
  nombre: string
  tipo: string
  descripcion?: string | null
  padreId?: string | null
  agrupacionId: string
}

export interface MovimientoStock {
  id: string
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia'
  cantidad: number
  motivo?: string | null
  notas?: string | null
  articuloId: string
  usuarioId: string
  createdAt: Date
  articulo?: Articulo
  usuario?: Usuario
}

// Vehículos
export interface Vehiculo {
  id: string
  matricula: string
  indicativo?: string | null
  tipo: string
  marca?: string | null
  modelo?: string | null
  anio?: number | null
  estado: 'disponible' | 'en_servicio' | 'mantenimiento' | 'baja'
  kmActual?: number | null
  fechaItv?: Date | null
  fechaSeguro?: Date | null
  agrupacionId: string
}

// Guardias
export interface Guardia {
  id: string
  fecha: Date
  turno: 'mañana' | 'tarde' | 'noche' | '24h'
  tipo: 'ordinaria' | 'especial' | 'evento'
  notas?: string | null
  usuarioId: string
  agrupacionId: string
  estado: 'programada' | 'confirmada' | 'completada' | 'cancelada'
  usuario?: Usuario
}

// Incidencias
export interface Incidencia {
  id: string
  numero: string
  titulo: string
  descripcion?: string | null
  tipo: string
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente'
  estado: 'abierta' | 'en_curso' | 'resuelta' | 'cerrada'
  direccion?: string | null
  coordenadas?: { lat: number; lng: number } | null
  fechaInicio: Date
  fechaFin?: Date | null
  creadorId: string
  asignadoId?: string | null
  agrupacionId: string
  createdAt: Date
  updatedAt: Date
  creador?: Usuario
  asignado?: Usuario
}

// Estadísticas del Dashboard
export interface DashboardStats {
  totalVoluntarios: number
  guardiasHoy: number
  vehiculosDisponibles: number
  incidenciasAbiertas: number
  articulosBajoStock: number
  articulosCaducados: number
}

// Respuestas API
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Parámetros de búsqueda/filtrado
export interface SearchParams {
  query?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface InventarioFilters extends SearchParams {
  categoriaId?: string
  familiaId?: string
  bajoStock?: boolean
  caducado?: boolean
  ubicacionId?: string
}

// Navegación
export interface NavItem {
  name: string
  href: string
  icon: string
  children?: NavItem[]
}

// Permisos
export type Permiso = 
  | 'dashboard.ver'
  | 'inventario.ver'
  | 'inventario.crear'
  | 'inventario.editar'
  | 'inventario.eliminar'
  | 'vehiculos.ver'
  | 'vehiculos.crear'
  | 'vehiculos.editar'
  | 'vehiculos.eliminar'
  | 'personal.ver'
  | 'personal.crear'
  | 'personal.editar'
  | 'personal.eliminar'
  | 'cuadrantes.ver'
  | 'cuadrantes.crear'
  | 'cuadrantes.editar'
  | 'incidencias.ver'
  | 'incidencias.crear'
  | 'incidencias.editar'
  | 'configuracion.ver'
  | 'configuracion.editar'
  | 'admin.total'
