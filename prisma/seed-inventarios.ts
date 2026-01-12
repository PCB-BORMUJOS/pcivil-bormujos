import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🏗️ Actualizando estructura de inventarios...')

  // 1. Primero, crear/actualizar Logística como inventario GENERAL
  const logistica = await prisma.categoriaInventario.upsert({
    where: { slug: 'logistica' },
    update: { 
      esGeneral: true,
      nombre: 'Logística (General)',
      descripcion: 'Inventario general - suma de todos los inventarios'
    },
    create: {
      nombre: 'Logística (General)',
      slug: 'logistica',
      icono: 'Package',
      color: '#8b5cf6',
      orden: 0,
      esGeneral: true,
      descripcion: 'Inventario general - suma de todos los inventarios'
    }
  })
  console.log('✅ Logística (General) configurado')

  // 2. Crear las categorías principales (áreas)
  const areasConfig = [
    { 
      nombre: 'Socorrismo', 
      slug: 'socorrismo', 
      icono: 'Heart', 
      color: '#ec4899', 
      orden: 1,
      descripcion: 'Material sanitario y de primeros auxilios',
      familias: ['Botiquines', 'Material de Curas', 'Inmovilización', 'Reanimación', 'Oxigenoterapia', 'DEA', 'Camillas']
    },
    { 
      nombre: 'Incendios', 
      slug: 'incendios', 
      icono: 'Flame', 
      color: '#ef4444', 
      orden: 2,
      descripcion: 'Material de extinción y rescate',
      familias: ['EPIs Incendios', 'Herramientas', 'Mangueras', 'Lanzas', 'Racores'],
      // Incendios tiene un sub-inventario: ECI
      subInventarios: [
        {
          nombre: 'ECI - Equipo Contra Incendios',
          slug: 'eci',
          icono: 'ShieldAlert',
          color: '#dc2626',
          descripcion: 'Equipos específicos contra incendios',
          familias: ['Extintores', 'BIEs', 'Equipos de Respiración', 'Trajes Ignífugos', 'Detectores']
        }
      ]
    },
    { 
      nombre: 'Parque Móvil', 
      slug: 'parque-movil', 
      icono: 'Truck', 
      color: '#22c55e', 
      orden: 3,
      descripcion: 'Vehículos y material asociado',
      familias: ['Repuestos', 'Accesorios Vehículos', 'Herramientas Taller', 'Lubricantes', 'Neumáticos']
    },
    { 
      nombre: 'Transmisiones', 
      slug: 'transmisiones', 
      icono: 'Radio', 
      color: '#3b82f6', 
      orden: 4,
      descripcion: 'Equipos de comunicación',
      familias: ['Emisoras Base', 'Emisoras Portátiles', 'Walkies', 'Antenas', 'Baterías', 'Cargadores', 'Accesorios Radio']
    },
    { 
      nombre: 'Formación', 
      slug: 'formacion', 
      icono: 'GraduationCap', 
      color: '#f59e0b', 
      orden: 5,
      descripcion: 'Material didáctico y de formación',
      familias: ['Maniquíes', 'Material Didáctico', 'Proyectores', 'Pizarras', 'Simuladores']
    },
    { 
      nombre: 'PMA', 
      slug: 'pma', 
      icono: 'AlertTriangle', 
      color: '#f97316', 
      orden: 6,
      descripcion: 'Puesto de Mando Avanzado',
      familias: ['Mobiliario PMA', 'Material Oficina', 'Señalización', 'Carpas', 'Generadores', 'Iluminación']
    },
    { 
      nombre: 'Vestuario', 
      slug: 'vestuario', 
      icono: 'Shirt', 
      color: '#6366f1', 
      orden: 7,
      descripcion: 'Uniformidad y vestuario de voluntarios',
      familias: ['Uniformes', 'Calzado', 'Gorras', 'Chalecos', 'Impermeables', 'Ropa Interior Térmica']
    },
  ]

  for (const areaConfig of areasConfig) {
    // Crear categoría principal del área
    const area = await prisma.categoriaInventario.upsert({
      where: { slug: areaConfig.slug },
      update: { 
        nombre: areaConfig.nombre,
        descripcion: areaConfig.descripcion,
        icono: areaConfig.icono,
        color: areaConfig.color,
        orden: areaConfig.orden,
        esGeneral: false
      },
      create: {
        nombre: areaConfig.nombre,
        slug: areaConfig.slug,
        icono: areaConfig.icono,
        color: areaConfig.color,
        orden: areaConfig.orden,
        descripcion: areaConfig.descripcion,
        esGeneral: false
      }
    })
    console.log(`✅ Área: ${areaConfig.nombre}`)

    // Crear familias del área
    for (const familiaNombre of areaConfig.familias) {
      const familiaSlug = familiaNombre.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      await prisma.familiaArticulo.upsert({
        where: { categoriaId_slug: { categoriaId: area.id, slug: familiaSlug } },
        update: { nombre: familiaNombre },
        create: {
          nombre: familiaNombre,
          slug: familiaSlug,
          categoriaId: area.id,
        }
      })
    }

    // Crear sub-inventarios si existen (ej: ECI dentro de Incendios)
    if (areaConfig.subInventarios) {
      for (const subConfig of areaConfig.subInventarios) {
        const subInventario = await prisma.categoriaInventario.upsert({
          where: { slug: subConfig.slug },
          update: {
            nombre: subConfig.nombre,
            descripcion: subConfig.descripcion,
            padreId: area.id,
            esGeneral: false
          },
          create: {
            nombre: subConfig.nombre,
            slug: subConfig.slug,
            icono: subConfig.icono,
            color: subConfig.color,
            orden: 0,
            descripcion: subConfig.descripcion,
            padreId: area.id,
            esGeneral: false
          }
        })
        console.log(`  └─ Sub-inventario: ${subConfig.nombre}`)

        // Crear familias del sub-inventario
        for (const familiaNombre of subConfig.familias) {
          const familiaSlug = familiaNombre.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          await prisma.familiaArticulo.upsert({
            where: { categoriaId_slug: { categoriaId: subInventario.id, slug: familiaSlug } },
            update: { nombre: familiaNombre },
            create: {
              nombre: familiaNombre,
              slug: familiaSlug,
              categoriaId: subInventario.id,
            }
          })
        }
      }
    }
  }

  // 3. Eliminar categoría 'vehiculos' antigua si existe (ahora es 'parque-movil')
  try {
    const vehiculosAntiguo = await prisma.categoriaInventario.findUnique({ where: { slug: 'vehiculos' } })
    if (vehiculosAntiguo) {
      // Verificar si tiene artículos asociados
      const articulosVehiculos = await prisma.articulo.count({
        where: { familia: { categoriaId: vehiculosAntiguo.id } }
      })
      if (articulosVehiculos === 0) {
        // Eliminar familias asociadas
        await prisma.familiaArticulo.deleteMany({ where: { categoriaId: vehiculosAntiguo.id } })
        await prisma.categoriaInventario.delete({ where: { slug: 'vehiculos' } })
        console.log('🗑️ Categoría "vehiculos" antigua eliminada')
      }
    }
  } catch (e) {
    // Ignorar si no existe
  }

  console.log('\n✅ Estructura de inventarios actualizada correctamente')
  console.log('\n📊 Resumen de estructura:')
  console.log('─────────────────────────────────────────')
  
  const todasCategorias = await prisma.categoriaInventario.findMany({
    include: { 
      hijos: true,
      _count: { select: { familias: true } }
    },
    orderBy: { orden: 'asc' }
  })

  for (const cat of todasCategorias.filter(c => !c.padreId)) {
    const tipoLabel = cat.esGeneral ? '🌐 GENERAL' : '📦 ÁREA'
    console.log(`${tipoLabel} ${cat.nombre} (${cat._count.familias} familias)`)
    
    for (const hijo of cat.hijos) {
      const hijoData = todasCategorias.find(c => c.id === hijo.id)
      console.log(`  └─ 📁 ${hijo.nombre} (${hijoData?._count.familias || 0} familias)`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())