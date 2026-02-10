import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// POST: Generar cuadrante automáticamente basado en disponibilidades
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Verificar permisos de administrador
        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
            include: { rol: true }
        })

        if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
            return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
        }

        const body = await request.json()
        const { semanaInicio } = body

        if (!semanaInicio) {
            return NextResponse.json({ error: 'semanaInicio requerido' }, { status: 400 })
        }

        // Obtener todas las disponibilidades para esa semana
        const disponibilidades = await prisma.disponibilidad.findMany({
            where: {
                semanaInicio: new Date(semanaInicio),
                noDisponible: false
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        numeroVoluntario: true,
                        responsableTurno: true,
                        carnetConducir: true,
                        servicioId: true
                    }
                }
            }
        })

        if (disponibilidades.length === 0) {
            return NextResponse.json({
                sugerencias: [],
                estadisticas: {
                    diasCubiertos: 0,
                    turnosCubiertos: 0,
                    usuariosAsignados: 0
                },
                mensaje: 'No hay disponibilidades registradas para esta semana'
            })
        }

        // Generar sugerencias
        const sugerencias: any[] = []
        const usuariosAsignados = new Set<string>()
        const conteoAsignaciones: Record<string, number> = {}

        // Inicializar conteo
        disponibilidades.forEach(d => {
            conteoAsignaciones[d.usuarioId] = 0
        })

        const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        const inicioSemana = new Date(semanaInicio)

        diasSemana.forEach((dia, index) => {
            const fechaDia = new Date(inicioSemana)
            fechaDia.setDate(fechaDia.getDate() + index)

            // Turnos para este día
            const turnos = ['mañana', 'tarde']

            turnos.forEach(turno => {
                // Filtrar usuarios disponibles para este día y turno
                const disponiblesParaTurno = disponibilidades.filter(d => {
                    const detalles = typeof d.detalles === 'string' ? JSON.parse(d.detalles) : d.detalles
                    const turnosDia = detalles[dia] || []
                    return turnosDia.includes(turno)
                })

                if (disponiblesParaTurno.length === 0) {
                    // No hay nadie disponible para este turno
                    return
                }

                // Ordenar por:
                // 1. Menor número de asignaciones actuales (distribución equitativa)
                // 2. Mayor número de turnos deseados
                // 3. Responsable de turno (prioridad para responsables)
                disponiblesParaTurno.sort((a, b) => {
                    const asignacionesA = conteoAsignaciones[a.usuarioId] || 0
                    const asignacionesB = conteoAsignaciones[b.usuarioId] || 0

                    if (asignacionesA !== asignacionesB) {
                        return asignacionesA - asignacionesB
                    }

                    if (a.turnosDeseados !== b.turnosDeseados) {
                        return b.turnosDeseados - a.turnosDeseados
                    }

                    if (a.usuario.responsableTurno !== b.usuario.responsableTurno) {
                        return a.usuario.responsableTurno ? -1 : 1
                    }

                    return 0
                })

                // Asignar el mejor candidato
                const seleccionado = disponiblesParaTurno[0]

                sugerencias.push({
                    fecha: fechaDia.toISOString().split('T')[0],
                    turno,
                    usuarioId: seleccionado.usuarioId,
                    usuario: {
                        id: seleccionado.usuario.id,
                        nombre: seleccionado.usuario.nombre,
                        apellidos: seleccionado.usuario.apellidos,
                        numeroVoluntario: seleccionado.usuario.numeroVoluntario,
                        responsableTurno: seleccionado.usuario.responsableTurno,
                        carnetConducir: seleccionado.usuario.carnetConducir
                    },
                    servicioId: seleccionado.usuario.servicioId,
                    tipo: 'programada',
                    estado: 'programada'
                })

                usuariosAsignados.add(seleccionado.usuarioId)
                conteoAsignaciones[seleccionado.usuarioId]++
            })
        })

        // Calcular estadísticas
        const diasUnicos = new Set(sugerencias.map(s => s.fecha))
        const estadisticas = {
            diasCubiertos: diasUnicos.size,
            turnosCubiertos: sugerencias.length,
            usuariosAsignados: usuariosAsignados.size,
            distribucion: Object.entries(conteoAsignaciones)
                .filter(([_, count]) => count > 0)
                .map(([usuarioId, count]) => {
                    const usuario = disponibilidades.find(d => d.usuarioId === usuarioId)?.usuario
                    return {
                        usuarioId,
                        nombre: `${usuario?.nombre} ${usuario?.apellidos}`,
                        numeroVoluntario: usuario?.numeroVoluntario,
                        turnosAsignados: count
                    }
                })
        }

        return NextResponse.json({
            success: true,
            sugerencias,
            estadisticas
        })
    } catch (error) {
        console.error('Error al generar cuadrante:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
