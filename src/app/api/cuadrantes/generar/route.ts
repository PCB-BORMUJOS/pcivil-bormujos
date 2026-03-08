import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

                // 1. Filtrar voluntarios administrativos puros (Lydia - B-12) y que no hayan superado su cupo
                const candidatosValidos = disponiblesParaTurno.filter(d => {
                    const esAdmin = 
                        d.usuario.numeroVoluntario === 'B-12' || 
                        d.usuario.nombre.toLowerCase().includes('lydia');
                    if (esAdmin) return false;

                    const asignacionesActuales = conteoAsignaciones[d.usuarioId] || 0;
                    return asignacionesActuales < d.turnosDeseados; // Estricto: no asignar más de lo que quiere
                });

                if (candidatosValidos.length === 0) return; // Nadie quiere más turnos u ofertó para hoy

                // Calcular la "necesidad" de cada voluntario (0 a 1). Más cercano a 0 = menos turnos asignados respecto a deseados = MÁS PRIORIDAD
                const clasificados = candidatosValidos.map(d => {
                    const asignaciones = conteoAsignaciones[d.usuarioId] || 0;
                    const proporcion = asignaciones / d.turnosDeseados;
                    return { ...d, proporcion };
                });

                // Ordenar: 1º Menor proporción. 2º Mayor experiencia o mando (para priorizar la jerarquía base dentro de los necesitados)
                clasificados.sort((a, b) => {
                    if (a.proporcion !== b.proporcion) return a.proporcion - b.proporcion;
                    // En caso de misma proporción, desempatar levemente
                    let ptsA = (a.usuario.responsableTurno ? 2 : 0) + (a.usuario.carnetConducir ? 1 : 0);
                    let ptsB = (b.usuario.responsableTurno ? 2 : 0) + (b.usuario.carnetConducir ? 1 : 0);
                    return ptsB - ptsA;
                });

                const seleccionados: any[] = [];
                let responsablesAsignados = 0;
                let conductoresAsignados = 0;

                // Helper: Añadir seguro recalculando el contador temporalmente en este paso (para que no parezca que necesita infinitos para turnos futuros)
                const addSeleccionado = (c: any) => {
                    seleccionados.push(c);
                    conteoAsignaciones[c.usuarioId]++;
                }

                // Pass 1: Buscar 1 Responsable
                for (let i = 0; i < clasificados.length && responsablesAsignados < 1; i++) {
                    const c = clasificados[i];
                    if (c.usuario.responsableTurno && !seleccionados.some(s => s.usuarioId === c.usuarioId) && conteoAsignaciones[c.usuarioId] < c.turnosDeseados) {
                        addSeleccionado(c);
                        responsablesAsignados++;
                    }
                }

                // Pass 2: Buscar hasta 2 Conductores (si un responsable ya es conductor cuenta como uno)
                conductoresAsignados += seleccionados.filter(s => s.usuario.carnetConducir).length;
                
                for (let i = 0; i < clasificados.length && conductoresAsignados < 2; i++) {
                    const c = clasificados[i];
                    if (c.usuario.carnetConducir && !seleccionados.some(s => s.usuarioId === c.usuarioId) && conteoAsignaciones[c.usuarioId] < c.turnosDeseados) {
                        addSeleccionado(c);
                        conductoresAsignados++;
                    }
                }

                // Pass 3: Buscar hasta Apoyos (o llenar vacíos hasta llegar a 4 efectivos)
                const objetivoPlazas = 4;
                for (let i = 0; i < clasificados.length && seleccionados.length < objetivoPlazas; i++) {
                    const c = clasificados[i];
                    // Aseguramos de que esta persona no esté ya en la patrulla Y que aún tenga cupo de turnos
                    if (!seleccionados.some(s => s.usuarioId === c.usuarioId) && conteoAsignaciones[c.usuarioId] < c.turnosDeseados) {
                        addSeleccionado(c);
                    }
                }

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
                        puntuacion: Math.round(seleccionado.proporcion * 100) // Para debugging, guardamos % de completitud en vez de puntos absurdos
                    })

                    usuariosAsignados.add(seleccionado.usuarioId)
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
