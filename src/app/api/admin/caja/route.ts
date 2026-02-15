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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, tipo, concepto, descripcion, importe, categoria, fecha, adjuntoUrl, adjuntoNombre } = body

    if (!id || !concepto || !importe) {
      return NextResponse.json({ error: 'ID, concepto e importe son requeridos' }, { status: 400 })
    }

    // Obtener movimiento actual
    const movimientoActual = await prisma.movimientoCaja.findUnique({
      where: { id }
    })

    if (!movimientoActual) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    }

    // Calcular nuevo saldo
    const ultimo = await prisma.movimientoCaja.findFirst({
      where: { NOT: { id } },
      orderBy: { createdAt: 'desc' }
    })
    const saldoAnterior = ultimo ? Number(ultimo.saldoPosterior) : 0
    const importeNum = Number(importe)
    const saldoPosterior = tipo === 'entrada'
      ? saldoAnterior + importeNum
      : saldoAnterior - importeNum

    const movimiento = await prisma.movimientoCaja.update({
      where: { id },
      data: {
        tipo,
        concepto,
        descripcion,
        importe: importeNum,
        categoria,
        fecha: fecha ? new Date(fecha) : new Date(),
        saldoAnterior,
        saldoPosterior,
        adjuntoUrl,
        adjuntoNombre
      }
    })

    // Recalcular TODOS los saldos desde el principio
    const todosMovimientos = await prisma.movimientoCaja.findMany({
      orderBy: { createdAt: 'asc' }
    })

    let saldoActual = 0
    for (const m of todosMovimientos) {
      saldoActual = m.tipo === 'entrada'
        ? saldoActual + Number(m.importe)
        : saldoActual - Number(m.importe)

      await prisma.movimientoCaja.update({
        where: { id: m.id },
        data: {
          saldoAnterior: saldoActual - (m.tipo === 'entrada' ? Number(m.importe) : -Number(m.importe)),
          saldoPosterior: saldoActual
        }
      })
    }

    return NextResponse.json({ success: true, movimiento })
  } catch (error) {
    console.error('Error al actualizar movimiento:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    // Obtener movimiento a eliminar
    const movimientoEliminado = await prisma.movimientoCaja.findUnique({
      where: { id }
    })

    if (!movimientoEliminado) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    }

    // Eliminar movimiento
    await prisma.movimientoCaja.delete({
      where: { id }
    })

    // Recalcular todos los saldos desde el principio
    const movimientos = await prisma.movimientoCaja.findMany({
      orderBy: { createdAt: 'asc' }
    })

    let saldoActual = 0
    for (const m of movimientos) {
      saldoActual = m.tipo === 'entrada'
        ? saldoActual + Number(m.importe)
        : saldoActual - Number(m.importe)

      await prisma.movimientoCaja.update({
        where: { id: m.id },
        data: {
          saldoAnterior: saldoActual - (m.tipo === 'entrada' ? Number(m.importe) : -Number(m.importe)),
          saldoPosterior: saldoActual
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar movimiento:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}