import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    nombre: string
    apellidos: string
    rol: string
    rolId: string
    permisos: any
    servicioId: string | null
    numeroVoluntario: string | null
  }

  interface Session {
    user: {
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
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nombre: string
    apellidos: string
    rol: string
    rolId: string
    permisos: any
    servicioId: string | null
    numeroVoluntario: string | null
  }
}
