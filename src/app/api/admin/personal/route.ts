import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const rol = (session.user as any).rol as string ?? 'voluntario'
    const nivelRol = ({ superadmin: 4, admin: 3, coordinador: 2, voluntario: 1 } as Record<string,number>)[rol] ?? 1
    if (nivelRol < 2) {
      return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const incluirBajas = searchParams.get('bajas') === 'true'
    const incluirRoles = searchParams.get('roles') === 'true'

    const voluntarios = await prisma.usuario.findMany({
      where: incluirBajas ? {} : { activo: true },
      include: {
        rol: true,
        servicio: { select: { id: true, nombre: true, codigo: true } },
        fichaVoluntario: true,
      },
      orderBy: [
        { numeroVoluntario: 'asc' }
      ]
    })

    // Si se piden los roles, también los devolvemos
    let roles: any[] = []
    let servicios: any[] = []
    if (incluirRoles) {
      [roles, servicios] = await Promise.all([
        prisma.rol.findMany({ orderBy: { nombre: 'asc' } }),
        prisma.servicio.findMany({ orderBy: { nombre: 'asc' } }),
      ])
    }

    return NextResponse.json({ voluntarios, roles: incluirRoles ? roles : undefined, servicios: incluirRoles ? servicios : undefined })
  } catch (error) {
    console.error('Error al obtener personal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      password,
      nombre,
      apellidos,
      telefono,
      dni,
      numeroVoluntario,
      rolId,
      servicioId,
    } = body

    // Validaciones
    if (!email || !password || !nombre || !apellidos || !rolId || !servicioId) {
      return NextResponse.json(
        { error: 'Email, contraseña, nombre, apellidos, rol y servicio son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Hash de la contraseña
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Contraseña debe tener al menos 8 caracteres, una mayúscula y un número' }, { status: 400 })
    }
    const hashedPassword = await hash(password, 12)

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        apellidos,
        telefono: telefono || null,
        dni: dni || null,
        numeroVoluntario: numeroVoluntario || null,
        rolId,
        servicioId,
        experiencia: 'MEDIA',
        activo: true,
      },
      include: {
        rol: true,
        servicio: true,
      }
    })

    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({
      accion: 'CREATE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: 'Usuario creado: ' + usuario.nombre + ' ' + usuario.apellidos,
      usuarioId,
      usuarioNombre,
      modulo: 'Administración',
      datosNuevos: { email: usuario.email, rol: usuario.rol?.nombre },
    })
    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error crear usuario:', msg)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, accion, activo, password, rolId, servicioId, nombre, apellidos, telefono, dni, numeroVoluntario, email } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!usuarioExistente) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Acción: cambiar contraseña
    if (accion === 'password') {
      if (!password) {
        return NextResponse.json({ error: 'Nueva contraseña requerida' }, { status: 400 })
      }
      const hashedPassword = await hash(password, 12)
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { password: hashedPassword }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Usuario',
        entidadId: id,
        descripcion: `Contraseña de usuario actualizada`,
        usuarioId,
        usuarioNombre,
        modulo: 'Administración',
      })

      return NextResponse.json({ success: true, message: 'Contraseña actualizada' })
    }

    // Acción: cambiar rol
    if (accion === 'rol') {
      if (!rolId) {
        return NextResponse.json({ error: 'Rol requerido' }, { status: 400 })
      }
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { rolId },
        include: { rol: true }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Usuario',
        entidadId: id,
        descripcion: `Rol de usuario actualizado a: ${usuario.rol?.nombre}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Administración',
        datosAnteriores: { rol: usuarioExistente.rolId },
        datosNuevos: { rol: usuario.rol?.nombre }
      })

      return NextResponse.json({ success: true, usuario })
    }

    // Acción: actualizar datos básicos
    if (accion === 'datos') {
      const datosNuevos = {
        nombre: nombre || usuarioExistente.nombre,
        apellidos: apellidos || usuarioExistente.apellidos,
        telefono: telefono !== undefined ? telefono : usuarioExistente.telefono,
        dni: dni !== undefined ? dni : usuarioExistente.dni,
        numeroVoluntario: numeroVoluntario !== undefined ? numeroVoluntario : usuarioExistente.numeroVoluntario,
        email: email || usuarioExistente.email,
        ...(body.permisosExtra !== undefined && { permisosExtra: body.permisosExtra }),
      }

      const usuario = await prisma.usuario.update({
        where: { id },
        data: datosNuevos
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Usuario',
        entidadId: id,
        descripcion: `Datos del usuario ${usuario.nombre} ${usuario.apellidos} actualizados`,
        usuarioId,
        usuarioNombre,
        modulo: 'Administración',
        datosAnteriores: {
          nombre: usuarioExistente.nombre,
          apellidos: usuarioExistente.apellidos,
          telefono: usuarioExistente.telefono,
          dni: usuarioExistente.dni,
          numeroVoluntario: usuarioExistente.numeroVoluntario,
          email: usuarioExistente.email,
        },
        datosNuevos
      })

      return NextResponse.json({ success: true, usuario })
    }

    // Acción: activar/desactivar usuario
    if (typeof activo === 'boolean') {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { activo }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: activo ? 'ACTIVATE' : 'DEACTIVATE',
        entidad: 'Usuario',
        entidadId: id,
        descripcion: `Usuario ${usuarioExistente.nombre} ${usuarioExistente.apellidos} ${activo ? 'activado' : 'desactivado'}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Administración',
        datosAnteriores: { activo: usuarioExistente.activo },
        datosNuevos: { activo }
      })

      return NextResponse.json({ success: true, usuario })
    }

    // Acción: actualizar permisosExtra individuales
    if (body.permisosExtra !== undefined && !accion) {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { permisosExtra: body.permisosExtra }
      })
      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Usuario',
        entidadId: id,
        descripcion: `Permisos adicionales actualizados para ${usuarioExistente.nombre} ${usuarioExistente.apellidos}: [${body.permisosExtra.join(', ')}]`,
        usuarioId,
        usuarioNombre,
        modulo: 'Administración',
        datosNuevos: { permisosExtra: body.permisosExtra }
      })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error al actualizar voluntario:', error)
    if (error?.code === 'P2002') {
      const campo = error?.meta?.target?.[0] || 'campo'
      return NextResponse.json({ error: 'El ' + campo + ' ya esta en uso por otro usuario' }, { status: 400 })
    }
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!usuarioExistente) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Eliminar usuario (hard delete)
    await prisma.usuario.delete({
      where: { id }
    })

    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({
      accion: 'DELETE',
      entidad: 'Usuario',
      entidadId: id,
      descripcion: 'Usuario eliminado: ' + id,
      usuarioId,
      usuarioNombre,
      modulo: 'Administración',
    })
    return NextResponse.json({ success: true, message: 'Usuario eliminado' })
  } catch (error) {
    console.error('Error al eliminar voluntario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
