import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Seeding Transmisiones...')

  const categoriaTransmisiones = await prisma.categoriaInventario.findUnique({
    where: { slug: 'transmisiones' }
  })

  if (!categoriaTransmisiones) {
    console.error('❌ Categoría Transmisiones no encontrada')
    return
  }

  console.log('✅ Categoría Transmisiones encontrada:', categoriaTransmisiones.id)

  const familias = [
    {
      nombre: 'Walkies Portátiles',
      slug: 'walkies-portatiles',
      descripcion: 'Equipos de comunicación portátiles',
      categoriaId: categoriaTransmisiones.id
    },
    {
      nombre: 'Emisoras Móviles',
      slug: 'emisoras-moviles',
      descripcion: 'Equipos instalados en vehículos',
      categoriaId: categoriaTransmisiones.id
    },
    {
      nombre: 'Repetidores',
      slug: 'repetidores',
      descripcion: 'Equipos base y repetidores',
      categoriaId: categoriaTransmisiones.id
    },
    {
      nombre: 'Accesorios',
      slug: 'accesorios',
      descripcion: 'Baterías, cargadores, antenas',
      categoriaId: categoriaTransmisiones.id
    }
  ]

  for (const familia of familias) {
    const existing = await prisma.familiaArticulo.findFirst({
      where: { 
        slug: familia.slug,
        categoriaId: categoriaTransmisiones.id
      }
    })

    if (!existing) {
      await prisma.familiaArticulo.create({ data: familia })
      console.log(`✅ Familia creada: ${familia.nombre}`)
    } else {
      console.log(`ℹ️  Familia ya existe: ${familia.nombre}`)
    }
  }

  console.log('✅ Seed completado')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })