import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    rol: string
    agrupacionId: string
    numeroVoluntario: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      rol: string
      agrupacionId: string
      numeroVoluntario: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    rol: string
    agrupacionId: string
    numeroVoluntario: string | null
  }
}