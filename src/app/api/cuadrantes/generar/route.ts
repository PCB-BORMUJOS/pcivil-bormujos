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
                        experiencia: true,
                        nivelCompromiso: true,
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

                // Sistema de puntuación mejorado
                const candidatosConPuntuacion = disponiblesParaTurno.map(d => {
                    let puntos = 0

                    // 1. Responsable de turno (+10 puntos)
                    if (d.usuario.responsableTurno) {
                        puntos += 10
                    }

                    // 2. Experiencia (ALTA: +5, MEDIA: +2, BAJA: 0)
                    if (d.usuario.experiencia === 'ALTA') {
                        puntos += 5
                    } else if (d.usuario.experiencia === 'MEDIA') {
                        puntos += 2
                    }

                    // 3. Nivel de compromiso (ALTO: +5, MEDIO: +2, BAJO: 0)
                    if (d.usuario.nivelCompromiso === 'ALTO') {
                        puntos += 5
                    } else if (d.usuario.nivelCompromiso === 'MEDIO') {
                        puntos += 2
                    }

                    // 4. Conductor (+3 puntos)
                    if (d.usuario.carnetConducir) {
                        puntos += 3
                    }

                    // 5. Equidad (-2 por cada turno ya asignado)
                    const asignacionesActuales = conteoAsignaciones[d.usuarioId] || 0
                    puntos -= asignacionesActuales * 2

                    // 6. Turnos deseados (si solicita más turnos, +1 punto)
                    if (d.turnosDeseados > asignacionesActuales) {
                        puntos += 1
                    }

                    return {
                        ...d,
                        puntuacion: puntos
                    }
                })

                // Ordenar por puntuación descendente
                candidatosConPuntuacion.sort((a, b) => b.puntuacion - a.puntuacion)

                // Asignar los mejores candidatos (hasta 2-3 por turno)
                const numAsignaciones = Math.min(2, candidatosConPuntuacion.length)

                // Asegurar que al menos haya 1 responsable si es posible
                const responsables = candidatosConPuntuacion.filter(c => c.usuario.responsableTurno)
                const seleccionados: any[] = []

                if (responsables.length > 0) {
                    seleccionados.push(responsables[0])
                }

                // Completar hasta el número deseado con los mejor puntuados
                candidatosConPuntuacion
                    .filter(c => !seleccionados.includes(c))
                    .slice(0, numAsignaciones - seleccionados.length)
                    .forEach(c => seleccionados.push(c))

                // Crear sugerencias para cada seleccionado
                seleccionados.forEach(seleccionado => {
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
                            carnetConducir: seleccionado.usuario.carnetConducir,
                            experiencia: seleccionado.usuario.experiencia,
                            nivelCompromiso: seleccionado.usuario.nivelCompromiso
                        },
                        servicioId: seleccionado.usuario.servicioId,
                        tipo: 'programada',
                        estado: 'programada',
                        puntuacion: seleccionado.puntuacion // Para debugging
                    })

                    usuariosAsignados.add(seleccionado.usuarioId)
                    conteoAsignaciones[seleccionado.usuarioId]++
                })
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
