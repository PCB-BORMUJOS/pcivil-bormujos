import { Header } from '@/components/layout'
import { StatCard } from '@/components/ui'
import { 
  Users, 
  Calendar, 
  Truck, 
  AlertTriangle,
  Package,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'

// Datos de ejemplo - en producción vendrán de la BD
const stats = {
  voluntariosActivos: 24,
  guardiasHoy: 3,
  vehiculosDisponibles: 5,
  incidenciasAbiertas: 2,
  articulosBajoStock: 8,
  proximasCaducidades: 3,
}

const ultimasIncidencias = [
  { id: '1', numero: '2024-0042', tipo: 'Preventivo', estado: 'En curso', fecha: '28/12/2024' },
  { id: '2', numero: '2024-0041', tipo: 'Sanitario', estado: 'Resuelta', fecha: '27/12/2024' },
  { id: '3', numero: '2024-0040', tipo: 'Incendio', estado: 'Cerrada', fecha: '26/12/2024' },
]

const proximasGuardias = [
  { id: '1', voluntario: 'Juan García', turno: 'Mañana', fecha: '29/12/2024' },
  { id: '2', voluntario: 'María López', turno: 'Tarde', fecha: '29/12/2024' },
  { id: '3', voluntario: 'Pedro Martínez', turno: 'Noche', fecha: '29/12/2024' },
]

export default function DashboardPage() {
  return (
    <>
      <Header showSearch={true} />
      
      <div className="page-content">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Vista general del estado de la agrupación</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Voluntarios Activos"
            value={stats.voluntariosActivos}
            icon={Users}
          />
          <StatCard
            label="Guardias Hoy"
            value={stats.guardiasHoy}
            icon={Calendar}
            variant="success"
          />
          <StatCard
            label="Vehículos Disponibles"
            value={stats.vehiculosDisponibles}
            icon={Truck}
          />
          <StatCard
            label="Incidencias Abiertas"
            value={stats.incidenciasAbiertas}
            icon={AlertTriangle}
            variant={stats.incidenciasAbiertas > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            label="Artículos Bajo Stock"
            value={stats.articulosBajoStock}
            icon={Package}
            variant={stats.articulosBajoStock > 5 ? 'danger' : 'warning'}
          />
          <StatCard
            label="Próximas Caducidades"
            value={stats.proximasCaducidades}
            icon={Clock}
            variant={stats.proximasCaducidades > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas Incidencias */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Últimas Incidencias</h2>
              <a href="/incidencias" className="text-sm text-pc-primary-500 hover:text-pc-primary-600">
                Ver todas →
              </a>
            </div>
            <div className="divide-y divide-gray-100">
              {ultimasIncidencias.map((incidencia) => (
                <div key={incidencia.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{incidencia.numero}</p>
                    <p className="text-sm text-gray-500">{incidencia.tipo}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${
                      incidencia.estado === 'En curso' ? 'badge-warning' :
                      incidencia.estado === 'Resuelta' ? 'badge-success' :
                      'badge-gray'
                    }`}>
                      {incidencia.estado}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{incidencia.fecha}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Próximas Guardias */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Próximas Guardias</h2>
              <a href="/cuadrantes" className="text-sm text-pc-primary-500 hover:text-pc-primary-600">
                Ver cuadrantes →
              </a>
            </div>
            <div className="divide-y divide-gray-100">
              {proximasGuardias.map((guardia) => (
                <div key={guardia.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pc-primary-100 flex items-center justify-center text-pc-primary-600 font-semibold text-sm">
                      {guardia.voluntario.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{guardia.voluntario}</p>
                      <p className="text-sm text-gray-500">{guardia.fecha}</p>
                    </div>
                  </div>
                  <span className="badge badge-info">{guardia.turno}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/incidencias/nueva" className="card p-4 hover:border-pc-primary-300 hover:shadow-md transition-all group">
              <AlertTriangle className="w-8 h-8 text-pc-primary-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Nueva Incidencia</p>
              <p className="text-sm text-gray-500">Registrar intervención</p>
            </a>
            <a href="/inventario" className="card p-4 hover:border-pc-primary-300 hover:shadow-md transition-all group">
              <Package className="w-8 h-8 text-pc-primary-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Inventario</p>
              <p className="text-sm text-gray-500">Gestionar material</p>
            </a>
            <a href="/cuadrantes" className="card p-4 hover:border-pc-primary-300 hover:shadow-md transition-all group">
              <Calendar className="w-8 h-8 text-pc-primary-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Cuadrantes</p>
              <p className="text-sm text-gray-500">Ver planificación</p>
            </a>
            <a href="/vehiculos" className="card p-4 hover:border-pc-primary-300 hover:shadow-md transition-all group">
              <Truck className="w-8 h-8 text-pc-primary-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Vehículos</p>
              <p className="text-sm text-gray-500">Estado de flota</p>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
