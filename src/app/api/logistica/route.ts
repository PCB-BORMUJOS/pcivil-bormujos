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
    const tipo = searchParams.get('tipo')

    // ===== EDIFICIOS =====
    if (tipo === 'edificios') {
      const edificios = await prisma.edificio.findMany({
        include: { _count: { select: { equiposECI: true } } },
        orderBy: { nombre: 'asc' }
      })
      return NextResponse.json({ edificios })
    }

    // ===== EQUIPOS ECI =====
    if (tipo === 'equipos-eci') {
      const edificioId = searchParams.get('edificioId')
      const whereEquipos: any = {}
      if (edificioId) whereEquipos.edificioId = edificioId
      
      const equipos = await prisma.equipoECI.findMany({
        where: whereEquipos,
        include: { edificio: true },
        orderBy: [{ edificio: { nombre: 'asc' } }, { tipo: 'asc' }]
      })
      
      const stats = { 
        total: equipos.length, 
        operativos: equipos.filter(e => e.estado === 'operativo').length, 
        revisionPendiente: equipos.filter(e => e.estado === 'revision_pendiente').length 
      }
      
      return NextResponse.json({ equipos, stats })
    }

    // ===== HIDRANTES =====
    if (tipo === 'hidrantes') {
      const hidrantes = await prisma.hidrante.findMany({ 
        orderBy: { codigo: 'asc' } 
      })
      const stats = { 
        total: hidrantes.length, 
        operativos: hidrantes.filter(h => h.estado === 'operativo').length 
      }
      return NextResponse.json({ hidrantes, stats })
    }

    // ===== CATEGORÍA =====
    if (tipo === 'categoria') {
      const slug = searchParams.get('slug')
      if (!slug) return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })
      const categoria = await prisma.categoriaInventario.findFirst({ 
        where: { slug, activa: true } 
      })
      return NextResponse.json({ categoria })
    }

    // ===== INVENTARIO GENERAL =====
    const inventarioSlug = searchParams.get('inventario') || 'all'
    const familiaId = searchParams.get('familia')
    const busqueda = searchParams.get('busqueda')
    const soloAlertas = searchParams.get('alertas') === 'true'

    // Obtener todas las categorías
    const todasCategorias = await prisma.categoriaInventario.findMany({
      where: { activa: true },
      include: {
        hijos: { where: { activa: true }, orderBy: { orden: 'asc' } },
        padre: true
      },
      orderBy: { orden: 'asc' }
    })

    const categoriaGeneral = todasCategorias.find(c => c.esGeneral)
    const areas = todasCategorias.filter(c => !c.esGeneral && !c.padreId)

    // Determinar categorías a incluir
    let categoriasIds: string[] = []
    
    if (inventarioSlug === 'all') {
      categoriasIds = todasCategorias.map(c => c.id)
    } else {
      const categoriaSeleccionada = todasCategorias.find(c => c.slug === inventarioSlug)
      if (categoriaSeleccionada) {
        categoriasIds = [categoriaSeleccionada.id]
        const hijos = todasCategorias.filter(c => c.padreId === categoriaSeleccionada.id)
        categoriasIds.push(...hijos.map(h => h.id))
      }
    }

    // Filtros para artículos
    const where: any = { 
      activo: true,
      familia: { categoriaId: { in: categoriasIds } }
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
        familia: { include: { categoria: true } },
        ubicacion: true,
        servicio: { select: { nombre: true } }
      },
      orderBy: [
        { familia: { categoria: { orden: 'asc' } } },
        { nombre: 'asc' }
      ]
    })

    // Filtrar alertas
    if (soloAlertas) {
      const hoy = new Date()
      const tresMeses = new Date()
      tresMeses.setMonth(tresMeses.getMonth() + 3)
      
      articulos = articulos.filter(a => 
        a.stockActual < a.stockMinimo || 
        (a.fechaCaducidad && new Date(a.fechaCaducidad) <= tresMeses)
      )
    }

    // Obtener familias
    const familias = await prisma.familiaArticulo.findMany({
      where: { categoriaId: { in: categoriasIds } },
      include: { categoria: true },
      orderBy: [
        { categoria: { orden: 'asc' } },
        { nombre: 'asc' }
      ]
    })

    // Estadísticas
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
      ).length
    }

    // Estadísticas por área
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
    const { tipo } = body

    // ===== ARTÍCULO =====
    if (tipo === 'articulo') {
      const { codigo, nombre, descripcion, stockActual, stockMinimo, unidad, tieneCaducidad, fechaCaducidad, ubicacionId, familiaId, metadatos } = body

      if (!nombre || !familiaId) {
        return NextResponse.json({ error: 'Nombre y familia son requeridos' }, { status: 400 })
      }

      let servicio = await prisma.servicio.findFirst()
      if (!servicio) {
        servicio = await prisma.servicio.create({
          data: { nombre: 'Protección Civil Bormujos', codigo: 'PCB' }
        })
      }

      const articulo = await prisma.articulo.create({
        data: {
          codigo, nombre, descripcion,
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
    }

    // ===== FAMILIA =====
    if (tipo === 'familia') {
      const { nombre, categoriaId } = body
      if (!nombre || !categoriaId) {
        return NextResponse.json({ error: 'Nombre y categoría son requeridos' }, { status: 400 })
      }

      const slug = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')

      const familia = await prisma.familiaArticulo.create({
        data: { nombre, slug, categoriaId },
        include: { categoria: true }
      })

      return NextResponse.json({ success: true, familia })
    }

    // ===== EDIFICIO =====
    if (tipo === 'edificio') {
      const { nombre, direccion, responsable, telefono } = body
      if (!nombre) {
        return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
      }

      const edificio = await prisma.edificio.create({
        data: { nombre, direccion, responsable, telefono }
      })

      return NextResponse.json({ success: true, edificio })
    }

    // ===== EQUIPO ECI =====
    if (tipo === 'equipo-eci') {
      const { edificioId, tipoEquipo, subtipo, ubicacion, numeroSerie, estado, observaciones } = body
      if (!edificioId || !tipoEquipo || !ubicacion) {
        return NextResponse.json({ error: 'Edificio, tipo y ubicación son requeridos' }, { status: 400 })
      }

      const equipo = await prisma.equipoECI.create({
        data: {
          edificioId,
          tipo: tipoEquipo,
          subtipo,
          ubicacion,
          numeroSerie,
          estado: estado || 'operativo',
          observaciones
        },
        include: { edificio: true }
      })

      return NextResponse.json({ success: true, equipo })
    }

    // ===== HIDRANTE =====
    if (tipo === 'hidrante') {
      const { codigo, tipo, ubicacion, latitud, longitud, presion, caudal, estado } = body
      if (!codigo || !tipo || !ubicacion) {
        return NextResponse.json({ error: 'Código, tipo y ubicación son requeridos' }, { status: 400 })
      }

      const hidrante = await prisma.hidrante.create({
        data: {
          codigo,
          tipo,
          ubicacion,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          presion: presion ? parseFloat(presion) : null,
          caudal: caudal ? parseInt(caudal) : null,
          estado: estado || 'operativo'
        }
      })

      return NextResponse.json({ success: true, hidrante })
    }

    // ===== PETICIÓN =====
    if (tipo === 'peticion') {
      const { articuloId, nombreArticulo, cantidad, prioridad, motivo, areaOrigen } = body
      
      const usuario = await prisma.usuario.findUnique({
        where: { email: session.user.email }
      })

      if (!usuario) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }

      // Generar número de petición
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
      
      const numero = `PET-${año}-${siguiente.toString().padStart(4, '0')}`

      // Obtener artículo
      const articulo = articuloId ? await prisma.articulo.findUnique({
        where: { id: articuloId }
      }) : null

      const peticion = await prisma.peticionMaterial.create({
        data: {
          numero,
          articuloId,
          nombreArticulo: articulo?.nombre || nombreArticulo,
          cantidad,
          unidad: articulo?.unidad || 'unidad',
          prioridad: prioridad || 'normal',
          descripcion: motivo,
          areaOrigen,
          estado: 'pendiente',
          motivo: 'REPOSICION',
          solicitanteId: usuario.id,
          fechaSolicitud: new Date()
        },
        include: {
          solicitante: {
            select: { nombre: true, apellidos: true }
          },
          articulo: true
        }
      })

      // Crear historial
      await prisma.historialPeticion.create({
        data: {
          peticionId: peticion.id,
          estadoAnterior: null,
          estadoNuevo: 'pendiente',
          usuarioId: usuario.id,
          comentario: 'Petición creada'
        }
      })

      return NextResponse.json({ success: true, peticion })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en POST /api/logistica:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    // ===== ARTÍCULO =====
    if (tipo === 'articulo') {
      const { codigo, nombre, descripcion, stockActual, stockMinimo, unidad, familiaId } = body

      const articulo = await prisma.articulo.update({
        where: { id },
        data: { codigo, nombre, descripcion, stockActual, stockMinimo, unidad, familiaId },
        include: {
          familia: { include: { categoria: true } },
          ubicacion: true
        }
      })

      return NextResponse.json({ success: true, articulo })
    }

    // ===== FAMILIA =====
    if (tipo === 'familia') {
      const { nombre } = body
      
      const familia = await prisma.familiaArticulo.update({
        where: { id },
        data: { nombre },
        include: { categoria: true }
      })

      return NextResponse.json({ success: true, familia })
    }

    // ===== EDIFICIO =====
    if (tipo === 'edificio') {
      const { nombre, direccion, responsable, telefono } = body

      const edificio = await prisma.edificio.update({
        where: { id },
        data: { nombre, direccion, responsable, telefono }
      })

      return NextResponse.json({ success: true, edificio })
    }

    // ===== EQUIPO ECI =====
    if (tipo === 'equipo-eci') {
      const { tipo: tipoEquipo, subtipo, ubicacion, numeroSerie, estado } = body

      const equipo = await prisma.equipoECI.update({
        where: { id },
        data: { tipo: tipoEquipo, subtipo, ubicacion, numeroSerie, estado },
        include: { edificio: true }
      })

      return NextResponse.json({ success: true, equipo })
    }

    // ===== HIDRANTE =====
    if (tipo === 'hidrante') {
      const { codigo, tipoHidrante, ubicacion, latitud, longitud, presion, caudal, estado } = body

      const hidrante = await prisma.hidrante.update({
        where: { id },
        data: {
          codigo,
          tipo: tipoHidrante,
          ubicacion,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          presion: presion ? parseFloat(presion) : null,
          caudal: caudal ? parseInt(caudal) : null,
          estado
        }
      })

      return NextResponse.json({ success: true, hidrante })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en PUT /api/logistica:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const id = searchParams.get('id')

    if (!id || !tipo) {
      return NextResponse.json({ error: 'ID y tipo son requeridos' }, { status: 400 })
    }

    // ===== ARTÍCULO =====
    if (tipo === 'articulo') {
      await prisma.articulo.update({
        where: { id },
        data: { activo: false }
      })
      return NextResponse.json({ success: true })
    }

    // ===== FAMILIA =====
    if (tipo === 'familia') {
      const articulosCount = await prisma.articulo.count({
        where: { familiaId: id, activo: true }
      })

      if (articulosCount > 0) {
        return NextResponse.json({ 
          error: `No se puede eliminar. Hay ${articulosCount} artículos en esta familia.` 
        }, { status: 400 })
      }

      await prisma.familiaArticulo.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ===== EDIFICIO =====
    if (tipo === 'edificio') {
      const equiposCount = await prisma.equipoECI.count({
        where: { edificioId: id }
      })

      if (equiposCount > 0) {
        return NextResponse.json({ 
          error: `No se puede eliminar. Hay ${equiposCount} equipos en este edificio.` 
        }, { status: 400 })
      }

      await prisma.edificio.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ===== EQUIPO ECI =====
    if (tipo === 'equipo-eci') {
      await prisma.equipoECI.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ===== HIDRANTE =====
    if (tipo === 'hidrante') {
      await prisma.hidrante.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en DELETE /api/logistica:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}