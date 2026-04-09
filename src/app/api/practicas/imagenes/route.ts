import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { put, del } from '@vercel/blob'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const practicaId = formData.get('practicaId') as string
    if (!file || !practicaId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    const practica = await prisma.practica.findUnique({ where: { id: practicaId } })
    if (!practica) return NextResponse.json({ error: 'Práctica no encontrada' }, { status: 404 })
    const blob = await put(`practicas/${practicaId}/${Date.now()}-${file.name}`, file, {
      access: 'public', addRandomSuffix: false
    })
    const imagenesActuales = (practica.imagenes as string[]) || []
    const nuevasImagenes = [...imagenesActuales, blob.url]
    await prisma.practica.update({
      where: { id: practicaId },
      data: { imagenes: nuevasImagenes }
    })
    return NextResponse.json({ url: blob.url, imagenes: nuevasImagenes })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { practicaId, url } = await request.json()
    const practica = await prisma.practica.findUnique({ where: { id: practicaId } })
    if (!practica) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    try { await del(url) } catch(e) {}
    const nuevasImagenes = ((practica.imagenes as string[]) || []).filter(u => u !== url)
    await prisma.practica.update({ where: { id: practicaId }, data: { imagenes: nuevasImagenes } })
    return NextResponse.json({ imagenes: nuevasImagenes })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
