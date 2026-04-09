import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const [totalPracticas, totalRegistros, registrosPendientes] = await Promise.all([
      prisma.practica.count({ where: { activa: true } }),
      prisma.registroPractica.count(),
      prisma.registroPractica.count({ where: { resultado: 'pendiente_jefe' } }),
    ])

    const practicasConRegistro = await prisma.registroPractica.findMany({
      select: { practicaId: true }, distinct: ['practicaId']
    })
    const idsConRegistro = new Set(practicasConRegistro.map(r => r.practicaId))
    const todasPracticas = await prisma.practica.findMany({
      where: { activa: true }, select: { id: true, titulo: true, numero: true, familia: true }
    })
    const practicasSinRealizar = todasPracticas.filter(p => !idsConRegistro.has(p.id))

    const coberturaFamilia = todasPracticas.reduce((acc: any, p) => {
      if (!acc[p.familia]) acc[p.familia] = { total: 0, realizadas: 0 }
      acc[p.familia].total++
      if (idsConRegistro.has(p.id)) acc[p.familia].realizadas++
      return acc
    }, {})

    const registrosRecientes = await prisma.registroPractica.findMany({
      take: 20,
      orderBy: { fecha: 'desc' },
      include: {
        practica: { select: { titulo: true, numero: true, familia: true } },
        responsable: { select: { nombre: true, apellidos: true, numeroVoluntario: true } }
      }
    })

    return NextResponse.json({
      totalPracticas,
      totalRegistros,
      registrosPendientes,
      practicasSinRealizar: practicasSinRealizar.length,
      coberturaGlobal: todasPracticas.length > 0
        ? Math.round((idsConRegistro.size / todasPracticas.length) * 100) : 0,
      coberturaFamilia: Object.entries(coberturaFamilia).map(([familia, v]: any) => ({
        familia, total: v.total, realizadas: v.realizadas,
        pct: v.total > 0 ? Math.round((v.realizadas / v.total) * 100) : 0
      })),
      registrosRecientes,
      practicasSinRealizarLista: practicasSinRealizar.slice(0, 10)
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
