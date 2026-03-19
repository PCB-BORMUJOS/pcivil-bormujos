import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const ADMIN_ONLY_ROUTES = [
  '/administracion',
  '/estadisticas',
  '/presupuesto',
  '/configuracion',
  '/cuadrantes',
]

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login'

  const isProtectedRoute = [
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
  ].some(route => pathname.startsWith(route))

  if (!token && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (token && isProtectedRoute) {
    const userRole = (token as any).rol as string ?? 'voluntario'
    const isAdmin = ['superadmin', 'admin'].includes(userRole)
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route))

    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/login',
  ],
}
