import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  const isAuthPage = request.nextUrl.pathname === '/login'
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
  ].some(route => request.nextUrl.pathname.startsWith(route))

  // Si no hay token y es ruta protegida, redirigir a login
  if (!token && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay token y está en login, redirigir a dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/login',
  ],
}