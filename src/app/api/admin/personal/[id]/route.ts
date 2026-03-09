import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if (!['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(rol)) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { activo, responsableTurno, carnetConducir, experiencia, nivelCompromiso, esOperativo, esJefeServicio } = body

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
    if (typeof esOperativo === 'boolean') {
      dataToUpdate.esOperativo = esOperativo
    }
    if (typeof esJefeServicio === 'boolean') {
      dataToUpdate.esJefeServicio = esJefeServicio
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
      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'UPDATE', entidad: 'Usuario', entidadId: usuario.id, descripcion: `Usuario actualizado: ${usuario.nombre} ${usuario.apellidos}`, usuarioId, usuarioNombre, modulo: 'Administracion', datosNuevos: { nombre: usuario.nombre, email: usuario.email } })
      return NextResponse.json({ success: true, usuario })
    }

    return NextResponse.json({ error: 'No hay datos válidos para actualizar' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar voluntario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
