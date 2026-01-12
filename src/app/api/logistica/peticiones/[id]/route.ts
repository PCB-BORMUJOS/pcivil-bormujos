import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { notificarCambioPeticion } from '@/lib/notificaciones'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const peticion = await prisma.peticionMaterial.findUnique({
      where: { id: params.id },
      include: {
        solicitante: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } },
        articulo: { 
          select: { 
            id: true, nombre: true, codigo: true, stockActual: true, unidad: true,
            familia: { select: { nombre: true, categoria: { select: { nombre: true, slug: true } } } }
          } 
        },
        aprobadoPor: { select: { nombre: true, apellidos: true } },
        recibidoPor: { select: { nombre: true, apellidos: true } },
        historial: {
          include: { usuario: { select: { nombre: true, apellidos: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!peticion) {
      return NextResponse.json({ error: 'Petición no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ peticion })
  } catch (error) {
    console.error('Error en GET /api/logistica/peticiones/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { accion, comentario, proveedor, costeEstimado, costeFinal, numeroFactura } = body

    const peticionActual = await prisma.peticionMaterial.findUnique({
      where: { id: params.id },
      include: { 
        articulo: true,
        solicitante: { select: { id: true, nombre: true, apellidos: true } }
      }
    })

    if (!peticionActual) {
      return NextResponse.json({ error: 'Petición no encontrada' }, { status: 404 })
    }

    const estadoAnterior = peticionActual.estado
    let nuevoEstado = estadoAnterior
    let datosActualizar: any = {}

    switch (accion) {
      case 'aprobar':
        if (estadoAnterior !== 'pendiente') {
          return NextResponse.json({ error: 'Solo se pueden aprobar peticiones pendientes' }, { status: 400 })
        }
        nuevoEstado = 'aprobada'
        datosActualizar = {
          estado: nuevoEstado,
          fechaAprobacion: new Date(),
          aprobadoPorId: usuario.id,
          notasAprobacion: comentario
        }
        break

      case 'rechazar':
        if (estadoAnterior !== 'pendiente') {
          return NextResponse.json({ error: 'Solo se pueden rechazar peticiones pendientes' }, { status: 400 })
        }
        nuevoEstado = 'rechazada'
        datosActualizar = {
          estado: nuevoEstado,
          fechaAprobacion: new Date(),
          aprobadoPorId: usuario.id,
          motivoRechazo: comentario
        }
        break

      case 'en_compra':
        if (estadoAnterior !== 'aprobada') {
          return NextResponse.json({ error: 'Solo se pueden pasar a compra peticiones aprobadas' }, { status: 400 })
        }
        nuevoEstado = 'en_compra'
        datosActualizar = {
          estado: nuevoEstado,
          fechaCompra: new Date(),
          proveedor,
          costeEstimado: costeEstimado ? parseFloat(costeEstimado) : null,
          notasCompra: comentario
        }
        break

      case 'recibir':
        if (estadoAnterior !== 'en_compra' && estadoAnterior !== 'aprobada') {
          return NextResponse.json({ error: 'Solo se pueden recibir peticiones en compra o aprobadas' }, { status: 400 })
        }
        nuevoEstado = 'recibida'
        datosActualizar = {
          estado: nuevoEstado,
          fechaRecepcion: new Date(),
          recibidoPorId: usuario.id,
          costeFinal: costeFinal ? parseFloat(costeFinal) : null,
          numeroFactura,
          notasRecepcion: comentario
        }
        
        // Actualizar stock del artículo
        if (peticionActual.articuloId && peticionActual.articulo) {
          const nuevoStock = peticionActual.articulo.stockActual + peticionActual.cantidad
          
          await prisma.articulo.update({
            where: { id: peticionActual.articuloId },
            data: { stockActual: nuevoStock }
          })

          await prisma.movimientoStock.create({
            data: {
              tipo: 'entrada',
              cantidad: peticionActual.cantidad,
              motivo: `Recepción petición ${peticionActual.numero}`,
              notas: `Stock actualizado: ${peticionActual.articulo.stockActual} → ${nuevoStock}`,
              articuloId: peticionActual.articuloId,
              usuarioId: usuario.id
            }
          })
        }
        break

      case 'cancelar':
        if (['recibida', 'rechazada', 'cancelada'].includes(estadoAnterior)) {
          return NextResponse.json({ error: 'No se puede cancelar esta petición' }, { status: 400 })
        }
        nuevoEstado = 'cancelada'
        datosActualizar = {
          estado: nuevoEstado,
          motivoRechazo: comentario
        }
        break

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    const peticionActualizada = await prisma.peticionMaterial.update({
      where: { id: params.id },
      data: datosActualizar,
      include: {
        solicitante: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } },
        articulo: { select: { nombre: true, codigo: true, stockActual: true } },
        aprobadoPor: { select: { nombre: true, apellidos: true } },
        recibidoPor: { select: { nombre: true, apellidos: true } }
      }
    })

    await prisma.historialPeticion.create({
      data: {
        peticionId: params.id,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        comentario,
        usuarioId: usuario.id
      }
    })

    // Notificar al solicitante del cambio de estado
    try {
      await notificarCambioPeticion(
        {
          id: peticionActual.id,
          numero: peticionActual.numero,
          nombreArticulo: peticionActual.nombreArticulo,
          solicitanteId: peticionActual.solicitanteId
        },
        nuevoEstado,
        usuario.id
      )
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError)
    }

    return NextResponse.json({ success: true, peticion: peticionActualizada })
  } catch (error) {
    console.error('Error en PUT /api/logistica/peticiones/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
