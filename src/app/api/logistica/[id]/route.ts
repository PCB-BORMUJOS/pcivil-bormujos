import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const articulo = await prisma.articulo.findUnique({
      where: { id: params.id },
      include: {
        familia: { include: { categoria: true } },
        ubicacion: true,
        servicio: true,
        movimientos: {
          include: { usuario: { select: { nombre: true, apellidos: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!articulo) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ articulo })
  } catch (error) {
    console.error('Error en GET /api/logistica/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const articulo = await prisma.articulo.update({
      where: { id: params.id },
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        descripcion: body.descripcion,
        stockMinimo: body.stockMinimo,
        unidad: body.unidad,
        tieneCaducidad: body.tieneCaducidad,
        fechaCaducidad: body.fechaCaducidad ? new Date(body.fechaCaducidad) : null,
        ubicacionId: body.ubicacionId,
        familiaId: body.familiaId,
        metadatos: body.metadatos
      },
      include: {
        familia: { include: { categoria: true } },
        ubicacion: true
      }
    })

    return NextResponse.json({ success: true, articulo })
  } catch (error) {
    console.error('Error en PUT /api/logistica/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Soft delete
    await prisma.articulo.update({
      where: { id: params.id },
      data: { activo: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/logistica/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}