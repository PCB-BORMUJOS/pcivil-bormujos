import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { MODULOS_APP, moduloDePath, moduloDeApi } from '@/lib/modulos-permisos'

const NIVEL: Record<string, number> = {
  superadmin:        5,
  coordinador:       4,
  admin:             4,
  jefe_area:         3,
  responsable_turno: 2,
  voluntario:        1,
  visor:             4, // lectura equivalente a admin; escritura bloqueada abajo
}

function getNivel(rol: string): number {
  return NIVEL[rol] ?? 1
}

// Rutas ocultas para niveles intermedios (1-3: voluntario, responsable, jefe_area)
// Accesibles para coordinador+ (>=4) Y para visor (0)
const RUTAS_SOLO_COORD_O_VISOR: string[] = [
  '/cuadrantes',
  '/estadisticas',
  '/presupuesto',
]

// Rutas visibles SOLO para los roles 'admin' y 'superadmin'. Cualquier otro rol
// queda fuera, incluido el coordinador (mismo nivel que admin) y el visor.
const RUTAS_SOLO_ADMIN: string[] = [
  '/administracion',
]

// Rutas que requieren nivel mínimo 5 (SOLO superadmin). Configuración contiene
// datos sensibles (p. ej. económico de J-44) y es exclusiva de superadmin.
const RUTAS_SUPERADMIN: string[] = [
  '/configuracion',
]
const RUTAS_API_SUPERADMIN: string[] = [
  '/api/configuracion',
]

// Todas las rutas protegidas (requieren autenticación mínima)
const RUTAS_PROTEGIDAS: string[] = [
  '/dashboard',
  '/cuadrantes',
  '/mi-area',
  '/logistica',
  '/inventario',
  '/vehiculos',
  '/transmisiones',
  '/pma',
  '/configuracion',
  '/incendios',
  '/socorrismo',
  '/administracion',
  '/partes',
  '/manuales',
  '/formacion',
  '/accion-social',
  '/buscar',
  '/estadisticas',
  '/presupuesto',
  '/drones',
  '/practicas',
  '/cecopal',
  '/megacode',
  '/agentes',
  '/compras',
]

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login'

  const rolTok = ((token as any)?.rol as string) ?? 'voluntario'
  const nivelTok = getNivel(rolTok)
  const personalizado = (token as any)?.permisosPersonalizados === true && rolTok !== 'superadmin'
  const permisosExtra: string[] = ((token as any)?.permisosExtra as string[]) ?? []

  // Visor = solo lectura: bloquear escrituras en toda la API
  const esApiEscritura = pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  if (esApiEscritura && rolTok === 'visor') {
    return NextResponse.json({ error: 'Perfil de solo lectura' }, { status: 403 })
  }
  // API de Configuración: solo superadmin.
  if (pathname.startsWith('/api/') && RUTAS_API_SUPERADMIN.some(r => pathname.startsWith(r)) && nivelTok < 5) {
    return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 })
  }
  // Usuario con permisos personalizados: las escrituras requieren 'editar' del módulo.
  if (esApiEscritura && personalizado) {
    const mod = moduloDeApi(pathname)
    if (mod && !permisosExtra.includes('editar:' + mod)) {
      return NextResponse.json({ error: 'Sin permiso de edición en este módulo' }, { status: 403 })
    }
  }

  const esRutaProtegida = RUTAS_PROTEGIDAS.some(r => pathname.startsWith(r))

  // Sin token → redirigir a login
  if (!token && esRutaProtegida) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Con token en página de login → redirigir a dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (token && esRutaProtegida) {
    const rol = rolTok
    const nivel = nivelTok

    // Configuración: SIEMPRE solo superadmin (aplica también a personalizados).
    if (RUTAS_SUPERADMIN.some(r => pathname.startsWith(r)) && nivel < 5) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (personalizado) {
      // Acceso gobernado EXCLUSIVAMENTE por los permisos por módulo (ver:<modulo>).
      // Dashboard y Mi Área son siempre accesibles.
      const mod = moduloDePath(pathname)
      const info = MODULOS_APP.find(m => m.key === mod)
      if (mod && !info?.siempre && !permisosExtra.includes('ver:' + mod)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      // Rutas exclusivas de 'admin' y 'superadmin'.
      if (RUTAS_SOLO_ADMIN.some(r => pathname.startsWith(r))) {
        if (rol !== 'admin' && rol !== 'superadmin') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
      // Rutas bloqueadas para niveles intermedios (voluntario/responsable/jefe_area);
      // visor (0) y coordinador+ (>=4) sí pueden acceder.
      if (RUTAS_SOLO_COORD_O_VISOR.some(r => pathname.startsWith(r))) {
        if (nivel >= 1 && nivel < 4) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/cuadrantes/:path*',
    '/mi-area/:path*',
    '/logistica/:path*',
    '/inventario/:path*',
    '/vehiculos/:path*',
    '/transmisiones/:path*',
    '/pma/:path*',
    '/configuracion/:path*',
    '/incendios/:path*',
    '/socorrismo/:path*',
    '/administracion/:path*',
    '/partes/:path*',
    '/manuales/:path*',
    '/formacion/:path*',
    '/accion-social/:path*',
    '/buscar/:path*',
    '/estadisticas/:path*',
    '/presupuesto/:path*',
    '/drones/:path*',
    '/practicas/:path*',
    '/cecopal/:path*',
    '/megacode/:path*',
    '/agentes/:path*',
    '/compras/:path*',
    '/login',
  ],
}
