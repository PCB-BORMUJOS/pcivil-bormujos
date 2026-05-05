import { checkRateLimit, registerFailedAttempt, resetAttempts } from '@/lib/rate-limit'
import { AuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import { compare } from 'bcryptjs'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(
        credentials: Record<"email" | "password", string> | undefined,
        _req: any
      ): Promise<User | null> {
        const ip = _req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || _req?.headers?.["x-real-ip"] || 'unknown'
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña requeridos')
        }

        const rateCheck = checkRateLimit(ip)
        if (!rateCheck.allowed) {
          throw new Error(`Demasiados intentos fallidos. Inténtalo en ${rateCheck.minutosRestantes} minutos.`)
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { rol: true, servicio: true }
        })
        if (!usuario || !usuario.activo) {
          registerFailedAttempt(ip)
          throw new Error('Usuario no encontrado o inactivo')
        }
        const passwordValid = await compare(credentials.password, usuario.password)
        if (!passwordValid) {
          registerFailedAttempt(ip)
          throw new Error('Contraseña incorrecta')
        }
        resetAttempts(ip)
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { lastLogin: new Date() }
        })
        return {
          id: usuario.id,
          name: `${usuario.nombre} ${usuario.apellidos}`,
          email: usuario.email,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          rol: usuario.rol.nombre,
          rolId: usuario.rolId,
          permisos: usuario.rol.permisos,
          permisosExtraData: usuario.permisosExtra ?? [],
          servicioId: usuario.servicioId,
          numeroVoluntario: usuario.numeroVoluntario,
          ip
        } as any
      }
    })
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if ((user as any).ip) token.ip = (user as any).ip
        token.id = user.id
        token.email = user.email
        token.nombre = (user as any).nombre
        token.apellidos = (user as any).apellidos
        token.rol = (user as any).rol
        token.rolId = (user as any).rolId
        ;(token as any).permisosExtra = (user as any).permisosExtraData ?? []
        token.permisos = (user as any).permisos
        token.servicioId = (user as any).servicioId
        token.numeroVoluntario = (user as any).numeroVoluntario
      } else {
        // Renovación de token: releer permisosExtra desde BD para reflejar cambios sin re-login
        if (token.id) {
          try {
            const u = await prisma.usuario.findUnique({
              where: { id: token.id as string },
              select: { permisosExtra: true, rol: { select: { permisos: true } } }
            })
            if (u) {
              ;(token as any).permisosExtra = (u.permisosExtra as string[]) ?? []
              token.permisos = u.rol.permisos as any
            }
          } catch (_) {}
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).email = token.email as string
        (session.user as any).nombre = token.nombre as string
        (session.user as any).apellidos = token.apellidos as string
        (session.user as any).rol = token.rol as string
        (session.user as any).rolId = token.rolId as string
        (session.user as any).permisosExtra = (token as any).permisosExtra ?? [];
        (session.user as any).permisos = token.permisos as any
        (session.user as any).servicioId = token.servicioId as string
        (session.user as any).numeroVoluntario = token.numeroVoluntario as string
      }
      return session
    }
  },
  events: {
    async signIn({ user }) {
      try {
        await prisma.auditLog.create({
          data: {
            accion: 'LOGIN',
            entidad: 'Usuario',
            entidadId: user.id,
            descripcion: `Inicio de sesión: ${user.email}`,
            usuarioId: user.id,
            usuarioNombre: user.name || user.email || 'Desconocido',
            modulo: 'Autenticación',
            ip: (user as any).ip || null,
            userAgent: null,
          }
        })
      } catch (e) {
        console.error('Error registrando LOGIN en auditoría:', e)
      }
    },
    async signOut({ token }: { token: any }) {
      try {
        if (token?.id) {
          await prisma.auditLog.create({
            data: {
              accion: 'LOGOUT',
              entidad: 'Usuario',
              entidadId: token.id,
              descripcion: `Cierre de sesión: ${token.email}`,
              usuarioId: token.id,
              usuarioNombre: token.name || token.email || 'Desconocido',
              modulo: 'Autenticación',
              ip: (token as any).ip || null,
              userAgent: null,
            }
          })
        }
      } catch (e) {
        console.error('Error registrando LOGOUT en auditoría:', e)
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}
