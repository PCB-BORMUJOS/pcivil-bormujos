import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const polizas = await prisma.poliza.findMany({
      orderBy: { fechaVencimiento: 'asc' }
    })

    return NextResponse.json({ polizas })
  } catch (error) {
    console.error('Error al obtener pólizas:', error)
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
    const { tipo, numero, compania, descripcion, fechaInicio, fechaVencimiento, primaAnual, vehiculoId, notas } = body

    if (!tipo || !compania || !fechaInicio || !fechaVencimiento) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const hoy = new Date()
    const vencimiento = new Date(fechaVencimiento)
    const estado = vencimiento < hoy ? 'vencida' : vencimiento < new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000) ? 'por_vencer' : 'vigente'

    const poliza = await prisma.poliza.create({
      data: {
        tipo,
        numero,
        compania,
        descripcion,
        fechaInicio: new Date(fechaInicio),
        fechaVencimiento: vencimiento,
        primaAnual: primaAnual ? Number(primaAnual) : null,
        estado,
        vehiculoId,
        notas
      }
    })

    return NextResponse.json({ success: true, poliza })
  } catch (error) {
    console.error('Error al crear póliza:', error)
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
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const hoy = new Date()
    const vencimiento = new Date(data.fechaVencimiento)
    const estado = vencimiento < hoy ? 'vencida' : vencimiento < new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000) ? 'por_vencer' : 'vigente'

    const poliza = await prisma.poliza.update({
      where: { id },
      data: {
        ...data,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaVencimiento: vencimiento,
        primaAnual: data.primaAnual ? Number(data.primaAnual) : null,
        estado
      }
    })

    return NextResponse.json({ success: true, poliza })
  } catch (error) {
    console.error('Error al actualizar póliza:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await prisma.poliza.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar póliza:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}