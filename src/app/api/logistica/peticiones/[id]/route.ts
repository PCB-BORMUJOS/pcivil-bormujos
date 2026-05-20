import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCambioPeticion } from '@/lib/notificaciones'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const peticion = await prisma.peticionMaterial.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            articulo: {
              select: {
                id: true, nombre: true, codigo: true, stockActual: true, unidad: true,
                familia: { select: { nombre: true, categoria: { select: { nombre: true, slug: true } } } }
              }
            }
          }
        },
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
    const session = await getServerSession(authOptions)
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
    const {
      accion, comentario, proveedor, costeEstimado, costeFinal,
      numeroFactura, numeroRc, numeroAlbaran, urlRc, urlAlbaran,
      nombreArticulo, cantidad, unidad, motivo, prioridad, descripcion, areaOrigen,
      // Para recepción parcial: [{ itemId, cantidadRecibida, costeUnitario }]
      itemsRecepcion
    } = body

    const peticionActual = await prisma.peticionMaterial.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { articulo: true } },
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
          notasAprobacion: comentario,
          ...(urlRc ? { urlRc } : {}),
          ...(numeroRc ? { numeroRc } : {})
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
          notasCompra: comentario,
          ...(numeroRc ? { numeroRc } : {}),
          ...(urlRc ? { urlRc } : {})
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
          notasRecepcion: comentario,
          ...(urlAlbaran ? { urlAlbaran } : {}),
          ...(numeroAlbaran ? { numeroAlbaran } : {})
        }

        // Actualizar stock de cada item de la petición
        const itemsAActualizar = peticionActual.items.length > 0
          ? peticionActual.items
          : peticionActual.articuloId && peticionActual.articulo
            // Compatibilidad con peticiones antiguas de un solo artículo
            ? [{ id: null as null, articuloId: peticionActual.articuloId, articulo: peticionActual.articulo, cantidad: peticionActual.cantidad ?? 0, nombreArticulo: peticionActual.nombreArticulo || '', unidad: peticionActual.unidad || 'unidad' }]
            : []

        for (const item of itemsAActualizar) {
          if (!item.articuloId || !item.articulo) continue

          // Si hay recepción parcial, usa cantidadRecibida; si no, usa cantidad total
          const recepcionItem = Array.isArray(itemsRecepcion)
            ? itemsRecepcion.find((r: any) => r.itemId === item.id)
            : null
          const cantidadAIngresar: number = recepcionItem?.cantidadRecibida ?? item.cantidad
          if (!cantidadAIngresar || cantidadAIngresar <= 0) continue

          const nuevoStock = item.articulo.stockActual + cantidadAIngresar

          await prisma.articulo.update({
            where: { id: item.articuloId },
            data: { stockActual: nuevoStock }
          })

          await prisma.movimientoStock.create({
            data: {
              tipo: 'entrada',
              cantidad: cantidadAIngresar,
              motivo: `Recepción petición ${peticionActual.numero}`,
              notas: `Stock: ${item.articulo.stockActual} → ${nuevoStock}. Albarán: ${numeroAlbaran || '-'}`,
              articuloId: item.articuloId,
              usuarioId: usuario.id
            }
          })

          // Actualizar cantidadRecibida en el item si tiene id propio
          if (item.id && recepcionItem) {
            await prisma.peticionItem.update({
              where: { id: item.id },
              data: {
                cantidadRecibida: cantidadAIngresar,
                costeUnitario: recepcionItem.costeUnitario ? parseFloat(recepcionItem.costeUnitario) : null
              }
            })
          }
        }
        break

      case 'cancelar':
        if (['recibida', 'rechazada', 'cancelada'].includes(estadoAnterior)) {
          return NextResponse.json({ error: 'No se puede cancelar esta petición' }, { status: 400 })
        }
        nuevoEstado = 'cancelada'
        datosActualizar = { estado: nuevoEstado, motivoRechazo: comentario }
        break

      case 'editar':
        if (nombreArticulo) datosActualizar.nombreArticulo = nombreArticulo
        if (cantidad) datosActualizar.cantidad = parseInt(String(cantidad), 10) || peticionActual.cantidad
        if (unidad) datosActualizar.unidad = unidad
        if (motivo) datosActualizar.motivo = motivo
        if (prioridad) datosActualizar.prioridad = prioridad
        if (descripcion !== undefined) datosActualizar.descripcion = descripcion
        if (areaOrigen) datosActualizar.areaOrigen = areaOrigen
        if (proveedor !== undefined) datosActualizar.proveedor = proveedor
        if (costeEstimado !== undefined) datosActualizar.costeEstimado = costeEstimado ? parseFloat(String(costeEstimado)) : null
        if (costeFinal !== undefined) datosActualizar.costeFinal = costeFinal ? parseFloat(String(costeFinal)) : null
        if (numeroFactura !== undefined) datosActualizar.numeroFactura = numeroFactura
        break

      case 'actualizar_docs':
        if (urlRc !== undefined) datosActualizar.urlRc = urlRc
        if (urlAlbaran !== undefined) datosActualizar.urlAlbaran = urlAlbaran
        if (numeroRc !== undefined) datosActualizar.numeroRc = numeroRc
        if (numeroAlbaran !== undefined) datosActualizar.numeroAlbaran = numeroAlbaran
        break

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    const peticionActualizada = await prisma.peticionMaterial.update({
      where: { id: params.id },
      data: datosActualizar,
      include: {
        items: {
          include: { articulo: { select: { nombre: true, codigo: true, stockActual: true } } }
        },
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

    try {
      await notificarCambioPeticion(
        {
          id: peticionActual.id,
          numero: peticionActual.numero,
          nombreArticulo: peticionActual.nombreArticulo ?? '',
          solicitanteId: peticionActual.solicitanteId
        },
        nuevoEstado,
        usuario.id
      )
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError)
    }

    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    const auditAccionMap: Record<string, string> = {
      aprobar: 'APPROVE', rechazar: 'REJECT', en_compra: 'UPDATE',
      recibir: 'UPDATE', cancelar: 'DELETE', editar: 'UPDATE', actualizar_docs: 'UPDATE'
    }
    const auditDescMap: Record<string, string> = {
      aprobar: `Petición ${peticionActualizada.numero} aprobada`,
      rechazar: `Petición ${peticionActualizada.numero} rechazada`,
      en_compra: `Petición ${peticionActualizada.numero} → en compra (proveedor: ${proveedor || '-'})`,
      recibir: `Petición ${peticionActualizada.numero} recibida. Albarán: ${numeroAlbaran || '-'}`,
      cancelar: `Petición ${peticionActualizada.numero} cancelada`,
      editar: `Petición ${peticionActualizada.numero} editada`,
      actualizar_docs: `Petición ${peticionActualizada.numero} documentos actualizados`
    }
    await registrarAudit({
      accion: auditAccionMap[accion] || 'UPDATE',
      entidad: 'PeticionMaterial',
      entidadId: peticionActualizada.id,
      descripcion: auditDescMap[accion] || `Petición ${peticionActualizada.numero} actualizada`,
      usuarioId,
      usuarioNombre,
      modulo: 'Logistica',
      datosNuevos: { estado: peticionActualizada.estado }
    })

    return NextResponse.json({ success: true, peticion: peticionActualizada })
  } catch (error) {
    console.error('Error en PUT /api/logistica/peticiones/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
