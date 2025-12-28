import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear roles
  console.log('📋 Creando roles...')
  const rolSuperAdmin = await prisma.rol.upsert({
    where: { nombre: 'superadmin' },
    update: {},
    create: {
      nombre: 'superadmin',
      descripcion: 'Administrador total del sistema',
      permisos: ['admin.total'],
    },
  })

  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: {
      nombre: 'admin',
      descripcion: 'Administrador de la agrupación',
      permisos: [
        'dashboard.ver',
        'inventario.ver', 'inventario.crear', 'inventario.editar', 'inventario.eliminar',
        'vehiculos.ver', 'vehiculos.crear', 'vehiculos.editar',
        'personal.ver', 'personal.crear', 'personal.editar',
        'cuadrantes.ver', 'cuadrantes.crear', 'cuadrantes.editar',
        'incidencias.ver', 'incidencias.crear', 'incidencias.editar',
        'configuracion.ver', 'configuracion.editar',
      ],
    },
  })

  const rolCoordinador = await prisma.rol.upsert({
    where: { nombre: 'coordinador' },
    update: {},
    create: {
      nombre: 'coordinador',
      descripcion: 'Coordinador de área',
      permisos: [
        'dashboard.ver',
        'inventario.ver', 'inventario.crear', 'inventario.editar',
        'vehiculos.ver',
        'personal.ver',
        'cuadrantes.ver', 'cuadrantes.crear', 'cuadrantes.editar',
        'incidencias.ver', 'incidencias.crear', 'incidencias.editar',
      ],
    },
  })

  const rolVoluntario = await prisma.rol.upsert({
    where: { nombre: 'voluntario' },
    update: {},
    create: {
      nombre: 'voluntario',
      descripcion: 'Voluntario de la agrupación',
      permisos: [
        'dashboard.ver',
        'inventario.ver',
        'vehiculos.ver',
        'cuadrantes.ver',
        'incidencias.ver',
      ],
    },
  })

  // Crear agrupación
  console.log('🏛️ Creando agrupación...')
  const agrupacion = await prisma.agrupacion.upsert({
    where: { codigo: 'BORMUJOS' },
    update: {},
    create: {
      nombre: 'Protección Civil Bormujos',
      codigo: 'BORMUJOS',
      direccion: 'C/ Ejemplo, 123, Bormujos, Sevilla',
      telefono: '955 123 456',
      email: 'proteccioncivil@bormujos.es',
    },
  })

  // Crear usuario superadmin
  console.log('👤 Creando usuario administrador...')
  const passwordHash = await hash('admin123', 12)
  
  await prisma.usuario.upsert({
    where: { email: 'admin@proteccioncivil-bormujos.es' },
    update: {},
    create: {
      email: 'admin@proteccioncivil-bormujos.es',
      password: passwordHash,
      nombre: 'Emilio',
      apellidos: 'García',
      telefono: '666 123 456',
      numeroVoluntario: 'PC-001',
      activo: true,
      rolId: rolSuperAdmin.id,
      agrupacionId: agrupacion.id,
    },
  })

  // Crear categorías de inventario
  console.log('📦 Creando categorías de inventario...')
  const categorias = [
    { nombre: 'Incendios', slug: 'incendios', icono: 'Flame', color: '#ef4444', orden: 1 },
    { nombre: 'Socorrismo', slug: 'socorrismo', icono: 'Heart', color: '#ec4899', orden: 2 },
    { nombre: 'Logística', slug: 'logistica', icono: 'Package', color: '#8b5cf6', orden: 3 },
    { nombre: 'Transmisiones', slug: 'transmisiones', icono: 'Radio', color: '#3b82f6', orden: 4 },
    { nombre: 'Vehículos', slug: 'vehiculos', icono: 'Truck', color: '#22c55e', orden: 5 },
    { nombre: 'PMA', slug: 'pma', icono: 'AlertTriangle', color: '#f97316', orden: 6 },
  ]

  for (const cat of categorias) {
    const categoria = await prisma.categoriaInventario.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })

    // Crear familias de ejemplo para cada categoría
    const familiasPorCategoria: Record<string, string[]> = {
      incendios: ['EPIs', 'Herramientas', 'Extintores', 'Mangueras', 'Equipos de Respiración'],
      socorrismo: ['Botiquines', 'Material de Curas', 'Inmovilización', 'Reanimación', 'Oxigenoterapia'],
      logistica: ['Iluminación', 'Generadores', 'Herramientas', 'Señalización', 'Carpas'],
      transmisiones: ['Emisoras', 'Walkies', 'Antenas', 'Baterías', 'Accesorios'],
      vehiculos: ['Repuestos', 'Accesorios', 'Herramientas'],
      pma: ['Mobiliario', 'Material Oficina', 'Señalización', 'Comunicaciones'],
    }

    const familiasCategoria = familiasPorCategoria[cat.slug] || []
    for (const familiaNombre of familiasCategoria) {
      const familiaSlug = familiaNombre.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      await prisma.familiaArticulo.upsert({
        where: { categoriaId_slug: { categoriaId: categoria.id, slug: familiaSlug } },
        update: {},
        create: {
          nombre: familiaNombre,
          slug: familiaSlug,
          categoriaId: categoria.id,
        },
      })
    }
  }

  // Crear ubicaciones
  console.log('📍 Creando ubicaciones...')
  const ubicaciones = [
    { nombre: 'Almacén Principal', tipo: 'almacen' },
    { nombre: 'Vehículo PC-01', tipo: 'vehiculo' },
    { nombre: 'Vehículo PC-02', tipo: 'vehiculo' },
    { nombre: 'Armario EPIs', tipo: 'armario' },
    { nombre: 'Estantería Material Sanitario', tipo: 'estanteria' },
  ]

  for (const ub of ubicaciones) {
    await prisma.ubicacion.upsert({
      where: { id: `${agrupacion.id}-${ub.nombre.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `${agrupacion.id}-${ub.nombre.toLowerCase().replace(/\s+/g, '-')}`,
        ...ub,
        agrupacionId: agrupacion.id,
      },
    })
  }

  console.log('✅ Seed completado exitosamente!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error durante el seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
