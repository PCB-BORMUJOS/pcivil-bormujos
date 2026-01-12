import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { notificarLogistica } from '@/lib/notificaciones'

// Nombres de áreas para mostrar
const AREAS_NOMBRE: Record<string, string> = {
  'socorrismo': 'Socorrismo',
  'incendios': 'Incendios',
  'parque-movil': 'Parque Móvil',
  'transmisiones': 'Transmisiones',
  'formacion': 'Formación',
  'pma': 'PMA',
  'vestuario': 'Vestuario',
  'logistica': 'Logística'
}

// Generar número de petición
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
    const session = await getServerSession()
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
    
    if (misPeticiones && usuario) {
      where.solicitanteId = usuario.id
    }
    
    if (area && area !== 'all') {
      where.areaOrigen = area
    }
    
    if (estado && estado !== 'all') {
      where.estado = estado
    }

    const peticiones = await prisma.peticionMaterial.findMany({
      where,
      include: {
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
    const session = await getServerSession()
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
    const { 
      articuloId, nombreArticulo, cantidad, unidad, 
      motivo, prioridad, descripcion, areaOrigen 
    } = body

    if (!nombreArticulo || !cantidad || !motivo || !areaOrigen) {
      return NextResponse.json({ 
        error: 'Nombre, cantidad, motivo y área son requeridos' 
      }, { status: 400 })
    }

    const numero = await generarNumeroPeticion()

    const peticion = await prisma.peticionMaterial.create({
      data: {
        numero,
        solicitanteId: usuario.id,
        areaOrigen,
        articuloId: articuloId || null,
        nombreArticulo,
        cantidad: parseInt(cantidad),
        unidad: unidad || 'unidad',
        motivo,
        prioridad: prioridad || 'normal',
        descripcion,
        estado: 'pendiente'
      },
      include: {
        solicitante: { select: { nombre: true, apellidos: true, numeroVoluntario: true } },
        articulo: { select: { nombre: true, codigo: true } }
      }
    })

    // Crear entrada en historial
    await prisma.historialPeticion.create({
      data: {
        peticionId: peticion.id,
        estadoNuevo: 'pendiente',
        comentario: 'Petición creada',
        usuarioId: usuario.id
      }
    })

    // Notificar a logística/administradores sobre la nueva petición
    try {
      const areaNombre = AREAS_NOMBRE[areaOrigen] || areaOrigen
      await notificarLogistica(
        'peticion_nueva',
        `Nueva petición ${numero}`,
        `${usuario.nombre} ${usuario.apellidos} (${areaNombre}) ha solicitado ${cantidad} ${unidad} de "${nombreArticulo}"`,
        '/logistica?tab=peticiones',
        peticion.id
      )
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError)
    }

    return NextResponse.json({ success: true, peticion })
  } catch (error) {
    console.error('Error en POST /api/logistica/peticiones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
