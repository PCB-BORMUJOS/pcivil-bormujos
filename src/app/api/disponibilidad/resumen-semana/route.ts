import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')
    if (!semana) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }
    const esAdmin = ['superadmin', 'admin', 'coordinador'].includes((session.user as any).rol)

    // Buscar por rango UTC para evitar desfase de timezone
    const semanaInicioBD = new Date(semana + 'T00:00:00.000Z')
    const semanaFinBD = new Date(semana + 'T23:59:59.999Z')

    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: { gte: semanaInicioBD, lte: semanaFinBD },
        noDisponible: false,
      },
      include: {
        usuario: {
          select: {
            id: true, nombre: true, apellidos: true,
            numeroVoluntario: true, responsableTurno: true,
            carnetConducir: true, experiencia: true,
          }
        }
      }
    })

    const dias = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
    const turnos = ['mañana','tarde']
    const resumen: Record<string, any> = {}
    const lunesDate = new Date(semana + 'T12:00:00')

    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(lunesDate)
      fechaDia.setDate(lunesDate.getDate() + i)
      const y2 = fechaDia.getFullYear();
      const m2 = String(fechaDia.getMonth() + 1).padStart(2, '0');
      const d2 = String(fechaDia.getDate()).padStart(2, '0');
      const fechaStr = `${y2}-${m2}-${d2}`
      const dia = dias[i]
      resumen[fechaStr] = {}

      for (const turno of turnos) {
        const disponibles = disponibilidades.filter(d => {
          const detalles = d.detalles as Record<string, string[]>
          const turnosDia = detalles[dia] || []
          return turnosDia.includes(turno)
        })
        const total = disponibles.length
        const responsables = disponibles.filter(d => d.usuario.responsableTurno).length
        const conCarnet = disponibles.filter(d => d.usuario.carnetConducir).length
        let color: string
        if (total < 3) color = 'rojo'
        else if (total === 3) color = 'naranja'
        else color = turno === 'mañana' ? 'verde' : 'azul'

        resumen[fechaStr][turno] = {
          total,
          responsables,
          conCarnet,
          color,
          criteriosCubiertos: total >= 4 && responsables >= 1 && conCarnet >= 2,
          voluntarios: esAdmin ? disponibles.map(d => ({
            id: d.usuario.id,
            nombre: d.usuario.nombre,
            apellidos: d.usuario.apellidos,
            numeroVoluntario: d.usuario.numeroVoluntario,
            responsableTurno: d.usuario.responsableTurno,
            carnetConducir: d.usuario.carnetConducir,
            experiencia: d.usuario.experiencia,
            turnosDeseados: (d as any).turnosDeseados,
          })) : []
        }
      }
    }
    return NextResponse.json({ resumen, semana })
  } catch (error) {
    console.error('Error en resumen-semana:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
