import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'
import { User } from 'next-auth'

const prisma = new PrismaClient()

const handler = NextAuth({
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
          email: usuario.email,
          name: `${usuario.nombre} ${usuario.apellidos}`,
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = user.rol
        token.servicioId = user.servicioId
        token.numeroVoluntario = user.numeroVoluntario
        token.nombre = (user as any).nombre
        token.apellidos = (user as any).apellidos
        token.rolId = (user as any).rolId
        token.permisos = (user as any).permisos
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.rol = token.rol as string
        session.user.servicioId = token.servicioId as string
        session.user.numeroVoluntario = token.numeroVoluntario as string
        ;(session.user as any).nombre = token.nombre as string
        ;(session.user as any).apellidos = token.apellidos as string
        ;(session.user as any).rolId = token.rolId as string
        ;(session.user as any).permisos = token.permisos as any
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
