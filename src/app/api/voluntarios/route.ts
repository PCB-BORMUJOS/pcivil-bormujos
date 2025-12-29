import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const voluntarios = await prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        numeroVoluntario: true,
        responsableTurno: true,
        carnetConducir: true,
        experiencia: true,
        avatar: true,
      },
      orderBy: { numeroVoluntario: 'asc' }
    })

    // Contar estadísticas
    const stats = {
      total: voluntarios.length,
      responsablesTurno: voluntarios.filter(v => v.responsableTurno).length,
      conCarnet: voluntarios.filter(v => v.carnetConducir).length,
      experienciaAlta: voluntarios.filter(v => v.experiencia === 'ALTA').length,
    }

    return NextResponse.json({ voluntarios, stats })
  } catch (error) {
    console.error('Error fetching voluntarios:', error)
    return NextResponse.json({ error: 'Error al obtener voluntarios' }, { status: 500 })
  }
}
