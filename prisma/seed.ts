import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear servicio
  console.log('🏢 Creando servicio...')
  const servicio = await prisma.servicio.upsert({
    where: { codigo: 'PCB' },
    update: {},
    create: {
      nombre: 'Protección Civil Bormujos',
      codigo: 'PCB'
    }
  })
  console.log('✅ Servicio creado:', servicio.nombre)

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

  console.log('✅ Roles creados')

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
      servicioId: servicio.id
    },
  })
  console.log('✅ Usuario administrador creado')

  // CREAR CATEGORÍAS DE INVENTARIO (ESTRUCTURA CORRECTA)
  console.log('\n📦 Creando categorías de inventario...')
  
  const categorias = [
    {
      nombre: 'Logística',
      slug: 'logistica',
      descripcion: 'Inventario general - Suma de todos los inventarios',
      icono: 'Package',
      color: '#3b82f6',
      orden: 0,
      esGeneral: true
    },
    {
      nombre: 'Incendios',
      slug: 'incendios',
      descripcion: 'Material de extinción y protección contra incendios',
      icono: 'Flame',
      color: '#ef4444',
      orden: 1,
      esGeneral: false
    },
    {
      nombre: 'Socorrismo',
      slug: 'socorrismo',
      descripcion: 'Material sanitario y de primeros auxilios',
      icono: 'Heart',
      color: '#ec4899',
      orden: 2,
      esGeneral: false
    },
    {
      nombre: 'PMA',
      slug: 'pma',
      descripcion: 'Puesto Médico Avanzado',
      icono: 'AlertTriangle',
      color: '#f97316',
      orden: 3,
      esGeneral: false
    },
    {
      nombre: 'Transmisiones',
      slug: 'transmisiones',
      descripcion: 'Equipos de comunicación y radiocomunicación',
      icono: 'Radio',
      color: '#8b5cf6',
      orden: 4,
      esGeneral: false
    },
    {
      nombre: 'Vehículos',
      slug: 'vehiculos',
      descripcion: 'Material y equipamiento de vehículos',
      icono: 'Truck',
      color: '#22c55e',
      orden: 5,
      esGeneral: false
    },
    {
      nombre: 'Formación',
      slug: 'formacion',
      descripcion: 'Material didáctico y de formación',
      icono: 'BookOpen',
      color: '#06b6d4',
      orden: 6,
      esGeneral: false
    },
    {
      nombre: 'Vestuario',
      slug: 'vestuario',
      descripcion: 'Uniformes y equipamiento personal',
      icono: 'Shirt',
      color: '#6366f1',
      orden: 7,
      esGeneral: false
    }
  ]

  const categoriasCreadas = []
  for (const cat of categorias) {
    const categoria = await prisma.categoriaInventario.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    })
    categoriasCreadas.push(categoria)
    console.log(`✅ ${cat.nombre} (${cat.slug})`)
  }

  // CREAR FAMILIAS POR CATEGORÍA
  console.log('\n📂 Creando familias de artículos...')

  const familiasPorCategoria: Record<string, string[]> = {
    incendios: ['Extintores', 'Mangueras', 'EPI Incendios', 'Material de extinción', 'Equipos de respiración'],
    socorrismo: ['Botiquines', 'Camillas', 'Material de inmovilización', 'Desfibriladores', 'Material de curas', 'Oxigenoterapia'],
    pma: ['Carpas y estructuras', 'Señalización PMA', 'Material sanitario avanzado', 'Mobiliario', 'Material de oficina'],
    transmisiones: ['Emisoras', 'Antenas', 'Accesorios comunicación', 'Walkies', 'Baterías'],
    vehiculos: ['Herramientas vehículo', 'Material de señalización', 'Recambios y consumibles', 'Accesorios'],
    formacion: ['Material didáctico', 'Equipos de prácticas'],
    vestuario: ['Uniformes', 'Calzado', 'EPIs', 'Accesorios']
  }

  for (const cat of categoriasCreadas) {
    if (cat.slug === 'logistica') continue // Logística no tiene familias propias
    
    const familias = familiasPorCategoria[cat.slug] || []
    for (const familiaNombre of familias) {
      const familiaSlug = familiaNombre
        .toLowerCase()
        .replace(/\s+/g, '-')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      
      await prisma.familiaArticulo.upsert({
        where: { 
          categoriaId_slug: { 
            categoriaId: cat.id, 
            slug: familiaSlug 
          } 
        },
        update: {},
        create: {
          nombre: familiaNombre,
          slug: familiaSlug,
          categoriaId: cat.id,
        }
      })
      console.log(`✅ ${familiaNombre} → ${cat.slug}`)
    }
  }

  // Crear ubicaciones
  console.log('\n📍 Creando ubicaciones...')
  const ubicaciones = [
    { nombre: 'Almacén Principal', tipo: 'almacen' },
    { nombre: 'Vehículo PC-01', tipo: 'vehiculo' },
    { nombre: 'Vehículo PC-02', tipo: 'vehiculo' },
    { nombre: 'Armario EPIs', tipo: 'armario' },
    { nombre: 'Estantería Material Sanitario', tipo: 'estanteria' },
  ]

  for (const ub of ubicaciones) {
    await prisma.ubicacion.upsert({
      where: { id: `ubicacion-${ub.nombre.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `ubicacion-${ub.nombre.toLowerCase().replace(/\s+/g, '-')}`,
        nombre: ub.nombre,
        tipo: ub.tipo,
        servicioId: servicio.id
      }
    })
  }
  console.log('✅ Ubicaciones creadas')

  console.log('\n✨ Seed completado exitosamente!')
  console.log(`📊 Resumen:`)
  console.log(`   - 1 Servicio`)
  console.log(`   - 4 Roles`)
  console.log(`   - 1 Usuario administrador`)
  console.log(`   - ${categorias.length} Categorías`)
  console.log(`   - ${Object.values(familiasPorCategoria).flat().length} Familias`)
  console.log(`   - ${ubicaciones.length} Ubicaciones`)
  console.log(`\n🔑 Credenciales de acceso:`)
  console.log(`   Email: admin@proteccioncivil-bormujos.es`)
  console.log(`   Password: admin123`)
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