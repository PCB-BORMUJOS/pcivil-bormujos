import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Sembrando datos para módulo de Formación...')

    // 1. Crear categoría Formación
    const categoriaFormacion = await prisma.categoriaInventario.upsert({
        where: { slug: 'formacion' },
        update: {},
        create: {
            nombre: 'Formación',
            slug: 'formacion',
            esGeneral: false,
            activa: true
        }
    })
    console.log('✅ Categoría Formación creada:', categoriaFormacion.id)

    // 2. Crear familias
    const familiaMaterialDidactico = await prisma.familiaArticulo.upsert({
        where: { categoriaId_slug: { categoriaId: categoriaFormacion.id, slug: 'material-didactico' } },
        update: {},
        create: {
            nombre: 'Material Didáctico',
            slug: 'material-didactico',
            categoriaId: categoriaFormacion.id
        }
    })
    console.log('✅ Familia Material Didáctico creada:', familiaMaterialDidactico.id)

    const familiaEquipamiento = await prisma.familiaArticulo.upsert({
        where: { categoriaId_slug: { categoriaId: categoriaFormacion.id, slug: 'equipamiento-formativo' } },
        update: {},
        create: {
            nombre: 'Equipamiento Formativo',
            slug: 'equipamiento-formativo',
            categoriaId: categoriaFormacion.id
        }
    })
    console.log('✅ Familia Equipamiento Formativo creada:', familiaEquipamiento.id)

    const familiaDocumentacion = await prisma.familiaArticulo.upsert({
        where: { categoriaId_slug: { categoriaId: categoriaFormacion.id, slug: 'documentacion-cursos' } },
        update: {},
        create: {
            nombre: 'Documentación de Cursos',
            slug: 'documentacion-cursos',
            categoriaId: categoriaFormacion.id
        }
    })
    console.log('✅ Familia Documentación creada:', familiaDocumentacion.id)

    console.log('✨ Seed completado con éxito')
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
