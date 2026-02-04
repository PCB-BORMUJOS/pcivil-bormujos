import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      nombre: string
      apellidos: string
      rol: string
      rolId: string
      permisos: any
      servicioId: string | null
      numeroVoluntario: string | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name: string
    nombre: string
    apellidos: string
    rol: string
    rolId: string
    permisos: any
    servicioId: string | null
    numeroVoluntario: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    nombre: string
    apellidos: string
    rol: string
    rolId: string
    permisos: any
    servicioId: string | null
    numeroVoluntario: string | null
  }
}
