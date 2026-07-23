// Recopila el estado real de cada área funcional para alimentar a su agente.
// Solo lectura y en forma de resumen: nunca se vuelcan datos personales
// sensibles ni tablas completas.

import { prisma } from '@/lib/db'

const HOY = () => new Date()
const enDias = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000)
const haceDias = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000)
const fecha = (d?: Date | null) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'sin fecha'

/** Ficha completa de una práctica, con todo su contenido pedagógico. */
export function detallePractica(p: any, maxCampo = 1500): string {
  const t = (v: any) => {
    const s = (v ?? '').toString().trim()
    if (!s) return null
    return s.length > maxCampo ? s.slice(0, maxCampo) + '…' : s
  }
  const campos: [string, string | null][] = [
    ['Objetivo', t(p.objetivo)],
    ['Definición', t(p.definicion)],
    ['Descripción', t(p.descripcion)],
    ['Desarrollo', t(p.desarrollo)],
    ['Conclusiones', t(p.conclusiones)],
    ['Prerrequisitos', t(p.prerequisitos)],
    ['Material necesario', t(p.materialNecesario)],
    ['Lugar de desarrollo', t(p.lugarDesarrollo)],
    ['Riesgo de la práctica', t(p.riesgoPractica)],
    ['Riesgo de la intervención', t(p.riesgoIntervencion)],
    ['Observaciones de riesgo', t(p.riesgoObservaciones)],
  ]
  const cabecera = `### ${p.numero} — ${p.titulo}\n` +
    `familia ${p.familia}${p.subfamilia ? '/' + p.subfamilia : ''} · nivel ${p.nivel || 'sin nivel'} · ` +
    `${p.duracionEstimada || '?'} min · personal mínimo ${p.personalMinimo ?? '?'} · ` +
    `grupo ${p.grupo || 'sin grupo'} · ${p.activa ? 'ACTIVA' : 'INACTIVA'}` +
    `${p.youtubeUrl ? ' · con vídeo' : ''}`
  const cuerpo = campos
    .map(([k, v]) => `  ${k}: ${v ?? '*** SIN CUMPLIMENTAR ***'}`)
    .join('\n')
  return `${cabecera}\n${cuerpo}`
}

function bloque(titulo: string, contenido: string | string[]): string {
  const cuerpo = Array.isArray(contenido)
    ? (contenido.length ? contenido.map(l => `  - ${l}`).join('\n') : '  (sin registros)')
    : contenido
  return `\n## ${titulo}\n${cuerpo}`
}

/** Vencimiento legible: "caducado hace X" / "vence en X días". */
function venc(d?: Date | null): string {
  if (!d) return 'sin fecha de vencimiento'
  const dias = Math.round((new Date(d).getTime() - Date.now()) / 86400000)
  if (dias < 0) return `CADUCADO hace ${Math.abs(dias)} días (${fecha(d)})`
  if (dias <= 90) return `vence en ${dias} días (${fecha(d)})`
  return `vigente hasta ${fecha(d)}`
}

