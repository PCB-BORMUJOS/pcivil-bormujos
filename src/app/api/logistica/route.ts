import { put, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
// CORRECCIÓN 1: Usamos la ruta correcta de tu DB y quitamos authOptions para evitar errores
import { prisma } from '@/lib/db'

// Helper para validar campos (asegura que el 0 no se borre)
const isValid = (val: any) => val !== undefined && val !== null && val !== '';

export async function GET(request: NextRequest) {
  try {
    // CORRECCIÓN 2: getServerSession vacío para evitar error de importación
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

    if (tipo === 'equipos-radio') {
      const equipos = await prisma.equipoRadio.findMany({
        orderBy: { codigo: 'asc' }
      })
      return NextResponse.json({ equipos })
    }

    if (tipo === 'mantenimientos-equipo') {
      const equipoId = searchParams.get('equipoId')
      if (!equipoId) return NextResponse.json({ error: 'equipoId requerido' }, { status: 400 })
      const mantenimientos = await prisma.mantenimientoEquipo.findMany({
        where: { equipoId },
        orderBy: { fecha: 'desc' }
      })
      return NextResponse.json({ mantenimientos })
    }

    if (tipo === 'ciclos-carga') {
      const equipoId = searchParams.get('equipoId')
      if (!equipoId) return NextResponse.json({ error: 'equipoId requerido' }, { status: 400 })
      const ciclos = await prisma.cicloCarga.findMany({
        where: { equipoId },
        orderBy: { fechaInicio: 'desc' }
      })
      return NextResponse.json({ ciclos })
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

    // ===== DEAS =====
    if (tipo === 'deas') {
      const deas = await prisma.dEA.findMany({
        orderBy: { codigo: 'asc' }
      })
      const stats = {
        total: deas.length,
        operativos: deas.filter(d => d.estado === 'operativo').length,
        revisionPendiente: deas.filter(d => d.estado === 'revision_pendiente').length
      }
      return NextResponse.json({ deas, stats })
    }

    // ===== BOTIQUINES =====
    if (tipo === 'botiquines') {
      const id = searchParams.get('id')

      // Si hay ID, devolver botiquín individual
      if (id) {
        try {
          const botiquin = await prisma.botiquin.findUnique({
            where: { id },
            include: {
              vehiculo: {
                select: { id: true, indicativo: true, matricula: true, tipo: true }
              },
              items: { orderBy: { nombreItem: 'asc' } },
              revisiones: {
                orderBy: { fecha: 'desc' },
                take: 5,
                include: {
                  usuario: { select: { id: true, nombre: true, apellidos: true } }
                }
              },
              _count: { select: { items: true, revisiones: true } }
            }
          })
          if (!botiquin) {
            return NextResponse.json({ error: 'Botiquín no encontrado' }, { status: 404 })
          }
          return NextResponse.json({ botiquin })
        } catch (error) {
          console.error('Error al obtener botiquín:', error)
          return NextResponse.json({ error: 'Error al obtener el botiquín' }, { status: 500 })
        }
      }

      // Si no hay ID, devolver lista completa
      const botiquines = await prisma.botiquin.findMany({
        include: {
          vehiculo: { select: { id: true, matricula: true, indicativo: true } },
          items: { orderBy: { nombreItem: 'asc' } },
          _count: { select: { items: true, revisiones: true } }
        },
        orderBy: { codigo: 'asc' }
      })

      const stats = {
        total: botiquines.length,
        operativos: botiquines.filter(b => b.estado === 'operativo').length,
        revisionPendiente: botiquines.filter(b => b.estado === 'revision_pendiente').length,
        incompletos: botiquines.filter(b => b.estado === 'incompleto').length
      }
      return NextResponse.json({ botiquines, stats })
    }

    // ===== REVISIONES DE BOTIQUÍN =====
    if (tipo === 'revisiones-botiquin') {
      const botiquinId = searchParams.get('botiquinId')
      if (!botiquinId) {
        return NextResponse.json({ error: 'botiquinId requerido' }, { status: 400 })
      }

      const revisiones = await prisma.revisionBotiquin.findMany({
        where: { botiquinId },
        include: {
          usuario: { select: { id: true, nombre: true, apellidos: true } }
        },
        orderBy: { fecha: 'desc' }
      })

      return NextResponse.json({ revisiones })
    }

    if (tipo === 'asignaciones') {
      const inventarioSlug = searchParams.get('inventario') || 'vestuario'

      const asignaciones = await prisma.asignacionVestuario.findMany({
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              numeroVoluntario: true,
              email: true
            }
          }
        },
        orderBy: { fechaAsignacion: 'desc' }
      })

      return NextResponse.json({ asignaciones })
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

    // GET Manuales
    if (tipo === 'manuales') {
      const categoria = searchParams.get('categoria')
      const busqueda = searchParams.get('busqueda')

      const where: any = {}

      if (categoria && categoria !== 'all') {
        where.categoria = categoria
      }

      if (busqueda) {
        where.OR = [
          { titulo: { contains: busqueda, mode: 'insensitive' } },
          { descripcion: { contains: busqueda, mode: 'insensitive' } },
          { fabricante: { contains: busqueda, mode: 'insensitive' } },
          { modelo: { contains: busqueda, mode: 'insensitive' } },
        ]
      }

      const manuales = await prisma.manual.findMany({
        where,
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const stats = {
        total: await prisma.manual.count(),
        porCategoria: {
          incendios: await prisma.manual.count({ where: { categoria: 'incendios' } }),
          socorrismo: await prisma.manual.count({ where: { categoria: 'socorrismo' } }),
          vehiculos: await prisma.manual.count({ where: { categoria: 'vehiculos' } }),
          transmisiones: await prisma.manual.count({ where: { categoria: 'transmisiones' } }),
          pma: await prisma.manual.count({ where: { categoria: 'pma' } }),
          general: await prisma.manual.count({ where: { categoria: 'general' } }),
        }
      }

      return NextResponse.json({ manuales, stats })
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

      const _auditUser = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'CREATE',
        entidad: 'Inventario',
        entidadId: articulo.id,
        descripcion: 'Artículo creado: ' + articulo.nombre,
        usuarioId: _auditUser.usuarioId,
        usuarioNombre: _auditUser.usuarioNombre,
        modulo: 'Logística',
        datosNuevos: { nombre: articulo.nombre, stock: articulo.stockActual },
      })
      return NextResponse.json({ success: true, articulo })
    }

    // ===== ASIGNAR VESTUARIO =====
    if (tipo === 'asignar-vestuario') {
      const { usuarioId, articuloId, talla, cantidad, observaciones } = body

      if (!usuarioId || !articuloId || !talla) {
        return NextResponse.json({ error: 'Usuario, artículo y talla son requeridos' }, { status: 400 })
      }

      // Obtener el artículo
      const articulo = await prisma.articulo.findUnique({
        where: { id: articuloId },
        include: { familia: true }
      })

      if (!articulo) {
        return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
      }

      // Verificar stock disponible
      const stockDisponible = articulo.stockActual - articulo.stockAsignado
      if (stockDisponible < cantidad) {
        return NextResponse.json({
          error: `Stock insuficiente. Disponible: ${stockDisponible}`
        }, { status: 400 })
      }

      // Crear asignación
      const asignacion = await prisma.asignacionVestuario.create({
        data: {
          usuarioId,
          tipoPrenda: articulo.nombre,
          talla,
          cantidad: cantidad || 1,
          observaciones,
          estado: 'ASIGNADO'
        },
        include: {
          usuario: {
            select: {
              nombre: true,
              apellidos: true,
              numeroVoluntario: true
            }
          }
        }
      })

      // Actualizar stock asignado del artículo
      await prisma.articulo.update({
        where: { id: articuloId },
        data: {
          stockAsignado: {
            increment: cantidad || 1
          }
        }
      })

      return NextResponse.json({ success: true, asignacion })
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
      const { edificioId, tipo: tipoEquipo, subtipo, ubicacion, numeroSerie, estado, observaciones } = body

      if (!edificioId || !tipoEquipo || !ubicacion) {
        return NextResponse.json({ error: 'Edificio, tipo y ubicación son requeridos' }, { status: 400 })
      }

      const equipo = await prisma.equipoECI.create({
        data: {
          edificioId,
          tipo: tipoEquipo,
          subtipo: subtipo,
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
    console.log('[DEBUG] Verificando hidrante:', { tipo, bodyKeys: Object.keys(body) })
    const esHidrante = tipo === 'hidrante'
    console.log('[DEBUG] esHidrante:', esHidrante)

    if (esHidrante) {
      const { codigo, tipoHidrante, ubicacion, latitud, longitud, presion, caudal, estado } = body

      // tipoHidrante ya viene en minúsculas del frontend
      const tipoFinal = tipoHidrante || 'columna'
      const estadoFinal = estado || 'operativo'

      if (!codigo || !ubicacion) {
        return NextResponse.json({ error: 'Código y ubicación son requeridos' }, { status: 400 })
      }

      const hidrante = await prisma.hidrante.create({
        data: {
          codigo,
          tipo: tipoFinal,
          ubicacion,
          latitud: (latitud && latitud !== "") ? parseFloat(latitud) : null,
          longitud: (longitud && longitud !== "") ? parseFloat(longitud) : null,
          presion: (presion && presion !== "") ? parseFloat(presion) : null,
          caudal: (caudal && caudal !== "") ? parseInt(caudal) : null,
          estado: estadoFinal
        }
      })

      return NextResponse.json({ success: true, hidrante })
    }

    // ===== DEA =====
    if (tipo === 'dea') {
      const { codigo, tipoDea, marca, modelo, numeroSerie, ubicacion, latitud, longitud, estado, accesible24h, caducidadBateria, caducidadParches, caducidadPilas } = body

      if (!codigo || !tipoDea || !ubicacion) {
        return NextResponse.json({ error: 'Código, tipo y ubicación son requeridos' }, { status: 400 })
      }

      const dea = await prisma.dEA.create({
        data: {
          codigo,
          tipo: tipoDea,
          marca,
          modelo,
          numeroSerie,
          ubicacion,
          latitud: (latitud && latitud !== "") ? parseFloat(latitud) : null,
          longitud: (longitud && longitud !== "") ? parseFloat(longitud) : null,
          estado: estado || 'operativo',
          accesible24h: accesible24h === true,
          caducidadBateria: caducidadBateria ? new Date(caducidadBateria) : null,
          caducidadParches: caducidadParches ? new Date(caducidadParches) : null,
          caducidadPilas: caducidadPilas ? new Date(caducidadPilas) : null
        }
      })

      return NextResponse.json({ success: true, dea })
    }
    // ===== EQUIPO RADIO =====
    if (tipo === 'equipo-radio') {
      const { codigo, tipo: tipoEquipo, marca, modelo, numeroSerie, configuracion, estado, estadoBateria, fechaInstalacionBat, ubicacion, observaciones } = body

      if (!codigo || !tipoEquipo || !marca || !modelo || !configuracion) {
        return NextResponse.json({ error: 'Código, tipo, marca, modelo y configuración son requeridos' }, { status: 400 })
      }

      const equipo = await prisma.equipoRadio.create({
        data: {
          codigo,
          tipo: tipoEquipo,
          marca,
          modelo,
          numeroSerie,
          configuracion,
          estado: estado || 'disponible',
          estadoBateria: estadoBateria ? parseInt(estadoBateria) : null,
          fechaInstalacionBat: fechaInstalacionBat ? new Date(fechaInstalacionBat) : null,
          ubicacion,
          observaciones
        }
      })
      return NextResponse.json({ success: true, equipo })
    }

    // ===== BOTIQUIN =====
    if (tipo === 'botiquin') {
      const { codigo, nombre, tipo: tipoBotiquin, ubicacionActual, vehiculoId, estado, observaciones } = body

      if (!codigo || !nombre || !tipoBotiquin || !ubicacionActual) {
        return NextResponse.json({ error: 'Código, nombre, tipo y ubicación son requeridos' }, { status: 400 })
      }

      const botiquin = await prisma.botiquin.create({
        data: {
          codigo,
          nombre,
          tipo: tipoBotiquin,
          ubicacionActual,
          vehiculoId: vehiculoId && vehiculoId !== '' ? vehiculoId : null,
          estado: estado || 'operativo',
          observaciones
        }
      })

      return NextResponse.json({ success: true, botiquin })
    }

    // ===== BOTIQUIN ITEM =====
    if (tipo === 'botiquin-item') {
      const { botiquinId, articuloId, cantidadRequerida, cantidadActual, caducidad } = body

      if (!botiquinId || !articuloId || !cantidadRequerida) {
        return NextResponse.json({ error: 'Botiquín, artículo y cantidad requerida son obligatorios' }, { status: 400 })
      }

      // Verificar que el artículo existe y tiene stock disponible
      const articulo = await prisma.articulo.findUnique({ where: { id: articuloId } })
      if (!articulo) {
        return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
      }

      const stockDisponible = articulo.stockActual - articulo.stockAsignado
      const cantidadAsignar = parseInt(cantidadActual) || 0

      if (cantidadAsignar > stockDisponible) {
        return NextResponse.json({ error: `Stock insuficiente. Disponible: ${stockDisponible} ${articulo.unidad}` }, { status: 400 })
      }

      // Crear item y actualizar stockAsignado en transacción
      const [item] = await prisma.$transaction([
        prisma.botiquinItem.create({
          data: {
            botiquinId,
            articuloId,
            nombreItem: articulo.nombre,
            cantidadRequerida: parseInt(cantidadRequerida),
            cantidadActual: cantidadAsignar,
            caducidad: caducidad ? new Date(caducidad) : null,
            unidad: articulo.unidad
          }
        }),
        prisma.articulo.update({
          where: { id: articuloId },
          data: { stockAsignado: { increment: cantidadAsignar } }
        })
      ])

      return NextResponse.json({ success: true, item })
    }

    // ===== REVISION BOTIQUIN =====
    if (tipo === 'revision-botiquin') {
      const { botiquinId, itemsVerificados, itemsFaltantes, itemsCaducados, observaciones, items } = body

      const usuario = await prisma.usuario.findUnique({
        where: { email: session.user.email }
      })
      if (!usuario) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }

      // Crear revisión
      const revision = await prisma.revisionBotiquin.create({
        data: {
          botiquinId,
          usuarioId: usuario.id,
          itemsVerificados: parseInt(itemsVerificados),
          itemsFaltantes: parseInt(itemsFaltantes),
          itemsCaducados: parseInt(itemsCaducados),
          observaciones
        }
      })

      // Actualizar items si se proporcionan
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await prisma.botiquinItem.update({
            where: { id: item.id },
            data: {
              cantidadActual: item.cantidadActual,
              verificado: item.verificado
            }
          })
        }
      }

      // Actualizar fecha de última revisión del botiquín
      await prisma.botiquin.update({
        where: { id: botiquinId },
        data: {
          ultimaRevision: new Date(),
          proximaRevision: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 días
        }
      })

      return NextResponse.json({ success: true, revision })
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

    // POST Subir manual
    if (tipo === 'manual') {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const titulo = formData.get('titulo') as string
      const descripcion = formData.get('descripcion') as string
      const categoria = formData.get('categoria') as string
      const tipoManual = formData.get('tipoManual') as string
      const fabricante = formData.get('fabricante') as string
      const modelo = formData.get('modelo') as string

      if (!file || !titulo || !categoria) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }

      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
      }

      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'Archivo muy grande (máx 20MB)' }, { status: 400 })
      }

      const blob = await put(`manuales/${categoria}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: false
      })

      const manual = await prisma.manual.create({
        data: {
          titulo,
          descripcion: descripcion || null,
          categoria,
          tipo: tipoManual || null,
          fabricante: fabricante || null,
          modelo: modelo || null,
          url: blob.url,
          blobKey: blob.pathname,
          nombreArchivo: file.name,
          tamano: file.size,
          usuarioId: session.user.id
        },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        }
      })

      return NextResponse.json({ manual })
    }

    if (tipo === 'mantenimiento-equipo') {
      const { equipoId, tipoMantenimiento, descripcion, fecha, realizadoPor, coste, observaciones } = body
      if (!equipoId || !tipoMantenimiento || !descripcion) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }
      const mantenimiento = await prisma.mantenimientoEquipo.create({
        data: {
          equipoId,
          tipo: tipoMantenimiento,
          descripcion,
          fecha: fecha ? new Date(fecha) : new Date(),
          realizadoPor: realizadoPor || null,
          coste: coste ? parseFloat(coste) : null,
          observaciones: observaciones || null,
        }
      })
      return NextResponse.json({ mantenimiento })
    }

    if (tipo === 'ciclo-carga') {
      const { equipoId, fechaInicio, fechaFin, duracionHoras, nivelInicial, nivelFinal, observaciones } = body
      if (!equipoId || !fechaInicio) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }
      const ciclo = await prisma.cicloCarga.create({
        data: {
          equipoId,
          fechaInicio: new Date(fechaInicio),
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          duracionHoras: duracionHoras ? parseFloat(duracionHoras) : null,
          nivelInicial: nivelInicial ? parseInt(nivelInicial) : null,
          nivelFinal: nivelFinal ? parseInt(nivelFinal) : null,
          observaciones: observaciones || null,
        }
      })
      await prisma.equipoRadio.update({
        where: { id: equipoId },
        data: { ciclosCarga: { increment: 1 } }
      })
      return NextResponse.json({ ciclo })
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
          // CORRECCIÓN 4: Validación de tipos numéricos
          latitud: isValid(latitud) ? parseFloat(latitud) : null,
          longitud: isValid(longitud) ? parseFloat(longitud) : null,
          presion: isValid(presion) ? parseFloat(presion) : null,
          caudal: isValid(caudal) ? parseInt(caudal) : null,
          estado
        }
      })

      return NextResponse.json({ success: true, hidrante })
    }

    // ===== DEA =====
    if (tipo === 'dea') {
      const { codigo, tipoDea, marca, modelo, numeroSerie, ubicacion, latitud, longitud, estado, accesible24h, caducidadBateria, caducidadParches, caducidadPilas } = body

      if (!codigo || !tipoDea || !ubicacion) {
        return NextResponse.json({ error: 'Código, tipo y ubicación son requeridos' }, { status: 400 })
      }

      const dea = await prisma.dEA.update({
        where: { id },
        data: {
          codigo,
          tipo: tipoDea,
          marca,
          modelo,
          numeroSerie,
          ubicacion,
          latitud: (latitud && latitud !== "") ? parseFloat(latitud) : null,
          longitud: (longitud && longitud !== "") ? parseFloat(longitud) : null,
          estado: estado || 'operativo',
          accesible24h: accesible24h === true,
          caducidadBateria: caducidadBateria ? new Date(caducidadBateria) : null,
          caducidadParches: caducidadParches ? new Date(caducidadParches) : null,
          caducidadPilas: caducidadPilas ? new Date(caducidadPilas) : null
        }
      })

      return NextResponse.json({ success: true, dea })
    }

    // ===== EQUIPO RADIO =====
    if (tipo === 'equipo-radio') {
      const { codigo, tipo: tipoEquipo, marca, modelo, numeroSerie, configuracion, estado, estadoBateria, fechaInstalacionBat, ubicacion, observaciones } = body

      const equipo = await prisma.equipoRadio.update({
        where: { id },
        data: {
          codigo,
          tipo: tipoEquipo,
          marca,
          modelo,
          numeroSerie,
          configuracion,
          estado,
          estadoBateria: estadoBateria ? parseInt(estadoBateria) : null,
          fechaInstalacionBat: fechaInstalacionBat ? new Date(fechaInstalacionBat) : null,
          ubicacion,
          observaciones
        }
      })
      return NextResponse.json({ success: true, equipo })
    }

    // ===== BOTIQUIN =====
    if (tipo === 'botiquin') {
      const { codigo, nombre, tipo: tipoBotiquin, ubicacionActual, vehiculoId, estado, observaciones } = body

      const botiquin = await prisma.botiquin.update({
        where: { id },
        data: {
          codigo,
          nombre,
          tipo: tipoBotiquin,
          ubicacionActual,
          vehiculoId: vehiculoId || null,
          estado,
          observaciones
        }
      })

      return NextResponse.json({ success: true, botiquin })
    }

    // ===== BOTIQUIN ITEM =====
    if (tipo === 'botiquin-item') {
      const { nombreItem, cantidadRequerida, cantidadActual, caducidad, unidad, verificado } = body

      const item = await prisma.botiquinItem.update({
        where: { id },
        data: {
          nombreItem,
          cantidadRequerida: cantidadRequerida ? parseInt(cantidadRequerida) : undefined,
          cantidadActual: cantidadActual !== undefined ? parseInt(cantidadActual) : undefined,
          caducidad: caducidad ? new Date(caducidad) : null,
          unidad,
          verificado
        }
      })

      return NextResponse.json({ success: true, item })
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

    // ===== DEA =====
    if (tipo === 'dea') {
      await prisma.dEA.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ===== EQUIPO RADIO =====
    if (tipo === 'equipo-radio') {
      await prisma.equipoRadio.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ===== BOTIQUIN =====
    if (tipo === 'botiquin') {
      const revisionesCount = await prisma.revisionBotiquin.count({
        where: { botiquinId: id }
      })
      if (revisionesCount > 0) {
        return NextResponse.json({
          error: `No se puede eliminar. Este botiquín tiene ${revisionesCount} revisiones registradas.`
        }, { status: 400 })
      }
      await prisma.botiquinItem.deleteMany({ where: { botiquinId: id } })
      await prisma.botiquin.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ===== BOTIQUIN ITEM =====
    if (tipo === 'botiquin-item') {
      const item = await prisma.botiquinItem.findUnique({ where: { id } })
      if (!item) {
        return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
      }

      await prisma.$transaction([
        prisma.botiquinItem.delete({ where: { id } }),
        ...(item.articuloId ? [
          prisma.articulo.update({
            where: { id: item.articuloId },
            data: { stockAsignado: { decrement: item.cantidadActual } }
          })
        ] : [])
      ])
      return NextResponse.json({ success: true })
    }

    // DELETE Manual
    if (tipo === 'manual') {
      const manual = await prisma.manual.findUnique({
        where: { id }
      })

      if (!manual) {
        return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 })
      }

      try {
        await del(manual.blobKey)
      } catch (blobError) {
        console.error('Error eliminando de Blob:', blobError)
      }

      await prisma.manual.delete({
        where: { id }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en DELETE /api/logistica:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}