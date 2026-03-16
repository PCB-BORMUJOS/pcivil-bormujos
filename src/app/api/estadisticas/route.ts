// @ts-ignore
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const mes = searchParams.get('mes') // null = todo el año, '0'-'11' = mes específico

    const fechaInicio = mes !== null
      ? new Date(year, parseInt(mes), 1)
      : new Date(year, 0, 1)
    const fechaFin = mes !== null
      ? new Date(year, parseInt(mes) + 1, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59)

    const mesAnioPatterns = mes !== null
      ? [`${year}-${String(parseInt(mes) + 1).padStart(2, '0')}`]
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

    const [
      todosVoluntarios,
      guardias,
      dietas,
      eventos,
      formaciones,
      vehiculos,
      mantenimientos,
      peticionesLog,
      partesPSI,
      informesDietas,
      movimientosCaja,
      partidas,
    ] = await Promise.all([
      prisma.usuario.findMany({
        include: {
          fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true, fechaAlta: true, kmDesplazamiento: true, categoria: true } },
          rol: { select: { nombre: true } },
        },
        orderBy: [{ numeroVoluntario: 'asc' }]
      }),
      prisma.guardia.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: {
          usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true, fichaVoluntario: { select: { areaAsignada: true } } } }
        },
        orderBy: { fecha: 'asc' }
      }),
      prisma.dieta.findMany({
        where: { mesAnio: { in: mesAnioPatterns } },
        include: {
          usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true, fichaVoluntario: { select: { areaAsignada: true } } } }
        },
        orderBy: { fecha: 'asc' }
      }),
      prisma.evento.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { participantes: { select: { id: true } } },
        orderBy: { fecha: 'asc' }
      }),
      prisma.convocatoria.findMany({
        where: { fechaInicio: { gte: fechaInicio, lte: fechaFin } },
        include: { curso: { select: { nombre: true, tipo: true, duracionHoras: true } }, inscripciones: { select: { id: true, estado: true } } },
        orderBy: { fechaInicio: 'asc' }
      }).catch(() => []),
      prisma.vehiculo.findMany({
        include: { mantenimientos: { where: { fecha: { gte: fechaInicio, lte: fechaFin } } } }
      }),
      prisma.mantenimientoVehiculo.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        include: { vehiculo: { select: { indicativo: true, matricula: true } } }
      }).catch(() => []),
      prisma.peticionMaterial.findMany({
        where: { fechaSolicitud: { gte: fechaInicio, lte: fechaFin } },
        include: { solicitante: { select: { nombre: true, apellidos: true } } },
        orderBy: { fechaSolicitud: 'asc' }
      }),
      prisma.partePSI.findMany({
        where: { createdAt: { gte: fechaInicio, lte: fechaFin } },
        orderBy: { createdAt: 'asc' }
      }).catch(() => []),
      prisma.informeDietas.findMany({
        where: { mes: { in: mesAnioPatterns } },
        include: { partida: true }
      }).catch(() => []),
      prisma.movimientoCaja.findMany({
        where: { fecha: { gte: fechaInicio, lte: fechaFin } },
        orderBy: { fecha: 'asc' }
      }).catch(() => []),
      prisma.partidaPresupuestaria.findMany({
        where: { presupuesto: { ejercicio: year } },
        include: { presupuesto: { select: { ejercicio: true, denominacion: true } } },
        orderBy: { codigo: 'asc' }
      }).catch(() => []),
    ])

    // ── Cálculos derivados ──────────────────────────────────────────────────

    const HORAS: Record<string, number> = { 'mañana': 6, 'tarde': 5, 'noche': 9 }

    // Guardias por mes
    const guardiasPorMes = Array.from({ length: 12 }, (_, i) => {
      const gm = guardias.filter((g: any) => new Date(g.fecha).getMonth() === i)
      return {
        mes: i,
        mañana: gm.filter((g: any) => g.turno === 'mañana').length,
        tarde: gm.filter((g: any) => g.turno === 'tarde').length,
        noche: gm.filter((g: any) => g.turno === 'noche').length,
        total: gm.length,
        horas: gm.reduce((a: number, g: any) => a + (HORAS[g.turno] || 0), 0),
      }
    })

    // Por voluntario
    const statsVoluntarios = todosVoluntarios.map(v => {
      const gv = guardias.filter((g: any) => g.usuarioId === v.id)
      const dv = dietas.filter((d: any) => d.usuarioId === v.id)
      const horas = gv.reduce((a, g) => a + (HORAS[g.turno] || 0), 0)
      const importeDietas = dv.reduce((a, d) => a + Number(d.totalDieta || 0), 0)
      const km = dv.reduce((a, d) => a + Number(d.kilometros || 0), 0)
      return {
        id: v.id,
        numeroVoluntario: v.numeroVoluntario,
        nombre: v.nombre,
        apellidos: v.apellidos,
        activo: v.activo,
        area: v.fichaVoluntario?.areaAsignada || 'Sin área',
        areaSecundaria: v.fichaVoluntario?.areaSecundaria || null,
        categoria: v.fichaVoluntario?.categoria || 'VOLUNTARIO',
        rol: v.rol?.nombre || 'voluntario',
        guardias: gv.length,
        guardiasMañana: gv.filter(g => g.turno === 'mañana').length,
        guardiasTarde: gv.filter(g => g.turno === 'tarde').length,
        guardiasNoche: gv.filter(g => g.turno === 'noche').length,
        horas,
        importeDietas,
        km,
        diasServicio: dv.length,
      }
    }).sort((a, b) => b.guardias - a.guardias)

    // Por área
    const areasMap: Record<string, { guardias: number, horas: number, voluntarios: number }> = {}
    statsVoluntarios.forEach(v => {
      const a = v.area
      if (!areasMap[a]) areasMap[a] = { guardias: 0, horas: 0, voluntarios: 0 }
      areasMap[a].guardias += v.guardias
      areasMap[a].horas += v.horas
      areasMap[a].voluntarios++
    })
    const statsPorArea = Object.entries(areasMap).map(([area, s]) => ({ area, ...s })).sort((a, b) => b.guardias - a.guardias)

    // Dietas por mes
    const dietasPorMes = Array.from({ length: 12 }, (_, i) => {
      const dm = dietas.filter(d => {
        const [y, m] = (d.mesAnio || '').split('-').map(Number)
        return m === i + 1 && y === year
      })
      return {
        mes: i,
        importe: dm.reduce((a, d) => a + Number(d.totalDieta || 0), 0),
        importeKm: dm.reduce((a, d) => a + Number(d.subtotalKm || 0), 0),
        dias: dm.length,
      }
    })

    // Eventos por tipo/mes
    const eventosPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: i,
      total: eventos.filter(e => new Date(e.fecha).getMonth() === i).length,
    }))
    const eventosTipo: Record<string, number> = {}
    eventos.forEach(e => { const t = e.tipo || 'otros'; eventosTipo[t] = (eventosTipo[t] || 0) + 1 })

    // Mantenimientos por vehículo
    const statsVehiculos = vehiculos.map(v => ({
      id: v.id,
      indicativo: v.indicativo,
      matricula: v.matricula,
      marca: v.marca,
      modelo: v.modelo,
      estado: v.estado,
      mantenimientos: v.mantenimientos.length,
      costeMant: v.mantenimientos.reduce((a: number, m: any) => a + Number(m.coste || 0), 0),
    }))

    // Formación
    const statsFormacion = formaciones.map((f: any) => ({
      id: f.id,
      nombre: f.curso?.nombre || 'Sin nombre',
      categoria: f.curso?.categoria || '',
      horas: f.curso?.horas || 0,
      fechaInicio: f.fechaInicio,
      plazasDisponibles: f.plazasDisponibles || 0,
      plazasOcupadas: f.plazasOcupadas || 0,
      inscritos: f.inscripciones?.length || 0,
      estado: f.estado,
    }))

    // Caja
    const ingresos = movimientosCaja.filter((m: any) => m.tipo === 'ingreso').reduce((a: number, m: any) => a + Number(m.importe || 0), 0)
    const gastos = movimientosCaja.filter((m: any) => m.tipo === 'gasto').reduce((a: number, m: any) => a + Number(m.importe || 0), 0)
    const cajaPorMes = Array.from({ length: 12 }, (_, i) => {
      const cm = movimientosCaja.filter((m: any) => new Date(m.fecha).getMonth() === i)
      return {
        mes: i,
        ingresos: cm.filter((m: any) => m.tipo === 'ingreso').reduce((a: number, m: any) => a + Number(m.importe || 0), 0),
        gastos: cm.filter((m: any) => m.tipo === 'gasto').reduce((a: number, m: any) => a + Number(m.importe || 0), 0),
      }
    })

    // Peticiones logística por mes
    const peticionesLog_mes = Array.from({ length: 12 }, (_, i) => ({
      mes: i,
      total: peticionesLog.filter(p => new Date(p.fechaSolicitud).getMonth() === i).length,
      aprobadas: peticionesLog.filter(p => new Date(p.fechaSolicitud).getMonth() === i && p.estado === 'aprobada').length,
    }))

    return NextResponse.json({
      periodo: { year, mes: mes ? parseInt(mes) : null, fechaInicio, fechaFin },
      resumen: {
        totalVoluntarios: todosVoluntarios.filter(v => v.activo).length,
        totalGuardias: guardias.length,
        totalHoras: guardias.reduce((a, g) => a + (HORAS[g.turno] || 0), 0),
        totalEventos: eventos.length,
        totalParticipaciones: eventos.reduce((a, e) => a + (e.participantes?.length || 0), 0),
        totalDietas: dietas.reduce((a, d) => a + Number(d.totalDieta || 0), 0),
        totalKm: dietas.reduce((a, d) => a + Number(d.kilometros || 0), 0),
        totalFormaciones: formaciones.length,
        totalPSI: partesPSI.length,
        totalPeticiones: peticionesLog.length,
        ingresos,
        gastos,
        saldo: ingresos - gastos,
      },
      guardiasPorMes,
      statsVoluntarios,
      statsPorArea,
      dietasPorMes,
      eventosPorMes,
      eventosTipo,
      statsVehiculos,
      statsFormacion,
      cajaPorMes,
      peticionesLog,
      peticionesLog_mes,
      partidas,
      informesDietas,
      partesPSI,
      movimientosCaja,
      diasServicio: dietas,
      todosVoluntarios,
      guardiasRaw: guardias,
      eventosRaw: eventos,
      formacionesRaw: formaciones,
      vehiculosRaw: vehiculos,
    })
  } catch (error) {
    console.error('Error estadísticas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