async function ctxVehiculos(): Promise<string> {
  const [vehiculos, mantRecientes, siniestros, fluidos] = await Promise.all([
    prisma.vehiculo.findMany({ orderBy: { indicativo: 'asc' } }),
    prisma.mantenimientoVehiculo.findMany({ where: { fecha: { gte: haceDias(365) } }, include: { vehiculo: { select: { indicativo: true } } }, orderBy: { fecha: 'desc' }, take: 40 }),
    prisma.siniestroVehiculo.findMany({ include: { vehiculo: { select: { indicativo: true } } }, orderBy: { fecha: 'desc' }, take: 30 }),
    prisma.registroFluidoVehiculo.findMany({ where: { fecha: { gte: haceDias(365) } }, include: { vehiculo: { select: { indicativo: true } } }, orderBy: { fecha: 'desc' }, take: 40 }),
  ])

  return [
    bloque('Flota', vehiculos.map(v =>
      `${v.indicativo || v.matricula} (${v.matricula}) · ${v.marca || ''} ${v.modelo || ''} · tipo ${v.tipo} · estado ${v.estado} · ${v.kmActual?.toLocaleString('es-ES') || '?'} km · ITV: ${venc(v.fechaItv)} · Seguro: ${venc(v.fechaSeguro)}`)),
    bloque('Mantenimientos del último año', mantRecientes.map(m =>
      `${fecha(m.fecha)} · ${m.vehiculo?.indicativo} · ${m.tipo} · ${m.descripcion.slice(0, 90)} · ${m.kilometraje?.toLocaleString('es-ES') || '?'} km · ${m.coste ? m.coste + ' €' : 'sin coste'}`)),
    bloque('Siniestros registrados', siniestros.map(s =>
      `${fecha(s.fecha)} · ${s.vehiculo?.indicativo} · ${s.tipo} (${s.gravedad}) · estado ${s.estado} · ${s.heridos ? 'CON HERIDOS' : 'sin heridos'} · parte ${s.parteUrl ? 'adjunto' : 'NO adjunto'} · ${s.descripcion.slice(0, 80)}`)),
    bloque('Revisiones de niveles y fluidos del último año', fluidos.map(f =>
      `${fecha(f.fecha)} · ${f.vehiculo?.indicativo} · ${f.tipoFluido} · ${f.accion} · ${f.kilometraje?.toLocaleString('es-ES') || 'sin km'} km`)),
  ].join('\n')
}

async function ctxIncendios(): Promise<string> {
  const [equipos, hidrantes, edificios, articulos, revisionesPci, accionesPci, practicas, registrosPractica] = await Promise.all([
    prisma.equipoECI.findMany({ include: { edificio: { select: { nombre: true } } }, orderBy: { proximaRevision: 'asc' }, take: 80 }),
    prisma.hidrante.findMany({ orderBy: { proximaRevision: 'asc' }, take: 60 }),
    prisma.edificio.count(),
    prisma.articulo.findMany({ where: { activo: true, familia: { categoria: { slug: 'incendios' } } }, include: { familia: { select: { nombre: true } } }, take: 60 }),
    prisma.revisionPCI.findMany({ include: { edificio: { select: { nombre: true, alias: true } }, _count: { select: { hallazgos: true } } }, orderBy: { fecha: 'desc' }, take: 60 }).catch(() => []),
    prisma.accionCorrectivaPCI.findMany({ where: { estado: { notIn: ['EJECUTADO', 'VERIFICADO', 'FACTURADO'] } }, include: { edificio: { select: { nombre: true, alias: true } }, presupuesto: { select: { numero: true } } }, orderBy: { importe: 'desc' }, take: 60 }).catch(() => []),
    prisma.practica.findMany({ where: { familia: 'incendios' }, orderBy: { numero: 'asc' } }).catch(() => []),
    prisma.registroPractica.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }).catch(() => []),
  ])

  return [
    `\nEdificios con instalaciones de protección contra incendios registrados: ${edificios}`,
    bloque('Equipos de extinción (ECI)', equipos.map(e =>
      `${e.tipo}${e.subtipo ? '/' + e.subtipo : ''} · ${e.edificio?.nombre || 'sin edificio'} · ${e.ubicacion || 'sin ubicación'} · estado ${e.estado} · última revisión ${fecha(e.ultimaRevision)} · próxima: ${venc(e.proximaRevision)}`)),
    bloque('Hidrantes', hidrantes.map(h =>
      `${h.codigo} · ${h.tipo} · ${h.ubicacion} · estado ${h.estado} · presión ${h.presion ?? '?'} · próxima revisión: ${venc(h.proximaRevision)}`)),
    bloque('Material de incendios en inventario', articulos.map(a =>
      `${a.nombre} · stock ${a.stockActual} ${a.unidad} (mínimo ${a.stockMinimo})${a.fechaCaducidad ? ' · caducidad ' + fecha(a.fechaCaducidad) : ''}`)),
    bloque('Contrato PCI — últimas revisiones de edificios municipales', (revisionesPci as any[]).map(r =>
      `${(r as any).campana} (${fecha((r as any).fecha)}) · ${(r as any).edificio?.alias || (r as any).edificio?.nombre} · ${(r as any).tipo} · ${(r as any).resultado} · ${(r as any)._count.hallazgos} defecto(s)`)),
    bloque('Contrato PCI — actuaciones correctivas abiertas', (accionesPci as any[]).map(a =>
      `${(a as any).edificio?.alias || (a as any).edificio?.nombre} · ${(a as any).descripcion} · prioridad ${(a as any).prioridad} · estado ${(a as any).estado} · ${(a as any).importe ? (a as any).importe + ' €' : 'sin importe'}${(a as any).recurrente ? ' · RECURRENTE detectado ' + (a as any).vecesDetectada + ' veces sin subsanar' : ''}${(a as any).presupuesto ? ' · ppto ' + (a as any).presupuesto.numero : ''}`)),
    `\n## Catálogo de prácticas del área de incendios (contenido íntegro, ${(practicas as any[]).length} fichas)\n` +
      ((practicas as any[]).length
        ? (practicas as any[]).map(p => detallePractica(p)).join('\n\n')
        : '  (sin prácticas registradas)'),
    bloque('Últimos registros de prácticas realizadas (todas las familias)', (registrosPractica as any[]).map(r =>
      `${fecha((r as any).fecha || (r as any).createdAt)} · práctica ${(r as any).practicaId || '?'} · ${(r as any).observaciones ? String((r as any).observaciones).slice(0, 70) : 'sin observaciones'}`)),
  ].join('\n')
}

