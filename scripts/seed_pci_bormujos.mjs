// Carga los datos reales del contrato PCI del Ayuntamiento de Bormujos.
// Es IDEMPOTENTE y ADITIVO: no borra ni sobrescribe información existente.
// Los edificios se localizan por nombre; si ya existen, solo se les completa
// el código de cliente y el alias.
//
//   node scripts/seed_pci_bormujos.mjs

import { PrismaClient } from '@prisma/client'
import { EDIFICIOS, FACTURAS, CAMPANAS, FECHA_CORRECTIVO_FEB, TECNICO, MAPA_EDIFICIOS_APP } from './datos_pci_bormujos.mjs'

const prisma = new PrismaClient()

// Clasifica el texto del defecto en un estado del hallazgo.
function estadoHallazgo(texto) {
  const t = texto.toLowerCase()
  if (t.includes('desaparecid')) return 'DESAPARECIDO'
  if (t.includes('no funciona') || t.includes('inoperativ') || t.includes('no resetea') || t.includes('avería') || t.includes('averiad') || t.includes('rota') || t.includes('cortado') || t.includes('no arranca')) return 'NO_FUNCIONA'
  if (t.includes('caducad')) return 'CADUCADO'
  return 'DEFECTO'
}

// Nombre corto del elemento afectado, para poder agrupar y filtrar.
function elementoDe(texto) {
  const t = texto.toLowerCase()
  if (t.includes('grupo de presión') || t.includes('grupo diésel') || t.includes('bomba')) return 'Grupo de presión / ABA'
  if (t.includes('central')) return 'Central de detección'
  if (t.includes('detector')) return 'Detectores'
  if (t.includes('pulsador')) return 'Pulsadores'
  if (t.includes('sirena')) return 'Sirenas'
  if (t.includes('bie') || t.includes('manguera')) return 'BIE / Mangueras'
  if (t.includes('columna seca') || t.includes('siamesa')) return 'Columna seca'
  if (t.includes('señal')) return 'Señalización'
  if (t.includes('altura')) return 'Altura de extintores'
  if (t.includes('cable') || t.includes('cableado')) return 'Cableado'
  if (t.includes('boya') || t.includes('aljibe')) return 'Aljibe / Boya'
  if (t.includes('batería')) return 'Baterías'
  if (t.includes('piloto')) return 'Pilotos'
  if (t.includes('cristal')) return 'Cristal BIE'
  if (t.includes('extintor') || t.includes('retimbrado') || t.includes('recarga') || t.includes('co2') || t.includes('abc')) return 'Extintores'
  return 'Otros'
}

const D = (iso) => new Date(iso + 'T09:00:00.000Z')

