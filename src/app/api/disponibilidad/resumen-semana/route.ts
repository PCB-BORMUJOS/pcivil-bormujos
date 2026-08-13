import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getConfigSemana } from '@/lib/turnos-server'
import { DIAS_SEMANA, mismoTurno } from '@/lib/turnos'

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

    // Estado de publicación de la semana
    const semanaPublicada = await prisma.semanaPublicada.findUnique({
      where: { semana }
    })
    const publicado = semanaPublicada?.publicado ?? false

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
            carnetConducir: true, experiencia: true, esOperativo: true,
          }
        }
      }
    })

    // B-12 se incluye en listas pero no en conteos operativos
    const dispFiltradas = disponibilidades

    // Turnos activos de la semana. Sin dispositivo especial son mañana y tarde,
    // exactamente como antes.
    const config = await getConfigSemana(semana)

    const dias = DIAS_SEMANA
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

      for (const turno of config.turnosPorDia[dia]) {
        const disponibles = dispFiltradas.filter(d => {
          const detalles = d.detalles as Record<string, string[]>
          const turnosDia = detalles[dia] || []
          return turnosDia.some(t => mismoTurno(t, turno))
        })
        // Conteos operativos excluyen B-12 (esOperativo: false)
        const operativos = disponibles.filter(d => (d.usuario as any).esOperativo !== false)
        const total = operativos.length
        const responsables = operativos.filter(d => d.usuario.responsableTurno).length
        const conCarnet = operativos.filter(d => d.usuario.carnetConducir).length
        let color: string
        if (total < 3) color = 'rojo'
        else if (total === 3) color = 'naranja'
        else color = turno === 'mañana' ? 'verde' : turno === 'tarde' ? 'azul' : 'indigo'

        // Identidades solo para admin o semana publicada
        const mostrarIdentidades = esAdmin || publicado
        resumen[fechaStr][turno] = {
          total,
          responsables,
          conCarnet,
          color,
          criteriosCubiertos: total >= 4 && responsables >= 1 && conCarnet >= 2,
          voluntarios: mostrarIdentidades ? disponibles.map(d => ({
            id: d.usuario.id,
            nombre: d.usuario.nombre,
            apellidos: d.usuario.apellidos,
            numeroVoluntario: d.usuario.numeroVoluntario,
            responsableTurno: d.usuario.responsableTurno,
            carnetConducir: d.usuario.carnetConducir,
            experiencia: d.usuario.experiencia,
            esOperativo: (d.usuario as any).esOperativo !== false,
            turnosDeseados: (d as any).turnosDeseados,
          })) : []
        }
      }
    }
    // `config` viaja en la respuesta para que el cliente sepa qué franjas pintar
    // sin tener que hacer una segunda llamada.
    return NextResponse.json({ resumen, semana, publicado, config })
  } catch (error) {
    console.error('Error en resumen-semana:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