async function ctxSocorrismo(): Promise<string> {
  const [botiquines, revisiones, deas, articulos] = await Promise.all([
    prisma.botiquin.findMany({ include: { vehiculo: { select: { indicativo: true } }, _count: { select: { items: true } } }, orderBy: { proximaRevision: 'asc' } }),
    prisma.revisionBotiquin.findMany({ include: { botiquin: { select: { codigo: true } } }, orderBy: { fecha: 'desc' }, take: 30 }),
    prisma.dEA.findMany({ include: { edificio: { select: { nombre: true } } }, orderBy: { proximaRevision: 'asc' } }),
    prisma.articulo.findMany({ where: { activo: true, familia: { categoria: { slug: 'socorrismo' } } }, take: 60 }),
  ])

  return [
    bloque('Botiquines', botiquines.map(b =>
      `${b.codigo} · ${b.nombre} · tipo ${b.tipo} · ${b.vehiculo?.indicativo || b.ubicacionActual || 'sin ubicación'} · estado ${b.estado} · ${b._count.items} artículos · última revisión ${fecha(b.ultimaRevision)} · próxima: ${venc(b.proximaRevision)}`)),
    bloque('Últimas revisiones de botiquín', revisiones.map(r =>
      `${fecha(r.fecha)} · ${r.botiquin?.codigo} · verificados ${r.itemsVerificados} · faltantes ${r.itemsFaltantes} · caducados ${r.itemsCaducados}`)),
    bloque('Desfibriladores (DEA)', deas.map(d =>
      `${d.codigo} · ${d.marca || ''} ${d.modelo || ''} · ${d.edificio?.nombre || d.ubicacion || 'sin ubicación'} · estado ${d.estado} · accesible 24h: ${d.accesible24h ? 'sí' : 'no'} · revisión: ${venc(d.proximaRevision)} · batería: ${venc(d.caducidadBateria)} · parches: ${venc(d.caducidadParches)} · parches infantiles: ${venc(d.caducidadParchesInfantiles)}`)),
    bloque('Material sanitario en inventario', articulos.map(a =>
      `${a.nombre} · stock ${a.stockActual} ${a.unidad} (mínimo ${a.stockMinimo})${a.fechaCaducidad ? ' · caducidad ' + fecha(a.fechaCaducidad) : ''}`)),
  ].join('\n')
}

