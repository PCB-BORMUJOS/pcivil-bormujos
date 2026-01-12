import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    rol: string
    servicioId: string | null
    numeroVoluntario: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      rol: string
      servicioId: string | null
      numeroVoluntario: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    rol: string
    servicioId: string | null
    numeroVoluntario: string | null
  }
}
