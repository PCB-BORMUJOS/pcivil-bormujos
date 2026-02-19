import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import logAudit from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const movimientos = await prisma.movimientoCaja.findMany({
      orderBy: { fecha: 'desc' },
      take: 100
    })

    // Calcular saldo actual correctamente sumando todas las entradas menos las salidas
    const todosMovimientos = await prisma.movimientoCaja.findMany({
      orderBy: { createdAt: 'asc' }
    })

    let saldoActual = 0
    for (const m of todosMovimientos) {
      if (m.tipo === 'entrada') {
        saldoActual += Number(m.importe)
      } else {
        saldoActual -= Number(m.importe)
      }
    }

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
    const { tipo, concepto, descripcion, importe, categoria, adjuntoUrl, adjuntoNombre, fecha } = body

    if (!concepto || !importe) {
      return NextResponse.json({ error: 'Concepto e importe son requeridos' }, { status: 400 })
    }

    // Calcular saldo actual correctamente
    const todosMovimientos = await prisma.movimientoCaja.findMany()
    let saldoAnterior = 0
    for (const m of todosMovimientos) {
      if (m.tipo === 'entrada') {
        saldoAnterior += Number(m.importe)
      } else {
        saldoAnterior -= Number(m.importe)
      }
    }

    const importeNum = Number(importe)
    const saldoPosterior = tipo === 'entrada'
      ? saldoAnterior + importeNum
      : saldoAnterior - importeNum

    const movimiento = await prisma.movimientoCaja.create({
      data: {
        fecha: fecha ? new Date(fecha) : new Date(),
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

    // Registrar en auditoría
    await logAudit(request, 'CREATE', 'Caja', {
      entidadId: movimiento.id,
      datosNuevos: { tipo, concepto, descripcion, importe: importeNum, categoria },
      descripcion: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${importeNum}€ - ${concepto}`,
      modulo: 'Administración'
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

    const importeNum = Number(importe)

    // Recalcular TODOS los saldos desde el principio
    const todosMovimientos = await prisma.movimientoCaja.findMany({
      orderBy: { createdAt: 'asc' }
    })

    let saldoActual = 0
    for (const m of todosMovimientos) {
      const esMovimientoActual = m.id === id
      const mTipo = esMovimientoActual ? tipo : m.tipo
      const mImporte = esMovimientoActual ? importeNum : Number(m.importe)

      const saldoAnterior = saldoActual

      if (mTipo === 'entrada') {
        saldoActual += mImporte
      } else {
        saldoActual -= mImporte
      }

      await prisma.movimientoCaja.update({
        where: { id: m.id },
        data: {
          saldoAnterior,
          saldoPosterior: saldoActual,
          tipo: esMovimientoActual ? tipo : m.tipo,
          concepto: esMovimientoActual ? concepto : m.concepto,
          descripcion: esMovimientoActual ? descripcion : m.descripcion,
          importe: esMovimientoActual ? importeNum : Number(m.importe),
          categoria: esMovimientoActual ? categoria : m.categoria,
          fecha: esMovimientoActual && fecha ? new Date(fecha) : (esMovimientoActual ? new Date() : m.fecha),
          adjuntoUrl: esMovimientoActual ? adjuntoUrl : m.adjuntoUrl,
          adjuntoNombre: esMovimientoActual ? adjuntoNombre : m.adjuntoNombre
        }
      })
    }

    const movimientoActualizado = await prisma.movimientoCaja.findUnique({
      where: { id }
    })

    return NextResponse.json({ success: true, movimiento: movimientoActualizado })
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
      const saldoAnterior = saldoActual

      if (m.tipo === 'entrada') {
        saldoActual += Number(m.importe)
      } else {
        saldoActual -= Number(m.importe)
      }

      await prisma.movimientoCaja.update({
        where: { id: m.id },
        data: {
          saldoAnterior,
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