async function ctxLogistica(): Promise<string> {
  const [articulos, bajoMinimo, caducan, peticiones, vestuario] = await Promise.all([
    prisma.articulo.count({ where: { activo: true } }),
    prisma.articulo.findMany({ where: { activo: true }, include: { familia: { select: { nombre: true } } }, take: 400 }),
    prisma.articulo.findMany({ where: { activo: true, tieneCaducidad: true, fechaCaducidad: { lte: enDias(120) } }, orderBy: { fechaCaducidad: 'asc' }, take: 60 }),
    prisma.peticionMaterial.findMany({ where: { estado: { in: ['pendiente', 'aprobada', 'en_compra'] } }, include: { solicitante: { select: { nombre: true, apellidos: true } } }, orderBy: { fechaSolicitud: 'asc' }, take: 40 }),
    prisma.asignacionVestuario.findMany({ where: { fechaBaja: null }, take: 40 }).catch(() => []),
  ])
  const criticos = bajoMinimo.filter(a => a.stockActual <= a.stockMinimo)

  return [
    `\nArtículos activos en inventario: ${articulos}. Por debajo del mínimo: ${criticos.length}.`,
    bloque('Artículos bajo mínimo', criticos.slice(0, 80).map(a =>
      `${a.nombre} (${a.familia?.nombre || 'sin familia'}) · stock ${a.stockActual} ${a.unidad} · mínimo ${a.stockMinimo}`)),
    bloque('Artículos que caducan en los próximos 120 días', caducan.map(a =>
      `${a.nombre} · caduca ${fecha(a.fechaCaducidad)} · stock ${a.stockActual} ${a.unidad}`)),
    bloque('Peticiones abiertas', peticiones.map(p =>
      `${fecha(p.fechaSolicitud)} · estado ${p.estado} · prioridad ${p.prioridad} · área ${(p as any).areaOrigen || '?'} · solicitante ${p.solicitante?.nombre || '?'}`)),
    bloque('Vestuario entregado sin devolver', (vestuario as any[]).map(v =>
      `${(v as any).tipoPrenda || 'prenda'} talla ${(v as any).talla || '?'} · x${(v as any).cantidad ?? 1} · asignada ${fecha((v as any).fechaAsignacion)} · estado ${(v as any).estado || '?'}`)),
  ].join('\n')
}

async function ctxTransmisiones(): Promise<string> {
  const [equipos, mantenimientos] = await Promise.all([
    prisma.equipoRadio.findMany({ orderBy: { codigo: 'asc' } }),
    prisma.mantenimientoEquipo.findMany({ orderBy: { fecha: 'desc' }, take: 30 }).catch(() => []),
  ])

  return [
    bloque('Equipos de radio', equipos.map(e =>
      `${e.codigo} · ${e.tipo} · ${e.marca} ${e.modelo} · config ${e.configuracion} · estado ${e.estado} · batería ${e.estadoBateria || '?'} · ciclos ${e.ciclosCarga ?? 0} · ubicación ${e.ubicacion || 'sin asignar'} · canal analógico ${e.canalAnalogico || '-'} / digital ${e.canalDigital || '-'}`)),
    bloque('Últimos mantenimientos de equipos', (mantenimientos as any[]).map(m =>
      `${fecha((m as any).fecha)} · ${(m as any).tipo || 'mantenimiento'} · ${((m as any).descripcion || '').slice(0, 80)}`)),
  ].join('\n')
}

async function ctxFormacion(): Promise<string> {
  const [cursos, convocatorias, certificaciones, necesidades] = await Promise.all([
    prisma.curso.findMany({ include: { _count: { select: { convocatorias: true } } }, take: 60 }),
    prisma.convocatoria.findMany({ include: { curso: { select: { nombre: true } }, _count: { select: { inscripciones: true } } }, orderBy: { fechaInicio: 'desc' }, take: 40 }),
    prisma.certificacion.findMany({ where: { OR: [{ fechaExpiracion: { lte: enDias(120) } }, { vigente: false }] }, include: { usuario: { select: { numeroVoluntario: true } }, curso: { select: { nombre: true } } }, orderBy: { fechaExpiracion: 'asc' }, take: 60 }),
    prisma.necesidadFormativa.findMany({ take: 40 }).catch(() => []),
  ])

  return [
    bloque('Catálogo de cursos', cursos.map(c =>
      `${c.nombre} · tipo ${c.tipo} · ${c.duracionHoras || '?'} h · ${c._count.convocatorias} convocatorias`)),
    bloque('Convocatorias recientes', convocatorias.map(c =>
      `${fecha(c.fechaInicio)} · ${c.curso?.nombre} · estado ${(c as any).estado || '?'} · ${c._count.inscripciones} inscritos`)),
    bloque('Certificaciones caducadas o próximas a caducar', certificaciones.map(c =>
      `Voluntario ${c.usuario?.numeroVoluntario || '?'} · ${c.curso?.nombre || 'curso'} · ${c.vigente ? 'vigente' : 'NO VIGENTE'} · ${venc(c.fechaExpiracion)}`)),
    bloque('Necesidades formativas detectadas', (necesidades as any[]).map(n =>
      `${(n as any).titulo || (n as any).descripcion || 'necesidad'} · prioridad ${(n as any).prioridad || '?'}`)),
  ].join('\n')
}

