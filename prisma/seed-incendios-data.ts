import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const edificios = [
  { nombre: '01. Ayuntamiento', direccion: 'Plaza de Andalucía, 1' },
  { nombre: '02. C.C. La Atarazana', direccion: null },
  { nombre: '03. Hacienda Belen', direccion: null },
  { nombre: '04. Centro Cultural Almazara', direccion: null },
  { nombre: '05. Centro Sociocultural A. Barragan', direccion: null },
  { nombre: '06. Centro Servicio Comunitarios', direccion: null },
  { nombre: '07. Nave Juventud', direccion: null },
  { nombre: '08. Museo Historico', direccion: null },
  { nombre: '09. Biblioteca', direccion: null },
  { nombre: '10. Polideportivo municipal', direccion: null },
  { nombre: '11. Edificios multiusos polideportivo', direccion: null },
  { nombre: '12. Piscina Cubierta', direccion: null },
  { nombre: '13. Pabellan Cubierto', direccion: null },
  { nombre: '14. Centro de SEPER', direccion: null },
  { nombre: '15. CEIP Padre Manjon', direccion: null },
  { nombre: '16. CEIP Clara Campoamor', direccion: null },
  { nombre: '17. CEIP Santo Domingo de Silos', direccion: null },
  { nombre: '18. CEIP Manantial', direccion: null },
  { nombre: '19. Nave Ribete', direccion: null },
  { nombre: '20. Caseta de feria', direccion: null },
  { nombre: '21. Nave de obras', direccion: null },
  { nombre: '22. Nave Medioambiente', direccion: null },
  { nombre: '23. Nave Cruzcampo', direccion: null },
  { nombre: '24. Nave Policia Local', direccion: null },
]

const hidrantes = [
  {
    codigo: 'H-001',
    tipo: 'columna',
    ubicacion: 'Plaza de Andalucía',
    latitud: 37.37105,
    longitud: -6.07103,
    presion: 4.2,
    caudal: 1200,
    estado: 'operativo',
  },
  {
    codigo: 'H-002',
    tipo: 'arqueta',
    ubicacion: 'C/ Real con C/ Ntra. Sra. de los Reyes',
    latitud: 37.37025,
    longitud: -6.07205,
    presion: 3.5,
    caudal: 900,
    estado: 'operativo',
  },
  {
    codigo: 'H-003',
    tipo: 'columna',
    ubicacion: 'Avda. del Parque',
    latitud: 37.36825,
    longitud: -6.07015,
    presion: 4.0,
    caudal: 1100,
    estado: 'operativo',
  },
  {
    codigo: 'H-004',
    tipo: 'columna',
    ubicacion: 'Calle Sevilla, 45',
    latitud: 37.37000,
    longitud: -6.07350,
    presion: 3.8,
    caudal: 950,
    estado: 'operativo',
  },
  {
    codigo: 'H-005',
    tipo: 'columna',
    ubicacion: 'Avenida de la Libertad con Calle Sevilla',
    latitud: 37.37200,
    longitud: -6.06950,
    presion: 3.8,
    caudal: 950,
    estado: 'operativo',
  },
  {
    codigo: 'H-006',
    tipo: 'arqueta',
    ubicacion: 'C/ Francisco Guerrero con C/ José María Pemán',
    latitud: 37.36850,
    longitud: -6.07350,
    presion: 3.8,
    caudal: 850,
    estado: 'operativo',
  },
  {
    codigo: 'H-007',
    tipo: 'columna',
    ubicacion: 'C/ Manuel de Falla con C/ Isaac Albéniz',
    latitud: 37.37180,
    longitud: -6.06950,
    presion: 4.8,
    caudal: 1400,
    estado: 'operativo',
  },
  {
    codigo: 'H-008',
    tipo: 'arqueta',
    ubicacion: 'C/ Virgen de la Estrella',
    latitud: 37.36950,
    longitud: -6.07350,
    presion: 3.8,
    caudal: 1400,
    estado: 'operativo',
  },
]

async function main() {
  console.log('🔥 Insertando datos de Incendios - Bormujos...\n')

  // Insertar edificios
  console.log('🏢 Insertando edificios municipales...')
  for (const edificio of edificios) {
    const result = await prisma.edificio.upsert({
      where: { nombre: edificio.nombre },
      update: {},
      create: edificio,
    })
    console.log(`✅ ${result.nombre}`)
  }

  console.log('\n💧 Insertando hidrantes...')
  for (const hidrante of hidrantes) {
    const result = await prisma.hidrante.upsert({
      where: { codigo: hidrante.codigo },
      update: {},
      create: hidrante,
    })
    console.log(`✅ ${result.codigo} - ${result.ubicacion}`)
  }

  console.log('\n✅ ¡Datos insertados correctamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
