import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inventarioSlug = searchParams.get('inventario') || 'all' // 'all' = general, o slug específico
    const familiaId = searchParams.get('familia')
    const busqueda = searchParams.get('busqueda')
    const soloAlertas = searchParams.get('alertas') === 'true'

    // Obtener todas las categorías con su jerarquía
    const todasCategorias = await prisma.categoriaInventario.findMany({
      where: { activa: true },
      include: {
        hijos: {
          where: { activa: true },
          orderBy: { orden: 'asc' }
        },
        padre: true
      },
      orderBy: { orden: 'asc' }
    })

    // Separar categoría general y áreas
    const categoriaGeneral = todasCategorias.find(c => c.esGeneral)
    const areas = todasCategorias.filter(c => !c.esGeneral && !c.padreId)

    // Determinar qué categorías incluir en la búsqueda
    let categoriasIds: string[] = []
    
    if (inventarioSlug === 'all') {
      // Inventario general: incluir TODAS las categorías
      categoriasIds = todasCategorias.map(c => c.id)
    } else {
      // Inventario específico
      const categoriaSeleccionada = todasCategorias.find(c => c.slug === inventarioSlug)
      if (categoriaSeleccionada) {
        categoriasIds = [categoriaSeleccionada.id]
        // Incluir sub-inventarios (hijos)
        const hijos = todasCategorias.filter(c => c.padreId === categoriaSeleccionada.id)
        categoriasIds.push(...hijos.map(h => h.id))
      }
    }

    // Construir filtros para artículos
    const where: any = { 
      activo: true,
      familia: {
        categoriaId: { in: categoriasIds }
      }
    }
    
    if (familiaId && familiaId !== 'all') {
      where.familiaId = familiaId
    }
    
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { codigo: { contains: busqueda, mode: 'insensitive' } },
        { descripcion: { contains: busqueda, mode: 'insensitive' } }
      ]
    }

    // Obtener artículos
    let articulos = await prisma.articulo.findMany({
      where,
      include: {
        familia: {
          include: { categoria: true }
        },
        ubicacion: true,
        servicio: { select: { nombre: true } }
      },
      orderBy: [
        { familia: { categoria: { orden: 'asc' } } },
        { nombre: 'asc' }
      ]
    })

    // Filtrar por alertas si es necesario
    if (soloAlertas) {
      const hoy = new Date()
      const tresMeses = new Date()
      tresMeses.setMonth(tresMeses.getMonth() + 3)
      
      articulos = articulos.filter(a => 
        a.stockActual < a.stockMinimo || 
        (a.fechaCaducidad && new Date(a.fechaCaducidad) <= tresMeses)
      )
    }

    // Obtener familias filtradas por inventario seleccionado
    const familias = await prisma.familiaArticulo.findMany({
      where: {
        categoriaId: { in: categoriasIds }
      },
      include: { categoria: true },
      orderBy: [
        { categoria: { orden: 'asc' } },
        { nombre: 'asc' }
      ]
    })

    // Calcular estadísticas para el inventario seleccionado
    const articulosParaStats = await prisma.articulo.findMany({ 
      where: { 
        activo: true,
        familia: { categoriaId: { in: categoriasIds } }
      },
      include: { familia: true }
    })
    
    const hoy = new Date()
    const tresMeses = new Date()
    tresMeses.setMonth(tresMeses.getMonth() + 3)

    const stats = {
      totalArticulos: articulosParaStats.length,
      stockBajo: articulosParaStats.filter(a => a.stockActual < a.stockMinimo).length,
      porCaducar: articulosParaStats.filter(a => 
        a.fechaCaducidad && new Date(a.fechaCaducidad) <= tresMeses && new Date(a.fechaCaducidad) > hoy
      ).length,
      caducados: articulosParaStats.filter(a => 
        a.fechaCaducidad && new Date(a.fechaCaducidad) <= hoy
      ).length,
      valorTotal: 0 // Se puede añadir si se tiene precio
    }

    // Calcular estadísticas por área (para el inventario general)
    const statsPorArea = inventarioSlug === 'all' ? await Promise.all(
      areas.map(async (area) => {
        const idsArea = [area.id, ...todasCategorias.filter(c => c.padreId === area.id).map(c => c.id)]
        const articulosArea = articulosParaStats.filter(a => idsArea.includes(a.familia.categoriaId))
        return {
          id: area.id,
          slug: area.slug,
          nombre: area.nombre,
          color: area.color,
          icono: area.icono,
          totalArticulos: articulosArea.length,
          stockBajo: articulosArea.filter(a => a.stockActual < a.stockMinimo).length,
          subInventarios: todasCategorias.filter(c => c.padreId === area.id).map(sub => ({
            id: sub.id,
            slug: sub.slug,
            nombre: sub.nombre
          }))
        }
      })
    ) : []

    return NextResponse.json({ 
      articulos, 
      categorias: todasCategorias,
      areas,
      familias,
      stats,
      statsPorArea,
      inventarioActual: inventarioSlug
    })
  } catch (error) {
    console.error('Error en GET /api/logistica:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      codigo, nombre, descripcion, stockActual, stockMinimo, 
      unidad, tieneCaducidad, fechaCaducidad, ubicacionId, 
      familiaId, metadatos 
    } = body

    if (!nombre || !familiaId) {
      return NextResponse.json({ error: 'Nombre y familia son requeridos' }, { status: 400 })
    }

    // Obtener el servicio por defecto
    let servicio = await prisma.servicio.findFirst()
    if (!servicio) {
      // Crear servicio por defecto si no existe
      servicio = await prisma.servicio.create({
        data: {
          nombre: 'Protección Civil Bormujos',
          codigo: 'PCB'
        }
      })
    }

    const articulo = await prisma.articulo.create({
      data: {
        codigo,
        nombre,
        descripcion,
        stockActual: stockActual || 0,
        stockMinimo: stockMinimo || 0,
        unidad: unidad || 'unidad',
        tieneCaducidad: tieneCaducidad || false,
        fechaCaducidad: fechaCaducidad ? new Date(fechaCaducidad) : null,
        ubicacionId: ubicacionId || null,
        familiaId,
        servicioId: servicio.id,
        metadatos
      },
      include: {
        familia: { include: { categoria: true } },
        ubicacion: true
      }
    })

    return NextResponse.json({ success: true, articulo })
  } catch (error) {
    console.error('Error en POST /api/logistica:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}