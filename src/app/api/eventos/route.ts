import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const incluirPrivados = searchParams.get('privados') === 'true'

    let whereClause: any = {}

    // Filtrar por mes si se proporciona
    if (mes) {
      const [year, month] = mes.split('-').map(Number)
      const inicioMes = new Date(year, month - 1, 1)
      const finMes = new Date(year, month, 0)
      whereClause.fecha = { gte: inicioMes, lte: finMes }
    }

    // Obtener usuario actual si está logueado
    let usuarioActual = null
    if (session?.user?.email) {
      usuarioActual = await prisma.usuario.findUnique({
        where: { email: session.user.email }
      })
    }

    // Lógica de visibilidad:
    // - Eventos públicos (visible=true, privado=false) -> todos los ven
    // - Eventos privados (privado=true) -> solo el creador los ve
    if (usuarioActual && incluirPrivados) {
      // Usuario logueado pidiendo sus eventos privados
      whereClause.OR = [
        { visible: true, privado: false },
        { privado: true, creadorId: usuarioActual.id }
      ]
    } else {
      // Solo eventos públicos
      whereClause.visible = true
      whereClause.privado = false
    }

    const eventos = await prisma.evento.findMany({
      where: whereClause,
      include: {
        creador: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } },
        participantes: {
          include: {
            usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } }
          }
        }
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
    })

    // Fallback: Obtener convocatorias de formación activas
    // Esto es útil para convocatorias creadas sin evento automático o migraciones
    const convocatorias = await (prisma as any).convocatoria.findMany({
      where: {
        estado: { in: ['planificada', 'inscripciones_abiertas', 'en_curso'] }
      },
      include: { curso: true }
    })

    // Mapear convocatorias al formato de evento
    const eventosFormacion = convocatorias
      .filter((f: any) => {
        // Evitar duplicados si ya hay un evento con el mismo título y fecha creado por el sistema
        const tituloEsperado = `Formación: ${f.curso?.nombre || 'Curso'}`
        const fechaStr = new Date(f.fechaInicio).toDateString()
        return !eventos.some(e =>
          e.titulo === tituloEsperado &&
          new Date(e.fecha).toDateString() === fechaStr
        )
      })
      .map((f: any) => ({
        id: f.id,
        titulo: `Formación: ${f.curso?.nombre || 'Curso'}`,
        descripcion: f.curso?.descripcion || '',
        tipo: 'formacion',
        fecha: f.fechaInicio,
        horaInicio: '09:00',
        ubicacion: f.lugar,
        color: '#8B5CF6',
        esConvocatoria: true // Bandera para el frontend
      }))

    return NextResponse.json({ eventos: [...eventos, ...eventosFormacion] })
  } catch (error) {
    console.error('Error al obtener eventos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { titulo, descripcion, tipo, fecha, horaInicio, horaFin, todoElDia, ubicacion, direccion, coordenadas, visible, privado, voluntariosMin, voluntariosMax, vehiculosNecesarios, color } = body

    // Validaciones
    if (!titulo || !tipo || !fecha || !horaInicio) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Si es evento privado, cualquier usuario puede crearlo
    // Si es evento público, solo admin/superadmin/coordinador
    const esEventoPrivado = privado === true
    const rolesPermitidos = ['superadmin', 'admin', 'coordinador']

    if (!esEventoPrivado && !rolesPermitidos.includes(usuario.rol.nombre)) {
      return NextResponse.json({ error: 'No tienes permisos para crear eventos públicos' }, { status: 403 })
    }

    const evento = await prisma.evento.create({
      data: {
        titulo,
        descripcion,
        tipo,
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        todoElDia: todoElDia || false,
        ubicacion,
        direccion,
        coordenadas,
        visible: esEventoPrivado ? false : (visible !== false),
        privado: esEventoPrivado,
        voluntariosMin,
        voluntariosMax,
        vehiculosNecesarios,
        color,
        creadorId: usuario.id,
        servicioId: usuario.servicioId
      }
    })

    return NextResponse.json({ success: true, evento })
  } catch (error) {
    console.error('Error al crear evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH - Actualizar fecha de evento (para drag & drop)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { id, fecha } = body

    if (!id || !fecha) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Verificar que el evento existe
    const eventoExistente = await prisma.evento.findUnique({ where: { id } })
    if (!eventoExistente) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Verificar permisos: admin puede mover cualquier evento, usuario solo los suyos privados
    const rolesPermitidos = ['superadmin', 'admin', 'coordinador']
    const esAdmin = rolesPermitidos.includes(usuario.rol.nombre)
    const esPropietario = eventoExistente.creadorId === usuario.id

    if (!esAdmin && !esPropietario) {
      return NextResponse.json({ error: 'No tienes permisos para mover este evento' }, { status: 403 })
    }

    const updateData: any = {}
    if (fecha) updateData.fecha = new Date(fecha)
    if (body.titulo) updateData.titulo = body.titulo
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion
    if (body.tipo) updateData.tipo = body.tipo
    if (body.horaInicio) updateData.horaInicio = body.horaInicio
    if (body.horaFin !== undefined) updateData.horaFin = body.horaFin
    if (body.ubicacion !== undefined) updateData.ubicacion = body.ubicacion
    if (body.color) updateData.color = body.color
    if (body.privado !== undefined) updateData.privado = body.privado
    if (body.visible !== undefined) updateData.visible = body.visible
    const evento = await prisma.evento.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, evento })
  } catch (error) {
    console.error('Error al actualizar evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email }, include: { rol: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const evento = await prisma.evento.findUnique({ where: { id } })
    if (!evento) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    const esAdmin = ['superadmin', 'admin'].includes(usuario.rol.nombre)
    const esPropietario = evento.creadorId === usuario.id
    if (!esAdmin && !esPropietario) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    await prisma.evento.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}