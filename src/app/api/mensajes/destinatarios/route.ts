import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true, fichaVoluntario: { select: { areaAsignada: true } } }
    })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const esAdmin = ['superadmin', 'admin'].includes(usuario.rol.nombre)
    const esCoordinador = usuario.rol.nombre === 'coordinador'

    const usuarios = await prisma.usuario.findMany({
      where: { activo: true, NOT: { id: usuario.id } },
      select: {
        id: true, nombre: true, apellidos: true, numeroVoluntario: true,
        rol: { select: { nombre: true } },
        fichaVoluntario: { select: { areaAsignada: true } }
      },
      orderBy: [{ nombre: 'asc' }]
    })

    // Obtener áreas distintas de fichaVoluntario
    const areasRaw = await prisma.fichaVoluntario.findMany({
      where: { areaAsignada: { not: null } },
      select: { areaAsignada: true },
      distinct: ['areaAsignada']
    })
    const areas = areasRaw
      .map(a => a.areaAsignada!)
      .filter(Boolean)
      .sort()

    const gruposDisponibles: { value: string; label: string; tipo: string }[] = []

    if (esAdmin) {
      gruposDisponibles.push({ value: 'todos', label: 'Todos los usuarios', tipo: 'grupo' })
      gruposDisponibles.push({ value: 'rol:admin', label: 'Administradores', tipo: 'rol' })
      gruposDisponibles.push({ value: 'rol:coordinador', label: 'Coordinadores', tipo: 'rol' })
      gruposDisponibles.push({ value: 'rol:voluntario', label: 'Voluntarios', tipo: 'rol' })
      areas.forEach(area => {
        gruposDisponibles.push({ value: `area:${area.toLowerCase()}`, label: `Área: ${area}`, tipo: 'area' })
      })
    } else if (esCoordinador && usuario.fichaVoluntario?.areaAsignada) {
      const area = usuario.fichaVoluntario.areaAsignada
      gruposDisponibles.push({ value: `area:${area.toLowerCase()}`, label: `Mi área: ${area}`, tipo: 'area' })
    }

    return NextResponse.json({
      usuarios,
      grupos: gruposDisponibles,
      permisos: { puedeEnviarGrupos: esAdmin || esCoordinador, puedeEnviarTodos: esAdmin }
    })
  } catch (error) {
    console.error('Error destinatarios:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
