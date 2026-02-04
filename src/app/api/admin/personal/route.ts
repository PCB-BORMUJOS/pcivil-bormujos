import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
    if (incluirRoles) {
      roles = await prisma.rol.findMany({
        orderBy: { nombre: 'asc' }
      })
    }

    return NextResponse.json({ voluntarios, roles: incluirRoles ? roles : undefined })
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

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario' },
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
    const { id, accion, activo, password, rolId, nombre, apellidos, telefono, dni, numeroVoluntario, email } = body

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
      return NextResponse.json({ success: true, message: 'Contraseña actualizada' })
    }

    // Acción: cambiar rol
    if (accion === 'rol') {
      if (!rolId) {
        return NextResponse.json({ error: 'Rol requerido' }, { status: 400 })
      }
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { rolId }
      })
      return NextResponse.json({ success: true, usuario })
    }

    // Acción: actualizar datos básicos
    if (accion === 'datos') {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: {
          nombre: nombre || usuarioExistente.nombre,
          apellidos: apellidos || usuarioExistente.apellidos,
          telefono: telefono !== undefined ? telefono : usuarioExistente.telefono,
          dni: dni !== undefined ? dni : usuarioExistente.dni,
          numeroVoluntario: numeroVoluntario !== undefined ? numeroVoluntario : usuarioExistente.numeroVoluntario,
          email: email || usuarioExistente.email,
        }
      })
      return NextResponse.json({ success: true, usuario })
    }

    // Acción: activar/desactivar usuario
    if (typeof activo === 'boolean') {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { activo }
      })
      return NextResponse.json({ success: true, usuario })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar voluntario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
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

    return NextResponse.json({ success: true, message: 'Usuario eliminado' })
  } catch (error) {
    console.error('Error al eliminar voluntario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
