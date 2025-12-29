import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const voluntarios = [
  { indicativo: "J-44", nombre: "EMILIO", apellidos: "SIMÓN GÓMEZ", responsableTurno: true, carnetConducir: true, experiencia: "SI" },
  { indicativo: "S-01", nombre: "TANYA", apellidos: "GONZÁLEZ MEDINA", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "S-02", nombre: "ANA MARÍA", apellidos: "FERNÁNDEZ PÉREZ", responsableTurno: true, carnetConducir: false, experiencia: "ALTA" },
  { indicativo: "S-03", nombre: "JUAN", apellidos: "PALAZUELOS TRUEBA", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "S-04", nombre: "JUAN", apellidos: "SANTÍN MARTINEZ", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "S-05", nombre: "CANDELA", apellidos: "SÁNCHEZ-COBOS LARA", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "S-06", nombre: "PAOLA", apellidos: "SÁNCHEZ PEINADO", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "B-10", nombre: "JUAN MANUEL", apellidos: "DURÁN GONZÁLEZ", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "B-12", nombre: "LYDIA", apellidos: "GARCÍA LÁZARO", responsableTurno: false, carnetConducir: false, experiencia: "ALTA" },
  { indicativo: "B-13", nombre: "MARÍA CARMEN", apellidos: "GARRIDO VILLAR", responsableTurno: true, carnetConducir: false, experiencia: "MEDIA" },
  { indicativo: "B-16", nombre: "FABIO", apellidos: "RODRÍGUEZ YESARES", responsableTurno: true, carnetConducir: false, experiencia: "MEDIA" },
  { indicativo: "B-19", nombre: "NATALIA", apellidos: "CUEVAS BENÍTEZ", responsableTurno: true, carnetConducir: false, experiencia: "MEDIA" },
  { indicativo: "B-20", nombre: "MIGUEL", apellidos: "JURADO FERNÁNDEZ", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-21", nombre: "NATALIA", apellidos: "TORRES CORDERO", responsableTurno: true, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-22", nombre: "ANA MARÍA", apellidos: "CEREZO AGUILAR", responsableTurno: true, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-23", nombre: "VÍCTOR", apellidos: "DE VEGA ÁLVAREZ", responsableTurno: false, carnetConducir: true, experiencia: "BAJA" },
  { indicativo: "B-24", nombre: "ROCÍO", apellidos: "SALAS BAUTISTA", responsableTurno: false, carnetConducir: false, experiencia: "BAJA" },
  { indicativo: "B-25", nombre: "FRANCISCO JAVIER", apellidos: "CUEVAS RODRÍGUEZ", responsableTurno: false, carnetConducir: false, experiencia: "MEDIA" },
  { indicativo: "B-26", nombre: "RUTH", apellidos: "PÉREZ GARCÍA", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-27", nombre: "INÉS", apellidos: "DE MARCO REAL", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-28", nombre: "MANUEL ÁNGEL", apellidos: "GONZÁLEZ CABAÑAS GÓMEZ", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-29", nombre: "JOSE CARLOS", apellidos: "BAILÓN LÓPEZ", responsableTurno: true, carnetConducir: true, experiencia: "ALTA" },
  { indicativo: "B-30", nombre: "ALBERTO", apellidos: "LIBRERO ACEVEDO", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-31", nombre: "TEODORO", apellidos: "PÉREZ ANTÓN", responsableTurno: false, carnetConducir: false, experiencia: "MEDIA" },
  { indicativo: "B-32", nombre: "PAULA", apellidos: "GONZALEZ ESPINOSA", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-33", nombre: "TRINIDAD", apellidos: "ESPINOSA ROSALES", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-34", nombre: "DANIEL", apellidos: "GARCÍA MÍGUEZ", responsableTurno: false, carnetConducir: false, experiencia: "MEDIA" },
  { indicativo: "B-35", nombre: "JUAN", apellidos: "LÓPEZ BRAVO", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-36", nombre: "PABLO", apellidos: "RODRIGUEZ ISIDRO", responsableTurno: true, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-38", nombre: "GUILLERMO", apellidos: "IBAÑEZ ROMERA", responsableTurno: false, carnetConducir: false, experiencia: "BAJA" },
  { indicativo: "B-39", nombre: "LAURA", apellidos: "MESA GARCÍA", responsableTurno: false, carnetConducir: false, experiencia: "BAJA" },
  { indicativo: "B-40", nombre: "JORGE", apellidos: "CORDERO LÓPEZ", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-43", nombre: "CARMEN", apellidos: "GUTIÉRREZ RODRÍGUEZ", responsableTurno: false, carnetConducir: false, experiencia: "BAJA" },
  { indicativo: "B-45", nombre: "MARTA", apellidos: "SALAS LÓPEZ", responsableTurno: false, carnetConducir: false, experiencia: "BAJA" },
  { indicativo: "B-46", nombre: "FERNANDO", apellidos: "GALINDO GONZÁLEZ-SERNA", responsableTurno: true, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-47", nombre: "MARÍA ÁNGELES", apellidos: "ORTEGA GAVIÑO", responsableTurno: false, carnetConducir: true, experiencia: "MEDIA" },
  { indicativo: "B-48", nombre: "PAULA", apellidos: "RODRIGUEZ GARCÍA", responsableTurno: false, carnetConducir: true, experiencia: "BAJA" },
]

async function main() {
  console.log('🌱 Creando voluntarios...')
  
  // Obtener rol voluntario y agrupación
  const rolVoluntario = await prisma.rol.findUnique({ where: { nombre: 'voluntario' } })
  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'superadmin' } })
  const agrupacion = await prisma.agrupacion.findFirst()
  
  if (!rolVoluntario || !agrupacion || !rolAdmin) {
    console.error('❌ Faltan datos base (rol o agrupación)')
    return
  }
  
  const passwordHash = await hash('voluntario123', 12)
  
  for (const vol of voluntarios) {
    const email = `${vol.nombre.toLowerCase().replace(/ /g, '')}.${vol.apellidos.split(' ')[0].toLowerCase()}@pcbormujos.es`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    
    // Determinar si es el admin (J-44 es Emilio)
    const esAdmin = vol.indicativo === 'J-44'
    
    try {
      await prisma.usuario.upsert({
        where: { numeroVoluntario: vol.indicativo },
        update: {
          nombre: vol.nombre,
          apellidos: vol.apellidos,
          responsableTurno: vol.responsableTurno,
          carnetConducir: vol.carnetConducir,
          experiencia: vol.experiencia === 'SI' ? 'ALTA' : vol.experiencia,
        },
        create: {
          email: esAdmin ? 'admin@proteccioncivil-bormujos.es' : email,
          password: passwordHash,
          nombre: vol.nombre,
          apellidos: vol.apellidos,
          numeroVoluntario: vol.indicativo,
          responsableTurno: vol.responsableTurno,
          carnetConducir: vol.carnetConducir,
          experiencia: vol.experiencia === 'SI' ? 'ALTA' : vol.experiencia,
          rolId: esAdmin ? rolAdmin.id : rolVoluntario.id,
          agrupacionId: agrupacion.id,
        }
      })
      console.log(`✅ ${vol.indicativo} - ${vol.nombre} ${vol.apellidos}`)
    } catch (error) {
      console.log(`⚠️ ${vol.indicativo} ya existe o error`)
    }
  }
  
  const total = await prisma.usuario.count()
  console.log(`\n🎉 Total voluntarios en BD: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
