import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'fs'

const prisma = new PrismaClient()

async function backup() {
  console.log('Iniciando backup...')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dir = `backups/backup-${timestamp}`
  mkdirSync(dir, { recursive: true })

  const modelos = [
    // Usuarios y roles
    'usuario', 'rol', 'fichaVoluntario', 'asignacionVestuario', 'solicitudVestuario',
    // Configuración y sistema
    'servicio', 'configuracion', 'semanaPublicada', 'auditLog',
    // Guardias y disponibilidad
    'guardia', 'disponibilidad', 'dieta', 'informeDietas',
    // Cuadrantes / presupuesto
    'presupuestoAnual', 'partidaPresupuestaria', 'presupuestoProveedor', 'proveedor',
    'expedienteCompra', 'lineaExpediente', 'facturaExpediente', 'historialExpediente',
    // Edificios y recursos
    'edificio', 'planoEdificio', 'equipoECI', 'hidrante', 'planoMarcador',
    'dEA', 'botiquin', 'botiquinItem', 'revisionBotiquin', 'ubicacion',
    // Vehículos
    'vehiculo', 'documentoVehiculo', 'mantenimientoVehiculo', 'vehiculoAsignacion',
    'repostajeVehiculo', 'registroFluidoVehiculo', 'ticketCombustible', 'ubicacionVehiculo',
    'poliza', 'cicloCarga',
    // Logística e inventario
    'equipoRadio', 'mantenimientoEquipo', 'categoriaInventario', 'familiaArticulo', 'articulo',
    'peticionMaterial', 'peticionItem', 'historialPeticion', 'movimientoStock', 'movimientoCaja',
    // Drones
    'drone', 'bateriaDrone', 'pilotoDrone', 'vuelo', 'checklistVuelo',
    'mantenimientoDrone', 'notamRegistro', 'zonaVueloDron',
    // Formación
    'curso', 'convocatoria', 'inscripcion', 'certificacion', 'necesidadFormativa',
    // Prácticas y Megacode
    'practica', 'familiaPractica', 'registroPractica', 'jornadaAsistencia', 'participanteExterno',
    'megacode', 'megacodePractica', 'megacodeParticipacion', 'registroFirma',
    // Eventos y comunicación
    'evento', 'eventoParticipante', 'manual', 'notificacion', 'mensaje', 'mensajeEstado',
    // Partes operativos
    'partePSI', 'partePRVFSV',
    // CECOPAL e incidencias
    'incidencia', 'incidenciaCecopal',
    // Acción social
    'casoViogen', 'espacioAcogida',
    // Directorio
    'categoriaDirectorio', 'contactoDirectorio', 'centroEmergencia',
    // Aspirantes
    'aspirante',
  ]

  let total = 0
  const resumen = {}

  for (const modelo of modelos) {
    try {
      const datos = await prisma[modelo].findMany()
      writeFileSync(`${dir}/${modelo}.json`, JSON.stringify(datos, null, 2))
      resumen[modelo] = datos.length
      total += datos.length
      if (datos.length > 0) console.log(`  ✅ ${modelo}: ${datos.length} registros`)
    } catch (e) {
      resumen[modelo] = `ERROR: ${e.message}`
    }
  }

  writeFileSync(`${dir}/_resumen.json`, JSON.stringify({ timestamp, total, resumen }, null, 2))
  console.log(`\nBackup completado en: ${dir}`)
  console.log(`Total registros: ${total}`)
  await prisma.$disconnect()
}

backup().catch(e => { console.error(e); process.exit(1) })
