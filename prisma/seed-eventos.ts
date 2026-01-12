import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📅 Creando eventos de ejemplo...')
  
  const servicio = await prisma.servicio.findFirst()
  const admin = await prisma.usuario.findFirst({ where: { numeroVoluntario: 'J-44' } })
  
  if (!servicio || !admin) {
    console.error('❌ No se encontró el servicio o admin')
    return
  }

  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()

  const eventos = [
    { titulo: 'Feria de Bormujos', descripcion: 'Dispositivo preventivo durante las fiestas patronales', tipo: 'preventivo', fecha: new Date(año, mes, 30), horaInicio: '16:00', horaFin: '02:00', ubicacion: 'Recinto Ferial', color: '#3B82F6', voluntariosMin: 6, voluntariosMax: 10 },
    { titulo: 'Cabalgata de Reyes', descripcion: 'Cobertura del recorrido de la Cabalgata', tipo: 'preventivo', fecha: new Date(año + 1, 0, 5), horaInicio: '17:00', horaFin: '22:00', ubicacion: 'Centro urbano', color: '#8B5CF6', voluntariosMin: 8, voluntariosMax: 12 },
    { titulo: 'Formación Primeros Auxilios', descripcion: 'Curso de actualización en RCP', tipo: 'formacion', fecha: new Date(año, mes + 1, 15), horaInicio: '09:00', horaFin: '14:00', ubicacion: 'Base PC Bormujos', color: '#10B981', voluntariosMin: 10, voluntariosMax: 20 },
    { titulo: 'Reunión Mensual', descripcion: 'Reunión ordinaria mensual', tipo: 'reunion', fecha: new Date(año, mes + 1, 3), horaInicio: '19:00', horaFin: '21:00', ubicacion: 'Base PC Bormujos', color: '#F59E0B' },
    { titulo: 'Simulacro Evacuación', descripcion: 'Simulacro en CEIP San Sebastián', tipo: 'simulacro', fecha: new Date(año, mes + 1, 20), horaInicio: '10:00', horaFin: '12:00', ubicacion: 'CEIP San Sebastián', color: '#EF4444', voluntariosMin: 4, voluntariosMax: 6 },
    { titulo: 'Carrera San Silvestre', descripcion: 'Dispositivo preventivo carrera fin de año', tipo: 'preventivo', fecha: new Date(año, 11, 31), horaInicio: '10:00', horaFin: '14:00', ubicacion: 'Polideportivo', color: '#EC4899', voluntariosMin: 6, voluntariosMax: 8 }
  ]

  for (const evento of eventos) {
    try {
      await prisma.evento.create({
        data: { ...evento, estado: 'programado', visible: true, creadorId: admin.id, servicioId: servicio.id }
      })
      console.log(`✅ ${evento.titulo}`)
    } catch (e) {
      console.log(`⚠️ ${evento.titulo} ya existe`)
    }
  }

  const total = await prisma.evento.count()
  console.log(`\n🎉 Total eventos: ${total}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())