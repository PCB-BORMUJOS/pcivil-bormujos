import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { asignaciones, semanaLabel } = body

    if (!asignaciones || asignaciones.length === 0) {
      return NextResponse.json({ success: true, creadas: 0 })
    }

    const porUsuario: Record<string, { fecha: string; turno: string }[]> = {}
    asignaciones.forEach((a: any) => {
      if (!porUsuario[a.usuarioId]) porUsuario[a.usuarioId] = []
      porUsuario[a.usuarioId].push({ fecha: a.fecha, turno: a.turno })
    })

    const DIAS_ES: Record<string, string> = {
      '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miercoles',
      '4': 'jueves', '5': 'viernes', '6': 'sabado'
    }

    const notificaciones = Object.entries(porUsuario).map(([usuarioId, turnos]) => {
      const lineas = turnos.map(t => {
        const d = new Date(t.fecha + 'T12:00:00Z')
        const diaNombre = DIAS_ES[String(d.getDay())]
        const diaNum = d.getDate()
        const mes = d.toLocaleDateString('es-ES', { month: 'long' })
        const turnoLabel = t.turno === 'manana' ? 'Manana (09:00-14:30)' : 'Tarde (17:00-22:00)'
        return `- ${diaNombre} ${diaNum} de ${mes}: ${turnoLabel}`
      })
      return {
        tipo: 'cuadrante',
        titulo: `Turnos asignados - ${semanaLabel}`,
        mensaje: `Tus turnos de la semana:\n${lineas.join('\n')}`,
        enlace: '/cuadrantes',
        leida: false,
        usuarioId,
      }
    })

    await prisma.notificacion.createMany({ data: notificaciones })

    return NextResponse.json({ success: true, creadas: notificaciones.length })
  } catch (error) {
    console.error('Error creando notificaciones cuadrante:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
