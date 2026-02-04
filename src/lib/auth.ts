import { AuthOptions } from 'next-auth'
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
      async authorize(credentials) {
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
        token.nombre = user.nombre
        token.apellidos = user.apellidos
        token.rol = user.rol
        token.rolId = user.rolId
        token.permisos = user.permisos
        token.servicioId = user.servicioId
        token.numeroVoluntario = user.numeroVoluntario
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.nombre = token.nombre as string
        session.user.apellidos = token.apellidos as string
        session.user.rol = token.rol as string
        session.user.rolId = token.rolId as string
        session.user.permisos = token.permisos as any
        session.user.servicioId = token.servicioId as string
        session.user.numeroVoluntario = token.numeroVoluntario as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}
