import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'



// Genera número de certificado secuencial único: CERT-YYYY-NNNNN
async function generarNumeroCertificado(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await (prisma as any).certificacion.count({
        where: { numeroCertificado: { startsWith: `CERT-${year}-` } }
    })
    return `CERT-${year}-${String(count + 1).padStart(5, '0')}`
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo')

        switch (tipo) {
            case 'cursos':
                const cursos = await (prisma as any).curso.findMany({
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
                const convocatorias = await (prisma as any).convocatoria.findMany({
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
                const inscripciones = await (prisma as any).inscripcion.findMany({
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

                const certificaciones = await (prisma as any).certificacion.findMany({
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
                const necesidades = await (prisma as any).necesidadFormativa.findMany({
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
                const categoriaFormacion = await (prisma as any).categoriaInventario.findFirst({
                    where: { slug: 'formacion' }
                })

                if (!categoriaFormacion) {
                    return NextResponse.json({
                        articulos: [],
                        familias: [],
                        mensaje: 'Categoría Formación no encontrada'
                    })
                }

                const familias = await (prisma as any).familiaArticulo.findMany({
                    where: { categoriaId: categoriaFormacion.id },
                    include: {
                        _count: {
                            select: { articulos: true }
                        }
                    }
                })

                const articulos = await (prisma as any).articulo.findMany({
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
                const totalCursos = await (prisma as any).curso.count({ where: { activo: true } })
                const convocatoriasActivas = await (prisma as any).convocatoria.count({
                    where: { estado: { in: ['planificada', 'inscripciones_abiertas', 'en_curso'] } }
                })
                const certificacionesVigentes = await (prisma as any).certificacion.count({
                    where: {
                        vigente: true,
                        OR: [
                            { fechaExpiracion: null },
                            { fechaExpiracion: { gte: new Date() } }
                        ]
                    }
                })
                const necesidadesPendientes = await (prisma as any).necesidadFormativa.count({
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

            case 'mi-formacion': {
                const usuarioActual = await (prisma as any).usuario.findUnique({
                    where: { email: session.user.email }
                })
                if (!usuarioActual) return NextResponse.json({ inscripciones: [], certificaciones: [] })
                
                const [inscripcionesUsuario, certificacionesUsuario] = await Promise.all([
                    (prisma as any).inscripcion.findMany({
                        where: { usuarioId: usuarioActual.id },
                        include: {
                            convocatoria: {
                                include: {
                                    curso: { select: { id: true, nombre: true, duracionHoras: true, entidadCertifica: true, entidadOrganiza: true, formadorPrincipal: true } }
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }),
                    (prisma as any).certificacion.findMany({
                        where: { usuarioId: usuarioActual.id },
                        include: {
                            curso: { select: { id: true, nombre: true, duracionHoras: true, entidadOrganiza: true } }
                        },
                        orderBy: { fechaObtencion: 'desc' }
                    })
                ])
                return NextResponse.json({ inscripciones: inscripcionesUsuario, certificaciones: certificacionesUsuario })
            }

            case 'jornadas': {
                const convId = searchParams.get('convocatoriaId')
                if (!convId) return NextResponse.json({ error: 'convocatoriaId requerido' }, { status: 400 })
                const jornadas = await (prisma as any).jornadaAsistencia.findMany({
                    where: { convocatoriaId: convId },
                    orderBy: { numeroJornada: 'asc' },
                    include: {
                        firmas: {
                            include: {
                                usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } },
                                participanteExterno: { select: { id: true, nombre: true, apellidos: true, organizacion: true } }
                            }
                        }
                    }
                })
                return NextResponse.json({ jornadas })
            }
            case 'registros': {
                const jornadaId = searchParams.get('jornadaId')
                if (!jornadaId) return NextResponse.json({ error: 'jornadaId requerido' }, { status: 400 })
                const registros = await (prisma as any).registroFirma.findMany({
                    where: { jornadaId },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } },
                        participanteExterno: { select: { id: true, nombre: true, apellidos: true, organizacion: true, cargo: true } }
                    }
                })
                return NextResponse.json({ registros })
            }
            case 'externos': {
                const convId2 = searchParams.get('convocatoriaId')
                if (!convId2) return NextResponse.json({ error: 'convocatoriaId requerido' }, { status: 400 })
                const externos = await (prisma as any).participanteExterno.findMany({
                    where: { convocatoriaId: convId2 },
                    orderBy: { apellidos: 'asc' }
                })
                return NextResponse.json({ externos })
            }
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
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        const _rolF = (session?.user as any)?.rol ?? 'voluntario'
        const _nivF = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[_rolF] ?? 1
        if (_nivF < 4) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

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

                const curso = await (prisma as any).curso.create({ data: cursoData })
                
                const { usuarioId: adminIdC, usuarioNombre: adminNombreC } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'CREATE',
                    entidad: 'Curso',
                    entidadId: curso.id,
                    descripcion: `Nuevo curso creado: ${curso.nombre}`,
                    usuarioId: adminIdC,
                    usuarioNombre: adminNombreC,
                    modulo: 'Formación'
                })

                return NextResponse.json({ success: true, curso })

            case 'convocatoria': {

                const fechaInicioConv = new Date(data.fechaInicio)
                const fechaFinConv = new Date(data.fechaFin)
                if (isNaN(fechaInicioConv.getTime()) || isNaN(fechaFinConv.getTime())) {
                    return NextResponse.json({ error: 'Fechas de inicio o fin no válidas' }, { status: 400 })
                }
                if (fechaFinConv < fechaInicioConv) {
                    return NextResponse.json({ error: 'La fecha de fin no puede ser anterior a la de inicio' }, { status: 400 })
                }

                const usuario = await (prisma as any).usuario.findUnique({
                    where: { email: session.user.email },
                    include: { servicio: true }
                })

                const convocatoriaData = {
                    ...data,
                    fechaInicio: fechaInicioConv,
                    fechaFin: fechaFinConv,
                    plazasDisponibles: Number(data.plazasDisponibles)
                }
                const convocatoria = await (prisma as any).convocatoria.create({ data: convocatoriaData })

                // Obtener el curso relacionado
                const cursoRelacionado = await (prisma as any).curso.findUnique({
                    where: { id: data.cursoId }
                })

                // Auto-crear evento en el calendario
                if (convocatoria && usuario) {
                    await (prisma as any).evento.create({
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

                const { usuarioId: adminIdConv, usuarioNombre: adminNombreConv } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'CREATE',
                    entidad: 'Convocatoria',
                    entidadId: convocatoria.id,
                    descripcion: `Nueva convocatoria planificada: ${cursoRelacionado?.nombre || 'Curso'} (${convocatoria.codigo})`,
                    usuarioId: adminIdConv,
                    usuarioNombre: adminNombreConv,
                    modulo: 'Formación'
                })

                return NextResponse.json({ success: true, convocatoria })
            }

            case 'inscripcion':
                // Verificar si es una acción de aprobar/rechazar
                const { action, id: inscripcionId } = data

                if (action === 'aprobar') {

                    let inscripcionAprobada: any
                    try {
                        inscripcionAprobada = await (prisma as any).$transaction(async (tx: any) => {
                            const insc = await tx.inscripcion.findUnique({ where: { id: inscripcionId } })
                            if (!insc) throw new Error('INSCRIPCION_NOT_FOUND')
                            if (insc.estado === 'confirmada') throw new Error('YA_CONFIRMADA')
                            const conv = await tx.convocatoria.findUnique({ where: { id: insc.convocatoriaId } })
                            if (!conv) throw new Error('CONV_NOT_FOUND')
                            if (conv.plazasOcupadas >= conv.plazasDisponibles) throw new Error('SIN_PLAZAS')
                            const updated = await tx.inscripcion.update({ where: { id: inscripcionId }, data: { estado: 'confirmada' } })
                            await tx.convocatoria.update({ where: { id: insc.convocatoriaId }, data: { plazasOcupadas: { increment: 1 } } })
                            return updated
                        })
                    } catch (txErr: any) {
                        if (txErr.message === 'SIN_PLAZAS') return NextResponse.json({ error: 'No hay plazas disponibles' }, { status: 400 })
                        if (txErr.message === 'YA_CONFIRMADA') return NextResponse.json({ error: 'La inscripción ya está confirmada' }, { status: 400 })
                        if (txErr.message === 'INSCRIPCION_NOT_FOUND') return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
                        if (txErr.message === 'CONV_NOT_FOUND') return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                        throw txErr
                    }

                    const { usuarioId: aproId, usuarioNombre: aproNombre } = getUsuarioAudit(session)
                    await registrarAudit({ accion: 'APPROVE', entidad: 'Inscripción', entidadId: inscripcionId, descripcion: `Inscripción aprobada (usuario ${inscripcionAprobada.usuarioId})`, usuarioId: aproId, usuarioNombre: aproNombre, modulo: 'Formación' })
                    return NextResponse.json({ success: true, inscripcion: inscripcionAprobada, mensaje: 'Inscripción aprobada' })
                }

                if (action === 'rechazar') {
                    // Rechazar: solo actualizar estado
                    const inscripcionRechazada = await (prisma as any).inscripcion.update({
                        where: { id: inscripcionId },
                        data: { estado: 'rechazada' }
                    })

                    const inscripOriginal = await (prisma as any).inscripcion.findUnique({ where: { id: inscripcionId }, include: { convocatoria: true } })
                    const { usuarioId: rechId, usuarioNombre: rechNombre } = getUsuarioAudit(session)
                    await registrarAudit({
                        accion: 'REJECT',
                        entidad: 'Inscripción',
                        entidadId: inscripcionId,
                        descripcion: `Inscripción rechazada (Usuario ID: ${inscripcionRechazada.usuarioId}) para Convocatoria: ${inscripOriginal?.convocatoria.codigo || '-'}`,
                        usuarioId: rechId,
                        usuarioNombre: rechNombre,
                        modulo: 'Formación'
                    })

                    return NextResponse.json({ success: true, inscripcion: inscripcionRechazada, mensaje: 'Inscripción rechazada' })
                }

                // Crear nueva inscripción (solicitud)
                const convCheck = await (prisma as any).convocatoria.findUnique({
                    where: { id: data.convocatoriaId }
                })

                if (!convCheck) {
                    return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                }

                // Solo se puede inscribir si la convocatoria tiene inscripciones abiertas
                if (!['inscripciones_abiertas', 'en_curso'].includes(convCheck.estado)) {
                    return NextResponse.json({ error: 'Las inscripciones para esta convocatoria no están abiertas' }, { status: 400 })
                }

                // Verificar si el usuario ya está inscrito
                const inscripcionExistente = await (prisma as any).inscripcion.findFirst({
                    where: {
                        convocatoriaId: data.convocatoriaId,
                        usuarioId: data.usuarioId
                    }
                })

                if (inscripcionExistente) {
                    return NextResponse.json({ error: 'Ya estás inscrito en esta formación' }, { status: 400 })
                }

                // Nueva inscripción siempre como pendiente (requiere aprobación de admin)
                const inscripcion = await (prisma as any).inscripcion.create({
                    data: {
                        convocatoriaId: data.convocatoriaId,
                        usuarioId: data.usuarioId,
                        estado: 'pendiente'
                    }
                })
                
                const { usuarioId: solId, usuarioNombre: solNombre } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'CREATE',
                    entidad: 'Solicitud Inscripción',
                    entidadId: inscripcion.id,
                    descripcion: `Usuario ${inscripcion.usuarioId} solicitó plaza para ${convCheck.codigo}`,
                    usuarioId: solId,
                    usuarioNombre: solNombre,
                    modulo: 'Formación'
                })

                return NextResponse.json({ success: true, inscripcion, mensaje: 'Solicitud de inscripción enviada' })

            case 'certificacion':
                const certificacion = await (prisma as any).certificacion.create({ data })
                const { usuarioId: certId, usuarioNombre: certNombre } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'CREATE',
                    entidad: 'Certificación',
                    entidadId: certificacion.id,
                    descripcion: `Certificado emitido a usuario ${certificacion.usuarioId} para el curso ${certificacion.cursoId}`,
                    usuarioId: certId,
                    usuarioNombre: certNombre,
                    modulo: 'Formación'
                })
                return NextResponse.json({ success: true, certificacion })

            case 'necesidad':
                const necesidad = await (prisma as any).necesidadFormativa.create({ data })
                return NextResponse.json({ success: true, necesidad })

            case 'cerrar-acta':

                const { convocatoriaId } = data
                if (!convocatoriaId) return NextResponse.json({ error: 'Convocatoria ID requerido' }, { status: 400 })

                const convActa = await (prisma as any).convocatoria.findUnique({
                    where: { id: convocatoriaId },
                    include: { curso: true }
                })
                if (!convActa) return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                if (convActa.estado === 'finalizada') return NextResponse.json({ error: 'Esta convocatoria ya está finalizada' }, { status: 400 })

                const inscripcionesAptas = await (prisma as any).inscripcion.findMany({
                    where: { convocatoriaId, apto: true }
                })

                let certificadosGenerados = 0
                let certificadosSaltados = 0
                const fechaHoy = new Date()

                let fechaExpiracion: Date | null = null
                if (convActa.curso.validezMeses) {
                    fechaExpiracion = new Date()
                    fechaExpiracion.setMonth(fechaExpiracion.getMonth() + convActa.curso.validezMeses)
                }

                for (const insc of inscripcionesAptas) {
                    // Evitar duplicar: si ya existe cert para este usuario+curso emitido hoy (misma ejecución del acta)
                    const certExistente = await (prisma as any).certificacion.findFirst({
                        where: {
                            usuarioId: insc.usuarioId,
                            cursoId: convActa.cursoId,
                            fechaObtencion: { gte: new Date(fechaHoy.toDateString()) }
                        }
                    })
                    if (certExistente) { certificadosSaltados++; continue }

                    const numCert = await generarNumeroCertificado()

                    await (prisma as any).certificacion.create({
                        data: {
                            usuarioId: insc.usuarioId,
                            cursoId: convActa.cursoId,
                            fechaObtencion: fechaHoy,
                            fechaExpiracion,
                            numeroCertificado: numCert,
                            entidadEmisora: data.entidadEmisora || 'Protección Civil Bormujos',
                            vigente: true,
                            renovada: false
                        }
                    })
                    certificadosGenerados++
                }

                // Cerrar convocatoria
                await (prisma as any).convocatoria.update({
                    where: { id: convocatoriaId },
                    data: { estado: 'finalizada' }
                })

                const { usuarioId: actaId, usuarioNombre: actaNombre } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'UPDATE', // o ACTIVATE/FINISH
                    entidad: 'Acta Formación',
                    entidadId: convocatoriaId,
                    descripcion: `Acta cerrada para convocatoria ${convActa.codigo}. ${certificadosGenerados} certificados generados.`,
                    usuarioId: actaId,
                    usuarioNombre: actaNombre,
                    modulo: 'Formación'
                })

                return NextResponse.json({ success: true, certificadosGenerados, certificadosSaltados })

            case 'jornada': {
                const { convocatoriaId: convIdJ, fecha, numeroJornada, titulo, horaInicio, horaFin } = body
                if (!convIdJ || !fecha || !numeroJornada) {
                    return NextResponse.json({ error: 'convocatoriaId, fecha y numeroJornada requeridos' }, { status: 400 })
                }
                const jornada = await (prisma as any).jornadaAsistencia.create({
                    data: {
                        convocatoriaId: convIdJ,
                        fecha: new Date(fecha),
                        numeroJornada: parseInt(String(numeroJornada)),
                        titulo: titulo || null,
                        horaInicio: horaInicio || null,
                        horaFin: horaFin || null
                    }
                })
                // Solo crear registros para inscritos confirmados (no pendientes)
                const inscripciones = await (prisma as any).inscripcion.findMany({
                    where: { convocatoriaId: convIdJ, estado: 'confirmada' },
                    select: { usuarioId: true }
                })
                if (inscripciones.length > 0) {
                    await (prisma as any).registroFirma.createMany({
                        data: inscripciones.map((ins: any) => ({ jornadaId: jornada.id, usuarioId: ins.usuarioId, asistio: false })),
                        skipDuplicates: true
                    })
                }
                const externosJ = await (prisma as any).participanteExterno.findMany({
                    where: { convocatoriaId: convIdJ },
                    select: { id: true }
                })
                if (externosJ.length > 0) {
                    await (prisma as any).registroFirma.createMany({
                        data: externosJ.map((ext: any) => ({ jornadaId: jornada.id, participanteExternoId: ext.id, asistio: false })),
                        skipDuplicates: true
                    })
                }
                return NextResponse.json({ jornada, registrosCreados: inscripciones.length + externosJ.length })
            }
            case 'participante-externo': {
                const { convocatoriaId: convIdE, nombre, apellidos, dni, email, telefono, organizacion, cargo } = body
                if (!convIdE || !nombre || !apellidos) {
                    return NextResponse.json({ error: 'convocatoriaId, nombre y apellidos requeridos' }, { status: 400 })
                }
                const externo = await (prisma as any).participanteExterno.create({
                    data: { convocatoriaId: convIdE, nombre, apellidos, dni: dni || null, email: email || null, telefono: telefono || null, organizacion: organizacion || null, cargo: cargo || null }
                })
                const jornadasE = await (prisma as any).jornadaAsistencia.findMany({
                    where: { convocatoriaId: convIdE },
                    select: { id: true }
                })
                if (jornadasE.length > 0) {
                    await (prisma as any).registroFirma.createMany({
                        data: jornadasE.map((j: any) => ({ jornadaId: j.id, participanteExternoId: externo.id, asistio: false })),
                        skipDuplicates: true
                    })
                }
                return NextResponse.json({ externo })
            }
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
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        const _rolF = (session?.user as any)?.rol ?? 'voluntario'
        const _nivF = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[_rolF] ?? 1
        if (_nivF < 4) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

        const body = await request.json()
        const { tipo, id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        switch (tipo) {
            case 'curso':
                const cursoAnterior = await (prisma as any).curso.findUnique({ where: { id } })
                const curso = await (prisma as any).curso.update({ where: { id }, data })
                const { usuarioId: modIdC, usuarioNombre: modNomC } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'UPDATE',
                    entidad: 'Curso',
                    entidadId: id,
                    descripcion: `Curso modificado: ${curso.nombre}`,
                    usuarioId: modIdC,
                    usuarioNombre: modNomC,
                    modulo: 'Formación',
                    datosAnteriores: cursoAnterior,
                    datosNuevos: curso
                })
                return NextResponse.json({ success: true, curso })

            case 'convocatoria':
                const convAnterior = await (prisma as any).convocatoria.findUnique({ where: { id } })
                const convocatoria = await (prisma as any).convocatoria.update({ where: { id }, data })
                const { usuarioId: modIdConv, usuarioNombre: modNomConv } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'UPDATE',
                    entidad: 'Convocatoria',
                    entidadId: id,
                    descripcion: `Convocatoria modificada: ${convocatoria.codigo}`,
                    usuarioId: modIdConv,
                    usuarioNombre: modNomConv,
                    modulo: 'Formación',
                    datosNuevos: convocatoria,
                    datosAnteriores: convAnterior
                })
                return NextResponse.json({ success: true, convocatoria })

            case 'inscripcion':
                // Verificar si es una acción de aprobar/rechazar
                const { action } = data

                if (action === 'aprobar') {

                    let inscripcionAprobada: any
                    try {
                        inscripcionAprobada = await (prisma as any).$transaction(async (tx: any) => {
                            const insc = await tx.inscripcion.findUnique({ where: { id } })
                            if (!insc) throw new Error('INSCRIPCION_NOT_FOUND')
                            if (insc.estado === 'confirmada') throw new Error('YA_CONFIRMADA')
                            const conv = await tx.convocatoria.findUnique({ where: { id: insc.convocatoriaId } })
                            if (!conv) throw new Error('CONV_NOT_FOUND')
                            if (conv.plazasOcupadas >= conv.plazasDisponibles) throw new Error('SIN_PLAZAS')
                            const updated = await tx.inscripcion.update({ where: { id }, data: { estado: 'confirmada' } })
                            await tx.convocatoria.update({ where: { id: insc.convocatoriaId }, data: { plazasOcupadas: { increment: 1 } } })
                            return updated
                        })
                    } catch (txErr: any) {
                        if (txErr.message === 'SIN_PLAZAS') return NextResponse.json({ error: 'No hay plazas disponibles' }, { status: 400 })
                        if (txErr.message === 'YA_CONFIRMADA') return NextResponse.json({ error: 'La inscripción ya está confirmada' }, { status: 400 })
                        if (txErr.message === 'INSCRIPCION_NOT_FOUND') return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
                        if (txErr.message === 'CONV_NOT_FOUND') return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                        throw txErr
                    }

                    const { usuarioId: aproId3, usuarioNombre: aproNombre3 } = getUsuarioAudit(session)
                    await registrarAudit({ accion: 'APPROVE', entidad: 'Inscripción', entidadId: id, descripcion: `Inscripción aprobada (usuario ${inscripcionAprobada.usuarioId})`, usuarioId: aproId3, usuarioNombre: aproNombre3, modulo: 'Formación' })
                    return NextResponse.json({ success: true, inscripcion: inscripcionAprobada, mensaje: 'Inscripción aprobada' })
                }

                if (action === 'rechazar') {
                    const orginsc2 = await (prisma as any).inscripcion.findUnique({ where: { id }, include: { convocatoria: true } })
                    if (!orginsc2) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
                    const inscripcionRechazada = await (prisma as any).inscripcion.update({ where: { id }, data: { estado: 'rechazada' } })
                    const { usuarioId: rechId2, usuarioNombre: rechNombre2 } = getUsuarioAudit(session)
                    await registrarAudit({ accion: 'REJECT', entidad: 'Inscripción', entidadId: id, descripcion: `Inscripción rechazada (usuario ${inscripcionRechazada.usuarioId}) para ${orginsc2?.convocatoria?.codigo || '-'}`, usuarioId: rechId2, usuarioNombre: rechNombre2, modulo: 'Formación' })
                    return NextResponse.json({ success: true, inscripcion: inscripcionRechazada, mensaje: 'Inscripción rechazada' })
                }

                // Actualización normal de inscripción
                const inscripcion = await (prisma as any).inscripcion.update({ where: { id }, data })
                return NextResponse.json({ success: true, inscripcion })

            case 'certificacion':
                const certificacion = await (prisma as any).certificacion.update({ where: { id }, data })
                return NextResponse.json({ success: true, certificacion })

            case 'necesidad':
                const necesidad = await (prisma as any).necesidadFormativa.update({ where: { id }, data })
                return NextResponse.json({ success: true, necesidad })

            case 'registro-firma': {
                const { id: regId, asistio, firmaBase64, valoracionFormador, notaFormador, comentarioFormador } = body
                if (!regId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
                // Verificar que la jornada no esté bloqueada
                const regExistente = await (prisma as any).registroFirma.findUnique({
                    where: { id: regId },
                    include: { jornada: { select: { bloqueada: true } } }
                })
                if (!regExistente) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
                if (regExistente.jornada?.bloqueada) return NextResponse.json({ error: 'La jornada está bloqueada y no admite cambios' }, { status: 400 })
                const updateData: any = {}
                if (asistio !== undefined) updateData.asistio = asistio
                if (firmaBase64 !== undefined) {
                    updateData.firmaBase64 = firmaBase64
                    updateData.fechaFirma = new Date()
                    updateData.asistio = true
                }
                if (valoracionFormador !== undefined) updateData.valoracionFormador = valoracionFormador || null
                if (notaFormador !== undefined) updateData.notaFormador = notaFormador !== null ? parseFloat(String(notaFormador)) : null
                if (comentarioFormador !== undefined) updateData.comentarioFormador = comentarioFormador || null
                const registroActualizado = await (prisma as any).registroFirma.update({
                    where: { id: regId },
                    data: updateData
                })
                return NextResponse.json({ registro: registroActualizado })
            }
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
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        const _rolF = (session?.user as any)?.rol ?? 'voluntario'
        const _nivF = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0 } as Record<string,number>)[_rolF] ?? 1
        if (_nivF < 4) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo')
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        switch (tipo) {
            case 'curso': {
                const cursoDel = await (prisma as any).curso.findUnique({ where: { id } })
                if (!cursoDel) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
                await (prisma as any).curso.delete({ where: { id } })
                const { usuarioId: delIdC, usuarioNombre: delNomC } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'DELETE',
                    entidad: 'Curso',
                    entidadId: id,
                    descripcion: `Curso eliminado: ${cursoDel?.nombre}`,
                    usuarioId: delIdC,
                    usuarioNombre: delNomC,
                    modulo: 'Formación'
                })
                return NextResponse.json({ success: true })
            }

            case 'convocatoria': {
                const convDel = await (prisma as any).convocatoria.findUnique({ where: { id } })
                if (!convDel) return NextResponse.json({ error: 'Convocatoria no encontrada' }, { status: 404 })
                await (prisma as any).convocatoria.delete({ where: { id } })
                const { usuarioId: delIdConv, usuarioNombre: delNomConv } = getUsuarioAudit(session)
                await registrarAudit({
                    accion: 'DELETE',
                    entidad: 'Convocatoria',
                    entidadId: id,
                    descripcion: `Convocatoria eliminada: ${convDel?.codigo}`,
                    usuarioId: delIdConv,
                    usuarioNombre: delNomConv,
                    modulo: 'Formación'
                })
                return NextResponse.json({ success: true })
            }

            case 'inscripcion': {
                const insc = await (prisma as any).inscripcion.findUnique({ where: { id } })
                if (!insc) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
                // Solo decrementar plazas si la inscripción estaba confirmada
                if (insc.estado === 'confirmada') {
                    await (prisma as any).$transaction([
                        (prisma as any).inscripcion.delete({ where: { id } }),
                        (prisma as any).convocatoria.update({
                            where: { id: insc.convocatoriaId },
                            data: { plazasOcupadas: { decrement: 1 } }
                        })
                    ])
                } else {
                    await (prisma as any).inscripcion.delete({ where: { id } })
                }
                const { usuarioId: delIdI, usuarioNombre: delNomI } = getUsuarioAudit(session)
                await registrarAudit({ accion: 'UNASSIGN', entidad: 'Inscripción', entidadId: id, descripcion: `Inscripción eliminada del voluntario ${insc.usuarioId} de la convocatoria ${insc.convocatoriaId}`, usuarioId: delIdI, usuarioNombre: delNomI, modulo: 'Formación' })
                return NextResponse.json({ success: true })
            }

            case 'certificacion': {
                await (prisma as any).certificacion.delete({ where: { id } })
                return NextResponse.json({ success: true })
            }

            case 'necesidad': {
                await (prisma as any).necesidadFormativa.delete({ where: { id } })
                return NextResponse.json({ success: true })
            }

            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error en DELETE /api/formacion:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