async function ctxPracticas(): Promise<string> {
  const [practicas, registros, megacodes] = await Promise.all([
    prisma.practica.findMany({ orderBy: { numero: 'asc' }, take: 250 }),
    prisma.registroPractica.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }).catch(() => []),
    prisma.megacode.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []),
  ])

  const porFamilia: Record<string, any[]> = {}
  practicas.forEach(p => { (porFamilia[p.familia] ||= []).push(p) })

  return [
    `\nCatálogo de prácticas: ${practicas.length} fichas. Por familia: ` +
      Object.entries(porFamilia).map(([f, l]) => `${f} (${l.length})`).join(', ') + '.',
    ...Object.entries(porFamilia).map(([familia, lista]) =>
      `\n## Prácticas de la familia "${familia}" — contenido íntegro\n` +
      lista.map(p => detallePractica(p, 900)).join('\n\n')),
    bloque('Últimos registros de práctica realizados', (registros as any[]).map(r =>
      `${fecha((r as any).fecha || (r as any).createdAt)} · práctica ${(r as any).practicaId || '?'} · ${(r as any).observaciones ? String((r as any).observaciones).slice(0, 70) : 'sin observaciones'}`)),
    bloque('Megacodes', (megacodes as any[]).map(m =>
      `${(m as any).titulo || (m as any).nombre || 'megacode'} · ${fecha((m as any).createdAt)}`)),
  ].join('\n')
}

async function ctxDrones(): Promise<string> {
  const [drones, pilotos, vuelos, baterias, mantenimientos] = await Promise.all([
    prisma.drone.findMany(),
    prisma.pilotoDrone.findMany(),
    prisma.vuelo.findMany({ include: { drone: { select: { codigo: true } } }, orderBy: { fecha: 'desc' }, take: 40 }),
    prisma.bateriaDrone.findMany({ take: 60 }),
    prisma.mantenimientoDrone.findMany({ orderBy: { fecha: 'desc' }, take: 20 }).catch(() => []),
  ])

  return [
    bloque('Aeronaves', drones.map(d =>
      `${d.codigo} · ${d.marca} ${d.modelo} · matrícula AESA ${d.matriculaAESA || 'SIN REGISTRAR'} · categoría ${d.categoria || '?'} · ${d.pesoGramos || '?'} g · estado ${d.estado} · ${d.horasVuelo || 0} h en ${d.totalVuelos || 0} vuelos`)),
    bloque('Pilotos', pilotos.map(p =>
      `${p.nombre} ${p.apellidos} · licencia AESA ${p.licenciaAESA || 'SIN REGISTRAR'} · seguro RC ${p.seguroRC ? 'sí' : 'NO'} · vigencia seguro: ${venc(p.seguroVencimiento || (p as any).seguroRCVigencia)} · ${p.activo ? 'activo' : 'inactivo'}${p.esExterno ? ' · externo' : ''}`)),
    bloque('Baterías', baterias.map(b =>
      `${(b as any).codigo || (b as any).id} · ciclos ${(b as any).ciclos ?? '?'} · estado ${(b as any).estado || '?'}`)),
    bloque('Últimos vuelos', vuelos.map(v =>
      `${fecha(v.fecha)} · ${v.drone?.codigo} · ${v.duracionMinutos || '?'} min · ${(v as any).tipoVuelo || (v as any).proposito || 'sin tipificar'}`)),
    bloque('Mantenimientos de aeronave', (mantenimientos as any[]).map(m =>
      `${fecha((m as any).fecha)} · ${(m as any).tipo || 'mantenimiento'} · próximo ${fecha((m as any).proximoMantenimiento)}`)),
  ].join('\n')
}

