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
  const tipo = searchParams.get('tipo')
  try {
    // Gestión de familias dinámicas
    if (tipo === 'familias') {
      const familias = await prisma.familiaPractica.findMany({
        where: { activa: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }]
      })
      return NextResponse.json({ familias })
    }
    const where: any = { activa: true }
    if (familia && familia !== 'all') where.familia = familia
    if (nivel && nivel !== 'all') where.nivel = nivel
    if (busqueda) where.OR = [
      { titulo: { contains: busqueda, mode: 'insensitive' } },
      { numero: { contains: busqueda, mode: 'insensitive' } },
      { objetivo: { contains: busqueda, mode: 'insensitive' } },
    ]
    const [practicas, familiasDinamicas] = await Promise.all([
      prisma.practica.findMany({ where, orderBy: [{ familia: 'asc' }, { numero: 'asc' }] }),
      prisma.familiaPractica.findMany({ where: { activa: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] })
    ])
    const familias = await prisma.practica.groupBy({
      by: ['familia'], _count: { id: true }, where: { activa: true }
    })
    return NextResponse.json({ practicas, familias, familiasDinamicas })
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

    // Crear familia dinámica
    if (body.tipo === 'familia') {
      const slug = body.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const familia = await prisma.familiaPractica.create({
        data: { nombre: body.nombre, slug, color: body.color || '#f97316', icono: body.icono || 'BookOpen', orden: body.orden || 0 }
      })
      return NextResponse.json({ familia })
    }

    const count = await prisma.practica.count()
    const familia_prefix = body.familia?.substring(0,3).toUpperCase() || 'GEN'
    const numero = body.numero?.trim() || `${familia_prefix}-${String(count + 1).padStart(3, '0')}`
    // Verificar número único
    const existe = await prisma.practica.findUnique({ where: { numero } })
    if (existe) return NextResponse.json({ error: `El número ${numero} ya existe` }, { status: 400 })
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
        riesgoObservaciones: body.riesgoObservaciones || null,
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

    // Editar familia dinámica
    if (body.tipo === 'familia') {
      const familia = await prisma.familiaPractica.update({
        where: { id: body.id },
        data: { nombre: body.nombre, color: body.color, icono: body.icono, orden: body.orden }
      })
      return NextResponse.json({ familia })
    }

    const { id, ...data } = body
    // Verificar número único si cambia
    if (data.numero) {
      const existe = await prisma.practica.findFirst({ where: { numero: data.numero, NOT: { id } } })
      if (existe) return NextResponse.json({ error: `El número ${data.numero} ya existe` }, { status: 400 })
    }
    const practica = await prisma.practica.update({
      where: { id },
      data: {
        ...(data.numero && { numero: data.numero }),
        titulo: data.titulo, familia: data.familia,
        subfamilia: data.subfamilia || null,
        objetivo: data.objetivo, descripcion: data.descripcion || null,
        desarrollo: data.desarrollo || null, conclusiones: data.conclusiones || null,
        personalMinimo: data.personalMinimo ? parseInt(data.personalMinimo) : 2,
        materialNecesario: data.materialNecesario || null,
        riesgoPractica: data.riesgoPractica || 'bajo',
        riesgoIntervencion: data.riesgoIntervencion || null,
        riesgoObservaciones: data.riesgoObservaciones || null,
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
  const tipo = searchParams.get('tipo')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  try {
    if (tipo === 'familia') {
      await prisma.familiaPractica.update({ where: { id }, data: { activa: false } })
    } else {
      await prisma.practica.update({ where: { id }, data: { activa: false } })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
