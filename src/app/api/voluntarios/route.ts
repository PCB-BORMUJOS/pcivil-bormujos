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
      orderBy: [{ numeroVoluntario: 'asc' }, { apellidos: 'asc' }]
    })

    // Contar estadísticas
    const stats = {
      total: voluntarios.length,
      responsablesTurno: voluntarios.filter(v => v.responsableTurno).length,
      conCarnet: voluntarios.filter(v => v.carnetConducir).length,
      experienciaAlta: voluntarios.filter(v => v.experiencia === 'ALTA').length,
    }

    // Obtener guardias de hoy
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const guardiasHoy = await prisma.guardia.findMany({
      where: {
        fecha: { gte: hoy, lt: manana },
        estado: { not: 'cancelada' }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            numeroVoluntario: true,
            avatar: true,
          }
        }
      },
      orderBy: { turno: 'asc' }
    })

    // Voluntarios en turno hoy (únicos, puede tener varios turnos)
    const enTurnoMap = new Map()
    guardiasHoy.forEach(g => {
      if (!enTurnoMap.has(g.usuarioId)) {
        enTurnoMap.set(g.usuarioId, { ...g.usuario, turno: g.turno, rol: g.rol })
      }
    })
    const enTurno = Array.from(enTurnoMap.values())

    return NextResponse.json({ voluntarios, stats, enTurno })
  } catch (error) {
    console.error('Error fetching voluntarios:', error)
    return NextResponse.json({ error: 'Error al obtener voluntarios' }, { status: 500 })
  }
}
