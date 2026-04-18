import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const planoId = searchParams.get('planoId')
    const edificioId = searchParams.get('edificioId')
    if (!planoId && !edificioId) return NextResponse.json({ error: 'planoId o edificioId requerido' }, { status: 400 })
    const where = planoId ? { planoId } : { edificioId: edificioId! }
    const marcadores = await prisma.planoMarcador.findMany({
      where,
      include: { equipoECI: { select: { id: true, tipo: true, subtipo: true, ubicacion: true, estado: true } } },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({ marcadores })
  } catch (error) {
    console.error('Error GET marcadores:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const { edificioId, planoId, equipoECIId, tipo, etiqueta, x, y } = body
    if (!edificioId || !tipo || x === undefined || y === undefined)
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    const marcador = await prisma.planoMarcador.create({
      data: { edificioId, planoId: planoId || null, equipoECIId: equipoECIId || null, tipo, etiqueta: etiqueta || null, x, y },
      include: { equipoECI: { select: { id: true, tipo: true, subtipo: true, ubicacion: true, estado: true } } }
    })
    return NextResponse.json({ marcador })
  } catch (error) {
    console.error('Error POST marcador:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const { id, tipo, etiqueta, x, y, equipoECIId } = body
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const marcador = await prisma.planoMarcador.update({
      where: { id },
      data: {
        ...(tipo && { tipo }),
        ...(etiqueta !== undefined && { etiqueta: etiqueta || null }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(equipoECIId !== undefined && { equipoECIId: equipoECIId || null }),
      },
      include: { equipoECI: { select: { id: true, tipo: true, subtipo: true, ubicacion: true, estado: true } } }
    })
    return NextResponse.json({ marcador })
  } catch (error) {
    console.error('Error PUT marcador:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await prisma.planoMarcador.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error DELETE marcador:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
