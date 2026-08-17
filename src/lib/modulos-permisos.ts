// Módulos de la aplicación para el sistema de permisos por usuario (Ver / Editar).
// Se usa en el menú (Sidebar), el middleware (control de rutas y escrituras) y la
// pantalla de gestión de permisos (dentro de Configuración, solo superadmin).
//
// Los permisos se guardan en `usuario.permisosExtra` (String[]) con las claves
// `ver:<modulo>` y `editar:<modulo>`. Un usuario con `permisosPersonalizados=true`
// SOLO ve/edita los módulos marcados; el resto de usuarios mantienen su rol.
//
// IMPORTANTE: "Configuración" NO es un módulo asignable: es exclusiva de superadmin
// (contiene, entre otras cosas, la información económica de J-44).

export interface ModuloApp {
  key: string
  label: string
  path: string      // ruta de la página
  paths?: string[]  // rutas adicionales (alias) que pertenecen al mismo módulo
  api?: string[]    // prefijos de API para controlar acceso (leer/editar)
  siempre?: boolean // accesible siempre (no se puede restringir): dashboard / mi-área / buscar
}

export const MODULOS_APP: ModuloApp[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', siempre: true },
  { key: 'mi-area', label: 'Mi Área', path: '/mi-area', siempre: true },
  { key: 'buscar', label: 'Buscar', path: '/buscar', siempre: true },
  { key: 'cecopal', label: 'CECOPAL', path: '/cecopal', api: ['/api/cecopal'] },
  { key: 'incendios', label: 'Incendios', path: '/incendios', api: ['/api/incendios'] },
  { key: 'socorrismo', label: 'Socorrismo', path: '/socorrismo', api: ['/api/socorrismo'] },
  { key: 'logistica', label: 'Logística', path: '/logistica', paths: ['/inventario'], api: ['/api/logistica'] },
  { key: 'vehiculos', label: 'Vehículos', path: '/vehiculos', api: ['/api/vehiculos'] },
  { key: 'transmisiones', label: 'Transmisiones', path: '/transmisiones', api: ['/api/transmisiones'] },
  { key: 'pma', label: 'PMA', path: '/pma', api: ['/api/pma'] },
  { key: 'formacion', label: 'Formación', path: '/formacion', api: ['/api/formacion'] },
  { key: 'accion-social', label: 'Acción Social', path: '/accion-social', api: ['/api/accion-social'] },
  { key: 'drones', label: 'Drones', path: '/drones', api: ['/api/drones'] },
  { key: 'practicas', label: 'Prácticas', path: '/practicas', api: ['/api/practicas'] },
  { key: 'megacode', label: 'Megacode', path: '/megacode', api: ['/api/megacode'] },
  { key: 'manuales', label: 'Manuales', path: '/manuales', api: ['/api/manuales'] },
  { key: 'planes', label: 'Planes de Emergencia', path: '/planes', api: ['/api/planes', '/api/cartografia'] },
  { key: 'partes', label: 'Partes de Servicio', path: '/partes', api: ['/api/partes'] },
  { key: 'cuadrantes', label: 'Cuadrantes', path: '/cuadrantes', api: ['/api/cuadrantes'] },
  { key: 'estadisticas', label: 'Estadísticas', path: '/estadisticas', api: ['/api/estadisticas'] },
  { key: 'agentes', label: 'Agentes IA', path: '/agentes', api: ['/api/agentes'] },
  { key: 'compras', label: 'Compras', path: '/compras', api: ['/api/compras'] },
  { key: 'presupuesto', label: 'Gestión Económica', path: '/presupuesto', api: ['/api/presupuesto'] },
  { key: 'administracion', label: 'Administración', path: '/administracion', api: ['/api/admin'] },
]

export const keyVer = (modulo: string) => `ver:${modulo}`
export const keyEditar = (modulo: string) => `editar:${modulo}`

// Módulo (key) al que pertenece una ruta de página, o null. Considera alias (paths).
export function moduloDePath(pathname: string): string | null {
  const rutas: Array<{ p: string; key: string }> = []
  for (const m of MODULOS_APP) {
    rutas.push({ p: m.path, key: m.key })
    for (const alias of (m.paths || [])) rutas.push({ p: alias, key: m.key })
  }
  rutas.sort((a, b) => b.p.length - a.p.length)
  const m = rutas.find(x => pathname === x.p || pathname.startsWith(x.p + '/'))
  return m ? m.key : null
}

// Módulo (key) al que pertenece una ruta de API, o null.
export function moduloDeApi(pathname: string): string | null {
  for (const m of MODULOS_APP) {
    if (!m.api) continue
    for (const a of m.api) {
      if (pathname === a || pathname.startsWith(a + '/') || pathname.startsWith(a + '?')) return m.key
    }
  }
  return null
}
