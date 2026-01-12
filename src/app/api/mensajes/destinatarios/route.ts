import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true, servicio: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const rolesAdmin = ['superadmin', 'admin']
    const esAdmin = rolesAdmin.includes(usuario.rol.nombre)
    const esCoordinador = usuario.rol.nombre === 'coordinador'

    // Obtener usuarios
    const usuarios = await prisma.usuario.findMany({
      where: { 
        activo: true,
        NOT: { id: usuario.id }
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        numeroVoluntario: true,
        rol: { select: { nombre: true } },
        servicio: { select: { nombre: true } }
      },
      orderBy: [
        { nombre: 'asc' },
        { apellidos: 'asc' }
      ]
    })

    // Obtener áreas/servicios únicos
    const servicios = await prisma.servicio.findMany({
      where: { activo: true },
      select: { id: true, nombre: true }
    })

    // Construir opciones de grupos según permisos
    const gruposDisponibles: { value: string; label: string; tipo: string }[] = []

    if (esAdmin) {
      gruposDisponibles.push({ value: 'todos', label: 'Todos los usuarios', tipo: 'grupo' })
      gruposDisponibles.push({ value: 'rol:admin', label: 'Administradores', tipo: 'rol' })
      gruposDisponibles.push({ value: 'rol:coordinador', label: 'Coordinadores', tipo: 'rol' })
      gruposDisponibles.push({ value: 'rol:voluntario', label: 'Voluntarios', tipo: 'rol' })
      
      servicios.forEach(s => {
        gruposDisponibles.push({ 
          value: `area:${s.nombre.toLowerCase()}`, 
          label: `Área: ${s.nombre}`, 
          tipo: 'area' 
        })
      })
    } else if (esCoordinador && usuario.servicio) {
      gruposDisponibles.push({ 
        value: `area:${usuario.servicio.nombre.toLowerCase()}`, 
        label: `Mi área: ${usuario.servicio.nombre}`, 
        tipo: 'area' 
      })
    }

    return NextResponse.json({ 
      usuarios,
      grupos: gruposDisponibles,
      permisos: {
        puedeEnviarGrupos: esAdmin || esCoordinador,
        puedeEnviarTodos: esAdmin
      }
    })
  } catch (error) {
    console.error('Error en GET /api/mensajes/destinatarios:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
