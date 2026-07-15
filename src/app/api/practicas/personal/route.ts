import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/practicas/personal
 * Listado ligero de efectivos activos para el formulario de registro de
 * prácticas (selección de responsable de turno y participantes).
 * Accesible a cualquier usuario autenticado: registrar una práctica no
 * requiere privilegios de administración.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const voluntarios = await prisma.usuario.findMany({
      where: { activo: true, numeroVoluntario: { not: null } },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        numeroVoluntario: true,
        email: true,
      },
      orderBy: [{ numeroVoluntario: 'asc' }, { apellidos: 'asc' }],
    })

    return NextResponse.json({ voluntarios })
  } catch (error) {
    console.error('Error al obtener personal para prácticas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
