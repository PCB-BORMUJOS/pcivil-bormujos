import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { put, del } from '@vercel/blob'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const edificioId = searchParams.get('edificioId')
    if (!edificioId) return NextResponse.json({ error: 'edificioId requerido' }, { status: 400 })
    const planos = await prisma.planoEdificio.findMany({
      where: { edificioId },
      orderBy: { orden: 'asc' }
    })
    return NextResponse.json({ planos })
  } catch (error) {
    console.error('Error GET planos:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const formData = await request.formData()
    const edificioId = formData.get('edificioId') as string
    const nombre = formData.get('nombre') as string
    const archivo = formData.get('archivo') as File | null
    if (!edificioId || !nombre) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    const count = await prisma.planoEdificio.count({ where: { edificioId } })
    let planoUrl: string | null = null
    let planoNombre: string | null = null
    if (archivo && archivo.size > 0) {
      if (!archivo.type.includes('pdf')) return NextResponse.json({ error: 'Solo PDF' }, { status: 400 })
      const blobNombre = `planos-eci/${edificioId}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const blob = await put(blobNombre, archivo, { access: 'public' })
      planoUrl = blob.url
      planoNombre = archivo.name
    }
    const plano = await prisma.planoEdificio.create({
      data: { edificioId, nombre, orden: count, planoUrl, planoNombre }
    })
    return NextResponse.json({ plano })
  } catch (error) {
    console.error('Error POST plano:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const planoId = formData.get('planoId') as string
      const archivo = formData.get('archivo') as File
      if (!planoId || !archivo) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
      if (!archivo.type.includes('pdf')) return NextResponse.json({ error: 'Solo PDF' }, { status: 400 })
      const planoActual = await prisma.planoEdificio.findUnique({ where: { id: planoId } })
      if (!planoActual) return NextResponse.json({ error: 'Plano no encontrado' }, { status: 404 })
      if (planoActual.planoUrl) { try { await del(planoActual.planoUrl) } catch {} }
      const blobNombre = `planos-eci/${planoActual.edificioId}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const blob = await put(blobNombre, archivo, { access: 'public' })
      const plano = await prisma.planoEdificio.update({
        where: { id: planoId },
        data: { planoUrl: blob.url, planoNombre: archivo.name }
      })
      return NextResponse.json({ plano })
    } else {
      const body = await request.json()
      const { id, nombre, orden } = body
      if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
      const plano = await prisma.planoEdificio.update({
        where: { id },
        data: {
          ...(nombre !== undefined && { nombre }),
          ...(orden !== undefined && { orden }),
        }
      })
      return NextResponse.json({ plano })
    }
  } catch (error) {
    console.error('Error PUT plano:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const planoId = searchParams.get('planoId')
    if (!planoId) return NextResponse.json({ error: 'planoId requerido' }, { status: 400 })
    const plano = await prisma.planoEdificio.findUnique({ where: { id: planoId } })
    if (!plano) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (plano.planoUrl) { try { await del(plano.planoUrl) } catch {} }
    await prisma.planoEdificio.delete({ where: { id: planoId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error DELETE plano:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
