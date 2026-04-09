import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const familia = searchParams.get('familia')
  const nivel = searchParams.get('nivel')
  const busqueda = searchParams.get('busqueda')
  try {
    const where: any = { activa: true }
    if (familia && familia !== 'all') where.familia = familia
    if (nivel && nivel !== 'all') where.nivel = nivel
    if (busqueda) where.OR = [
      { titulo: { contains: busqueda, mode: 'insensitive' } },
      { numero: { contains: busqueda, mode: 'insensitive' } },
      { objetivo: { contains: busqueda, mode: 'insensitive' } },
    ]
    const practicas = await prisma.practica.findMany({
      where, orderBy: [{ familia: 'asc' }, { numero: 'asc' }]
    })
    const familias = await prisma.practica.groupBy({
      by: ['familia'], _count: { id: true }, where: { activa: true }
    })
    return NextResponse.json({ practicas, familias })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const count = await prisma.practica.count()
    const familia_prefix = body.familia?.substring(0,3).toUpperCase() || 'GEN'
    const numero = body.numero || `${familia_prefix}-${String(count + 1).padStart(3, '0')}`
    const practica = await prisma.practica.create({
      data: {
        numero, titulo: body.titulo, familia: body.familia,
        subfamilia: body.subfamilia || null,
        objetivo: body.objetivo, descripcion: body.descripcion || null,
        desarrollo: body.desarrollo || null, conclusiones: body.conclusiones || null,
        personalMinimo: body.personalMinimo ? parseInt(body.personalMinimo) : 2,
        materialNecesario: body.materialNecesario || null,
        riesgoPractica: body.riesgoPractica || 'bajo',
        riesgoIntervencion: body.riesgoIntervencion || null,
        duracionEstimada: body.duracionEstimada ? parseInt(body.duracionEstimada) : 30,
        nivel: body.nivel || 'basico',
        prerequisitos: body.prerequisitos || null,
        grupo: body.grupo || null,
        definicion: body.definicion || null,
        lugarDesarrollo: body.lugarDesarrollo || null,
        youtubeUrl: body.youtubeUrl || null,
      }
    })
    return NextResponse.json({ practica })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, ...data } = body
    const practica = await prisma.practica.update({
      where: { id },
      data: {
        titulo: data.titulo, familia: data.familia,
        subfamilia: data.subfamilia || null,
        objetivo: data.objetivo, descripcion: data.descripcion || null,
        desarrollo: data.desarrollo || null, conclusiones: data.conclusiones || null,
        personalMinimo: data.personalMinimo ? parseInt(data.personalMinimo) : 2,
        materialNecesario: data.materialNecesario || null,
        riesgoPractica: data.riesgoPractica || 'bajo',
        riesgoIntervencion: data.riesgoIntervencion || null,
        duracionEstimada: data.duracionEstimada ? parseInt(data.duracionEstimada) : 30,
        nivel: data.nivel || 'basico',
        prerequisitos: data.prerequisitos || null,
        grupo: data.grupo || null,
        definicion: data.definicion || null,
        lugarDesarrollo: data.lugarDesarrollo || null,
        youtubeUrl: data.youtubeUrl || null,
        activa: data.activa ?? true,
      }
    })
    return NextResponse.json({ practica })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  try {
    await prisma.practica.update({ where: { id }, data: { activa: false } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
