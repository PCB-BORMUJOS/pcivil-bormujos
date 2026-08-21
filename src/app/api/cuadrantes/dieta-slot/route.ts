import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { safeJsonParse } from '@/lib/utils'
import { INDICATIVO_JEFE_SERVICIO, tramosJ44Desde } from '@/lib/dietas-j44'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { usuarioId, fecha, turno, horas, motivo } = await request.json()
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

    const [configBaremo, configKm, configJ44, fichaUsuario] = await Promise.all([
      prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } }),
      prisma.configuracion.findUnique({ where: { clave: 'precio_km' } }),
      prisma.configuracion.findUnique({ where: { clave: 'baremo_j44' } }),
      prisma.fichaVoluntario.findUnique({ where: { usuarioId }, select: { indicativo2: true } }),
    ])

    // El Jefe de Servicio (J-44) tiene su propio baremo por franja horaria.
    const esJefeServicio = fichaUsuario?.indicativo2 === INDICATIVO_JEFE_SERVICIO

    const rawBaremo = configBaremo?.valor
    const baremoGeneral: any[] = rawBaremo
      ? safeJsonParse(rawBaremo, [{ minHours: 4, amount: 29.45 }, { minHours: 8, amount: 49.15 }, { minHours: 12, amount: 72.37 }])
      : [{ minHours: 4, amount: 29.45 }, { minHours: 8, amount: 49.15 }, { minHours: 12, amount: 72.37 }]
    const baremo: any[] = esJefeServicio ? tramosJ44Desde(configJ44?.valor) : baremoGeneral

    const rawKm = configKm?.valor
    const precioKm: number = rawKm
      ? (safeJsonParse<{ precio?: number }>(rawKm, {})?.precio ?? 0.19)
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

    // CADA TURNO se paga por SUS PROPIAS horas: mañana (5h) + tarde (5h) = dos
    // dietas de "más de 4h" (2×29,45), no una de "más de 8h". No se consolida por
    // el total del día. (Igual para el voluntariado y para el Jefe de Servicio.)
    const horasParaTramo = horas
    const tramo = [...baremo].reverse().find(
      t => horasParaTramo >= (t.horasMin ?? t.minHours ?? 0)
    )
    const importeDia = tramo?.importe ?? tramo?.amount ?? 0

    // Km se cuenta UNA sola vez por día (no duplicar si hay varios turnos)
    const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId }, select: { kmDesplazamiento: true } })
    const kmIda = Number(ficha?.kmDesplazamiento ?? 0)
    const kilomeroYaContado = dietasOtrosTurnos.length > 0
    const kilometros    = kilomeroYaContado ? 0 : kmIda * 2
    // Redondeo en céntimos para evitar acumulación de errores de punto flotante
    const subtotalKm    = Math.round(kilometros * precioKm * 100) / 100
    const totalDieta    = Math.round((importeDia + subtotalKm) * 100) / 100

    // Cada turno conserva su propio importe (ya no se consolida a 0). El único
    // ajuste por día es el kilometraje, que se cuenta una sola vez (ver arriba).

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

    // Sellar las horas forzadas en la propia guardia: así el tramo (+8h/+12h)
    // viaja con ella y no se pierde si el cuadrante se guarda o se reasigna.
    if (guardia && Number(guardia.horasTurno ?? 0) !== horas) {
      await prisma.guardia.update({ where: { id: guardia.id }, data: { horasTurno: horas } })
    }

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
        notas: `${horas}h (${turno}) - baremo ${importeDia}€ · día: ${horasTotalesDia}h (${desglose})`,
        motivoExtra: (horas >= 8 && typeof motivo === 'string' && motivo.trim()) ? motivo.trim() : null,
      }
    })

    return NextResponse.json({ ok: true, dieta })
  } catch (error) {
    console.error('Error dieta-slot:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
