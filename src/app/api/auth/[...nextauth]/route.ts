import NextAuth, { AuthOptions } from 'next-auth'
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
          email: usuario.email,
          name: `${usuario.nombre} ${usuario.apellidos}`,
          rol: usuario.rol.nombre,
          servicioId: usuario.servicioId,
          numeroVoluntario: usuario.numeroVoluntario,
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.rol = token.rol as string
        session.user.servicioId = token.servicioId as string
        session.user.numeroVoluntario = token.numeroVoluntario as string
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
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }