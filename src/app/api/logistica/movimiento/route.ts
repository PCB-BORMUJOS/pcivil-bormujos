import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { articuloId, tipo, cantidad, motivo, notas } = body

    if (!articuloId || !tipo || !cantidad) {
      return NextResponse.json({ error: 'Artículo, tipo y cantidad son requeridos' }, { status: 400 })
    }

    // Obtener usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener artículo actual
    const articulo = await prisma.articulo.findUnique({
      where: { id: articuloId }
    })

    if (!articulo) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }

    // Calcular nuevo stock
    const cantidadNum = parseInt(cantidad)
    let nuevoStock = articulo.stockActual

    if (tipo === 'entrada') {
      nuevoStock += cantidadNum
    } else if (tipo === 'salida') {
      nuevoStock -= cantidadNum
      if (nuevoStock < 0) {
        return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 })
      }
    } else if (tipo === 'ajuste') {
      nuevoStock = cantidadNum
    }

    // Crear movimiento y actualizar stock en transacción
    const [movimiento] = await prisma.$transaction([
      prisma.movimientoStock.create({
        data: {
          tipo,
          cantidad: cantidadNum,
          motivo,
          notas,
          articuloId,
          usuarioId: usuario.id
        }
      }),
      prisma.articulo.update({
        where: { id: articuloId },
        data: { stockActual: nuevoStock }
      })
    ])

    return NextResponse.json({ success: true, movimiento, nuevoStock })
  } catch (error) {
    console.error('Error en POST /api/logistica/movimiento:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const articuloId = searchParams.get('articuloId')
    const inventarioSlug = searchParams.get('inventario')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    // Filtro por artículo específico
    if (articuloId) {
      where.articuloId = articuloId
    }

    // Filtro por inventario/área
    if (inventarioSlug && inventarioSlug !== 'all') {
      // Buscar la categoría y sus hijos
      const categoria = await prisma.categoriaInventario.findFirst({
        where: { slug: inventarioSlug }
      })

      if (categoria) {
        // Encontrar todas las categorías relacionadas (padre e hijos)
        const categoriasIds = [categoria.id]

        // Si es padre, buscar hijos
        const hijos = await prisma.categoriaInventario.findMany({
          where: { padreId: categoria.id },
          select: { id: true }
        })
        categoriasIds.push(...hijos.map(h => h.id))

        // Filtrar movimientos donde el artículo pertenezca a estas categorías
        where.articulo = {
          familia: {
            categoriaId: { in: categoriasIds }
          }
        }
      }
    }

    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: {
        articulo: {
          select: {
            nombre: true,
            codigo: true,
            familia: {
              select: {
                nombre: true,
                categoria: { select: { nombre: true, slug: true } }
              }
            }
          }
        },
        usuario: { select: { nombre: true, apellidos: true, numeroVoluntario: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ movimientos })
  } catch (error) {
    console.error('Error en GET /api/logistica/movimiento:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}