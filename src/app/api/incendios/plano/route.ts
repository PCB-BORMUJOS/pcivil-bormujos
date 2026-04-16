import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { put, del } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const formData = await request.formData()
    const edificioId = formData.get('edificioId') as string
    const archivo = formData.get('archivo') as File
    if (!edificioId || !archivo) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    if (!archivo.type.includes('pdf')) return NextResponse.json({ error: 'Solo PDF' }, { status: 400 })
    const edificio = await prisma.edificio.findUnique({ where: { id: edificioId } })
    if (!edificio) return NextResponse.json({ error: 'Edificio no encontrado' }, { status: 404 })
    if (edificio.planoUrl) {
      try { await del(edificio.planoUrl) } catch {}
    }
    const nombre = `planos-eci/${edificioId}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const blob = await put(nombre, archivo, { access: 'public' })
    const actualizado = await prisma.edificio.update({
      where: { id: edificioId },
      data: { planoUrl: blob.url, planoNombre: archivo.name }
    })
    return NextResponse.json({ success: true, planoUrl: actualizado.planoUrl, planoNombre: actualizado.planoNombre })
  } catch (error) {
    console.error('Error subiendo plano:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const edificioId = searchParams.get('edificioId')
    if (!edificioId) return NextResponse.json({ error: 'edificioId requerido' }, { status: 400 })
    const edificio = await prisma.edificio.findUnique({ where: { id: edificioId } })
    if (!edificio) return NextResponse.json({ error: 'Edificio no encontrado' }, { status: 404 })
    if (edificio.planoUrl) { try { await del(edificio.planoUrl) } catch {} }
    await prisma.edificio.update({ where: { id: edificioId }, data: { planoUrl: null, planoNombre: null } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando plano:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
