import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const FAMILIAS = [
  { nombre: 'Socorrismo', slug: 'socorrismo', color: '#ec4899', icono: 'Heart', orden: 1 },
  { nombre: 'Incendios', slug: 'incendios', color: '#ef4444', icono: 'Flame', orden: 2 },
  { nombre: 'Rescate', slug: 'rescate', color: '#f97316', icono: 'Shield', orden: 3 },
  { nombre: 'Transmisiones', slug: 'transmisiones', color: '#3b82f6', icono: 'Radio', orden: 4 },
  { nombre: 'Drones/RPAS', slug: 'drones', color: '#0d9488', icono: 'Navigation', orden: 5 },
  { nombre: 'PMA', slug: 'pma', color: '#f59e0b', icono: 'AlertTriangle', orden: 6 },
  { nombre: 'Vehículos', slug: 'vehiculos', color: '#6366f1', icono: 'Truck', orden: 7 },
  { nombre: 'General', slug: 'general', color: '#64748b', icono: 'BookOpen', orden: 8 },
]

async function seed() {
  for (const f of FAMILIAS) {
    await prisma.familiaPractica.upsert({
      where: { slug: f.slug },
      update: {},
      create: f
    })
    console.log(`✅ ${f.nombre}`)
  }
  await prisma.$disconnect()
  console.log('Seed completado')
}

seed().catch(e => { console.error(e); process.exit(1) })
