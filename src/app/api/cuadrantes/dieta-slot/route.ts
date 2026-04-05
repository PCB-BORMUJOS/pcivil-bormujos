import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { usuarioId, fecha, turno, horas } = await request.json()
    if (!usuarioId || !fecha || !turno || !horas) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    // Guard: voluntarios en prácticas NO generan dieta
    const fichaGuard = await prisma.fichaVoluntario.findUnique({
      where: { usuarioId },
      select: { enPracticas: true }
    })
    if (fichaGuard?.enPracticas) {
      return NextResponse.json({ ok: true, dieta: null, enPracticas: true })
    }

    const [configBaremo, configKm] = await Promise.all([
      prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } }),
      prisma.configuracion.findUnique({ where: { clave: 'precio_km' } }),
    ])

    const rawBaremo = configBaremo?.valor
    const baremo: any[] = rawBaremo
      ? (typeof rawBaremo === 'string' ? JSON.parse(rawBaremo) : rawBaremo as any[])
      : [{ minHours: 4, amount: 29.45 }, { minHours: 8, amount: 49.15 }, { minHours: 12, amount: 72.37 }]

    const rawKm = configKm?.valor
    const precioKm: number = rawKm
      ? ((typeof rawKm === 'string' ? JSON.parse(rawKm) : rawKm as any)?.precio ?? 0.19)
      : 0.19

    const fechaDate = new Date(fecha + 'T12:00:00.000Z')
    const inicioDia = new Date(fecha + 'T00:00:00.000Z')
    const finDia    = new Date(fecha + 'T23:59:59.999Z')
    const mesAnio   = fechaDate.toISOString().slice(0, 7)

    // Obtener horas de OTROS turnos del mismo día para acumular
    const dietasOtrosTurnos = await prisma.dieta.findMany({
      where: {
        usuarioId,
        fecha: { gte: inicioDia, lte: finDia },
        turno: { not: turno }
      },
      select: { horasTrabajadas: true, turno: true }
    })

    const horasOtrosTurnos = dietasOtrosTurnos.reduce(
      (sum, d) => sum + Number(d.horasTrabajadas), 0
    )
    // Total acumulado del día = horas anteriores + horas de este turno
    const horasTotalesDia = horasOtrosTurnos + horas

    // Baremo se calcula sobre el TOTAL del día
    const tramo = [...baremo].reverse().find(
      t => horasTotalesDia >= (t.horasMin ?? t.minHours ?? 0)
    )
    const importeDia = tramo?.importe ?? tramo?.amount ?? 0

    // Km se cuenta UNA sola vez por día (no duplicar si hay varios turnos)
    const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId } })
    const kmIda = Number(ficha?.kmDesplazamiento ?? 0)
    const kilomeroYaContado = dietasOtrosTurnos.length > 0
    const kilometros    = kilomeroYaContado ? 0 : kmIda * 2
    const subtotalKm    = parseFloat((kilometros * precioKm).toFixed(2))
    const totalDieta    = parseFloat((importeDia + subtotalKm).toFixed(2))

    // Si hay otros turnos, recalcular su importeDia a 0 (el importe correcto está en este turno)
    // porque el baremo se recalcula con el nuevo total
    if (dietasOtrosTurnos.length > 0) {
      // Actualizar las dietas de otros turnos: importeDia = 0, totalDieta = solo km si aplica
      // Primero eliminamos el importe del turno que ya tenía km
      const dietaConKm = await prisma.dieta.findFirst({
        where: {
          usuarioId,
          fecha: { gte: inicioDia, lte: finDia },
          turno: { not: turno },
          kilometros: { gt: 0 }
        }
      })
      if (dietaConKm) {
        // Recalcular la dieta con km con importeDia=0 (el baremo va en el turno actual)
        const nuevoTotalAnterior = parseFloat((0 + Number(dietaConKm.subtotalKm)).toFixed(2))
        await prisma.dieta.update({
          where: { id: dietaConKm.id },
          data: { importeDia: 0, subtotalDietas: 0, totalDieta: nuevoTotalAnterior }
        })
      }
      // Otros turnos sin km: importeDia = 0
      await prisma.dieta.updateMany({
        where: {
          usuarioId,
          fecha: { gte: inicioDia, lte: finDia },
          turno: { not: turno },
          kilometros: 0
        },
        data: { importeDia: 0, subtotalDietas: 0, totalDieta: 0 }
      })
    }

    // Eliminar dieta de ESTE turno si existía (solo este turno, no el día entero)
    await prisma.dieta.deleteMany({
      where: {
        usuarioId,
        fecha: { gte: inicioDia, lte: finDia },
        turno
      }
    })

    const guardia = await prisma.guardia.findFirst({
      where: { usuarioId, fecha: { gte: inicioDia, lte: finDia }, turno }
    })

    // Desglose en notas para trazabilidad
    const desglose = [
      ...dietasOtrosTurnos.map(d => `${d.turno}:${d.horasTrabajadas}h`),
      `${turno}:${horas}h`
    ].join(' + ')

    const dieta = await prisma.dieta.create({
      data: {
        usuarioId,
        guardiaId:       guardia?.id ?? null,
        fecha:           fechaDate,
        turno,
        horasTrabajadas: horas,
        importeDia,
        subtotalDietas:  importeDia,
        kilometros,
        importeKm:       precioKm,
        subtotalKm,
        totalDieta,
        mesAnio,
        estado: 'pendiente',
        notas: `${horasTotalesDia}h día (${desglose}) - baremo ${importeDia}€`,
      }
    })

    return NextResponse.json({ ok: true, dieta })
  } catch (error) {
    console.error('Error dieta-slot:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