async function ctxCecopal(): Promise<string> {
  const [incidencias, abiertas, espacios, centros] = await Promise.all([
    prisma.incidenciaCecopal.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
    prisma.incidenciaCecopal.count({ where: { estado: { notIn: ['cerrada', 'finalizada'] } } }),
    prisma.espacioAcogida.findMany({ take: 30 }).catch(() => []),
    prisma.centroEmergencia.findMany({ take: 30 }).catch(() => []),
  ])

  return [
    `\nIncidencias sin cerrar: ${abiertas}`,
    bloque('Últimas incidencias', incidencias.map(i =>
      `Nº${i.numero} · ${fecha(i.createdAt)} · ${i.tipoIncidencia} · estado ${i.estado} · origen ${i.origenAviso || '?'} · ${i.direccion || 'sin dirección'} · llamada ${i.horaLlamada || '-'} / salida ${i.horaSalida || '-'} / llegada ${i.horaLlegada || '-'} / terminado ${i.horaTerminado || '-'}`)),
    bloque('Espacios de acogida', (espacios as any[]).map(e =>
      `${(e as any).nombre} · capacidad ${(e as any).capacidad ?? '?'} · ${(e as any).direccion || ''}`)),
    bloque('Centros de emergencia', (centros as any[]).map(c =>
      `${(c as any).nombre} · ${(c as any).tipo || ''} · ${(c as any).direccion || ''}`)),
  ].join('\n')
}

async function ctxAccionSocial(): Promise<string> {
  const [casos, contactos] = await Promise.all([
    prisma.casoViogen.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }).catch(() => []),
    prisma.contactoDirectorio.findMany({ where: { activo: true }, take: 60 }).catch(() => []),
  ])

  // Los casos VIOGEN son confidenciales: solo se exponen métricas agregadas.
  const porEstado: Record<string, number> = {}
  ;(casos as any[]).forEach(c => { const e = (c as any).estado || 'sin estado'; porEstado[e] = (porEstado[e] || 0) + 1 })

  return [
    bloque('Casos de seguimiento (datos agregados, sin identificación)', Object.entries(porEstado).map(([e, n]) => `${e}: ${n} casos`)),
    `\nCaso más reciente: ${(casos as any[])[0] ? fecha((casos as any[])[0].createdAt) : 'sin casos'}`,
    bloque('Directorio de recursos y derivación', (contactos as any[]).map(c =>
      `${(c as any).nombre} · ${(c as any).entidad || ''} · ${(c as any).categoria || 'sin categoría'} · ${(c as any).telefono || 'sin teléfono'}`)),
  ].join('\n')
}

async function ctxAdministracion(): Promise<string> {
  const anio = new Date().getFullYear()
  const [partidas, movimientos, dietas, polizas, fichas] = await Promise.all([
    prisma.partidaPresupuestaria.findMany({ where: { presupuesto: { ejercicio: anio } }, include: { presupuesto: { select: { ejercicio: true } } } }).catch(() => []),
    prisma.movimientoCaja.findMany({ where: { fecha: { gte: haceDias(365) } }, orderBy: { fecha: 'desc' }, take: 60 }).catch(() => []),
    prisma.dieta.findMany({ where: { fecha: { gte: haceDias(365) } }, take: 60 }).catch(() => []),
    prisma.poliza.findMany().catch(() => []),
    prisma.fichaVoluntario.findMany({ select: { indicativo2: true, dniNie: true, areaAsignada: true, fechaAlta: true, telefonoFijo: true } }).catch(() => []),
  ])

  const incompletas = (fichas as any[]).filter(f => !f.indicativo2 || !f.dniNie || !f.areaAsignada)

  return [
    bloque(`Partidas presupuestarias ${anio}`, (partidas as any[]).map(p =>
      `${(p as any).codigo} · ${(p as any).denominacion || ''} · previsto ${(p as any).importePrevisto ?? '?'} € · ejecutado ${(p as any).importeEjecutado ?? (p as any).importeGastado ?? '?'} €`)),
    bloque('Movimientos de caja del último año (últimos 60)', (movimientos as any[]).map(m =>
      `${fecha((m as any).fecha)} · ${(m as any).tipo} · ${(m as any).importe} € · ${((m as any).concepto || '').slice(0, 60)}${(m as any).justificanteUrl ? '' : ' · SIN JUSTIFICANTE'}`)),
    bloque('Dietas del último año', (dietas as any[]).map(d =>
      `${fecha((d as any).fecha)} · ${(d as any).importe ?? '?'} € · estado ${(d as any).estado || 'sin estado'}`)),
    bloque('Pólizas de seguro', (polizas as any[]).map(p =>
      `${(p as any).tipo || 'póliza'} · ${(p as any).compania || ''} · nº ${(p as any).numeroPoliza || '?'} · ${venc((p as any).fechaVencimiento)}`)),
    `\nFichas de voluntario: ${(fichas as any[]).length}. Incompletas (sin indicativo, DNI o área): ${incompletas.length}.`,
  ].join('\n')
}

