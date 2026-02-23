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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña requeridos')
        }
        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { rol: true, servicio: true }
        })
        if (!usuario || !usuario.activo) {
          throw new Error('Usuario no encontrado o inactivo')
        }
        const passwordValid = await compare(credentials.password, usuario.password)
        if (!passwordValid) {
          throw new Error('Contraseña incorrecta')
        }
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
          servicioId: usuario.servicioId,
          numeroVoluntario: usuario.numeroVoluntario
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.nombre = (user as any).nombre
        token.apellidos = (user as any).apellidos
        token.rol = (user as any).rol
        token.rolId = (user as any).rolId
        token.permisos = (user as any).permisos
        token.servicioId = (user as any).servicioId
        token.numeroVoluntario = (user as any).numeroVoluntario
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
            ip: null,
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
              ip: null,
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
