import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo')

        switch (tipo) {
            case 'cursos':
                const cursos = await prisma.curso.findMany({
                    where: { activo: true },
                    orderBy: { nombre: 'asc' },
                    include: {
                        _count: {
                            select: {
                                convocatorias: true,
                                certificaciones: true
                            }
                        }
                    }
                })
                return NextResponse.json({ cursos })

            case 'convocatorias':
                const estadoFilter = searchParams.get('estado')
                const convocatorias = await prisma.convocatoria.findMany({
                    where: estadoFilter ? { estado: estadoFilter } : {},
                    include: {
                        curso: true,
                        _count: {
                            select: { inscripciones: true }
                        }
                    },
                    orderBy: { fechaInicio: 'desc' }
                })
                return NextResponse.json({ convocatorias })

            case 'inscripciones':
                const convocatoriaId = searchParams.get('convocatoriaId')
                const inscripciones = await prisma.inscripcion.findMany({
                    where: convocatoriaId ? { convocatoriaId } : {},
                    include: {
                        usuario: {
                            select: {
                                id: true,
                                nombre: true,
                                apellidos: true,
                                email: true,
                                numeroVoluntario: true
                            }
                        },
                        convocatoria: {
                            include: { curso: true }
                        }
                    },
                    orderBy: { fechaInscripcion: 'desc' }
                })
                return NextResponse.json({ inscripciones })

            case 'certificaciones':
                const usuarioId = searchParams.get('usuarioId')
                const vigentes = searchParams.get('vigentes') === 'true'

                const certificaciones = await prisma.certificacion.findMany({
                    where: {
                        ...(usuarioId && { usuarioId }),
                        ...(vigentes && {
                            vigente: true,
                            OR: [
                                { fechaExpiracion: null },
                                { fechaExpiracion: { gte: new Date() } }
                            ]
                        })
                    },
                    include: {
                        usuario: {
                            select: {
                                id: true,
                                nombre: true,
                                apellidos: true,
                                numeroVoluntario: true
                            }
                        },
                        curso: true
                    },
                    orderBy: { fechaObtencion: 'desc' }
                })
                return NextResponse.json({ certificaciones })

            case 'necesidades':
                const estadoNecesidad = searchParams.get('estado')
                const necesidades = await prisma.necesidadFormativa.findMany({
                    where: estadoNecesidad ? { estado: estadoNecesidad } : {},
                    include: {
                        curso: true
                    },
                    orderBy: [
                        { prioridad: 'asc' },
                        { fechaDeteccion: 'desc' }
                    ]
                })
                return NextResponse.json({ necesidades })

            case 'inventario':
                const categoriaFormacion = await prisma.categoriaInventario.findFirst({
                    where: { slug: 'formacion' }
                })

                if (!categoriaFormacion) {
                    return NextResponse.json({
                        articulos: [],
                        familias: [],
                        mensaje: 'Categoría Formación no encontrada'
                    })
                }

                const familias = await prisma.familiaArticulo.findMany({
                    where: { categoriaId: categoriaFormacion.id },
                    include: {
                        _count: {
                            select: { articulos: true }
                        }
                    }
                })

                const articulos = await prisma.articulo.findMany({
                    where: {
                        familia: {
                            categoriaId: categoriaFormacion.id
                        },
                        activo: true
                    },
                    include: {
                        familia: true
                    },
                    orderBy: { nombre: 'asc' }
                })

                return NextResponse.json({
                    articulos,
                    familias,
                    categoriaId: categoriaFormacion.id
                })

            case 'stats':
                const totalCursos = await prisma.curso.count({ where: { activo: true } })
                const convocatoriasActivas = await prisma.convocatoria.count({
                    where: { estado: { in: ['planificada', 'inscripciones_abiertas', 'en_curso'] } }
                })
                const certificacionesVigentes = await prisma.certificacion.count({
                    where: {
                        vigente: true,
                        OR: [
                            { fechaExpiracion: null },
                            { fechaExpiracion: { gte: new Date() } }
                        ]
                    }
                })
                const necesidadesPendientes = await prisma.necesidadFormativa.count({
                    where: { estado: { in: ['identificada', 'planificada'] } }
                })

                return NextResponse.json({
                    stats: {
                        totalCursos,
                        convocatoriasActivas,
                        certificacionesVigentes,
                        necesidadesPendientes
                    }
                })

            default:
                return NextResponse.json({ error: 'Tipo no especificado' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error en GET /api/formacion:', error)
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
        const { tipo, ...data } = body

        switch (tipo) {
            case 'curso':
                // Mapear tipo_curso a tipo (campo de BBDD) para evitar conflicto con el 'tipo' de la acción
                const cursoData = {
                    ...data,
                    tipo: data.tipo_curso || 'interna' // Fallback default
                }
                // Limpiar campo auxiliar si existe
                delete cursoData.tipo_curso

                const curso = await prisma.curso.create({ data: cursoData })
                return NextResponse.json({ success: true, curso })

            case 'convocatoria':
                // Obtener el usuario actual
                const usuario = await prisma.usuario.findUnique({
                    where: { email: session.user.email },
                    include: { servicio: true }
                })

                // Crear la convocatoria
                const convocatoriaData = {
                    ...data,
                    fechaInicio: new Date(data.fechaInicio),
                    fechaFin: new Date(data.fechaFin),
                    plazasDisponibles: Number(data.plazasDisponibles)
                }
                const convocatoria = await prisma.convocatoria.create({ data: convocatoriaData })

                // Obtener el curso relacionado
                const cursoRelacionado = await prisma.curso.findUnique({
                    where: { id: data.cursoId }
                })

                // Auto-crear evento en el calendario
                if (convocatoria && usuario) {
                    await prisma.evento.create({
                        data: {
                            titulo: `Formación: ${cursoRelacionado?.nombre || 'Curso'}`,
                            descripcion: `Convocatoria: ${convocatoria.codigo}\n${cursoRelacionado?.descripcion || ''}`,
                            tipo: 'formacion',
                            fecha: convocatoria.fechaInicio,
                            horaInicio: '09:00',
                            horaFin: '14:00',
                            ubicacion: convocatoria.lugar || '',
                            direccion: convocatoria.direccion || '',
                            estado: 'programado',
                            visible: true,
                            privado: false,
                            color: '#8b5cf6', // purple-500
                            creadorId: usuario.id,
                            servicioId: usuario.servicioId
                        }
                    })
                }

                return NextResponse.json({ success: true, convocatoria })

            case 'inscripcion':
                // Verificar si es una acción de aprobar/rechazar
                const { action, estado: newEstado, id: inscripcionId } = data

                if (action === 'aprobar') {
                    // Obtener la inscripción actual
                    const inscripcionActual = await prisma.inscripcion.findUnique({
                        where: { id: inscripcionId }
                    })

                    if (!inscripcionActual) {
                        return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
                    }

                    // Verificar plazas disponibles
                    const conv = await prisma.convocatoria.findUnique({
                        where: { id: inscripcionActual.convocatoriaId }
                    })

                    if (!conv) {
                        return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                    }

                    if (conv.plazasOcupadas >= conv.plazasDisponibles) {
                        return NextResponse.json({ error: 'No hay plazas disponibles' }, { status: 400 })
                    }

                    // Aprobar: actualizar estado y ocupar plaza
                    const [inscripcionAprobada] = await prisma.$transaction([
                        prisma.inscripcion.update({
                            where: { id: inscripcionId },
                            data: { estado: 'confirmada' }
                        }),
                        prisma.convocatoria.update({
                            where: { id: inscripcionActual.convocatoriaId },
                            data: { plazasOcupadas: { increment: 1 } }
                        })
                    ])

                    return NextResponse.json({ success: true, inscripcion: inscripcionAprobada, mensaje: 'Inscripción aprobada' })
                }

                if (action === 'rechazar') {
                    // Rechazar: solo actualizar estado
                    const inscripcionRechazada = await prisma.inscripcion.update({
                        where: { id: inscripcionId },
                        data: { estado: 'rechazada' }
                    })

                    return NextResponse.json({ success: true, inscripcion: inscripcionRechazada, mensaje: 'Inscripción rechazada' })
                }

                // Crear nueva inscripción (solicitud)
                const convCheck = await prisma.convocatoria.findUnique({
                    where: { id: data.convocatoriaId }
                })

                if (!convCheck) {
                    return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                }

                // Determinar estado: si se proporciona, usarlo; si no, default 'pendiente'
                const estadoInscripcion = data.estado || 'pendiente';

                // Si es confirmada directamente, verificar plazas y ocupar
                if (estadoInscripcion === 'confirmada' && convCheck.plazasOcupadas >= convCheck.plazasDisponibles) {
                    return NextResponse.json({ error: 'No hay plazas disponibles' }, { status: 400 })
                }

                // Crear inscripción
                const inscripcion = await prisma.inscripcion.create({
                    data: {
                        convocatoriaId: data.convocatoriaId,
                        usuarioId: data.usuarioId,
                        estado: estadoInscripcion
                    }
                })

                // Si está confirmada, ocupar plaza
                if (estadoInscripcion === 'confirmada') {
                    await prisma.convocatoria.update({
                        where: { id: data.convocatoriaId },
                        data: { plazasOcupadas: { increment: 1 } }
                    })
                    return NextResponse.json({ success: true, inscripcion, mensaje: '¡Inscripción confirmada!' })
                }

                return NextResponse.json({ success: true, inscripcion, mensaje: 'Solicitud de inscripción enviada' })

            case 'certificacion':
                const certificacion = await prisma.certificacion.create({ data })
                return NextResponse.json({ success: true, certificacion })

            case 'necesidad':
                const necesidad = await prisma.necesidadFormativa.create({ data })
                return NextResponse.json({ success: true, necesidad })

            case 'cerrar-acta':
                const { convocatoriaId } = data
                if (!convocatoriaId) return NextResponse.json({ error: 'Convocatoria ID requerido' }, { status: 400 })

                const convActa = await prisma.convocatoria.findUnique({
                    where: { id: convocatoriaId },
                    include: { curso: true }
                })
                if (!convActa) return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })

                // Obtener inscripciones aptas sin certificar (aunque mejor certificar todas las aptas)
                const inscripcionesAptas = await prisma.inscripcion.findMany({
                    where: {
                        convocatoriaId,
                        apto: true
                    }
                })

                let certificadosGenerados = 0
                const fechaHoy = new Date()

                // Calcular fecha expiración si aplica
                let fechaExpiracion: Date | null = null
                if (convActa.curso.validezMeses) {
                    fechaExpiracion = new Date()
                    fechaExpiracion.setMonth(fechaExpiracion.getMonth() + convActa.curso.validezMeses)
                }

                for (const insc of inscripcionesAptas) {
                    // Verificar si ya existe certificación para este curso y usuario (opcional, pero recomendable)
                    // En este caso permitimos recertificación si es otra convocatoria diferente, pero 
                    // si es la misma convocatoria no deberíamos duplicar.
                    // Simplificación: crear certificación.

                    const numCert = `CERT-${fechaHoy.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`

                    await prisma.certificacion.create({
                        data: {
                            usuarioId: insc.usuarioId,
                            cursoId: convActa.cursoId,
                            fechaObtencion: fechaHoy,
                            fechaExpiracion,
                            numeroCertificado: numCert,
                            entidadEmisora: 'Protección Civil Bormujos', // O data.entidad
                            vigente: true,
                            renovada: false
                        }
                    })
                    certificadosGenerados++
                }

                // Cerrar convocatoria
                await prisma.convocatoria.update({
                    where: { id: convocatoriaId },
                    data: { estado: 'finalizada' }
                })

                return NextResponse.json({ success: true, certificadosGenerados })

            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error en POST /api/formacion:', error)
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
        const { tipo, id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        switch (tipo) {
            case 'curso':
                const curso = await prisma.curso.update({ where: { id }, data })
                return NextResponse.json({ success: true, curso })

            case 'convocatoria':
                const convocatoria = await prisma.convocatoria.update({ where: { id }, data })
                return NextResponse.json({ success: true, convocatoria })

            case 'inscripcion':
                // Verificar si es una acción de aprobar/rechazar
                const { action } = data

                if (action === 'aprobar') {
                    // Obtener la inscripción actual
                    const inscripcionActual = await prisma.inscripcion.findUnique({
                        where: { id }
                    })

                    if (!inscripcionActual) {
                        return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
                    }

                    // Verificar plazas disponibles
                    const conv = await prisma.convocatoria.findUnique({
                        where: { id: inscripcionActual.convocatoriaId }
                    })

                    if (!conv) {
                        return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                    }

                    if (conv.plazasOcupadas >= conv.plazasDisponibles) {
                        return NextResponse.json({ error: 'No hay plazas disponibles' }, { status: 400 })
                    }

                    // Aprobar: actualizar estado y ocupar plaza
                    const [inscripcionAprobada] = await prisma.$transaction([
                        prisma.inscripcion.update({
                            where: { id },
                            data: { estado: 'confirmada' }
                        }),
                        prisma.convocatoria.update({
                            where: { id: inscripcionActual.convocatoriaId },
                            data: { plazasOcupadas: { increment: 1 } }
                        })
                    ])

                    return NextResponse.json({ success: true, inscripcion: inscripcionAprobada, mensaje: 'Inscripción aprobada' })
                }

                if (action === 'rechazar') {
                    // Rechazar: solo actualizar estado
                    const inscripcionRechazada = await prisma.inscripcion.update({
                        where: { id },
                        data: { estado: 'rechazada' }
                    })

                    return NextResponse.json({ success: true, inscripcion: inscripcionRechazada, mensaje: 'Inscripción rechazada' })
                }

                // Actualización normal de inscripción
                const inscripcion = await prisma.inscripcion.update({ where: { id }, data })
                return NextResponse.json({ success: true, inscripcion })

            case 'certificacion':
                const certificacion = await prisma.certificacion.update({ where: { id }, data })
                return NextResponse.json({ success: true, certificacion })

            case 'necesidad':
                const necesidad = await prisma.necesidadFormativa.update({ where: { id }, data })
                return NextResponse.json({ success: true, necesidad })

            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error en PUT /api/formacion:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo')
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        switch (tipo) {
            case 'curso':
                await prisma.curso.delete({ where: { id } })
                return NextResponse.json({ success: true })

            case 'convocatoria':
                await prisma.convocatoria.delete({ where: { id } })
                return NextResponse.json({ success: true })

            case 'inscripcion':
                const insc = await prisma.inscripcion.findUnique({ where: { id } })
                if (insc) {
                    await prisma.$transaction([
                        prisma.inscripcion.delete({ where: { id } }),
                        prisma.convocatoria.update({
                            where: { id: insc.convocatoriaId },
                            data: { plazasOcupadas: { decrement: 1 } }
                        })
                    ])
                }
                return NextResponse.json({ success: true })

            case 'certificacion':
                await prisma.certificacion.delete({ where: { id } })
                return NextResponse.json({ success: true })

            case 'necesidad':
                await prisma.necesidadFormativa.delete({ where: { id } })
                return NextResponse.json({ success: true })

            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error en DELETE /api/formacion:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