async function main() {
  console.log('Cargando datos del contrato PCI de Bormujos...\n')
  const resumen = { edificios: 0, edificiosNuevos: 0, revisiones: 0, hallazgos: 0, presupuestos: 0, acciones: 0, facturas: 0 }
  const edificioPorCodigo = {}

  // ── 1. Edificios ───────────────────────────────────────────────────────────
  for (const e of EDIFICIOS) {
    const nombreApp = MAPA_EDIFICIOS_APP[e.codigo]
    let edificio = await prisma.edificio.findFirst({
      where: {
        OR: [
          { codigoCliente: e.codigo },
          ...(nombreApp ? [{ nombre: nombreApp }] : []),
          { nombre: e.nombre },
        ],
      },
    })
    if (edificio) {
      edificio = await prisma.edificio.update({
        where: { id: edificio.id },
        data: {
          codigoCliente: edificio.codigoCliente || e.codigo,
          alias: edificio.alias || (edificio.nombre !== e.nombre ? e.nombre : e.alias) || null,
          contratoPci: 'PCI-BORMUJOS',
        },
      })
    } else {
      edificio = await prisma.edificio.create({
        data: { nombre: e.nombre, codigoCliente: e.codigo, alias: e.alias || null, contratoPci: 'PCI-BORMUJOS' },
      })
      resumen.edificiosNuevos++
    }
    edificioPorCodigo[e.codigo] = edificio
    resumen.edificios++
  }

  // ── 2. Revisiones y hallazgos ──────────────────────────────────────────────
  for (const e of EDIFICIOS) {
    const edificio = edificioPorCodigo[e.codigo]
    for (const camp of e.campanas || []) {
      const meta = CAMPANAS[camp.c]
      if (!meta) continue
      const defectos = camp.defectos || []
      const datos = {
        edificioId: edificio.id,
        campana: camp.c,
        tipo: camp.tipo || meta.tipo,
        fecha: D(meta.fecha),
        resultado: defectos.length ? 'con_defectos' : 'favorable',
        tecnico: TECNICO,
        equiposResumen: e.equipos || null,
        observaciones: e.nota || null,
      }
      const revision = await prisma.revisionPCI.upsert({
        where: { edificioId_campana: { edificioId: edificio.id, campana: camp.c } },
        update: datos,
        create: datos,
      })
      resumen.revisiones++

      // Los hallazgos se regeneran para esta revisión (fuente única: el acta).
      await prisma.hallazgoPCI.deleteMany({ where: { revisionId: revision.id } })
      if (defectos.length) {
        await prisma.hallazgoPCI.createMany({
          data: defectos.map(d => ({
            revisionId: revision.id,
            elemento: elementoDe(d),
            estado: estadoHallazgo(d),
            descripcion: d,
            requiereIntervencion: true,
          })),
        })
        resumen.hallazgos += defectos.length
      }

      // Presupuesto asociado al acta.
      if (camp.ppto) {
        const datosP = {
          edificioId: edificio.id,
          revisionId: revision.id,
          fecha: D(meta.fecha),
          campana: camp.c,
          concepto: `Correctivo tras revisión ${camp.c} — ${e.alias || e.nombre}`,
          total: camp.ppto.total,
          categoria: 'PCI',
          estado: 'PRESENTADO',
        }
        await prisma.presupuestoPCI.upsert({
          where: { numero: camp.ppto.numero },
          update: datosP,
          create: { numero: camp.ppto.numero, ...datosP },
        })
        resumen.presupuestos++
      }
    }

    // ── 3. Presupuestos correctivos de feb-2026 ──────────────────────────────
    for (const c of e.correctivos || []) {
      const datosC = {
        edificioId: edificio.id,
        fecha: D(FECHA_CORRECTIVO_FEB),
        campana: 'feb-2026',
        concepto: c.concepto,
        total: c.total,
        categoria: c.categoria || 'PCI',
        estado: 'PRESENTADO',
      }
      await prisma.presupuestoPCI.upsert({
        where: { numero: c.numero },
        update: datosC,
        create: { numero: c.numero, ...datosC },
      })
      resumen.presupuestos++
    }
  }

  // ── 4. Acciones correctivas del pipeline ───────────────────────────────────
  for (const e of EDIFICIOS) {
    const edificio = edificioPorCodigo[e.codigo]
    const acciones = [...(e.accion ? [e.accion] : []), ...(e.accionesExtra || [])]
    for (const a of acciones) {
      const campanasConDefecto = (e.campanas || []).filter(c => (c.defectos || []).length)
      const primera = campanasConDefecto[0]
      const ultima = campanasConDefecto[campanasConDefecto.length - 1]
      const presupuesto = a.ppto ? await prisma.presupuestoPCI.findUnique({ where: { numero: a.ppto } }) : null
      const origen = ultima
        ? await prisma.revisionPCI.findUnique({ where: { edificioId_campana: { edificioId: edificio.id, campana: ultima.c } } })
        : null

      const datosA = {
        edificioId: edificio.id,
        descripcion: a.descripcion,
        detalle: a.detalle || null,
        origenRevisionId: origen?.id || null,
        presupuestoId: presupuesto?.id || null,
        estado: presupuesto ? 'PRESUPUESTADO' : 'DETECTADO',
        prioridad: a.prioridad || 'media',
        categoria: a.categoria || 'PCI',
        importe: a.importe ?? null,
        recurrente: !!a.recurrente,
        vecesDetectada: campanasConDefecto.length || 1,
        primeraDeteccion: primera ? D(CAMPANAS[primera.c].fecha) : null,
        ultimaDeteccion: ultima ? D(CAMPANAS[ultima.c].fecha) : null,
        notas: a.notas || null,
      }

      const existente = await prisma.accionCorrectivaPCI.findFirst({
        where: { edificioId: edificio.id, descripcion: a.descripcion },
      })
      if (existente) {
        // No se pisa el estado del pipeline si el servicio ya lo ha movido.
        const yaGestionada = existente.estado !== 'DETECTADO' && existente.estado !== 'PRESUPUESTADO'
        await prisma.accionCorrectivaPCI.update({
          where: { id: existente.id },
          data: { ...datosA, estado: yaGestionada ? existente.estado : datosA.estado },
        })
      } else {
        await prisma.accionCorrectivaPCI.create({ data: datosA })
      }
      resumen.acciones++
    }
  }

  // ── 5. Facturas ────────────────────────────────────────────────────────────
  for (const f of FACTURAS) {
    const edificio = f.edificio ? edificioPorCodigo[f.edificio] : null
    const datosF = {
      edificioId: edificio?.id || null,
      fecha: D(f.fecha),
      concepto: f.concepto,
      importe: f.importe ?? null,
      conformada: false,
    }
    await prisma.facturaPCI.upsert({
      where: { numero: f.numero },
      update: datosF,
      create: { numero: f.numero, ...datosF },
    })
    resumen.facturas++
  }

  console.log('Carga completada:')
  console.log(`  Edificios procesados : ${resumen.edificios} (${resumen.edificiosNuevos} creados)`)
  console.log(`  Revisiones           : ${resumen.revisiones}`)
  console.log(`  Hallazgos            : ${resumen.hallazgos}`)
  console.log(`  Presupuestos         : ${resumen.presupuestos}`)
  console.log(`  Acciones correctivas : ${resumen.acciones}`)
  console.log(`  Facturas             : ${resumen.facturas}`)
}

main()
  .catch(e => { console.error('Error en la carga:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
