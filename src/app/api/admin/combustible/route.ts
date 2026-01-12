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
    const mes = searchParams.get('mes')

    const where = mes ? { mesAnio: mes } : {}

    const tickets = await prisma.ticketCombustible.findMany({
      where,
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error al obtener tickets:', error)
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
    const { 
      fecha, hora, estacion, numeroTarjeta, destino, concepto,
      litros, precioLitro, importeSinDto, descuento, importeFinal,
      vehiculoDestino, ticketUrl, ticketNombre, notas
    } = body

    if (!fecha || !destino || !concepto || !litros || !importeFinal) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const fechaObj = new Date(fecha)
    const mesAnio = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`

    const ticket = await prisma.ticketCombustible.create({
      data: {
        fecha: fechaObj,
        hora,
        estacion,
        numeroTarjeta: numeroTarjeta || '9724990031420621',
        destino,
        concepto,
        litros: Number(litros),
        precioLitro: Number(precioLitro),
        importeSinDto: Number(importeSinDto) || Number(importeFinal),
        descuento: Number(descuento) || 0,
        importeFinal: Number(importeFinal),
        vehiculoDestino,
        ticketUrl,
        ticketNombre,
        mesAnio,
        registradoPor: session.user.email,
        notas
      }
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Error al crear ticket:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}