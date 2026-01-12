import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📅 Creando guardias de ejemplo...')
  
  const servicio = await prisma.servicio.findFirst()
  const voluntarios = await prisma.usuario.findMany({ 
    where: { rol: { nombre: 'voluntario' } },
    take: 10 
  })
  
  if (!servicio || voluntarios.length === 0) {
    console.error('❌ No se encontró el servicio o voluntarios')
    return
  }

  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()

  // Crear guardias para los próximos 7 días
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(año, mes, hoy.getDate() + i)
    
    // Turno mañana - 2 voluntarios
    for (let j = 0; j < 2; j++) {
      const voluntario = voluntarios[(i * 2 + j) % voluntarios.length]
      try {
        await prisma.guardia.create({
          data: {
            fecha,
            turno: 'mañana',
            tipo: 'ordinaria',
            usuarioId: voluntario.id,
            servicioId: servicio.id,
            estado: 'programada'
          }
        })
        console.log(`✅ Guardia mañana ${fecha.toLocaleDateString()} - ${voluntario.numeroVoluntario}`)
      } catch (e) {
        console.log(`⚠️ Guardia ya existe`)
      }
    }
    
    // Turno tarde - 2 voluntarios
    for (let j = 0; j < 2; j++) {
      const voluntario = voluntarios[(i * 2 + j + 1) % voluntarios.length]
      try {
        await prisma.guardia.create({
          data: {
            fecha,
            turno: 'tarde',
            tipo: 'ordinaria',
            usuarioId: voluntario.id,
            servicioId: servicio.id,
            estado: 'programada'
          }
        })
        console.log(`✅ Guardia tarde ${fecha.toLocaleDateString()} - ${voluntario.numeroVoluntario}`)
      } catch (e) {
        console.log(`⚠️ Guardia ya existe`)
      }
    }
  }

  const total = await prisma.guardia.count()
  console.log(`\n🎉 Total guardias: ${total}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())