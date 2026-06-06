import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const NIVEL: Record<string, number> = {
  superadmin:        5,
  coordinador:       4,
  admin:             4,
  jefe_area:         3,
  responsable_turno: 2,
  voluntario:        1,
  visor:             0,
}

function getNivel(rol: string): number {
  return NIVEL[rol] ?? 1
}

// Rutas ocultas para niveles intermedios (1-3: voluntario, responsable, jefe_area)
// Accesibles para coordinador+ (>=4) Y para visor (0)
const RUTAS_SOLO_COORD_O_VISOR: string[] = [
  '/cuadrantes',
  '/administracion',
  '/estadisticas',
  '/presupuesto',
  '/configuracion',
]

// Rutas que requieren nivel mínimo 5 (solo superadmin)
const RUTAS_SUPERADMIN: string[] = []

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
]

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login'

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
    const rol = ((token as any).rol as string) ?? 'voluntario'
    const nivel = getNivel(rol)

    // Rutas solo superadmin
    if (RUTAS_SUPERADMIN.some(r => pathname.startsWith(r)) && nivel < 5) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Rutas bloqueadas para niveles intermedios (voluntario/responsable/jefe_area)
    // visor (0) y coordinador+ (>=4) sí pueden acceder
    if (RUTAS_SOLO_COORD_O_VISOR.some(r => pathname.startsWith(r))) {
      if (nivel >= 1 && nivel < 4) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
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
    '/login',
  ],
}
