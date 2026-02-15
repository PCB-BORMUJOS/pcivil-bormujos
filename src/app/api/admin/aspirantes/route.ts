import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const aspirantes = await prisma.aspirante.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ aspirantes })
  } catch (error) {
    console.error('Error al obtener aspirantes:', error)
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
    const { nombre, apellidos, dni, telefono, email } = body

    if (!nombre || !apellidos || !dni) {
      return NextResponse.json({ error: 'Nombre, apellidos y DNI son requeridos' }, { status: 400 })
    }

    const aspirante = await prisma.aspirante.create({
      data: {
        nombre,
        apellidos,
        dni,
        telefono,
        email,
        estado: 'pendiente',
        confirmacionAsistencia: false,
        asistioEntrevista: false
      }
    })

    return NextResponse.json({ success: true, aspirante })
  } catch (error) {
    console.error('Error al crear aspirante:', error)
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
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    // Convertir fechaEntrevista de "YYYY-MM-DD" a DateTime ISO-8601
    if (data.fechaEntrevista && typeof data.fechaEntrevista === 'string') {
      // Si es solo fecha (YYYY-MM-DD), convertir a DateTime completo
      if (data.fechaEntrevista.length === 10) {
        data.fechaEntrevista = new Date(data.fechaEntrevista + 'T00:00:00.000Z').toISOString()
      }
    }

    const aspirante = await prisma.aspirante.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, aspirante })
  } catch (error) {
    console.error('Error al actualizar aspirante:', error)
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

    await prisma.aspirante.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar aspirante:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
