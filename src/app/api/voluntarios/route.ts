import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

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

    // Determinar turno activo — hora local España DST-safe
    const ahora = new Date()
    const horaEspana = parseInt(ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }))
    // Mañana: 09:00-14:30, Tarde: 17:00-22:00
    const turnoActivo = horaEspana >= 9 && horaEspana < 15 ? 'mañana'
      : horaEspana >= 17 && horaEspana < 22 ? 'tarde'
      : null
    // enTurno = solo personas en el turno activo ahora mismo
    const enTurnoMap = new Map()
    guardiasHoy.forEach(g => {
      if (turnoActivo && g.turno === turnoActivo) {
        if (!enTurnoMap.has(g.usuarioId)) {
          enTurnoMap.set(g.usuarioId, { ...g.usuario, turno: g.turno, rol: g.rol })
        }
      }
    })
    // Si no hay turno activo, devolver array vacío
    const enTurno = Array.from(enTurnoMap.values())
    // Todos los de hoy para el modal detallado
    const todosHoyMap = new Map()
    guardiasHoy.forEach(g => {
      if (!todosHoyMap.has(g.usuarioId + g.turno)) {
        todosHoyMap.set(g.usuarioId + g.turno, { ...g.usuario, turno: g.turno, rol: g.rol })
      }
    })
    const todosHoy = Array.from(todosHoyMap.values())

    return NextResponse.json({ voluntarios, stats, enTurno, todosHoy, turnoActivo })
  } catch (error) {
    console.error('Error fetching voluntarios:', error)
    return NextResponse.json({ error: 'Error al obtener voluntarios' }, { status: 500 })
  }
}
