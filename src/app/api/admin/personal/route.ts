import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const incluirBajas = searchParams.get('bajas') === 'true'

    const voluntarios = await prisma.usuario.findMany({
      where: incluirBajas ? {} : { activo: true },
      include: {
        rol: { select: { nombre: true } },
        fichaVoluntario: true
      },
      orderBy: [
        { numeroVoluntario: 'asc' }
      ]
    })

    return NextResponse.json({ voluntarios })
  } catch (error) {
    console.error('Error al obtener personal:', error)
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
    
    // Crear nuevo voluntario (simplificado)
    // En producción deberías hashear el password y validar más campos
    return NextResponse.json({ error: 'No implementado aún' }, { status: 501 })
  } catch (error) {
    console.error('Error al crear voluntario:', error)
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
    const { id, activo } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo }
    })

    return NextResponse.json({ success: true, usuario })
  } catch (error) {
    console.error('Error al actualizar voluntario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}