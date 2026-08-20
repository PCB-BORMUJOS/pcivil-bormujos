import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const mes = searchParams.get('mes') // formato: 2025-01

    // GET informes de dietas
    if (tipo === 'informes') {
      const anio = searchParams.get('anio') || new Date().getFullYear().toString()
      const informes = await prisma.informeDietas.findMany({
        where: { mes: { startsWith: anio } },
        include: { partida: { select: { codigo: true, denominacion: true, importeAsignado: true, importeEjecutado: true } } },
        orderBy: { mes: 'desc' }
      })
      return NextResponse.json({ informes })
    }

    if (!mes) {
      return NextResponse.json({ error: 'Mes requerido' }, { status: 400 })
    }

    // Obtener dietas del mes
    const dietasRaw = await prisma.dieta.findMany({
      where: { mesAnio: mes },
      include: {
        usuario: {
          select: {
            numeroVoluntario: true,
            nombre: true,
            apellidos: true,
            fichaVoluntario: { select: { indicativo2: true } }
          }
        }
      },
      orderBy: { fecha: 'asc' }
    })

    // El Jefe de Servicio (J-44) se separa POR COMPLETO del resto de indicativos:
    // liquidación e informe independientes, visibles solo para superadmin.
    const esJefeServicio = (d: any) => d.usuario?.fichaVoluntario?.indicativo2 === 'J-44'
    const dietasResto = dietasRaw.filter(d => !esJefeServicio(d))
    const dietasJ44 = rol === 'superadmin' ? dietasRaw.filter(esJefeServicio) : []

    // Baremo por tramos (+4h/+8h/+12h) para desglosar los días por franja horaria
    // y así justificar por qué, a igualdad de días y sin km, los importes difieren.
    const baremoCfg = await prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } })
    let rawBaremo: any = baremoCfg?.valor
    if (typeof rawBaremo === 'string') { try { rawBaremo = JSON.parse(rawBaremo) } catch { rawBaremo = null } }
    const arrBaremo: any[] = Array.isArray(rawBaremo)
      ? rawBaremo
      : (rawBaremo && Array.isArray(rawBaremo.tramos) ? rawBaremo.tramos : null)
        || [{ minHours: 4, amount: 29.45 }, { minHours: 8, amount: 49.15 }, { minHours: 12, amount: 72.37 }]
    const TRAMOS = arrBaremo
      .map((t: any) => ({ min: Number(t.horasMin ?? t.minHours ?? 0), amount: Number(t.importe ?? t.amount ?? 0) }))
      .sort((a, b) => a.min - b.min)
    // Tramo (por su hora mínima) más cercano a un importe dado.
    const tramoDeImporte = (amount: number) => {
      let best = TRAMOS[0], bd = Infinity
      for (const t of TRAMOS) { const dd = Math.abs(amount - t.amount); if (dd < bd) { bd = dd; best = t } }
      return best?.min ?? 0
    }
    const claveDia = (d: any) => `${d.usuarioId}|${new Date(d.fecha).toISOString().slice(0, 10)}`

    const construirResumen = (lista: any[]) => {
      // Importe "que paga" cada día (máximo del día): los turnos consolidados a 0
      // se atribuyen al tramo de su día para que el desglose sume el total de turnos.
      const maxImpDia = new Map<string, number>()
      lista.forEach(d => {
        const k = claveDia(d), imp = Number(d.subtotalDietas)
        maxImpDia.set(k, Math.max(maxImpDia.get(k) ?? 0, imp))
      })

      const map = new Map<string, any>()
      lista.forEach(d => {
        const key = d.usuarioId
        if (!map.has(key)) {
          map.set(key, {
            indicativo: d.usuario.numeroVoluntario,
            nombre: d.usuario.nombre,
            apellidos: d.usuario.apellidos,
            dias: 0, subtotalDietas: 0, subtotalKm: 0, totalDietas: 0,
            tramos: {} as Record<string, number>,
          })
        }
        const r = map.get(key)
        r.dias += 1
        r.subtotalDietas += Number(d.subtotalDietas)
        r.subtotalKm += Number(d.subtotalKm)
        r.totalDietas += Number(d.totalDieta)
        const imp = Number(d.subtotalDietas)
        const tramo = tramoDeImporte(imp > 0 ? imp : (maxImpDia.get(claveDia(d)) ?? 0))
        r.tramos[tramo] = (r.tramos[tramo] || 0) + 1
      })
      return Array.from(map.values()).sort((a, b) => (a.indicativo || '').localeCompare(b.indicativo || ''))
    }

    // Detalle día a día del Jefe de Servicio para su informe propio.
    // Orden: por fecha y, dentro del día, mañana antes que tarde.
    const ordenTurno = (t: string) => (t === 'mañana' || t === 'manana') ? 0 : t === 'tarde' ? 1 : 2
    // Fin de semana: la dieta se guarda a mediodía UTC, así que getUTCDay da el
    // día correcto (0 = domingo, 6 = sábado).
    const esFinDeSemana = (f: Date) => { const dow = new Date(f).getUTCDay(); return dow === 0 || dow === 6 }
    const detalleJ44 = dietasJ44
      .map(d => {
        const horas = Number(d.horasTrabajadas)
        const finde = esFinDeSemana(d.fecha)
        // Es extraordinario si supera las 8h (jornada extra) o si es fin de
        // semana (aunque sea de +4h): en J-44 el sábado y el domingo cuentan
        // como servicio extraordinario y llevan su propio motivo.
        const extra = horas >= 8 || finde
        return {
          id: d.id,
          fecha: d.fecha, turno: d.turno,
          horas,
          importeDia: Number(d.subtotalDietas),
          subtotalKm: Number(d.subtotalKm),
          total: Number(d.totalDieta),
          extra,
          finDeSemana: finde,
          motivo: (d as any).motivoExtra || null,
        }
      })
      .sort((a, b) => {
        const t = new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        return t !== 0 ? t : ordenTurno(a.turno) - ordenTurno(b.turno)
      })

    return NextResponse.json({
      dietas: dietasResto,
      resumen: construirResumen(dietasResto),
      resumenJ44: construirResumen(dietasJ44),
      detalleJ44,
      tramos: TRAMOS, // [{ min, amount }] para etiquetar el desglose +4h/+8h/+12h
    })
  } catch (error) {
    console.error('Error al obtener dietas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  // El motivo de las dietas de J-44 solo lo edita superadmin.
  if (rol !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }
  try {
    const { id, motivo } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const dieta = await prisma.dieta.update({
      where: { id },
      data: { motivoExtra: (typeof motivo === 'string' && motivo.trim()) ? motivo.trim() : null },
    })
    return NextResponse.json({ success: true, motivo: dieta.motivoExtra })
  } catch (error) {
    console.error('Error al guardar el motivo:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // POST crear informe mensual
    if (body.tipo === 'informe') {
      const { mes, fechaPresentacion, totalDietas, subtotalDietas, subtotalKm, numVoluntarios, numDias, partidaId, notas, firmadoPor } = body
      // Verificar que no existe ya un informe para este mes
      const existente = await prisma.informeDietas.findFirst({ where: { mes } })
      if (existente) {
        return NextResponse.json({ error: 'Ya existe un informe para este mes' }, { status: 400 })
      }
      const informe = await prisma.informeDietas.create({
        data: {
          mes,
          fechaPresentacion: new Date(fechaPresentacion),
          totalDietas: parseFloat(totalDietas),
          subtotalDietas: parseFloat(subtotalDietas),
          subtotalKm: parseFloat(subtotalKm),
          numVoluntarios: parseInt(numVoluntarios) || 0,
          numDias: parseInt(numDias) || 0,
          partidaId: partidaId || null,
          notas: notas || null,
          firmadoPor: firmadoPor || null,
          estado: 'presentado'
        }
      })
      // Actualizar importeEjecutado en la partida presupuestaria
      if (partidaId) {
        const partida = await prisma.partidaPresupuestaria.findUnique({ where: { id: partidaId } })
        if (partida) {
          await prisma.partidaPresupuestaria.update({
            where: { id: partidaId },
            data: { importeEjecutado: Number(partida.importeEjecutado) + parseFloat(totalDietas) }
          })
          // Recalcular totalAprobado del presupuesto padre
          const todasPartidas = await prisma.partidaPresupuestaria.findMany({ where: { presupuestoId: partida.presupuestoId } })
          const nuevoTotal = todasPartidas.reduce((s, p) => s + Number(p.importeAsignado), 0)
          await prisma.presupuestoAnual.update({ where: { id: partida.presupuestoId }, data: { totalAprobado: nuevoTotal } })
        }
      }
      const { usuarioId: uid, usuarioNombre: unom } = require('@/lib/audit').getUsuarioAudit ? { usuarioId: '', usuarioNombre: '' } : { usuarioId: '', usuarioNombre: '' }
      return NextResponse.json({ success: true, informe })
    }

    const { usuarioId, fecha, turno, horasTrabajadas, kilometros } = body

    const importeDia = 29.45
    const importeKm = 0.19
    const subtotalDietas = importeDia
    const subtotalKm = (kilometros || 0) * importeKm
    const totalDieta = subtotalDietas + subtotalKm

    const fechaObj = new Date(fecha)
    const mesAnio = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`

    const dieta = await prisma.dieta.create({
      data: {
        usuarioId,
        fecha: fechaObj,
        turno,
        horasTrabajadas: horasTrabajadas || 7,
        importeDia,
        subtotalDietas,
        kilometros: Number(kilometros || 0),
        importeKm,
        subtotalKm,
        totalDieta,
        mesAnio,
        estado: 'pendiente'
      }
    })

    return NextResponse.json({ success: true, dieta })
  } catch (error) {
    console.error('Error al crear dieta:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}