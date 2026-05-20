import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarLogistica } from '@/lib/notificaciones'

const AREAS_NOMBRE: Record<string, string> = {
  'socorrismo': 'Socorrismo',
  'incendios': 'Incendios',
  'parque-movil': 'Parque Móvil',
  'transmisiones': 'Transmisiones',
  'formacion': 'Formación',
  'pma': 'PMA',
  'vestuario': 'Vestuario',
  'drones': 'Drones',
  'accion_social': 'Acción Social',
  'vehiculos': 'Vehículos',
  'logistica': 'Logística'
}

async function generarNumeroPeticion(): Promise<string> {
  const año = new Date().getFullYear()
  const ultimaPeticion = await prisma.peticionMaterial.findFirst({
    where: { numero: { startsWith: `PET-${año}` } },
    orderBy: { numero: 'desc' }
  })
  let siguiente = 1
  if (ultimaPeticion) {
    const partes = ultimaPeticion.numero.split('-')
    siguiente = parseInt(partes[2]) + 1
  }
  return `PET-${año}-${siguiente.toString().padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const area = searchParams.get('area')
    const estado = searchParams.get('estado')
    const misPeticiones = searchParams.get('mis') === 'true'

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    const where: any = {}
    if (misPeticiones && usuario) where.solicitanteId = usuario.id
    if (area && area !== 'all') where.areaOrigen = area
    if (estado && estado !== 'all') where.estado = estado

    const peticiones = await prisma.peticionMaterial.findMany({
      where,
      include: {
        items: {
          include: {
            articulo: { select: { id: true, nombre: true, codigo: true, stockActual: true } }
          }
        },
        solicitante: {
          select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true }
        },
        articulo: {
          select: { nombre: true, codigo: true, stockActual: true }
        },
        aprobadoPor: {
          select: { nombre: true, apellidos: true }
        },
        recibidoPor: {
          select: { nombre: true, apellidos: true }
        },
        historial: {
          include: {
            usuario: { select: { nombre: true, apellidos: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { fechaSolicitud: 'desc' }
    })

    const stats = {
      total: peticiones.length,
      pendientes: peticiones.filter(p => p.estado === 'pendiente').length,
      aprobadas: peticiones.filter(p => p.estado === 'aprobada').length,
      enCompra: peticiones.filter(p => p.estado === 'en_compra').length,
      recibidas: peticiones.filter(p => p.estado === 'recibida').length,
      rechazadas: peticiones.filter(p => p.estado === 'rechazada').length
    }

    return NextResponse.json({ peticiones, stats })
  } catch (error) {
    console.error('Error en GET /api/logistica/peticiones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { motivo, prioridad, descripcion, areaOrigen, items } = body

    if (!motivo || !areaOrigen) {
      return NextResponse.json({ error: 'Motivo y área son requeridos' }, { status: 400 })
    }

    // items: [{ articuloId?, nombreArticulo, cantidad, unidad }]
    const itemsArray: Array<{ articuloId?: string; nombreArticulo: string; cantidad: number; unidad: string }> = Array.isArray(items) && items.length > 0
      ? items
      : []

    if (itemsArray.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un artículo' }, { status: 400 })
    }

    for (const item of itemsArray) {
      if (!item.nombreArticulo || !item.cantidad || item.cantidad < 1) {
        return NextResponse.json({ error: 'Cada artículo necesita nombre y cantidad válida' }, { status: 400 })
      }
    }

    const numero = await generarNumeroPeticion()

    // Resumen del pedido para el campo heredado nombreArticulo
    const resumenArticulos = itemsArray.length === 1
      ? itemsArray[0].nombreArticulo
      : `${itemsArray.length} artículos`

    const peticion = await prisma.peticionMaterial.create({
      data: {
        numero,
        solicitanteId: usuario.id,
        areaOrigen,
        nombreArticulo: resumenArticulos,
        cantidad: itemsArray.reduce((sum, i) => sum + i.cantidad, 0),
        unidad: itemsArray.length === 1 ? (itemsArray[0].unidad || 'unidad') : 'varios',
        motivo,
        prioridad: prioridad || 'normal',
        descripcion,
        estado: 'pendiente',
        items: {
          create: itemsArray.map(item => ({
            articuloId: item.articuloId || null,
            nombreArticulo: item.nombreArticulo,
            cantidad: parseInt(String(item.cantidad)),
            unidad: item.unidad || 'unidad'
          }))
        }
      },
      include: {
        items: {
          include: { articulo: { select: { nombre: true, codigo: true } } }
        },
        solicitante: { select: { nombre: true, apellidos: true, numeroVoluntario: true } }
      }
    })

    await prisma.historialPeticion.create({
      data: {
        peticionId: peticion.id,
        estadoNuevo: 'pendiente',
        comentario: 'Petición creada',
        usuarioId: usuario.id
      }
    })

    try {
      const areaNombre = AREAS_NOMBRE[areaOrigen] || areaOrigen
      const resumen = itemsArray.length === 1
        ? `${itemsArray[0].cantidad} ${itemsArray[0].unidad || 'ud'} de "${itemsArray[0].nombreArticulo}"`
        : `${itemsArray.length} artículos`
      await notificarLogistica(
        'peticion_nueva',
        `Nueva petición ${numero}`,
        `${usuario.nombre} ${usuario.apellidos} (${areaNombre}) ha solicitado ${resumen}`,
        '/logistica?tab=peticiones',
        peticion.id
      )
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError)
    }

    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({
      accion: 'CREATE',
      entidad: 'PeticionMaterial',
      entidadId: peticion.id,
      descripcion: `Petición ${numero}: ${resumenArticulos} (${areaOrigen})`,
      usuarioId,
      usuarioNombre,
      modulo: 'Logistica',
      datosNuevos: { numero, items: itemsArray, prioridad, areaOrigen }
    })

    return NextResponse.json({ success: true, peticion })
  } catch (error) {
    console.error('Error en POST /api/logistica/peticiones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
