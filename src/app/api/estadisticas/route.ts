import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rol = (session.user as any).rol as string ?? 'voluntario'
    if (!['superadmin', 'coordinador', 'admin'].includes(rol)) {
      return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const mes = searchParams.get('mes')

    const fechaInicio = mes !== null ? new Date(year, parseInt(mes), 1) : new Date(year, 0, 1)
    const fechaFin    = mes !== null ? new Date(year, parseInt(mes) + 1, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59)
    const mesAnioPatterns = mes !== null
      ? [`${year}-${String(parseInt(mes) + 1).padStart(2, "0")}`]
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)

    const HORAS: Record<string, number> = { "manana": 6, "mañana": 6, "tarde": 5, "noche": 9 }
    const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

    const [
      todosVoluntarios, guardias, dietas, eventos, formaciones,
      vehiculos, mantenimientos, peticionesLog, partesPSI,
      movimientosCaja, partidas, articulos, drones, vuelos,
      asignaciones, repostajes, ticketsCombustible, incidenciasCecopal, pilotosDrone,
    ] = await Promise.all([
      prisma.usuario.findMany({
        include: {
          fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true, fechaAlta: true, kmDesplazamiento: true, categoria: true } },
          rol: { select: { nombre: true } },
        },
        orderBy: [{ numeroVoluntario: "asc" }]
      }),
      prisma.guardia.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true, fichaVoluntario: { select: { areaAsignada: true } } } } },
        orderBy: { fecha: "asc" }
      }),
      prisma.dieta.findMany({
        where: { mesAnio: { in: mesAnioPatterns } },
        include: { usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true, fichaVoluntario: { select: { areaAsignada: true } } } } },
        orderBy: { fecha: "asc" }
      }),
      prisma.evento.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { participantes: { select: { id: true } } },
        orderBy: { fecha: "asc" }
      }),
      prisma.convocatoria.findMany({
        where: { fechaInicio: { gte: fechaInicio, lte: fechaFin } },
        include: { curso: { select: { nombre: true, tipo: true, duracionHoras: true } }, inscripciones: { select: { id: true, estado: true } } },
        orderBy: { fechaInicio: "asc" }
      }).catch(() => []),
      prisma.vehiculo.findMany({
        include: { mantenimientos: { where: { fecha: { gte: fechaInicio, lte: fechaFin } } } }
      }),
      prisma.mantenimientoVehiculo.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { vehiculo: { select: { id: true, indicativo: true, matricula: true } } }
      }).catch(() => []),
      prisma.peticionMaterial.findMany({
        where: { fechaSolicitud: { gte: fechaInicio, lte: fechaFin } },
        include: { solicitante: { select: { nombre: true, apellidos: true } } },
        orderBy: { fechaSolicitud: "asc" }
      }),
      prisma.partePSI.findMany({
        where: { createdAt: { gte: fechaInicio, lte: fechaFin } },
        orderBy: { createdAt: "asc" }
      }).catch(() => []),
      prisma.movimientoCaja.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        orderBy: { fecha: "asc" }
      }).catch(() => []),
      prisma.partidaPresupuestaria.findMany({
        where: { presupuesto: { ejercicio: year } },
        include: { presupuesto: { select: { ejercicio: true, denominacion: true } } },
        orderBy: { codigo: "asc" }
      }).catch(() => []),
      prisma.articulo.findMany({
        include: { familia: { include: { categoria: { select: { nombre: true, slug: true, color: true } } } } },
        where: { activo: true }
      }).catch(() => []),
      prisma.drone.findMany().catch(() => []),
      prisma.vuelo.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { drone: { select: { codigo: true, modelo: true } }, piloto: { select: { nombre: true, apellidos: true } } }
      }).catch(() => []),
      // Asignaciones de vehículos (movimientos con conductor)
      prisma.vehiculoAsignacion.findMany({
        where: { fechaInicio: { gte: fechaInicio, lte: fechaFin } },
        include: {
          vehiculo: { select: { id: true, indicativo: true, matricula: true, marca: true, modelo: true } },
          usuario: { select: { nombre: true, apellidos: true, numeroVoluntario: true } }
        },
        orderBy: { fechaInicio: 'desc' }
      }).catch(() => []),
      // Repostajes directos registrados en vehículos
      prisma.repostajeVehiculo.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { vehiculo: { select: { id: true, indicativo: true, matricula: true } } },
        orderBy: { fecha: 'desc' }
      }).catch(() => []),
      // Tickets combustible SOLRED (administración)
      prisma.ticketCombustible.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        orderBy: { fecha: 'desc' }
      }).catch(() => []),
      // Incidencias CECOPAL
      prisma.incidenciaCecopal.findMany({
        where: { createdAt: { gte: fechaInicio, lte: fechaFin } },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []),
      // Pilotos con sus vuelos del período
      prisma.pilotoDrone.findMany({
        include: { vuelos: { where: { fecha: { gte: fechaInicio, lte: fechaFin } }, select: { duracionMinutos: true } } }
      }).catch(() => []),
    ])

    // ── Recordatorios de disponibilidad por voluntario ──────────────────────────
    const recordatoriosRaw = await prisma.auditLog.groupBy({
      by: ['usuarioId'],
      where: { accion: 'RECORDATORIO', entidad: 'Disponibilidad' },
      _count: { id: true },
      _max: { createdAt: true },
    }).catch(() => [])
    const recordatoriosMap: Record<string, { count: number; ultimo: Date | null }> = {}
    ;(recordatoriosRaw as any[]).forEach(r => {
      if (r.usuarioId) recordatoriosMap[r.usuarioId] = { count: r._count.id, ultimo: r._max.createdAt }
    })

    // ── Guardias por mes ──────────────────────────────────────────────────────
    const guardiasPorMes = Array.from({ length: 12 }, (_, i) => {
      const gm = (guardias as any[]).filter(g => new Date(g.fecha).getMonth() === i)
      return {
        mes: MESES_ES[i], mesIdx: i,
        manana: gm.filter(g => g.turno === "mañana").length,
        tarde:  gm.filter(g => g.turno === "tarde").length,
        noche:  gm.filter(g => g.turno === "noche").length,
        total:  gm.length,
        horas:  gm.reduce((a: number, g: any) => a + (HORAS[g.turno] || 0), 0),
      }
    })

    // ── Guardias por rol ──────────────────────────────────────────────────────
    const guardiasPorRol: Record<string, number> = {}
    ;(guardias as any[]).forEach(g => {
      const r = g.rol || 'Sin rol asignado'
      guardiasPorRol[r] = (guardiasPorRol[r] || 0) + 1
    })

    // ── Stats por voluntario ──────────────────────────────────────────────────
    const statsVoluntarios = todosVoluntarios.map(v => {
      const gv = (guardias as any[]).filter(g => g.usuarioId === v.id)
      const dv = (dietas as any[]).filter(d => d.usuarioId === v.id)
      const horas = gv.reduce((a: number, g: any) => a + (HORAS[g.turno] || 0), 0)
      return {
        id: v.id,
        numeroVoluntario: v.numeroVoluntario,
        nombre: v.nombre,
        apellidos: v.apellidos,
        activo: v.activo,
        area: (v.fichaVoluntario as any)?.areaAsignada || "Sin área",
        categoria: (v.fichaVoluntario as any)?.categoria || "VOLUNTARIO",
        rol: (v.rol as any)?.nombre || "voluntario",
        guardias: gv.length,
        guardiasMañana: gv.filter(g => g.turno === "mañana").length,
        guardiasTarde:  gv.filter(g => g.turno === "tarde").length,
        guardiasNoche:  gv.filter(g => g.turno === "noche").length,
        horas,
        importeDietas: dv.reduce((a: number, d: any) => a + Number(d.totalDieta || 0), 0),
        km: dv.reduce((a: number, d: any) => a + Number(d.kilometros || 0), 0),
        diasServicio: dv.length,
        recordatorios: (recordatoriosMap[v.id]?.count) || 0,
        ultimoRecordatorio: recordatoriosMap[v.id]?.ultimo || null,
      }
    }).sort((a, b) => b.guardias - a.guardias)

    // ── Stats por área ────────────────────────────────────────────────────────
    const areasMap: Record<string, { guardias: number; horas: number; voluntarios: number }> = {}
    statsVoluntarios.forEach(v => {
      const a = v.area
      if (!areasMap[a]) areasMap[a] = { guardias: 0, horas: 0, voluntarios: 0 }
      areasMap[a].guardias += v.guardias
      areasMap[a].horas += v.horas
      areasMap[a].voluntarios++
    })
    const statsPorArea = Object.entries(areasMap)
      .map(([area, s]) => ({ area, ...s }))
      .sort((a, b) => b.voluntarios - a.voluntarios)

    // ── Dietas por mes ────────────────────────────────────────────────────────
    const dietasPorMes = Array.from({ length: 12 }, (_, i) => {
      const dm = (dietas as any[]).filter(d => {
        const [y, m] = (d.mesAnio || "").split("-").map(Number)
        return m === i + 1 && y === year
      })
      return {
        mes: MESES_ES[i],
        importe:   dm.reduce((a: number, d: any) => a + Number(d.totalDieta || 0), 0),
        importeKm: dm.reduce((a: number, d: any) => a + Number(d.subtotalKm || 0), 0),
        dias: dm.length,
      }
    })

    // ── Eventos ───────────────────────────────────────────────────────────────
    const eventosPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES_ES[i],
      total: (eventos as any[]).filter(e => new Date(e.fecha).getMonth() === i).length,
    }))
    const eventosTipo: Record<string, number> = {}
    ;(eventos as any[]).forEach(e => { const t = e.tipo || "otros"; eventosTipo[t] = (eventosTipo[t] || 0) + 1 })

    // ── Formación ─────────────────────────────────────────────────────────────
    const formacionEstados: Record<string, number> = {}
    ;(formaciones as any[]).forEach(f => { const e = f.estado || "desconocido"; formacionEstados[e] = (formacionEstados[e] || 0) + 1 })
    const statsFormacion = {
      total: formaciones.length,
      porEstado: formacionEstados,
      lista: (formaciones as any[]).map(f => ({
        id: f.id,
        nombre: f.curso?.nombre || "Sin nombre",
        tipo: f.curso?.tipo || "",
        horas: f.curso?.duracionHoras || 0,
        fechaInicio: f.fechaInicio,
        plazasDisponibles: f.plazasDisponibles || 0,
        plazasOcupadas: f.plazasOcupadas || 0,
        inscritos: f.inscripciones?.length || 0,
        estado: f.estado,
      }))
    }

    // ── Vehículos — estado ────────────────────────────────────────────────────
    const vehEstados: Record<string, number> = {}
    ;(vehiculos as any[]).forEach(v => { const e = v.estado || "desconocido"; vehEstados[e] = (vehEstados[e] || 0) + 1 })
    const statsVehiculos = {
      total: vehiculos.length,
      porEstado: vehEstados,
      lista: (vehiculos as any[]).map(v => ({
        id: v.id,
        indicativo: v.indicativo,
        matricula: v.matricula,
        marca: v.marca,
        modelo: v.modelo,
        estado: v.estado,
        kmActual: v.kmActual || 0,
        mantenimientos: v.mantenimientos?.length || 0,
        costeMant: (v.mantenimientos || []).reduce((a: number, m: any) => a + Number(m.coste || 0), 0),
      })),
      mantenimientoPorMes: Array.from({ length: 12 }, (_, i) => ({
        mes: MESES_ES[i],
        total: (mantenimientos as any[]).filter(m => new Date(m.fecha).getMonth() === i).length,
        coste: (mantenimientos as any[]).filter(m => new Date(m.fecha).getMonth() === i)
          .reduce((a: number, m: any) => a + Number(m.coste || 0), 0),
      }))
    }

    // ── Asignaciones (movimientos de vehículos) por mes ───────────────────────
    const asignacionesPorMes = Array.from({ length: 12 }, (_, i) => {
      const am = (asignaciones as any[]).filter(a => new Date(a.fechaInicio).getMonth() === i)
      const km = am.reduce((acc: number, a: any) =>
        (a.kmFin && a.kmInicio) ? acc + (a.kmFin - a.kmInicio) : acc, 0)
      return { mes: MESES_ES[i], salidas: am.length, km }
    })

    // ── Combustible por mes (repostajes + tickets SOLRED) ─────────────────────
    const combustiblePorMes = Array.from({ length: 12 }, (_, i) => {
      const rm = (repostajes as any[]).filter(r => new Date(r.fecha).getMonth() === i)
      const tc = (ticketsCombustible as any[]).filter(t => new Date(t.fecha).getMonth() === i)
      const litros = rm.reduce((a: number, r: any) => a + Number(r.litros || 0), 0) +
                     tc.reduce((a: number, t: any) => a + Number(t.litros || 0), 0)
      const coste  = rm.reduce((a: number, r: any) => a + Number(r.costeTotal || 0), 0) +
                     tc.reduce((a: number, t: any) => a + Number(t.importeFinal || 0), 0)
      return { mes: MESES_ES[i], litros: +litros.toFixed(1), coste: +coste.toFixed(2) }
    })

    // ── Mantenimiento por tipo ────────────────────────────────────────────────
    const mantPorTipoMap: Record<string, number> = {}
    ;(mantenimientos as any[]).forEach(m => {
      const t = m.tipo || 'otros'
      mantPorTipoMap[t] = (mantPorTipoMap[t] || 0) + 1
    })
    const mantPorTipo = Object.entries(mantPorTipoMap).map(([name, value]) => ({ name, value }))

    // ── Stats extendidos por vehículo ─────────────────────────────────────────
    const ahora = new Date()
    const en90dias = new Date(ahora.getTime() + 90 * 24 * 60 * 60 * 1000)
    const statsVehiculosExt = (vehiculos as any[]).map(v => {
      const asig = (asignaciones as any[]).filter((a: any) => a.vehiculoId === v.id)
      const rep  = (repostajes as any[]).filter((r: any) => r.vehiculoId === v.id)
      const mant = (mantenimientos as any[]).filter((m: any) => m.vehiculoId === v.id)
      const kmRec = asig.reduce((a: number, x: any) =>
        (x.kmFin && x.kmInicio) ? a + (x.kmFin - x.kmInicio) : a, 0)
      return {
        id: v.id, indicativo: v.indicativo, matricula: v.matricula,
        marca: v.marca, modelo: v.modelo, estado: v.estado,
        kmActual: v.kmActual || 0,
        fechaItv: v.fechaItv, fechaSeguro: v.fechaSeguro,
        itvAlerta: v.fechaItv ? new Date(v.fechaItv) <= en90dias : false,
        seguroAlerta: v.fechaSeguro ? new Date(v.fechaSeguro) <= en90dias : false,
        salidas: asig.length,
        kmRecorridos: kmRec,
        litrosCombustible: +rep.reduce((a: number, r: any) => a + Number(r.litros || 0), 0).toFixed(1),
        costeCombustible: +rep.reduce((a: number, r: any) => a + Number(r.costeTotal || 0), 0).toFixed(2),
        numMantenimientos: mant.length,
        costeMant: mant.reduce((a: number, m: any) => a + Number(m.coste || 0), 0),
      }
    })

    // ── Totales combustible (todas las fuentes) ───────────────────────────────
    const totalLitros = +(
      (repostajes as any[]).reduce((a: number, r: any) => a + Number(r.litros || 0), 0) +
      (ticketsCombustible as any[]).reduce((a: number, t: any) => a + Number(t.litros || 0), 0)
    ).toFixed(1)
    const totalCosteCombustible = +(
      (repostajes as any[]).reduce((a: number, r: any) => a + Number(r.costeTotal || 0), 0) +
      (ticketsCombustible as any[]).reduce((a: number, t: any) => a + Number(t.importeFinal || 0), 0)
    ).toFixed(2)

    // ── CECOPAL ───────────────────────────────────────────────────────────────
    const cecopalPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES_ES[i],
      total: (incidenciasCecopal as any[]).filter(inc => new Date(inc.createdAt).getMonth() === i).length,
    }))
    const cecopalPorTipo: Record<string, number> = {}
    ;(incidenciasCecopal as any[]).forEach(inc => {
      const t = inc.tipo || 'otros'
      cecopalPorTipo[t] = (cecopalPorTipo[t] || 0) + 1
    })

    // ── Logística / Inventario ────────────────────────────────────────────────
    const stockPorArea: Record<string, { total: number; stockBajo: number; color: string; nombre: string }> = {}
    ;(articulos as any[]).forEach(a => {
      const slug   = a.familia?.categoria?.slug  || "sin-area"
      const nombre = a.familia?.categoria?.nombre || "Sin área"
      const color  = a.familia?.categoria?.color  || "#94a3b8"
      if (!stockPorArea[slug]) stockPorArea[slug] = { total: 0, stockBajo: 0, color, nombre }
      stockPorArea[slug].total++
      if (a.stockActual <= a.stockMinimo) stockPorArea[slug].stockBajo++
    })
    const peticionesEstados: Record<string, number> = {}
    ;(peticionesLog as any[]).forEach(p => { const e = p.estado || "desconocido"; peticionesEstados[e] = (peticionesEstados[e] || 0) + 1 })
    const peticionesPorArea: Record<string, number> = {}
    ;(peticionesLog as any[]).forEach(p => { const a = p.areaOrigen || "Sin área"; peticionesPorArea[a] = (peticionesPorArea[a] || 0) + 1 })
    const peticionesPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES_ES[i],
      total:    (peticionesLog as any[]).filter(p => new Date(p.fechaSolicitud).getMonth() === i).length,
      aprobadas:(peticionesLog as any[]).filter(p => new Date(p.fechaSolicitud).getMonth() === i && p.estado === "aprobada").length,
    }))

    // ── Drones ────────────────────────────────────────────────────────────────
    const droneEstados: Record<string, number> = {}
    ;(drones as any[]).forEach(d => { const e = d.estado || "desconocido"; droneEstados[e] = (droneEstados[e] || 0) + 1 })
    const vuelosPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes:   MESES_ES[i],
      total: (vuelos as any[]).filter(v => new Date(v.fecha).getMonth() === i).length,
      horas: +((vuelos as any[]).filter(v => new Date(v.fecha).getMonth() === i)
        .reduce((a: number, v: any) => a + Number(v.duracionMinutos || 0) / 60, 0)).toFixed(1),
    }))
    const statsPilotos = (pilotosDrone as any[]).map((p: any) => ({
      nombre: `${p.nombre} ${p.apellidos || ''}`.trim(),
      vuelos: (p.vuelos || []).length,
      horas:  +((p.vuelos || []).reduce((a: number, v: any) => a + Number(v.duracionMinutos || 0), 0) / 60).toFixed(1),
    })).sort((a: any, b: any) => b.vuelos - a.vuelos)

    // ── Caja ──────────────────────────────────────────────────────────────────
    const ingresos = (movimientosCaja as any[]).filter(m => m.tipo === "ingreso").reduce((a: number, m: any) => a + Number(m.importe || 0), 0)
    const gastos   = (movimientosCaja as any[]).filter(m => m.tipo === "gasto").reduce((a: number, m: any) => a + Number(m.importe || 0), 0)
    const cajaPorMes = Array.from({ length: 12 }, (_, i) => {
      const cm = (movimientosCaja as any[]).filter(m => new Date(m.fecha).getMonth() === i)
      return {
        mes:      MESES_ES[i],
        ingresos: cm.filter(m => m.tipo === "ingreso").reduce((a: number, m: any) => a + Number(m.importe || 0), 0),
        gastos:   cm.filter(m => m.tipo === "gasto").reduce((a: number, m: any) => a + Number(m.importe || 0), 0),
      }
    })

    return NextResponse.json({
      periodo: { year, mes: mes ? parseInt(mes) : null, fechaInicio, fechaFin },
      resumen: {
        totalVoluntarios:    todosVoluntarios.filter(v => v.activo).length,
        totalGuardias:       guardias.length,
        totalHoras:          (guardias as any[]).reduce((a: number, g: any) => a + (HORAS[g.turno] || 0), 0),
        totalEventos:        eventos.length,
        totalParticipaciones:(eventos as any[]).reduce((a: number, e: any) => a + (e.participantes?.length || 0), 0),
        totalDietas:         (dietas as any[]).reduce((a: number, d: any) => a + Number(d.totalDieta || 0), 0),
        totalKm:             (dietas as any[]).reduce((a: number, d: any) => a + Number(d.kilometros || 0), 0),
        totalFormaciones:    formaciones.length,
        totalPSI:            partesPSI.length,
        totalPeticiones:     peticionesLog.length,
        totalArticulos:      articulos.length,
        totalDrones:         drones.length,
        totalVuelos:         vuelos.length,
        totalCecopal:        incidenciasCecopal.length,
        totalSalidas:        asignaciones.length,
        ingresos, gastos, saldo: ingresos - gastos,
      },
      guardiasPorMes, guardiasPorRol,
      statsVoluntarios, statsPorArea, dietasPorMes,
      eventosPorMes, eventosTipo,
      statsFormacion,
      stockPorArea, peticionesEstados, peticionesPorArea, peticionesPorMes,
      statsVehiculos,
      asignacionesPorMes, combustiblePorMes, mantPorTipo,
      statsVehiculosExt, totalLitros, totalCosteCombustible,
      cecopalPorMes, cecopalPorTipo,
      droneEstados, vuelosPorMes, statsPilotos,
      cajaPorMes, partidas,
      peticionesLog, movimientosCaja, partesPSI,
      diasServicio: dietas, todosVoluntarios,
      guardiasRaw: guardias, eventosRaw: eventos,
      formacionesRaw: formaciones,
      vuelosRaw: vuelos, drones,
      asignacionesRaw: asignaciones,
    })
  } catch (error) {
    console.error("Error estadísticas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
