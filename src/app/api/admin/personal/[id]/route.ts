import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { activo, responsableTurno, carnetConducir, experiencia, nivelCompromiso } = body

    if (!params.id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: params.id }
    })

    if (!usuarioExistente) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Preparar datos a actualizar
    const dataToUpdate: any = {}

    if (typeof activo === 'boolean') {
      dataToUpdate.activo = activo
    }

    if (typeof responsableTurno === 'boolean') {
      dataToUpdate.responsableTurno = responsableTurno
    }

    if (typeof carnetConducir === 'boolean') {
      dataToUpdate.carnetConducir = carnetConducir
    }

    if (experiencia && ['BAJA', 'MEDIA', 'ALTA'].includes(experiencia)) {
      dataToUpdate.experiencia = experiencia
    }

    if (nivelCompromiso && ['BAJO', 'MEDIO', 'ALTO'].includes(nivelCompromiso)) {
      dataToUpdate.nivelCompromiso = nivelCompromiso
    }

    // Si hay datos para actualizar
    if (Object.keys(dataToUpdate).length > 0) {
      const usuario = await prisma.usuario.update({
        where: { id: params.id },
        data: dataToUpdate
      })
      return NextResponse.json({ success: true, usuario })
    }

    return NextResponse.json({ error: 'No hay datos válidos para actualizar' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar voluntario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
