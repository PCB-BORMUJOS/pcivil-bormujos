import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const movimientos = await prisma.movimientoCaja.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Calcular saldo actual
    const ultimo = movimientos[0]
    const saldoActual = ultimo ? Number(ultimo.saldoPosterior) : 0

    return NextResponse.json({ movimientos, saldoActual })
  } catch (error) {
    console.error('Error al obtener caja:', error)
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
    const { tipo, concepto, descripcion, importe, categoria, adjuntoUrl, adjuntoNombre } = body

    if (!concepto || !importe) {
      return NextResponse.json({ error: 'Concepto e importe son requeridos' }, { status: 400 })
    }

    // Obtener último saldo
    const ultimo = await prisma.movimientoCaja.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    const saldoAnterior = ultimo ? Number(ultimo.saldoPosterior) : 0
    const importeNum = Number(importe)
    const saldoPosterior = tipo === 'entrada' 
      ? saldoAnterior + importeNum 
      : saldoAnterior - importeNum

    const movimiento = await prisma.movimientoCaja.create({
      data: {
        fecha: new Date(),
        tipo,
        concepto,
        descripcion,
        importe: importeNum,
        saldoAnterior,
        saldoPosterior,
        categoria,
        adjuntoUrl,
        adjuntoNombre,
        registradoPor: session.user.email
      }
    })

    return NextResponse.json({ success: true, movimiento })
  } catch (error) {
    console.error('Error al crear movimiento:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}