async function ctxCuadrantes(): Promise<string> {
  const [guardias, semanas, voluntarios, disponibilidades] = await Promise.all([
    prisma.guardia.findMany({ where: { fecha: { gte: haceDias(90), lte: enDias(60) } }, include: { usuario: { select: { numeroVoluntario: true, fichaVoluntario: { select: { indicativo2: true, areaAsignada: true } } } } }, orderBy: { fecha: 'asc' }, take: 400 }),
    prisma.semanaPublicada.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []),
    prisma.usuario.findMany({ where: { activo: true }, select: { numeroVoluntario: true, fichaVoluntario: { select: { indicativo2: true, areaAsignada: true } } } }).catch(() => []),
    prisma.disponibilidad.findMany({ where: { createdAt: { gte: haceDias(120) } }, take: 200 }).catch(() => []),
  ])

  const porVoluntario: Record<string, number> = {}
  guardias.forEach(g => {
    const k = g.usuario?.fichaVoluntario?.indicativo2 || g.usuario?.numeroVoluntario || 'sin indicativo'
    porVoluntario[k] = (porVoluntario[k] || 0) + 1
  })
  const porFechaTurno: Record<string, number> = {}
  guardias.forEach(g => {
    const k = `${fecha(g.fecha)} ${g.turno}`
    porFechaTurno[k] = (porFechaTurno[k] || 0) + 1
  })
  const flojos = Object.entries(porFechaTurno).filter(([, n]) => n <= 2)

  return [
    `\nGuardias entre -90 y +60 días: ${guardias.length}. Voluntarios activos: ${(voluntarios as any[]).length}. Disponibilidades declaradas en 120 días: ${(disponibilidades as any[]).length}.`,
    bloque('Reparto de guardias por voluntario', Object.entries(porVoluntario).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n} guardias`)),
    bloque('Turnos con 2 o menos personas', flojos.slice(0, 60).map(([k, n]) => `${k}: ${n} persona(s)`)),
    bloque('Semanas publicadas', (semanas as any[]).map(s =>
      `${(s as any).semana || (s as any).clave || ''} · publicada ${fecha((s as any).createdAt)}`)),
  ].join('\n')
}

async function ctxPartes(): Promise<string> {
  const [psi, prv, incidencias] = await Promise.all([
    prisma.partePSI.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.partePRVFSV.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }).catch(() => []),
    prisma.incidencia.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }).catch(() => []),
  ])

  return [
    bloque('Partes PSI recientes', psi.map(p =>
      `${fecha(p.createdAt)} · nº ${(p as any).numeroParte || (p as any).numero || '?'} · estado ${(p as any).estado || 'sin estado'} · ${(p as any).tipoServicio || (p as any).tipo || 'sin tipificar'}`)),
    bloque('Partes PRV-FSV recientes', (prv as any[]).map(p =>
      `${fecha((p as any).createdAt)} · nº ${(p as any).numeroParte || '?'} · estado ${(p as any).estado || 'sin estado'}`)),
    bloque('Incidencias registradas', (incidencias as any[]).map(i =>
      `${fecha((i as any).createdAt)} · ${(i as any).tipo || ''} · estado ${(i as any).estado || '?'} · ${((i as any).descripcion || '').slice(0, 70)}`)),
  ].join('\n')
}

async function ctxManuales(): Promise<string> {
  const manuales = await prisma.manual.findMany({ orderBy: { updatedAt: 'desc' }, take: 120 })
  return bloque('Manuales y procedimientos', manuales.map(m =>
    `${m.titulo} · categoría ${m.categoria || 'sin categoría'} · tipo ${m.tipo || '?'}${m.fabricante ? ' · ' + m.fabricante : ''} · actualizado ${fecha(m.updatedAt)}`))
}

async function ctxEstadisticas(): Promise<string> {
  const anio = new Date().getFullYear()
  const desde = new Date(anio, 0, 1)
  const [guardias, eventos, incidencias, vuelos, psi, peticiones, vehiculos] = await Promise.all([
    prisma.guardia.count({ where: { fecha: { gte: desde } } }),
    prisma.evento.count({ where: { fecha: { gte: desde } } }),
    prisma.incidenciaCecopal.count({ where: { createdAt: { gte: desde } } }),
    prisma.vuelo.count({ where: { fecha: { gte: desde } } }),
    prisma.partePSI.count({ where: { createdAt: { gte: desde } } }),
    prisma.peticionMaterial.count({ where: { fechaSolicitud: { gte: desde } } }),
    prisma.vehiculo.count(),
  ])
  return bloque(`Actividad registrada en ${anio}`, [
    `Guardias: ${guardias}`,
    `Eventos: ${eventos}`,
    `Incidencias CECOPAL: ${incidencias}`,
    `Vuelos RPAS: ${vuelos}`,
    `Partes PSI: ${psi}`,
    `Peticiones de material: ${peticiones}`,
    `Vehículos en flota: ${vehiculos}`,
  ])
}

async function ctxGeneral(): Promise<string> {
  const [usuarios, sinArea, vehiculos, articulos, guardiasProx, incidenciasAbiertas] = await Promise.all([
    prisma.usuario.count({ where: { activo: true } }),
    prisma.fichaVoluntario.count({ where: { OR: [{ areaAsignada: null }, { areaAsignada: '' }] } }),
    prisma.vehiculo.count(),
    prisma.articulo.count({ where: { activo: true } }),
    prisma.guardia.count({ where: { fecha: { gte: HOY(), lte: enDias(14) } } }),
    prisma.incidenciaCecopal.count({ where: { estado: { notIn: ['cerrada', 'finalizada'] } } }),
  ])
  return bloque('Situación general del servicio', [
    `Voluntarios activos: ${usuarios}`,
    `Fichas sin área asignada: ${sinArea}`,
    `Vehículos en flota: ${vehiculos}`,
    `Artículos activos en inventario: ${articulos}`,
    `Guardias programadas en los próximos 14 días: ${guardiasProx}`,
    `Incidencias CECOPAL sin cerrar: ${incidenciasAbiertas}`,
  ])
}

const RECOLECTORES: Record<string, () => Promise<string>> = {
  incendios: ctxIncendios,
  socorrismo: ctxSocorrismo,
  vehiculos: ctxVehiculos,
  logistica: ctxLogistica,
  transmisiones: ctxTransmisiones,
  formacion: ctxFormacion,
  practicas: ctxPracticas,
  drones: ctxDrones,
  cecopal: ctxCecopal,
  'accion-social': ctxAccionSocial,
  administracion: ctxAdministracion,
  cuadrantes: ctxCuadrantes,
  partes: ctxPartes,
  manuales: ctxManuales,
  estadisticas: ctxEstadisticas,
  general: ctxGeneral,
}

/** Construye el contexto de datos del área. Nunca lanza: ante error devuelve aviso. */
export async function construirContexto(area: string): Promise<string> {
  const recolector = RECOLECTORES[area] || RECOLECTORES.general
  try {
    const contexto = await recolector()
    const cabecera = `Fecha de consulta: ${fecha(new Date())} (zona horaria Europe/Madrid).`
    // Recorte de seguridad para no disparar el consumo de tokens.
    const cuerpo = contexto.length > 180000 ? contexto.slice(0, 180000) + '\n\n[...contexto recortado por extensión...]' : contexto
    return `${cabecera}\n${cuerpo}`
  } catch (error) {
    console.error('Error construyendo contexto del agente', area, error)
    return 'No ha sido posible recuperar los datos del área en este momento. Responde solo con conocimiento técnico general y advierte de que no tienes acceso a los datos del servicio.'
  }
}
