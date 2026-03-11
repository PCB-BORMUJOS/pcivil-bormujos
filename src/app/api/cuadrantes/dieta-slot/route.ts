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

    const tramo = [...baremo].reverse().find(t => horas >= (t.horasMin ?? t.minHours ?? 0))
    const importeDia = tramo?.importe ?? tramo?.amount ?? 0

    const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId } })
    const kmIda = Number(ficha?.kmDesplazamiento ?? 0)
    const kilometros = kmIda * 2
    const subtotalKm = parseFloat((kilometros * precioKm).toFixed(2))
    const totalDieta = parseFloat((importeDia + subtotalKm).toFixed(2))

    const fechaDate = new Date(fecha + 'T12:00:00.000Z')
    const inicioDia = new Date(fecha + 'T00:00:00.000Z')
    const finDia = new Date(fecha + 'T23:59:59.999Z')
    const mesAnio = fechaDate.toISOString().slice(0, 7)

    const guardia = await prisma.guardia.findFirst({
      where: { usuarioId, fecha: { gte: inicioDia, lte: finDia }, turno }
    })

    await prisma.dieta.deleteMany({
      where: { usuarioId, fecha: { gte: inicioDia, lte: finDia } }
    })

    const dieta = await prisma.dieta.create({
      data: {
        usuarioId,
        guardiaId: guardia?.id ?? null,
        fecha: fechaDate,
        turno,
        horasTrabajadas: horas,
        importeDia,
        subtotalDietas: importeDia,
        kilometros,
        importeKm: precioKm,
        subtotalKm,
        totalDieta,
        mesAnio,
        estado: 'pendiente',
        notas: `${horas}h - ${turno}`,
      }
    })

    return NextResponse.json({ ok: true, dieta })
  } catch (error) {
    console.error('Error dieta-slot:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
