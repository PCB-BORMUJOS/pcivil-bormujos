import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding usuarios...')

  // Obtener o crear servicio
  let servicio = await prisma.servicio.findFirst()
  if (!servicio) {
    servicio = await prisma.servicio.create({
      data: { nombre: 'Protección Civil Bormujos', codigo: 'PCB' }
    })
  }

  // Obtener o crear roles
  let rolSuperadmin = await prisma.rol.findFirst({ where: { nombre: 'superadmin' } })
  if (!rolSuperadmin) {
    rolSuperadmin = await prisma.rol.create({ data: { nombre: 'superadmin', descripcion: 'Superadministrador' } })
  }

  let rolVoluntario = await prisma.rol.findFirst({ where: { nombre: 'voluntario' } })
  if (!rolVoluntario) {
    rolVoluntario = await prisma.rol.create({ data: { nombre: 'voluntario', descripcion: 'Voluntario' } })
  }

  const usuarios = [
    { indicativo: 'J-44', nombre: 'EMILIO', apellidos: 'SIMÓN GÓMEZ', dni: '52695439R', sexo: 'H', fechaNacimiento: '1977-01-28', email: 'emsigo77@gmail.com', telefono: '654544502', fechaAlta: '2021-01-01', rolId: rolSuperadmin.id },
    { indicativo: 'S-01', nombre: 'TANYA', apellidos: 'GONZÁLEZ MEDINA', dni: '28829776N', sexo: 'M', fechaNacimiento: '1983-05-24', email: 'tanyagonzalezmedina@gmail.com', telefono: '675354216', fechaAlta: '2021-12-23', rolId: rolVoluntario.id },
    { indicativo: 'S-03', nombre: 'JUAN', apellidos: 'PALAZUELOS TRUEBA', dni: '77166927H', sexo: 'H', fechaNacimiento: '1999-11-05', email: 'palazuelos.trueba.juan99@gmail.com', telefono: '651943874', fechaAlta: '2022-01-03', rolId: rolVoluntario.id },
    { indicativo: 'S-04', nombre: 'JUAN', apellidos: 'SANTÍN MARTÍNEZ', dni: '28748064L', sexo: 'H', fechaNacimiento: '1972-03-04', email: 'juansantin@gmail.com', telefono: '665518074', fechaAlta: '2022-01-03', rolId: rolVoluntario.id },
    { indicativo: 'S-05', nombre: 'CANDELA', apellidos: 'SANCHEZ-COBOS LARA', dni: '28830799T', sexo: 'M', fechaNacimiento: '1989-01-14', email: 'candelasanchezcobos@gmail.com', telefono: '608540038', fechaAlta: '2021-12-23', rolId: rolVoluntario.id },
    { indicativo: 'S-06', nombre: 'PAOLA', apellidos: 'SÁNCHEZ PEINADO', dni: '48810426X', sexo: 'M', fechaNacimiento: '1981-12-07', email: 'sanchezpeinado@hotmail.com', telefono: '661282810', fechaAlta: '2021-12-27', rolId: rolVoluntario.id },
    { indicativo: 'S-07', nombre: 'JUAN MANUEL', apellidos: 'DURÁN GONZÁLEZ', dni: '77805930N', sexo: 'H', fechaNacimiento: '1982-09-10', email: 'jmdurango@gmail.com', telefono: '600000000', fechaAlta: '2021-12-23', rolId: rolVoluntario.id },
    { indicativo: 'B-12', nombre: 'LYDIA', apellidos: 'GARCÍA LÁZARO', dni: '25755211J', sexo: 'M', fechaNacimiento: '1975-03-21', email: 'lydia.garcia.lazaro@gmail.com', telefono: '600317900', fechaAlta: '2021-09-08', rolId: rolVoluntario.id },
    { indicativo: 'B-13', nombre: 'MARIA CARMEN', apellidos: 'GARRIDO VILLAR', dni: '77873144C', sexo: 'M', fechaNacimiento: '2001-09-30', email: 'mdcgarridovillar6@gmail.com', telefono: '635343014', fechaAlta: '2021-12-09', rolId: rolVoluntario.id },
    { indicativo: 'B-16', nombre: 'FABIO', apellidos: 'RODRIGUEZ YESARES', dni: '54437238X', sexo: 'H', fechaNacimiento: '2003-06-10', email: 'yesares2003@gmail.com', telefono: '672226726', fechaAlta: '2022-06-24', rolId: rolVoluntario.id },
    { indicativo: 'B-19', nombre: 'NATALIA', apellidos: 'CUEVAS BENÍTEZ', dni: '53964889N', sexo: 'M', fechaNacimiento: '2003-02-16', email: 'natalia.cuevas.benitez@gmail.com', telefono: '634281940', fechaAlta: '2021-12-27', rolId: rolVoluntario.id },
    { indicativo: 'B-20', nombre: 'MIGUEL', apellidos: 'JURADO FERNANDEZ', dni: '77934161H', sexo: 'H', fechaNacimiento: '2005-08-23', email: 'majuradofer@gmail.com', telefono: '675256180', fechaAlta: '2024-10-01', rolId: rolVoluntario.id },
    { indicativo: 'B-21', nombre: 'NATALIA', apellidos: 'TORRES CORDERO', dni: '54183877V', sexo: 'M', fechaNacimiento: '2003-07-10', email: 'ntcordero2003@gmail.com', telefono: '665927664', fechaAlta: '2024-12-02', rolId: rolVoluntario.id },
    { indicativo: 'B-22', nombre: 'ANA MARÍA', apellidos: 'CEREZO AGUILAR', dni: '488155559Z', sexo: 'M', fechaNacimiento: '1979-07-25', email: 'cerezoanam@gmail.com', telefono: '629043555', fechaAlta: '2021-12-23', rolId: rolVoluntario.id },
    { indicativo: 'B-23', nombre: 'VICTOR', apellidos: 'DE VEGA ÁLVAREZ', dni: '53962810A', sexo: 'H', fechaNacimiento: '2006-08-29', email: 'vdevegaalvarez@gmail.com', telefono: '660398792', fechaAlta: '2025-06-30', rolId: rolVoluntario.id },
    { indicativo: 'B-24', nombre: 'ROCÍO', apellidos: 'SALAS BAUTISTA', dni: '30267665X', sexo: 'M', fechaNacimiento: '2002-10-27', email: 'rociosalasbautista1@gmail.com', telefono: '672343604', fechaAlta: '2023-12-15', rolId: rolVoluntario.id },
    { indicativo: 'B-25', nombre: 'FRAN', apellidos: 'CUEVAS RODRIGUEZ', dni: '47566017X', sexo: 'H', fechaNacimiento: '2004-05-25', email: 'francuevas049@gmail.com', telefono: '689209677', fechaAlta: '2023-12-15', rolId: rolVoluntario.id },
    { indicativo: 'B-26', nombre: 'RUTH', apellidos: 'PÉREZ GARCÍA', dni: '28794085V', sexo: 'M', fechaNacimiento: '1979-04-21', email: 'moretichi@gmail.com', telefono: '666332573', fechaAlta: '2025-05-22', rolId: rolVoluntario.id },
    { indicativo: 'B-27', nombre: 'INÉS', apellidos: 'DE MARCO REAL', dni: '45996617K', sexo: 'M', fechaNacimiento: '2002-03-12', email: 'inesdemarc@gmail.com', telefono: '651127613', fechaAlta: '2024-12-02', rolId: rolVoluntario.id },
    { indicativo: 'B-28', nombre: 'MANUEL ANGEL', apellidos: 'GONZÁLEZ-CABAÑAS GOMEZ', dni: '47341291T', sexo: 'H', fechaNacimiento: '2001-03-30', email: 'manuelangel2001@gmail.com', telefono: '608645074', fechaAlta: '2024-10-01', rolId: rolVoluntario.id },
    { indicativo: 'B-29', nombre: 'JOSE CARLOS', apellidos: 'BAILON LOPEZ', dni: '05264361Y', sexo: 'H', fechaNacimiento: '1965-07-23', email: 'jcbailonlopez@gmail.com', telefono: '677238840', fechaAlta: '2024-04-05', rolId: rolVoluntario.id },
    { indicativo: 'B-30', nombre: 'ALBERTO', apellidos: 'LIBRERO ACEVEDO', dni: '28795964X', sexo: 'H', fechaNacimiento: '1979-08-27', email: 'librero38@gmail.com', telefono: '656780980', fechaAlta: '2024-03-29', rolId: rolVoluntario.id },
    { indicativo: 'B-31', nombre: 'TEODORO', apellidos: 'PEREZ ANTÓN', dni: '54786839B', sexo: 'H', fechaNacimiento: '2005-08-19', email: 'teodoroperezanton@gmail.com', telefono: '647355497', fechaAlta: '2024-03-29', rolId: rolVoluntario.id },
    { indicativo: 'B-32', nombre: 'PAULA MARÍA', apellidos: 'GONZÁLEZ ESPINOSA', dni: '53966234T', sexo: 'M', fechaNacimiento: '2004-03-14', email: 'paula.gonzalez.espinosaa@gmail.com', telefono: '651372077', fechaAlta: '2025-09-11', rolId: rolVoluntario.id },
    { indicativo: 'B-33', nombre: 'TRINIDAD', apellidos: 'ESPINOSA GONZÁLEZ', dni: '28930609J', sexo: 'M', fechaNacimiento: '1974-04-16', email: 'rotripale35@gmail.com', telefono: '657257767', fechaAlta: '2025-09-11', rolId: rolVoluntario.id },
    { indicativo: 'B-34', nombre: 'DANIEL', apellidos: 'GARCÍA MIGUEZ', dni: '29546744R', sexo: 'H', fechaNacimiento: '2003-07-02', email: 'danielgarmig@gmail.com', telefono: '644378933', fechaAlta: '2025-05-22', rolId: rolVoluntario.id },
    { indicativo: 'B-35', nombre: 'JUAN MARÍA', apellidos: 'LOPEZ BRAVO', dni: '28637249H', sexo: 'H', fechaNacimiento: '1983-09-01', email: 'Ju4nl0@gmail.com', telefono: '627455773', fechaAlta: '2024-05-14', rolId: rolVoluntario.id },
    { indicativo: 'B-36', nombre: 'PABLO', apellidos: 'RODRIGUEZ ISIDRO', dni: '54185203D', sexo: 'H', fechaNacimiento: '2004-05-28', email: 'pabloroisidro@gmail.com', telefono: '634593634', fechaAlta: '2024-05-14', rolId: rolVoluntario.id },
    { indicativo: 'B-38', nombre: 'GUILLERMO', apellidos: 'IBAÑEZ ROMERA', dni: '55375061D', sexo: 'H', fechaNacimiento: '2005-02-22', email: 'guillermoibro@gmail.com', telefono: '644702428', fechaAlta: '2024-07-31', rolId: rolVoluntario.id },
    { indicativo: 'B-39', nombre: 'LAURA', apellidos: 'MESA GARCÍA', dni: '53770018C', sexo: 'M', fechaNacimiento: '2003-07-15', email: 'lauramesaa15@gmail.com', telefono: '654405232', fechaAlta: '2025-05-22', rolId: rolVoluntario.id },
    { indicativo: 'B-40', nombre: 'JORGE', apellidos: 'CORDERO LOPEZ', dni: '29646777F', sexo: 'H', fechaNacimiento: '2003-10-21', email: 'carlopjorge99@gmail.com', telefono: '654416403', fechaAlta: '2025-04-28', rolId: rolVoluntario.id },
    { indicativo: 'B-42', nombre: 'DAVID', apellidos: 'REY AYALA', dni: '54439831G', sexo: 'H', fechaNacimiento: '2006-02-14', email: '2006reydavid@gmail.com', telefono: '603660967', fechaAlta: '2024-10-01', rolId: rolVoluntario.id },
    { indicativo: 'B-43', nombre: 'CARMEN', apellidos: 'GUTIÉRREZ RODRÍGUEZ', dni: '28986195A', sexo: 'M', fechaNacimiento: '2001-06-23', email: 'carmengutro13@gmail.com', telefono: '692478595', fechaAlta: '2024-12-02', rolId: rolVoluntario.id },
    { indicativo: 'B-45', nombre: 'MARTA', apellidos: 'SALAS LÓPEZ', dni: '54438054K', sexo: 'M', fechaNacimiento: '2006-06-09', email: 'martasalaslopez9@gmail.com', telefono: '679701924', fechaAlta: '2024-12-02', rolId: rolVoluntario.id },
    { indicativo: 'B-46', nombre: 'FERNANDO', apellidos: 'GALINDO FERNANDEZ-SERNA', dni: '29552189H', sexo: 'H', fechaNacimiento: '2003-02-21', email: 'fggs2003@gmail.com', telefono: '671178918', fechaAlta: '2025-01-21', rolId: rolVoluntario.id },
    { indicativo: 'B-47', nombre: 'M. ANGELES', apellidos: 'ORTEGA GAVIÑO', dni: '53966368L', sexo: 'M', fechaNacimiento: '2003-05-10', email: 'mariorga.03@gmail.com', telefono: '691357451', fechaAlta: '2025-01-21', rolId: rolVoluntario.id },
    { indicativo: 'B-48', nombre: 'PAULA MARÍA', apellidos: 'RODRÍGUEZ GARCÍA', dni: '30246369N', sexo: 'M', fechaNacimiento: '1990-11-08', email: 'paumarodgar@gmail.com', telefono: '660311925', fechaAlta: '2025-03-11', rolId: rolVoluntario.id },
  ]

  const password = await bcrypt.hash('pcivil2026', 10)

  for (const user of usuarios) {
    const existe = await prisma.usuario.findUnique({ where: { email: user.email } })
    
    if (!existe) {
      await prisma.usuario.create({
        data: {
          nombre: user.nombre,
          apellidos: user.apellidos,
          dni: user.dni,
          email: user.email,
          telefono: user.telefono,
          numeroVoluntario: user.indicativo,
          password,
          activo: true,
          rolId: user.rolId,
          servicioId: servicio.id,
          fichaVoluntario: {
            create: {
              fechaNacimiento: new Date(user.fechaNacimiento),
              sexo: user.sexo,
              fechaAlta: new Date(user.fechaAlta),
              localidad: 'BORMUJOS',
              provincia: 'SEVILLA',
              categoria: 'VOLUNTARIO'
            }
          }
        }
      })
      console.log(`✅ Usuario creado: ${user.indicativo} - ${user.nombre} ${user.apellidos}`)
    } else {
      console.log(`⏭️  Ya existe: ${user.indicativo} - ${user.nombre} ${user.apellidos}`)
    }
  }

  console.log('✅ Seed completado')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })