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
                const certificacionesVidentes = await prisma.certificacion.count({
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
                        certificacionesVidentes,
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
                const curso = await prisma.curso.create({ data })
                return NextResponse.json({ success: true, curso })

            case 'convocatoria':
                const convocatoria = await prisma.convocatoria.create({ data })
                return NextResponse.json({ success: true, convocatoria })

            case 'inscripcion':
                const conv = await prisma.convocatoria.findUnique({
                    where: { id: data.convocatoriaId }
                })

                if (!conv) {
                    return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                }

                if (conv.plazasOcupadas >= conv.plazasDisponibles) {
                    return NextResponse.json({ error: 'No hay plazas disponibles' }, { status: 400 })
                }

                const [inscripcion, _] = await prisma.$transaction([
                    prisma.inscripcion.create({ data }),
                    prisma.convocatoria.update({
                        where: { id: data.convocatoriaId },
                        data: { plazasOcupadas: { increment: 1 } }
                    })
                ])

                return NextResponse.json({ success: true, inscripcion })

            case 'certificacion':
                const certificacion = await prisma.certificacion.create({ data })
                return NextResponse.json({ success: true, certificacion })

            case 'necesidad':
                const necesidad = await prisma.necesidadFormativa.create({ data })
                return NextResponse.json({ success: true, necesidad })

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
