import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') // formato: 2025-01

    if (!mes) {
      return NextResponse.json({ error: 'Mes requerido' }, { status: 400 })
    }

    // Obtener dietas del mes
    const dietas = await prisma.dieta.findMany({
      where: { mesAnio: mes },
      include: {
        usuario: {
          select: {
            numeroVoluntario: true,
            nombre: true,
            apellidos: true
          }
        }
      },
      orderBy: { fecha: 'asc' }
    })

    // Calcular resumen por voluntario
    const resumenMap = new Map<string, any>()
    
    dietas.forEach(d => {
      const key = d.usuarioId
      if (!resumenMap.has(key)) {
        resumenMap.set(key, {
          indicativo: d.usuario.numeroVoluntario,
          nombre: d.usuario.nombre,
          apellidos: d.usuario.apellidos,
          dias: 0,
          subtotalDietas: 0,
          subtotalKm: 0,
          totalDietas: 0
        })
      }
      const r = resumenMap.get(key)
      r.dias += 1
      r.subtotalDietas += Number(d.subtotalDietas)
      r.subtotalKm += Number(d.subtotalKm)
      r.totalDietas += Number(d.totalDieta)
    })

    const resumen = Array.from(resumenMap.values()).sort((a, b) => 
      (a.indicativo || '').localeCompare(b.indicativo || '')
    )

    return NextResponse.json({ dietas, resumen })
  } catch (error) {
    console.error('Error al obtener dietas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
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
        kilometros: kilometros || 0,
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