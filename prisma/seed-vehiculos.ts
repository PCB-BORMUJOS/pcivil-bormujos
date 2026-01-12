import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const vehiculos = [
  { matricula: '8263KVJ', indicativo: 'UMJ', tipo: 'turismo', marca: 'Peugeot', modelo: '3008', estado: 'disponible' },
  { matricula: '2875LMK', indicativo: 'VIR', tipo: 'pickup', marca: 'Nissan', modelo: 'Navara 4x4', estado: 'disponible' },
  { matricula: '8142LNH', indicativo: 'FSV', tipo: 'furgoneta', marca: 'Renault', modelo: 'Master', estado: 'disponible' },
  { matricula: 'PMA-001', indicativo: 'PMA', tipo: 'remolque', marca: 'Remolque', modelo: 'Ligero PMA', estado: 'disponible' },
]

async function main() {
  console.log('🚗 Creando vehículos...')
  
  const servicio = await prisma.servicio.findFirst()
  
  if (!servicio) {
    console.error('❌ No se encontró el Servicio')
    return
  }

  for (const veh of vehiculos) {
    await prisma.vehiculo.upsert({
      where: { matricula: veh.matricula },
      update: { indicativo: veh.indicativo, tipo: veh.tipo, marca: veh.marca, modelo: veh.modelo, estado: veh.estado },
      create: { matricula: veh.matricula, indicativo: veh.indicativo, tipo: veh.tipo, marca: veh.marca, modelo: veh.modelo, estado: veh.estado, servicioId: servicio.id }
    })
    console.log(`✅ ${veh.indicativo} - ${veh.marca} ${veh.modelo}`)
  }

  const total = await prisma.vehiculo.count()
  console.log(`\n🎉 Total vehículos: ${total}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
